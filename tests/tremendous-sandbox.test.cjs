const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });
  module._compile(output.outputText, filename);
};

const { isTremendousSandboxConfigured, listTremendousSandboxProducts, sendTremendousSandboxEmailTest } = require('../lib/tremendous-sandbox.ts');

test('sandbox catalog refuses missing and production credentials before any request', async () => {
  const originalKey = process.env.TREMENDOUS_SANDBOX_API_KEY;
  const originalFetch = global.fetch;
  let requests = 0;
  global.fetch = async () => { requests++; throw new Error('Unexpected request'); };
  try {
    delete process.env.TREMENDOUS_SANDBOX_API_KEY;
    assert.equal(isTremendousSandboxConfigured(), false);
    await assert.rejects(listTremendousSandboxProducts('PL'), /not configured/);
    process.env.TREMENDOUS_SANDBOX_API_KEY = 'PROD_example';
    assert.equal(isTremendousSandboxConfigured(), false);
    await assert.rejects(listTremendousSandboxProducts('PL'), /TEST_ API key/);
    process.env.TREMENDOUS_SANDBOX_API_KEY = 'TEST_example';
    assert.equal(isTremendousSandboxConfigured(), true);
    await assert.rejects(listTremendousSandboxProducts('Poland'), /Invalid country code/);
    assert.equal(requests, 0);
  } finally {
    if (originalKey === undefined) delete process.env.TREMENDOUS_SANDBOX_API_KEY;
    else process.env.TREMENDOUS_SANDBOX_API_KEY = originalKey;
    global.fetch = originalFetch;
  }
});

test('sandbox catalog uses the country filter and parses product limits', async () => {
  const originalKey = process.env.TREMENDOUS_SANDBOX_API_KEY;
  const originalFetch = global.fetch;
  process.env.TREMENDOUS_SANDBOX_API_KEY = 'TEST_example';
  global.fetch = async (url, options) => {
    assert.equal(url.hostname, 'testflight.tremendous.com');
    assert.equal(url.searchParams.get('country'), 'IN');
    assert.equal(options.headers.Authorization, 'Bearer TEST_example');
    return {
      ok: true,
      json: async () => ({ products: [{ id: 'P1', name: 'Example India Card', category: 'merchant_card',
        currency_codes: ['INR'], countries: [{ abbr: 'IN' }], skus: [{ min: 100, max: 500, currency_code: 'INR' }] }] })
    };
  };
  try {
    assert.deepEqual(await listTremendousSandboxProducts('IN'), [{ id: 'P1', name: 'Example India Card',
      category: 'merchant_card', currencyCodes: ['INR'], countries: ['IN'],
      denominations: [{ min: 100, max: 500, currencyCode: 'INR' }] }]);
  } finally {
    if (originalKey === undefined) delete process.env.TREMENDOUS_SANDBOX_API_KEY;
    else process.env.TREMENDOUS_SANDBOX_API_KEY = originalKey;
    global.fetch = originalFetch;
  }
});

test('sandbox email test only orders a country-listed $5 product with idempotency', async () => {
  const originalKey = process.env.TREMENDOUS_SANDBOX_API_KEY;
  const originalFetch = global.fetch;
  process.env.TREMENDOUS_SANDBOX_API_KEY = 'TEST_example';
  let posts = 0;
  global.fetch = async (url, options) => {
    if (url.pathname === '/api/v2/products') {
      return { ok: true, json: async () => ({ products: [
        { id: 'ELIGIBLE1', name: 'Test card', category: 'merchant_card', countries: [{ abbr: 'AZ' }], currency_codes: ['USD'], skus: [{ min: 5, max: 5, currency_code: 'USD' }] },
        { id: 'TOOHIGH1', name: 'High card', category: 'merchant_card', countries: [{ abbr: 'AZ' }], currency_codes: ['USD'], skus: [{ min: 10, max: 10, currency_code: 'USD' }] }
      ] }) };
    }
    posts++;
    const body = JSON.parse(options.body);
    assert.equal(body.external_id, 'test_reward_1');
    assert.deepEqual(body.reward.products, ['ELIGIBLE1']);
    assert.deepEqual(body.reward.value, { denomination: 5, currency_code: 'USD' });
    assert.equal(body.reward.delivery.method, 'EMAIL');
    assert.equal(body.reward.recipient.email, 'test@example.com');
    assert.equal(body.payment.funding_source_id, 'BALANCE');
    assert.equal(body.reward.campaign_id, undefined);
    return { ok: true, json: async () => ({ order: { id: 'ORDER1', status: 'EXECUTED', rewards: [{ id: 'REWARD1', delivery: { status: 'PENDING' } }] } }) };
  };
  try {
    const input = { countryCode: 'AZ', recipientName: 'Test Member', recipientEmail: 'test@example.com', externalId: 'test_reward_1' };
    await assert.rejects(sendTremendousSandboxEmailTest({ ...input, productId: 'TOOHIGH1' }), /not listed/);
    assert.equal(posts, 0);
    assert.deepEqual(await sendTremendousSandboxEmailTest({ ...input, productId: 'ELIGIBLE1' }), {
      orderId: 'ORDER1', status: 'EXECUTED', rewardId: 'REWARD1', deliveryStatus: 'PENDING'
    });
    assert.equal(posts, 1);
  } finally {
    if (originalKey === undefined) delete process.env.TREMENDOUS_SANDBOX_API_KEY;
    else process.env.TREMENDOUS_SANDBOX_API_KEY = originalKey;
    global.fetch = originalFetch;
  }
});
