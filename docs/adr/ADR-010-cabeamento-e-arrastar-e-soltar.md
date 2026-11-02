# ADR-010: Cabeamento Interativo e Arrastar e Soltar com Pointer Events

## Status
Aprovado (v2.1). Substitui a escolha de "Framer Motion + Drag Controls" do [ADR-002](./ADR-002-motor-de-interatividade-e-montagem.md) para as interações de arrastar.

## Contexto
* O minigame do F_PANEL tinha pinos que pareciam clicáveis mas não faziam nada, e 4 botões "Pinos [x, y] (nome)" que entregavam a resposta.
* Os cabos da placa eram ligados com um clique no próprio conector ("CLIQUE: LIGAR CABO 24 PINOS"), sem nenhuma decisão do aluno.
* Cabos do gabinete (USB, áudio e ventoinhas) não existiam.
* O AGENTS.md exige arrastar e soltar **e** clicar-para-encaixar, com suporte a touchpads gastos e telas de toque.

## Decisão

### 1. Modelo de dados do cabeamento (`src/engine/cabling.ts`)
* `CABLES`: 9 cabos com origem (`PSU`, `CASE`, `PARTS`), pinos, cor e conector correto.
* `CABLE_TARGETS`: 10 conectores (ATX_PWR, ATX12V, GPU_POWER, DRIVE_POWER, SATA_PORT, CPU_FAN, SYS_FAN, USB3_HEADER, USB2_HEADER, HD_AUDIO), incluindo o USB 2.0 como distrator real.
* `validateCableConnection(cabo, conector)`: sucesso no conector certo; mensagens específicas para os erros clássicos (EPS × PCIe marcado como `dangerous`, HD_AUDIO × USB 2.0, ventoinha do cooler no SYS_FAN, energia × dados SATA) e mensagem genérica para os demais.
* O store guarda `cableConnections` (cabo → conector). As flags da montagem (`cableAtx24PinConnected`, `caseFansConnected` etc.) são **derivadas** por `cableFlags()`; SATA só conta com dados **e** energia.
* `pruneCableConnections` solta cabos cuja peça de origem ou destino saiu; ações que trocam peça (fonte, disco, GPU, cooler, gabinete, placa) também soltam os cabos daquela peça.
* `getRequiredCables` lista o que a montagem atual precisa ter ligado (usado pela fase 6, pelo checklist e pelo contador da bandeja).

### 2. Arrastar com Pointer Events nativos
* Pointer Events cobrem mouse, touchpad e toque com uma única API.
* Na bandeja de cabos, o cartão chama `setPointerCapture` no `pointerdown` e trata `pointermove`/`pointerup` nele mesmo. Isso evita perder movimentos rápidos, que escapavam quando os listeners eram registrados depois, num `useEffect`.
* Um limiar de 5 px separa clique de arraste; depois de arrastar, o clique seguinte é ignorado.
* Rolagem automática quando o ponteiro chega a 70 px das bordas (a placa é maior que a tela em 1366x768).

### 3. Alvos descobertos pelo DOM
Qualquer elemento com `data-cable-target="ID"` é um alvo, seja SVG (conectores da placa e da GPU) ou HTML (energia do disco na baia SATA). Durante o arraste, os retângulos são lidos com `getBoundingClientRect` e `findNearestTarget` escolhe o mais próximo dentro de um raio de atração (28 px). O mesmo padrão vale para o F_PANEL com `findNearestPinPair` (56 px).

Esse desacoplamento é o que permite a bancada 3D reaproveitar tudo ([ADR-011](./ADR-011-visualizacao-3d-hibrida.md)): basta projetar os pontos do modelo 3D na tela como elementos com `data-cable-target`.

### 4. Estado de interface separado do estado do jogo
`useCableDragStore` (cabo na mão, alvo sob o ponteiro, mensagem e tremor) é um store Zustand só de interface, compartilhado entre a bandeja e os conectores. Não faz parte do progresso salvo.

### 5. Alternativas obrigatórias
* **Clique:** clicar no cabo deixa-o "na mão" (os conectores livres ganham contorno pontilhado); clicar no conector liga.
* **Teclado:** cabos e conectores são focáveis; Enter/Espaço ativa; Esc solta o cabo; no F_PANEL, R gira o conector.
* **Movimento reduzido:** as animações de tremor e encaixe (`animate-plug-shake`, `animate-plug-seat`) são desligadas com `prefers-reduced-motion`.

## Alternativas Consideradas e Rejeitadas
* **HTML5 Drag and Drop:** rejeitado por não funcionar em telas de toque e por não permitir a prévia magnética.
* **Framer Motion `drag`:** exigiria carregar o pacote de recursos maior (`domMax`) e não resolve a detecção de alvos espalhados entre SVG e HTML.
* **Biblioteca dnd-kit:** adequada para listas, mas pesada para alvos SVG com atração magnética; o código próprio ficou em poucas dezenas de linhas por superfície.

## Consequências
* **Positivas:**
  * O aluno decide qual cabo vai em qual conector e aprende com os erros reais de montagem.
  * O mesmo mecanismo de alvos funciona em SVG, HTML e, no futuro, em 3D.
* **Negativas:**
  * Testes automáticos de arraste exigem navegador (E2E); hoje a cobertura é das funções puras e do store, e o arraste foi validado manualmente.
