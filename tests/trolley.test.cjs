const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { createHmac } = require('node:crypto');
const mocks = new Map();
const root = path.resolve(__dirname, '..');
const originalLoad = Module._load;
Module._load = function(id, parent, main) {
  if (mocks.has(id)) return mocks.get(id);
  return originalLoad.call(this, id.startsWith('@/') ? path.join(root, id.slice(2)) : id, parent, main);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
}).outputText, filename);
const trolley = require('../lib/trolley.ts');
const withEnv = async (fn) => {
  const saved = { ...process.env }; const fetch = global.fetch;
  try {
    for (const key of Object.keys(process.env)) if (key.startsWith('TROLLEY_')) delete process.env[key];
    await fn();
  } finally { process.env = saved; global.fetch = fetch; mocks.clear(); }
};
test('approved cash rate, invalid amounts, and sandbox cannot enable live member withdrawals', () => withEnv(async () => {
  assert.equal(trolley.withdrawalAmount(920), 1000);
  assert.equal(trolley.withdrawalAmount(1840), 2000);
  for (const credits of [0, -920, '920', 921, 920.1, Infinity, 920920]) assert.throws(() => trolley.withdrawalAmount(credits));
  process.env.TROLLEY_WITHDRAWALS_ENABLED = 'true';
  process.env.TROLLEY_SANDBOX_ACCESS_KEY = 'sandbox-key'; process.env.TROLLEY_SANDBOX_SECRET_KEY = 'sandbox-secret';
  assert.equal(trolley.cashWithdrawalsEnabled(), false);
  process.env.TROLLEY_MODE = 'live'; assert.equal(trolley.cashWithdrawalsEnabled(), false);
  process.env.TROLLEY_LIVE_ACCESS_KEY = 'live-key'; process.env.TROLLEY_LIVE_SECRET_KEY = 'live-secret';
  assert.equal(trolley.cashWithdrawalsEnabled(), false);
  process.env.TROLLEY_LIVE_WEBHOOK_SECRET = 'webhook'; assert.equal(trolley.cashWithdrawalsEnabled(), true);
  assert.equal(trolley.trolleyCountryEnabled('AZ'), false);
  process.env.TROLLEY_ALLOWED_COUNTRIES = 'AZ, US'; assert.equal(trolley.trolleyCountryEnabled('AZ'), true);
}));
test('Trolley API signs exact method, path/query and body; widget binds authenticated identity', () => withEnv(async () => {
  process.env.TROLLEY_SANDBOX_ACCESS_KEY = 'key'; process.env.TROLLEY_SANDBOX_SECRET_KEY = 'secret';
  global.fetch = async (url, options) => {
    const timestamp = options.headers['X-PR-Timestamp'];
    assert.equal(url, 'https://api.trolley.com/v1/batches');
    const signature = createHmac('sha256', 'secret').update(`${timestamp}\nPOST\n/v1/batches\n${options.body}\n`).digest('hex');
    assert.equal(options.headers.Authorization, `prsign key:${signature}`);
    return { ok: true, json: async () => ({ ok: true, batch: { id: 'B-Test' } }) };
  };
  assert.equal((await trolley.trolleyRequest('POST', '/v1/batches', { currency: 'USD' })).batch.id, 'B-Test');
  const url = new URL(trolley.trolleyWidgetUrl({ id: 'member-uuid', email: 'member+test@example.invalid' }));
  const query = url.search.slice(1).split('&sign=')[0];
  assert.equal(url.searchParams.get('sign'), createHmac('sha256', 'secret').update(query).digest('hex'));
  assert.equal(url.searchParams.get('refid'), 'member-uuid');
  assert.equal(url.searchParams.get('roEmail'), 'true');
  assert.ok(!url.toString().includes('secret'));
  global.fetch = async () => ({ ok: true, json: async () => ({ ok: false, errors: [{ message: 'private bank information' }] }) });
  await assert.rejects(trolley.trolleyRequest('GET', '/v1/recipients'), error => !error.message.includes('private'));
}));
test('webhook signatures reject changes, replay and missing secrets', () => {
  const raw = '{"model":"payment"}'; const time = '1791021600';
  const signature = createHmac('sha256', 'secret').update(time + raw).digest('hex');
  const header = `t=${time},v1=${signature}`;
  assert.equal(trolley.verifyTrolleyWebhook(raw, header, 'secret', Number(time) * 1000), true);
  assert.equal(trolley.verifyTrolleyWebhook(raw + ' ', header, 'secret', Number(time) * 1000), false);
  assert.equal(trolley.verifyTrolleyWebhook(raw, header, 'secret', (Number(time) + 301) * 1000), false);
  assert.equal(trolley.verifyTrolleyWebhook(raw, header, undefined, Number(time) * 1000), false);
  assert.equal(trolley.verifyTrolleyWebhook(raw, 't=oops,v1=x', 'secret'), false);
});
test('disabled withdrawals and onboarding fail before database/provider calls', () => withEnv(async () => {
  let requests = 0;
  mocks.set('@/lib/survey-authorization', { requireAuthorizedProfile: async () => ({ profile: { id: 'member', country: 'Azerbaijan' }, response: null }) });
  mocks.set('@/lib/supabase/admin', { createAdminClient: () => { requests++; throw Error('unexpected'); } });
  global.fetch = async () => { requests++; throw Error('unexpected'); };
  const withdrawals = require('../app/api/withdrawals/route.ts');
  const onboarding = require('../app/api/withdrawals/onboarding/route.ts');
  assert.equal((await withdrawals.POST(new Request('https://example.invalid/api/withdrawals', { method: 'POST' }))).status, 503);
  assert.equal((await onboarding.POST(new Request('https://example.invalid/api/withdrawals/onboarding', { method: 'POST' }))).status, 503);
  assert.equal(requests, 0);
}));
test('webhook handles signed validation and rejects forgery without accessing database', () => withEnv(async () => {
  process.env.TROLLEY_LIVE_WEBHOOK_SECRET = 'secret';
  let reads = 0;
  mocks.set('@/lib/supabase/admin', { createAdminClient: () => { reads++; throw Error('unexpected'); } });
  const route = require('../app/api/trolley/webhook/route.ts');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac('sha256', 'secret').update(timestamp + '{}').digest('hex');
  assert.equal((await route.POST(new Request('https://example.invalid/api/trolley/webhook', { method: 'POST', body: '{}' }))).status, 401);
  assert.equal((await route.POST(new Request('https://example.invalid/api/trolley/webhook', { method: 'POST', body: '{}', headers: { 'X-PaymentRails-Signature': `t=${timestamp},v1=${signature}` } }))).status, 200);
  assert.equal(reads, 0);
}));

