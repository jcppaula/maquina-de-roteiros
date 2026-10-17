import * as tls from 'node:tls';

// Use the Windows trust store in addition to Node's existing roots. This does
// not install certificates or disable certificate/hostname verification.
export function configureSystemTrust(api=tls,platform=process.platform){
 if(platform!=='win32')return false;
 const certificates=[...new Set([...api.getCACertificates('default'),...api.getCACertificates('system')])];
 api.setDefaultCACertificates(certificates);return true;
}
export function networkFailureMessage(error){
 const known={
  SELF_SIGNED_CERT_IN_CHAIN:'A cadeia de certificados HTTPS não é confiável. Confira os certificados confiáveis do Windows e reinicie o Estúdio.',
  DEPTH_ZERO_SELF_SIGNED_CERT:'O serviço apresentou um certificado HTTPS autoassinado não confiável.',
  UNABLE_TO_GET_ISSUER_CERT_LOCALLY:'Não foi possível validar o emissor do certificado HTTPS. Confira a cadeia de certificados da rede.',
  UNABLE_TO_VERIFY_LEAF_SIGNATURE:'A cadeia do certificado HTTPS está incompleta ou não é confiável.',
  CERT_HAS_EXPIRED:'O certificado HTTPS expirou. Confira a data do computador e a configuração da rede.',
  ERR_TLS_CERT_ALTNAME_INVALID:'O certificado HTTPS não corresponde ao endereço do serviço.',
  ENOTFOUND:'O DNS não conseguiu localizar o serviço de IA.',
  EAI_AGAIN:'O DNS está temporariamente indisponível. Tente novamente.',
  ECONNREFUSED:'A conexão com o serviço de IA foi recusada.',
  ETIMEDOUT:'A conexão com o serviço de IA excedeu o tempo limite.',
  UND_ERR_CONNECT_TIMEOUT:'A conexão com o serviço de IA excedeu o tempo limite.',
  ECONNRESET:'A conexão com o serviço de IA foi interrompida pela rede.'
 };
 for(let current=error,depth=0;current&&depth<5;current=current.cause,depth++)if(known[current.code])return `Falha de conexão [${current.code}]: ${known[current.code]}`;
 return 'Não foi possível conectar ao serviço de IA. Verifique o endereço e a conexão.';
}
