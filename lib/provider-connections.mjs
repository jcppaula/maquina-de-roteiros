import {createHash} from 'node:crypto';
import {PROVIDER_IDS,testProvider} from './providers.mjs';
export function providerDraft(provider,settings,input={}){
 if(!PROVIDER_IDS.includes(provider)||!input||typeof input!=='object'||Array.isArray(input))throw new Error('Configuração do provedor inválida.');
 const cfg={...settings[provider]};
 for(const key of ['apiKey','apiKeys','model','effort','baseUrl'])if(Object.hasOwn(input,key)){
  const value=input[key];if(typeof value!=='string'||value.length>10000)throw new Error('Campo do provedor inválido.');
  if(['apiKey','apiKeys'].includes(key)&&!value.trim())continue;cfg[key]=value;
 }
 return {...settings,[provider]:cfg};
}
const signature=(provider,settings)=>{
 const cfg=settings[provider]||{},canonical={};
 for(const key of ['apiKey','apiKeys','model','effort','baseUrl','command']){let value=String(cfg[key]||'').trim();if(key==='baseUrl'&&provider==='ollama')value=(value||'http://127.0.0.1:11434').replace(/\/$/,'');if(value)canonical[key]=value;}
 return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
};
export const sameProviderConfiguration=(provider,left,right)=>signature(provider,left)===signature(provider,right);
export function createProviderConnections({probe=testProvider,ttl=60000}={}){
 const cache=new Map(),pending=new Map();
 async function inspect(provider,settings,{force=false}={}){
  const key=provider+':'+signature(provider,settings),cached=cache.get(key);
  if(!force&&cached&&Date.now()-cached.at<ttl)return cached.result;
  if(pending.has(key))return pending.get(key);
  const task=(async()=>{let checked;try{checked=await probe(provider,settings);}catch{checked={ok:false,message:'Falha ao verificar a conexão.',models:[]};}
   const result={...checked,ok:checked.ok===true,active:checked.ok===true,models:Array.isArray(checked.models)?checked.models.filter(m=>typeof m==='string'):[],checkedAt:new Date().toISOString()};cache.set(key,{at:Date.now(),result});return result;
  })();pending.set(key,task);try{return await task;}finally{pending.delete(key);}
 }
 return {inspect,async all(settings,{force=false,providerIds=PROVIDER_IDS}={}){return Object.fromEntries(await Promise.all(providerIds.map(async id=>[id,await inspect(id,settings,{force})])));}};
}
