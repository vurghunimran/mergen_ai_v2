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

const { isTremendousSandboxConfigured, listTremendousSandboxProducts } = require('../lib/tremendous-sandbox.ts');

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
