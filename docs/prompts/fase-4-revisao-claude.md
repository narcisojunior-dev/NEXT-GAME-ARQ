# PROMPT DE AUDITORIA, REVISÃO E CORREÇÃO GERAL — PC BUILDER ACADEMY
> **Destinatário:** Claude (Execução em máquina remota / ambiente limpo)  
> **Repositório:** `https://github.com/narcisojunior-dev/NEXT-GAME-ARQ.git`  
> **Branch Principal:** `main` (atualizada com todas as correções e motor da Fase 4)  
> **Stack:** Next.js 15.2 (App Router), React 19, TypeScript 5.8, Tailwind CSS 4, Three.js / @react-three/fiber, Zustand 5, Web Audio API, Vitest 3, Playwright 1.64.

---

## 1. Missão e Papel do Agente
Você está assumindo o papel de **Principal Code Architect & Reviewer** do projeto **PC Builder Academy**. Este repositório contém um simulador e jogo sério educacional de montagem, diagnóstico e cabeamento de computadores para salas de aula técnicas e gamers iniciantes.

Seu objetivo nesta sessão é **auditar, validar, testar a fundo e corrigir imediatamente** quaisquer inconsistências arquiteturais, bugs lógicos, falhas nos modelos 3D, gaps de testes ou desvios de regras pedagógicas presentes na branch `main`.

---

## 2. Visão Geral da Arquitetura e Mandamentos

### A. Separação Estrita de Camadas
1. **Motor Puro (`src/engine/`):**
   - É **100% puro TypeScript**.
   - **TERMINANTEMENTE PROIBIDO** importar React, hooks, componentes visuais, DOM, `window` ou Zustand dentro de `src/engine/`.
   - Contém regras físicas de hardware (`hardwareCatalog.ts`, `compatibility.ts`), testes de boot POST (`diagnosticCases.ts`), cabeamento interno da fonte (`cabling.ts`), regras da mesa e periféricos (`deskSetup.ts`, `peripheralsCatalog.ts`), cabeamento externo (`externalCabling.ts`) e síntese sonora procedural via Web Audio API (`audio/soundEngine.ts` com zero arquivos MP3 externos).
2. **Estado Global Centralizado (`src/store/useAssemblyStore.ts`):**
   - Implementado com **Zustand**.
   - Conecta a máquina de estados (FSM) de montagem na bancada e a FSM da mesa battlestation (`DeskStage`).
   - Mantém as regras de penalidades didáticas, orçamento e persistência.
3. **Componentes e Interface (`src/components/`):**
   - `workbench/`: Bancada 2D (SVG interativo de alta precisão com pinos táteis e circuitos) e menu lateral de seleção de peças.
   - `three/`: Bancada 3D interativa (`Workbench3D.tsx`) e Mesa Battlestation 3D (`DeskSetup3D.tsx`) com Three.js / R3F e modelos GLB otimizados em `public/models/`.
   - `hud/`: TopHUD (estatísticas, telemetria, cronômetro, seletor de visão Bancada vs Mesa 3D).

### B. Mandamentos do Repositório
- **PROIBIDO rodar `npm run lint`** (regra mandatória do projeto para evitar que linters sobrescrevam contratos de formatação).
- **PROIBIDO adicionar dependências de runtime externas** sem autorização explícita.
- **Zero tolerância a `any` ou `as unknown as`** em código novo.
- **Todos os efeitos sonoros são procedurais** gerados via Web Audio API com zero download de arquivos de áudio.

---

## 3. Estado Atual das Entregas e Últimas Correções na `main`

A branch `main` acabou de receber todas as seguintes funcionalidades e correções críticas:

### A. Calibração e Posicionamento Físico 3D da Placa-Mãe (`Workbench3D.tsx`)
- **Memória RAM na Vertical:** Os pentes de memória RAM (`ram-ddr4-crucial.glb`) agora estão orientados **estritamente na vertical** (`rotation={[0, Math.PI / 2, 0]}`) com escala de `3.3` unidades, assentando com perfeição de ponta a ponta nos slots DIMM.
- **Layouts Calibrados por Soquete (`MOTHERBOARD_LAYOUTS`):**
  - **AMD AM4 / AM5 (B550M / B650M):** Soquete centrado em `[-0.25, 0.22, -0.85]`, Slot 2 em `[1.65, 0.22, -1.10]` e Slot 4 em `[1.95, 0.22, -1.10]`.
  - **Intel LGA1700 (Z790 / B760M):** Soquete centrado em `[0.15, 0.22, -1.55]`, Slot 2 em `[1.95, 0.22, -1.55]` e Slot 4 em `[2.55, 0.22, -1.55]`.
- **Regra de Cooler e Pasta Térmica:** O cooler só pode ser assentado sobre o processador se a pasta térmica tiver sido aplicada previamente. Ao aplicar a pasta, uma gota metálica tridimensional surge no centro do IHS da CPU, e o cooler assenta exatamente sobre ela.
- **Persistência Bidirecional 2D ⇄ 3D:** Alternar entre a visão 2D (SVG) e a visão 3D (Three.js) mantém 100% dos componentes e cabos já instalados sem resetar a montagem.

