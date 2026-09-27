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

const { validateSurveyAttachmentsInput, isSupportedSurveyFileType } = require('../lib/survey-attachments.ts');
const { buildRawDataCsv, buildFallbackSurveyReport } = require('../lib/survey-report.ts');
const file=(name,mime,bytes)=>({supportingFile:{name,mimeType:mime,dataUrl:'data:'+mime+';base64,'+Buffer.from(bytes,'binary').toString('base64')}});
test('supporting files reject renamed HTML, mismatched MIME and false signatures',()=>{
  assert.equal(isSupportedSurveyFileType('research.pdf','text/html'),false);
  assert.ok(validateSurveyAttachmentsInput(file('research.pdf','text/html','<html>bad</html>')).error);
  assert.ok(validateSurveyAttachmentsInput(file('research.pdf','application/pdf','<html>bad</html>')).error);
  assert.ok(validateSurveyAttachmentsInput(file('research.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document','bad')).error);
  assert.ok(validateSurveyAttachmentsInput(file('research.pdf','application/pdf','%PDF-1.7\n')).attachments);
  assert.ok(validateSurveyAttachmentsInput(file('answers.csv','text/csv','a,b\n1,2')).attachments);
  assert.ok(validateSurveyAttachmentsInput(file('data.json','application/json','{"a":1}')).attachments);
  assert.ok(validateSurveyAttachmentsInput(file('data.json','application/json','{bad}')).error);
});
test('images reject active SVG and spoofed raster content',()=>{
  for(const [mime,bytes] of [['image/svg+xml','<svg></svg>'],['image/png','<html>']]) {
    assert.ok(validateSurveyAttachmentsInput({images:[{name:'image.png',dataUrl:'data:'+mime+';base64,'+Buffer.from(bytes).toString('base64')}]}).error);
  }
});
test('CSV neutralizes formulas in both question headings and answers and preserves quoting',()=>{
  for(const value of ['=1+1','+SUM(1,2)','-1+1','@SUM(1,2)','  =1+1','\t=1+1']) {
    const csv=buildRawDataCsv({questions:[{id:'q',text:value}],rawResponses:[{id:'r',answers:[{questionId:'q',answer:value}]}]});
    assert.ok(csv.includes('"\''+value+'"'));
    assert.ok(csv.split('\n').slice(1).join('\n').includes('"\''+value.trim()+'"'));
  }
  assert.ok(buildRawDataCsv({questions:[{id:'q',text:'Say "hello"'}],rawResponses:[]}).includes('"Say ""hello"""'));
});
test('statistical fallback identifies itself as generated without AI',()=>{
  const report=buildFallbackSurveyReport({name:'Test',targetResponses:50,questions:[],rawResponses:[],responses:0});
  assert.match(report.methodologyNote,/without AI interpretation/);
});
test('reward POST refuses even authorized redemption before any database write',async()=>{
  let writes=0;
  mocks.set('@/lib/survey-authorization',{requireAuthorizedProfile:async()=>({profile:{id:'member'}})});
  mocks.set('@/lib/supabase/admin',{createAdminClient:()=>{writes++;throw Error('must not reach database')}});
  const route=require('../app/api/rewards/activations/route.ts');
  const response=await route.POST(new Request('https://example.com/api/rewards/activations',{method:'POST',body:JSON.stringify({rewardId:'notion',idempotencyKey:'12345678-1234-1234-1234-123456789012'})}));
  assert.equal(response.status,503);assert.equal((await response.json()).code,'REWARDS_NOT_AVAILABLE');assert.equal(writes,0);
});

test('pagination returns all 1250 rows and fails closed on a later-page error',async()=>{
  const {fetchAllRows}=require('../lib/supabase/pagination.ts');
  const rows=Array.from({length:1250},(_,id)=>({id}));
  const result=await fetchAllRows(()=>({range:async(from,to)=>({data:rows.slice(from,to+1),error:null})}));
  assert.deepEqual(result.data,rows);assert.equal(result.error,null);
  const failure=await fetchAllRows(()=>({range:async(from,to)=>from>=100?{data:null,error:'storage unavailable'}:{data:rows.slice(from,to+1),error:null}}));
  assert.equal(failure.data,null);assert.equal(failure.error,'storage unavailable');
});

test('legacy Polar webhook configuration still verifies signatures',async()=>{
  const previous=process.env.POLAR_WEBHOOK_SECRET;const legacy=process.env.POLAR_WEBHOOK;
  delete process.env.POLAR_WEBHOOK_SECRET;process.env.POLAR_WEBHOOK='legacy-test-secret';
  try { const route=require('../app/api/polar/webhook/route.ts');const r=await route.POST(new Request('https://example.com/api/polar/webhook',{method:'POST',body:'{}'}));assert.equal(r.status,401); }
  finally { if(previous===undefined)delete process.env.POLAR_WEBHOOK_SECRET;else process.env.POLAR_WEBHOOK_SECRET=previous;if(legacy===undefined)delete process.env.POLAR_WEBHOOK;else process.env.POLAR_WEBHOOK=legacy; }
});
