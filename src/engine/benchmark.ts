import { AssemblyState, MotherboardComponent } from './types';

export interface BenchmarkResult {
  resolution: '1080p' | '1440p' | '4K';
  avgFps: number;
  onePercentLowFps: number;
  bottleneckPercent: number;
  bottleneckType: 'CPU_BOUND' | 'GPU_BOUND' | 'BALANCED';
  singleChannelPenalty: boolean;
  thermalThrottlePenalty: boolean;
  cpuTempC: number;
  gpuTempC: number;
  totalPowerWatts: number;
  score: number;
  verdictMessage: string;
  didacticTip: string;
  frametimeHistory: number[]; // Milissegundos por quadro para o gráfico
}

/**
 * Motor determinístico de cálculo de benchmark, gargalo (bottleneck) e telemetria
 */
export function calculateBenchmark(
  assembly: AssemblyState,
  motherboard: MotherboardComponent | null,
  resolution: '1080p' | '1440p' | '4K' = '1080p'
): BenchmarkResult {
  const { cpuInstalled, gpuInstalled, ramInstalledSlot2, ramInstalledSlot4, coolerInstalled, thermalPasteApplied } =
    assembly;

  // 1. Poder da GPU
  // Se não houver GPU dedicada, usar gráfico integrado básico se a CPU tiver iGPU
  let gpuPower = 0;
  if (gpuInstalled) {
    gpuPower = gpuInstalled.benchmarkScore;
  } else if (cpuInstalled?.hasIntegratedGpu) {
    gpuPower = 1200; // Gráfico integrado Intel UHD básico
  } else {
    gpuPower = 200; // Modo VGA básico de fallback
  }

  // 2. Poder da CPU
  // Calculado por (núcleos * clock boost) com bônus IPC
  let cpuPower = 0;
  if (cpuInstalled) {
    const coreWeight = Math.min(cpuInstalled.cores, 8); // Jogos aproveitam até 8 núcleos
    const clockWeight = cpuInstalled.boostClockGhz * 1000;
    cpuPower = Math.round(coreWeight * 400 + clockWeight * 0.7);
  } else {
    cpuPower = 1000;
  }

  // 3. Fatores de Resolução
  // 1080p: CPU tem mais peso
  // 1440p: Equilíbrio
  // 4K: GPU é o fator quase total
  const resFactors = {
    '1080p': { gpuScale: 1.0, cpuWeight: 0.35 },
    '1440p': { gpuScale: 0.68, cpuWeight: 0.2 },
    '4K': { gpuScale: 0.38, cpuWeight: 0.08 },
  };
  const { gpuScale, cpuWeight } = resFactors[resolution];

  // 4. Cálculo do Gargalo (Bottleneck Ratio)
  let bottleneckPercent = 0;
  let bottleneckType: 'CPU_BOUND' | 'GPU_BOUND' | 'BALANCED' = 'BALANCED';

  const relativeGpuPower = (gpuPower / 5000) * (1 / gpuScale);
  const relativeCpuPower = cpuPower / 4500;

  if (relativeGpuPower > relativeCpuPower * 1.35) {
    // GPU muito mais forte que a CPU -> Gargalo de CPU
    bottleneckType = 'CPU_BOUND';
    const delta = ((relativeGpuPower - relativeCpuPower) / relativeGpuPower) * 100;
    bottleneckPercent = Math.min(50, Math.max(10, Math.round(delta)));
  } else if (relativeCpuPower > relativeGpuPower * 1.8) {
    // CPU muito mais forte que GPU
    bottleneckType = 'GPU_BOUND';
    const delta = ((relativeCpuPower - relativeGpuPower) / relativeCpuPower) * 100;
    bottleneckPercent = Math.min(45, Math.max(10, Math.round(delta * 0.6)));
  } else {
    bottleneckType = 'BALANCED';
    bottleneckPercent = Math.round(Math.abs(relativeGpuPower - relativeCpuPower) * 5);
    if (bottleneckPercent > 8) bottleneckPercent = 8;
  }

  // 5. Cálculo da Taxa de Quadros (FPS) Base
  let baseFps = (gpuPower / 55) * gpuScale;

  // Penalidade de Gargalo de CPU se aplicável
  if (bottleneckType === 'CPU_BOUND') {
    baseFps = baseFps * (1 - (bottleneckPercent / 100) * 0.7);
  }

  // 6. Impacto de Memória RAM (Dual Channel vs Single Channel)
  const isDualChannel = Boolean(ramInstalledSlot2 && ramInstalledSlot4);
  const singleChannelPenalty = !isDualChannel;

  let onePercentLowFactor = isDualChannel ? 0.78 : 0.55; // Single channel sofre micro-stutters
  if (singleChannelPenalty) {
    baseFps = baseFps * 0.92; // Perda de ~8% de FPS médio
  }

  // 7. Dissipação Térmica e Thermal Throttling
  let cpuTempC = 35;
  let thermalThrottlePenalty = false;

  if (cpuInstalled) {
    const coolerCapacity = coolerInstalled ? coolerInstalled.maxTdpWatts : 65;
    const thermalRatio = cpuInstalled.tdpWatts / coolerCapacity;
    cpuTempC = Math.round(28 + thermalRatio * 45);

    if (!thermalPasteApplied) {
      cpuTempC = 98; // Superaquecimento severo
      thermalThrottlePenalty = true;
      baseFps = baseFps * 0.45; // Queda brutal de performance por estrangulamento térmico
    } else if (cpuTempC > 85) {
      thermalThrottlePenalty = true;
      baseFps = baseFps * 0.85;
    }
  }

  const gpuTempC = gpuInstalled ? Math.round(40 + (gpuPower / 8000) * 28) : 45;
  const avgFps = Math.max(12, Math.round(baseFps));
  const onePercentLowFps = Math.max(6, Math.round(avgFps * onePercentLowFactor));

  // 8. Histórico Sintético de Frametime (ms por quadro)
  const targetMs = 1000 / avgFps;
  const frametimeHistory: number[] = [];
  for (let i = 0; i < 30; i++) {
    // Se for single channel, adicionar picos ocasionais de micro-travamento (stuttering)
    const stutter = singleChannelPenalty && i % 6 === 0 ? targetMs * 1.8 : 0;
    const jitter = (Math.random() - 0.5) * (targetMs * 0.2);
    frametimeHistory.push(Math.max(4, Math.round((targetMs + jitter + stutter) * 10) / 10));
  }

  // 9. Pontuação Geral e Diagnóstico Didático
  const score = Math.round(avgFps * 35 + onePercentLowFps * 25);

  let verdictMessage = '';
  let didacticTip = '';

  if (thermalThrottlePenalty) {
    verdictMessage = '⚠️ Estrangulamento Térmico Ativo (Thermal Throttling)!';
    didacticTip =
      'O processador reduziu a velocidade para não queimar. Verifique a aplicação de pasta térmica e a pressão dos parafusos do cooler.';
  } else if (bottleneckType === 'CPU_BOUND') {
    verdictMessage = `Gargalo de CPU (${bottleneckPercent}%): O processador limita a placa de vídeo.`;
    didacticTip =
      'A GPU é muito veloz e fica esperando a CPU entregar os cálculos de física e IA. Em resoluções mais altas (1440p/4K) ou com uma CPU superior, esse gargalo diminui.';
  } else if (bottleneckType === 'GPU_BOUND') {
    verdictMessage = `GPU a 99% de uso: Comportamento ideal para jogos.`;
    didacticTip =
      'O processador sobra em poder de fogo e a placa de vídeo trabalha em carga máxima entregando todo o potencial gráfico.';
  } else {
    verdictMessage = `Equilíbrio Excelente! Componentes perfeitamente balanceados.`;
    didacticTip =
      'A CPU e a GPU trabalham em sincronia sem desperdício de investimento em hardware.';
  }

  if (singleChannelPenalty) {
    didacticTip +=
      ' 💡 Alerta de Memória: Você está usando apenas 1 canal de RAM (Single Channel). Adicionar um segundo pente em Dual Channel melhora a estabilidade de FPS (1% Low) em até 25%!';
  }

  const totalPowerWatts =
    (cpuInstalled ? cpuInstalled.tdpWatts : 50) +
    (gpuInstalled ? gpuInstalled.tdpWatts : 15) +
    (motherboard ? motherboard.tdpWatts : 30) +
    25;

  return {
    resolution,
    avgFps,
    onePercentLowFps,
    bottleneckPercent,
    bottleneckType,
    singleChannelPenalty,
    thermalThrottlePenalty,
    cpuTempC,
    gpuTempC,
    totalPowerWatts,
    score,
    verdictMessage,
    didacticTip,
    frametimeHistory,
  };
}
