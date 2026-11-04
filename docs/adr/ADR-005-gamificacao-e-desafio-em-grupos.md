# ADR-005: Gamificação, Desafio em Grupos e Dinâmica de Sala de Aula

## Status
Aprovado

## Contexto
O usuário especificou a necessidade de uma seção de **desafios competitivos entre grupos de alunos**, onde eles disputam:
1. Quem monta mais rápido (velocidade de execução e destreza).
2. Quem escolhe as melhores peças dentro de um orçamento restrito (otimização de custo x benefício e ausência de gargalos).
3. Quem comete menos erros pedagógicos (precisão técnica e segurança).

Em um ambiente de sala de aula de 50 minutos do Ensino Médio, o professor precisa de um fluxo ágil:
* Os grupos de alunos não devem precisar criar contas complexas com e-mail e senha (o que consome 20 minutos só no login e recuperação de senha).
* Deve ser possível gerar um código de sala ou tabela de liderança local compartilhada, ou exportar o relatório de pontuação em formato leve (QR Code ou código de resultado para o professor colar no painel).

## Decisão
1. **Identificação por Grupo Descomplicada:**
   * Na entrada do modo de desafio, o grupo apenas digita os nomes dos integrantes (ex: *"Bancada 03 - Lucas, Maria e Pedro"*). Nenhuma criação de conta ou e-mail é exigida.
2. **Algoritmo de Pontuação da Bancada (`BenchScore`):**
   A pontuação máxima por rodada é de **10.000 pontos**, calculada por:
   $$\text{Pontuação Final} = \text{Pontos de Precisão} + \text{Bônus de Orçamento} + \text{Bônus de Benchmark} + \text{Bônus de Velocidade} - \text{Penalidades}$$
   * **Precisão da Montagem (Máx 4.000 pts):** Concluir todas as etapas na ordem correta, sem forçar peças ou tentar ligar sem itens essenciais.
   * **Eficiência Orçamentária (Máx 2.500 pts):** Entregar o PC dentro do teto financeiro do cliente. Dinheiro economizado sem perder desempenho gera bônus proporcional.
   * **Equilíbrio e Benchmark Teórico (Máx 2.000 pts):** Ausência de "gargalo" (bottleneck). Exemplo: colocar uma placa de vídeo topo de linha com uma CPU fraca que gera 40% de gargalo penaliza essa pontuação.
   * **Tempo de Montagem (Máx 1.500 pts):** Decaimento progressivo de pontos a partir de um tempo padrão esperado (ex: meta de 5 minutos; conclusão em menos tempo gera bônus de agilidade).
   * **Penalidades por Danos/Erros Críticos (-500 pts por ocorrência):** Esquecer pasta térmica, esquecer espaçadores ou subdimensionar a fonte.
   * **Implementação (#26):** função pura `calculateGroupScore` em `src/engine/score.ts`, com testes em `src/engine/__tests__/score.test.ts`. O store só repassa o estado e acrescenta o selo verificável (#29).

     | Bloco | Máx. | Regra |
     |---|---|---|
     | Precisão | 4.000 | −500 por erro físico penalizado (piso de 500) e **−250 por alerta de qualidade do POST** (cooler abaixo do TDP, fonte abaixo do recomendado pela GPU, ventoinhas do gabinete desligadas, disco sem cabos). |
     | Orçamento | 2.500 | Sem missão: 2.500. Com missão: 1.500 + sobra ÷ teto × 1.000; estourou o teto = 0. |
     | Benchmark | 2.000 | `calculateBenchmark` (ADR-007) em 1080p: 2.000 × (pontuação ÷ meta da missão), limitado a 2.000, × (1 − gargalo%), com perda máxima de 50%. Sem missão a meta é 8.000. PC que não passa no POST = 0. |
     | Velocidade | 1.500 | 5 pontos por segundo abaixo da meta de 300 s. |
     | Penalidades | — | Registradas à parte (`penaltyPoints` = 500 × erros) e já descontadas na precisão. |
3. **Quadro de Líderes da Sala de Aula (Classroom Leaderboard):**
   * **Modo A (Painel do Professor / Sem servidor externo):** Ao finalizar o desafio, a tela do aluno exibe um **Resumo Criptografado / Hash do Score com QR Code** ou código de 6 dígitos que resume o tempo, custo e erros. O professor pode ler pelo celular ou digitar no painel projetado para atualizar o placar ao vivo.
   * **Modo B (P2P / Local Storage & WebSockets leves opcionais):** Sincronização em tempo real quando conectados na mesma rede local da escola via servidor local ou Firebase/Supabase gratuito.

## Consequências
* **Positivas:**
  * Zero atrito de autenticação: a aula começa em menos de 30 segundos.
  * Estimula cooperação ativa e discussão calorosa entre os membros da equipe sobre quais peças escolher e qual o próximo passo de montagem.
  * O professor obtém métricas imediatas para avaliar a compreensão da matéria sem precisar aplicar prova tradicional em papel.

