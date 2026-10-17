import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProject} from '../lib/projects.mjs';
import {inspectSetup,validateSetupProposal,setupPrompt} from '../lib/project-setup.mjs';
import {normalizeEngine,resolveEngine,cliEffortArgs,generationEffort} from '../lib/engines.mjs';
import {generateText} from '../lib/providers.mjs';
test('Skill dependency inspection preserves relative references and excludes generated outputs',()=>{
 const project=normalizeProject({files:[{path:'skill/SKILL.md',content:'Leia `references/voz.md` e `planejamento.md`. Gere `02-roteiro.md`. Consulte `historico/`.'},{path:'skill/references/voz.md',content:'Voz'},{path:'pasta/planejamento.md',content:'Plano'}]});
 const result=inspectSetup(project);assert.equal(result.requirements.find(r=>r.path==='skill/references/voz.md').status,'present');assert.equal(result.requirements.find(r=>r.path==='planejamento.md').status,'present');assert.equal(result.requirements.find(r=>r.path==='historico').status,'missing');assert.ok(!result.requirements.some(r=>r.path==='02-roteiro.md'));
 project.files.push({path:'outra/planejamento.md',content:'Outro plano'});assert.equal(inspectSetup(project).requirements.find(r=>r.path==='planejamento.md').status,'ambiguous');
 assert.match(setupPrompt(project),/não execute a skill/);
});
test('Assistant proposal cannot select engines, execute code or remove Staff Ride required stages',()=>{
 const project=normalizeProject({workflow:[{id:'writing',name:'Escrever',path:'roteiro.md',instructions:'Escreva',engine:{provider:'claude',model:'sonnet',effort:'high'}}]});
 const proposal={summary:'Plano',workflow:[{id:'plan',name:'Plano',path:'plano.md',instructions:'Planeje',approval:true},{...project.workflow[0],engine:{provider:'deepseek',model:'inventado'}}],requirements:[{path:'planejamento.md',label:'Planejamento'}],tools:[],warnings:[]};
 assert.deepEqual(validateSetupProposal(proposal,project).workflow[1].engine,project.workflow[0].engine);
 assert.throws(()=>validateSetupProposal({...proposal,requirements:[{path:'../secret.md'}]},project),/inseguro/);
 assert.throws(()=>validateSetupProposal(proposal,normalizeProject({profile:'staff-ride'})),/obrigatórias/);
 assert.throws(()=>validateSetupProposal({summary:'incompleto'},project),/proposta válida/);
 assert.throws(()=>validateSetupProposal({...proposal,workflow:[project.workflow[0]]},project),/aprovação antes/);
});
test('Engine settings route provider, model and actual effort arguments without cross-provider inheritance',()=>{
 assert.deepEqual(resolveEngine({provider:'claude',model:'sonnet',effort:'high'},{provider:'deepseek',model:'deepseek-flash',effort:'max'}),{provider:'claude',model:'sonnet',effort:'high'});
 assert.equal(resolveEngine({provider:'agy'},{provider:'deepseek',model:'x',effort:'max'},{agy:{model:'gemini-model'}}).effort,'');
 assert.deepEqual(resolveEngine({provider:'claude'},{provider:'claude',model:'opus',effort:'max'},{claude:{model:'sonnet'}}),{provider:'claude',model:'sonnet',effort:''});
 assert.deepEqual(cliEffortArgs('claude','high'),['--effort','high']);assert.deepEqual(cliEffortArgs('agy','max'),['--effort','max']);assert.deepEqual(cliEffortArgs('codex','high'),['-c','model_reasoning_effort="high"']);
 assert.throws(()=>normalizeEngine({provider:'ollama',effort:'high'}),/incompatível/);
 assert.throws(()=>generationEffort('gemini','gemini-2.5-pro','high'),/Padrão/);
});
test('Reasoning selections reach official API payloads, not just prompts',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);const bodies=[];
 globalThis.fetch=async(url,opts)=>{bodies.push(JSON.parse(opts.body));if(String(url).includes('deepseek'))return Response.json({choices:[{finish_reason:'stop',message:{content:'ok'}}]});if(String(url).includes('googleapis'))return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'ok'}]}}]});return Response.json({output_text:'ok'});};
 await generateText({provider:'deepseek',model:'deepseek-flash',effort:'high',prompt:'teste',settings:{deepseek:{apiKey:'fake'}}});assert.deepEqual(bodies.at(-1).thinking,{type:'enabled'});assert.equal(bodies.at(-1).reasoning_effort,'high');
 await generateText({provider:'openai',model:'gpt-test',effort:'high',prompt:'teste',settings:{openai:{apiKey:'fake'}}});assert.deepEqual(bodies.at(-1).reasoning,{effort:'high'});
 await generateText({provider:'gemini',model:'gemini-3.8-flash',effort:'low',prompt:'teste',settings:{gemini:{apiKey:'fake'}}});assert.equal(bodies.at(-1).generationConfig.thinkingConfig.thinkingLevel,'low');
});
