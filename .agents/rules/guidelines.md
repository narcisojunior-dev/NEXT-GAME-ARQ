# Diretrizes de Desenvolvimento — PC Builder Academy

Este projeto é desenvolvido seguindo o ecossistema integrado de **Skills e Agentes Especialistas** instalados no repositório (`.agents/skills/` e `.agents/agents/`).

---

## 1. Agentes Especialistas do Projeto (`.agents/agents/`)

| Agente | Origem | Atribuição Principal no Projeto |
| :--- | :--- | :--- |
| **`code-architect`** | `affaan-m/ECC` | Desenho da arquitetura limpa, separação rigorosa do motor de regras TypeScript puro (`src/engine/`) e máquina de estados da montagem. |
| **`react-reviewer`** | `affaan-m/ECC` | Auditoria de padrões React 19 / Next.js 15, prevenção de re-renderizações desnecessárias na bancada e memoização de cálculos. |
| **`a11y-architect`** | `affaan-m/ECC` | Garantia de acessibilidade universal (WCAG 2.2 AA), navegação completa por teclado, suporte a leitores de tela e legendas de áudio para alunos. |
| **`performance-optimizer`** | `affaan-m/ECC` | Garantia de taxa estável de 60 FPS na bancada, controle de consumo de memória e orçamento estrito de bundle JS em PCs escolares. |
| **`tdd-guide`** | `affaan-m/ECC` | Desenvolvimento orientado a testes (TDD) para o motor de compatibilidade física (soquetes, TDP, gerações de memória) e FSM de montagem. |

---

## 2. Skills de Design de Jogos e Direção de Arte

### A. Design Visual e Anti-Slop (`leonxlnx/taste-skill`)
* **`design-taste-frontend`:** Aplicação de direção de arte não-genérica. O design da bancada de montagem adota a estética **Cyber-Industrial & Clean Tech Laboratory** (estilo bancada de testes de engenharia com tapete antiestático escuro, linhas de grade sutis, iluminação de LEDs de hardware e tipografia técnica monospaçada de alta legibilidade). É terminantemente proibido o uso de templates genéricos infantis ou gradientes arco-íris amadores.

### B. Game Design e Dinâmica de Jogo (`gamedev-skills/awesome-gamedev-agent-skills`)
* **`game-feel` ("Juice"):** Cada ação de montagem deve ser tátil e gratificante:
  * Efeito de atração magnética quando a peça se aproxima do slot correto.
  * Animação elástica (*spring physics*) ao soltar.
  * Micro-vibração / tremor visual caso o aluno tente forçar uma peça incompatível.
* **`game-ui-ux`:** Estrutura ergonômica de jogo para salas de aula:
  * HUD com tempo restante, orçamento do cliente e status dos componentes.
  * Gaveta retrátil de inventário com cards informativos e categorizados.
  * Suporte prioritário para resoluções escolares padrão (1366x768 até 1080p).
* **`audio-design`:** Síntese procedural via Web Audio API com zero download de arquivos MP3:
  * Duplo clique mecânico de latches de RAM/PCIe.
  * Alavanca do soquete da CPU com tensão metálica.
  * O clássico bip de 800 Hz no teste de boot (POST) bem-sucedido.
* **`puzzle` & `save-systems`:** Lógica de quebra-cabeça de hardware com árvore de dependências (ordem correta) e persistência de conquistas e tempos no `localStorage`.

---

## 3. Skills de Engenharia e Frontend (`affaan-m/ECC` + `vercel-labs`)

| Skill | Aplicação Prática |
| :--- | :--- |
| **`make-interfaces-feel-better`** | Polimento de micro-interações, áreas de clique mínimas (44x44px), espaçamentos ergonômicos e estados de foco. |
| **`motion-foundations` / `motion-patterns`** | Animações fluidas de encaixe, gavetas deslizantes e popovers didáticos baseados em Framer Motion. |
| **`frontend-a11y`** | Modos alternativos para todas as ações: suporte simultâneo a **Drag & Drop** e **Click-to-Place** (para alunos com touchpads desgastados). |
| **`vercel-react-best-practices`** | Padrões de performance Next.js / React 19, evitando sobrecarga de render na bancada. |
| **`vercel-composition-patterns`** | Componentes compostos (`Workbench.Motherboard`, `Workbench.Slot`, `Workbench.ComponentCard`). |
| **`graphify`** | Grafo contínuo de dependências do código executado localmente via: `graphify . --code-only`. |

---

## 4. Fluxo de Trabalho e Mandamentos de Código

1. **Test-First para Compatibilidade:** Qualquer nova peça ou regra de compatibilidade (ex: soquete AM5 vs LGA1700, DDR4 vs DDR5) deve ter teste unitário correspondente antes da implementação na UI.
2. **Zero Dependência Externa de Áudio:** Efeitos sonoros são estritamente gerados por código via Web Audio API.
3. **Equivalência Multimodal:** Todo som possui representação visual correspondente (LEDs na placa-mãe e avisos de texto).
4. **Contexto Contínuo:** Manter o grafo de contexto atualizado com `graphify . --code-only`.
