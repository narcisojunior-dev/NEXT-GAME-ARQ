import { describe, it, expect } from 'vitest';
import { BUDGET_SCORE_TABLE, balanceFactor, compareBudgetSubmissions, compareMissionSubmissions, scoreBudgetSubmission, speedFactor } from '../scoring';
import { analyzeBudget, buildAssemblyFromIds, requirementsOf } from '../budgetChallenge';

const analysis = analyzeBudget(6000, requirementsOf('JOGOS_1080P'), '1080p');
const ref = analysis.reference!;
const refBuild = buildAssemblyFromIds(ref.build);
const base = {
  assembly: refBuild.assembly,
  motherboard: refBuild.motherboard,
  penaltiesCount: 0,
  elapsedSeconds: 600,
  completed: true,
  budget: 6000,
  targetTimeSeconds: 600,
  resolution: '1080p' as const,
  reference: ref,
};

describe('Pontuação do Modo Orçamento (#68)', () => {
  it('a build de referência, sem penalidades e no tempo-alvo, soma 10.000', () => {
    const s = scoreBudgetSubmission(base);
    expect(s.total).toBe(10000);
    expect(s.parts.map((p) => p.max)).toEqual([3000, 3000, 2000, 1000, 1000]);
    expect(s.completed).toBe(true);
  });

  it('precisão: −500 por penalidade com piso de 500', () => {
    expect(scoreBudgetSubmission({ ...base, penaltiesCount: 2 }).parts[0].points).toBe(2000);
    expect(scoreBudgetSubmission({ ...base, penaltiesCount: 10 }).parts[0].points).toBe(500);
  });

  it('velocidade: cheia até T, metade em 1,5T, zero em 2T', () => {
    expect(speedFactor(300, 600)).toBe(1);
    expect(speedFactor(600, 600)).toBe(1);
    expect(speedFactor(900, 600)).toBe(0.5);
    expect(speedFactor(1200, 600)).toBe(0);
    expect(speedFactor(1500, 600)).toBe(0);
  });

  it('equilíbrio: 1 com gargalo até 10%, cai até 0 em 40% (ou acima do gargalo da referência)', () => {
    expect(balanceFactor(10, 0)).toBe(1);
    expect(balanceFactor(25, 0)).toBe(0.5);
    expect(balanceFactor(40, 0)).toBe(0);
    expect(balanceFactor(45, 0)).toBe(0);
    // Referência com 24% de gargalo: igualar a referência não perde pontos
    expect(balanceFactor(24, 24)).toBe(1);
    expect(balanceFactor(39, 24)).toBe(0.5);
  });

  it('orçamento estourado zera o custo-benefício e o envio não conclui', () => {
    const s = scoreBudgetSubmission({ ...base, budget: ref.cost - 1, completed: false });
    expect(s.parts.find((p) => p.key === 'CUSTO_BENEFICIO')!.points).toBe(0);
    expect(s.completed).toBe(false);
    expect(s.total).toBeGreaterThan(0);
  });

  it('gasto = orçamento ainda pontua o custo-benefício', () => {
    const s = scoreBudgetSubmission({ ...base, budget: ref.cost });
    expect(s.parts.find((p) => p.key === 'CUSTO_BENEFICIO')!.points).toBe(2000);
  });

  it('PC mais fraco que a referência perde desempenho proporcional', () => {
    const cheap = buildAssemblyFromIds(analysis.cheapestBuild!);
    const s = scoreBudgetSubmission({ ...base, assembly: cheap.assembly, motherboard: cheap.motherboard });
    const perf = s.parts.find((p) => p.key === 'DESEMPENHO')!;
    expect(perf.points).toBeLessThan(3000);
    expect(perf.points).toBe(Math.round(3000 * Math.min(1, s.benchmark.score / ref.score)));
  });

  it('tabela documentada soma 10.000', () => {
    expect(Object.values(BUDGET_SCORE_TABLE).reduce((a, b) => a + b, 0)).toBe(10000);
  });
});

describe('Desempate exportado para o ranking (#68)', () => {
  const sub = (o: Partial<Parameters<typeof compareBudgetSubmissions>[0]>) => ({
    completed: true, score: 8000, spent: 5000, penalties: 0, timeSeconds: 500, submittedAt: '2026-11-04T10:00:00Z', ...o,
  });
  it('orçamento: concluído → pontos → menor gasto → menos penalidades → menor tempo → mais antigo', () => {
    const list = [
      sub({ spent: 5200 }),
      sub({ spent: 5000, penalties: 1 }),
      sub({ spent: 5000, timeSeconds: 400, submittedAt: '2026-11-04T10:05:00Z' }),
      sub({ spent: 5000, timeSeconds: 400 }),
      sub({ score: 9000, completed: false }),
      sub({ score: 8100, spent: 5999 }),
    ].sort(compareBudgetSubmissions);
    expect(list.map((s) => [s.score, s.spent, s.penalties, s.timeSeconds, s.submittedAt.slice(14, 16), s.completed])).toEqual([
      [8100, 5999, 0, 500, '00', true],
      [8000, 5000, 0, 400, '00', true],
      [8000, 5000, 0, 400, '05', true],
      [8000, 5000, 1, 500, '00', true],
      [8000, 5200, 0, 500, '00', true],
      [9000, 5000, 0, 500, '00', false],
    ]);
  });
  it('missão: penalidades → tempo → mais antigo (o gasto não desempata)', () => {
    const a = sub({ spent: 1, penalties: 1 });
    const b = sub({ spent: 9999, penalties: 0 });
    expect([a, b].sort(compareMissionSubmissions)[0]).toBe(b);
  });
});
