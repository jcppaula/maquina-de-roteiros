'use strict';
const ProviderUI=(()=>{
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function draft(form,id){const value={};for(const field of ['apiKey','apiKeys','model','effort','baseUrl']){const input=form.elements[id+'.'+field];if(!input)continue;if(['apiKey','apiKeys'].includes(field)&&!input.value.trim())continue;value[field]=input.value;}return value;}
 function modelOptions(models,current=''){
  const unique=[...new Set([...models,current].filter(v=>typeof v==='string'&&v))];
  return '<option value="">Escolha um modelo ou informe o ID abaixo</option>'+unique.map(m=>`<option value="${escape(m)}" ${m===current?'selected':''}>${escape(m)}</option>`).join('');
 }
 function populateModels(select,input,models){if(!select||!input)return;select.innerHTML=modelOptions(models,input.value);select.value=input.value;}
 function statusHTML(statuses,names){return Object.entries(names).map(([id,name])=>{const status=statuses[id],active=status?.active===true;const label=active?'Ativo':status?'Inativo':'Não verificado';return `<a class="provider-status-row" href="#settings" title="${escape(status?.message||'Conexão ainda não verificada')}"><i class="provider-dot ${active?'active':'inactive'}" aria-hidden="true"></i><span>${escape(name)}</span><small>${label}</small></a>`;}).join('');}
 function bindTests(form,{api,onModels,onSavedStatus,onResult}){
  for(const button of form.querySelectorAll('[data-test-provider], [data-models-provider]'))button.onclick=async()=>{
   const id=button.dataset.testProvider||button.dataset.modelsProvider,isTest=!!button.dataset.testProvider,result=form.querySelector('#result-'+id);button.disabled=true;result.classList.remove('error');result.textContent=isTest?'Verificando conexão…':'Consultando modelos…';
   try{
    const data=await api('/api/providers/'+id+(isTest?'/test':'/models'),{method:'POST',body:JSON.stringify(draft(form,id))});
    const models=isTest?data.models:data;onModels(id,Array.isArray(models)?models:[]);
    if(isTest){result.textContent=data.message+(data.ok&&!data.saved?' Conexão testada com os valores preenchidos. Salve para ativar esta configuração.':'');result.classList.toggle('error',data.ok!==true);if(data.saved)onSavedStatus(id,data);}
    else result.textContent=`${models.length} modelos/opções encontrados. Escolha na lista acima; você também pode informar um ID.`;
    onResult?.(id,data);
   }catch(error){result.textContent=error.message;result.classList.add('error');}finally{button.disabled=false;}
  };
 }
 function refreshQueue(run){let pending=null;return function refresh(force=false){if(pending)return force?pending.then(()=>refresh(true)):pending;pending=Promise.resolve().then(()=>run(force)).finally(()=>{pending=null;});return pending;};}
 return {draft,modelOptions,populateModels,statusHTML,bindTests,refreshQueue};
})();
let providerHealth={},providerCatalogs={},providerStatusTimer;
function updateProviderModels(id,models){
 providerCatalogs[id]=models;
 const form=$('#settingsForm');if(form)ProviderUI.populateModels(form.querySelector(`[data-provider-model-select="${id}"]`),form.elements[id+'.model'],models);
 $$('[data-engine-picker]').forEach(box=>{if($('[data-engine-provider]',box).value===id)ProviderUI.populateModels($('[data-engine-select]',box),$('[data-engine-model]',box),models);});
}
function renderProviderSidebar(){const target=$('#providerConnections');if(target)target.innerHTML=ProviderUI.statusHTML(providerHealth,providerNames);$$('[data-provider-badge]').forEach(b=>{const status=providerHealth[b.dataset.providerBadge];b.textContent=status?.active?'Ativo':status?'Inativo':'Não verificado';b.classList.toggle('warn',!status?.active);b.title=status?.message||'Ainda não verificado';});}
const runProviderStatusRefresh=ProviderUI.refreshQueue(async force=>{
 try{providerHealth=await api('/api/providers/status'+(force?'?force=1':''));for(const [id,status]of Object.entries(providerHealth))updateProviderModels(id,status.models||[]);renderProviderSidebar();if(page==='dashboard')renderPage();}
 catch{providerHealth=Object.fromEntries(Object.keys(providerNames).map(id=>[id,{active:false,message:'Não foi possível verificar o servidor local.'}]));renderProviderSidebar();}
 finally{clearTimeout(providerStatusTimer);providerStatusTimer=setTimeout(refreshProviderConnections,60000);}
});
function refreshProviderConnections(force=false){return runProviderStatusRefresh(force);}
function bindProviderModelLists(form){
 $$('[data-provider-model-select]',form).forEach(select=>{const id=select.dataset.providerModelSelect,input=form.elements[id+'.model'];ProviderUI.populateModels(select,input,providerCatalogs[id]||[]);select.onchange=()=>{input.value=select.value;input.dispatchEvent(new Event('change',{bubbles:true}));};input.addEventListener('change',()=>ProviderUI.populateModels(select,input,providerCatalogs[id]||[]));});
 ProviderUI.bindTests(form,{api,onModels:updateProviderModels,onSavedStatus:(id,status)=>{providerHealth[id]=status;renderProviderSidebar();}});
}
