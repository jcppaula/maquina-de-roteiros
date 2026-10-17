import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {providerDraft,createProviderConnections,sameProviderConfiguration} from '../lib/provider-connections.mjs';
import {authenticatedCli} from '../lib/providers.mjs';
const ui=vm.runInNewContext(await readFile(new URL('../public/provider-ui.js',import.meta.url),'utf8')+';ProviderUI;');
const plain=value=>JSON.parse(JSON.stringify(value));
test('Regression: provider test uses newly typed credentials and URL without mutating saved settings',()=>{
 const saved={deepseek:{apiKey:'old',model:'old-model'},ollama:{baseUrl:'http://127.0.0.1:1'}};
 const updated=providerDraft('deepseek',saved,{apiKey:'new',model:'new-model'});
 assert.equal(updated.deepseek.apiKey,'new');assert.equal(saved.deepseek.apiKey,'old');
 assert.equal(providerDraft('ollama',saved,{baseUrl:'http://127.0.0.1:2'}).ollama.baseUrl,'http://127.0.0.1:2');
 assert.equal(providerDraft('deepseek',saved,{apiKey:''}).deepseek.apiKey,'old');
 assert.throws(()=>providerDraft('deepseek',saved,{apiKey:123}),/inválido/);
 const form={elements:{'deepseek.apiKey':{value:'new'},'deepseek.model':{value:'new-model'},'deepseek.apiKeys':{value:''}}};
 assert.deepEqual(plain(ui.draft(form,'deepseek')),{apiKey:'new',model:'new-model'});
});
test('Regression: installed CLI without authenticated session must not be green',()=>{
 assert.equal(authenticatedCli('claude',{code:0,output:'{"loggedIn":false}'}),false);
 assert.equal(authenticatedCli('claude',{code:0,output:'invalid json'}),false);
 assert.equal(authenticatedCli('claude',{code:0,output:'{"loggedIn":true}'}),true);
 assert.equal(authenticatedCli('codex',{code:1,output:'Not logged in'}),false);
 const html=ui.statusHTML({claude:{active:false},agy:{active:true}},{claude:'Claude',agy:'AGY'});
 assert.match(html,/provider-dot inactive/);assert.match(html,/provider-dot active/);assert.match(html,/Inativo/);assert.match(html,/Ativo/);
});
test('Regression: empty default fields must not report unchanged settings as unsaved',()=>{
 assert.equal(sameProviderConfiguration('claude',{claude:{model:'sonnet'}},{claude:{model:'sonnet',effort:''}}),true);
 assert.equal(sameProviderConfiguration('ollama',{ollama:{}},{ollama:{model:'',effort:'',baseUrl:'http://127.0.0.1:11434/'}}),true);
 assert.equal(sameProviderConfiguration('deepseek',{deepseek:{apiKey:'old'}},{deepseek:{apiKey:'new'}}),false);
});
test('Regression: status cache invalidates on saved configuration change and shares in-flight checks',async()=>{
 let count=0;const connections=createProviderConnections({probe:async(id,settings)=>{count++;await new Promise(r=>setTimeout(r,5));return {ok:settings[id].apiKey==='valid',models:['model-a']};}});
 const initial={openai:{apiKey:'valid'}};
 const [a,b]=await Promise.all([connections.inspect('openai',initial),connections.inspect('openai',initial)]);assert.equal(count,1);assert.equal(a.active,true);assert.equal(b.active,true);
 await connections.inspect('openai',initial);assert.equal(count,1);
 const failed=await connections.inspect('openai',{openai:{apiKey:'invalid'}});assert.equal(count,2);assert.equal(failed.active,false);
 assert.ok(!JSON.stringify(failed).includes('apiKey'));
});
test('Regression: model dropdown displays returned models and preserves typed model IDs',()=>{
 const input={value:'custom-model'},select={};ui.populateModels(select,input,['model-a','model-b']);
 assert.match(select.innerHTML,/model-a/);assert.match(select.innerHTML,/model-b/);assert.match(select.innerHTML,/custom-model/);assert.equal(select.value,'custom-model');assert.equal(input.value,'custom-model');
 assert.ok(!ui.modelOptions(['<script>'],'').includes('<script>'));
});
test('Regression: saving during a pending status check must recheck the new configuration',async()=>{
 const calls=[];let finishFirst;
 const refresh=ui.refreshQueue(async force=>{calls.push(force);if(calls.length===1)await new Promise(resolve=>finishFirst=resolve);return force?'new-settings':'old-settings';});
 const initial=refresh();await Promise.resolve();const saved=refresh(true);finishFirst();await initial;assert.equal(await saved,'new-settings');assert.deepEqual(calls,[false,true]);
});
test('Regression: test button recovers after failure and updates models and feedback after success',async()=>{
 const classes=new Set(),result={textContent:'',classList:{add:x=>classes.add(x),remove:x=>classes.delete(x),toggle:(x,on)=>on?classes.add(x):classes.delete(x)}};
 const button={dataset:{testProvider:'deepseek'},disabled:false};const form={elements:{'deepseek.apiKey':{value:'typed-key'}},querySelectorAll:()=>[button],querySelector:()=>result};
 let fail=true,received,models,statusCount=0;
 ui.bindTests(form,{api:async(url,opts)=>{received={url,body:JSON.parse(opts.body)};if(fail)throw Error('HTTP 401');return {ok:true,saved:false,message:'Conexão validada.',models:['deepseek-test']};},onModels:(id,value)=>models=value,onSavedStatus:()=>statusCount++});
 await button.onclick();assert.equal(button.disabled,false);assert.equal(classes.has('error'),true);assert.match(result.textContent,/401/);
 fail=false;await button.onclick();assert.equal(button.disabled,false);assert.equal(classes.has('error'),false);assert.equal(received.body.apiKey,'typed-key');assert.equal(received.url,'/api/providers/deepseek/test');assert.equal(models[0],'deepseek-test');assert.match(result.textContent,/Salve para ativar/);assert.equal(statusCount,0);
});
