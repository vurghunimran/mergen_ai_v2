const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const originalLoad = Module._load;
Module._load = function(id, parent, main) {
  return originalLoad.call(this, id.startsWith('@/') ? path.join(root, id.slice(2)) : id, parent, main);
};
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
}).outputText, filename);
const { getMemberRewardCatalog } = require('../lib/member-reward-catalog.ts');
const { REWARD_CATEGORIES } = require('../lib/reward-categories.ts');
const { REWARD_REDEMPTION_ENABLED } = require('../lib/reward-availability.ts');
const snapshot = require('../lib/data/curated-rewards.json');

test('member catalog only returns the normalized member country, without a global fallback', () => {
  const us = getMemberRewardCatalog('United States');
  const az = getMemberRewardCatalog('Azerbaijan');
  assert.equal(us.countryCode, 'US');
  assert.equal(az.countryCode, 'AZ');
  assert.ok(us.rewards.some(reward => reward.company === 'Amazon.com'));
  assert.ok(!az.rewards.some(reward => reward.company === 'Amazon.com'));
  assert.ok(az.rewards.every(reward => reward.id.includes(':AZ:')));
  for (const country of ['', 'Unknown country', 'US', 'Iran', 'Iraq', 'Ukraine', 'Ethiopia']) {
    assert.deepEqual(getMemberRewardCatalog(country).rewards, []);
  }
});

test('curated offers use real product IDs, existing categories, $5 values and the 420-credit floor', () => {
  const ids = new Set(REWARD_CATEGORIES.filter(c => c.id !== 'cash_withdraw').map(c => c.id));
  assert.equal(snapshot.countries.length, 62);
  for (const country of snapshot.countries) {
    assert.ok(country.rewards.length <= 12);
    assert.equal(new Set(country.rewards.map(r => r.productId)).size, country.rewards.length);
    for (const reward of getMemberRewardCatalog(country.name).rewards) {
      assert.ok(/^[A-Z0-9]{4,20}$/.test(reward.productId));
      assert.ok(ids.has(reward.category));
      assert.equal(reward.usdValue, 5);
      assert.ok(Number.isSafeInteger(reward.credits) && reward.credits >= 420);
      assert.ok(Number.isFinite(reward.value) && reward.value > 0);
      assert.ok(/^[A-Z]{3}$/.test(reward.currency));
      assert.equal(new URL(reward.imageUrl).hostname, 'api.tremendous.com');
      assert.ok(!('providerPopularity' in reward));
      assert.ok(!('selectionScore' in reward));
    }
  }
  assert.equal(REWARD_REDEMPTION_ENABLED, false);
});

test('catalog card data is isolated from the snapshot and contains only browsing fields', () => {
  const first = getMemberRewardCatalog('United States');
  const name = first.rewards[0].company;
  first.rewards[0].company = 'Changed in browser';
  assert.equal(getMemberRewardCatalog('United States').rewards[0].company, name);
  assert.equal(first.giftUsdValue, 5);
  assert.equal(first.minimumGiftCredits, 420);
});
