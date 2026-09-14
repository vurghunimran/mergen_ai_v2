const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const mocks = new Map();
const originalLoad = Module._load;
Module._load = function(id, parent, isMain) {
  if (mocks.has(id)) return mocks.get(id);
  return originalLoad.call(this, id.startsWith('@/') ? path.join(root, id.slice(2)) : id, parent, isMain);
};
for (const extension of ['.ts', '.tsx']) require.extensions[extension] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true
  }});
  module._compile(result.outputText, filename);
};
const p = require('../lib/survey-pricing.ts');
const { assertOrderPayment, assertOrderSurvey } = require('../lib/survey-order-verification.ts');
const expected = {
  student: [[32.5,55,122.5,235,460],[40,70,160,310,610],[47.5,85,197.5,385,760],[55,100,235,460,910],[62.5,115,272.5,535,1060]],
  institution: [[62.5,100,212.5,400,775],[75,125,275,525,1025],[87.5,150,337.5,650,1275],[100,175,400,775,1525],[112.5,200,462.5,900,1775]]
};
const valid = { pricingCategory: 'student', questionCount: 10, responseCount: 100, includeDetailedReport: false };
for (const category of ['student','institution']) for (const [qi,Q] of p.academicQuestionCountOptions.entries()) for (const [ni,N] of p.academicRespondentCountOptions.entries()) {
  test(`${category}: ${Q} questions, ${N} responses (base and report)`, () => {
    const base = p.calculateSurveyPricing({ ...valid, pricingCategory: category, questionCount: Q, responseCount: N });
    const withReport = p.calculateSurveyPricing({ ...valid, pricingCategory: category, questionCount: Q, responseCount: N, includeDetailedReport: true });
    assert.equal(base.totalCents, expected[category][qi][ni] * 100);
    assert.equal(base.responseSubtotalCents + base.setupFeeCents, base.baseTotalCents);
    assert.equal(withReport.totalCents, base.totalCents + 2000);
    assert.equal(withReport.reportFeeCents,2000);
    assert.equal(base.pricingVersion,'survey-formula-v1');
  });
}
test('rejects malformed, unsupported, fractional and coerced inputs', () => {
  for (const input of [null,undefined,[],{},'student']) assert.throws(()=>p.calculateSurveyPricing(input), p.SurveyPricingError);
  for (const [key,values] of Object.entries({pricingCategory:['Student','community','business','',null],questionCount:[0,-5,6,11,26,Infinity,NaN,10.5,'10',null],responseCount:[0,99,100.5,'100',null],includeDetailedReport:[undefined,null,0,1,'false','true']})) {
    for (const value of values) assert.throws(()=>p.calculateSurveyPricing({...valid,[key]:value}), p.SurveyPricingError);
  }
});
test('frontend and authorized server share formula and ignore supplied amounts', () => {
  for (const pricingCategory of ['student','institution']) {
    const input = {...valid,pricingCategory,totalCents:1,perResponseCents:0,discount:100};
    assert.deepEqual(p.calculateAuthorizedSurveyPricing(input,pricingCategory),p.calculateSurveyPricing(input));
  }
  assert.throws(()=>p.calculateAuthorizedSurveyPricing(valid,'institution'));
});
test('existing student classification excludes faculty, institutions and respondents', () => {
  for (const position of ['Student','Graduate Student','PhD Candidate']) assert.equal(p.hasStudentClassification({role:'client',affiliationType:'university',position}),true);
  for (const profile of [{role:'community',affiliationType:'university',position:'Student'},{role:'client',affiliationType:'institution',position:'Student'},{role:'client',affiliationType:'university',position:'Professor'}]) assert.equal(p.hasStudentClassification(profile),false);
});
test('allowance permits editing within purchase but never exceeding it', () => {
  p.assertSurveyAllowance(10,Array(9).fill({}));
  for (const n of [0,4,11]) assert.throws(()=>p.assertSurveyAllowance(10,Array(n).fill({})));
});
const order = {id:'order-1',user_id:'client-1',checkout_id:'checkout-1',currency:'USD',total_cents:7000,question_count:10,response_count:100,include_detailed_report:false,pricing_version:'survey-formula-v1',pricing:{}};
const evidence = {id:'checkout-1',external_customer_id:'client-1',status:'succeeded',amount:7000,currency:'usd',metadata:{order_id:'order-1'}};
test('payment must match persisted amount, owner, currency and checkout', () => {
  assert.equal(assertOrderPayment(order,evidence,'client-1'),true);
  for (const patch of [{amount:1},{discount_amount:100},{currency:'eur'},{external_customer_id:null},{external_customer_id:'someone-else'},{id:'other'},{metadata:{order_id:'other'}}]) assert.throws(()=>assertOrderPayment(order,{...evidence,...patch},'client-1'));
  assert.equal(assertOrderPayment(order,{...evidence,status:'open'},'client-1'),false);
});
test('historical paid prices remain original even when formula differs', () => {
  const historical = {...order,total_cents:12000,pricing_version:'legacy-polar-v0',pricing:{totalCents:12000}};
  const before = JSON.stringify(historical);
  assert.equal(assertOrderPayment(historical,{...evidence,amount:12000,metadata:{}},'client-1'),true);
  assert.equal(JSON.stringify(historical),before);
  assert.notEqual(p.calculateSurveyPricing(valid).totalCents,historical.total_cents);
});
test('published survey must match bought responses, question allowance and report', () => {
  const payload = {questionCount:10,targetResponses:100,includeDetailedAI:false,questions:Array(10).fill({})};
  assertOrderSurvey(order,payload);
  assert.throws(()=>assertOrderSurvey({...order,requires_review:true},payload), /Legacy payment/);
  for (const patch of [{questionCount:25},{targetResponses:1000},{includeDetailedAI:true},{questions:Array(11).fill({})}]) assert.throws(()=>assertOrderSurvey(order,{...payload,...patch}));
});
test('actual checkout handler persists server price, rejects discount spoof and invalid requests', async () => {
  let category='institution', saved, charged; const events=[];
  mocks.set('@/lib/client-pricing-category',{getClientPricingContext:async()=>({profile:{id:'client-1',email:'client@university.edu'},user:{email:'client@university.edu'},pricingCategory:category})});
  mocks.set('@/lib/polar',{createPolarCheckout:async input=>{events.push('provider');charged=input;return{id:'checkout-1',url:'https://checkout.example/1'}}});
  mocks.set('@/lib/supabase/admin',{createAdminClient:()=>({from:()=>({insert:value=>{saved=value;events.push('persist');return{select:()=>({single:async()=>({data:{id:'order-1'},error:null})})}},update:()=>({eq:async()=>({error:null})})})})});
  const {POST}=require('../app/api/polar/checkout/route.ts');
  const request = body=>new Request('https://mergen.example/api/polar/checkout',{method:'POST',body:JSON.stringify(body)});
  const input={surveyTitle:'Test',pricingCategory:'institution',questionCount:10,respondentCount:100,includeDetailedAI:true,totalCents:1,discount:100};
  const response=await POST(request(input)); assert.equal(response.status,200);
  assert.equal(charged.amountInCents,14500);assert.equal(saved.total_cents,14500);assert.equal(saved.pricing.reportFeeCents,2000);
  assert.deepEqual(events,['persist','provider']);
  const originalError=console.error; console.error=()=>{};
  try {
    assert.equal((await POST(request({...input,pricingCategory:'student'}))).status,400);
    assert.equal((await POST(request({...input,questionCount:11}))).status,400);
    assert.equal((await POST(request({...input,includeDetailedAI:'false'}))).status,400);
    category='student'; assert.equal((await POST(request({...input,pricingCategory:'student'}))).status,200);assert.equal(charged.amountInCents,9000);
  } finally { console.error=originalError; mocks.clear(); }
});
test('account resolver rechecks confirmed email and existing signup eligibility', async () => {
  let row={affiliation_type:'university',position:'Student'}, confirmed=true,allowed=true;
  mocks.set('@/lib/supabase/profile-server',{getCurrentUserProfile:async()=>({profile:{id:'client-1',role:'client',position:'Student'},user:{email:'student@uni.edu',email_confirmed_at:confirmed?'date':null}})});
  mocks.set('@/lib/supabase/server',{createClient:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:row,error:null})})})})})});
  mocks.set('@/lib/client-signup-eligibility',{checkClientSignupEligibility:async()=>Response.json({allowed})});
  const {getClientPricingContext}=require('../lib/client-pricing-category.ts');
  try {
    assert.equal((await getClientPricingContext()).pricingCategory,'student');
    allowed=false;assert.equal((await getClientPricingContext()).pricingCategory,'institution');
    allowed=true;confirmed=false;assert.equal((await getClientPricingContext()).pricingCategory,'institution');
    confirmed=true;row={affiliation_type:'institution',position:'Student'};assert.equal((await getClientPricingContext()).pricingCategory,'institution');
    row=null;assert.equal((await getClientPricingContext()).pricingCategory,'institution');
  } finally {mocks.clear();}
});
test('rendered preview defaults to institution and displays exact cents and optional summary', () => {
  const React=require('react'); const {renderToStaticMarkup}=require('react-dom/server');
  const Calculator=require('../components/pricing/SurveyPricingCalculator.tsx').default;
  const Breakdown=require('../components/pricing/SurveyPriceBreakdown.tsx').default;
  const html=renderToStaticMarkup(React.createElement(Calculator));
  assert.match(html,/value="institution" selected/);assert.match(html,/\$125\.00/);assert.match(html,/AI-generated summary not selected/);assert.doesNotMatch(html,/Basic AI summary included/);
  const student=renderToStaticMarkup(React.createElement(Breakdown,{pricing:p.calculateSurveyPricing({...valid,questionCount:5,responseCount:50})}));
  assert.match(student,/\$32\.50/);assert.match(student,/\$0\.45/);
});

