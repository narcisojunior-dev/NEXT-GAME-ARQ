# ADR-008: Fases Derivadas do Estado e Regras de Montagem Ampliadas

## Status
Aprovado (v2.1). Atualiza o [ADR-002](./ADR-002-motor-de-interatividade-e-montagem.md) (transições da máquina de estados) e o [ADR-003](./ADR-003-regras-de-hardware-e-validacao.md) (pipeline de validação).

## Contexto
A revisão da v2.0 encontrou três problemas estruturais:
1. **Regras declaradas, mas nunca verificadas.** O catálogo tinha `supportedSockets` e `maxTdpWatts` nos coolers, `maxGpuLengthMm` e `supportedFormFactors` nos gabinetes e `requiredPsuWatts` nas GPUs, mas nenhum desses campos era usado. O gabinete nem aparecia no inventário.
2. **Fases da montagem decorativas.** A fase atual (`currentPhase`) era gravada no store manualmente em só 3 ações (ESD, parafusar placa, parafusar GPU) e podia ser trocada clicando na régua do HUD. As fases 3, 4 e 7 nunca eram atingidas pela montagem.
3. **Conteúdo técnico incorreto.** A pinagem do F_PANEL estava invertida em relação ao padrão Intel que o próprio código citava, o HD mecânico era classificado como SSD e discos SATA encaixavam no slot M.2.

## Decisão

### 1. Fase como valor derivado, não armazenado
A fase deixa de existir no store. A função pura `derivePhase(state, motherboard)` (`src/engine/phases.ts`) devolve a primeira fase cujos requisitos ainda não foram cumpridos:

| Fase | Requisitos para avançar |
| :--- | :--- |
| 1. Preparação | ESD descarregada |
| 2. Pré-gabinete | Placa-mãe, CPU com alavanca travada, pasta, cooler com cabo CPU_FAN e ao menos 1 pente de RAM |
| 3. Gabinete e fonte | Gabinete, espaçadores, fonte e espelho I/O (se a placa não tiver integrado) |
| 4. Fixar placa | Placa parafusada |
| 5. GPU | GPU parafusada, ou pular se a CPU tem vídeo integrado e não há GPU |
| 6. Cabeamento | Todos os cabos obrigatórios (ver [ADR-010](./ADR-010-cabeamento-e-arrastar-e-soltar.md)) e POWER SW no F_PANEL |
| 7. Teste de boot | Tudo acima concluído |

Os componentes leem a fase com o seletor `selectCurrentPhase`. A régua do HUD virou indicador de progresso (fases concluídas com ✓), sem navegação manual.

### 2. Novos validadores puros em `src/engine/compatibility.ts`
`validateStorageSlot`, `validateCoolerSocket`, `validateCoolerCapacity`, `validateThermalPasteApplication`, `validateEsdDischarged`, `validateCaseFormFactor`, `validateGpuLength` e `calculateTotalSpent`. Cada um devolve um `ValidationIssue` com explicação didática ou `null`. O POST (`evaluatePostTest`) reaproveita os mesmos validadores, então qualquer ordem de montagem chega ao mesmo diagnóstico.

### 3. Política de penalidade
O store usa um único `rejectAction(issue, penalize)`:
* **Penaliza** quando a ação forçaria ou danificaria uma peça: soquete errado, memória de outra geração, cooler sem suporte ao soquete, disco no slot errado, gabinete/GPU que não cabem, peça manuseada sem ESD e encaixe perigoso de cabo.
* **Não penaliza** erros de ordem, que são apenas recusados com explicação (ex: pasta térmica com o cooler instalado).

### 4. Estado inicial único
`INITIAL_ASSEMBLY_STATE` (`src/engine/assemblyState.ts`) é a fonte única do estado vazio da bancada, usado pelo store e pelos testes.

### 5. Test-First
Toda regra nova nasceu de um teste que falhava (`assemblyRules.test.ts`, `phases.test.ts`, `frontPanel.test.ts`). O store ganhou sua primeira suíte (`src/store/__tests__/useAssemblyStore.test.ts`) para garantir que as regras estão ligadas às ações da interface.

## Alternativas Consideradas e Rejeitadas
* **Manter `currentPhase` no store e atualizar em cada ação:** rejeitado porque exige lembrar de atualizar a fase em todo ponto que muda a montagem, e é exatamente isso que deixou as fases 3, 4 e 7 inalcançáveis.
* **Bloquear a montagem fora de ordem em todas as etapas:** rejeitado. Montar "errado" e descobrir no POST é parte do aprendizado (ex: esquecer os espaçadores). Só bloqueamos o que é fisicamente impossível ou danifica a peça.

## Consequências
* **Positivas:**
  * A fase nunca fica dessincronizada da bancada, inclusive nos casos de diagnóstico que já começam montados.
  * Regras e conteúdo técnico ficaram testados (de 35 para mais de 130 testes ao fim da v2.1).
  * O aluno recebe a mesma explicação na hora de encaixar e no POST.
* **Negativas:**
  * O caso de diagnóstico #3 (sem pasta térmica) ficou mais longo: o aluno precisa remover o cooler antes de aplicar a pasta. A dica do caso foi atualizada.
