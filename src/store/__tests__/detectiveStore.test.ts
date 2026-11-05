import { describe, it, expect, beforeEach } from 'vitest';
import { useAssemblyStore, selectDiagnosticBenchLocked } from '../useAssemblyStore';
import { DIAGNOSTIC_SCENARIOS } from '../../engine/diagnosticCases';

const store = () => useAssemblyStore.getState();

describe('Modo detetive na store (#32)', () => {
  beforeEach(() => {
    store().resetAssembly();
    store().setGameMode('DIAGNOSTICO');
    store().drawDiagnosticCases(1234);
  });

  it('sorteia a ordem dos chamados pela semente e abre o primeiro da ordem', () => {
    const { order } = store().detective;
    expect([...order].sort()).toEqual(DIAGNOSTIC_SCENARIOS.map((s) => s.id).sort());
    expect(store().activeDiagnosticScenario?.id).toBe(order[0]);
    store().drawDiagnosticCases(1234);
    expect(store().detective.order).toEqual(order);
  });

  it('a bancada fica lacrada até a hipótese certa; hipótese errada custa 25%', () => {
    const scenario = store().activeDiagnosticScenario!;
    expect(selectDiagnosticBenchLocked(store())).toBe(true);
    const wrong = DIAGNOSTIC_SCENARIOS.find((s) => s.cause !== scenario.cause)!.cause;
    expect(store().submitDiagnosticHypothesis(wrong)).toBe(false);
    expect(store().detective.records[scenario.id].wrongHypotheses).toBe(1);
    expect(store().activeAlert?.title).toBe('Hipótese descartada');
    expect(selectDiagnosticBenchLocked(store())).toBe(true);
    expect(store().submitDiagnosticHypothesis(scenario.cause)).toBe(true);
    expect(selectDiagnosticBenchLocked(store())).toBe(false);
  });

  it('ligar sem consertar conta como tentativa falha; resolver grava os pontos com os descontos', () => {
    store().selectDiagnosticScenario('case-eps-loose');
    const scenario = store().activeDiagnosticScenario!;
    store().submitDiagnosticHypothesis(scenario.cause);
    store().triggerPostBoot();
    expect(store().detective.records[scenario.id].failedBoots).toBe(1);
    store().revealDiagnosticHint();
    store().connectCableTo('EPS_8PIN', 'ATX12V');
    expect(store().resolvedScenarioIds).toContain('case-eps-loose');
    const points = store().detective.records[scenario.id].points;
    expect(points).toBe(Math.round(scenario.rewardPoints * (1 - 0.15 - 0.2)));
    expect(store().activeAlert?.message).toContain(`+${points} XP`);
  });

  it('o novo chamado do USB frontal é resolvido ligando o cabo no cabeçalho USB 3.0', () => {
    store().selectDiagnosticScenario('case-front-usb');
    store().submitDiagnosticHypothesis('FRONT_USB');
    store().connectCableTo('FRONT_USB3', 'USB3_HEADER');
    expect(store().resolvedScenarioIds).toContain('case-front-usb');
  });
});
