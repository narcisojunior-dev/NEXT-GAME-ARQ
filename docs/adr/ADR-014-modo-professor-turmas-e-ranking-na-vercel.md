# ADR-014: Modo Professor, Turmas e Ranking na Vercel

## Status
Proposto (v5.0). Plano de implementação em [docs/modo-professor-turmas-ranking-orcamento.md](../modo-professor-turmas-ranking-orcamento.md).
Substitui o **Modo B** do [ADR-005](./ADR-005-gamificacao-e-desafio-em-grupos.md). O **Modo A** (código `PCA-…` digitado no painel local) continua valendo como plano B sem internet.

## Contexto
Hoje o painel do professor (`TeacherDashboardModal`) vive no navegador de uma única máquina: o professor digita os códigos `PCA-…` que cada bancada gera e o placar fica no `localStorage` daquele computador. Não existe turma, o professor não escolhe a atividade da sala e não há ranking compartilhado.

Requisitos novos:
1. O professor cria uma turma, recebe um código e decide **qual atividade** a turma faz (missão da campanha, desafio, diagnóstico ou o novo **Modo Orçamento**).
2. Os alunos entram com código e apelido, sem conta nem e-mail (premissa do ADR-005).
3. **Ranking e resultados** apontam as melhores pontuações da atividade e da turma.
4. **Custo zero.** O projeto é didático e sem fins lucrativos, então cabe no plano Hobby da Vercel, que permite só uso pessoal e não comercial.

Restrições do plano Hobby (documentação da Vercel, setembro de 2026): 1.000.000 de execuções de função, 4 h de CPU ativa e 100 GB de transferência por mês. As funções são serverless: não guardam disco nem memória entre requisições e não sustentam conexões longas de forma confiável.

## Decisão

### 1. Hospedagem: Vercel Hobby + Postgres gratuito (Neon pelo Marketplace da Vercel)
* O app continua sendo um único projeto Next.js. Painel, API (Route Handlers, runtime Node.js) e jogo ficam no mesmo deploy.
* Turmas, atividades, participantes e resultados ficam num **Postgres do Neon** no plano gratuito, ligado pelo Marketplace da Vercel, que preenche a variável `DATABASE_URL` sozinho. Driver: `@neondatabase/serverless`, sem ORM.
* **Supabase rejeitado como banco principal:** o plano gratuito pausa o projeto depois de uma semana sem uso, o que aconteceria em todas as férias escolares.

### 2. Sincronização: polling curto com cache na CDN, sem WebSocket
* O estado da turma (atividade ativa e configuração) sai de um GET público com `Cache-Control: public, s-maxage=10, stale-while-revalidate=20`. Com 30 alunos consultando a cada 10 s, a função roda ~1 vez a cada 10 s por turma; o resto é respondido pela CDN.
* O aluno só escreve no servidor quando algo acontece: entrar, mudar de fase (no máximo 1 vez a cada 15 s) e enviar o resultado.
* O painel do professor consulta a cada 5 s sem cache (é um cliente só).
* Estimativa por aula de 50 min com 30 alunos: ~1.300 execuções e ~30 s de CPU. Cabem várias centenas de aulas por mês no Hobby.
* **Tempo real gerenciado (Ably, Pusher, Supabase Realtime) rejeitado:** o aluno vê a troca de atividade em até ~30 s, o que basta em sala de aula, e um serviço a menos significa uma conta e um limite a menos.

### 3. Pontuação calculada pelo servidor
* A pontuação sai de uma função pura, `src/engine/scoring.ts`, usada no cliente (prévia) e no servidor (valor oficial).
* O cliente envia **só IDs do catálogo**, as etapas da montagem e as métricas da sessão (tempo, penalidades, erros, tentativas de POST). O servidor reconstrói as peças pelo catálogo, então preço e desempenho não podem ser adulterados. Ele recalcula gasto, benchmark, gargalo, objetivos e pontos.
* Tempo e penalidades só o cliente conhece. O servidor confere se são plausíveis (janela entre a entrada do aluno e o envio, tempo mínimo de montagem) e, se algo não fechar, marca o resultado como `FLAGGED` para o professor revisar, em vez de descartá-lo.

