import { describe, it, expect } from 'vitest';
import { validateSocket, validateRamType, evaluatePostTest, calculateTotalTdp } from '../compatibility';
import { CPUS, MOTHERBOARDS, RAMS, COOLERS, PSUS, STORAGES, GPUS } from '../hardwareCatalog';
import { AssemblyState } from '../types';

describe('Motor de Compatibilidade de Hardware', () => {
  const intelCpu = CPUS.find((c) => c.socket === 'LGA1700')!;
  const amdCpu = CPUS.find((c) => c.socket === 'AM5')!;
  const intelMb = MOTHERBOARDS.find((m) => m.socket === 'LGA1700' && m.supportedRam === 'DDR5')!;
  const amdMb = MOTHERBOARDS.find((m) => m.socket === 'AM5')!;
  const ddr5Ram = RAMS.find((r) => r.ramType === 'DDR5')!;
  const ddr4Ram = RAMS.find((r) => r.ramType === 'DDR4')!;

  it('deve aprovar quando o soquete da CPU for compatível com a placa-mãe', () => {
    const error = validateSocket(intelCpu, intelMb);
    expect(error).toBeNull();
  });

  it('deve reprovar quando tentar instalar CPU Intel em placa-mãe AMD', () => {
    const error = validateSocket(intelCpu, amdMb);
    expect(error).not.toBeNull();
    expect(error?.title).toBe('Soquete Incompatível!');
  });

  it('deve aprovar RAM DDR5 em placa-mãe DDR5', () => {
    const error = validateRamType(ddr5Ram, intelMb);
    expect(error).toBeNull();
  });

  it('deve reprovar RAM DDR4 em placa-mãe DDR5', () => {
    const error = validateRamType(ddr4Ram, intelMb);
    expect(error).not.toBeNull();
    expect(error?.title).toBe('Geração de Memória Incompatível!');
  });
});

describe('Teste de Diagnóstico do POST (Power-On Self-Test)', () => {
  const intelCpu = CPUS.find((c) => c.id === 'cpu-i5-13400f')!;
  const intelMb = MOTHERBOARDS.find((m) => m.id === 'mb-b760m-d5')!;
  const ddr5Ram = RAMS.find((r) => r.id === 'ram-16gb-d5-dual')!;
  const cooler = COOLERS[0];
  const psu650 = PSUS.find((p) => p.wattage === 650)!;
  const storage = STORAGES[0];
  const gpu = GPUS[0];

  const validAssemblyState: AssemblyState = {
    esdDischarged: true,
    cpuInstalled: intelCpu,
    socketLeverLocked: true,
    thermalPasteApplied: true,
    coolerInstalled: cooler,
    coolerFanConnected: true,
    ramInstalledSlot2: ddr5Ram,
    ramInstalledSlot4: ddr5Ram,
    storageInstalled: storage,
    ioShieldInstalled: true,
    standoffsInstalled: true,
    psuInstalled: psu650,
    motherboardScrewed: true,
    gpuInstalled: gpu,
    gpuScrewed: true,
    cableAtx24PinConnected: true,
    cableCpu8PinConnected: true,
    cableGpuPcieConnected: true,
    frontPanelPowerSwConnected: true,
    frontPanelResetSwConnected: true,
    frontPanelLedsConnected: true,
    psuSwitchOn: true,
  };

  it('deve passar com 100% de sucesso quando tudo for montado corretamente', () => {
    const result = evaluatePostTest(validAssemblyState, intelMb);
    expect(result.canPowerOn).toBe(true);
    expect(result.bootSuccess).toBe(true);
    expect(result.debugLed.cpu).toBe('GREEN');
    expect(result.debugLed.dram).toBe('GREEN');
    expect(result.debugLed.vga).toBe('GREEN');
    expect(result.debugLed.boot).toBe('GREEN');
  });

  it('deve falhar por curto-circuito se faltarem os espaçadores (standoffs)', () => {
    const stateWithoutStandoffs = { ...validAssemblyState, standoffsInstalled: false };
    const result = evaluatePostTest(stateWithoutStandoffs, intelMb);
    expect(result.bootSuccess).toBe(false);
    expect(result.issues.some((i) => i.title.includes('CURTO-CIRCUITO'))).toBe(true);
  });

  it('deve falhar por desligamento térmico se faltar a pasta térmica', () => {
    const stateWithoutPaste = { ...validAssemblyState, thermalPasteApplied: false };
    const result = evaluatePostTest(stateWithoutPaste, intelMb);
    expect(result.bootSuccess).toBe(false);
    expect(result.issues.some((i) => i.title.includes('Superaquecimento'))).toBe(true);
  });

  it('deve falhar se a fonte for subdimensionada para o consumo total', () => {
    const weakPsu = PSUS.find((p) => p.wattage === 200)!;
    const stateWithWeakPsu = { ...validAssemblyState, psuInstalled: weakPsu };
    const result = evaluatePostTest(stateWithWeakPsu, intelMb);
    expect(result.bootSuccess).toBe(false);
    expect(result.issues.some((i) => i.title.includes('Fonte Subdimensionada'))).toBe(true);
  });

  it('deve reprovar o boot com erro caso nenhuma placa-mãe esteja instalada na bancada', () => {
    const result = evaluatePostTest(validAssemblyState, null);
    expect(result.canPowerOn).toBe(false);
    expect(result.bootSuccess).toBe(false);
    expect(result.issues.some((i) => i.title.includes('Nenhuma Placa-Mãe Instalada'))).toBe(true);
  });
});

