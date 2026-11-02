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
A demanda de frames entregues pela GPU é escalada de acordo com a resolução (a carga gráfica por pixel aumenta em 1440p e 4K, reduzindo a taxa de quadros e aliviando a demanda de preparação de frames da CPU):
$\text{FPS Alvo GPU} = \frac{\text{GPU Score}}{55} \times \text{gpuScale}$
$\text{Teto de FPS da CPU} = \frac{\text{Poder CPU}}{26}$

* **Gargalo de CPU (\texttt{CPU\_BOUND}):** Quando $\text{FPS Alvo GPU} > \text{Teto CPU} \times 1.15$, a GPU precisa aguardar a CPU processar os dados da cena:
  $\text{Gargalo de CPU (\%)} = \min\left(50\%,\, \max\left(10\%,\, \frac{\text{FPS Alvo GPU} - \text{Teto CPU}}{\text{FPS Alvo GPU}} \times 100\%\right)\right)$
  Nesse caso, $\text{FPS Base} = \min(\text{FPS Alvo GPU},\, \text{Teto CPU} \times 0.95)$. Em resoluções mais altas (1440p/4K), esse gargalo diminui naturalmente.
* **Gargalo de GPU (\texttt{GPU\_BOUND}):** Quando $\text{Teto CPU} > \text{FPS Alvo GPU} \times 1.3$, a placa de vídeo opera a 99-100% de uso gráfico, que é o cenário ideal para jogos.
* **Equilíbrio (\texttt{BALANCED}):** Componentes em perfeita harmonia (gargalo $\le 8\%$).

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

