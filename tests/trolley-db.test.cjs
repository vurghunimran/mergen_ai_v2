const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const sql = name => fs.readFileSync(path.join(__dirname, '../supabase', name), 'utf8').replace('create extension if not exists pgcrypto;', '');

test('Trolley ledger: shared credit debits, replay/conflict, one submission, ownership, and exactly-once refunds', async () => {
  const db = new PGlite();
  const member = '11111111-1111-4111-8111-111111111111';
  const other = '22222222-2222-4222-8222-222222222222';
  const client = '33333333-3333-4333-8333-333333333333';
  const key = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
    await db.exec(sql('schema.sql'));
    for (const [id, role] of [[member, 'community'], [other, 'community'], [client, 'client']]) {
      await db.query('insert into auth.users values($1,$2,$3)', [id, `${id}@example.invalid`, { role, country: 'Azerbaijan', age_span: '25-34', adult_confirmed: true, terms_version: '2026-03-27', privacy_policy_version: '2026-03-27' }]);
    }
    await db.query("insert into surveys(id,user_id,name,target_responses) values(1,$1,'Synthetic',5)", [client]);
    await db.query('insert into survey_responses(survey_id,respondent_id,completion_time_seconds,trust_score,earned_credits) values(1,$1,60,100,2760)', [member]);
    await db.exec(sql('migrate-survey-pricing-orders.sql'));
    await db.exec(sql('migrate-prelaunch-security.sql'));
    await db.exec(sql('migrate-trolley-withdrawals.sql'));
    await db.exec(sql('migrate-trolley-withdrawals.sql')); // deployment re-run
    const reserve = async (request = key, credits = 920, who = member) => (await db.query('select reserve_cash_withdrawal($1,$2,$3,$4) as row', [who, request, credits, 'R-TestRecipient'])).rows[0].row;
    const first = await reserve();
    assert.equal(first.amount_cents, 1000);
    assert.equal(first.credits, 920);
    assert.equal((await reserve()).id, first.id);
    await assert.rejects(reserve(key, 1840), /conflict/);
    await assert.rejects(reserve('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 921), /Invalid withdrawal/);
    await assert.rejects(reserve('cccccccc-cccc-4ccc-8ccc-cccccccccccc', 920, other), /Insufficient credits/);
    await assert.rejects(reserve('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 920, client), /Invalid member/);
    const claims = await Promise.all([db.query('select claim_cash_withdrawal($1) as row', [first.id]), db.query('select claim_cash_withdrawal($1) as row', [first.id])]);
    assert.equal(claims.filter(result => result.rows[0].row?.id).length, 1);
    await db.query("update cash_withdrawals set batch_id='B-TestBatch',payment_id='P-TestPayment' where id=$1", [first.id]);
    const settle = (status, date = '2026-10-03T10:00:00Z', payment = 'P-TestPayment') => db.query('select settle_cash_withdrawal($1,$2,$3,$4,$5,$6)', [first.id, payment, status, date, '10.00', 'USD']);
    await assert.rejects(settle('processed', undefined, 'P-Wrong'), /Unknown payment/);
    await settle('processed');
    assert.equal((await db.query('select status from reward_activations where id=$1', [first.activation_id])).rows[0].status, 'fulfilled');
    await settle('pending', '2026-10-03T09:00:00Z');
    assert.equal((await db.query('select status from cash_withdrawals where id=$1', [first.id])).rows[0].status, 'processed');
    const gift = (await db.query('select redeem_reward($1,$2,$3) as row', [member, 'notion', 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'])).rows[0].row;
    assert.equal(gift.remainingCredits, 2760 - 920 - 560);
    await assert.rejects(reserve('ffffffff-ffff-4fff-8fff-ffffffffffff', 1840), /Insufficient credits/);
    await settle('returned', '2026-10-03T11:00:00Z');
    await settle('returned', '2026-10-03T11:00:00Z');
    await settle('processing', '2026-10-03T12:00:00Z');
    assert.equal((await db.query('select status from cash_withdrawals where id=$1', [first.id])).rows[0].status, 'returned');
    assert.equal((await db.query('select status from reward_activations where id=$1', [first.activation_id])).rows[0].status, 'cancelled');
    const second = await reserve('ffffffff-ffff-4fff-8fff-ffffffffffff', 1840);
    assert.equal(second.amount_cents, 2000); // full reservation restored once; gift still debited
    await db.query('select claim_cash_withdrawal($1)', [second.id]);
    await db.query("update cash_withdrawals set batch_id='B-Cancelled' where id=$1", [second.id]);
    await assert.rejects(db.query('select cancel_deleted_cash_withdrawal($1,$2)', [second.id, 'B-Wrong']), /Unknown batch/);
    await db.query('select cancel_deleted_cash_withdrawal($1,$2)', [second.id, 'B-Cancelled']);
    await db.query('select cancel_deleted_cash_withdrawal($1,$2)', [second.id, 'B-Cancelled']);
    assert.equal((await db.query('select status from reward_activations where id=$1', [second.activation_id])).rows[0].status, 'cancelled');
    await db.exec('grant usage on schema public,auth to authenticated; set role authenticated');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
    assert.equal((await db.query('select * from cash_withdrawals')).rows.length, 0);
    await assert.rejects(db.query('select reserve_cash_withdrawal($1,$2,920,$3)', [member, key, 'R-Hijacked']), /permission denied/);
    await assert.rejects(db.query("update cash_withdrawals set status='returned'"), /permission denied/);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [member]);
    assert.equal((await db.query('select * from cash_withdrawals')).rows.length, 2);
  } finally { await db.close(); }
});
