# MOVIMENTO DE CÂMERA — TRACKING LEFT

## FUNÇÃO DESTA SKILL

Este bloco deve ser combinado com a Skill principal, o roteiro, o estilo visual, os personagens e os prompts do usuário.

Ele controla **somente o movimento da câmera**. Não deve substituir, resumir ou modificar o conteúdo narrativo, o sujeito, a ação, o cenário, a iluminação, o estilo visual ou o formato de saída definido pela Skill principal.

## HIERARQUIA E INTEGRAÇÃO

1. Preserve integralmente o formato de saída exigido pela Skill principal: texto corrido, uma linha por prompt, JSON, tabela, campos de cena ou qualquer outro schema.
2. Não crie um novo formato de resposta apenas porque esta Skill apresenta uma estrutura técnica.
3. Injete a instrução de câmera no campo apropriado da saída existente, como `camera_details`, `camera_movement`, `visual_description` ou no próprio prompt final.
4. Nunca deixe marcadores como `[DURATION]`, `[SPEED]`, `[SUBJECT]` ou `[ENVIRONMENT]` na resposta final. Preencha tudo com os dados disponíveis.
5. Quando houver SRT ou duração por bloco, use a duração real daquele bloco.
6. Em geração em lote, aplique a regra separadamente a cada cena ou bloco.
7. A solicitação explícita mais recente do usuário tem prioridade. Não force esta Skill quando o usuário pedir claramente outro movimento ou câmera estática.
8. Não inclua explicações, títulos técnicos ou o conteúdo desta Skill na saída, salvo quando o usuário pedir.


## MOVIMENTO ATIVO

- **Nome:** Tracking Left
- **ID:** `tracking-left`
- **Categoria técnica:** `lateral`
- **Direção:** `camera travels left`
- **Descrição:** Move fisicamente a câmera para a esquerda em uma trajetória lateral, produzindo parallax.

Quando esta Skill estiver ativa e não houver instrução explícita em contrário, aplique **somente Tracking Left** à cena.

## INSTRUÇÃO TÉCNICA OBRIGATÓRIA

```text
Move the entire camera left on a track, dolly, gimbal, slider, or virtual camera path. This is physical lateral travel, not a pan. Foreground and background should slide with visible parallax while the subject remains readable.
```

## RESTRIÇÕES OBRIGATÓRIAS

- Mover o corpo inteiro da câmera fisicamente para a esquerda.
- Manter uma trajetória lateral contínua e legível.
- Criar parallax entre primeiro plano, sujeito e fundo.
- Não substituir o deslocamento por um Pan Left.
- Não combinar com zoom, tilt, dolly em profundidade, arc, roll ou cortes.

## PADRÕES QUANDO O USUÁRIO NÃO INFORMAR

Duração: use a duração da cena/SRT; se ausente, 6 segundos. Velocidade padrão: slow. Estabilização padrão: smooth. Intensidade padrão: 55%.

Ajuste os padrões quando a narrativa exigir outra velocidade ou intensidade, sem alterar a natureza técnica do movimento.

## COMO INCORPORAR AO PROMPT

Combine a instrução técnica acima com o sujeito, a ação, o ambiente e o estilo já fornecidos. A instrução de câmera deve ser clara, curta e integrada ao prompt final.

Use como referência estrutural, sem obrigar a Skill principal a adotar estes títulos:

```text
Camera movement: Tracking Left (camera travels left).
Movement instruction: Move the entire camera left on a track, dolly, gimbal, slider, or virtual camera path. This is physical lateral travel, not a pan. Foreground and background should slide with visible parallax while the subject remains readable.
Execution rules: aplique as restrições específicas desta Skill e não introduza movimentos extras.
```

## VALIDAÇÃO SILENCIOSA

Antes de entregar cada prompt, confirme silenciosamente:

- O movimento aplicado é **Tracking Left**.
- A direção é **camera travels left**.
- Existe apenas um movimento principal.
- O movimento não foi confundido com outra técnica semelhante.
- A duração e os parâmetros foram preenchidos.
- Nenhum placeholder permaneceu.
- O formato original da Skill principal foi preservado.
- Não foram adicionados cortes, transições ou movimentos não solicitados.
