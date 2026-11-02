# 🛠️ PC Builder Academy — Documentação de Engenharia e Design (v2.0)

Bem-vindo à documentação oficial do **PC Builder Academy**, a plataforma educativa, interativa e gamificada de montagem, diagnóstico de hardware, setup de periféricos e salas virtuais projetada para o **Ensino Médio**.

---

## 📚 Mapa da Documentação

| Documento | Descrição e Conteúdo |
| :--- | :--- |
| 📄 **[PRD v2.0 (Product Requirements Document)](./PRD.md)** | Visão geral pedagógica, montagem canônica, modo diagnóstico ("O que está quebrado?"), minigame zoom do painel frontal (`F_PANEL`), AcademyOS com benchmarks e gargalo (bottleneck), setup de periféricos e sala virtual do aluno com exportação de fotos. |
| 🎨 **[Design System v2.0](./design-system.md)** | Identidade visual (Cyber-Industrial & Clean Tech), design de periféricos, paletas de cores das salas virtuais (Gamer RGB, Escritório Minimalista, Laboratório Tech), áudio procedural e layout do selo de certificação em alta resolução. |
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

---

## 🚀 Fases de Implementação (Roadmap v2.0)

1. **Fase 1 (Concluída - MVP):** Bancada interativa com placa-mãe SVG, catálogo básico, áudio procedural, missões e BIOS.
2. **Fase 2:** Modo Diagnóstico ("O que está quebrado? / Detetive de Hardware").
3. **Fase 3:** Minigame com zoom nos 9 pinos do Painel Frontal (`F_PANEL`).
4. **Fase 4:** AcademyOS pós-boot com telemetria, gráficos e benchmark de jogos com cálculo de gargalo.
5. **Fase 5:** Customizador de Setup com periféricos (Monitores, Teclados, Mouses, Suportes).
6. **Fase 6:** Sala Virtual do Aluno e exportação de foto em alta definição (PNG).
7. **Fase 7:** Painel do Professor & Emissor de Certificados em PDF.
8. **Fase 8:** Deploy na Vercel e suporte a PWA instalável offline.
