# PROMPT DE IMPLEMENTAÇÃO — Fase 4: Mesa & Battlestation 3D (PC Builder Academy)

> **Destinatário:** Gemini (agente de código com acesso ao repositório `D:\dev\NEXT-ARQ`).
> **Idioma de trabalho:** português do Brasil em código de domínio, comentários, mensagens de UI, commits e relatórios (identificadores TypeScript em inglês/inglês-técnico, como já é o padrão do repo).

---

## 0. Seu papel e o padrão de exigência

Você é o engenheiro responsável por implementar **toda** a Fase 4 do PC Builder Academy: a montagem do setup completo na mesa (mobiliário, periféricos, torre montada pelo aluno), o cabeamento externo com a regra didática da GPU, as telas 3D que acendem com o AcademyOS e a suíte de testes que prova tudo isso.

Regras de conduta inegociáveis:

1. **Ao final, outro agente (Claude) vai revisar cada linha que você escreveu e executar cada comando que você disser ter executado.** Qualquer afirmação sem evidência será tratada como falsa. Então: nunca diga "testes passando" sem ter rodado; nunca diga "60 FPS" sem ter medido; nunca marque uma tarefa como feita se ela está parcial. Um relatório honesto com pendências vale mais do que um relatório "100%" que não se sustenta.
2. **Não invente APIs.** Antes de usar qualquer função, tipo, hook ou componente do repo, abra o arquivo e confirme a assinatura. Antes de usar uma API de biblioteca (Three.js 0.180, @react-three/fiber 9, @react-three/drei 10, Zustand 5, Next 15, React 19, Playwright 1.64, Vitest 3), confirme que ela existe na versão instalada em `node_modules`.
3. **Não enfraqueça testes existentes** para fazê-los passar. Proibido: `.skip`, `.only`, `test.fixme`, apagar asserções, trocar `toBe` por `toBeDefined`, aumentar timeouts para mascarar lentidão, `waitForTimeout` em E2E. Se um teste existente quebrar porque o comportamento mudou de propósito, explique o motivo no relatório final.
4. **Não adicione dependências de runtime.** Tudo o que é necessário já está instalado (three, fiber, drei, zustand, framer-motion, lucide-react). A única dependência nova permitida é `@vitest/coverage-v8` (devDependency, mesma major do `vitest` instalado) para medir cobertura.
5. **Trabalhe em incrementos verificáveis**: uma issue por vez, na ordem da Seção 5, com teste antes da implementação, rodando a suíte ao final de cada issue.

---

## 1. Leitura obrigatória antes de escrever qualquer código

Leia por completo (não só o começo) e use como fonte da verdade:

| Arquivo | Por quê |
| :-- | :-- |
| `AGENTS.md` e `GEMINI.md` | Mandamentos do projeto: TDD, áudio só procedural, equivalência multimodal, estética Cyber-Industrial |
| `.agents/agents/*.md` | Papéis `code-architect`, `react-reviewer`, `a11y-architect`, `performance-optimizer`, `tdd-guide`: aplique o checklist de cada um no trabalho correspondente |
| `.agents/skills/{game-feel,audio-design,frontend-a11y,game-ui-ux,make-interfaces-feel-better,motion-patterns,vercel-react-best-practices,vercel-composition-patterns,tdd-workflow,design-taste-frontend}/` | Padrões que a revisão vai cobrar |
| `docs/fase-4-mesa-setup-battlestation.md` | Especificação narrativa da fase. **Atenção:** este arquivo tem uma modificação local não commitada. Não descarte, não faça `git checkout` nem `git stash` dele |
| `docs/adr/ADR-006-*.md`, `ADR-010-*.md`, `ADR-011-*.md` | Decisões já tomadas sobre sala virtual, cabeamento e 3D híbrido |
| `docs/design-system.md` | Tokens de cor, tipografia e tabela de sons |
| `src/engine/types.ts`, `phases.ts`, `assemblyState.ts`, `compatibility.ts` (`evaluatePostTest`) | Estado físico da montagem e o POST |
| `src/engine/cabling.ts` + `src/engine/__tests__/cabling.test.ts` | **Padrão a seguir** para o cabeamento externo (tipos, `validate*`, `prune*`, flags) |
| `src/engine/peripheralsCatalog.ts`, `roomThemes.ts`, `models3d.ts`, `models3d.data.json`, `models3dIndex.ts` | Catálogo de periféricos já existente e o mapeamento catálogo → modelo GLB |
| `src/store/useAssemblyStore.ts` (as 917 linhas) | Onde o estado da mesa será integrado; veja `rejectAction`, `syncCables`, `triggerPostBoot`, `togglePsuSwitch`, `resetAssembly`, `calculateFinalScore` |
| `src/engine/audio/soundEngine.ts` | API de sons existente (`playSlotClick`, `playPowerSwitch`, `playFanSpinUp`, `playBiosBeep(true)` = 800 Hz/160 ms, `playErrorBuzz`, `playSuccessChime`) |
| `src/components/three/Workbench3D.tsx` | Padrões 3D já usados (`useGLTF`, `AutoNormalizedPart`, `CaseEnclosure`, `SmoothCameraController`, `Html` com âncoras `data-cable-target`) |
| `src/components/three/webglDetect.ts`, `ModelViewer.tsx` | Fallback sem WebGL, `dpr={[1, 1.5]}` e `frameloop="demand"` |
| `src/components/room/VirtualRoomModal.tsx` | Exportação PNG 1920x1080 em 2D e o selo atual |
| `src/components/os/AcademyOSDesktop.tsx`, `src/engine/benchmark.ts` | O sistema operacional simulado e a telemetria |
| `src/app/page.tsx`, `src/components/hud/TopHUD.tsx`, `src/components/workbench/WorkbenchMat.tsx` | Pontos de entrada da UI e como o 3D é carregado com `next/dynamic` + `ssr: false` |
| `e2e/*.spec.ts`, `playwright.config.ts`, `vitest.config.ts` | Convenções de teste |