test('lost batch response reserves credits and resumes the original batch without a duplicate payout', () => withEnv(async () => {
  process.env.TROLLEY_LIVE_ACCESS_KEY = 'key'; process.env.TROLLEY_LIVE_SECRET_KEY = 'secret';
  const row = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', member_id: 'member', credits: 920,
    amount_cents: 1000, recipient_id: 'R-Recipient', status: 'queued', batch_id: null, payment_id: null };
  let creates = 0, paymentCreates = 0, starts = 0, settles = 0;
  let batch = null, payment = null;
  mocks.set('@/lib/supabase/admin', { createAdminClient: () => ({
    rpc: async (name, args) => {
      if (name === 'claim_cash_withdrawal') {
        if (row.status !== 'queued') return { data: null };
        row.status = 'submitting'; return { data: { ...row } };
      }
      assert.equal(name, 'settle_cash_withdrawal');
      assert.equal(args.p_payment, 'P-Payment');
      assert.equal(args.p_status, 'processed');
      row.status = 'processed'; settles++; return { error: null };
    },
    from: () => ({ update: values => ({ eq: () => ({ in: async (_, statuses) => {
      if (statuses.includes(row.status)) Object.assign(row, values); return { error: null };
    } }) }) })
  }) });
  global.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    const ok = value => ({ ok: true, json: async () => ({ ok: true, ...value }) });
    if (path === '/v1/batches' && options.method === 'POST') {
      creates++; batch = { id: 'B-Batch', status: 'open', tags: [`mergen-withdrawal-${row.id}`] };
      throw Error('response lost after provider accepted batch');
    }
    if (path === '/v1/batches') return ok({ batches: [batch] });
    if (path === '/v1/batches/B-Batch') return ok({ batch });
    if (path === '/v1/batches/B-Batch/payments' && options.method === 'GET') return ok({ payments: payment ? [payment] : [] });
    if (path === '/v1/batches/B-Batch/payments' && options.method === 'POST') {
      paymentCreates++;
      const input = JSON.parse(options.body);
      assert.equal(input.externalId, row.id); assert.equal(input.amount, '10.00'); assert.equal(input.coverFees, true);
      payment = { id: 'P-Payment', status: 'pending', externalId: row.id, sourceAmount: '10.00', sourceCurrency: 'USD',
        recipient: { id: row.recipient_id }, batch: { id: batch.id }, updatedAt: '2026-10-03T10:00:00Z' };
      return ok({ payment });
    }
    if (path.endsWith('/generate-quote')) return ok({ batch });
    if (path.endsWith('/start-processing')) { starts++; batch.status = 'complete'; payment.status = 'processed'; return ok({ batch }); }
    if (path.endsWith('/payments/P-Payment')) return ok({ payment });
    throw Error('Unexpected request: ' + path);
  };
  delete require.cache[require.resolve('../lib/cash-withdrawals.ts')];
  const { processCashWithdrawal, syncCashWithdrawal } = require('../lib/cash-withdrawals.ts');
  await processCashWithdrawal({ ...row }, true);
  assert.equal(row.status, 'review'); assert.equal(row.batch_id, null); assert.equal(settles, 0);
  await processCashWithdrawal({ ...row }, true); // member retry does not re-create
  assert.equal(creates, 1);
  await processCashWithdrawal({ ...row }); // owner recovery finds the tagged original
  assert.equal(row.status, 'processed'); assert.equal(row.batch_id, 'B-Batch'); assert.equal(row.payment_id, 'P-Payment');
  assert.equal(creates, 1); assert.equal(paymentCreates, 1); assert.equal(starts, 1); assert.equal(settles, 1);
  await syncCashWithdrawal({ ...row }); // reconciliation never posts or starts payments
  assert.equal(creates, 1); assert.equal(paymentCreates, 1); assert.equal(starts, 1);
}));

test('unauthenticated and non-owner callers cannot access payout administration', () => withEnv(async () => {
  let reads = 0;
  mocks.set('@/lib/supabase/profile-server', { getCurrentUserProfile: async () => null });
  mocks.set('@/lib/admin-access', { isAdminIdentity: () => false });
  mocks.set('@/lib/supabase/admin', { createAdminClient: () => { reads++; throw Error('unexpected'); } });
  const route = require('../app/api/admin/withdrawals/route.ts');
  assert.equal((await route.GET()).status, 401);
  mocks.set('@/lib/supabase/profile-server', { getCurrentUserProfile: async () => ({ user: { id: 'member' } }) });
  delete require.cache[require.resolve('../app/api/admin/withdrawals/route.ts')];
  const fresh = require('../app/api/admin/withdrawals/route.ts');
  assert.equal((await fresh.POST(new Request('https://example.invalid/api/admin/withdrawals', { method: 'POST' }))).status, 403);
  assert.equal(reads, 0);
}));
