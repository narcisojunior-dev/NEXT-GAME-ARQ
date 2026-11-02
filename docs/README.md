# 🛠️ PC Builder Academy — Documentação de Engenharia e Design (v2.1)

Bem-vindo à documentação oficial do **PC Builder Academy**, a plataforma educativa, interativa e gamificada de montagem, diagnóstico de hardware, setup de periféricos e salas virtuais projetada para o **Ensino Médio**.

---

## 📚 Mapa da Documentação

| Documento | Descrição e Conteúdo |
| :--- | :--- |
| 📄 **[PRD v2.1 (Product Requirements Document)](./PRD.md)** | Visão geral pedagógica, montagem canônica, modo diagnóstico ("O que está quebrado?"), minigame do painel frontal (`F_PANEL`), AcademyOS com benchmarks e gargalo (bottleneck), setup de periféricos e sala virtual. **v2.1:** regras de montagem revisadas, ilustrações por dados, cabeamento completo, roadmap 3D e backlog. |
| 🎨 **[Design System v2.0](./design-system.md)** | Identidade visual (Cyber-Industrial & Clean Tech), design de periféricos, paletas de cores das salas virtuais (Gamer RGB, Escritório Minimalista, Laboratório Tech), áudio procedural e layout do selo de certificação em alta resolução. |
| 🧊 **[Modelos 3D — Download e Créditos](./modelos-3d.md)** | 46 modelos do Sketchfab aprovados (licença CC BY/BY-SA, até 30 mil faces), peça do catálogo atendida por cada um, passo a passo de download e otimização e modelos rejeitados. |
| 🏛️ **[ADRs (Architecture Decision Records)](./adr/)** | Decisões técnicas fundamentadas para todo o ecossistema da aplicação. |

---

## 🏛️ Registros de Decisões de Arquitetura (ADRs)

* **[ADR-001: Seleção de Stack e Plataforma Web](./adr/ADR-001-stack-e-plataforma-web.md)** — Next.js 15+ App Router, React 19, TypeScript e Tailwind CSS.
* **[ADR-002: Motor de Interatividade, Estado e Animações](./adr/ADR-002-motor-de-interatividade-e-montagem.md)** — Zustand e Máquina de Estados Finita (FSM).
* **[ADR-003: Motor de Regras e Validação de Hardware](./adr/ADR-003-regras-de-hardware-e-validacao.md)** — Compatibilidade estrita de soquetes, memórias e cálculo de TDP.
* **[ADR-004: Sistema de Áudio Procedural](./adr/ADR-004-sistema-de-audio-e-feedback-multimodal.md)** — Síntese Web Audio API (zero megabytes de arquivos externos).
* **[ADR-005: Gamificação e Desafio em Grupos](./adr/ADR-005-gamificacao-e-desafio-em-grupos.md)** — Algoritmo de 10.000 pontos escolares.
* **[ADR-006: Setup Completo, Sala Virtual e Exportador de Imagem](./adr/ADR-006-setup-completo-e-sala-virtual.md)** — Camadas vetoriais de ambiente e renderização PNG 100% no cliente.
* **[ADR-007: Telemetria, Benchmark e Motor de Diagnóstico](./adr/ADR-007-telemetria-benchmark-e-diagnostico.md)** — Fórmulas matemáticas de FPS, medição de gargalo (*bottleneck*) e injeção de defeitos de assistência técnica.
* **[ADR-008: Fases Derivadas e Regras de Montagem](./adr/ADR-008-fases-derivadas-e-regras-de-montagem.md)** — Fase calculada a partir do estado (`derivePhase`), novas regras (cooler, armazenamento, gabinete, ESD, pasta, fonte × GPU) e política de penalidade. *(v2.1)*
* **[ADR-009: Ilustrações Orientadas por Dados](./adr/ADR-009-ilustracoes-orientadas-por-dados.md)** — Desenhos SVG a partir dos dados da peça, materiais compartilhados e selo de compatibilidade nos cards. *(v2.1)*
* **[ADR-010: Cabeamento e Arrastar e Soltar](./adr/ADR-010-cabeamento-e-arrastar-e-soltar.md)** — Modelo de cabos e conectores, Pointer Events com pointer capture, alvos `data-cable-target` e atração magnética. *(v2.1)*
* **[ADR-011: Visualização 3D Híbrida](./adr/ADR-011-visualizacao-3d-hibrida.md)** — three.js + React Three Fiber sob demanda, modelos CC-BY do Sketchfab otimizados e âncoras projetadas. *(proposto, v3.0)*

---

## 🚀 Fases de Implementação (Roadmap v2.0 - 100% Concluído ✅)

