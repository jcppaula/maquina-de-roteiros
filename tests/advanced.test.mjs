import {test} from 'node:test';
import assert from 'node:assert/strict';
import {setTimeout as delay} from 'node:timers/promises';
import {researchWeb,generateText,listModels,parseAgyOutput,discoverProviders} from '../lib/providers.mjs';
import {createScheduler} from '../lib/scheduler.mjs';
import {readSkillArchive} from '../lib/skill-import.mjs';

test('DeepSeek chat, models and native search use official contracts and never return keys',async(t)=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});let request;
 globalThis.fetch=async(url,options)=>{request={url:String(url),options};return Response.json({choices:[{finish_reason:'stop',message:{content:'Resposta DeepSeek'}}]});};
 const settings={deepseek:{model:'test-model',apiKey:'SECRET'}};
 assert.equal(await generateText({provider:'deepseek',prompt:'Texto',settings}),'Resposta DeepSeek');
 assert.equal(request.url,'https://api.deepseek.com/chat/completions');assert.equal(JSON.parse(request.options.body).messages[0].content,'Texto');
 globalThis.fetch=async()=>Response.json({data:[{id:'one'},{id:'two'}]});assert.deepEqual(await listModels('deepseek',settings),['one','two']);
 globalThis.fetch=async(url,options)=>{request={url:String(url),options};return Response.json({results:[{url:'https://example.org/report',title:'Relatório',summary:'Evidência'},{url:'javascript:alert(1)',title:'Unsafe'},{url:'https://example.org/report',title:'Duplicado'}]});};
 const research=await researchWeb({provider:'deepseek',query:'Pergunta',settings});assert.equal(research.sources.length,1);assert.equal(research.searchCalls,1);assert.match(research.text,/Evidência/);assert.equal(request.url,'https://api.deepseek.com/v1/tools/search');assert.equal(JSON.parse(request.options.body).need_content,false);assert.ok(!JSON.stringify(research).includes('SECRET'));
 await assert.rejects(()=>researchWeb({provider:'deepseek',query:'a'.repeat(129),settings}),/128/);
 globalThis.fetch=async()=>Response.json({results:[]});await assert.rejects(()=>researchWeb({provider:'deepseek',query:'Sem resultados',settings}),/fontes/);
});

test('OpenAI research requires an observed completed search and retains source metadata',async(t)=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});let request;
 const settings={openai:{apiKey:'TEST',model:'model'}};
 globalThis.fetch=async(url,options)=>{request=JSON.parse(options.body);return Response.json({status:'completed',output:[{type:'web_search_call',status:'completed',action:{sources:[{url:'https://example.org',title:'Fonte'}]}},{type:'message',content:[{type:'output_text',text:'Resumo com fonte',annotations:[{type:'url_citation',url:'https://example.org',title:'Fonte'}]}]}]});};
 const result=await researchWeb({provider:'openai',query:'Tema',settings});assert.deepEqual(request.tools,[{type:'web_search'}]);assert.equal(request.tool_choice,'required');assert.equal(result.sources.length,1);assert.equal(result.text,'Resumo com fonte');
 globalThis.fetch=async()=>Response.json({output:[{type:'message',content:[{type:'output_text',text:'Eu pesquisei, confie em mim.'}]}]});
 await assert.rejects(()=>researchWeb({provider:'openai',query:'Tema',settings}),/fontes/);
});

test('API key failover is bounded and sanitized',async(t)=>{
 const original=globalThis.fetch;t.after(()=>{globalThis.fetch=original;});const keys=[];
 globalThis.fetch=async(url,options)=>{keys.push(options.headers.Authorization);return keys.length===1?new Response('',{status:429}):Response.json({choices:[{finish_reason:'stop',message:{content:'OK'}}]});};
 const settings={deepseek:{apiKey:'FIRST',apiKeys:'SECOND\nTHIRD',model:'test'}};
 assert.equal(await generateText({provider:'deepseek',prompt:'Teste',settings}),'OK');assert.deepEqual(keys,['Bearer FIRST','Bearer SECOND']);
 globalThis.fetch=async()=>Response.json({models:[]});const discovered=await discoverProviders(settings);assert.equal(discovered.deepseek.keyCount,3);assert.ok(!JSON.stringify(discovered).includes('SECOND'));
});

test('AGY response parser accepts official result envelopes and rejects failures',()=>{
 assert.equal(parseAgyOutput('{"event":"init"}\n{"event":"result","result":{"status":"SUCCESS","response":"Texto AGY"}}\n'),'Texto AGY');
 assert.throws(()=>parseAgyOutput('{"event":"result","result":{"status":"ERROR","error":"secret"}}'),/não concluiu/);
 assert.throws(()=>parseAgyOutput('{"status":"SUCCESS","response":""}'),/não retornou/);
});

test('Scheduler respects parallelism and does not launch a task twice',async()=>{
 const jobs=[1,2,3,4].map(i=>({id:String(i),status:'queued'}));let active=0,max=0;const started=[];
 const scheduler=createScheduler({jobs:()=>jobs,limit:()=>2,run:async job=>{job.status='running';active++;max=Math.max(max,active);started.push(job.id);await delay(20);job.status='completed';active--;}});
 scheduler.wake();scheduler.wake();for(let i=0;i<50&&jobs.some(j=>j.status!=='completed');i++)await delay(10);
 assert.equal(max,2);assert.deepEqual(started,['1','2','3','4']);
});

function zipFile(name,content){const data=Buffer.from(content);let crc=0xffffffff;for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;const filename=Buffer.from(name),local=Buffer.alloc(30),central=Buffer.alloc(46),end=Buffer.alloc(22);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(data.length,22);local.writeUInt16LE(filename.length,26);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(data.length,24);central.writeUInt16LE(filename.length,28);const offset=local.length+filename.length+data.length;end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+filename.length,12);end.writeUInt32LE(offset,16);return Buffer.concat([local,filename,data,central,filename,end]);}
test('Skill packages validate paths, presence and CRC before returning text',()=>{
 const good=zipFile('custom/SKILL.md','# Skill\nInstruções');const result=readSkillArchive(good);assert.match(result.content,/# Skill/);assert.deepEqual(result.files,['custom/SKILL.md']);
 assert.throws(()=>readSkillArchive(zipFile('../SKILL.md','bad')),/inseguro/);
 assert.throws(()=>readSkillArchive(zipFile('README.md','test')),/SKILL.md/);
 good[30+Buffer.byteLength('custom/SKILL.md')]^=1;assert.throws(()=>readSkillArchive(good),/Integridade/);
});
