import { describe, it, expect } from 'vitest';
import { poseCutaway, CutawaySubsystem, CUTAWAY_SUBSYSTEMS } from '../cutaway';
import { calculateBenchmark, fanRpmFor } from '../benchmark';
import { benchPartPlacements } from '../benchGeometry';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';
import { AssemblyState } from '../types';
import { COOLERS, CPUS } from '../hardwareCatalog';
import { READY_MB, buildReadyAssembly, byId } from './fixtures/readyPc';

const pose = (assembly: AssemblyState, selection: CutawaySubsystem | null = null, opening = 1) =>
  poseCutaway(assembly, READY_MB, calculateBenchmark(assembly, READY_MB), selection, opening);

const center = (p: { position: [number, number, number] }) => p.position;

describe('Modelo puro do modo "Abrir o PC" (#60)', () => {
  it('montagem vazia: nenhuma peça e nenhum subsistema', () => {
    const p = poseCutaway(INITIAL_ASSEMBLY_STATE, null, calculateBenchmark(INITIAL_ASSEMBLY_STATE, null), null, 1);
    expect(p.parts).toEqual([]);
    expect(p.subsystems).toEqual([]);
  });

  it('só a placa-mãe: ainda sem peças para explodir', () => {
    const p = pose({ ...INITIAL_ASSEMBLY_STATE, esdDischarged: true });
    expect(p.parts).toEqual([]);
  });

  it('peça ausente não entra na explosão; a fonte entra quando instalada', () => {
    const p = pose({ ...buildReadyAssembly(), gpuInstalled: null, gpuScrewed: false, cableGpuPcieConnected: false });
    expect(p.parts.map((x) => x.part)).not.toContain('GPU');
    expect(p.subsystems).not.toContain('GPU');
    expect(p.parts.map((x) => x.part)).toContain('PSU');
  });

  it('kit dual channel: os dois pentes no subsistema de memória', () => {
    const p = pose(buildReadyAssembly());
    expect(p.parts.filter((x) => x.subsystem === 'MEMORY').map((x) => x.part).sort()).toEqual(['RAM_2', 'RAM_4']);
  });

  it('opening = 0 é a montagem: mesma posição de benchPartPlacements', () => {
    const assembly = buildReadyAssembly();
    const base = benchPartPlacements(assembly, READY_MB).parts;
    const p = pose(assembly, null, 0);
    base.forEach((b) => expect(center(p.parts.find((x) => x.part === b.part)!)).toEqual(b.position));
  });

  it('a vista explodida afasta cada peça para cima ou para fora, proporcional ao número de abertura', () => {
    const assembly = buildReadyAssembly();
    const half = pose(assembly, null, 0.5);
    const full = pose(assembly, null, 1);
    full.parts.forEach((part) => {
      const h = half.parts.find((x) => x.part === part.part)!;
      const dist = Math.hypot(...part.offset);
      expect(dist, part.part).toBeGreaterThan(0);
      expect(Math.hypot(...h.offset)).toBeCloseTo(dist / 2, 6);
    });
    // O cooler sai acima da CPU (ordem de montagem de cima para baixo)
    const cpu = full.parts.find((x) => x.part === 'CPU')!;
    const cooler = full.parts.find((x) => x.part === 'COOLER')!;
    expect(cooler.position[1]).toBeGreaterThan(cpu.position[1]);
  });

  it('isolar um subsistema traz a peça ativa ao centro e afasta/esmaece o resto', () => {
    const p = pose(buildReadyAssembly(), 'GPU');
    const gpu = p.parts.find((x) => x.part === 'GPU')!;
    expect(gpu.focus).toBe(true);
    expect(Math.abs(gpu.position[0])).toBeLessThan(1e-6);
    expect(Math.abs(gpu.position[2])).toBeLessThan(1e-6);
    const others = p.parts.filter((x) => x.subsystem !== 'GPU');
    others.forEach((o) => {
      expect(o.focus).toBe(false);
      expect(o.opacity).toBeLessThan(0.5);
    });
    const exploded = pose(buildReadyAssembly(), null);
    others.forEach((o) => {
      const e = exploded.parts.find((x) => x.part === o.part)!;
      expect(Math.hypot(o.position[0], o.position[2]), o.part).toBeGreaterThan(Math.hypot(e.position[0], e.position[2]));
    });
  });

  it('leituras do painel vêm do benchmark (nenhuma constante solta)', () => {
    const assembly = buildReadyAssembly();
    const bench = calculateBenchmark(assembly, READY_MB);
    const p = pose(assembly);
    const reading = (s: CutawaySubsystem, key: string) => p.readings[s]?.find((r) => r.key === key)?.value;
    expect(reading('CPU_COOLER', 'cpuTempC')).toBe(bench.cpuTempC);
    expect(reading('CPU_COOLER', 'fanRpm')).toBe(fanRpmFor(assembly.coolerInstalled, bench.cpuTempC));
    expect(reading('GPU', 'gpuTempC')).toBe(bench.gpuTempC);
    expect(reading('GPU', 'bottleneckPercent')).toBe(bench.bottleneckPercent);
    expect(reading('PSU', 'totalPowerWatts')).toBe(bench.totalPowerWatts);
    expect(reading('MEMORY', 'dualChannel')).toBe(bench.singleChannelPenalty ? 0 : 1);
  });

  it('GPU sem cabo de alimentação: o painel avisa, sem mudar a pose', () => {
    const assembly = { ...buildReadyAssembly(), cableGpuPcieConnected: false };
    const p = pose(assembly, 'GPU');
    expect(p.warnings.GPU?.some((w) => /PCIe/.test(w))).toBe(true);
    expect(p.parts.find((x) => x.part === 'GPU')).toBeDefined();
  });

  it('cooler fraco para o TDP: a temperatura alta prevista pelo benchmark aparece no painel', () => {
    const hotCpu = byId(CPUS, 'cpu-i9-14900k');
    const weak = COOLERS.filter((c) => c.supportedSockets.includes('LGA1700')).sort((a, b) => a.maxTdpWatts - b.maxTdpWatts)[0];
    const assembly = { ...buildReadyAssembly(), cpuInstalled: hotCpu, coolerInstalled: weak };
    const bench = calculateBenchmark(assembly, READY_MB);
    const p = pose(assembly, 'CPU_COOLER');
    const temp = p.readings.CPU_COOLER?.find((r) => r.key === 'cpuTempC')?.value;
    expect(temp).toBe(bench.cpuTempC);
    expect(temp).toBeGreaterThan(85);
    expect(p.warnings.CPU_COOLER?.length).toBeGreaterThan(0);
  });

  it('a ordem dos subsistemas segue o roteiro didático (térmico, energia, memória, vídeo, armazenamento)', () => {
    const p = pose(buildReadyAssembly());
    expect(p.subsystems).toEqual(CUTAWAY_SUBSYSTEMS.filter((s) => p.subsystems.includes(s)));
    expect(p.subsystems[0]).toBe('CPU_COOLER');
  });

  it('fanRpmFor: mais quente gira mais, sem passar do máximo do cooler', () => {
    const cooler = COOLERS[0];
    expect(fanRpmFor(cooler, 40)).toBeLessThan(fanRpmFor(cooler, 80));
    expect(fanRpmFor(cooler, 120)).toBe(cooler.fanRpmMax);
    expect(fanRpmFor(null, 80)).toBe(0);
  });
});