Depois da leitura, **antes de codar**, escreva em `docs/adr/ADR-012-mesa-battlestation-e-cabeamento-externo.md` um ADR curto (Contexto / Decisão / Consequências, mesmo formato dos outros ADRs) registrando as decisões da Seção 3 deste prompt e qualquer decisão adicional que você precisar tomar.

---

## 2. Fatos do código atual que você precisa respeitar

Estes fatos foram verificados no repositório. Não os contradiga sem verificar de novo:

- **"Fase 4" aqui é uma fase do roadmap do produto**, não um valor de `AssemblyPhase`. O enum `AssemblyPhase` já tem `PHASE_1_PREPARATION` … `PHASE_7_BOOT_POST` (e `PHASE_4_MOTHERBOARD_INSTALL` já existe e significa outra coisa). **Não renomeie nem reutilize esses valores.** A mesa ganha sua própria máquina de estados (`DeskStage`, Seção 3.2).
- Já existe um catálogo de periféricos (`MONITORS`, `KEYBOARDS`, `MICE`, `MONITOR_STANDS`, `AUDIO_DEVICES`, `GAMEPADS`, `CASE_THEMES`) e o estado `studentSetup: StudentSetupConfig` no store, usado pela Sala Virtual 2D. **Não crie um catálogo paralelo.** Estenda o existente. Faltam as categorias `DESK`, `CHAIR` e `MOUSEPAD`: crie-as no mesmo arquivo, com o mesmo formato `PeripheralItem`.
- O mapeamento item do catálogo → arquivo `.glb` já existe via `findModel3D(catalogId)` usando o campo `targets` de `models3d.data.json`. Todo item novo (mesa, cadeira, mousepad) e todo item que vá para a mesa precisa de um `target` válido no JSON. O comentário em `models3d.ts` diz que o JSON é gerado a partir de `docs/modelos-3d.md`: mantenha os dois coerentes e rode `src/engine/__tests__/models3d.test.ts`.
- Modelos GLB disponíveis em `public/models/` (não baixe outros): `mesa-gamer`, `cadeira-escritorio`, `case-corsair-4000d`, `case-compacto`, `case-nzxt-h500`, `monitor-24-office`, `monitor-27-gamer`, `monitor-ultrawide`, `monitor-curvo-gamer`, `suporte-articulado`, `mousepad-gamer`, `teclado-mecanico`, `teclado-mecanico-custom`, `teclado-membrana`, `mouse-gamer`, `headphone-estudio`, `headphone-bluetooth`, entre outros. Orçamento por modelo: `MAX_MODEL_FACES = 30000`.
- O PC só é considerado montado quando `derivePhase(assembly, selectedMotherboard) === 'PHASE_7_BOOT_POST'`. O POST é avaliado por `evaluatePostTest(assembly, mb)`. **Reutilize os dois**; não reimplemente a regra de "PC pronto".
- `GpuComponent` não tem campo de saídas de vídeo; `CpuComponent.hasIntegratedGpu` existe (CPUs "F" e Ryzen 5600 não têm vídeo integrado). A placa-mãe não tem campo de saída de vídeo: assuma que **toda placa-mãe do catálogo tem uma saída HDMI traseira** (registre isso no ADR) e que ela só entrega imagem se a CPU tiver vídeo integrado.
- Não existe nenhuma persistência em `localStorage` hoje em `src/`. **Não** adicione `persist` do Zustand ao store inteiro nesta fase (fora de escopo, Seção 8).
- O selo atual da imagem exportada (`calculateFinalScore().hashValidation`) é `Math.random()`. Ele **não** é criptográfico. A Seção 3.6 define o selo real.
- Não existe configuração de ESLint no repo. `npm run lint` (`next lint`) vai abrir um assistente interativo e travar. **Não rode `npm run lint` e não crie configuração de ESLint.** O portão estático é `npx tsc --noEmit`.
- `playwright.config.ts` aponta para `http://localhost:3001` com `webServer.command = 'npm run dev'` (que sobe na 3000 por padrão) e `reuseExistingServer: true`. Descubra como os E2E existentes rodam hoje (provavelmente com um servidor já de pé na 3001, ou via `PLAYWRIGHT_BASE_URL`). Não altere essa configuração em silêncio: se precisar mudar, justifique no relatório.
- `page.tsx` expõe `window.useAssemblyStore` para os E2E. Os E2E atuais montam o PC via store com objetos digitados à mão, que nem batem com os tipos (ex.: `maxMemoryGb`, `pciSlots16x`). Para a Fase 4, crie o helper `e2e/helpers/assembleFullPc.ts`, que monta o PC via store **usando itens reais do catálogo** (exponha o catálogo em `window.__pcaCatalog` somente quando `process.env.NODE_ENV !== 'production'`, no mesmo `useEffect` de `page.tsx`).
- Os números de issue `#41` e `#42` **já foram usados** em commits anteriores deste repo (ver `git log`). Não cite `#41`–`#46` em commits a menos que você confirme com `gh issue list` que essas issues existem e são as desta fase. Se não existirem, use os títulos das issues sem número.

