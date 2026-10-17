import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {normalizeProject,projectContext,projectSummary,safeProjectPath,stagePrompt,makeDocument} from '../lib/projects.mjs';
import {runProjectWorkflow,enforceResearchGate} from '../lib/project-workflow.mjs';
import {priorRegister,runStaffValidators} from '../lib/project-validators.mjs';
import {EDITOR_REVIEW_VERSION} from '../lib/editor-review.mjs';

const fixture=()=>normalizeProject({files:[{path:'Instruções do Projeto.txt',content:'Decisões do dono prevalecem.'},{path:'skills/writer/SKILL.md',content:'Leia references/voice.md.'},{path:'skills/writer/references/voice.md',content:'Voz editorial própria.'},{path:'skills/writer/scripts/check.py',content:'raise Exception("NÃO EXECUTAR")'}]});
test('Project paths and roles preserve skill references and never expose arbitrary script execution',()=>{
 for(const bad of ['../secret.md','C:/secret.md','/secret.md','files/../secret.md','CON.md','a/b.'])assert.throws(()=>safeProjectPath(bad));
 const p=fixture();assert.equal(p.files[0].role,'instructions');assert.equal(p.files[1].role,'skill');assert.equal(p.files[3].role,'script');
 const context=projectContext(p);assert.match(context.context,/skills\/writer\/references\/voice.md/);assert.match(context.context,/Voz editorial própria/);assert.ok(!context.context.includes('NÃO EXECUTAR'));
 assert.ok(!JSON.stringify(projectSummary(p)).includes('Voz editorial própria'));
 assert.throws(()=>projectContext(p,{maxCharacters:10}),/nenhum arquivo/);
});
test('Project revisions have deterministic identities and only the selected skill is authoritative',()=>{
 const original=fixture(),snapshot=structuredClone(original);original.files[2]=makeDocument({...original.files[2],content:'Nova voz'});
 assert.notEqual(normalizeProject(original).digest,snapshot.digest);assert.equal(snapshot.files[2].content,'Voz editorial própria.');
 const multi=normalizeProject({files:[...snapshot.files,{path:'skills/other/SKILL.md',role:'skill',content:'Outra skill'}],writerPath:'skills/other/SKILL.md'});
 assert.match(projectContext(multi).context,/<arquivo caminho="skills\/writer\/SKILL.md" papel="reference"/);
 assert.match(stagePrompt(snapshot,snapshot.workflow[0],{topic:'Título exato'},[]),/não um esqueleto padrão/);
});
test('Skill workflow pauses before writing and reuses approved stage outputs',async()=>{
 const p=fixture(),job={projectSnapshot:p,input:{topic:'Título'},status:'running'};const calls=[];
 const options={generate:async prompt=>{calls.push(prompt);return '# Resultado '+calls.length;},save:async()=>{},signal:new AbortController().signal,dataDir:os.tmpdir()};
 assert.equal((await runProjectWorkflow(job,options)).paused,true);assert.equal(job.status,'awaiting_review');assert.equal(calls.length,1);assert.equal(job.awaitingReview.stageId,'plan');
 job.approvals.plan=job.awaitingReview.sha256;const result=await runProjectWorkflow(job,options);assert.equal(result.paused,false);assert.equal(calls.length,4);assert.equal(job.projectNarration,'# Resultado 2');assert.equal(job.projectManifest.files.length,3);
 assert.equal(job.artifacts.find(a=>a.stageId==='review').reviewCriteria,EDITOR_REVIEW_VERSION);
 assert.equal(job.artifacts.find(a=>a.stageId==='writing').reviewCriteria,undefined);
 assert.match(calls[2],/ANÁLISE CRÍTICA POR THE EDITOR/);
});

