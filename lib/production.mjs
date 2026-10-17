import path from 'node:path';
import {mkdir,writeFile,readFile,rename,mkdtemp} from 'node:fs/promises';
import {digest,makeDocument,safeProjectPath} from './projects.mjs';

export const productionSlug=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').slice(0,90).replace(/^-|-$/g,'')||'sem-titulo';
const numberKey=value=>String(value).trim().replace(/^0+(?=\d)/,'');
const cell=value=>String(value??'').replace(/[\r\n]+/g,' ').replaceAll('|','¦').trim();
const cells=line=>line.trim().replace(/^\||\|$/g,'').split('|').map(s=>s.trim());
const key=value=>value.toLowerCase().normalize('NFC');
export function productionLocation(channel,job){
 return path.join('producao',`${productionSlug(channel.name)}-${productionSlug(channel.id).slice(0,8)}`,`${productionSlug(job.input.videoNumber||'video')}-${productionSlug(job.input.topic)}-${productionSlug(job.id).slice(0,8)}`);
}
export function updateProductionRegister(content,proposal,{number,title,readyDate,characters,postingDate,folder,requireProposal=false}){
 if(!/^\d{1,4}$/.test(number||''))throw new Error('Informe o número do vídeo para atualizar o registro de produção.');
 const lines=content.split(/\r?\n/);let headerIndex=lines.findIndex(l=>l.trim().startsWith('|')&&cells(l).some(c=>key(c)==='nº')&&cells(l).some(c=>key(c)==='título'));
 if(headerIndex<0)throw new Error('O registro precisa de uma tabela com as colunas Nº e Título.');
 const header=cells(lines[headerIndex]),headers=header.map(key),index=name=>headers.indexOf(name);
 for(const name of ['roteiro pronto','caracteres'])if(index(name)<0)throw new Error(`Coluna obrigatória ausente no registro: ${name}.`);
 const rows=[];for(let i=headerIndex+2;i<lines.length&&lines[i].trim().startsWith('|');i++){const values=cells(lines[i]);if(values.length!==header.length)throw new Error('Linha inválida no registro de produção.');rows.push({i,values});}
 const matching=rows.filter(r=>numberKey(r.values[index('nº')])===numberKey(number));
 if(matching.length>1)throw new Error('O registro tem números de vídeo duplicados; corrija antes de finalizar.');
 let proposed=null;
 for(const line of proposal.split(/\r?\n/)){if(!line.trim().startsWith('|'))continue;const values=cells(line);if(numberKey(values[index('nº')])===numberKey(number)){if(values.length!==header.length||proposed)throw new Error('A linha sugerida do registro é inválida ou duplicada.');proposed=values;}}
 if(requireProposal&&!proposed)throw new Error('Corrija linha-registro.md: inclua uma única linha de tabela com o número do vídeo e as mesmas colunas do registro.');
 const values=matching.length?[...matching[0].values]:header.map(()=>'');
 if(proposed)for(let i=0;i<header.length;i++)if(!['nº','título','roteiro pronto','caracteres','publicado','link','views','observações'].includes(headers[i])&&proposed[i])values[i]=cell(proposed[i]);
 if(requireProposal&&index('estrutura')>=0&&!proposed?.[index('estrutura')])throw new Error('A linha do registro precisa incluir a Estrutura do roteiro aprovado.');
 values[index('nº')]=matching[0]?.values[index('nº')]||cell(number);values[index('título')]=cell(title);values[index('roteiro pronto')]=readyDate;values[index('caracteres')]=String(characters);
 const obs=index('observações');if(obs>=0){const additions=[proposed?.[obs],postingDate?`Postagem: ${postingDate}.`:null,`Pasta local: ${folder.replaceAll('\\','/')}.`].filter(Boolean).map(cell);let current=values[obs];for(const addition of additions)if(!current.includes(addition))current=[current,addition].filter(Boolean).join(' ');values[obs]=current;}
 const row='| '+values.join(' | ')+' |';
 if(matching.length)lines[matching[0].i]=row;
 else {const next=postingDate&&rows.find(r=>{const date=(r.values[obs]||'').match(/Postagem:\s*(\d{4}-\d{2}-\d{2})/i)?.[1];return date&&date>postingDate;});lines.splice(next?next.i:headerIndex+2+rows.length,0,row);}
 return {content:lines.join('\n'),row,action:matching.length?'updated':'inserted'};
}
export function prepareProduction(channel,job,historyContent){
 const project=channel.project,number=job.input.videoNumber;
 const folder=productionLocation(channel,job),date=new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'});
 const filename=`${job.input.postingDate||date}-${number||job.id.slice(0,8)}-${productionSlug(job.input.topic)}.md`;
 const history=makeDocument({path:`historico/${filename}`,role:'history',content:historyContent});
 const registers=project.files.filter(f=>f.path.split('/').at(-1)==='registro-de-producao.md');
 if(registers.length>1)throw new Error('Há mais de um registro de produção no canal; mantenha um único registro.');
 const original=registers[0];
 const base=original?.content||'# Registro de produção\n\n| Nº | Título | Roteiro pronto | Caracteres | Observações |\n|---|---|---|---|---|\n';
 const proposal=job.artifacts.find(a=>a.stageId==='register'||a.path==='linha-registro.md')?.content||'';
 const narration=job.projectValidation?.narration||historyContent;
 const updated=updateProductionRegister(base,proposal,{number,title:job.input.topic,readyDate:date,characters:[...narration].length,postingDate:job.input.postingDate,folder,requireProposal:job.projectSnapshot.profile==='staff-ride'});
 const register=makeDocument({...original,path:original?.path||'registro-de-producao.md',role:original?.role||'reference',content:updated.content});
 return {folder,history,register,registryRow:updated.row,registryAction:updated.action,registryBefore:original?digest(original.content):null};
}
export async function exportProduction(dataDir,channel,job,prepared){
 const target=path.join(dataDir,prepared.folder);await mkdir(path.dirname(target),{recursive:true});
 const outputs=new Map([['roteiro.md',job.artifacts.find(a=>a.stageId==='writing').content],['narracao.txt',job.projectValidation?.narration||job.projectNarration||prepared.history.content],['registro-de-producao.md',prepared.register.content],['linha-registro.md',prepared.registryRow]]);
 for(const artifact of job.artifacts)outputs.set('etapas/'+safeProjectPath(artifact.path),artifact.content);
 if(job.research)outputs.set('pesquisa-fontes.json',JSON.stringify(job.research,null,2));
 if(job.projectValidation)outputs.set('verificadores.json',JSON.stringify(job.projectValidation,null,2));
 const manifest=JSON.stringify({jobId:job.id,channelId:channel.id,title:job.input.topic,videoNumber:job.input.videoNumber,project:job.projectManifest,files:[...outputs].map(([name,content])=>({path:name,sha256:digest(content)}))},null,2);
 try {if(await readFile(path.join(target,'manifest.json'),'utf8')===manifest)return target;throw new Error('A pasta deste vídeo já existe com conteúdo diferente; preserve-a antes de retomar.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const staging=await mkdtemp(path.join(path.dirname(target),'.preparando-'));
 for(const [name,content] of outputs){const file=path.join(staging,...name.split('/'));await mkdir(path.dirname(file),{recursive:true});await writeFile(file,content,'utf8');}
 await writeFile(path.join(staging,'manifest.json'),manifest,'utf8');await rename(staging,target);return target;
}