---

## 3. Decisões de design já tomadas (contrato — siga à risca)

O plano original tem ambiguidades e contradições. Elas estão resolvidas abaixo. Onde este prompt e o `docs/fase-4-*.md` divergirem, **este prompt vence** e você deve atualizar o documento para refletir o que foi implementado.

### 3.1 Snap points (nomes canônicos)

Use exatamente estes IDs. O documento `docs/fase-4-*.md` usa outros nomes (`DESK_SURFACE`, `PC_POSITION`, `MONITOR_CENTER`…): atualize o documento para estes.

```ts
export type DeskSnapPointId =
  | 'DESK_BASE' | 'PC_TOWER' | 'MONITOR_MAIN' | 'MONITOR_ARM'
  | 'MOUSEPAD' | 'KEYBOARD' | 'MOUSE' | 'HEADSET' | 'CHAIR';
```

| Snap point | Posição nominal `[x, y, z]` | Aceita | Obrigatório para o boot | Depende de |
| :-- | :-- | :-- | :-- | :-- |
| `DESK_BASE` | `[0, 0, 0]` | item `DESK` | sim | — |
| `CHAIR` | `[0, 0, 2.2]` | item `CHAIR` | não | — |
| `PC_TOWER` | `[2.8, 1.85, -0.4]` | o PC montado pelo aluno (não é item do catálogo) | sim | `DESK_BASE` + `derivePhase === 'PHASE_7_BOOT_POST'` |
| `MONITOR_ARM` | `[0, 1.85, -1.1]` | item `STAND` com id `stand-gas-arm` | só se `studentSetup.stand` for o braço | `DESK_BASE` |
| `MONITOR_MAIN` | `[0, 1.85, -0.8]` | item `MONITOR` | sim | `DESK_BASE`; e `MONITOR_ARM` ocupado se o stand escolhido for o braço a gás |
| `MOUSEPAD` | `[0.3, 1.86, 0.4]` | item `MOUSEPAD` | não | `DESK_BASE` |
| `KEYBOARD` | `[-0.2, 1.88, 0.4]` | item `KEYBOARD` | sim | `DESK_BASE` (e `MOUSEPAD`, se houver mousepad no setup) |
| `MOUSE` | `[0.9, 1.88, 0.4]` | item `MOUSE` | sim | `DESK_BASE` (e `MOUSEPAD`, se houver mousepad no setup) |
| `HEADSET` | `[-2.6, 1.85, -0.4]` | item `AUDIO` que seja headset (não as caixas de som) | não | `DESK_BASE` |

- As posições são **nominais**. A escala real de `mesa-gamer.glb` é desconhecida. Meça o `Box3` do modelo carregado, normalize a mesa para que o tampo fique em `y ≈ 1.85` e calibre as posições. Mantenha as posições finais como **dados** em `src/engine/deskSetup.ts` (`DESK_SNAP_POINTS`), nunca espalhadas em JSX.
- **Remover um item do qual outros dependem** (ex.: tirar a mesa ou o mousepad) é recusado com mensagem didática, sem penalidade: o aluno deve tirar primeiro o que está em cima.
- Tentar colocar um item em um snap point de categoria errada é recusado com `playErrorBuzz`, tremor visual no holograma e penalidade (`penaltiesCount + 1`), seguindo o padrão `rejectAction` do store.

### 3.2 Máquina de estados da mesa (`DeskStage`)

Derivada por função pura, nunca guardada como estado mutável solto:

```ts
export type DeskStage =
  | 'LOCKED'          // PC ainda não está em PHASE_7_BOOT_POST
  | 'FURNISHING'      // faltam itens obrigatórios na mesa
  | 'CABLING'         // itens obrigatórios ok, faltam cabos externos obrigatórios
  | 'READY_TO_BOOT'   // tudo conectado; aguardando o botão Power
  | 'RUNNING';        // POST aprovado na mesa; telas ligadas

export function deriveDeskStage(input: DeskStageInput): DeskStage;
```

`DeskStageInput` contém, no mínimo: `assembly`, `selectedMotherboard`, `deskSetup` e um booleano `isDeskPoweredOn`. Teste todas as transições, incluindo as regressivas (ex.: em `RUNNING`, desconectar o cabo de força volta para `CABLING` e desliga as telas).

