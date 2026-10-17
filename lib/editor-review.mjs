// Critérios adaptados do plugin pessoal The Editor, a pedido do usuário.
export const EDITOR_REVIEW_VERSION='the-editor-1';
export const isEditorialReview=stage=>['review','cold-review'].includes(stage.id);
export function editorReviewPrompt(){
 return `REVISÃO EDITORIAL — THE EDITOR (${EDITOR_REVIEW_VERSION})
Faça uma avaliação crítica profissional, direta e específica do roteiro completo. O relatório será sempre em português; preserve o idioma original nos trechos citados e nas sugestões de redação. Avalie o texto como manuscrito profissional, sem elogios vazios nem ataques ao autor.
Os critérios abaixo complementam a skill escritora e as decisões do canal. Adapte-os ao gênero: não exija diálogos, personagens ficcionais, clímax artificial ou resolução que a história documentada não possui. Não mude o título nem aplique um molde narrativo externo.
Entregue o documento com o título 'ANÁLISE CRÍTICA POR THE EDITOR' e estas sete seções:
1. Estrutura: lógica e função da organização, abertura, desenvolvimento, ponto de maior tensão e fechamento quando pertinentes.
2. Consistência: coerência de comportamentos e motivações quando documentadas, lógica interna, cronologia e continuidade tonal. Não invente estados mentais.
3. Clareza e Estilo: fluidez, frases vagas ou complexas sem necessidade e aderência à voz, skill e exemplos aprovados do canal.
4. Ritmo e Fluidez: trechos lentos ou apressados, repetição de informação e transições entre cenas ou argumentos.
5. Realismo e Verossimilhança: plausibilidade de acontecimentos, decisões e diálogos quando presentes. Separe plausibilidade narrativa de comprovação factual: soar crível não prova um fato.
6. Gramática e Linguagem: problemas recorrentes no idioma do roteiro, construções pouco naturais, redundâncias, clichês e escolhas fracas.
7. Veredito Final: pontos fortes, pontos fracos, prioridades de correção e uma Nota Final de 0 a 10 justificada em uma frase. A nota é julgamento editorial, não medição objetiva nem certificado de exatidão histórica. Não invente um limiar de aprovação.
Para cada problema relevante, informe localização (seção/parágrafo), trecho exato, gravidade (crítica, alta, média ou baixa), motivo e correção necessária. Se a evidência não permitir conclusão, marque 'não verificável com o material fornecido'. Se não houver falha em uma categoria, diga isso sem fabricar defeitos.
Inclua na seção 7 uma auditoria factual separada: confronte afirmações do roteiro com pesquisa e fontes efetivamente anexadas; liste afirmações novas sem suporte, contradições e fontes parciais. Indique a fonte e o trecho de suporte quando disponíveis. Não trate resumo, URL ou concordância entre modelos como fonte lida; não alegue nova busca ou reabertura que não ocorreu.
Finalize com uma lista priorizada de correções para o escritor, preservando a voz do canal. Entregue diagnóstico e sugestões; não reescreva o roteiro completo nesta etapa. Não alegue que correções sugeridas já foram aplicadas.`;
}
