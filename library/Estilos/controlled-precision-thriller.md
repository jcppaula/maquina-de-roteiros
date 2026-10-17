---
name: estilo-controlled-precision-thriller
description: Contrato visual v5 para investigações, crimes, mistérios, thrillers psicológicos e documentários sombrios com geometria rigorosa, câmera precisa, cor fria, calor prático localizado, blocking controlado e emoção contida. Usar com a Skill Mestre SRT [i]+[v] v7 sem emitir nomes de cineastas ou obras.
---

# Contrato de Estilo — Controlled Precision Thriller

~~~text
STYLE_CONTRACT_VERSION: 5.0
STYLE_ID: CONTROLLED_PRECISION_THRILLER
DISPLAY_NAME: Controlled Precision Thriller
INTERNAL_ALIAS: Fincher Controlled Precision
MASTER_COMPATIBILITY: SKILL_MESTRE_DIRETOR_CINEMATOGRAFICO_SRT_IV v7+
IMAGE_LOOK_EN: Photoreal controlled psychological realism, engineered geometry, restrained tonal palette, deep detailed shadows, rigid blocking, precise framing, tactile surfaces and emotional distance.
MOTION_LOOK_EN: Stable horizon and exposure with engineered, precisely timed camera behavior; locked shots remain fixed, moving shots use controlled speed profiles, performance stays restrained when present, and the endpoint follows the planned cut mode.
LIGHTING_AND_EXPOSURE: Low-key motivated sources, deep detailed blacks, stable exposure and one localized warm practical when plausible.
PALETTE_AND_MATERIALS: Cool institutional neutrals, restrained amber, aged concrete, glass, metal, paper, timber and truthful skin.
DEPTH_AND_BLOCKING: Strong architectural lines, deliberate negative space, fixed eyelines and layered evidence placement.
SHOT_SCALE_BIAS: Static architectural masters, medium controlled relationships, evidence inserts and isolated protected reactions.
LENS_BANDS: 28–35mm architecture; 40–50mm controlled human space; 75–100mm isolated reaction.
CAMERA_OPERATING_RULES: Locked precision first; subtle push-in or straight dolly second; no casual drift.
FACE_TREATMENT: Three-quarter or profile, restrained jaw and gaze, side-motivated light, no theatrical fear.
ATMOSPHERE_LIMITS: Minimal and source-based; no decorative haze, rain, smoke or floating particulate.
PROHIBITED_AESTHETICS: Sentimental softness, improvised handheld, extreme cyan-green grade, glossy advertising, random clutter and ornamental camera.
~~~

## Identidade

Construir tensão por ordem, distância, repetição, evidência e silêncio visual. Não depender de cor extrema, atuação exagerada ou movimento constante.

Priorizar:

1. legibilidade causal;
2. arquitetura e blocking;
3. posição deliberada de pessoas e objetos;
4. luz prática;
5. economia de gesto.

Nunca colocar o alias interno, nome de diretor, filme ou série no prompt final.

## Luz e cor

Usar cinzas, verdes ou azuis institucionais discretos e midtones dessaturados. Preservar pele natural.

Localizar calor em luminária, janela, rua, fogo, monitor ou outra fonte real. Não aquecer a cena inteira nem esmagar o preto.

## Cobertura

Favorecer:

- establishing arquitetônico com geometria causal;
- master estático de relações;
- insert de documento, objeto ou evidência;
- OTS com linha visual precisa;
- close protegido e isolado;
- pull-back ou cutaway de consequência.

Variar por simetria deliberada, assimetria calculada, altura, negative space e profundidade. Não resolver toda tensão com push-in.

## Blocking e profundidade

Usar corredores, portas, mesas, janelas, arquivos e molduras físicas para organizar o quadro. Props devem ter função narrativa e posição contínua.

Permitir clutter quando ele for evidência; não o mover por estética.

## Câmera

Ordem preferencial:

1. static locked;
2. subtle precise push-in;
3. short straight dolly ou lateral track;
4. minimal pan;
5. gentle pull-back.

Trajetória limpa, velocidade constante e parada exata. Proibir handheld, orbit, drift e reframing contínuo como padrão.

## Pessoas e rostos

Dirigir postura econômica, olhar contido e pausa. Em close, manter ângulo, expressão e boca estáveis.

Evitar underlight caricatural, olhos arregalados, pele cadavérica, gesto de horror e close frontal repetido.

## Adaptação factual

Em exterior rural, época antiga ou ambiente caloroso exigido pela narrativa, preservar precisão por composição e blocking. Não forçar fluorescente, escritório moderno ou cor fria incompatível.

## Aplicação contextual

Selecionar somente modificadores que alterem concretamente o frame. Não usar quota fixa nem forçar um modificador incompatível com o local:

~~~text
deep but detailed shadow separation
one localized amber practical source
precise negative space and rigid eyelines
cool fluorescent institutional ambience
deliberate evidence placement
~~~

## Compilação

Copiar IMAGE_LOOK_EN uma vez em [i] e MOTION_LOOK_EN uma vez em [v]. Expressar controle visual por enquadramento, luz e blocking, e controle cinético por trajetória, horizonte, velocidade e settle; não redescrever a aparência em [v].

Aceitar somente se a tensão existir mesmo com câmera parada.
