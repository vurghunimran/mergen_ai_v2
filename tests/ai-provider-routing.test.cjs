const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const Module=require('node:module');const ts=require('typescript');
const root=path.resolve(__dirname,'..'),mocks=new Map(),original=Module._load;
Module._load=function(id,parent,main){if(mocks.has(id))return mocks.get(id);if(id==='server-only')return {};return original.call(this,id.startsWith('@/')?path.join(root,id.slice(2)):id,parent,main)};
for(const ext of ['.ts','.tsx'])require.extensions[ext]=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText,f);
const load=f=>{const full=path.join(root,f);delete require.cache[require.resolve(full)];return require(full)};
const request=body=>new Request('https://mergen.example/api/test',{method:'POST',body:JSON.stringify(body)});

const survey={assistantPrompt:'Study learning',researchScope:'Education',hypothesis:'Methods vary',questions:Array.from({length:5},()=>({text:'Do you study?',type:'Yes / No',options:['Yes','No']}))};
const input={surveyTitle:'Learning',questionCount:5,respondentCount:100};
const perplexityResponse=value=>Response.json({status:'completed',output:[{type:'message',role:'assistant',content:[{type:'output_text',text:JSON.stringify(value)}]}]});
test('survey creation calls only Perplexity with bounded research and validated JSON',async()=>{
 const old=process.env.PERPLEXITY_API_KEY,prev=global.fetch;process.env.PERPLEXITY_API_KEY='synthetic-perplexity';let calls=[];
 mocks.set('@/lib/survey-authorization',{requireAuthorizedProfile:async()=>({profile:{id:'client'},response:null})});mocks.set('@/lib/security/ai-budget',{withAiBudget:async(_id,scope,run)=>{assert.equal(scope,'questions');return run()}});
 try{global.fetch=async(url,options)=>{calls.push(url);assert.equal(options.headers.Authorization,'Bearer synthetic-perplexity');const body=JSON.parse(options.body);assert.equal(body.preset,'low');assert.equal(body.max_tool_calls,3);assert(body.tools.some(t=>t.type==='web_search'));assert.equal(body.response_format.json_schema.schema.properties.questions.maxItems,5);return perplexityResponse(survey)};
 const {POST}=load('app/api/survey-assistant/route.ts');const result=await POST(request(input));assert.equal(result.status,200);assert.equal((await result.json()).questions.length,5);assert.deepEqual(calls,['https://api.perplexity.ai/v1/agent']);
 for(const bad of [{...survey,questions:[]},{...survey,questions:survey.questions.map(q=>({...q,type:'Unknown'}))},null]){global.fetch=async()=>perplexityResponse(bad);assert.equal((await POST(request(input))).status,502)}
 global.fetch=async()=>Response.json({status:'incomplete',output:[]});assert.equal((await POST(request(input))).status,502);
 global.fetch=async()=>Response.json({error:{message:'sensitive provider detail'}},{status:401});const failed=await POST(request(input));assert.equal(failed.status,502);assert(!(await failed.text()).includes('sensitive provider detail'));
 delete process.env.PERPLEXITY_API_KEY;global.fetch=async()=>{throw Error('Provider must not be called')};assert.equal((await POST(request(input))).status,503);
 }finally{global.fetch=prev;if(old===undefined)delete process.env.PERPLEXITY_API_KEY;else process.env.PERPLEXITY_API_KEY=old;mocks.clear()}
});
test('Gemini evaluates response quality and server calculates bounded credits without Perplexity',async()=>{
 const old=process.env.GEMINI_API_KEY,prev=global.fetch;process.env.GEMINI_API_KEY='synthetic-gemini';let calls=[];
 try{global.fetch=async(url,options)=>{calls.push(url);assert.equal(options.headers['x-goog-api-key'],'synthetic-gemini');const body=JSON.parse(options.body);assert(body.systemInstruction.parts[0].text.includes('not whether the person is truthful'));return Response.json({candidates:[{content:{parts:[{text:JSON.stringify({trustScore:80,summary:'Relevant and complete',strengths:['Relevant'],risks:[],credits:999999})}]}}]})};
 const result=await load('lib/server-trust-evaluation.ts').evaluateSurveyResponse({surveyTitle:'Learning',questions:[{id:'q1',text:'Why?',type:'Open question',options:['Free-text response']}],answers:[{questionId:'q1',questionText:'Why?',questionType:'Open question',answer:'To learn new skills.'}],completionTimeSeconds:60});
 assert.equal(result.source,'gemini');assert.equal(result.trustScore,80);assert.equal(result.credits,load('lib/trust-score.ts').calculateCreditsFromTrustScore(80));assert.equal(calls.length,1);assert(calls[0].startsWith('https://generativelanguage.googleapis.com/'));
 }finally{global.fetch=prev;if(old===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=old}
});
