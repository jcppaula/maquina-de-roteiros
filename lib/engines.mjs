export const ENGINE_PROVIDERS=['openai','gemini','codex','claude','ollama','deepseek','agy'];
export const EFFORTS={openai:['low','medium','high','xhigh','max'],codex:['low','medium','high','xhigh','max'],claude:['low','medium','high','xhigh','max'],agy:['low','medium','high','xhigh','max'],deepseek:['none','low','high','max'],gemini:['minimal','low','medium','high'],ollama:[]};
export function normalizeEngine(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Configuração de motor inválida.');
 const {provider='',model='',effort=''}=value;
 if(provider&&!ENGINE_PROVIDERS.includes(provider))throw new Error('Provedor do motor inválido.');
 if(typeof model!=='string'||model.length>200||/[\r\n\0]/.test(model)||typeof effort!=='string'||(effort&&!EFFORTS[provider]?.includes(effort)))throw new Error('Modelo ou esforço incompatível com o provedor.');
 if(!provider&&(model||effort))throw new Error('Escolha o provedor antes do modelo e esforço.');
 return {provider,model:model.trim(),effort};
}
export function resolveEngine(value,fallback,settings={}){
 const engine=normalizeEngine(value||{}),base=normalizeEngine(fallback||{});
 const provider=engine.provider||base.provider;
 if(!provider)throw new Error('Escolha um provedor de IA.');
 const inherit=!engine.provider;
 return normalizeEngine({provider,model:engine.model||(inherit?base.model:'')||settings[provider]?.model||'',effort:engine.effort||(inherit?base.effort:'')||settings[provider]?.effort||''});
}
export function cliEffortArgs(provider,effort){
 normalizeEngine({provider,effort});
 if(!effort)return [];
 return provider==='codex'?['-c',`model_reasoning_effort="${effort}"`]:['--effort',effort];
}
export function generationEffort(provider,model,effort){
 normalizeEngine({provider,model,effort});if(!effort)return {};
 if(provider==='openai')return {reasoning:{effort}};
 if(provider==='deepseek')return effort==='none'?{thinking:{type:'disabled'}}:{thinking:{type:'enabled'},reasoning_effort:effort};
 if(provider==='gemini'){
  if(!/^gemini-[34]/i.test(model))throw new Error('Este modelo Gemini não usa níveis de esforço nesta integração. Selecione Padrão do modelo.');
  return {generationConfig:{thinkingConfig:{thinkingLevel:effort}}};
 }
 return {};
}
