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
    cableSataConnected: true,
    caseInstalled: null,
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
    caseFansConnected: true,
    frontUsbConnected: true,
    frontAudioConnected: true,
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

  describe('Correção de cálculo de gargalo por resolução (Issue #42)', () => {
    it('em resoluções maiores (1440p e 4K), a carga da GPU sobe e o gargalo de CPU diminui', () => {
      const entryCpuWithHighGpu: AssemblyState = {
        ...baseAssembly,
        cpuInstalled: i3Cpu,
        gpuInstalled: rtx4070,
      };

      const res1080p = calculateBenchmark(entryCpuWithHighGpu, mb, '1080p');
      const res1440p = calculateBenchmark(entryCpuWithHighGpu, mb, '1440p');
      const res4k = calculateBenchmark(entryCpuWithHighGpu, mb, '4K');

      // Em 1080p a GPU empurra muitos quadros e sofre gargalo de CPU
      expect(res1080p.bottleneckType).toBe('CPU_BOUND');
      expect(res1080p.bottleneckPercent).toBeGreaterThanOrEqual(10);

      // Em 1440p o gargalo de CPU é atenuado ou equilibrado
      if (res1440p.bottleneckType === 'CPU_BOUND') {
        expect(res1080p.bottleneckPercent).toBeGreaterThan(res1440p.bottleneckPercent);
      } else {
        expect(['BALANCED', 'GPU_BOUND']).toContain(res1440p.bottleneckType);
      }

      // Em 4K a exigência de pixels sobre a GPU é máxima, eliminando o gargalo de CPU e tornando-se GPU Bound
      expect(res4k.bottleneckType).toBe('GPU_BOUND');
    });

    it('CPU topo de linha não aparece como gargalo de CPU com GPU intermediária em 4K', () => {
      const topCpu = CPUS.find((c) => c.id === 'cpu-i7-13700k' || c.id === 'cpu-r9-7950x') || CPUS[0];
      const midGpu = GPUS.find((g) => g.id === 'gpu-rtx-4060') || GPUS[0];

      const state: AssemblyState = {
        ...baseAssembly,
        cpuInstalled: topCpu,
        gpuInstalled: midGpu,
      };

      const res4k = calculateBenchmark(state, mb, '4K');
      expect(res4k.bottleneckType).not.toBe('CPU_BOUND');
      expect(res4k.bottleneckType).toBe('GPU_BOUND');
    });

    it('dica didática explica que aumentar a resolução alivia o gargalo da CPU', () => {
      const entryCpuWithHighGpu: AssemblyState = {
        ...baseAssembly,
        cpuInstalled: i3Cpu,
        gpuInstalled: rtx4070,
      };

      const res1080p = calculateBenchmark(entryCpuWithHighGpu, mb, '1080p');
      expect(res1080p.didacticTip).toMatch(/resoluções mais altas.*gargalo diminui|aumentar a resolução reduz o gargalo/i);
    });
  });

  describe('Robustez numérica e determinismo', () => {
    const isFiniteResult = (r: ReturnType<typeof calculateBenchmark>) =>
      [r.avgFps, r.onePercentLowFps, r.bottleneckPercent, r.cpuTempC, r.gpuTempC, r.totalPowerWatts, r.score, ...r.frametimeHistory].every(
        Number.isFinite
      );

    it('é determinístico: a mesma montagem gera o mesmo gráfico de frametime', () => {
      const a = calculateBenchmark(baseAssembly, mb, '1440p');
      const b = calculateBenchmark(baseAssembly, mb, '1440p');
      expect(a.frametimeHistory).toEqual(b.frametimeHistory);
    });

    it('não gera NaN/Infinity com cooler de capacidade zero e CPU de TDP zero', () => {
      const result = calculateBenchmark(
        { ...baseAssembly, cpuInstalled: { ...i5Cpu, tdpWatts: 0 }, coolerInstalled: { ...cooler, maxTdpWatts: 0 } },
        mb,
        '4K'
      );
      expect(isFiniteResult(result)).toBe(true);
      expect(result.cpuTempC).toBeLessThanOrEqual(105);
    });

    it('não gera NaN com dados de catálogo corrompidos (score/clock ausentes)', () => {
      const result = calculateBenchmark(
        {
          ...baseAssembly,
          cpuInstalled: { ...i5Cpu, boostClockGhz: Number.NaN },
          gpuInstalled: { ...rtx4070, benchmarkScore: Number.NaN, tdpWatts: Number.NaN },
        },
        { ...mb, tdpWatts: Number.NaN },
        '1080p'
      );
      expect(isFiniteResult(result)).toBe(true);
      expect(result.avgFps).toBeGreaterThanOrEqual(12);
    });

    it('limita a temperatura da CPU ao TjMax de 105°C com cooler subdimensionado', () => {
      const result = calculateBenchmark({ ...baseAssembly, coolerInstalled: { ...cooler, maxTdpWatts: 1 } }, mb, '1080p');
      expect(result.cpuTempC).toBe(105);
      expect(result.thermalThrottlePenalty).toBe(true);
    });
  });
});