test('AI summaries require purchase and finished collection with responses', () => {
  const {getSurveyReportAccessError,isSurveyFinished}=require('../lib/survey-report-access.ts');
  const survey={status:'published',responses:1,targetResponses:50,daysRemaining:3,includeDetailedAI:false,rawResponses:[{}]};
  assert.equal(getSurveyReportAccessError(survey).status,403);
  assert.equal(getSurveyReportAccessError({...survey,includeDetailedAI:true}).status,409);
  for (const finish of [{status:'archived'},{status:'completed'},{responses:50},{distributionExpiresAt:'2020-01-01T00:00:00Z'},{daysRemaining:0}]) {
    assert.equal(getSurveyReportAccessError({...survey,...finish,includeDetailedAI:true}),null);
    assert.equal(getSurveyReportAccessError({...survey,...finish}).status,403);
  }
  assert.equal(getSurveyReportAccessError({...survey,status:'archived',includeDetailedAI:true,rawResponses:[]}).status,400);
  assert.equal(isSurveyFinished({...survey,status:'draft',daysRemaining:0}),false);
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const Breakdown=require('../components/pricing/SurveyPriceBreakdown.tsx').default;
  const html=renderToStaticMarkup(React.createElement(Breakdown,{pricing:p.calculateSurveyPricing({...valid,includeDetailedReport:true})}));
  assert.match(html,/available once the survey finishes/);assert.match(html,/\$90\.00/);
});

test('report API blocks unpaid and unfinished requests before generation', async () => {
  let survey={status:'published',responses:1,targetResponses:50,daysRemaining:3,includeDetailedAI:false,rawResponses:[{}]};
  mocks.set('@/lib/survey-authorization',{requireAuthorizedProfile:async()=>({profile:{id:'client-1'}}),buildForbiddenSurveyResponse:()=>Response.json({error:'Forbidden'},{status:403})});
  mocks.set('@/lib/supabase/server',{createClient:()=>({})});
  mocks.set('@/lib/survey-db',{getClientSurveyForUser:async()=>survey});
  const {POST}=require('../app/api/survey-report/route.ts');
  const req=()=>new Request('https://mergen.example/api/survey-report',{method:'POST',body:JSON.stringify({surveyId:1})});
  try {
    assert.equal((await POST(req())).status,403);
    survey={...survey,includeDetailedAI:true};assert.equal((await POST(req())).status,409);
    survey={...survey,status:'archived',rawResponses:[]};assert.equal((await POST(req())).status,400);
  } finally {mocks.clear();}
});
