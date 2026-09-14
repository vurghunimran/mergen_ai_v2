const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('PostgreSQL migration: paid ownership, RLS, allowance, replay protection and history', async () => {
  const db = new PGlite();
  const client='11111111-1111-4111-8111-111111111111';
  const other='22222222-2222-4222-8222-222222222222';
  const paid='33333333-3333-4333-8333-333333333333';
  const pending='44444444-4444-4444-8444-444444444444';
  const legacy='55555555-5555-4555-8555-555555555555';
  const q=JSON.stringify(Array(10).fill({text:'Question'}));
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create function auth.uid() returns uuid language sql as $$ select '${client}'::uuid $$;
      create table public.profiles(id uuid primary key);
      insert into profiles values ('${client}'),('${other}');
      create table public.surveys(id serial primary key,user_id uuid,question_count integer,target_responses integer,include_detailed_ai boolean,questions jsonb);
      insert into surveys(user_id,question_count,target_responses,include_detailed_ai,questions) values ('${client}',10,100,false,'${q}');`);
    const migration=fs.readFileSync(path.join(__dirname,'../supabase/migrate-survey-pricing-orders.sql'),'utf8');
    await db.exec(migration);
    await db.exec(migration); // safe to reapply
    await db.query(`insert into survey_orders(id,user_id,checkout_id,currency,total_cents,question_count,response_count,include_detailed_report,pricing_version,pricing,status,requires_review)
      values ($1,$2,'paid','USD',7000,10,100,false,'survey-formula-v1','{"totalCents":7000}','paid',false),
      ($3,$2,'pending','USD',7000,10,100,false,'survey-formula-v1','{}','pending',false),
      ($4,$2,'legacy','USD',12000,10,100,false,'legacy-polar-v0','{"totalCents":12000}','paid',true)`,[paid,client,pending,legacy]);
    const insert=(orderId,owner=client,count=10,report=false,questions=q,responses=100)=>db.query(`insert into surveys(pricing_order_id,user_id,question_count,target_responses,include_detailed_ai,questions) values ($1,$2,$3,$4,$5,$6) returning id`,[orderId,owner,count,responses,report,questions]);
    await assert.rejects(insert(null),/paid order/);
    await assert.rejects(insert(pending),/paid order/);
    await assert.rejects(insert(legacy),/paid order/);
    await assert.rejects(insert(paid,other),/paid order/);
    await assert.rejects(insert(paid,client,25),/allowance/);
    await assert.rejects(insert(paid,client,null),/allowance/);
    await assert.rejects(insert(paid,client,10,true),/allowance/);
    await assert.rejects(insert(paid,client,10,false,JSON.stringify(Array(11).fill({}))),/allowance/);
    await assert.rejects(insert(paid,client,10,false,null),/allowance/);
    await assert.rejects(insert(paid,client,10,false,q,1000),/allowance/);
    const published=await insert(paid);
    await assert.rejects(insert(paid),/duplicate key/);
    await assert.rejects(db.query('update surveys set target_responses=1000 where id=$1',[published.rows[0].id]),/allowance/);
    await assert.rejects(db.query('update surveys set pricing_order_id=null where id=$1',[published.rows[0].id]),/cannot be changed/);
    assert.equal((await db.query('select pricing_order_id from surveys where id=1')).rows[0].pricing_order_id,null);
    assert.equal((await db.query('select total_cents from survey_orders where id=$1',[legacy])).rows[0].total_cents,12000);
    await db.exec('set role authenticated');
    await assert.rejects(db.query('update survey_orders set total_cents=1 where id=$1',[paid]),/permission denied/);
    await assert.rejects(db.query("insert into survey_orders(user_id) values ($1)",[client]),/permission denied/);
    assert.equal((await db.query('select count(*)::int as count from survey_orders')).rows[0].count,3);
    await db.exec('reset role');
    await db.query(`insert into survey_orders(user_id,currency,total_cents,question_count,response_count,include_detailed_report,pricing_version,pricing) values ($1,'USD',12500,10,100,false,'survey-formula-v1','{}')`,[other]);
    await db.exec('set role authenticated');
    assert.equal((await db.query('select count(*)::int as count from survey_orders')).rows[0].count,3);
  } finally { await db.close(); }
});