### 3.3 Cabeamento externo (`src/engine/externalCabling.ts`, arquivo separado de `cabling.ts`)

Siga o mesmo padrão de `cabling.ts` (specs como dados, `validate*`, `prune*`, mensagens didáticas). Escopo:

| Cabo | Origem | Destino correto | Destinos possíveis fisicamente | Obrigatório |
| :-- | :-- | :-- | :-- | :-- |
| `POWER_AC` | `WALL_OUTLET` | `PSU_INLET` | `PSU_INLET` | sim |
| `DISPLAY` | `MONITOR` | `GPU_DISPLAYPORT` se houver GPU dedicada; senão `MB_HDMI` | `GPU_DISPLAYPORT`, `MB_HDMI` | sim |
| `USB_KEYBOARD` | `KEYBOARD` | `MB_REAR_USB_1` ou `MB_REAR_USB_2` | portas USB traseiras | sim |
| `USB_MOUSE` | `MOUSE` | `MB_REAR_USB_1` ou `MB_REAR_USB_2` | portas USB traseiras | sim |
| `AUDIO_JACK` | `HEADSET` | `MB_AUDIO_OUT` | `MB_AUDIO_OUT` | só se houver headset com fio na mesa |

Regras (cada uma com teste unitário próprio):

1. **Formato físico:** um conector que não cabe na porta (USB em DisplayPort, AC na USB…) é recusado com `playErrorBuzz`, tremor e penalidade.
2. **Exclusividade:** uma porta aceita um cabo só. Teclado e mouse não podem dividir a mesma USB.
3. **Disponibilidade:** `GPU_DISPLAYPORT` só existe se `assembly.gpuInstalled !== null`. Um cabo de periférico só pode ser conectado se o periférico estiver na mesa. `POWER_AC` e todas as portas traseiras exigem `PC_TOWER` ocupado.
4. **O erro clássico da GPU (regra pedagógica central):** com GPU dedicada instalada, plugar `DISPLAY` em `MB_HDMI` **é aceito fisicamente** (no mundo real cabe), mas marcado como incorreto. O aluno recebe na hora o aviso didático, sem penalidade:
   > *"Atenção! Você possui uma placa de vídeo dedicada instalada. O cabo de vídeo do monitor deve ser conectado diretamente nas saídas traseiras da GPU, e não na placa-mãe!"*

   Se o aluno ligar o PC mesmo assim, o PC liga (ventoinhas, LEDs, bip), **mas o monitor mostra "SEM SINAL"**. É o comportamento real e a lição que fica. Regras exatas do botão Power, sem exceções:
   - **Habilitado** quando `DeskStage` for `CABLING` ou `READY_TO_BOOT` **e** `POWER_AC` estiver em `PSU_INLET`. Ligar sem `POWER_AC` é impossível: o botão fica desabilitado com o motivo legível "Sem energia: conecte o cabo de força na fonte e na tomada".
   - Ligar com `DISPLAY` ausente ou incorreto → PC liga, tela `NO_SIGNAL`, aviso didático, `isDeskPoweredOn = true`, e `deriveDeskStage` continua em `CABLING` (**nunca** `RUNNING`).
   - Ligar com vídeo correto mas USB de teclado/mouse faltando → AcademyOS aparece na tela, com aviso "Teclado/mouse não detectado"; o estágio continua `CABLING`.
   - `RUNNING` exige: `isDeskPoweredOn` + POST aprovado + **todos** os cabos obrigatórios corretos. `READY_TO_BOOT` exige tudo isso, menos estar ligado.
   - Corrigir um cabo com o PC ligado atualiza a tela na hora (hot-plug), sem precisar religar.
5. **Sem GPU dedicada e CPU com vídeo integrado:** `MB_HDMI` é o destino correto. Sem GPU e sem vídeo integrado não acontece, porque `derivePhase` já bloqueia antes.
6. **Poda (`pruneExternalCables`)**: remover um item da mesa solta os cabos ligados a ele; remover a GPU na bancada solta o `DISPLAY` que estava em `GPU_DISPLAYPORT`; voltar o PC para uma fase anterior a `PHASE_7_BOOT_POST` libera `PC_TOWER` e solta todos os cabos externos. Teste de integração no store cobrindo os três casos.
7. **Chave da fonte:** o boot na mesa também exige `assembly.psuSwitchOn` (reaproveite `togglePsuSwitch`). Se estiver desligada, mensagem didática e nenhuma penalidade.

O monitor é considerado ligado ao filtro de linha automaticamente (não há cabo de força do monitor). Registre essa simplificação no ADR.

### 3.4 Store (`useAssemblyStore`)

