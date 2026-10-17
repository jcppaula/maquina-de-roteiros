---
name: estilo-cinema-historico-realista
description: Contrato visual v5 para documentários narrativos, biografias e reconstruções históricas com realismo físico, materiais táteis, luz motivada, profundidade cinematográfica, atuação contida, câmera deliberada e imagem limpa. Usar com a Skill Mestre SRT [i]+[v] v7 quando o filme exigir aparência histórica neutra, humana e sem overlays.
---

# Contrato de Estilo — Cinema Histórico Realista

~~~text
STYLE_CONTRACT_VERSION: 5.0
STYLE_ID: HISTORICAL_GROUNDED_REALISM
DISPLAY_NAME: Cinema Histórico Realista sem Overlays
MASTER_COMPATIBILITY: SKILL_MESTRE_DIRETOR_CINEMATOGRAFICO_SRT_IV v7+
IMAGE_LOOK_EN: Grounded photoreal historical drama, tactile weathered materials, muted organic color, physically motivated illumination, layered depth, restrained contrast, natural skin and fabric weight.
MOTION_LOOK_EN: Stable exposure and deliberate camera behavior without ornamental drift; when present, physical performance and natural motion remain restrained and weighty, and the endpoint follows the planned cut mode.
LIGHTING_AND_EXPOSURE: One plausible dominant source, controlled highlights, detailed shadows and truthful skin exposure.
PALETTE_AND_MATERIALS: Region-derived muted color, tactile earth, stone, timber, metal, leather and woven fabric.
DEPTH_AND_BLOCKING: Human-scale layered staging, motivated foregrounds, readable geography and restrained negative space.
SHOT_SCALE_BIAS: Balanced establishing, medium relationship, process insert and protected reaction coverage.
LENS_BANDS: 24–28mm environment; 35–50mm human context; 75–100mm protected reaction; moderate macro for evidence.
CAMERA_OPERATING_RULES: Static first; short tracking, push-in, pull-back, pan or tilt only when narratively motivated.
FACE_TREATMENT: Natural asymmetry, side or three-quarter light, profile or three-quarter framing, restrained performance.
ATMOSPHERE_LIMITS: Only physically caused dust, humidity, smoke, wind or reflection; low amplitude.
PROHIBITED_AESTHETICS: Fantasy glow, glossy costume, game-engine surface, poster staging, artificial overlay and decorative particles.
~~~

## Identidade

Fazer a imagem parecer captada em local real ou cenário físico, com peso, desgaste e comportamento plausíveis. A beleza deve nascer do espaço, da luz e da ação, não de polimento publicitário.

Priorizar:

1. fato, período, região e clima;
2. materialidade e continuidade;
3. composição em camadas;
4. luz motivada;
5. atuação econômica.

Não impor monumentalidade. Diferenciar este contrato do épico por escala humana e neutralidade.

## Luz e cor

Usar céu, sol, janela, porta, vela, fogo ou luminária visível como fonte dominante. Manter direção estável dentro da cena.

Derivar a paleta do local: terra, pedra, madeira, linho, couro, ferrugem, musgo, azul acinzentado ou outras cores factualmente corretas.

Evitar luz frontal plana em reação facial quando uma lateral plausível puder criar forma. Preservar detalhe em pele, tecido e sombra.

## Cobertura

Favorecer alternância:

- establishing geográfico;
- master humano em 35–50 mm;
- insert de objeto, mãos ou processo;
- OTS ou POV para relação;
- reação protegida em perfil ou três-quartos;
- aftermath espacial.

Não repetir planos gerais de pessoas trabalhando. Mostrar primeiro a geografia, depois o processo por detalhe e, somente quando necessário, a reação.

## Profundidade e blocking

Usar portas, paredes, ferramentas, ombros ou arquitetura como primeiro plano motivado. Separar sujeito e fundo por distância, luz e foco moderado.

Evitar sujeito frontal centralizado, fundo completamente nítido em todo take e composição de fotografia de equipe.

## Câmera

Ordem preferencial:

1. static locked;
2. short slow follow ou lateral track;
3. subtle push-in ou gentle pull-back;
4. short pan ou tilt;
5. gentle crane apenas em geometria ampla e simples.

Movimento deve alterar uma relação espacial ou acompanhar ação simples. Em ferramentas, grupos, partículas ou rosto protegido, preferir câmera travada.

## Pessoas

Manter postura, peso, assimetria e imperfeição humana. Usar gesto curto, olhar contido e figurino usado.

Evitar fala visível, sorriso crescente, pose heroica, olhos arregalados e expressão que muda completamente no take.

## Precisão histórica

Usar arquitetura, tecnologia, transporte, roupa e objeto compatíveis com a época e a região. Quando a fonte não definir um detalhe, escolher solução genérica e plausível.

Não inventar texto legível, brasão, uniforme, bandeira ou ritual.

## Aplicação contextual

Selecionar somente modificadores que produzam efeito visível e factual naquele take. Não usar quota fixa nem acumular sinônimos:

~~~text
cool diffused overcast daylight
warm practical firelight with detailed shadows
damp tactile surfaces and restrained reflections
dry sunlit earth with hard natural shadow edges
subtle stable optical texture
~~~

## Compilação

Copiar IMAGE_LOOK_EN exatamente uma vez dentro de [i] e MOTION_LOOK_EN exatamente uma vez dentro de [v]. Usar os demais campos para decidir luz, material, profundidade, lente, blocking, performance e câmera; não redescrever aparência em [v].

Aceitar somente se o frame tiver materialidade, geografia, luz e comportamento coerentes e se a montagem alternar contexto, processo, relação e consequência.
