const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const originalLoad = Module._load;
const mocks = new Map();
Module._load = function (name, parent, main) {
  if (mocks.has(name)) return mocks.get(name);
  if (name.startsWith('@/lib/')) return originalLoad.call(this, `${process.cwd()}/${name.slice(2)}.ts`, parent, main);
  return originalLoad.call(this, name, parent, main);
};
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  module._compile(result.outputText, filename);
};
const envNames = ['TREMENDOUS_MODE', 'TREMENDOUS_API_KEY', 'TREMENDOUS_SANDBOX_API_KEY', 'TROLLEY_MODE', 'TROLLEY_LIVE_ACCESS_KEY', 'TROLLEY_LIVE_SECRET_KEY', 'TROLLEY_LIVE_WEBHOOK_SECRET', 'TROLLEY_ALLOWED_COUNTRIES', 'TROLLEY_WITHDRAWALS_ENABLED', 'POLAR_SERVER', 'POLAR_ACCESS_TOKEN', 'POLAR_SURVEY_PRODUCT_ID', 'POLAR_WEBHOOK', 'POLAR_WEBHOOK_SECRET', 'APP_BASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'GEMINI_API_KEY', 'GEMINI_MODEL', 'PERPLEXITY_API_KEY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET', 'TELEGRAM_BOT_USERNAME', 'CRON_SECRET'];
async function isolated(task) {
  const saved = Object.fromEntries(envNames.map(name => [name, process.env[name]]));
  const fetch = global.fetch;
  envNames.forEach(name => delete process.env[name]);
  try { await task(); } finally {
    for (const [name, value] of Object.entries(saved)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    global.fetch = fetch;
    mocks.clear();
  }
}
const tremendous = require('../lib/tremendous.ts');
const { getProductionReadiness } = require('../lib/production-readiness.ts');

test('production Tremendous never falls back to sandbox credentials or sends test keys to live host', () => isolated(async () => {
  process.env.TREMENDOUS_SANDBOX_API_KEY = 'TEST_sandbox';
  let calls = 0;
  global.fetch = async () => { calls++; throw Error('unexpected network'); };
  assert.equal(tremendous.tremendousMode(), 'production');
  assert.equal(tremendous.isTremendousConfigured(), false);
  await assert.rejects(tremendous.listTremendousProducts('AZ'), /credentials/);
  process.env.TREMENDOUS_API_KEY = 'TEST_wrong';
  await assert.rejects(tremendous.listTremendousProducts('AZ'), /credentials/);
  process.env.TREMENDOUS_API_KEY = 'PROD_live';
  await assert.rejects(tremendous.listTremendousProducts('Azerbaijan'), /country/);
  assert.equal(calls, 0);
}));

test('live catalog uses the official production host; sandbox remains an explicit separate mode', () => isolated(async () => {
  process.env.TREMENDOUS_API_KEY = 'PROD_live';
  process.env.TREMENDOUS_SANDBOX_API_KEY = 'TEST_sandbox';
  global.fetch = async (url, options) => {
    const host = new URL(url).hostname;
    assert.equal(host, tremendous.tremendousMode() === 'production' ? 'api.tremendous.com' : 'testflight.tremendous.com');
    assert.equal(options.headers.Authorization, tremendous.tremendousMode() === 'production' ? 'Bearer PROD_live' : 'Bearer TEST_sandbox');
    assert.equal(new URL(url).searchParams.get('country'), 'AZ');
    assert.equal(options.method, undefined);
    assert.equal(options.cache, 'no-store');
    return { ok: true, json: async () => ({ products: [{ id: 'ABC1', name: 'Real gift', countries: [{ abbr: 'AZ' }], skus: [{ min: 10, max: 20, currency_code: 'USD' }] }] }) };
  };
  assert.equal((await tremendous.listTremendousProducts('AZ'))[0].name, 'Real gift');
  process.env.TREMENDOUS_MODE = 'sandbox';
  assert.equal((await tremendous.listTremendousProducts('AZ'))[0].id, 'ABC1');
}));

test('missing production integrations remain blocked with no provider requests and no credential values', () => isolated(async () => {
  global.fetch = async () => { throw Error('unexpected network'); };
  const checks = await getProductionReadiness();
  assert.equal(checks.length, 9);
  assert.ok(checks.every(item => item.status === 'blocked'));
  assert.ok(checks.find(item => item.service === 'Trolley').missing.includes('TROLLEY_LIVE_WEBHOOK_SECRET'));
}));

test('readiness distinguishes limited Polar token scope from verified checkout access and contains provider failures', () => isolated(async () => {
  Object.assign(process.env, { APP_BASE_URL: 'https://example.com', POLAR_ACCESS_TOKEN: 'private_token', POLAR_SURVEY_PRODUCT_ID: 'product', POLAR_WEBHOOK: 'private_secret', TREMENDOUS_API_KEY: 'PROD_private' });
  global.fetch = async url => {
    if (url.startsWith('https://api.polar.sh/')) return { ok: false, status: 403, json: async () => ({ error: 'insufficient_scope', private: 'private_token' }) };
    throw Error('Sensitive provider response PROD_private');
  };
  const checks = await getProductionReadiness();
  assert.equal(checks.find(item => item.service === 'Polar').status, 'unverified');
  assert.equal(checks.find(item => item.service === 'Tremendous').status, 'unverified');
  assert.ok(!JSON.stringify(checks).includes('private'));
}));

test('readiness requires matching Polar webhook secret and required refund event', () => isolated(async () => {
  Object.assign(process.env, { APP_BASE_URL: 'https://example.com', POLAR_ACCESS_TOKEN: 'token', POLAR_SURVEY_PRODUCT_ID: 'product', POLAR_WEBHOOK_SECRET: 'secret' });
  const endpoint = { url: 'https://example.com/api/polar/webhook', enabled: true, secret: 'secret', events: ['checkout.updated', 'order.paid', 'order.refunded'] };
  global.fetch = async url => ({ ok: true, status: 200, json: async () => url.includes('/products/') ? { is_archived: false, is_recurring: false } : { items: [endpoint] } });
  assert.equal((await getProductionReadiness()).find(item => item.service === 'Polar').status, 'verified');
  endpoint.secret = 'different';
  assert.equal((await getProductionReadiness()).find(item => item.service === 'Polar').status, 'blocked');
  endpoint.secret = 'secret'; endpoint.events.pop();
  assert.equal((await getProductionReadiness()).find(item => item.service === 'Polar').status, 'blocked');
}));

test('owner-only integration endpoint refuses anonymous and non-owner sessions before provider access', () => isolated(async () => {
  let checks = 0;
  let authenticated = null;
  mocks.set('@/lib/supabase/profile-server', { getCurrentUserProfile: async () => authenticated });
  mocks.set('@/lib/admin-access', { isAdminIdentity: user => user.id === 'owner' });
  mocks.set('@/lib/production-readiness', { getProductionReadiness: async () => { checks++; return []; } });
  const route = require('../app/api/admin/integrations/route.ts');
  assert.equal((await route.GET()).status, 401);
  authenticated = { user: { id: 'member' } };
  assert.equal((await route.GET()).status, 403);
  assert.equal(checks, 0);
  authenticated = { user: { id: 'owner' } };
  const response = await route.GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(checks, 1);
}));