1. **Fase 1 (Concluída - MVP):** Bancada interativa com seleção de placa-mãe, catálogo de componentes, áudio procedural, missões e BIOS.
2. **Fase 2 (Concluída):** Modo Diagnóstico ("O que está quebrado? / Detetive de Hardware" com 6 cenários reais de assistência técnica).
3. **Fase 3 (Concluída):** Minigame com zoom 300% nos 9 pinos do Painel Frontal (`F_PANEL`) com regras estritas de polaridade.
4. **Fase 4 (Concluída):** AcademyOS pós-boot com telemetria de sensores, CyberRacer 3D benchmark e cálculo de gargalo (*bottleneck*).
5. **Fase 5 (Concluída):** Customizador de Setup com periféricos (Gabinete, Monitores, Teclados mecânicos, Mouses, Gamepad, Suportes).
6. **Fase 6 (Concluída):** Sala Virtual do Aluno com 4 ambientes e exportação de foto Full HD 1080p (PNG) com selo holográfico criptográfico.
7. **Fase 7 (Concluída):** Painel do Professor, Leaderboard projetável para HDMI e Emissor de Certificados A4 em PDF com validador de hash.
8. **Fase 8 (Concluída):** Suporte a PWA instalável offline via Service Worker (`sw.js`) e configuração Vercel (`vercel.json`).

### Roadmap v2.1 (revisão técnica e pedagógica)
9. **Fase 9 (Concluída):** Regras de montagem e conteúdo técnico corrigidos com TDD (#19).
10. **Fase 10 (Concluída):** Ilustrações orientadas por dados e selo de compatibilidade (#20).
11. **Fase 11 (Concluída):** Minigame F_PANEL com arrastar e soltar (#21).
12. **Fase 12 (Concluída):** Placa-mãe detalhada e cabeamento completo (#22).

### Roadmap v3.0 (visualização 3D)
13. **Fase 13:** Pipeline de ativos 3D CC-BY e créditos (#35).
14. **Fase 14:** Visualizador 3D das peças na ficha didática (#36).
15. **Fase 15:** Bancada 3D com âncoras projetadas (#37).
16. **Fase 16:** Animação de encaixe, vista explodida e ventoinhas no POST (#38).

Consulte o [README principal do projeto](../README.md) para detalhes completos de execução e arquitetura.

---

## 📋 Issues da v2.1 e v3.0

| Issue | Tipo | Título | Status |
| :--- | :--- | :--- | :--- |
| #19 | Regras | Pinagem F_PANEL e regras de compatibilidade com TDD | Implementada na branch, aguardando merge |
| #20 | Visual | Ilustrações orientadas por dados e selo de compatibilidade | Implementada na branch, aguardando merge |
| #21 | Interação | Minigame F_PANEL com arrastar e soltar | Implementada na branch, aguardando merge |
| #22 | Interação | Placa-mãe detalhada e cabeamento completo | Implementada na branch, aguardando merge |
| #39 | Documentação | PRD v2.1, ADR-008 a ADR-011 e roadmap 3D | Implementada na branch, aguardando merge |
| #23 | Integração | Integrar a branch v2.1 com a expansão do catálogo da `main` (#18) | Aberta — prioridade alta |
| #24 | Bug | Service worker serve HTML antigo após deploy | Aberta — prioridade alta |
| #25 | Bug | Kit de 2 pentes de RAM cobrado em dobro | Aberta — prioridade alta |
| #27 | Missões | Avaliação de entrega ao cliente | Aberta — prioridade alta |
| #28 | Acessibilidade | Zoom, movimento reduzido, mudo e `aria` | Aberta — prioridade alta |
| #26 | Pontuação | Pontuação baseada no benchmark | Aberta |
| #29 | Professor | Código de validação verificável e leaderboard persistente | Aberta |
| #30 | Progresso | Salvar progresso no `localStorage` | Aberta |
| #31 | Desempenho | Seletores do Zustand e relógio isolado | Aberta |
| #32 | Diagnóstico | Modo detetive com hipótese e casos sorteados | Aberta |
| #33 | Qualidade | ESLint e testes E2E do arrastar e soltar | Aberta |
| #34 | Professor | Relatório de erros da turma, CSV e BNCC | Aberta |
| #35 | 3D | Pipeline de ativos 3D (CC-BY, otimização, créditos) | Aberta — depende de #24 para o offline |
| #36 | 3D | Fase 1 — Visualizador 3D das peças | Aberta — depende de #35 |
| #37 | 3D | Fase 2 — Bancada 3D com âncoras projetadas | Aberta — depende de #36 |
| #38 | 3D | Fase 3 — Encaixe animado, vista explodida e ventoinhas | Aberta — depende de #37 |
