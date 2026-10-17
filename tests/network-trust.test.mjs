import {test} from 'node:test';
import assert from 'node:assert/strict';
import {configureSystemTrust,networkFailureMessage} from '../lib/network-trust.mjs';
import {testProvider} from '../lib/providers.mjs';

test('Regression: Windows connections retain existing roots and add OS trusted certificates',()=>{
 const calls=[];let applied;
 const api={getCACertificates:kind=>{calls.push(kind);return kind==='default'?['bundled-root','extra-root']:['windows-root','bundled-root'];},setDefaultCACertificates:certificates=>applied=certificates};
 assert.equal(configureSystemTrust(api,'win32'),true);assert.deepEqual(calls,['default','system']);assert.deepEqual(applied,['bundled-root','extra-root','windows-root']);
 calls.length=0;assert.equal(configureSystemTrust(api,'linux'),false);assert.deepEqual(calls,[]);
});
test('Regression: OpenAI TLS failure reports certificate cause rather than blaming the API key',async t=>{
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);
 globalThis.fetch=async()=>{throw new TypeError('secret-api-key must not appear',{cause:Object.assign(new Error('private proxy details'),{code:'SELF_SIGNED_CERT_IN_CHAIN'})});};
 const result=await testProvider('openai',{openai:{apiKey:'secret-api-key'}});
 assert.equal(result.ok,false);assert.match(result.message,/SELF_SIGNED_CERT_IN_CHAIN/);assert.match(result.message,/certificados/);assert.ok(!result.message.includes('secret-api-key'));assert.ok(!result.message.includes('private proxy'));
});
test('Regression: DNS and certificate errors remain distinct from HTTP authentication failures',async t=>{
 assert.match(networkFailureMessage({cause:{code:'ENOTFOUND'}}),/DNS/);
 assert.match(networkFailureMessage({cause:{code:'CERT_HAS_EXPIRED'}}),/expirou/);
 const original=globalThis.fetch;t.after(()=>globalThis.fetch=original);globalThis.fetch=async()=>new Response('private body',{status:401});
 const result=await testProvider('openai',{openai:{apiKey:'fake'}});assert.match(result.message,/HTTP 401/);assert.ok(!result.message.includes('certificado'));assert.ok(!result.message.includes('private body'));
});
