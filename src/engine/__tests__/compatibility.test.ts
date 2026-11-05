import { describe, it, expect } from 'vitest';
import {
  validateSocket,
  validateRamType,
  validateCoolerPrerequisites,
  evaluatePostTest,
  calculateTotalTdp,
  calculateTotalSpent,
} from '../compatibility';
import { CPUS, MOTHERBOARDS, RAMS, COOLERS, PSUS, STORAGES, GPUS } from '../hardwareCatalog';
import { AssemblyState } from '../types';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';

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
    cableSataConnected: true,
    caseInstalled: null,
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
    caseFansConnected: true,
    frontUsbConnected: true,
    frontAudioConnected: true,
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

  it('deve permitir boot sem placa de vídeo dedicada se a CPU possuir gráfico integrado (Ryzen 5 4600G)', () => {
    const r5_4600g = CPUS.find((c) => c.id === 'cpu-r5-4600g')!;
    const am4Mb = MOTHERBOARDS.find((m) => m.socket === 'AM4')!;
    const ddr4Ram = RAMS.find((r) => r.ramType === 'DDR4')!;

    const stateWithIgpu: AssemblyState = {
      ...validAssemblyState,
      cpuInstalled: r5_4600g,
      gpuInstalled: null,
      gpuScrewed: false,
      cableGpuPcieConnected: false,
      ramInstalledSlot2: ddr4Ram,
      ramInstalledSlot4: ddr4Ram,
    };

    const result = evaluatePostTest(stateWithIgpu, am4Mb);
    expect(result.canPowerOn).toBe(true);
    expect(result.bootSuccess).toBe(true);
    expect(result.debugLed.vga).toBe('GREEN');
  });

  it('deve calcular corretamente o TDP total de um setup topo de linha com i9-14900K e RTX 4090', () => {
    const i9Cpu = CPUS.find((c) => c.id === 'cpu-i9-14900k')!;
    const rtx4090 = GPUS.find((g) => g.id === 'gpu-rtx-4090')!;
    const highEndMb = MOTHERBOARDS.find((m) => m.id === 'mb-z790-max')!;

    const highEndState: AssemblyState = {
      ...validAssemblyState,
      cpuInstalled: i9Cpu,
      gpuInstalled: rtx4090,
    };

    const totalTdp = calculateTotalTdp(highEndState, highEndMb);
    expect(totalTdp).toBeGreaterThan(600); // 125W CPU + 450W GPU + 50W MB + fans/dram/storage
  });

  describe('Cálculo de Custo Total e Kit Dual Channel (Issue #25)', () => {
    const ramDual = RAMS.find((r) => r.moduleCount === 2)!;

    it('não deve cobrar em dobro quando um kit de 2 pentes ocupa os slots 2 e 4', () => {
      const state: AssemblyState = {
        esdDischarged: true,
        cpuInstalled: null,
        socketLeverLocked: false,
        thermalPasteApplied: false,
        coolerInstalled: null,
        coolerFanConnected: false,
        ramInstalledSlot2: ramDual,
        ramInstalledSlot4: ramDual, // O mesmo kit nos dois slots
        storageInstalled: null,
        cableSataConnected: false,
        caseInstalled: null,
        ioShieldInstalled: false,
        standoffsInstalled: false,
        psuInstalled: null,
        motherboardScrewed: false,
        gpuInstalled: null,
        gpuScrewed: false,
        cableAtx24PinConnected: false,
        cableCpu8PinConnected: false,
        cableGpuPcieConnected: false,
        frontPanelPowerSwConnected: false,
        frontPanelResetSwConnected: false,
        frontPanelLedsConnected: false,
        caseFansConnected: false,
        frontUsbConnected: false,
        frontAudioConnected: false,
        psuSwitchOn: false,
      };

      const total = calculateTotalSpent(state, null);
      // O preço deve ser o valor de 1 kit, não duplicado
      expect(total).toBe(ramDual.price);
    });
  });

  describe('Pré-requisitos do cooler (pasta térmica obrigatória)', () => {
    const amdCpu = CPUS.find((c) => c.socket === 'AM5')!;
    const noCpu = { cpuInstalled: null, thermalPasteApplied: false } as unknown as AssemblyState;

    it('bloqueia o cooler com o soquete vazio', () => {
      expect(validateCoolerPrerequisites(noCpu)?.type).toBe('ERROR');
    });

    it('bloqueia o cooler sobre a CPU sem pasta térmica', () => {
      const issue = validateCoolerPrerequisites({ ...noCpu, cpuInstalled: amdCpu });
      expect(issue?.type).toBe('ERROR');
      expect(issue?.title).toMatch(/pasta térmica/i);
    });

    it('libera o cooler com CPU e pasta aplicada', () => {
      expect(validateCoolerPrerequisites({ ...noCpu, cpuInstalled: amdCpu, thermalPasteApplied: true })).toBeNull();
    });
  });
});

describe('Ordem didática CPU → Pasta Térmica → Cooler (validateCoolerPrerequisites)', () => {
  const cpu = CPUS.find((c) => c.socket === 'AM5')!;
  const base: AssemblyState = { ...INITIAL_ASSEMBLY_STATE, esdDischarged: true };

  it('recusa cooler com o soquete vazio', () => {
    expect(validateCoolerPrerequisites(base)?.title).toMatch(/Soquete Vazio/i);
  });

  it('recusa cooler sobre CPU sem pasta térmica', () => {
    const issue = validateCoolerPrerequisites({ ...base, cpuInstalled: cpu });
    expect(issue?.type).toBe('ERROR');
    expect(issue?.title).toMatch(/Pasta Térmica/i);
  });

  it('libera o cooler depois da pasta térmica', () => {
    expect(validateCoolerPrerequisites({ ...base, cpuInstalled: cpu, thermalPasteApplied: true })).toBeNull();
  });
});
