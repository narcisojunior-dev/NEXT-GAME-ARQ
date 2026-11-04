import { describe, it, expect } from 'vitest';
import {
  BUDGET_PROFILES,
  BudgetCatalog,
  BudgetProfileId,
  analyzeBudget,
  buildAssemblyFromIds,
  buildBudgetMission,
  catalogRevision,
  requirementsOf,
  storageMeets,
} from '../budgetChallenge';
import { calculateBenchmark } from '../benchmark';
import { calculateTotalSpent, evaluatePostTest } from '../compatibility';
import { evaluateMission, MissionSession } from '../campaign';
import { CASES, COOLERS, CPUS, GPUS, MOTHERBOARDS, PSUS, RAMS, STORAGES } from '../hardwareCatalog';
import { createInitialDeskSetupState } from '../deskSetup';
import { createInitialExternalCablesState } from '../externalCabling';
import { DEFAULT_STUDENT_SETUP } from '../peripheralsCatalog';

const sessionFor = (ids: ReturnType<typeof analyzeBudget>['cheapestBuild']): MissionSession => {
  const { assembly, motherboard } = buildAssemblyFromIds(ids!);
  return {
    assembly: { ...assembly, psuSwitchOn: true },
    motherboard,
    elapsedSeconds: 300,
    penaltiesCount: 0,
    errorLog: [],
    postAttempts: 1,
    clientPartIds: [],
    placedDeskItems: createInitialDeskSetupState().placedDeskItems,
    externalCabling: createInitialExternalCablesState(),
    isDeskPoweredOn: false,
    resolvedScenarioIds: [],
    studentSetup: DEFAULT_STUDENT_SETUP,
  };
};

/** Catálogo pequeno para conferir a busca contra uma força bruta escrita à parte */
const SMALL: BudgetCatalog = {
  cpus: CPUS.filter((c) => ['cpu-r5-5600', 'cpu-r5-4600g', 'cpu-i5-13400f', 'cpu-i3-12100'].includes(c.id)),
  motherboards: MOTHERBOARDS.filter((m) => ['mb-b550m-am4', 'mb-h610m-d4', 'mb-b760m-d5'].includes(m.id)),
  rams: RAMS.filter((r) => ['ram-8gb-d4-single', 'ram-16gb-d4-dual', 'ram-16gb-d5-dual'].includes(r.id)),
  gpus: GPUS.filter((g) => ['gpu-gtx-1650', 'gpu-rx-6600', 'gpu-rtx-4060'].includes(g.id)),
  coolers: COOLERS,
  psus: PSUS,
  storages: STORAGES,
  cases: CASES,
};

