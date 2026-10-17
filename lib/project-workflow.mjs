import {digest,projectContext,stagePrompt,projectPreflight} from './projects.mjs';
import {runStaffValidators} from './project-validators.mjs';
import {isEditorialReview,EDITOR_REVIEW_VERSION} from './editor-review.mjs';
const json=value=>{try{return JSON.parse(value.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,''));}catch{throw new Error('O portão de pesquisa não retornou JSON válido; nenhuma redação foi iniciada.');}};
export function enforceResearchGate(report,research){
 const sources=(research?.sources||[]).filter(s=>s.content?.trim());
 if(sources.length<2)return {passed:false,reason:'Menos de duas fontes com conteúdo retornado. Links e resumos não atendem ao portão da skill. Pesquise novamente com leitura de páginas disponível.'};
 if(!report||report.titleCompatibility==='contradicted'||report.titleCompatibility==='unknown'||report.canProceed!==true)return {passed:false,reason:report?.reason||'A pesquisa não sustenta o título. Escolha um título ou complete as evidências; ele não será trocado automaticamente.'};
 if(!['supported','partial'].includes(report.titleCompatibility)||!Array.isArray(report.centralClaims)||!report.centralClaims.length||!Array.isArray(report.timeline)||report.timeline.length<8)return {passed:false,reason:'O portão exige afirmações centrais, grupos independentes e pelo menos oito marcos da linha do tempo.'};
 const urls=new Set(sources.map(s=>s.url));
 for(const claim of report.centralClaims){
  if(!Array.isArray(claim.sources)||claim.sources.length<2||claim.sources.some(s=>!urls.has(s.url)||typeof s.independenceGroup!=='string'||!s.independenceGroup.trim())||new Set(claim.sources.map(s=>s.url)).size<2||new Set(claim.sources.map(s=>s.independenceGroup)).size<2)return {passed:false,reason:'Uma afirmação central não tem duas fontes lidas de grupos independentes declarados. O modelo não pode inventar URLs.'};
 }
 return {passed:true,reason:'Estrutura do portão validada; a classificação e a independência ainda exigem revisão editorial humana.'};
}
export async function runProjectWorkflow(job,{generate,generateStage=(prompt)=>generate(prompt),save,signal,dataDir,prepareFinalization}){
 const project=job.projectSnapshot,input=job.input;
 const context=projectContext(project);job.projectManifest={digest:project.digest,revision:project.revision,files:context.manifest,warnings:context.warnings};
 if(!projectPreflight(project).skillPresent)throw new Error('O projeto não tem uma skill escritora ativa.');
 job.artifacts||=[];job.approvals||={};
 const staff=project.profile==='staff-ride';let production;
 for(const stage of project.workflow){
  signal.throwIfAborted();job.progress=`Projeto · ${stage.name}`;await save();
  let artifact=job.artifacts.find(a=>a.stageId===stage.id);
  if(!artifact){
   const content=await generateStage(stagePrompt(project,stage,input,job.artifacts),stage);
   if(!content.trim())throw new Error(`A etapa ${stage.name} retornou vazia.`);
   artifact={path:stage.path,stageId:stage.id,content,sha256:digest(content),createdAt:new Date().toISOString(),...(isEditorialReview(stage)?{reviewCriteria:EDITOR_REVIEW_VERSION}:{})};job.artifacts.push(artifact);await save();
  }
  if(staff&&stage.id==='research'){
   const gateDigest=digest(artifact.content+JSON.stringify(job.research?.sources||[]));
   if(job.projectResearchGate?.inputDigest!==gateDigest){
    const prompt=`Faça somente o portão da pesquisa. Não escreva roteiro nem troque o título. Título: ${input.topic}. Retorne JSON {"canProceed":boolean,"titleCompatibility":"supported|partial|contradicted|unknown","reason":"explicação e alternativas se houver contradição","centralClaims":[{"claim":"texto","sources":[{"url":"URL realmente fornecida","independenceGroup":"grupo documental"}]}],"timeline":["marcos datados"]}. Dois sites derivados de um mesmo documento são o mesmo grupo. Acesse só o conteúdo abaixo; não invente consultas. Sem fonte lida, canProceed=false.\nFICHA:\n${artifact.content}\nCONTEÚDO DAS FONTES:\n${(job.research?.sources||[]).map(s=>`${s.url}\n${s.content||'[Somente resumo; não lida]'}`).join('\n\n')}`;
    const report=json(await generateStage(prompt,{id:'research-validation',engine:project.validationEngine}));job.projectResearchGate={inputDigest:gateDigest,report,...enforceResearchGate(report,job.research)};await save();
   }
   if(!job.projectResearchGate.passed){job.status='needs_input';job.progress='Portão de pesquisa bloqueou a redação';job.error=job.projectResearchGate.reason;return {paused:true};}
  }
  const finalStage=stage===project.workflow.at(-1);
  if(finalStage&&project.archiveHistory&&prepareFinalization){
   try {production=prepareFinalization(job.artifacts.find(a=>a.stageId==='writing').content);}
   catch(error){job.status='needs_input';job.error=error.message;job.progress='Corrija os dados de finalização antes de aprovar';await save();return {paused:true};}
   const hash=digest(JSON.stringify([production.registryBefore,production.registryRow,production.history.sha256,production.register.sha256,production.folder]));
   job.finalizationPreview={hash,folder:production.folder,registryRow:production.registryRow,registryAction:production.registryAction,historyPath:production.history.path};
  }
  if((stage.approval||project.archiveHistory&&finalStage)&&(job.approvals[stage.id]!==artifact.sha256||finalStage&&job.finalizationPreview&&job.finalizationApproved!==job.finalizationPreview.hash)){
   job.status='awaiting_review';job.awaitingReview={stageId:stage.id,path:stage.path,sha256:artifact.sha256,...(finalStage&&job.finalizationPreview?{finalizationHash:job.finalizationPreview.hash}:{})};job.progress=`Revise ${stage.path} para continuar`;return {paused:true};
  }
  if(staff&&stage.id==='writing'){
   const validationDigest=digest(project.digest+job.artifacts.filter(a=>['research','writing'].includes(a.stageId)).map(a=>a.sha256).join(':'));
   if(job.projectValidation?.inputDigest!==validationDigest){job.progress='Executando verificadores revisados da skill';await save();job.projectValidation={...await runStaffValidators({project,artifacts:job.artifacts,dataDir,input,signal}),inputDigest:validationDigest};await save();}
   if(!job.projectValidation.passed){job.status='needs_input';job.progress='Os verificadores encontraram falhas';job.error='Corrija o arquivo 02-roteiro.md ou a ficha de pesquisa nos artefatos e retome. O relatório contém as falhas reais dos scripts.';return {paused:true};}
  }
 }
 const writer=job.artifacts.find(a=>a.stageId==='writing');
 if(!writer)throw new Error('O fluxo precisa de uma etapa writing para identificar o roteiro final.');
 job.projectNarration=job.projectValidation?.narration||writer.content;
 if(job.projectValidation?.narration&&!job.artifacts.some(a=>a.path==='02-roteiro-narracao.txt'))job.artifacts.push({path:'02-roteiro-narracao.txt',stageId:'clean-narration',content:job.projectNarration,sha256:digest(job.projectNarration),createdAt:new Date().toISOString()});
 return {paused:false,result:job.artifacts.map(a=>`# Arquivo: ${a.path}\n\n${a.content}`).join('\n\n---\n\n'),historyContent:writer.content,production};
}
