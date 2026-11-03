# ADR-012: Mesa de Trabalho, Battlestation 3D e Cabeamento Externo

## Status
Aprovado (v4.0). Em implementação na Fase 4 do roadmap do produto.

## Contexto
Após o aluno concluir a montagem interna dos componentes na placa-mãe e encapsulá-la no gabinete (Fases 1 a 3), a experiência pedagógica necessita do passo culminante: **a montagem da estação de trabalho completa (Battlestation 3D)**.
Nas salas de aula e cursos técnicos de informática, erros graves e frequentes ocorrem justamente na conexão externa do computador:
1. **O erro clássico de vídeo:** plugar o cabo HDMI/DisplayPort na saída de vídeo da placa-mãe em vez das portas traseiras da GPU dedicada, resultando em tela preta ou "SEM SINAL".
2. **Esquecimento da chave da fonte ou cabo de força AC:** tentar ligar o equipamento sem alimentação elétrica correta.
3. **Periféricos sem comunicação:** tentar operar o sistema operacional sem teclado e mouse plugados nas portas USB traseiras.

Além disso, os modelos 3D de mobiliário (`mesa-gamer.glb`, `cadeira-escritorio.glb`) e periféricos já existiam no repositório, mas careciam de um motor de regras de fixação (*snap points*), máquina de estados e renderização de telas ativas.

## Decisão

### 1. Nomes Canônicos de Snap Points e Máquina de Estados da Mesa (`DeskStage`)
* Padronização estrita de identificadores de pontos de fixação:
  `DESK_BASE`, `PC_TOWER`, `MONITOR_MAIN`, `MONITOR_ARM`, `MOUSEPAD`, `KEYBOARD`, `MOUSE`, `HEADSET`, `CHAIR`.
* A mesa possui uma máquina de estados finita própria, derivada por função pura `deriveDeskStage(input)`:
  - `LOCKED`: Computador ainda não finalizou a montagem interna (`derivePhase !== 'PHASE_7_BOOT_POST'`).
  - `FURNISHING`: Faltam itens obrigatórios na mesa (mesa, monitor, teclado, mouse, torre).
  - `CABLING`: Mobiliário e periféricos posicionados, aguardando cabos externos obrigatórios.
  - `READY_TO_BOOT`: Todos os cabos e periféricos conectados corretamente; pronto para o botão Power.
  - `RUNNING`: Computador ligado, POST aprovado e telas ativas no AcademyOS.
* Transições regressivas suportadas (ex.: desconectar o cabo de força com o PC em `RUNNING` desliga as telas e regressa para `CABLING`).

### 2. Extensão do Catálogo Existente sem Duplicação
* Em vez de criar um catálogo paralelo, estendemos `src/engine/peripheralsCatalog.ts` com as categorias `DESK`, `CHAIR` e `MOUSEPAD`, mantendo a assinatura `PeripheralItem`.
* Os novos itens são mapeados para modelos GLB em `src/engine/models3d.data.json` e documentados em `docs/modelos-3d.md`.
* O PC montado pelo aluno na bancada (`assembly`) é utilizado diretamente no snap point `PC_TOWER`, preservando o modelo do gabinete escolhido (`caseInstalled`), cooler e GPU visíveis através do vidro temperado.

### 3. Módulo Dedicado de Cabeamento Externo (`src/engine/externalCabling.ts`)
* Separado de `cabling.ts` (que cuida exclusivamente do cabeamento interno da fonte/placa).
* Define 5 cabos externos: `POWER_AC`, `DISPLAY`, `USB_KEYBOARD`, `USB_MOUSE` e `AUDIO_JACK`.
* **Regra da GPU e Saída de Vídeo:**
  - Assume-se que toda placa-mãe do catálogo possui saída HDMI traseira, mas ela só gera imagem se o processador possuir gráficos integrados (`hasIntegratedGpu === true`).
  - Havendo GPU dedicada instalada (`gpuInstalled !== null`), conectar o cabo `DISPLAY` na placa-mãe é fisicamente aceito, porém pedagogicamente incorreto. O aluno recebe feedback didático imediato sem penalidade, e ao ligar o PC o monitor exibe "SEM SINAL".
* **Simplificação do Monitor:** O monitor é considerado pré-energizado pelo filtro de linha da bancada (não há cabo de força dedicado para o monitor na simulação física).
* **Poda Automática (`pruneExternalCables`):** Remover um periférico ou a torre da mesa desconecta automaticamente os cabos associados.

### 4. Equivalência Acessível Multimodal & Painel Lateral
* Painel lateral dedicado (`DeskSetupSidebar`) que permite executar 100% do fluxo (posicionamento, remoção por 3 vias, cabeamento e acendimento) exclusivamente via teclado e leitores de tela.
* Efeitos visuais e sonoros procedurais (`playPeripheralPlace`, `playCablePlug`) com suporte total a `prefers-reduced-motion`.
* Fallback sem WebGL (`isWebGLAvailable() === false`) preservando o painel funcional e atalho para a Sala Virtual 2D.

### 5. Telas Vivas com CanvasTexture e AcademyOS
* A tela do monitor 3D projeta uma textura dinâmica em canvas 2D (`drawAcademyOSScreen.ts`), acendendo no boot sincronizada com o bip de POST (800 Hz) e acelerando as ventoinhas.
* O aluno pode acionar zoom macro e abrir o AcademyOS interativo existente.

### 6. Selo de Battlestation Criptográfico (SHA-256)
* O selo na foto 1920x1080 exportada é calculado como o hash SHA-256 canônico (`crypto.subtle.digest`) da configuração do aluno, exibindo os 12 primeiros caracteres hexadecimais como impressão digital de integridade.

## Consequências
* O diretório `src/engine/` permanece estritamente TypeScript puro, sem acoplamento com React, Three.js ou Zustand.
* Cobertura de testes superior a 90% garantida por TDD em `deskSetup.ts` e `externalCabling.ts`.
* Respeito integral ao orçamento de performance (draw calls ≤ 150, triângulos ≤ 200k em 1366x768).

