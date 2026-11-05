import { describe, it, expect } from 'vitest';
import { calculateGroupScore, SCORE_TABLE, ScoreInput } from '../score';
import { calculateBenchmark } from '../benchmark';
import { CLIENT_MISSIONS, COOLERS, GPUS, PSUS } from '../hardwareCatalog';
import { READY_MB, buildReadyAssembly, byId } from './fixtures/readyPc';

const base = (overrides: Partial<ScoreInput> = {}): ScoreInput => ({
  assembly: buildReadyAssembly(),
  motherboard: READY_MB,
  elapsedSeconds: 600,
  penaltiesCount: 0,
  mission: null,
  teamName: 'Bancada 03',
  ...overrides,
});

describe('Pontuação final pura (#26)', () => {
  it('usa o motor de benchmark e a meta: nunca o antigo valor fixo de 2.000/800', () => {
    const input = base();
    const score = calculateGroupScore(input);
    const bench = calculateBenchmark(input.assembly, READY_MB, '1080p');
    const expected = Math.round(
      Math.min(2000, (2000 * bench.score) / SCORE_TABLE.defaultBenchmarkTarget) * (1 - Math.min(0.5, bench.bottleneckPercent / 100))
    );
    expect(score.bootSuccess).toBe(true);
    expect(score.benchmarkPoints).toBe(expected);
    expect(score.benchmark.score).toBe(bench.score);
  });

  it('uma GPU mais forte (mesma CPU) dá mais pontos de benchmark', () => {
    const weak = calculateGroupScore(base({ assembly: { ...buildReadyAssembly(), gpuInstalled: byId(GPUS, 'gpu-rx-6600') } }));
    const strong = calculateGroupScore(base({ assembly: { ...buildReadyAssembly(), gpuInstalled: byId(GPUS, 'gpu-rtx-4070-super') } }));
    expect(strong.benchmarkPoints).toBeGreaterThan(weak.benchmarkPoints);
  });

  it('com missão, a meta do cliente define o teto (máquina acima da meta leva os 2.000 menos o gargalo)', () => {
    const office = CLIENT_MISSIONS.reduce((a, b) => (a.targetBenchmarkScore < b.targetBenchmarkScore ? a : b));
    const score = calculateGroupScore(base({ mission: office }));
    const loss = Math.min(0.5, score.benchmark.bottleneckPercent / 100);
    expect(score.benchmarkPoints).toBe(Math.round(2000 * (1 - loss)));
  });

  it('PC que não liga não ganha pontos de benchmark', () => {
    const score = calculateGroupScore(base({ assembly: { ...buildReadyAssembly(), cableAtx24PinConnected: false } }));
    expect(score.bootSuccess).toBe(false);
    expect(score.benchmarkPoints).toBe(0);
  });

  it('alertas do POST (cooler fraco, fonte abaixo do recomendado, ventoinhas desligadas) tiram 250 cada da precisão', () => {
    const clean = calculateGroupScore(base());
    expect(clean.qualityWarnings).toEqual([]);
    expect(clean.precisionPoints).toBe(4000);

    const weakCooler = COOLERS.find((c) => c.supportedSockets.includes('LGA1700') && c.maxTdpWatts < (buildReadyAssembly().cpuInstalled?.tdpWatts ?? 0));
    const smallPsu = PSUS.filter((p) => p.wattage < byId(GPUS, 'gpu-rtx-4060').requiredPsuWatts).sort((a, b) => b.wattage - a.wattage)[0];
    const sloppy = calculateGroupScore(
      base({
        assembly: {
          ...buildReadyAssembly(),
          caseFansConnected: false,
          ...(weakCooler ? { coolerInstalled: weakCooler } : {}),
          ...(smallPsu ? { psuInstalled: smallPsu } : {}),
        },
      })
    );
    expect(sloppy.qualityWarnings).toContain('Ventoinhas do Gabinete Desligadas');
    expect(sloppy.qualityWarnings.length).toBeGreaterThanOrEqual(1);
    expect(sloppy.precisionPoints).toBe(4000 - 250 * sloppy.qualityWarnings.length);
  });

  it('erros físicos: −500 cada com piso de 500 antes dos alertas', () => {
    expect(calculateGroupScore(base({ penaltiesCount: 2 })).precisionPoints).toBe(3000);
    expect(calculateGroupScore(base({ penaltiesCount: 20 })).precisionPoints).toBe(500);
    expect(calculateGroupScore(base({ penaltiesCount: 2 })).penaltyPoints).toBe(1000);
  });

  it('velocidade: 5 pontos por segundo abaixo de 300 s, teto de 1.500', () => {
    expect(calculateGroupScore(base({ elapsedSeconds: 0 })).speedPoints).toBe(1500);
    expect(calculateGroupScore(base({ elapsedSeconds: 200 })).speedPoints).toBe(500);
    expect(calculateGroupScore(base({ elapsedSeconds: 400 })).speedPoints).toBe(0);
  });

  it('orçamento: estourar zera; sobra rende bônus proporcional', () => {
    const mission = CLIENT_MISSIONS[CLIENT_MISSIONS.length - 1];
    const within = calculateGroupScore(base({ mission: { ...mission, budgetMax: 1_000_000 } }));
    expect(within.budgetPoints).toBeGreaterThan(1500);
    expect(within.budgetPoints).toBeLessThanOrEqual(2500);
    expect(calculateGroupScore(base({ mission: { ...mission, budgetMax: 100 } })).budgetPoints).toBe(0);
  });

  it('total é a soma dos blocos e nunca passa de 10.000', () => {
    const s = calculateGroupScore(base({ elapsedSeconds: 0 }));
    expect(s.totalScore).toBe(s.precisionPoints + s.budgetPoints + s.benchmarkPoints + s.speedPoints);
    expect(s.totalScore).toBeLessThanOrEqual(10000);
  });
});
