# ADR-002: Motor de Interatividade, Estado de Montagem e Animações

## Status
Aprovado

## Contexto
A experiência de montagem do PC não é uma simples lista de verificação estática. Trata-se de uma **Máquina de Estados Finita (FSM)** com interdependências físicas reais:
* A CPU deve ser instalada e travada antes do cooler.
* A pasta térmica deve ser aplicada após a CPU estar no soquete e antes do cooler ser assentado.
* Os espaçadores devem estar no gabinete antes da placa-mãe ser parafusada.
* O espelho traseiro (I/O shield) deve ser colocado no gabinete antes da placa-mãe entrar.
* Os cabos de força devem ser plugados nos locais exatos.

Além disso, a interação precisa suportar tanto **Drag-and-Drop (arrastar e soltar)** quanto **Click-to-Place (clicar na peça e depois no slot)** para garantir total acessibilidade em computadores com touchpads desgastados ou telas sensíveis ao toque.

## Decisão
1. **Gerenciamento de Estado Reativo:** **Zustand**.
   * *Motivo:* Extremamente leve (< 3kb), sem boilerplate excessivo, permite atualizações atômicas de estado fora da árvore de renderização do React e facilita a persistência do progresso local do aluno via `localStorage`.
2. **Máquina de Estados de Montagem (Assembly State Machine):**
   * Modelagem explícita dos estágios da montagem:
     `PREPARATION -> BENCH_MOTHERBOARD -> CASE_PREPARATION -> CASE_INTEGRATION -> EXPANSION_GPU -> CABLING -> BOOT_TEST`.
   * Cada transição de estado avalia pré-condições obrigatórias e gera alertas educativos caso uma etapa crítica seja pulada ou feita fora de ordem.
3. **Animações e Interatividade Física:** **Framer Motion + Drag Controls customizados**.
   * *Motivo:* Permite transições fluidas de peças sendo atraídas magneticamente para seus slots quando soltas na proximidade, animações de fechamento de alavancas e balanço elástico (spring physics) que tornam a interação prazerosa e responsiva.
4. **Modo Duplo de Interação:**
   * Suporte nativo e simultâneo a **Arrastar & Soltar** e **Clique de Seleção + Clique no Slot Alvo**.

## Alternativas Consideradas e Rejeitadas
* **Redux / Redux Toolkit:**
  * *Rejeitado porque:* Boilerplate desnecessário e peso extra no bundle para um simulador focado no cliente.
* **HTML5 Drag and Drop API Nativa:**
  * *Rejeitado porque:* É notoriamente inconsistente entre navegadores, tem suporte deficiente a dispositivos touch e personalização visual de drag preview muito limitada.

## Consequências
* **Positivas:**
  * Arquitetura previsível: o estado do computador (quais peças estão montadas, onde estão conectadas, voltagens e temperaturas) fica centralizado em uma única fonte de verdade.
  * Facilidade de pausar, salvar e retomar sessões de aula.
  * Animações ricas e fluidas com baixíssimo overhead de CPU.

