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
  return originalLoad.call(this, id.startsWith('@/') ? path.join(root, id.slice(2)) : id, parent, main);
};
require.extensions['.ts'] = (module, filename) => module._compile(
  ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
  }).outputText,
  filename
);

test('recovery links verify before opening the password form; invalid links fail closed', async () => {
  const calls = [];
  let authError = null;
  mocks.set('next/server', { NextResponse: { redirect: (url) => ({ location: String(url) }) } });
  mocks.set('@/lib/supabase/server', {
    createClient: async () => ({ auth: {
      verifyOtp: async (input) => { calls.push(['token', input]); return { error: authError }; },
      exchangeCodeForSession: async (code) => { calls.push(['code', code]); return { error: authError }; }
    } })
  });
  try {
    const { GET } = require('../app/auth/confirm/route.ts');
    const token = await GET(new Request('https://mergen.example/auth/confirm?token_hash=secret&type=recovery'));
    assert.equal(token.location, 'https://mergen.example/auth/reset-password');
    assert.deepEqual(calls[0], ['token', { type: 'recovery', token_hash: 'secret' }]);

    const code = await GET(new Request('https://mergen.example/auth/confirm?next=%2Fauth%2Freset-password%3Ftype%3Dcommunity&code=one-time-code'));
    assert.equal(code.location, 'https://mergen.example/auth/reset-password?type=community');
    assert.deepEqual(calls[1], ['code', 'one-time-code']);

    authError = new Error('expired');
    const expired = await GET(new Request('https://mergen.example/auth/confirm?token_hash=expired&type=recovery'));
    assert.equal(expired.location, 'https://mergen.example/auth/reset-password?error=invalid-link');

    authError = null;
    const external = await GET(new Request('https://mergen.example/auth/confirm?token_hash=valid&type=email&next=https%3A%2F%2Fevil.invalid'));
    assert.equal(external.location, 'https://mergen.example/auth');
  } finally {
    mocks.clear();
  }
});
