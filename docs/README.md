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

## 🚀 Fases de Implementação (Roadmap v2.0 - 100% Concluído ✅)

1. **Fase 1 (Concluída - MVP):** Bancada interativa com seleção de placa-mãe, catálogo de componentes, áudio procedural, missões e BIOS.
2. **Fase 2 (Concluída):** Modo Diagnóstico ("O que está quebrado? / Detetive de Hardware" com 6 cenários reais de assistência técnica).
3. **Fase 3 (Concluída):** Minigame com zoom 300% nos 9 pinos do Painel Frontal (`F_PANEL`) com regras estritas de polaridade.
4. **Fase 4 (Concluída):** AcademyOS pós-boot com telemetria de sensores, CyberRacer 3D benchmark e cálculo de gargalo (*bottleneck*).
5. **Fase 5 (Concluída):** Customizador de Setup com periféricos (Gabinete, Monitores, Teclados mecânicos, Mouses, Gamepad, Suportes).
6. **Fase 6 (Concluída):** Sala Virtual do Aluno com 4 ambientes e exportação de foto Full HD 1080p (PNG) com selo holográfico criptográfico.
7. **Fase 7 (Concluída):** Painel do Professor, Leaderboard projetável para HDMI e Emissor de Certificados A4 em PDF com validador de hash.
8. **Fase 8 (Concluída):** Suporte a PWA instalável offline via Service Worker (`sw.js`) e configuração Vercel (`vercel.json`).

Consulte o [README principal do projeto](../README.md) para detalhes completos de execução e arquitetura.
