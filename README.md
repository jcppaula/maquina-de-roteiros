# Gerador de Roteiros — web local

Reconstrução funcional em código aberto local da instalação analisada, com interface web em português. O servidor usa Node.js 24.15+ e bibliotecas nativas; não precisa instalar pacotes npm, Python ou compilar executável.

## Iniciar

Abra `Iniciar Estudio.bat` nesta pasta para iniciar e abrir o navegador, ou execute:

```powershell
npm.cmd start
```

Abra http://127.0.0.1:3210 no navegador. Mantenha o terminal aberto enquanto usar o aplicativo. Para parar, pressione Ctrl+C. Para outra porta: `$env:PORT=3211; node server.mjs`.

## Atualização 0.2 — pesquisa, AGY, DeepSeek e recursos avançados

- **Pesquisa web real**: na Fila e histórico, faça uma pesquisa independente; nos formulários, ative "Pesquisar na web antes de gerar". Escolha **DeepSeek Search** ou **OpenAI Web Search**. A consulta, o resumo, os links e a data ficam salvos na tarefa. Uma pesquisa sem fontes retornadas interrompe a tarefa. Fontes encontradas não são garantia de que todas as afirmações sejam verdadeiras.
- **DeepSeek**: salve uma chave em Configurações ou use `DEEPSEEK_API_KEY`. Liste os modelos para selecionar um disponível na sua conta. Texto usa a API Chat Completions; pesquisa usa a API Search do próprio DeepSeek, cuja consulta aceita até 128 caracteres. A disponibilidade depende da conta e do serviço.
- **Antigravity/AGY**: o `agy.exe` instalado é detectado. O botão Testar consulta o catálogo real, sem geração. Faça login pelo terminal com `agy` se necessário. A execução usa stdin estruturado, modo plan e sandbox, sem aprovação automática de ferramentas. A integração não extrai tokens do editor nem usa APIs internas. O teste local de catálogo retornou seis modelos; geração real de texto não foi solicitada na validação.
- **Pesquisa e escrita independentes**: por exemplo, DeepSeek Search pesquisa e AGY escreve, ou OpenAI pesquisa e DeepSeek escreve. A consulta vai ao serviço de pesquisa; o dossiê e o texto vão ao provedor de escrita selecionado. Há custos próprios de pesquisa e de geração; configure as credenciais dos dois quando forem serviços diferentes.
- **Retomada**: tarefas interrompidas, canceladas ou falhas exibem Retomar. Architect, Writer, Fact Shield, Auditor, Setup Veo3 e lotes concluídos são reaproveitados. Uma chamada que falhou antes de salvar a etapa precisa ser repetida e pode ter sido cobrada pelo provedor. O reinício deixa tarefas interrompidas para você decidir quando retomar.
- **Paralelismo**: Configurações permite de uma a três tarefas simultâneas. As etapas de uma mesma tarefa continuam sequenciais.
- **Chaves alternativas**: OpenAI e DeepSeek aceitam até cinco chaves por chamada. Em erros 401, 403 ou 429, o aplicativo tenta a próxima; não repete respostas já concluídas. Elas também ficam em texto no armazenamento local. Campos vazios preservam chaves salvas.
- **Importação `.skill`/ZIP**: no campo de instruções do canal, carregue um pacote com um único `SKILL.md` e referências Markdown/texto. O app valida caminhos e CRC, limita o pacote a 3 MB e o conteúdo descompactado a 2 MB e não executa arquivos.
- **Modo apresentação**: em Configurações, ative para ocultar títulos de tarefas, nomes/nichos de canais e resultados da visualização. É uma preferência visual do navegador, não criptografia nem controle de acesso; formulários de edição e exportações continuam contendo seus dados.
- **Backup completo**: inclui canais, roteiros e tarefas/checkpoints, sem configurações ou chaves. Importe pela interface. IDs já existentes são ignorados; tarefas pendentes importadas ficam interrompidas, e pesquisas importadas são identificadas como material do backup.

