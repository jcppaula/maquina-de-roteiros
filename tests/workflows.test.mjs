import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {parseSrt,scenePrompt,validateSceneLines,validateChapters} from '../lib/workflows.mjs';
import {openStore} from '../lib/store.mjs';
test('SRT preserves multiline narration and exact original timestamps',()=>{
 const result=parseSrt('\uFEFF1\r\n00:00:01,000 --> 00:00:03,500\r\nPrimeira linha\r\nsegunda linha\r\n\r\n2\r\n00:00:03,500 --> 00:00:05,000\r\nFinal');
 assert.equal(result.length,2);assert.equal(result[0].text,'Primeira linha segunda linha');
 assert.match(scenePrompt({script:'contexto'},'bíblia',result),/00:00:01,000 --> 00:00:03,500/);
 assert.equal(result[1].index,2);
});
test('Invalid or inverted SRT fails rather than silently losing scenes',()=>{
 assert.throws(()=>parseSrt('1\n00:00:05,000 --> 00:00:01,000\nTexto'),/fim/);
 assert.throws(()=>parseSrt('sem tempo'),/tempo/);
 assert.throws(()=>parseSrt('1\n00:00:01,000 --> 00:00:02,000\n'),/vazio/);
});
test('Veo rejects missing, duplicate or out-of-order scene numbers',()=>{
 const scenes=[{index:4},{index:5}];
 assert.equal(validateSceneLines('4 | A person walks.\n5 | The camera pans.',scenes),'4 | A person walks.\n5 | The camera pans.');
 assert.throws(()=>validateSceneLines('4 | One.',scenes),/esperadas/);
 assert.throws(()=>validateSceneLines('4 | One.\n4 | Two.',scenes),/Numeração/);
 assert.throws(()=>validateSceneLines('5 | Two.\n4 | One.',scenes),/Numeração/);
});
test('YouTube chapters start at zero and preserve minimum spacing',()=>{
 const scenes=[{end:'00:01:00,000'}];
 assert.equal(validateChapters('0:00 Começo\n0:20 Continuação',scenes),'0:00 Começo\n0:20 Continuação');
 assert.throws(()=>validateChapters('0:05 Começo',scenes),/primeiro/);
 assert.throws(()=>validateChapters('0:00 Começo\n0:05 Curto',scenes),/intervalos/);
});
test('Store persists queued saves in order and marks interrupted jobs after restart',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'roteiros-store-'));const store=await openStore(dir);
 store.state.channels.push({id:'test',name:'Teste'});const first=store.save();
 store.state.jobs.push({id:'job',status:'running'});await Promise.all([first,store.save()]);
 const reopened=await openStore(dir);assert.equal(reopened.state.channels[0].name,'Teste');assert.equal(reopened.state.jobs[0].status,'interrupted');
 const backup=JSON.parse(await readFile(path.join(dir,'store.json.backup'),'utf8'));assert.equal(backup.channels[0].id,'test');
});
test('Corrupt storage is never silently replaced',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'roteiros-corrupt-'));await writeFile(path.join(dir,'store.json'),'broken');
 await assert.rejects(()=>openStore(dir),/restaure/);assert.equal(await readFile(path.join(dir,'store.json'),'utf8'),'broken');
});