- Estado novo: `deskSetup: DeskSetupState` (`placedDeskItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>`, `externalCables: Record<ExternalCableId, ExternalPortId | null>`), `isDeskPoweredOn: boolean`, `selectedDeskItemForPlacement: PeripheralItem | null`, `isDeskSetupOpen: boolean`.
- Ações: `openDeskSetup`, `closeDeskSetup`, `selectDeskItemForPlacement`, `placeDeskItem(snapPointId, item)`, `placePcTower()`, `removeDeskItem(snapPointId)`, `connectExternalCable(cableId, portId)`, `disconnectExternalCable(cableId)`, `pressDeskPowerButton()`, `resetDesk()`.
- **As ações do store são finas**: elas chamam funções puras do engine, aplicam o resultado, tocam o som e mostram o alerta. Nenhuma regra de negócio dentro do store.
- `pressDeskPowerButton` **reutiliza** `evaluatePostTest`/o fluxo de `triggerPostBoot`. Extraia a parte comum para uma função interna em vez de duplicar a lógica.
- `resetAssembly` também chama `resetDesk`. Trocar `gameMode`, missão ou cenário de diagnóstico reseta a mesa.
- Selecione dados nos componentes com seletores estreitos + `useShallow` (como em `Workbench3D.tsx`), nunca `useAssemblyStore()` sem seletor nos componentes novos.
- `studentSetup` continua sendo a fonte da escolha do periférico. A mesa guarda **o que foi posicionado**; o catálogo guarda **o que foi escolhido**. Escolher outro monitor no menu enquanto um monitor já está na mesa troca o modelo na mesa e solta o cabo `DISPLAY` (o aluno precisa reconectar).

### 3.5 Cena 3D, UI e acessibilidade

- `src/components/three/DeskSetup3D.tsx`, carregado com `next/dynamic` + `ssr: false`, aberto por um botão "Levar para a Mesa" no `TopHUD`. O botão fica visível sempre e desabilitado com o motivo (`aria-describedby`) enquanto o `DeskStage` for `LOCKED`.
- Componha a cena com subcomponentes pequenos e memoizados (`RoomEnclosure`, `DeskFurnitureMesh`, `PlacedCaseMesh`, `PlacedMonitorMesh`, `PlacedPeripherals`, `DeskSnapHolograms`, `DeskCableCurves`, `DeskCameraController`). Siga `vercel-composition-patterns`.
- **Reuso, não cópia:** se precisar de `AutoNormalizedPart`, `CaseEnclosure` ou do controlador de câmera de `Workbench3D.tsx`, extraia para um módulo compartilhado em `src/components/three/shared/` e faça os dois arquivos importarem de lá. Rode os E2E de `workbench3d.spec.ts` depois da extração.
- **Torre do aluno:** o modelo do gabinete vem de `assembly.caseInstalled` (via `findModel3D`, com fallback para `case-corsair-4000d.glb` marcado como ilustrativo). `studentSetup.caseTheme` não define o modelo 3D, no máximo a cor dos LEDs. Mostre, através do vidro, ao menos placa-mãe, cooler e GPU escolhidos (modelos reais via `findModel3D`). Se isso estourar o orçamento de performance, simplifique e registre no relatório o que ficou de fora.
- **Câmera:** presets com estes nomes acessíveis exatos (os E2E vão procurá-los): `Visão Geral`, `Foco no Monitor`, `Foco na Torre`, `Topo`. `OrbitControls` com `enableDamping`, `maxPolarAngle` que impeça a câmera de passar abaixo do piso, `minDistance`/`maxDistance` e `target` limitado à área da sala.
- **Luz:** ambiente + preenchimento + **uma única** luz direcional com sombra (`shadow-mapSize` ≤ 1024) + faixa neon com cor de `ROOM_THEMES[selectedRoomTheme].primaryColor` (materiais emissivos ou `pointLight`; nada de `RectAreaLight` sem `RectAreaLightUniformsLib`).
- **Hologramas (`Html` do drei):** um por snap point. O holograma do item que está "na mão" (`selectedDeskItemForPlacement`) fica destacado em `tech-cyan`; os incompatíveis ficam esmaecidos. Cada holograma é um `<button>` real com `aria-label` ("Posicionar Teclado Mecânico Redragon Kumara no ponto Teclado"), `data-snap-point="<ID>"`, área mínima de 44x44 px e foco visível.
- **Encaixe com "juice":** atração magnética quando o item se aproxima do ponto, mola (*spring*) ao assentar, tremor no erro. Tudo respeitando `prefers-reduced-motion` (o `MotionConfig reducedMotion="user"` já existe para o DOM; no 3D, leia a media query e desligue as animações de mola/tremor, mantendo o feedback de cor e texto).
- **Remoção:** clique direito no item (com `preventDefault` do menu de contexto) **e** botão "Remover" no painel lateral **e** tecla `Delete` com o item focado. As três vias chamam a mesma ação.
- **Painel lateral da mesa (`DeskSetupSidebar`)**: lista todos os snap points com status (vazio / ocupado / bloqueado e o motivo), os itens escolhidos em `studentSetup` e a bandeja de cabos externos (`ExternalCableTray`). **Todo o fluxo (posicionar, cabear, ligar, remover) precisa poder ser concluído só com o painel, por teclado, sem tocar no canvas.** É a equivalência acessível exigida pelo `frontend-a11y`.
- **Cabos 3D:** `THREE.CatmullRomCurve3` (o plano original escreveu `CatmullRomCurve3D`, que não existe) + `TubeGeometry`, com pontos de controle que fazem o cabo cair por trás da mesa. Cabo incorreto em `amber`, correto em `emerald`. Geometria recriada só quando a conexão muda (`useMemo`), nunca a cada frame. Faça o `dispose` das geometrias substituídas.
- **Multimodal:** todo som novo tem equivalente visual (LED, cor) **e** texto em uma região `aria-live="polite"` (erros em `assertive`). Sons novos em `soundEngine.ts`: `playPeripheralPlace()` (clique abafado de borracha/plástico) e `playCablePlug()` (encaixe de conector), ambos procedurais, sem arquivos de áudio.
- **Sem WebGL** (`isWebGLAvailable() === false`): mostre o painel lateral funcional (que já cobre o fluxo inteiro) com uma mensagem e um atalho para a Sala Virtual 2D existente.
- Resoluções-alvo: 1366x768 até 1920x1080. Nada pode ficar cortado ou exigir rolagem horizontal em 1366x768.