### B. Fase 4: Mesa & Battlestation 3D (Motor e Base 3D Implementados)
- **Motor da Mesa (`src/engine/deskSetup.ts`):** 9 snap points canônicos (`DESK_BASE`, `PC_TOWER`, `MONITOR_MAIN`, `MONITOR_ARM`, `MOUSEPAD`, `KEYBOARD`, `MOUSE`, `HEADSET`, `CHAIR`), árvore de dependências físicas (monitor exige suporte, periféricos exigem mesa/mousepad) e FSM `DeskStage` (`LOCKED` → `FURNISHING` → `CABLING` → `READY_TO_BOOT` → `RUNNING`).
- **Motor de Cabeamento Externo (`src/engine/externalCabling.ts`):**
  - 7 cabos externos canônicos: Força do PC, Força do Monitor, Cabo de Vídeo (DisplayPort / HDMI), USB do Teclado, USB do Mouse, Cabo do Headset, Cabo de Rede RJ45.
  - Portas físicas mapeadas: `WALL_OUTLET`, `PC_AC_INLET`, `GPU_HDMI_1`, `MB_HDMI`, etc.
  - **Regra didática clássica da GPU:** Se o aluno tiver GPU dedicada instalada e ligar o cabo de vídeo na placa-mãe (`MB_HDMI` ou `MB_DP`), a conexão física é aceita, mas a validação retorna `isPedagogicallyValid: false`, `errorType: 'GPU_BYPASS_NO_SIGNAL'`, e a tela do monitor exibe `SEM SINAL`.
  - **Poda Automática de Cabos (`pruneExternalCables`):** Ao remover qualquer item da mesa, todos os cabos a ele conectados são desconectados imediatamente, impedindo cabos flutuando no vazio.
- **Cena 3D da Mesa (`DeskSetup3D.tsx`):**
  - Presets de câmera canônicos: `setup-wide`, `setup-top`, `setup-pc`, `setup-seat`.
  - Iluminação balanceada a 5500K com sombras suaves.
  - Alternância de visão no `TopHUD.tsx` e `WorkbenchMat.tsx` via `activeWorkbenchView: 'bench' | 'desk'`.

---

## 4. Roteiro de Auditoria e Correção que Você Deve Executar

Por favor, execute este roteiro passo a passo:

### Passo 1: Verificação Estática e de Tipos
Execute no terminal:
```bash
npx tsc --noEmit
```
- **Critério:** Zero erros de tipagem TypeScript. Se houver qualquer erro, corrija-o imediatamente sem recorrer a `any` ou type-casting inseguro.

### Passo 2: Execução da Suíte Completa de Testes
Execute no terminal:
```bash
npm run test
```
- **Critério:** Todos os 222 testes unitários em 19 arquivos devem passar com sucesso (`✓ 222 passed`).
- Verifique se os testes cobrem:
  - `deskSetup.test.ts` (regras e transições de estágio da mesa)
  - `externalCabling.test.ts` (regras dos 7 cabos externos, poda automática e regra da GPU)
  - `hardwareMatrix.test.ts` e `allCombinationsHardwarePeripherals.test.ts` (todas as combinações de hardware)

### Passo 3: Auditoria do Alinhamento 3D e Regras Visuais
Inspecione `src/components/three/Workbench3D.tsx`:
1. Verifique se `layout.RAM_SLOT_2` e `layout.RAM_SLOT_4` posicionam os pentes de memória exatamente dentro dos slots físicos tanto no layout `AMD_AM4_AM5` quanto no `INTEL_LGA1700`.
2. Verifique se os pentes de RAM mantêm `rotation={[0, Math.PI / 2, 0]}` e `targetSize={3.3}`.
3. Verifique se a aplicação da pasta térmica (`applyThermalPaste`) e do cooler (`installCooler`) respeitam a ordem didática correta (CPU → Pasta Térmica → Cooler).

### Passo 4: Auditoria do Cabeamento Externo e Mesa Battlestation
Inspecione `src/engine/deskSetup.ts` e `src/engine/externalCabling.ts`:
1. Verifique se a função `pruneExternalCables` é acionada em `removeDeskItem` no store (`useAssemblyStore.ts`).
2. Verifique se o cálculo de `deriveDeskStage` transiciona corretamente entre `LOCKED`, `FURNISHING`, `CABLING`, `READY_TO_BOOT` e `RUNNING`.
3. Verifique se o chaveamento entre a bancada e a mesa (`activeWorkbenchView`) no `TopHUD.tsx` e `WorkbenchMat.tsx` funciona sem quebrar o estado da montagem.

### Passo 5: Build de Produção
Execute no terminal:
```bash
npm run build
```
- **Critério:** O build do Next.js 15 deve compilar perfeitamente sem erros de empacotamento ou quebras de SSR/Dynamic Imports.

---

## 5. Formato Esperado do Seu Relatório Final
Ao concluir sua auditoria e correções, apresente:
1. **Resumo Executivo:** Estado geral do projeto e confiabilidade da arquitetura.
2. **Correções Efetuadas (se houver):** Arquivos modificados com diff explicativo do porquê cada ajuste foi necessário.
3. **Status dos Testes:** Confirmação da contagem final de testes executados e aprovados.
4. **Recomendações e Próximos Passos:** Apontamentos sobre as próximas etapas de desenvolvimento da Fase 4 (hologramas táteis de snap points, cabos externos 3D com CatmullRomCurve3, telas vivas no monitor com CanvasTexture do AcademyOS e exportação com selo SHA-256).

