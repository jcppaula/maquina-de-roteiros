import {test} from 'node:test';
import assert from 'node:assert/strict';
import {updateProductionRegister,productionLocation} from '../lib/production.mjs';
const header='| Nº | Título | Roteiro pronto | Caracteres | Estrutura | Publicado | Link | Views | Observações |\n|---|---|---|---|---|---|---|---|---|\n';
const options={number:'02',title:'Título | exato',readyDate:'2026-10-17',characters:234,postingDate:'2026-10-18',folder:'producao/canal/02-video',requireProposal:true};
const proposal='| 02 | Inventado | 1900-01-01 | 99 | AB2 PC1 | apagar | apagar | apagar | Pendência de imagem. |';
test('Production register updates by video number, preserving posting order and publication data',()=>{
 const original=header+'| 07 | Antes | 2026-10-01 | 12 | AB1 | | | | Postagem: 2026-10-11. |\n| 2 | Antigo | | | | 2026-10-20 | https://video | 900 | Nota do dono. |\n| 03 | Depois | | | | | | | Postagem: 2026-10-21. |\n';
 const result=updateProductionRegister(original,proposal,options);
 assert.equal(result.action,'updated');assert.match(result.row,/2 \| Título ¦ exato \| 2026-10-17 \| 234 \| AB2 PC1 \| 2026-10-20 \| https:\/\/video \| 900/);
 assert.match(result.row,/Nota do dono/);assert.match(result.row,/Pendência de imagem/);
 assert.equal(updateProductionRegister(result.content,proposal,options).content,result.content);
 assert.ok(result.content.indexOf('| 07 |')<result.content.indexOf('| 2 |'));assert.ok(result.content.indexOf('| 2 |')<result.content.indexOf('| 03 |'));
});
test('New register rows use posting position and reject malformed or ambiguous rows',()=>{
 const original=header+'| 03 | Depois | | | | | | | Postagem: 2026-10-21. |\n';
 const result=updateProductionRegister(original,proposal,options);assert.equal(result.action,'inserted');assert.ok(result.content.indexOf('| 02 |')<result.content.indexOf('| 03 |'));
 assert.throws(()=>updateProductionRegister(original,'texto livre',options),/linha-registro/);
 assert.throws(()=>updateProductionRegister(original,proposal,{...options,number:'../x'}),/número/);
 assert.throws(()=>updateProductionRegister(header+proposal+'\n'+proposal,proposal,options),/duplicados/);
 assert.throws(()=>updateProductionRegister(original,proposal+'\n'+proposal,options),/duplicada/);
});
test('Production paths contain readable names and identifiers even for hostile titles',()=>{
 const folder=productionLocation({name:'CON / Canal',id:'12345678-abcd'},{id:'87654321-ffff',input:{videoNumber:'02',topic:'../../Teste: filme | local'}});
 assert.ok(!folder.includes('..'));assert.match(folder,/con-canal-12345678/);assert.match(folder,/02-teste-filme-local-87654321/);
});