### 3.6 Telas vivas e AcademyOS no monitor

- A tela é um `THREE.CanvasTexture` sobre um plano calibrado na face do display de cada modelo de monitor. Inspecione os GLB (`npx gltf-transform inspect public/models/monitor-27-gamer.glb`) para ver se existe uma malha separada de tela. Se não existir, use um plano sobreposto com retângulo de tela calibrado **por modelo** (dados em uma tabela `MONITOR_SCREEN_RECTS`, não números mágicos no JSX). O ultrawide tem proporção 21:9: a textura precisa respeitar isso.
- Estados da tela: desligado (preto fosco, LED de standby `amber`), POST (logo/chipset da placa-mãe por ~1,5 s), AcademyOS (papel de parede, barra de tarefas, relógio, ícones de CyberRacer Benchmark e telemetria com números reais de `calculateBenchmark`), `SEM SINAL` (vídeo no lugar errado) e erro de POST (3 bips + mensagem). LED muda para `tech-cyan` quando ligado.
- O AcademyOS é DOM e não dá para "renderizar o React dentro da textura". Desenhe uma **versão 2D em canvas** da área de trabalho (funções puras de desenho em `src/components/three/screen/drawAcademyOSScreen.ts`). O "zoom macro para usar em tela cheia" = animação de câmera até o monitor seguida de `openAcademyOS()` (o modal existente).
- Performance: canvas de no máximo 1024 px na maior dimensão, `texture.needsUpdate = true` **só quando o conteúdo muda** (troca de estado ou relógio, no máximo 1 vez por segundo). Nada de redesenho em `useFrame`.
- Sincronia: o bip de 800 Hz (`playBiosBeep(true)`), a rampa das ventoinhas (`playFanSpinUp`), o LED e a troca para o logo da BIOS acontecem no mesmo instante (mesma ação do store disparando o mesmo estado). Teste unitário da sequência de estados da tela como função pura de `(deskStage, postResult, videoCorrect, elapsedMs)`.

### 3.7 Foto oficial da Battlestation (selo)

O plano pede "foto oficial em Full HD com selo criptográfico" no E2E, mas nenhuma issue implementa a função. Implemente como parte da issue de telas vivas:

- Botão "Exportar Foto da Battlestation" na cena da mesa, habilitado em `RUNNING`.
- Renderize a cena em 1920x1080 sem depender de `preserveDrawingBuffer` global: renderize sob demanda e leia o canvas no mesmo tick (ou use `WebGLRenderTarget` + `readPixels`). Componha o selo em um canvas 2D e baixe como PNG.
- Selo = **SHA-256** (`crypto.subtle.digest`) de um JSON canônico (chaves ordenadas) com: nome da equipe, ids das peças da montagem, itens da mesa por snap point, cabos externos, pontuação e data ISO. Mostre os 12 primeiros caracteres hex. A função `buildBattlestationSealPayload` (pura, no engine) e `computeSealHash` (async) têm testes: mesma entrada → mesmo hash; qualquer campo alterado → hash diferente.
- Não chame isso de "assinatura" na UI. É uma **impressão digital de integridade** ("Código de verificação"), não prova de autoria. Não mexa no `hashValidation` aleatório da Sala Virtual 2D, a menos que você o substitua pelo mesmo mecanismo. Nesse caso, avise no relatório.

---

## 4. Restrições de arquitetura e qualidade

