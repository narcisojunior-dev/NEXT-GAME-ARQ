import { describe, it, expect } from 'vitest';
import { TOUR_IDLE_MS, buildTourScript, tourStepAt } from '../cutawayTour';
import { poseCutaway } from '../cutaway';
import { calculateBenchmark } from '../benchmark';
import { READY_MB, buildReadyAssembly } from './fixtures/readyPc';

const subsystemsOf = (assembly = buildReadyAssembly()) =>
  poseCutaway(assembly, READY_MB, calculateBenchmark(assembly, READY_MB), null, 1).subsystems;

describe('Tour didático do modo "Abrir o PC" (#62)', () => {
  it('começa no térmico, passa pelos subsistemas instalados e volta ao conjunto', () => {
    const script = buildTourScript(subsystemsOf());
    expect(script.map((s) => s.subsystem)).toEqual(['CPU_COOLER', 'PSU', 'MEMORY', 'GPU', 'STORAGE', null]);
    script.forEach((s) => {
      expect(s.durationMs).toBeGreaterThanOrEqual(4000);
      expect(s.caption.length).toBeGreaterThan(20);
    });
  });

  it('pula subsistemas ausentes (sem GPU, sem disco)', () => {
    const assembly = { ...buildReadyAssembly(), gpuInstalled: null, storageInstalled: null };
    expect(buildTourScript(subsystemsOf(assembly)).map((s) => s.subsystem)).toEqual(['CPU_COOLER', 'PSU', 'MEMORY', null]);
  });

  it('ocioso há ~25 s: o tour anda sozinho pelo tempo; antes disso, nada', () => {
    const script = buildTourScript(subsystemsOf());
    expect(TOUR_IDLE_MS).toBe(25000);
    expect(tourStepAt(script, TOUR_IDLE_MS - 1)).toBeNull();
    expect(tourStepAt(script, TOUR_IDLE_MS)?.index).toBe(0);
    expect(tourStepAt(script, TOUR_IDLE_MS + script[0].durationMs)?.index).toBe(1);
    const total = script.reduce((s, x) => s + x.durationMs, 0);
    expect(tourStepAt(script, TOUR_IDLE_MS + total + 10)?.index).toBe(0);
  });
});
