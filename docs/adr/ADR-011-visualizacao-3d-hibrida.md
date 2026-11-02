# ADR-011: Visualização 3D Híbrida com Modelos CC-BY do Sketchfab

## Status
Proposto (v3.0). Implementação em 3 fases (PRD, seção 6).

## Contexto
O usuário pediu placa-mãe e componentes em 3D usando referências do Sketchfab:
* o modelo "Motherboard mATX" (digitalrazor3d);
* a coleção "PC" (bezinyaroslav), com 31 modelos.

A consulta à API pública do Sketchfab (02/11/2026) mostrou que:
* a placa mATX indicada, a "RTX 4070" do mesmo autor e a "X299 SAGE" **não podem ser baixadas e não têm licença**;
* a maioria dos demais é **CC Attribution (CC-BY)**, com peças leves (368 a 10 mil faces) e algumas placas-mãe pesadas (61 mil a 818 mil faces);
* as GeForce RTX 20xx são **CC-BY-NC** (não comercial) e pesam de 350 a 400 mil faces.

Restrições do projeto: 60 FPS em vídeo integrado de PCs escolares (RNF07), orçamento de JavaScript (RNF08), funcionamento offline (RNF06), acessibilidade (RNF09) e licenças (RNF10).

## Decisão

### 1. Renderização com three.js + React Three Fiber, carregados sob demanda
* `three`, `@react-three/fiber` e `@react-three/drei` (apenas `useGLTF`, `OrbitControls`, `Html` e `Bounds`), em um componente carregado com `next/dynamic` e `ssr: false`.
* Nada disso entra na primeira carga: o pacote (~200 kB comprimidos) só é baixado quando o aluno abre o 3D.
* Detecção de WebGL; sem suporte, o jogo mostra a ilustração 2D do [ADR-009](./ADR-009-ilustracoes-orientadas-por-dados.md).

### 2. Ativos somente CC-BY (ou CC-BY-SA), otimizados no projeto
* Fonte: modelos baixáveis e CC-BY listados no PRD (seção 6.2). Modelos sem licença, não baixáveis ou não comerciais ficam de fora.
* Pipeline com `@gltf-transform/cli`: `dedup`, `weld`, `simplify` (meshoptimizer) até o orçamento de faces, compressão `meshopt` e texturas KTX2/WebP de até 1024 px.
* Orçamento: até ~200 mil faces por cena e até ~2 MB por modelo.
* Arquivos em `public/models/`, com um manifesto (`src/engine/models3d.ts`) que liga cada id do catálogo ao arquivo, ao autor, ao link e à licença.
* Tela "Créditos 3D" gerada a partir do manifesto.

### 3. Bancada 3D por âncoras projetadas (Fase 2)
* Cada slot e conector recebe um nó vazio nomeado no modelo (ex: `ANCHOR_ATX_PWR`, `ANCHOR_DIMM_A2`), posicionado no Blender.
* Em tempo de execução, as âncoras são projetadas na tela e renderizadas como elementos HTML com `data-cable-target` (via `Html` do drei).
* Resultado: regras, arrastar e soltar, clique e teclado do [ADR-010](./ADR-010-cabeamento-e-arrastar-e-soltar.md) funcionam sem reescrita; só a camada de desenho muda.
* Câmera com vistas fixas (de cima para montar e cabear, isométrica para conferir), em vez de órbita livre, para não desorientar.

### 4. Acessibilidade e conforto
* Giro automático desligado com `prefers-reduced-motion`.
* Controles de câmera por teclado (setas e +/−) e botões de vista.
* A versão 2D permanece como "modo leve", escolhido automaticamente em máquinas sem WebGL e disponível como opção para todos.

### 5. Offline
Os modelos entram no cache do service worker. Isso depende de corrigir antes a estratégia de cache do HTML (backlog do PRD, seção 7).

## Alternativas Consideradas e Rejeitadas
* **Usar a placa "Motherboard mATX" indicada:** rejeitado. O modelo não pode ser baixado e não tem licença; usar seria violar os direitos do autor.
* **Incorporar o visualizador do Sketchfab (iframe / Viewer API):** rejeitado para o jogo. Exige internet (quebra o offline), traz a marca e a interface do Sketchfab, pesa mais que o three.js e não permite as nossas regras de encaixe. Pode servir apenas como link externo de referência na ficha didática.
* **Bancada 100% 3D com física e arraste em 3D:** rejeitado. Arrastar em 3D com raycasting é mais difícil para alunos com touchpad e para teclado, e duplicaria a lógica de alvos. As âncoras projetadas dão o visual 3D com a interação já validada.
* **Babylon.js:** completo, mas maior que three.js e sem a integração declarativa com React do R3F.

## Consequências
* **Positivas:**
  * O aluno reconhece os formatos reais das peças.
  * A lógica do jogo continua num só lugar e testada.
* **Negativas:**
  * O preparo dos modelos (âncoras, redução de faces) exige trabalho manual no Blender.
  * Os modelos são de produtos reais (ASUS, Samsung, Crucial…), enquanto parte do catálogo usa placas fictícias "Apex": a correspondência entre catálogo e modelo 3D será por categoria e formato, não por produto.
  * O download exige login no Sketchfab por uma pessoa da equipe.
