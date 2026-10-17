import {inflateRawSync} from 'node:zlib';
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
export function readSkillArchive(buffer,{requireSkill=true}={}) {
 if(!Buffer.isBuffer(buffer)||buffer.length>3*1024*1024||buffer.length<22)throw new Error('Pacote de skill inválido ou maior que 3 MB.');
 let end=-1;for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50&&i+22+buffer.readUInt16LE(i+20)===buffer.length){end=i;break;}
 if(end<0)throw new Error('O arquivo .skill deve ser um ZIP válido.');
 const count=buffer.readUInt16LE(end+10),offset=buffer.readUInt32LE(end+16);
 if(count>200||buffer.readUInt16LE(end+4)||buffer.readUInt16LE(end+6))throw new Error('Pacote dividido ou com arquivos demais.');
 let cursor=offset,total=0;const docs=[];
 for(let n=0;n<count;n++){
  if(cursor+46>end||buffer.readUInt32LE(cursor)!==0x02014b50)throw new Error('Índice ZIP inválido.');
  const flags=buffer.readUInt16LE(cursor+8),method=buffer.readUInt16LE(cursor+10),crc=buffer.readUInt32LE(cursor+16),compressed=buffer.readUInt32LE(cursor+20),size=buffer.readUInt32LE(cursor+24),nameLength=buffer.readUInt16LE(cursor+28),extra=buffer.readUInt16LE(cursor+30),comment=buffer.readUInt16LE(cursor+32),local=buffer.readUInt32LE(cursor+42);
  const name=buffer.subarray(cursor+46,cursor+46+nameLength).toString('utf8').replaceAll('\\','/');
  if(cursor+46+nameLength+extra+comment>end||name.includes('\0')||name.startsWith('/')||name.split('/').includes('..')||/^[a-z]:/i.test(name)||((buffer.readUInt32LE(cursor+38)>>>16)&0xf000)===0xa000)throw new Error('Pacote contém caminho inseguro.');
  total+=size;if(total>2*1024*1024)throw new Error('Conteúdo descompactado maior que 2 MB.');
  if(/\.(md|txt|json|csv|py|sh|ya?ml)$/i.test(name)){
   if(flags&1||![0,8].includes(method)||local+30>offset||buffer.readUInt32LE(local)!==0x04034b50)throw new Error('Compressão ou entrada ZIP não suportada.');
   const start=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28);
   if(start+compressed>offset)throw new Error('Dados ZIP truncados.');
   const packed=buffer.subarray(start,start+compressed);const bytes=method===0?packed:inflateRawSync(packed,{maxOutputLength:2*1024*1024});
   if(bytes.length!==size||crc32(bytes)!==crc)throw new Error('Integridade da skill inválida.');
   docs.push({name,content:bytes.toString('utf8')});
  }
  cursor+=46+nameLength+extra+comment;
 }
 const main=docs.filter(d=>/(^|\/)SKILL\.md$/i.test(d.name));if(requireSkill&&main.length!==1)throw new Error('O pacote precisa conter exatamente um SKILL.md.');
 return {name:main[0]?.name||'Documentos',content:[...main,...docs.filter(d=>!main.includes(d))].filter(d=>/\.(md|txt)$/i.test(d.name)).map(d=>`<!-- ${d.name} -->\n${d.content}`).join('\n\n'),files:docs.map(d=>d.name),documents:docs};
}
