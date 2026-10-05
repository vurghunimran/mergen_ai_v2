const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const mocks = new Map();
const originalLoad = Module._load;
Module._load = function (id, parent, main) {
  if (mocks.has(id)) return mocks.get(id);
  if (id === 'server-only') return {};
  return originalLoad.call(this, id.startsWith('@/') ? path.join(root, id.slice(2)) : id, parent, main);
};
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
}).outputText, file);
function load(file) {
  const full = path.join(root, file);
  delete require.cache[require.resolve(full)];
  return require(full);
}
const request = (secret, query = '') => new Request(`https://mergen.example/api/cron/survey-distribution${query}`, {
  headers: secret === undefined ? {} : { authorization: `Bearer ${secret}` }
});

test('scheduler rejects absent or wrong secrets before database access in every environment', async () => {
  const previousSecret = process.env.CRON_SECRET, previousMode = process.env.NODE_ENV;
  let dbCalls = 0;
  mocks.set('@/lib/supabase/admin', { createAdminClient: () => { dbCalls++; throw Error('Unexpected database access'); } });
  mocks.set('@/lib/survey-distribution', { runSurveyDistributionCycle: () => { throw Error('Unexpected dispatch'); } });
  try {
    const { GET } = load('app/api/cron/survey-distribution/route.ts');
    for (const mode of ['production', 'development']) {
      process.env.NODE_ENV = mode;
      delete process.env.CRON_SECRET;
      assert.equal((await GET(request(undefined))).status, 401);
      assert.equal((await GET(request('undefined'))).status, 401);
      process.env.CRON_SECRET = 'test-private-secret';
      assert.equal((await GET(request('wrong'))).status, 401);
    }
    assert.equal(dbCalls, 0);
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previousSecret;
    if (previousMode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousMode;
    mocks.clear();
  }
});

test('authorized scheduler previews only on explicit dry_run=1 and hides internal failures', async () => {
  const previousSecret = process.env.CRON_SECRET, info = console.info, error = console.error;
  process.env.CRON_SECRET = 'test-private-secret';
  const calls = [], logs = [];
  console.info = (...args) => logs.push(args);
  console.error = (...args) => logs.push(args);
  mocks.set('@/lib/supabase/admin', { createAdminClient: () => ({}) });
  mocks.set('@/lib/email/config', { getAppBaseUrl: () => 'https://mergen.example' });
  mocks.set('@/lib/survey-distribution', { runSurveyDistributionCycle: async p => {
    calls.push(p);
    return { dryRun: p.dryRun, processedSurveys: 0, archivedSurveys: 0, processedStageRuns: [] };
  } });
  try {
    let { GET } = load('app/api/cron/survey-distribution/route.ts');
    assert.equal((await GET(request('test-private-secret', '?dry_run=1'))).status, 200);
    assert.equal((await GET(request('test-private-secret'))).status, 200);
    assert.deepEqual(calls.map(c => c.dryRun), [true, false]);
    mocks.set('@/lib/survey-distribution', { runSurveyDistributionCycle: async () => { throw Error('provider secret and recipient@example.invalid'); } });
    ({ GET } = load('app/api/cron/survey-distribution/route.ts'));
    const response = await GET(request('test-private-secret'));
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { success: false, error: 'Survey distribution cron failed.' });
    assert(!JSON.stringify(logs).includes('provider secret'));
    assert(!JSON.stringify(logs).includes('recipient@example.invalid'));
  } finally {
    if (previousSecret === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = previousSecret;
    console.info = info; console.error = error; mocks.clear();
  }
});

function fixture() {
  const base = { status: 'published', target_responses: 3, distribution_stage: 0,
    distribution_started_at: '2026-10-05T08:00:00Z', distribution_expires_at: '2026-10-08T08:00:00Z',
    distribution_last_sent_at: null, days_remaining: 3, audience: null, name: 'Pilot', description: 'Pilot survey', question_count: 5 };
  const tables = {
    surveys: [{ ...base, id: 1, distribution_expires_at: '2026-10-04T08:00:00Z' }, { ...base, id: 2, target_responses: 1 }, { ...base, id: 3 }],
    survey_responses: [{ id: 1, survey_id: 2, respondent_id: 'member1' }, { id: 2, survey_id: 3, respondent_id: 'member1' }],
    profiles: [1, 2, 3].map(i => ({ id: `member${i}`, role: 'community', email: `member${i}@example.invalid`, first_name: 'Member' })),
    community_profiles: [1, 2, 3].map(i => ({ id: `member${i}`, country: 'Azerbaijan', age_span: '25-34', interests: [] })),
    telegram_notification_subscriptions: [],
    survey_notifications: [{ id: 1, survey_id: 3, recipient_id: 'member2' }]
  };
  let writes = 0;
  const admin = { from(table) {
    const filters = [], query = {
      select: () => query, order: () => query,
      eq: (key, value) => { filters.push(row => row[key] === value); return query; },
      range: async (from, to) => ({ data: tables[table].filter(row => filters.every(f => f(row))).slice(from, to + 1), error: null }),
      update(values) {
        query.then = resolve => { writes++; for (const row of tables[table].filter(row => filters.every(f => f(row)))) Object.assign(row, values); return Promise.resolve({ error: null }).then(resolve); };
        return query;
      },
      insert: async values => { writes++; tables[table].push(...values); return { error: null }; }
    }; return query;
  } };
  return { admin, tables, writes: () => writes };
}
function notificationMocks() {
  const sends = [];
  mocks.set('@/lib/email/config', { ...load('lib/email/config.ts'), isValidEmail: email => email.includes('@'), getResendFromEmail: () => 'sender@example.invalid',
    createResendClient: () => ({ batch: { send: async payload => { sends.push(...payload); return { error: null }; } } }) });
  mocks.set('@/lib/telegram', { isTelegramBotConfigured: () => false });
  return sends;
}

test('dry run plans archives and excludes completed/notified recipients without writes or messages', async () => {
  const { admin, writes } = fixture(), sends = notificationMocks();
  try {
    const { runSurveyDistributionCycle } = load('lib/survey-distribution.ts');
    const result = await runSurveyDistributionCycle({ admin, appBaseUrl: 'https://mergen.example', now: new Date('2026-10-05T09:00:00Z'), dryRun: true });
    assert.equal(result.dryRun, true); assert.equal(result.plannedArchives, 2);
    assert.equal(result.archivedSurveys, 0); assert.deepEqual(result.processedStageRuns, []);
    assert.deepEqual(result.plannedStageRuns, [{ surveyId: 3, stage: 1, matchedRecipients: 1, remainingResponses: 2 }]);
    assert.equal(writes(), 0); assert.equal(sends.length, 0);
    assert(!JSON.stringify(result).includes('example.invalid'));
  } finally { mocks.clear(); }
});

test('normal cycle archives expired/full surveys, dispatches remaining recipients and is idle on immediate replay', async () => {
  const { admin, tables } = fixture(), sends = notificationMocks();
  try {
    const { runSurveyDistributionCycle } = load('lib/survey-distribution.ts');
    const params = { admin, appBaseUrl: 'https://mergen.example', now: new Date('2026-10-05T09:00:00Z') };
    const result = await runSurveyDistributionCycle(params);
    assert.equal(result.archivedSurveys, 2);
    assert.equal(result.processedStageRuns[0].sentEmails, 1);
    assert.equal(sends[0].to, 'member3@example.invalid');
    assert.equal(tables.surveys[2].distribution_stage, 1);
    const replay = await runSurveyDistributionCycle(params);
    assert.equal(replay.archivedSurveys, 0); assert.deepEqual(replay.processedStageRuns, []);
    assert.equal(sends.length, 1);
  } finally { mocks.clear(); }
});
