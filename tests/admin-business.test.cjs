const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..'), mocks = new Map(), original = Module._load;
Module._load = function(id, parent, main) {
  if (mocks.has(id)) return mocks.get(id);
  if (id === 'server-only') return {};
  return original.call(this, id.startsWith('@/') ? path.join(root, id.slice(2)) : id, parent, main);
};
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (m, f) => m._compile(ts.transpileModule(fs.readFileSync(f, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, f);
const load = file => { const full = path.join(root, file); delete require.cache[require.resolve(full)]; return require(full); };
const metrics = require('../lib/admin-metrics.ts');

test('business totals separate unpaid attempts, refunds, top-ups, currencies and voided entries', () => {
  const base = { currency: 'USD', total_cents: 3250, created_at: '2026-10-02T10:00:00Z', provider_environment: 'production' };
  const orders = [{ ...base, status: 'pending', state: 'pending' }, { ...base, status: 'paid', state: 'fulfilled' }, { ...base, status: 'paid', state: 'refunded', refund_status: 'refunded' }, { ...base, currency: 'EUR', status: 'paid', state: 'review' }];
  const sums = metrics.summarizeOrders(orders, '2026-10');
  assert.equal(sums.total, 4); assert.equal(sums.pending, 1); assert.equal(sums.paid, 3); assert.equal(sums.refunded, 1);
  assert.deepEqual(sums.retained, [{ currency: 'EUR', cents: 3250 }, { currency: 'USD', cents: 3250 }]);
  const expense = { provider: 'Vercel', amount_cents: 2000, currency: 'USD', paid_on: '2026-10-02' };
  const rows = [{ ...expense, kind: 'expense' }, { ...expense, provider: 'Perplexity', kind: 'top_up', amount_cents: 1000 }, { ...expense, kind: 'expense', voided_at: '2026-10-03' }, { ...expense, currency: 'EUR', kind: 'expense' }];
  const total = metrics.summarizeExpenses(rows, '2026-10');
  assert.deepEqual(total.expenses, [{ currency: 'EUR', cents: 2000 }, { currency: 'USD', cents: 2000 }]);
  assert.deepEqual(total.topUps, [{ currency: 'USD', cents: 1000 }]);
});
test('sandbox and historical unclassified payments never count as live revenue', () => {
  const base = { currency: 'USD', total_cents: 3250, created_at: '2026-10-02T10:00:00Z', status: 'paid', state: 'fulfilled' };
  const totals = metrics.summarizeOrders([{ ...base, provider_environment: 'sandbox' }, { ...base, provider_environment: 'unknown' }, { ...base, provider_environment: 'production' }], '2026-10');
  assert.equal(totals.total, 3); assert.equal(totals.paid, 3); assert.equal(totals.livePaid, 1); assert.equal(totals.sandbox, 1); assert.equal(totals.unknown, 1);
  assert.deepEqual(totals.gross, [{ currency: 'USD', cents: 3250 }]);
});
test('Baku month boundaries and missing community country remain accurate', () => {
  assert.equal(metrics.inPeriod('2026-09-30T20:30:00Z', '2026-10'), true);
  assert.equal(metrics.inPeriod('2026-09-30T19:30:00Z', '2026-10'), false);
  const profiles = Array.from({ length: 12 }, (_, i) => ({ id: String(i), role: 'community', created_at: '2026-10-02T10:00:00Z' }));
  profiles.push({ id: 'client', role: 'client', created_at: '2026-10-02T10:00:00Z' });
  const countries = metrics.memberCountries(profiles, profiles.slice(0, 11).map((p, i) => ({ id: p.id, country: `Country ${i}` })), '2026-10');
  assert.equal(countries.total, 12); assert.equal(countries.countries.length, 12); assert.equal(countries.countries.find(c => c.country === 'Not set').count, 1);
  assert.equal(metrics.normalizePeriod('2026-13', new Date('2026-10-05T00:00Z')), '2026-10');
});
test('expense validation uses exact cents and rejects malformed dates and money', () => {
  const { parseExpense } = require('../lib/admin-expenses.ts');
  const body = { id: '11111111-1111-4111-8111-111111111111', provider: 'Vercel', kind: 'expense', currency: 'USD', paid_on: '2026-01-01', amount: '19.99', description: 'Hosting', reference: '' };
  assert.equal(parseExpense(body).amount_cents, 1999);
  for (const change of [{ amount: '-1' }, { amount: '0' }, { amount: '1e3' }, { amount: '1.001' }, { paid_on: '2026-02-30' }, { currency: 'JPY' }, { provider: 'Unknown' }, { id: 'bad' }]) assert.throws(() => parseExpense({ ...body, ...change }));
});
test('AI usage treats absent prices as unknown, including free requests with real zero cost', () => {
  const { extractAiUsage } = require('../lib/ai-usage.ts');
  assert.deepEqual(extractAiUsage('Google Gemini', { usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 25, totalTokenCount: 150 } }), { input_tokens: 100, output_tokens: 25, total_tokens: 150, cost_usd: null });
  assert.equal(extractAiUsage('Perplexity', { usage: { cost: { currency: 'USD', total_cost: 0 } } }).cost_usd, 0);
  assert.equal(extractAiUsage('Perplexity', { usage: { cost: { currency: 'EUR', total_cost: 1 } } }).cost_usd, null);
  assert.equal(extractAiUsage('Perplexity', {}).cost_usd, null);
  const totals = metrics.summarizeAi([{ provider: 'Google Gemini', outcome: 'ok', total_tokens: 100, cost_usd: null, created_at: '2026-10-01T00:00Z' }], '2026-10');
  assert.equal(totals[0].callsWithCost, 0);
});
test('AI telemetry preserves responses, records failures and never stores prompt or credentials', async () => {
  const previous = global.fetch, events = []; let unavailable = false;
  mocks.set('@/lib/supabase/admin', { createAdminClient: () => { if (unavailable) throw new Error('Unavailable'); return { from: () => ({ insert: async entry => { events.push(entry); return { error: null }; } }) }; } });
  try {
    const { trackedAiFetch } = load('lib/ai-usage.ts');
    global.fetch = async () => Response.json({ status: 'completed', output: ['secret text'], usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15, cost: { currency: 'USD', total_cost: 0.002 } } });
    const response = await trackedAiFetch('Perplexity', 'preset:low', 'questions', 'https://provider.example', { body: 'private prompt', headers: { Authorization: 'secret' } });
    assert.equal((await response.json()).output[0], 'secret text'); assert.equal(events[0].cost_usd, 0.002);
    assert(!JSON.stringify(events).includes('secret')); assert(!JSON.stringify(events).includes('private prompt'));
    global.fetch = async () => { throw new Error('Network error'); };
    await assert.rejects(trackedAiFetch('Google Gemini', 'model', 'evaluation', 'https://provider.example', {}));
    assert.equal(events[1].outcome, 'network_error');
    unavailable = true;
    global.fetch = async () => Response.json({ candidates: [] });
    assert.equal((await trackedAiFetch('Google Gemini', 'model', 'report', 'https://provider.example', {})).status, 200);
  } finally { global.fetch = previous; mocks.clear(); }
});
test('owner expense endpoint rejects anonymous, non-owner and foreign-origin writes before storage', async () => {
  let auth = null, dbCalls = 0;
  mocks.set('@/lib/supabase/profile-server', { getCurrentUserProfile: async () => auth });
  mocks.set('@/lib/admin-access', { isAdminIdentity: user => user.id === 'owner' });
  mocks.set('@/lib/supabase/admin', { createAdminClient: () => { dbCalls++; throw new Error('Should not connect'); } });
  try {
    const { POST, DELETE } = load('app/api/admin/expenses/route.ts');
    const request = origin => new Request('https://mergen.example/api/admin/expenses', { method: 'POST', headers: { origin }, body: '{}' });
    assert.equal((await POST(request('https://mergen.example'))).status, 401);
    auth = { user: { id: 'member' }, profile: { id: 'member' } };
    assert.equal((await POST(request('https://mergen.example'))).status, 403);
    auth = { user: { id: 'owner' }, profile: { id: 'owner' } };
    assert.equal((await POST(request('https://evil.example'))).status, 403);
    assert.equal((await DELETE(request('https://evil.example'))).status, 403);
    assert.equal(dbCalls, 0);
  } finally { mocks.clear(); }
});
test('expense submissions are idempotent, conflicting retries reject and voids preserve history', async () => {
  const rows = new Map();
  mocks.set('@/lib/supabase/profile-server', { getCurrentUserProfile: async () => ({ user: { id: 'owner' }, profile: { id: 'owner' } }) });
  mocks.set('@/lib/admin-access', { isAdminIdentity: () => true });
  mocks.set('@/lib/supabase/admin', { createAdminClient: () => ({ from: () => ({
    insert: async row => rows.has(row.id) ? { error: { code: '23505' } } : (rows.set(row.id, row), { error: null }),
    select: () => ({ eq: (_key, id) => ({ single: async () => ({ data: rows.get(id) }) }) }),
    update: values => ({ eq: (_key, id) => ({ is: () => ({ select: () => ({ maybeSingle: async () => {
      const row = rows.get(id); if (!row || row.voided_at) return { data: null }; Object.assign(row, values); return { data: { id } };
    } }) }) }) })
  }) }) });
  try {
    const { POST, DELETE } = load('app/api/admin/expenses/route.ts');
    const body = { id: '11111111-1111-4111-8111-111111111111', provider: 'Vercel', kind: 'expense', currency: 'USD', paid_on: '2026-01-01', amount: '20', description: 'Hosting', reference: '' };
    const request = (data, method = 'POST') => new Request('https://mergen.example/api/admin/expenses', { method, headers: { origin: 'https://mergen.example' }, body: JSON.stringify(data) });
    assert.equal((await POST(request(body))).status, 200);
    assert.equal((await POST(request(body))).status, 200); assert.equal(rows.size, 1);
    assert.equal((await POST(request({ ...body, amount: '30' }))).status, 409);
    assert.equal((await DELETE(request({ id: body.id }, 'DELETE'))).status, 200);
    assert.equal(rows.get(body.id).voided_by, 'owner'); assert(rows.get(body.id).voided_at); assert.equal(rows.size, 1);
    assert.equal((await POST(request(body))).status, 409);
  } finally { mocks.clear(); }
});
test('PostgreSQL expense and telemetry migration is repeatable, RLS protected and constrained', async () => {
  const db = new PGlite(), owner = '11111111-1111-4111-8111-111111111111';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role; create table profiles(id uuid primary key); insert into profiles values ('${owner}'); create table survey_orders(id uuid primary key); insert into survey_orders values ('${owner}');`);
    const sql = fs.readFileSync(path.join(root, 'supabase/migrate-admin-business-dashboard.sql'), 'utf8');
    await db.exec(sql); await db.exec(sql);
    assert.equal((await db.query('select provider_environment from survey_orders')).rows[0].provider_environment, 'unknown');
    const insert = `insert into operating_expenses(id,provider,kind,amount_cents,currency,paid_on,description,created_by) values ('${owner}','Vercel','expense',2000,'USD','2026-10-01','Hosting','${owner}')`;
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select * from operating_expenses'), /permission denied/);
      await assert.rejects(db.query(insert), /permission denied/);
      await assert.rejects(db.query('select * from ai_usage_events'), /permission denied/);
      await db.exec('reset role');
    }
    await db.query(insert);
    await assert.rejects(db.query(insert), /duplicate key/);
    await assert.rejects(db.query('update operating_expenses set amount_cents=-1'), /check constraint/);
    await assert.rejects(db.query("update operating_expenses set voided_at=now()"), /check constraint/);
    await db.query("insert into ai_usage_events(provider,model,scope,outcome) values ('Google Gemini','model','evaluation','ok')");
    assert.equal((await db.query('select cost_usd from ai_usage_events')).rows[0].cost_usd, null);
  } finally { await db.close(); }
});
