import {test} from 'node:test';
import assert from 'node:assert/strict';
import {generateText,listModels,testProvider,discoverProviders} from '../lib/providers.mjs';

test('Provider REST adapters parse responses, preserve request contracts and sanitize failures without paid calls',async(t)=>{
  const original=globalThis.fetch;
  t.after(()=>{globalThis.fetch=original;});
  const calls=[];
  globalThis.fetch=async(url,options)=>{
    calls.push([String(url),options]);
    return Response.json({status:'completed',output:[{type:'reasoning'},{type:'message',content:[{type:'output_text',text:'Texto validado'}]}]});
  };
  assert.equal(await generateText({provider:'openai',prompt:'Teste',settings:{openai:{apiKey:'secret-test',model:'mock-model'}}}),'Texto validado');
  assert.equal(calls[0][0],'https://api.openai.com/v1/responses');
  assert.equal(JSON.parse(calls[0][1].body).store,false);
  assert.equal(calls[0][1].headers.Authorization,'Bearer secret-test');
  globalThis.fetch=async()=>Response.json({models:[{name:'models/gemini-test',supportedGenerationMethods:['generateContent']},{name:'models/embed',supportedGenerationMethods:['embedContent']}]});
  assert.deepEqual(await listModels('gemini',{gemini:{apiKey:'secret-test'}}),['gemini-test']);
  globalThis.fetch=async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'hidden'},{text:'Resposta Gemini'}]}}]});
  assert.equal(await generateText({provider:'gemini',prompt:'Teste',model:'gemini-test',settings:{gemini:{apiKey:'secret-test'}}}),'Resposta Gemini');
  globalThis.fetch=async()=>new Response('secret-test',{status:401});
  const failed=await testProvider('openai',{openai:{apiKey:'secret-test'}});
  assert.equal(failed.ok,false);
  assert.match(failed.message,/401/);
  assert(!failed.message.includes('secret-test'));
  globalThis.fetch=async()=>Response.json({models:[]});
  const discovered=await discoverProviders({openai:{apiKey:'secret-test',model:'mock-model'}});
  assert.equal(discovered.openai.configured,true);
  assert(!JSON.stringify(discovered).includes('secret-test'));
});

test('Provider generation rejects remote Ollama, malformed models and already cancelled requests',async()=>{
  await assert.rejects(()=>generateText({provider:'ollama',model:'test',prompt:'Teste',settings:{ollama:{baseUrl:'http://evil.example'}}}),/local/);
  await assert.rejects(()=>generateText({provider:'ollama',model:'test',prompt:'Teste',settings:{ollama:{baseUrl:'http://127.0.0.1:11434@evil.example'}}}),/local/);
  await assert.rejects(()=>generateText({provider:'gemini',model:'../bad',prompt:'Teste',settings:{gemini:{apiKey:'secret-test'}}}),/inválido/);
  const controller=new AbortController();controller.abort();
  await assert.rejects(()=>generateText({provider:'openai',prompt:'Teste',model:'test',settings:{openai:{apiKey:'secret-test'}},signal:controller.signal}),/cancelada/);
});