- `src/engine/` é **TypeScript puro**: zero imports de `react`, `three`, `@react-three/*`, `zustand`, `next`, DOM ou `window`. Adicione um teste que lê os arquivos novos do engine e falha se aparecer algum desses imports.
- TypeScript estrito: sem `any`, sem `as unknown as`, sem `@ts-ignore`/`@ts-expect-error` no código novo. Tipos de união discriminada para itens e cabos.
- Funções puras retornam objetos de resultado no formato do repo (`{ success, message, ... }` como `CableResult`), nunca lançam exceção para fluxo de jogo.
- Nada de `Math.random()` em lógica de jogo ou selo. Nada de `Date.now()` dentro do engine: receba o tempo como parâmetro.
- Componentes 3D: `useGLTF.preload` dos modelos da mesa ao abrir a cena; `scene.clone()` quando o mesmo GLB puder aparecer duas vezes; `dispose` de geometrias, materiais e texturas criados manualmente; `dpr={[1, 1.5]}`; prefira `frameloop="demand"` com `invalidate()` nas mudanças (o `OrbitControls` do drei já invalida). Se precisar de `"always"` em algum momento (animação de boot), volte para `"demand"` depois.
- Orçamento de performance da cena da mesa, medido em 1366x768 com `gl.info.render` (exiba isso em um overlay só em desenvolvimento, atrás de `?debug3d=1`): **≤ 150 draw calls**, **≤ 200 mil triângulos**, uma única sombra dinâmica. Meça no Chrome com aceleração de hardware e registre os números e o FPS observado no relatório. **Não** coloque asserção de FPS no Playwright (o CI usa SwiftShader).
- Textos de UI em português, tom didático do `design-system.md`, estética Cyber-Industrial (sem gradiente arco-íris, sem visual infantil), tipografia mono para specs.
- Não refatore código fora do escopo. A única refatoração permitida é a extração de partes de `Workbench3D.tsx` para `shared/` (Seção 3.5).

---

## 5. Ordem de execução (uma issue por vez, TDD)

Crie a branch `feat/fase-4-battlestation` a partir de `main`. Para cada issue: **(a)** escreva os testes e rode para vê-los falhar, **(b)** implemente, **(c)** rode `npx vitest run` e `npx tsc --noEmit` até zerar, **(d)** commit em português no padrão do histórico (`feat(engine): …`, `feat(3d): …`, `test(e2e): …`), terminando com a linha `Co-Authored-By` que você usa para sua autoria. Não faça `push` nem abra PR.

1. **Engine da mesa:** `src/engine/deskSetup.ts` + catálogo (`DESK`, `CHAIR`, `MOUSEPAD`) + `targets` em `models3d.data.json`/`docs/modelos-3d.md` + `deriveDeskStage` + `canPlaceOnDesk(snapPointId, item, deskState, context)` + `canRemoveFromDesk`. Testes em `src/engine/__tests__/deskSetup.test.ts`. Depois, integração no store com testes em `src/store/__tests__/useAssemblyStore.test.ts` (ou um arquivo novo `deskSetupStore.test.ts`).
2. **Cabeamento externo:** `src/engine/externalCabling.ts` + `src/engine/__tests__/externalCabling.test.ts` cobrindo as 7 regras da Seção 3.3, a regra da GPU em todas as combinações (GPU sim/não × CPU com/sem iGPU × destino GPU/MB) e a poda. Integração no store.
3. **Cena 3D base:** `DeskSetup3D` com sala, mesa, cadeira, luz, presets de câmera, ponto de entrada no `TopHUD`, fallback sem WebGL.
4. **Hologramas e posicionamento:** snap points interativos, torre do aluno, painel lateral acessível, remoção pelas três vias, sons e juice.
5. **Cabos 3D e bandeja de cabos externos:** curvas, cores, avisos didáticos, botão Power com motivo de desabilitado.
6. **Telas vivas + foto oficial:** CanvasTexture, sequência de boot sincronizada, `SEM SINAL`, zoom para o AcademyOS, exportação 1080p com selo SHA-256.
7. **E2E e cobertura:** `e2e/battlestationDeskSetup.spec.ts` + helper + `@vitest/coverage-v8` + script `"test:coverage"` com limite de 90% (linhas, funções e branches) para `src/engine/deskSetup.ts` e `src/engine/externalCabling.ts`.
8. **Documentação:** atualizar `docs/fase-4-mesa-setup-battlestation.md` (nomes canônicos, decisões, simplificações), finalizar o ADR-012, atualizar a contagem de testes do `README.md` e rodar `graphify . --code-only` (se o comando não existir na máquina, diga isso no relatório; não instale nada para isso).

### Casos que o E2E precisa cobrir (todos com seletores acessíveis ou `data-*`, sem `waitForTimeout`)

1. Botão "Levar para a Mesa" desabilitado com motivo antes de montar o PC; habilitado depois (montagem via helper).
2. Posicionar mesa, cadeira, monitor (com braço quando o stand for o braço a gás), mousepad, teclado, mouse e headset **pelo painel lateral via teclado** e pelo menos um item **clicando no holograma 3D**.
3. Tentar posicionar item no ponto errado → alerta + penalidade incrementada.
4. Posicionar a torre e verificar que o modelo do gabinete corresponde a `assembly.caseInstalled`.
5. Plugar `DISPLAY` em `MB_HDMI` com GPU instalada → aviso didático visível; ligar → texto "SEM SINAL" exposto também no DOM (região `aria-live` ou `data-screen-state="NO_SIGNAL"`); corrigir para `GPU_DISPLAYPORT` → ligar → `data-screen-state="ACADEMY_OS"`.
6. Botão Power desabilitado sem `POWER_AC`, com o motivo legível.
7. Presets de câmera `Visão Geral`, `Foco no Monitor`, `Foco na Torre`, `Topo` clicáveis.
8. Exportar foto → `page.waitForEvent('download')`, arquivo `.png`, dimensões 1920x1080 (leia o cabeçalho IHDR do PNG baixado) e código de verificação de 12 caracteres hex visível na UI.
9. Remover um item com dependentes → recusado com mensagem; remover na ordem certa → sucesso e cabos soltos.
10. Fluxo inteiro rodando em 1366x768, headless, sem estourar o timeout padrão de 30 s por teste.