Contratos oficiais consultados: [DeepSeek Chat](https://api-docs.deepseek.com/api/create-chat-completion/), [DeepSeek Search](https://api-docs.deepseek.com/api/search/), [DeepSeek Models](https://api-docs.deepseek.com/api/list-models/), [OpenAI Web Search](https://developers.openai.com/api/docs/guides/tools-web-search), [AGY headless](https://antigravity.google/docs/cli/headless/).

## Primeiro uso

### Dados e credenciais

O repositório não inclui a pasta `data/`, arquivos `.env`, capturas de tela, diagnósticos locais ou documentos particulares dos canais. Na primeira execução, o aplicativo cria seu armazenamento local. Configure suas próprias credenciais na interface; elas ficam em texto no arquivo local `data/store.json`. Não publique esse arquivo nem backups completos da pasta `data/`. O `.gitignore` impede a inclusão normal desses arquivos no Git.

### Projetos por canal (versão 0.3)

Em **Projetos dos canais**, selecione um canal e envie sua skill ZIP/.skill e os documentos. O app preserva caminhos, referências e histórico. Classifique as instruções, escolha a skill escritora principal e configure as etapas. Para gerar, escolha **Fluxo da skill do canal**; o botão do projeto já faz essa seleção.

Os documentos ativos entram em cada etapa e seus hashes ficam registrados na tarefa. Alterações não mudam gerações já iniciadas. Os projetos são espelhados em revisões dentro de `data/projects/`; nenhum arquivo original enviado é modificado.

O perfil **The Staff Ride** inclui o processo e os verificadores específicos analisados. Exige número do vídeo/data de postagem, pesquisa e revisão da ficha antes da redação. Os documentos e as skills particulares do canal precisam ser enviados pelo usuário; não fazem parte deste repositório. Na fila, baixe ou corrija artefatos e aprove a etapa para continuar. Scripts diferentes enviados ficam armazenados e não são executados automaticamente.

No perfil genérico, o fluxo é editável. Ative a opção de finalização e informe o número do vídeo para arquivar no conhecimento do canal e atualizar o registro. No Staff Ride isso já é obrigatório. A última aprovação mostra a linha exata e a pasta de destino: **Aprovar e finalizar** grava o roteiro no banco local, arquiva em `historico/` e atualiza somente a cópia do `registro-de-producao.md` do projeto. A linha é atualizada pelo número do vídeo, preservando a ordem existente, publicação, link, visualizações e observações anteriores. Novos números são inseridos pela data de postagem quando identificável. Linhas inválidas ou números duplicados bloqueiam a finalização para correção. Se o registro mudar durante a aprovação, uma nova prévia precisa ser aprovada.

Os arquivos de produção ficam em `data/producao/nome-do-canal-ID/numero-titulo-ID/`: `roteiro.md`, `narracao.txt`, registro atualizado, linha aplicada, pasta `etapas/`, fontes e relatórios quando disponíveis e manifesto. IDs evitam sobrescrever outros trabalhos com o mesmo título; a repetição da mesma finalização não duplica a linha nem a entrada do banco. O JSON do backup inclui projetos e tarefas; para preservar também essas pastas de produção, copie a pasta `data`. Proteja backups, que podem conter material privado e credenciais na cópia completa de `data`.

1. Em **Configurações**, escolha um provedor e salve o modelo. Os CLIs Codex e Claude já instalados são detectados automaticamente; faça login com as ferramentas oficiais antes de gerar. O botão de teste desses CLIs confirma a instalação, não o login.
2. OpenAI e Gemini precisam de uma chave sua. Salve antes de consultar modelos ou testar. As consultas de teste não solicitam geração. A lista da OpenAI pode incluir modelos incompatíveis com geração textual; escolha um modelo que suporte Responses.
3. Em **Meus canais**, cadastre nome, nicho, idioma, DNA e skill. É possível importar Markdown/texto sem executar seu conteúdo.
4. Em **Análise de DNA**, forneça referências textuais. Quando um canal é selecionado, o resultado substitui seu DNA. As referências não são baixadas automaticamente de URLs.
5. Em **Roteiros**, forneça tema, duração, premissa e outras orientações. Use um tema por linha para enfileirar vários títulos. Os modos são Direto, Architect + Writer, Architect + Writer + Auditor e Completo, com Fact Shield. Cada etapa solicita uma geração e consome o plano/crédito do provedor selecionado.
6. Em **Cenas Veo 3**, forneça roteiro e SRT, escolha estilo e câmera, provedores de Setup/lotes e tamanho do lote. Os tempos ficam preservados nos blocos; a saída é validada para conter exatamente uma linha numerada por bloco. Há uma tentativa adicional de correção de formato por lote. Capítulos são opcionais.
7. Consulte **Fila e histórico** para progresso, resultados, planos e revisões. Resultados parciais são preservados quando uma tarefa falha. Cancelar interrompe a requisição local, mas não garante estorno ou cancelamento do processamento no provedor.

## Dados e privacidade

- O servidor escuta somente em `127.0.0.1`. Não publique a porta diretamente na internet.
- Canais, roteiros, tarefas e configurações ficam em `data/store.json`. Um backup do estado anterior fica em `data/store.json.backup`. Feche o app antes de restaurar manualmente o backup.
- As chaves fornecidas pela interface ficam em texto nesse arquivo e no backup. Para evitar armazená-las, use variáveis de ambiente `OPENAI_API_KEY`, `GEMINI_API_KEY` e `DEEPSEEK_API_KEY`. A interface e as exportações não retornam as chaves.
- O backup completo JSON da interface exporta canais, roteiros e tarefas, sem as configurações ou chaves dos provedores. Uma cópia manual da pasta `data` também contém as chaves salvas: proteja essa cópia.
- Os textos necessários à geração são enviados ao provedor escolhido. Com Ollama em localhost, é possível usar um modelo instalado localmente, sem serviço remoto. Ollama e seus modelos são opcionais e não foram instalados por este projeto.
- Nenhum dado pessoal, banco de dados ou credencial da instalação original foi importado.

## O que foi recuperado e o que foi reconstruído

`ANALISE.md` descreve a evidência e as limitações. Foram recuperados 14 textos de prompts e 30 documentos de estilos/câmera da instalação. Os prompts contínuos e os remontados estão identificados com offsets em `reference/prompts/metadata.json`.

O código do servidor e da interface foi reconstruído. Não é o código-fonte original e não foi demonstrada equivalência integral. O aplicativo original não foi executado nesta análise. A interface é própria; não houve validação visual de todas as telas originais.

### Cobertura

| Recurso | Estado nesta versão |
|---|---|
| Canais, DNA e skill própria em texto | Implementado |
| Roteiros com 2, 3 ou 4 etapas, modo direto | Implementado com prompts recuperados/adaptados |
| Premissa, duração, palavras, TTS e próximo vídeo | Entradas incorporadas nos prompts; duração/TTS não sintetizam áudio |
| Títulos em lote, fila, cancelamento e histórico | Implementado; até três tarefas simultâneas |
| Veo3 com Setup e lotes em provedores distintos | Implementado; gera prompts, não vídeos |
| Estilos e câmera | Biblioteca local recuperada |
| Validação de um prompt por bloco e capítulos | Implementado |
| OpenAI, Gemini, Codex, Claude, Ollama, DeepSeek e AGY | Adaptadores implementados; geração testada por simulação; catálogo AGY consultado com login real |
| Busca web/verificação factual externa | Pesquisa real via DeepSeek Search ou OpenAI Web Search; sem garantia automática de veracidade |
| Login/licença/atualizador da aplicação original | Não replicados; aplicação local independente |
| ZIP .skill, chaves alternativas, paralelismo, apresentação e retomada | Implementados na versão 0.2 |
| Importação automática do banco da instalação original | Ainda não implementada |

Tarefas que estavam na fila ou executando quando o servidor encerrou aparecem como interrompidas após reiniciar. Use Retomar para aproveitar as etapas salvas, usando as credenciais e modelos padrão atualmente configurados. A retomada não é automática.

## Assistente de skill e motores

Em **Projetos dos canais**, o pacote da skill aparece como árvore (SKILL.md, assets, references, scripts). Documentos externos aparecem em caixas identificadas pela skill, como planejamento, mapa de concorrência e histórico. A inspeção inicial é local e verifica presença pelos caminhos/nomes; não certifica que o conteúdo está completo. A análise opcional por IA envia o contexto ativo ao provedor selecionado e devolve uma proposta de documentos, etapas e limitações. Aplique somente depois de revisar; ela não executa código nem troca motores por decisão própria.

O assistente, cada etapa e o portão de validação do Staff Ride têm seletores independentes de provedor, modelo e esforço. A opção de herdar usa o motor da tarefa. Roteiros sem projeto também permitem motores específicos para planejamento, escrita, revisão e auditoria; Veo permite escolher o motor de planejamento e de capítulos. Configurações incluem esforço padrão por provedor. As tarefas registram modelo e esforço **solicitados**, pois provedores/contas podem restringir ou ajustar níveis. CLIs Claude e AGY recebem `--effort`; Codex recebe `model_reasoning_effort`; OpenAI, DeepSeek e Gemini recebem os parâmetros nativos. Ollama não tem seletor de esforço nesta integração. Gemini 2.5 usa outro mecanismo e deve ficar em Padrão aqui.

O Claude exibe os aliases sonnet/opus/haiku, sem prometer acesso a todos os modelos. O Codex lê o catálogo local models_cache.json quando disponível. Você também pode informar um ID aceito pela conta. O AGY consulta seu catálogo real. Configurar AGY numa etapa editorial não ativa navegação: a coleta web continua usando DeepSeek Search ou OpenAI, e o modelo da etapa analisa as fontes retornadas. A validação atual não faz novas buscas autônomas. O assistente mostra scripts e serviços que não têm executor disponível; enviar uma skill não instala suas dependências.

As etapas `review` e `cold-review` dos projetos incorporam os critérios do plugin pessoal The Editor: estrutura, consistência, clareza e estilo, ritmo, verossimilhança, linguagem e veredito com nota de 0 a 10. O relatório é em português, preserva o idioma dos trechos e separa crítica editorial de auditoria factual. Cada problema deve trazer trecho, localização, gravidade e correção necessária. A nota é julgamento editorial, sem limiar automático de aprovação. Os novos artefatos identificam a versão dos critérios; revisões já salvas permanecem preservadas.

Essa revisão pode usar motor independente configurado no projeto. O fluxo pode encaminhar análise da pesquisa ao Gemini via AGY, validação ao DeepSeek, escrita ao Claude e conferência ao DeepSeek. A navegação própria do AGY e novas consultas autônomas do validador ainda não foram integradas. O relatório não afirma que uma busca ou correção aconteceu sem resultado real.

## Verificação

```powershell
npm.cmd test
```

Os testes usam um serviço de IA simulado localmente e mocks de HTTP: não consomem créditos. Cobrem persistência/backup, SRT, validação de cenas/capítulos, geração em fila, importação/exportação, proteção de credenciais e limites de origem do servidor. A autenticação e a qualidade das respostas dos provedores precisam ser verificadas com a conta/modelo escolhidos por você.

## Conexões e regressões

Os botões Testar conexão e Listar modelos usam os valores preenchidos, mesmo antes de salvar. O teste não salva credenciais nem gera texto. Salve as configurações para usá-las nas gerações. A lista de modelos é visível nas configurações e nos seletores de cada etapa. IDs manuais são preservados.

A lateral verifica as configurações salvas: verde indica sucesso na consulta de conexão/login; vermelho indica falha ou estado ainda não verificado. APIs consultam modelos, Claude/Codex consultam o estado de login e AGY consulta seu catálogo. Isso não garante cota nem geração por um modelo específico. Os resultados têm cache de um minuto e podem ser atualizados pelo botão ↻.

No Windows, o servidor usa os certificados confiáveis do sistema junto das raízes já confiáveis do Node, sem instalar certificados e sem desativar a validação TLS. Isso corrige redes cuja cadeia HTTPS é confiável no Windows, mas não no conjunto de certificados próprio do Node. Falhas de certificado, DNS e autenticação HTTP agora têm mensagens distintas, sem expor chaves ou detalhes privados da rede.

Cada correção de bug deve incluir um teste automatizado de regressão, conforme AGENTS.md. A suíte cobre também rascunhos de configuração, recuperação dos botões após erro, modelo manual, estados de login e invalidação do cache.