### 4. Identidade e segurança sem e-mail
* **Professor:** usuário + senha (hash `scrypt` do `node:crypto`) + **código de recuperação** exibido uma vez no cadastro. A sessão é um cookie `HttpOnly`, `Secure`, `SameSite=Lax`, assinado com HMAC (`CLASSROOM_SECRET`). Rotas que alteram dados conferem o cabeçalho `Origin`.
* **Aluno:** código da turma (6 caracteres sem 0/O/1/I/L) + apelido. Recebe um token aleatório de 128 bits; o banco guarda só o hash e o aluno manda o token no cabeçalho `Authorization` (sem cookie, logo sem CSRF).
* **Limite de tentativas** numa tabela do próprio Postgres (sem Redis) para login, entrada na turma e envio de resultado.
* **LGPD:** nenhum dado pessoal obrigatório do aluno, só apelido (recomendação: primeiro nome + bancada). O professor pode remover participantes e excluir a turma, com apagamento em cascata. Turmas arquivadas há mais de 12 meses são apagadas por rotina agendada.

### 5. Camadas trocáveis (Vercel hoje, LAN amanhã)
* `ClassroomRepository` (interface no servidor): `NeonRepository` em produção e `MemoryRepository` nos testes e no E2E. Um `SqliteRepository` para o modo LAN pode vir depois, sem mexer nas rotas.
* `ClassroomSync` (interface no cliente): `LocalOnlySync`, o comportamento atual, quando o aluno não entrou em turma, e `CloudSync` quando entrou. O jogo nunca depende da rede para funcionar.

### 6. Ranking
* O ranking da atividade usa o **melhor envio** de cada participante (política configurável: melhor ou último). Desempate: maior pontuação → **menos penalidades** → menor tempo → envio mais antigo. No Modo Orçamento, o menor gasto entra antes do tempo (ver o plano). Concluído sempre fica à frente de não concluído.
* O ranking da turma soma o melhor envio de cada atividade encerrada.
* **Destaques por categoria** (mais rápido, melhor custo-benefício, zero erros, melhor equilíbrio), para reconhecer mais alunos que só o pódio.
* Visibilidade definida pelo professor: `AO_VIVO`, `AO_ENCERRAR` ou `SO_PROFESSOR`. O aluno vê no máximo o top 10 e a própria posição, nunca a lista inteira com as últimas colocações.

## Alternativas consideradas e rejeitadas
* **Servidor na LAN da escola como única opção:** zero custo e sem internet, mas exige uma máquina ligada e configuração de rede em cada escola. Fica como modo futuro graças ao `ClassroomRepository`.
* **WebSocket/SSE na Vercel:** as funções serverless têm duração limitada e não compartilham memória entre instâncias.
* **Banco em arquivo (SQLite/JSON) na Vercel:** o sistema de arquivos é temporário.
* **Login do professor com Google/OAuth:** exige registrar um app e adiciona dependência. Usuário e senha bastam numa ferramenta escolar.

## Consequências
* **Positivas:** o professor só abre um link; não há instalação nas máquinas; custo zero; a pontuação oficial não pode ser forjada no navegador; o ranking sobrevive ao F5 e à troca de computador.
* **Negativas / mitigações:**
  * A troca de atividade chega com até ~30 s de atraso. O painel avisa: "os alunos recebem em até 30 s".
  * O banco gratuito "dorme" quando ninguém usa: a primeira requisição do dia leva ~1 s a mais.
  * O service worker atual serve como cache-first tudo o que não for navegação, **inclusive GETs de `/api`**. Ele precisa ignorar `/api/` antes de qualquer polling ir ao ar (issue P0 do plano).
  * Se um dia houver ganho financeiro, o plano Hobby deixa de valer e é preciso o Pro.