---

## 6. Definição de pronto (Definition of Done)

Só considere a fase concluída quando **todos** os itens abaixo forem verdadeiros e você tiver a saída real dos comandos:

- [ ] `npx vitest run` → zero falhas; número total de testes maior que antes (anote o número de antes e o de depois).
- [ ] `npm run test:coverage` → ≥ 90% de linhas, funções e branches em `deskSetup.ts` e `externalCabling.ts`.
- [ ] `npx tsc --noEmit` → zero erros.
- [ ] `npm run build` → build de produção concluído; anote o tamanho do chunk da cena da mesa e confirme que ele **não** entra no bundle inicial da página (carregamento só por `dynamic`).
- [ ] `npx playwright test` → todos os specs (os antigos e o novo) passando em headless. Anote quantos passaram.
- [ ] Teste de pureza do engine passando.
- [ ] Nenhum `console.error` ou aviso de React/Three no console durante o fluxo E2E (capture `page.on('console')` no spec novo e falhe com erros).
- [ ] Orçamento de draw calls/triângulos medido e registrado.
- [ ] ADR-012, documento da fase e README atualizados.
- [ ] A modificação local pré-existente em `docs/fase-4-mesa-setup-battlestation.md` foi **incorporada** (não descartada) no seu commit de documentação.
- [ ] `git status` limpo na branch, exceto a pasta `docs/prompts/` (este prompt e o de revisão não são commitados).

---

## 7. Entrega final: prompt de revisão para o Claude (obrigatório)

Quando terminar tudo, **escreva um segundo prompt**, dirigido ao Claude (Claude Code, Opus), para que ele **avalie criticamente e corrija** tudo o que você fez. Salve em `docs/prompts/fase-4-revisao-claude.md` (não commite este arquivo) e também imprima o conteúdo integral na sua resposta final.

Esse prompt de revisão precisa ser autossuficiente e conter, nesta ordem:

1. **Contexto:** branch, hash do primeiro e do último commit da fase (`git log --oneline main..feat/fase-4-battlestation`), e um resumo de 5 a 10 linhas do que foi construído.
2. **Mapa de arquivos:** a lista completa de arquivos criados, modificados e removidos (`git diff --stat main...HEAD`), cada um com uma linha explicando o papel dele.
3. **Status por issue:** para cada uma das 8 etapas da Seção 5, use "Concluída", "Parcial" ou "Não feita", com a evidência (nome do teste, arquivo:linha, comando). Itens "Parcial" dizem exatamente o que falta.
4. **Saídas reais dos comandos** da Definição de Pronto (copie as linhas de resumo: número de testes, cobertura, erros do tsc, resultado do build, resultado do Playwright). Se algum comando não foi rodado ou falhou, diga isso claramente.
5. **Desvios deste prompt:** toda decisão em que você fez diferente do especificado nas Seções 3 e 4, com o motivo.
6. **Atalhos, dívidas e suspeitas:** onde você simplificou, onde não tem certeza se está certo, números de calibração "no olho", trechos que você acha frágeis, testes que você acha fracos. Seja específico (arquivo:linha). **Esta seção é a mais importante. Escondê-la é a pior falha possível.**
7. **O que não foi verificado manualmente** (ex.: FPS real em hardware escolar, leitor de tela, áudio audível).
8. **Instruções para o revisor**, pedindo explicitamente que o Claude:
   - leia o diff inteiro e não confie neste relatório;
   - rode de novo todos os comandos da Definição de Pronto e compare com os números relatados;
   - verifique as regras da Seção 3.3 (principalmente a regra da GPU e a poda) contra o código e os testes, procurando casos não cobertos;
   - procure violações da Seção 4 (imports proibidos no engine, `any`, lógica no store, re-render por seletor amplo, vazamento de geometria/textura, redesenho de textura por frame);
   - teste o fluxo completo só pelo teclado e com `prefers-reduced-motion`;
   - corrija diretamente o que estiver errado, com commits separados por tipo de correção, e no fim produza um relatório de revisão com os achados (severidade, arquivo:linha, correção aplicada ou motivo de não corrigir).
9. A especificação original (este prompt inteiro) referenciada pelo caminho `docs/prompts/fase-4-prompt-gemini.md`, para o revisor comparar o entregue com o pedido.

---

## 8. Fora de escopo nesta fase

Monitor secundário (`MONITOR_SECONDARY`), cabo de força do monitor, persistência da mesa em `localStorage`, microfone/webcam/stream deck/volante na mesa (os modelos existem, mas ficam para depois), multiplayer, mudanças na Sala Virtual 2D além do necessário para o selo, e qualquer backend. Se você achar que algum desses itens é indispensável, não implemente: registre como recomendação no relatório.