test('The Editor criteria reach generic and Staff Ride reviews without changing writing or research',()=>{
 const custom=fixture(),staff=normalizeProject({...fixture(),profile:'staff-ride',workflow:undefined});
 for(const project of [custom,staff]){
  const review=project.workflow.find(s=>['review','cold-review'].includes(s.id));
  const prompt=stagePrompt(project,review,{topic:'Título preservado',language:'English (US)'},[{path:'02-roteiro.md',content:'A quoted passage.'}]);
  for(const text of ['1. Estrutura','2. Consistência','3. Clareza e Estilo','4. Ritmo e Fluidez','5. Realismo e Verossimilhança','6. Gramática e Linguagem','7. Veredito Final','0 a 10','sempre em português','trecho exato','auditoria factual separada','não alegue nova busca'])assert.ok(prompt.includes(text),text);
  assert.match(prompt,/A quoted passage/);assert.match(prompt,/TÍTULO EXATO: Título preservado/);
  assert.ok(!stagePrompt(project,project.workflow.find(s=>s.id==='writing'),{},[]).includes(EDITOR_REVIEW_VERSION));
 }
});
test('Research gate rejects search summaries, duplicate sources, contradictions and invented URLs',()=>{
 const sources=[{url:'https://one.example',content:'Fonte 1'},{url:'https://two.example',content:'Fonte 2'}];
 const report={canProceed:true,titleCompatibility:'supported',timeline:Array.from({length:8},(_,i)=>'Marco '+i),centralClaims:[{sources:[{url:sources[0].url,independenceGroup:'A'},{url:sources[1].url,independenceGroup:'B'}]}]};
 assert.equal(enforceResearchGate(report,{sources}).passed,true);
 assert.equal(enforceResearchGate(report,{sources:sources.map(({url})=>({url}))}).passed,false);
 assert.equal(enforceResearchGate({...report,titleCompatibility:'contradicted'},{sources}).passed,false);
 const bad=structuredClone(report);bad.centralClaims[0].sources[1].url=sources[0].url;assert.equal(enforceResearchGate(bad,{sources}).passed,false);
 bad.centralClaims[0].sources[1].url='https://invented.example';assert.equal(enforceResearchGate(bad,{sources}).passed,false);
});
test('Rotation uses ready videos before target in posting order, excluding future completed scripts',()=>{
 const register='| Nº | Roteiro pronto | Estrutura |\n|---|---|---|\n| 07 | 2026-10-06 | AB1 |\n| 03 | 2026-10-12 | AB3 |\n| 02 | 2026-10-17 | AB8 |\n| 10 | 2026-10-14 | AB2 |';
 const prior=priorRegister(register,'02');assert.deepEqual(prior.allowed,['07','03']);assert.ok(!prior.text.includes('AB2'));assert.ok(!prior.text.includes('AB8'));
});
test('Reviewed Staff Ride validators execute real checks and reject modified uploaded scripts',async()=>{
 const bundled=path.resolve('lib/validators/staff-ride'),hashes=JSON.parse(await readFile(path.join(bundled,'reviewed-hashes.json'),'utf8'));
 const files=[];for(const name of Object.keys(hashes))files.push({path:'roteirista-historia-militar/scripts/'+name,content:await readFile(path.join(bundled,name),'utf8')});
 files.push({path:'roteirista-historia-militar/SKILL.md',content:'Skill'},{path:'roteirista-historia-militar/references/frases-gastas.txt',content:'# Nenhuma'},{path:'registro-de-producao.md',content:'| Nº | Roteiro pronto | Estrutura |\n|---|---|---|\n| 01 | | |'});
 const project=normalizeProject({profile:'staff-ride',files}),dataDir=await mkdtemp(path.join(os.tmpdir(),'project-qa-'));
 const args={project,dataDir,input:{topic:'Título',videoNumber:'01'},artifacts:[{path:'02-roteiro.md',content:'Texto inválido'},{path:'01-ficha-de-pesquisa.md',content:'Pesquisa incompleta'}],signal:new AbortController().signal};
 const result=await runStaffValidators(args);assert.equal(result.passed,false);assert.equal(result.checks.length,3);assert.match(result.checks[0].output,/FALHA/);
 project.files[0]=makeDocument({...project.files[0],content:'print("CÓDIGO NÃO REVISADO")'});await assert.rejects(()=>runStaffValidators({...args,project}),/difere da versão revisada/);
});
