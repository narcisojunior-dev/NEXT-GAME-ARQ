# Relatório da feature: Modo Professor com servidor (turmas, login e ranking)

* **Épico:** #82 · **Issues:** #71 a #81
* **Branch:** `feat/modo-professor-servidor`
* **Especificação de origem:** `docs/modo-professor-turmas-ranking-orcamento.md` e ADR-014
* **Infraestrutura:** banco Neon `pcba-turmas` (plano gratuito) ligado ao projeto `next-game-arq` na Vercel
* **Data:** 2026-11-05

## 1. O que muda na sala de aula

1. O professor abre **/professor**, cria a conta com **usuário e senha** (sem e-mail) e anota o
   **código de recuperação**, que aparece uma única vez.
2. Cria a **turma** e recebe um código de 6 caracteres (ex.: `K7P2QX`) e o link `/t/K7P2QX`.
3. Cria a **atividade** da aula: missão da campanha, desafio em equipe, diagnóstico, **Desafio de
   Orçamento** (com prévia de viabilidade) ou oficina livre. Define tentativas, tempo limite, se vale
   o melhor ou o último envio e quem vê o ranking.
4. Os alunos clicam em **Entrar na turma** (ou abrem o link), digitam o código e um apelido
   ("Ana – Bancada 3") e apertam **Começar atividade**: a bancada abre a atividade certa.