describe('Motor do Modo Orçamento (#67)', () => {
  it('perfis da especificação com requisitos e bônus', () => {
    expect(Object.keys(BUDGET_PROFILES).sort()).toEqual(['CRIADOR', 'ESCRITORIO', 'ESTUDOS', 'JOGOS_1080P', 'JOGOS_1440P', 'PERSONALIZADO'].sort());
    expect(requirementsOf('JOGOS_1080P')).toMatchObject({ minRamGb: 16, minFps: 60, requireDedicatedGpu: false });
    expect(requirementsOf('JOGOS_1440P')).toMatchObject({ minRamGb: 16, minStorageGb: 1000, storageType: 'NVMe_M2' });
    expect(requirementsOf('CRIADOR')).toMatchObject({ minRamGb: 32, maxCpuTempC: 85 });
  });

  it('orçamento abaixo do PC mais barato que atende → feasible: false, sem referência', () => {
    const analysis = analyzeBudget(500, requirementsOf('JOGOS_1080P'), '1080p');
    expect(analysis.feasible).toBe(false);
    expect(analysis.reference).toBeNull();
    expect(analysis.cheapestCost).toBeGreaterThan(500);
  });

  it('referência = força bruta numa fixture pequena (maior pontuação dentro do orçamento)', () => {
    const req = requirementsOf('JOGOS_1080P');
    const budget = 5200;
    const analysis = analyzeBudget(budget, req, '1080p', SMALL);
    // Força bruta independente: todas as combinações completas válidas
    let best: { score: number; cost: number } | null = null;
    for (const cpu of SMALL.cpus)
      for (const mb of SMALL.motherboards.filter((m) => m.socket === cpu.socket))
        for (const ram of SMALL.rams.filter((r) => r.ramType === mb.supportedRam))
          for (const slots of ram.moduleCount === 2 ? [[2, 4]] : [[2], [2, 4]])
            for (const gpu of [null, ...SMALL.gpus])
              for (const cooler of SMALL.coolers.filter((k) => k.supportedSockets.includes(cpu.socket)))
                for (const psu of SMALL.psus)
                  for (const storage of SMALL.storages)
                    for (const pcCase of SMALL.cases) {
                      const { assembly, motherboard } = buildAssemblyFromIds({
                        motherboardId: mb.id, cpuId: cpu.id, ramId: ram.id, ramSlots: slots as (2 | 4)[], gpuId: gpu?.id ?? null,
                        coolerId: cooler.id, psuId: psu.id, storageId: storage.id, caseId: pcCase.id,
                      });
                      const post = evaluatePostTest({ ...assembly, psuSwitchOn: true }, motherboard);
                      if (!post.bootSuccess || post.issues.some((i) => i.type === 'WARNING' && /Fonte Abaixo|Cooler Subdimensionado/.test(i.title))) continue;
                      if (pcCase.maxGpuLengthMm < (gpu?.lengthMm ?? 0) || !pcCase.supportedFormFactors.includes(mb.formFactor)) continue;
                      const gb = slots.length === 2 && ram.moduleCount === 2 ? ram.capacityGb : ram.capacityGb * slots.length;
                      if (gb < req.minRamGb || !storageMeets(storage, req)) continue;
                      const bench = calculateBenchmark(assembly, motherboard, '1080p');
                      if (bench.avgFps < (req.minFps ?? 0)) continue;
                      const cost = calculateTotalSpent(assembly, motherboard);
                      if (cost > budget) continue;
                      if (!best || bench.score > best.score || (bench.score === best.score && cost < best.cost)) best = { score: bench.score, cost };
                    }
    expect(analysis.reference?.score).toBe(best?.score);
    expect(analysis.reference?.cost).toBe(best?.cost);
  });

  it('referência sempre dentro do orçamento e passando no POST, em todos os perfis', () => {
    (Object.keys(BUDGET_PROFILES) as BudgetProfileId[])
      .filter((p) => p !== 'PERSONALIZADO')
      .forEach((profile) => {
        const req = requirementsOf(profile);
        const analysis = analyzeBudget(15000, req, BUDGET_PROFILES[profile].resolution);
        expect(analysis.feasible, profile).toBe(true);
        expect(analysis.reference!.cost, profile).toBeLessThanOrEqual(15000);
        const { assembly, motherboard } = buildAssemblyFromIds(analysis.reference!.build);
        expect(evaluatePostTest({ ...assembly, psuSwitchOn: true }, motherboard).bootSuccess, profile).toBe(true);
        expect(analysis.cheapestCost, profile).toBeLessThanOrEqual(analysis.reference!.cost);
        expect(analysis.ceilingCost, profile).toBeGreaterThanOrEqual(analysis.reference!.cost);
      });
  });

  it('cada perfil gera objetivos que evaluateMission cumpre com a build de referência', () => {
    (Object.keys(BUDGET_PROFILES) as BudgetProfileId[])
      .filter((p) => p !== 'PERSONALIZADO')
      .forEach((profile) => {
        const resolution = BUDGET_PROFILES[profile].resolution;
        const analysis = analyzeBudget(15000, requirementsOf(profile), resolution);
        const mission = buildBudgetMission({ budget: 15000, profile, resolution, targetTimeSeconds: 600 }, analysis);
        expect(mission.objectives.map((o) => o.kind)).toEqual(expect.arrayContaining(['POST_OK', 'BUDGET_MAX']));
        const evaluation = evaluateMission(mission, sessionFor(analysis.reference!.build));
        expect(evaluation.required.filter((r) => !r.met).map((r) => r.label), profile).toEqual([]);
        expect(evaluation.completed, profile).toBe(true);
      });
  });

  it('personalizado usa os requisitos do professor', () => {
    const req = { minRamGb: 16, minStorageGb: 1000, storageType: 'NVMe_M2' as const, requireDedicatedGpu: true };
    const analysis = analyzeBudget(9000, req, '1080p');
    const mission = buildBudgetMission({ budget: 9000, profile: 'PERSONALIZADO', requirements: req, resolution: '1080p', targetTimeSeconds: 600 }, analysis);
    expect(mission.objectives).toEqual(expect.arrayContaining([{ kind: 'RAM_MIN_GB', gb: 16 }]));
    expect(evaluateMission(mission, sessionFor(analysis.reference!.build)).completed).toBe(true);
  });

  it('catalogRevision é estável e muda quando um preço muda', () => {
    expect(catalogRevision()).toBe(catalogRevision());
    expect(catalogRevision()).toMatch(/^[0-9a-f]{12}$/);
    const changed = { ...SMALL, cpus: SMALL.cpus.map((c, i) => (i === 0 ? { ...c, price: c.price + 1 } : c)) };
    expect(catalogRevision(changed)).not.toBe(catalogRevision(SMALL));
  });

  it('desempenho: analyzeBudget com o catálogo real em menos de 200 ms', () => {
    analyzeBudget(6000, requirementsOf('JOGOS_1080P'), '1080p'); // aquece o JIT
    const t0 = performance.now();
    analyzeBudget(6000, requirementsOf('JOGOS_1440P'), '1440p');
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
