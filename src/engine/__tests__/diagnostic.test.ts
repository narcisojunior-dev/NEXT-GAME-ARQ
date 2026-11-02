import { describe, it, expect } from 'vitest';
import { DIAGNOSTIC_SCENARIOS } from '../diagnosticCases';
import { RAMS, GPUS } from '../hardwareCatalog';

describe('Motor de Casos de Diagnóstico e Assistência Técnica', () => {
  it('deve conter pelo menos 6 cenários técnicos de defeito', () => {
    expect(DIAGNOSTIC_SCENARIOS.length).toBeGreaterThanOrEqual(6);
  });

  it('Caso #1 (Chave da Fonte I/O): deve iniciar não resolvido e resolver ao ligar a chave', () => {
    const scenario = DIAGNOSTIC_SCENARIOS.find((s) => s.id === 'case-psu-switch')!;
    expect(scenario).toBeDefined();

    // Estado inicial deve falhar
    expect(scenario.isResolved(scenario.initialAssembly, scenario.motherboard)).toBe(false);

    // Corrigindo: ligar chave da fonte
    const fixedState = { ...scenario.initialAssembly, psuSwitchOn: true };
    expect(scenario.isResolved(fixedState, scenario.motherboard)).toBe(true);
  });

  it('Caso #2 (Cabo POWER SW): deve iniciar não resolvido e resolver ao conectar o cabo', () => {
    const scenario = DIAGNOSTIC_SCENARIOS.find((s) => s.id === 'case-power-sw-loose')!;
    expect(scenario).toBeDefined();

    expect(scenario.isResolved(scenario.initialAssembly, scenario.motherboard)).toBe(false);

    const fixedState = { ...scenario.initialAssembly, frontPanelPowerSwConnected: true };
    expect(scenario.isResolved(fixedState, scenario.motherboard)).toBe(true);
  });

  it('Caso #3 (Pasta Térmica / Superaquecimento): deve resolver ao aplicar pasta e cooler', () => {
    const scenario = DIAGNOSTIC_SCENARIOS.find((s) => s.id === 'case-thermal-shutdown')!;
    expect(scenario).toBeDefined();

    expect(scenario.isResolved(scenario.initialAssembly, scenario.motherboard)).toBe(false);

    const fixedState = { ...scenario.initialAssembly, thermalPasteApplied: true };
    expect(scenario.isResolved(fixedState, scenario.motherboard)).toBe(true);
  });

  it('Caso #4 (LED DRAM Vermelho): deve resolver ao instalar pentes de memória compatíveis', () => {
    const scenario = DIAGNOSTIC_SCENARIOS.find((s) => s.id === 'case-ram-dram-led')!;
    const ddr5Ram = RAMS.find((r) => r.ramType === 'DDR5')!;

    expect(scenario.isResolved(scenario.initialAssembly, scenario.motherboard)).toBe(false);

    const fixedState = { ...scenario.initialAssembly, ramInstalledSlot2: ddr5Ram };
    expect(scenario.isResolved(fixedState, scenario.motherboard)).toBe(true);
  });

  it('Caso #5 (Curto-Circuito / Espaçadores): deve resolver ao instalar espaçadores de latão', () => {
    const scenario = DIAGNOSTIC_SCENARIOS.find((s) => s.id === 'case-short-circuit-standoffs')!;

    expect(scenario.isResolved(scenario.initialAssembly, scenario.motherboard)).toBe(false);

    const fixedState = {
      ...scenario.initialAssembly,
      standoffsInstalled: true,
      motherboardScrewed: true,
    };
    expect(scenario.isResolved(fixedState, scenario.motherboard)).toBe(true);
  });

  it('Caso #6 (CPU Linha F Sem GPU): deve resolver ao adicionar GPU dedicada e parafusar com cabo PCIe', () => {
    const scenario = DIAGNOSTIC_SCENARIOS.find((s) => s.id === 'case-cpu-f-no-gpu')!;
    const gpu = GPUS[0];

    expect(scenario.isResolved(scenario.initialAssembly, scenario.motherboard)).toBe(false);

    const fixedState = {
      ...scenario.initialAssembly,
      gpuInstalled: gpu,
      gpuScrewed: true,
      cableGpuPcieConnected: true,
    };
    expect(scenario.isResolved(fixedState, scenario.motherboard)).toBe(true);
  });
});
