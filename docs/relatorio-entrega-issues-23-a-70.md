# Relatório de entrega: issues #23 a #70

Branch `feat/issues-23-a-63`, empilhada sobre o PR #65, que por sua vez está sobre o #64. Ordem de merge:
**#64 → #65 → este PR**. Cada seção diz o que mudou e como conferir no jogo.

## Backlog e qualidade

| Issue | Entrega | Como conferir |
| :--- | :--- | :--- |
| #23 | Integração v2.1 já estava na `main`. Novo teste garante os campos das regras e ilustrações em toda peça do catálogo. README atualizado | `npm test` (catalog.test.ts) |
| #24 | `sw.js?v=<id do build>` (versão sem edição manual), atualização em espera com aviso "Nova versão disponível", navegação network-first, worker só em produção | Roteiro em [pwa-atualizacao.md](./pwa-atualizacao.md) |
| #26 | Pontuação pura (`src/engine/score.ts`): benchmark real contra a meta, desconto por gargalo, −250 por alerta de qualidade do POST, PC que não liga não ganha benchmark. Tabela no ADR-005 | Painel do professor → "Lançar Nota Atual" |
| #31 | Relógio isolado (`HudClock`); duas assinaturas inúteis do cronômetro removidas. Profiler: TopHUD de 29,3 ms para 0,9 ms em 10 s ociosos | [performance.md](./performance.md) |
| #32 | **Modo detetive:** bancada lacrada até a hipótese certa; hipótese errada −25%, ligar sem consertar −15%, dica −20% (piso 20%); chamados e relatos sorteados; casos novos de EPS solto e USB frontal; checklist e dica da fase escondidos | Modo **Diagnóstico** |
| #33 | ESLint 9 (Next + React Hooks) e CI (`tsc`, ESLint, Vitest, build, Playwright); arraste real no Playwright; teclado; projeto de 375 px. Os testes acharam e corrigiram: HUD que quebrava a página no celular e selo da placa que cobria o ATX_PWR | `.github/workflows/ci.yml` |
| #34 | **Relatório da turma:** erros classificados por tipo pedagógico, contagem dentro do código verificável (selado; códigos antigos seguem válidos), aba "Relatório da Turma" com erros mais comuns, tabela por equipe, **CSV** e habilidades do certificado ligadas à **BNCC Computação (EM13CO)** | Professor → Validar Hash → Relatório da Turma |

## 3D: encaixe, vista explodida e modo "Abrir o PC"

| Issue | Entrega | Como conferir |
| :--- | :--- | :--- |
| #59 | [ADR-013](./adr/ADR-013-modo-abrir-o-pc.md) e roadmap no PRD | — |
| #60 | `cutaway.ts`: pose pura por peça instalada, comandada por um único número de abertura; leituras (°C, W, RPM, gargalo) do benchmark; testes escritos antes | `npm test` (cutaway.test.ts) |
| #38 | Vista explodida na bancada (mesma pose), encaixe com mola das peças, hélices girando e LEDs EZ Debug 3D no POST; tudo desligado com movimento reduzido | Bancada 3D → **Vista Explodida** / Ligar o PC |
| #61 | **Abrir o PC** (só depois do POST; antes explica o que falta): um botão por subsistema, isolamento ao centro, callout e painel com leituras; vista esquemática no modo 2D; sair devolve as peças no lugar | Ligar o PC → **Abrir o PC** |
| #62 | Tour: 25 s sem mexer percorre térmico → energia → memória → vídeo → armazenamento com legenda; qualquer entrada devolve o controle; "Pular tour" e "Ver de novo" | Abrir o PC e esperar 25 s |
| #63 | Níveis de qualidade pelo renderer do WebGL (leve: pixel ratio 1, sombras 512 px, sem antialias); escolha salva no progresso | Bancada 3D → **Qualidade** |

## Modo Orçamento (#66–#70)
Detalhado em [relatorio-modo-orcamento.md](./relatorio-modo-orcamento.md).

## Correções encontradas pelos testes de fluxo completo
* Não havia como parafusar a placa de vídeo; o PC ficava preso na fase 5 e não ia para a mesa.
* O checklist chegava a 100% com o PC bloqueado. Agora ele vem do motor e é coerente com as fases.
* A bancada 3D não tinha os conectores SYS_FAN, USB3, USB2, HD_AUDIO e SATA nem a alavanca do soquete.
* A bomba do water cooler era desenhada fora do tamanho real.
* A BIOS dizia "ESC / FECHAR", mas a tecla Esc não fechava.
* A rolagem das categorias do inventário não funcionava com a roda do mouse.

## Testes de fluxo completo (Playwright)
* `fullAssemblyPhysics.spec.ts`: dois PCs (AMD/ar/DDR4/M.2 e Intel/water cooler/DDR5/SATA) montados só
  pela interface, com encaixes impossíveis recusados. As caixas da cena 3D são comparadas com o motor.
  POST verde e PC na mesa; o PC é recusado enquanto a GPU não está parafusada.
* `fluxoCompletoOrcamento.spec.ts`: do Desafio de Orçamento até o PC na mesa, montando a melhor build
  possível e recebendo 10.000 pontos.
* `openThePc.spec.ts`, `diagnosticDetective.spec.ts`, `teacherReport.spec.ts`, `dragAndDrop.spec.ts`
  (inclui 375 px), mais os testes já existentes da mesa, da campanha e da bancada.

## Pendências e limites
* **Merges e fechamento de issues:** a regra de segurança do ambiente bloqueou o merge dos PRs e o
  fechamento de issues. O PR traz "Closes #…" para fechar tudo ao mergear.
* **ESLint:** configurado e no CI, mas não rodado localmente (regra do projeto: não rodar
  `npm run lint`). O primeiro CI pode apontar avisos do código legado.
* **60 FPS em vídeo integrado:** precisa de medição no hardware da escola. O roteiro está em
  [performance.md](./performance.md).
* **BNCC:** o alinhamento das habilidades é uma proposta para a coordenação validar.
* **Modo Professor com servidor (#71–#81):** depende de recursos e credenciais da Vercel/Neon.
* As posições 3D dos conectores novos (SYS_FAN, USB, HD_AUDIO, SATA) são aproximadas, porque os
  modelos das placas não têm esses conectores desenhados.
