import { describe, it, expect } from 'vitest';
import {
  DETECTIVE_RULES,
  detectiveScore,
  drawCaseOrder,
  drawVariant,
  hypothesisOptions,
  phaseOf,
  registerFailedBoot,
  registerHint,
  solveRecord,
  startRecord,
  submitHypothesis,
  symptomFor,
} from '../detective';
import { DIAGNOSTIC_CAUSES, DIAGNOSTIC_SCENARIOS } from '../diagnosticCases';
import { evaluatePostTest } from '../compatibility';

const scenario = DIAGNOSTIC_SCENARIOS.find((s) => s.id === 'case-thermal-shutdown')!;
const ids = DIAGNOSTIC_SCENARIOS.map((s) => s.id);

describe('Modo detetive do diagnóstico (#32)', () => {
  it('todo caso tem causa conhecida, relatos alternativos e começa com o defeito ativo', () => {
    DIAGNOSTIC_SCENARIOS.forEach((s) => {
      expect(DIAGNOSTIC_CAUSES[s.cause], s.id).toBeDefined();
      expect(s.symptomVariants.length, s.id).toBeGreaterThanOrEqual(2);
      expect(s.isResolved(s.initialAssembly, s.motherboard), `${s.id} começa quebrado`).toBe(false);
    });
  });

  it('casos novos de cabeamento: EPS solto impede o boot; USB frontal solto não', () => {
    const eps = DIAGNOSTIC_SCENARIOS.find((s) => s.id === 'case-eps-loose')!;
    const usb = DIAGNOSTIC_SCENARIOS.find((s) => s.id === 'case-front-usb')!;
    expect(evaluatePostTest(eps.initialAssembly, eps.motherboard).bootSuccess).toBe(false);
    expect(eps.isResolved({ ...eps.initialAssembly, cableCpu8PinConnected: true }, eps.motherboard)).toBe(true);
    expect(evaluatePostTest(usb.initialAssembly, usb.motherboard).bootSuccess).toBe(true);
    expect(usb.isResolved({ ...usb.initialAssembly, frontUsbConnected: true }, usb.motherboard)).toBe(true);
  });

  it('sorteio: mesma semente, mesma ordem; sementes diferentes embaralham; nenhum caso some', () => {
    expect(drawCaseOrder(ids, 42)).toEqual(drawCaseOrder(ids, 42));
    expect([...drawCaseOrder(ids, 42)].sort()).toEqual([...ids].sort());
    const orders = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => drawCaseOrder(ids, seed).join()));
    expect(orders.size).toBeGreaterThan(4);
  });

  it('o relato do sintoma varia com a semente e sempre existe', () => {
    const variants = new Set(Array.from({ length: 30 }, (_, seed) => drawVariant(scenario, seed)));
    expect(variants.size).toBeGreaterThan(1);
    variants.forEach((v) => expect(symptomFor(scenario, v).length).toBeGreaterThan(10));
  });

  it('as alternativas trazem a causa real e distratores distintos', () => {
    for (let seed = 0; seed < 20; seed++) {
      const options = hypothesisOptions(scenario, seed);
      expect(options).toHaveLength(DETECTIVE_RULES.optionsCount);
      expect(options).toContain(scenario.cause);
      expect(new Set(options).size).toBe(options.length);
    }
  });

  it('a bancada só abre com a hipótese certa; cada erro custa 25%', () => {
    let record = startRecord(scenario, 7);
    expect(phaseOf(record)).toBe('HYPOTHESIS');
    const wrong = submitHypothesis(record, scenario, 'PSU_SWITCH');
    expect(wrong.correct).toBe(false);
    record = wrong.record;
    expect(phaseOf(record)).toBe('HYPOTHESIS');
    expect(detectiveScore(scenario, record)).toBe(scenario.rewardPoints * 0.75);
    const right = submitHypothesis(record, scenario, 'THERMAL_PASTE');
    expect(right.correct).toBe(true);
    expect(phaseOf(right.record)).toBe('INVESTIGATING');
  });

  it('tentativas de ligar que falham e a dica também reduzem; piso de 20%', () => {
    let record = submitHypothesis(startRecord(scenario, 1), scenario, scenario.cause).record;
    record = registerFailedBoot(record);
    expect(detectiveScore(scenario, record)).toBe(Math.round(scenario.rewardPoints * 0.85));
    record = registerHint(record);
    expect(detectiveScore(scenario, record)).toBe(Math.round(scenario.rewardPoints * 0.65));
    for (let i = 0; i < 10; i++) record = registerFailedBoot(record);
    expect(detectiveScore(scenario, record)).toBe(Math.round(scenario.rewardPoints * 0.2));
  });

  it('resolver congela os pontos; depois disso nada muda', () => {
    const solved = solveRecord(submitHypothesis(startRecord(scenario, 3), scenario, scenario.cause).record, scenario);
    expect(phaseOf(solved)).toBe('SOLVED');
    expect(solved.points).toBe(scenario.rewardPoints);
    expect(registerFailedBoot(solved)).toBe(solved);
    expect(solveRecord(solved, scenario)).toBe(solved);
  });
});
