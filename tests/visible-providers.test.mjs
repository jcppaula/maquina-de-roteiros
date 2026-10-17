import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {createProviderConnections} from '../lib/provider-connections.mjs';

test('Regression: settings, engine selectors and sidebar do not offer Ollama',async()=>{
 const source=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
 const names=source.split('\n').find(line=>line.startsWith('const providerNames='));
 const select=source.slice(source.indexOf('function providers('),source.indexOf('function providerFields('));
 const settings=source.slice(source.indexOf('function settings('),source.indexOf('function queue('));
 const uiSource=await readFile(new URL('../public/provider-ui.js',import.meta.url),'utf8');
 const context=vm.createContext({state:{settings:{providers:{},advanced:{}}},providerHealth:{},providerCatalogs:{},presentation:false,heading:()=>'',esc:v=>String(v??''),effortOptions:()=>''});
 const rendered=vm.runInContext(uiSource+'\n'+names+'\n'+select+'\n'+settings+'\n({settings:settings(),select:providers(),sidebar:ProviderUI.statusHTML({},providerNames)});',context);
 for(const html of Object.values(rendered)){assert.doesNotMatch(html,/ollama/i);for(const name of ['OpenAI','Claude','DeepSeek','AGY'])assert.ok(html.includes(name));}
});
test('Regression: periodic connection checks skip providers removed from the interface',async()=>{
 const probed=[];const connections=createProviderConnections({probe:async provider=>{probed.push(provider);return {ok:true,models:[]};}});
 const result=await connections.all({},{providerIds:['openai','claude','agy']});assert.deepEqual(probed,['openai','claude','agy']);assert.ok(!Object.hasOwn(result,'ollama'));
});
