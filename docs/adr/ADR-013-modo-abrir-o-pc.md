# ADR-013: Modo "Abrir o PC" — vista explodida, isolamento de subsistemas e tour didático

* **Status:** Proposto (implementado no PR das issues #23 a #63)
* **Data:** 2026-11-04
* **Issues:** #59 (esta decisão), #60 (modelo puro), #61 (modo na bancada), #62 (tour), #63 (níveis de qualidade); #38 (encaixe com mola, vista explodida e ventoinhas no POST)

## Contexto
Depois do POST, o aluno tinha a máquina pronta e nada a explorar nela. A skill
[teardown](https://github.com/elvarofficial/teardown) mostra um padrão didático forte para objetos
técnicos: explodir a montagem, isolar a parte que trabalha e ler, ao lado dela, números que vêm
do mesmo modelo que posiciona as peças. Queremos esse padrão **sem** trazer o runtime da skill.

## Decisão
1. **Um modelo puro de pose** (`src/engine/cutaway.ts`, sem three.js):
   `poseCutaway(assembly, motherboard, benchmark, selection, opening)` devolve, para cada peça
   **instalada**, a posição de montagem (de `benchPartPlacements`), o deslocamento explodido, se
   está em foco e a opacidade, além das leituras do painel por subsistema.
   * Subsistemas: `CPU_COOLER`, `MEMORY`, `GPU`, `STORAGE` e `PSU`.
   * **Um número comanda pose e painel:** `opening` ∈ [0, 1] interpola do encaixe (0) à vista
     explodida (1). A animação de mola só anima esse número.
   * Isolar um subsistema leva as peças dele ao centro da bancada e afasta o resto.
   * Leituras (°C, W, RPM, gargalo) vêm de `calculateBenchmark` e de `fanRpmFor` (`benchmark.ts`),
     nunca de constantes soltas.
2. **Os dois modos leem a mesma pose:** a vista explodida da bancada (#38, para estudar a ordem de
   montagem) e o modo "Abrir o PC" (#61). Nenhum deles calcula deslocamento próprio.
3. **Abrir o PC** só abre com POST bem-sucedido; fora disso o botão diz o que falta. Um botão por
   subsistema presente (44×44, teclado, `aria-pressed`, anúncio em `aria-live`). No modo 2D leve
   o mesmo estado vira uma vista esquemática em lista, sem WebGL. Sair devolve a bancada intacta.
4. **Tour (#62):** roteiro puro (`buildTourScript`) derivado das peças instaladas: térmico →
   energia → memória → vídeo → armazenamento → conjunto. Começa após ~25 s sem entrada; qualquer
   clique, tecla, roda ou arraste devolve o controle; novo silêncio retoma. Cada passo tem legenda
   visível. O tour não altera a montagem nem a pontuação.
5. **Níveis de qualidade (#63):** `resolveQualityTier` (puro) escolhe pelo renderer do WebGL:
   * **Leve** (vídeo integrado, SwiftShader/llvmpipe): pixel ratio máximo 1, sombras 512 px,
     sem antialias e sem oclusão ambiente.
   * **Alta** (vídeo dedicado): pixel ratio até 1,5, sombras 1024 px e antialias.
   * A preferência do aluno (Automático / Leve / Alta) fica no progresso salvo (#30).
   * Orçamento de cena: GLBs otimizados até ~30 mil faces por modelo (ADR-011); a bancada completa
     fica abaixo de ~250 mil faces. O nível **não muda** regras, pontuação nem leituras.
6. **Movimento reduzido (RNF09):** com `prefers-reduced-motion`, a mola vira corte instantâneo,
   as ventoinhas não giram e o tour troca de subsistema sem mover a câmera (legendas mantidas).

## Fora de escopo
* Embutir `sims/kit` ou uma página HTML solta da skill.
* Substituir a bancada de montagem ou reimplementar o arrastar no modo "Abrir o PC".
* Malha procedural que ensine formato errado (ex.: AM4 desenhado como AM5, DDR4 como DDR5).
  Exceções já existentes e fiéis às medidas reais: bomba do water cooler, disco SATA e a fonte
  da vista explodida, desenhados como caixas no tamanho real do catálogo.
* Trocar a Web Audio API por samples ou adotar o fundo claro de estúdio da skill.

## Consequências
* **Positivas:** um único modelo testado sem DOM sustenta encaixe, vista explodida, modo
  "Abrir o PC" e tour; o painel nunca diverge do benchmark; o modo 2D continua completo.
* **Negativas:** a bancada 3D ganha mais estado de interface (modo, seleção, tour); a fonte só
  existe em 3D dentro da vista explodida.
