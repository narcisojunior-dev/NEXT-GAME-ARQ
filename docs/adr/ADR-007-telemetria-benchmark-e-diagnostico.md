# ADR-007: Telemetria, Simulação de Benchmark e Motor de Diagnóstico

## Status
Aprovado

## Contexto
O usuário especificou:
1. Gráficos de desempenho e benchmarks após a montagem para avaliar o computador.
2. Modo diagnóstico ("O que está quebrado?") para simular problemas reais de suporte técnico.
3. Necessidade de demonstrar o conceito de "gargalo" (bottleneck) entre processador e placa de vídeo de forma matemática e didática.

## Decisão
Implementamos modelos matemáticos determinísticos em TypeScript puro (`src/engine/benchmark.ts` e `src/engine/diagnosticCases.ts`):

### 1. Modelo de Simulação de Benchmark de Jogos
A taxa de quadros (FPS) simulada para cada resolução baseia-se em:
$$\text{FPS Base} = \frac{\text{GPU Benchmark Score}}{50} \times \text{Fator de Resolução}$$

Onde os fatores de resolução são:
* **1080p (Full HD):** $1.0$ (CPU é mais exigida; gargalos de CPU são mais evidentes).
* **1440p (Quad HD):** $0.68$ (Equilíbrio entre CPU e GPU).
* **4K (Ultra HD):** $0.38$ (Gargalo quase 100% na GPU).

#### Cálculo de Gargalo (Bottleneck Ratio):
$$\text{Índice de Força CPU} = (\text{Cores} \times \text{Boost Clock}) \times \text{Arquitetura IPC}$$
Se a GPU tiver capacidade significativamente superior à CPU na resolução selecionada:
$$\text{Gargalo de CPU (\%)} = \min\left(45\%,\, \max\left(0\%,\, \frac{\text{Poder GPU} - \text{Poder CPU}}{\text{Poder GPU}} \times 100\%\right)\right)$$

* **Penalidade de Single Channel de RAM:** Se o computador tiver apenas 1 pente de memória, o 1% Low (estabilidade de FPS) sofre penalidade de $-22\%$, provocando micro-travamentos (*stuttering*) visíveis no gráfico de frametime.

### 2. Modelo de Dissipação Térmica
$$\text{Temperatura em Carga (°C)} = T_{\text{ambiente}} (25°C) + \left(\frac{\text{TDP da CPU}}{\text{Capacidade Dissipação do Cooler}} \times 55°C\right)$$
* Se a pasta térmica estiver ausente: a condutividade cai para $1.2\%$, elevando a temperatura para $105°C$ em 3 segundos e acionando o desligamento de emergência (*Thermal Shutdown*).

### 3. Máquina de Injeção de Falhas (Modo Diagnóstico)
Para os desafios de assistência técnica:
```typescript
interface DiagnosticScenario {
  id: string;
  title: string;
  clientStory: string;
  symptom: string;
  defectState: Partial<AssemblyState>;
  solutionCheck: (state: AssemblyState) => boolean;
  rewardPoints: number;
}
```
O sistema injeta o estado defeituoso na bancada e avalia continuamente as ações do aluno até que a solução seja alcançada.

## Consequências
* **Positivas:**
  * O aluno entende com números e gráficos reais porque não adianta colocar uma RTX 4070 com um processador fraco ou 1 pente de memória RAM.
  * O aprendizado transcende a montagem e entra na esfera de otimização de sistemas.

