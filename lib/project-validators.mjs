import {readFile,mkdir,writeFile,mkdtemp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {digest,safeProjectPath} from './projects.mjs';
const bundled=path.join(path.dirname(fileURLToPath(import.meta.url)),'validators','staff-ride');
async function execute(script,args,signal){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.env.ROTEIROS_PYTHON||'python',['-I','-S','-X','utf8',path.join(bundled,script),...args],{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let output='',finished=false;const timer=setTimeout(()=>stop('O verificador excedeu 30 segundos.'),30000);
  function finish(error,result){if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);error?reject(error):resolve(result);}
  function stop(message){child.kill();finish(new Error(message));}const cancel=()=>stop('Verificação cancelada.');signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)cancel();
  for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output+=chunk.toString('utf8');if(output.length>300000)stop('Saída do verificador maior que o limite.');});
  child.on('error',()=>finish(new Error('Python não está disponível para executar os verificadores revisados. Configure ROTEIROS_PYTHON.')));
  child.on('close',code=>finish(null,{script,exitCode:code,passed:code===0,output}));
 });
}
export async function mirrorProject(dataDir,channelId,project){
 const base=path.join(dataDir,'projects',digest(channelId).slice(0,32));await mkdir(base,{recursive:true});const folder=await mkdtemp(path.join(base,'revision-'));
 for(const file of project.files){const name=safeProjectPath(file.path),target=path.join(folder,...name.split('/'));await mkdir(path.dirname(target),{recursive:true});await writeFile(target,file.content,'utf8');}
 await writeFile(folder+'.manifest.json',JSON.stringify({digest:project.digest,files:project.files.map(({content,...f})=>f)},null,2));return folder;
}
export function priorRegister(text,number){
 const lines=text.split(/\r?\n/),out=[];let header=null;const allowed=[];
 for(const line of lines){
  if(!line.startsWith('|'))continue;const cells=line.replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
  if(!header){if(cells.some(c=>/^estrutura$/i.test(c))){header=cells.map(c=>c.toLowerCase());out.push(line);}continue;}
  if(cells.every(c=>/^[-: ]*$/.test(c))){out.push(line);continue;}
  const record=Object.fromEntries(header.map((h,i)=>[h,cells[i]||'']));
  if(record['nº']?.replace(/^0+/,'')===String(number).replace(/^0+/,''))break;
  if(record['roteiro pronto']&&record.estrutura){out.push(line);allowed.push(record['nº']);}
 }
 return {text:out.join('\n'),allowed};
}
export async function runStaffValidators({project,artifacts,dataDir,input,signal}){
 const hashes=JSON.parse(await readFile(path.join(bundled,'reviewed-hashes.json'),'utf8'));
 for(const [name,expected]of Object.entries(hashes)){
  if(digest(await readFile(path.join(bundled,name)))!==expected)throw new Error('Um verificador integrado foi alterado; revisão necessária.');
  const uploaded=project.files.find(f=>f.path.endsWith('/scripts/'+name)||f.path==='scripts/'+name);
  if(!uploaded||uploaded.sha256!==expected)throw new Error(`O script ${name} enviado difere da versão revisada. Ele foi preservado, mas não será executado automaticamente.`);
 }
 const parent=path.join(dataDir,'project-runs');await mkdir(parent,{recursive:true});const folder=await mkdtemp(path.join(parent,'audit-'));const history=path.join(folder,'historico');await mkdir(history);
 const get=name=>artifacts.find(a=>a.path===name)?.content||'';
 const script=path.join(folder,'02-roteiro.md'),research=path.join(folder,'01-ficha-de-pesquisa.md'),clean=path.join(folder,'02-roteiro-narracao.txt');await writeFile(script,get('02-roteiro.md'));await writeFile(research,get('01-ficha-de-pesquisa.md'));
 const register=project.files.find(f=>f.enabled&&f.path.split('/').at(-1)==='registro-de-producao.md');const prior=priorRegister(register?.content||'',input.videoNumber);
 const registerPath=path.join(folder,'registro-de-producao.md');await writeFile(registerPath,prior.text);
 for(const f of project.files.filter(f=>f.enabled&&f.role==='history')){
  const filename=f.path.split('/').at(-1),number=filename.match(/^\d{4}-\d{2}-\d{2}-(\d+)-/)?.[1];
  if(prior.allowed.some(n=>n.replace(/^0+/,'')===number?.replace(/^0+/,'')))await writeFile(path.join(history,safeProjectPath(filename)),f.content);
 }
 const phrases=project.files.find(f=>f.enabled&&f.path.endsWith('/references/frases-gastas.txt'));const phrasesPath=path.join(folder,'frases-gastas.txt');await writeFile(phrasesPath,phrases?.content||'');
 const road=/^Road to/i.test(input.topic);const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo'}).format(new Date());
 const checks=[];
 checks.push(await execute('checar_roteiro.py',[script,'--limpo',clean,'--min-chars',road?'30000':'19000','--max-chars',road?'36000':'23000'],signal));
 checks.push(await execute('auditar_variacao.py',[script,'--historico',history,'--registro',registerPath,'--numero',input.videoNumber,'--gastas',phrasesPath],signal));
 checks.push(await execute('checar_fontes.py',[research,script,'--hoje',today],signal));
 let narration='';try{narration=await readFile(clean,'utf8');}catch{}
 return {checks,passed:checks.every(c=>c.passed),narration,priorNumbers:prior.allowed,folder,limits:'Scripts mecânicos; não demonstram a verdade das fontes. Arquivos enviados não são executados: somente as cópias integradas, revisadas e com hash conferido.'};
}
