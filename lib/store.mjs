import { mkdir, readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import path from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
async function publish(source,target) {
  for(let attempt=0;;attempt++) {
    try { await rename(source,target); return; }
    catch(error) {
      // Windows indexers and antivirus can briefly hold a just-written file.
      if(attempt>=5||!['EPERM','EACCES','EBUSY'].includes(error.code)) throw error;
      await delay(50*(attempt+1));
    }
  }
}
const providerIds = new Set(['openai','gemini','codex','claude','ollama','deepseek','agy']);
function validate(state) {
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if(!object(state)||state.version!==1||!object(state.settings)||!object(state.settings.providers)) throw new Error('Estrutura de armazenamento inválida.');
  for(const name of ['channels','scripts','jobs']) {
    if(!Array.isArray(state[name])) throw new Error('Coleção de armazenamento inválida.');
    const seen = new Set();
    for(const row of state[name]) {
      if(!object(row)||typeof row.id!=='string'||!row.id||seen.has(row.id)) throw new Error('Registro ou identificador de armazenamento inválido.');
      seen.add(row.id);
    }
  }
  for(const [provider,config] of Object.entries(state.settings.providers)) {
    if(!providerIds.has(provider)||!object(config)) throw new Error('Configuração de provedor inválida.');
    for(const key of ['model','apiKey','apiKeys','baseUrl','command']) if(Object.hasOwn(config,key)&&typeof config[key]!=='string') throw new Error('Campo de configuração inválido.');
  }
}
export async function openStore(directory) {
  await mkdir(directory, {recursive:true});
  const file = path.join(directory, 'store.json');
  let state;
  try { state = JSON.parse(await readFile(file,'utf8')); validate(state); }
  catch(error) { if(error.code !== 'ENOENT') throw new Error('Não foi possível ler data/store.json. Preserve o arquivo e restaure o backup antes de iniciar.'); }
  state ||= {version:1,channels:[],scripts:[],jobs:[],settings:{providers:{openai:{model:''},gemini:{model:''},codex:{model:''},claude:{model:'sonnet'},ollama:{baseUrl:'http://127.0.0.1:11434',model:''}}}};
  state.settings.providers.deepseek||={model:''};state.settings.providers.agy||={model:''};
  state.settings.advanced||={concurrency:1};
  for(const job of state.jobs) if(['queued','running'].includes(job.status)) {job.status='interrupted';job.error='Servidor reiniciado. Retome a tarefa para aproveitar as etapas já salvas.';}
  let pending = Promise.resolve();
  function save() {
    validate(state);
    const bytes = JSON.stringify(state,null,2);
    pending = pending.catch(()=>{}).then(async()=>{
      // Publish the backup atomically as well: interrupted copies must not
      // replace the previous recoverable snapshot with a truncated file.
      try { await copyFile(file,`${file}.backup.tmp`); await publish(`${file}.backup.tmp`,`${file}.backup`); } catch(e) {if(e.code !== 'ENOENT') throw e;}
      await writeFile(`${file}.tmp`,bytes,{encoding:'utf8',mode:0o600});
      await publish(`${file}.tmp`,file);
    });
    return pending;
  }
  await save();
  return {state,save};
}
