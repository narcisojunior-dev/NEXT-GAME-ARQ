import { describe, it, expect } from 'vitest';
import { calculateBenchmark } from '../benchmark';
import { CPUS, MOTHERBOARDS, RAMS, COOLERS, GPUS, PSUS } from '../hardwareCatalog';
import { AssemblyState } from '../types';

describe('Motor de Simulação de Benchmark e Telemetria (AcademyOS)', () => {
  const i5Cpu = CPUS.find((c) => c.id === 'cpu-i5-13400f')!;
  const i3Cpu = CPUS.find((c) => c.id === 'cpu-i3-12100')!;
  const rtx4070 = GPUS.find((g) => g.id === 'gpu-rtx-4070-super') || GPUS[0];
  const gtx1650 = GPUS.find((g) => g.id === 'gpu-gtx-1650') || GPUS[0];
  const ddr5Ram = RAMS.find((r) => r.id === 'ram-16gb-d5-dual') || RAMS[0];
  const cooler = COOLERS[0];
  const mb = MOTHERBOARDS[0];
  const psu = PSUS[0];

  const baseAssembly: AssemblyState = {
    esdDischarged: true,
    cpuInstalled: i5Cpu,
    socketLeverLocked: true,
    thermalPasteApplied: true,
    coolerInstalled: cooler,
    coolerFanConnected: true,
    ramInstalledSlot2: ddr5Ram,
    ramInstalledSlot4: ddr5Ram,
    storageInstalled: null,
    ioShieldInstalled: true,
    standoffsInstalled: true,
    psuInstalled: psu,
    motherboardScrewed: true,
    gpuInstalled: rtx4070,
    gpuScrewed: true,
    cableAtx24PinConnected: true,
    cableCpu8PinConnected: true,
    cableGpuPcieConnected: true,
    frontPanelPowerSwConnected: true,
    frontPanelResetSwConnected: true,
    frontPanelLedsConnected: true,
    psuSwitchOn: true,
  };

  it('deve calcular benchmark em 1080p, 1440p e 4K com escalonamento de FPS decrescente', () => {
    const res1080p = calculateBenchmark(baseAssembly, mb, '1080p');
    const res1440p = calculateBenchmark(baseAssembly, mb, '1440p');
    const res4k = calculateBenchmark(baseAssembly, mb, '4K');

    expect(res1080p.avgFps).toBeGreaterThan(res1440p.avgFps);
    expect(res1440p.avgFps).toBeGreaterThan(res4k.avgFps);
    expect(res1080p.score).toBeGreaterThan(res4k.score);
  });

  it('deve identificar gargalo de CPU quando uma GPU muito potente é combinada com CPU de entrada', () => {
    const bottleneckAssembly: AssemblyState = {
      ...baseAssembly,
      cpuInstalled: i3Cpu,
      gpuInstalled: rtx4070, // RTX 4070 Super com i3
    };

    const res = calculateBenchmark(bottleneckAssembly, mb, '1080p');
    expect(res.bottleneckType).toBe('CPU_BOUND');
    expect(res.bottleneckPercent).toBeGreaterThanOrEqual(10);
    expect(res.verdictMessage).toContain('Gargalo de CPU');
  });

  it('deve aplicar penalidade no 1% Low de FPS quando operando em Single Channel de RAM', () => {
    const dualChannelRes = calculateBenchmark(baseAssembly, mb, '1080p');

    const singleChannelAssembly: AssemblyState = {
      ...baseAssembly,
      ramInstalledSlot2: ddr5Ram,
      ramInstalledSlot4: null, // Apenas 1 pente
    };
    const singleChannelRes = calculateBenchmark(singleChannelAssembly, mb, '1080p');

    expect(singleChannelRes.singleChannelPenalty).toBe(true);
    expect(singleChannelRes.onePercentLowFps).toBeLessThan(dualChannelRes.onePercentLowFps);
    expect(singleChannelRes.didacticTip).toContain('Single Channel');
  });

  it('deve aplicar estrangulamento térmico (thermal throttling) severo se faltar pasta térmica', () => {
    const noPasteAssembly: AssemblyState = {
      ...baseAssembly,
      thermalPasteApplied: false,
    };

    const res = calculateBenchmark(noPasteAssembly, mb, '1080p');
    expect(res.thermalThrottlePenalty).toBe(true);
    expect(res.cpuTempC).toBeGreaterThanOrEqual(95);
    expect(res.verdictMessage).toContain('Estrangulamento Térmico');
  });

  it('deve gerar vetor de histórico de frametime para renderização gráfica', () => {
    const res = calculateBenchmark(baseAssembly, mb, '1080p');
    expect(res.frametimeHistory.length).toBe(30);
    expect(res.frametimeHistory.every((val) => typeof val === 'number' && val > 0)).toBe(true);
  });
});