5. O professor acompanha **ao vivo** (fase, % do checklist, gasto, penalidades e alerta "parado há
   3 min") e projeta o **telão** com o pódio.
6. Ao **Enviar resultado**, o servidor recalcula a pontuação oficial e devolve a posição ("Você está
   em 2º de 27").
7. Ao **encerrar**, o professor vê destaques, distribuição das notas, erros mais comuns, envios
   sinalizados para revisar e baixa o **CSV**.

O jogo continua funcionando sem turma e sem internet; o código `PCA-…` segue como plano B.

## 2. Arquitetura

```
src/engine/classroom/   tipos, código da turma, validações, reconstrução e pontuação do envio (puro)
src/server/             repositório (Neon e memória), autenticação, HTTP, resultados, handlers
src/app/api/v1/         23 rotas finas (runtime Node.js)
src/app/professor/      painel, turma, telão e relatório (rotas próprias, fora do bundle do jogo)
src/app/t/[codigo]/     atalho do link da turma
src/components/classroom/  entrada na turma e banner do aluno (baixados sob demanda)
db/migrations/          001_init.sql e 002_participant_name_ci.sql; npm run db:migrate
```

* **Repositório trocável:** `NeonRepository` (driver `@neondatabase/serverless`, SQL puro, sem ORM)
  em produção e `MemoryRepository` nos testes e no E2E. A escolha é automática: com `DATABASE_URL`
  usa o Neon; com `CLASSROOM_REPO=memory`, a memória.
* **Pontuação oficial no servidor:** o aluno envia só os ids das peças, as etapas da montagem e as
  métricas. O servidor reconstrói as peças pelo catálogo (preço e desempenho não podem ser forjados),
  recusa peça inventada ou montagem impossível e recalcula com o mesmo motor do jogo
  (`scoreBudgetSubmission`, `calculateGroupScore`, `evaluateMission`).
* **Plausibilidade:** tempo informado maior que o tempo desde a entrada na turma (+60 s) ou montagem
  completa em menos de 45 s marcam o envio como **sinalizado**: ele fica fora do ranking dos alunos
  até o professor validar.

## 3. Segurança e LGPD

| Item | Como ficou |
| :--- | :--- |
| Senha | `scrypt` com salt por usuário, comparação em tempo constante, mínimo de 8 caracteres |
| Recuperação | Código de 12 caracteres exibido uma vez, guardado só como hash; recuperar gera outro |
| Sessão | Cookie `pcba_session` = `id.expira.HMAC-SHA256` com `CLASSROOM_SECRET`; `HttpOnly`, `SameSite=Lax`, `Secure` em HTTPS, 12 h |
| CSRF | Mutações do painel exigem `Origin` igual ao host; o aluno usa token no cabeçalho, sem cookie |
| Aluno | Token aleatório de 128 bits; o banco guarda só o SHA-256 |
| Limites | Login, cadastro e recuperação: 5 a cada 15 min por usuário. Entrar: 10 por minuto por IP e código. Envio: 1 a cada 20 s. Progresso: 1 a cada 15 s |
| Permissão | Um professor nunca vê nem altera a turma de outro (responde como inexistente) |
| Dados do aluno | Só o apelido; a tela orienta "primeiro nome + bancada" e o filtro recusa links e palavrões |
| Exclusão | Excluir a turma apaga atividades, participantes e envios em cascata; remover participante apaga os envios dele |
| Retenção | Cron diário da Vercel (`/api/v1/cron/retention`, protegido por `CRON_SECRET`) apaga turmas arquivadas há mais de 12 meses |

## 4. Uso do plano gratuito

* `GET /state/:código` responde com `Cache-Control: public, s-maxage=10, stale-while-revalidate=20`:
  30 alunos consultando a cada 10 s geram ~1 execução por turma a cada 10 s; o resto vem da CDN.
* O aluno só escreve ao entrar, ao mudar de fase e ao enviar. O painel consulta a cada 5 s.
* Banner do aluno e painel param de consultar com a aba oculta.

## 5. Testes

| Tipo | Arquivo | O que garante |
| :--- | :--- | :--- |
| Unitário | `classroom.test.ts` (14) | Código da turma, usuário/senha/apelido, atividades (missões só da bancada, Modo Orçamento e perfil personalizado), progresso, envio, reconstrução pelo catálogo, peça desconhecida/errada/impossível, plausibilidade, referência = 10.000, missão, diagnóstico sorteado |
| Contrato | `repositoryContract.test.ts` (17) | A mesma suíte na memória e **no Neon real**: usuário único, código único, uma atividade ativa, apelido único sem diferenciar maiúsculas, tentativas numeradas, revisão, cascata, limite de tentativas e retenção (dados de teste apagados no fim) |
| API | `api.test.ts` (19) | Request reais: cadastro e cookie seguro, senha errada, limite de login, cookie adulterado, sessão expirada, recuperação, Origin, permissão entre professores, prévia e referência congelada, ciclo da atividade, entrar (código, apelido, entradas fechadas, limite por IP), estado em cache sem a referência, progresso, envio oficial e ranking, sinalizado e revisão, visibilidade "ao encerrar", tempo limite, relatório, CSV, ranking da turma, remoção, exclusão e cron |
| E2E | `modoProfessor.spec.ts` (2) | Professor + duas bancadas em navegadores separados: conta com código de recuperação, turma, Desafio de Orçamento com prévia, entrada pelo link e pelo HUD, apelido repetido recusado, envios 10.000 e 9.000, posição de cada aluno, ranking ao vivo, telão, encerrar, destaques, relatório, CSV e envio recusado após encerrar; painel exige login; turma inexistente explicada |

## 6. Decisões e desvios da especificação

* **Missões em turma:** só as que a bancada consegue avaliar. As da trilha Mesa e as que dependem de
  periféricos e cabos externos ficam para depois (o envio da turma traz só a bancada).
* **Diagnóstico em turma:** concluído quando o defeito do caso está corrigido e o PC liga; 3 estrelas
  sem penalidades, 2 com.
* **Penalidades × registro de erros:** a verificação "penalidades menores que os erros" da
  especificação não foi aplicada, porque o registro de erros do jogo inclui falhas de POST, que não
  são penalidades. Só o tempo é conferido.
* **QR code:** o telão mostra o código e o link `/t/CÓDIGO` em fonte grande; gerar QR exigiria uma
  dependência nova.
* **Remover participante** apaga o participante e os envios dele (a coluna `removed_at` fica para
  um "ocultar" futuro).

## 7. Pendências

* **Cadastrar `CLASSROOM_SECRET` e `CRON_SECRET` na Vercel.** Sem o primeiro, o login do professor
  não funciona em produção (o código recusa um segredo curto ou ausente). O ambiente desta sessão
  bloqueou gravar segredos, então isso fica com o professor.
* **Deploy de preview e verificação manual:** conferir `x-vercel-cache: HIT` na segunda chamada de
  `GET /api/v1/state/:código`, o banco real e o telão num projetor de 1366 × 768.
* **Medição de uso** nas primeiras semanas pelo painel de uso da Vercel (#80) e auditoria com leitor
  de tela real.
