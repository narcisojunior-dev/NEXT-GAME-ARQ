import { describe, it, expect } from 'vitest';
import { derivePhase } from '../phases';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';
import { CPUS, MOTHERBOARDS, RAMS, COOLERS, PSUS, STORAGES, GPUS, CASES } from '../hardwareCatalog';
import { AssemblyState } from '../types';

const mb = MOTHERBOARDS.find((m) => m.id === 'mb-b650m-am5')!; // sem espelho I/O integrado
const cpuNoIgpu = CPUS.find((c) => c.id === 'cpu-i5-13400f')!;
const cpuWithIgpu = CPUS.find((c) => c.id === 'cpu-r5-7600')!;

const benchDone: AssemblyState = {
  ...INITIAL_ASSEMBLY_STATE,
  esdDischarged: true,
  cpuInstalled: cpuWithIgpu,
  socketLeverLocked: true,
  thermalPasteApplied: true,
  coolerInstalled: COOLERS.find((c) => c.id === 'cooler-deepcool-ag400')!,
  coolerFanConnected: true,
  ramInstalledSlot2: RAMS.find((r) => r.ramType === 'DDR5')!,
};

const caseDone: AssemblyState = {
  ...benchDone,
  caseInstalled: CASES.find((c) => c.id === 'case-gamer-mesh')!,
  standoffsInstalled: true,
  ioShieldInstalled: true,
  psuInstalled: PSUS.find((p) => p.wattage === 650)!,
};

const gpu = GPUS.find((g) => g.id === 'gpu-rtx-4060')!;

describe('Fases canônicas derivadas do estado da montagem', () => {
  it('começa na Fase 1 (ESD)', () => {
    expect(derivePhase(INITIAL_ASSEMBLY_STATE, null)).toBe('PHASE_1_PREPARATION');
  });

  it('vai para a Fase 2 após a descarga eletrostática', () => {
    expect(derivePhase({ ...INITIAL_ASSEMBLY_STATE, esdDischarged: true }, null)).toBe('PHASE_2_BENCH_ASSEMBLY');
  });

  it('permanece na Fase 2 enquanto faltar algo da montagem pré-gabinete', () => {
    expect(derivePhase({ ...benchDone, thermalPasteApplied: false }, mb)).toBe('PHASE_2_BENCH_ASSEMBLY');
    expect(derivePhase({ ...benchDone, coolerFanConnected: false }, mb)).toBe('PHASE_2_BENCH_ASSEMBLY');
    expect(derivePhase({ ...benchDone, socketLeverLocked: false }, mb)).toBe('PHASE_2_BENCH_ASSEMBLY');
    expect(derivePhase({ ...benchDone, ramInstalledSlot2: null }, mb)).toBe('PHASE_2_BENCH_ASSEMBLY');
    expect(derivePhase(benchDone, null)).toBe('PHASE_2_BENCH_ASSEMBLY');
  });

  it('vai para a Fase 3 quando a bancada está completa', () => {
    expect(derivePhase(benchDone, mb)).toBe('PHASE_3_CASE_PREPARATION');
  });

  it('exige gabinete, espaçadores, fonte e espelho I/O (quando não integrado) na Fase 3', () => {
    expect(derivePhase({ ...caseDone, caseInstalled: null }, mb)).toBe('PHASE_3_CASE_PREPARATION');
    expect(derivePhase({ ...caseDone, standoffsInstalled: false }, mb)).toBe('PHASE_3_CASE_PREPARATION');
    expect(derivePhase({ ...caseDone, psuInstalled: null }, mb)).toBe('PHASE_3_CASE_PREPARATION');
    expect(derivePhase({ ...caseDone, ioShieldInstalled: false }, mb)).toBe('PHASE_3_CASE_PREPARATION');

    const mbIntegratedShield = { ...mb, hasIntegratedIoShield: true };
    expect(derivePhase({ ...caseDone, ioShieldInstalled: false }, mbIntegratedShield)).toBe('PHASE_4_MOTHERBOARD_INSTALL');
  });

  it('vai para a Fase 4 e depois pula a Fase 5 se a CPU tem vídeo integrado e não há GPU', () => {
    expect(derivePhase(caseDone, mb)).toBe('PHASE_4_MOTHERBOARD_INSTALL');
    expect(derivePhase({ ...caseDone, motherboardScrewed: true }, mb)).toBe('PHASE_6_CABLING');
  });

  it('exige GPU dedicada parafusada na Fase 5 quando a CPU não tem vídeo integrado', () => {
    const state = { ...caseDone, cpuInstalled: cpuNoIgpu, motherboardScrewed: true };
    expect(derivePhase(state, mb)).toBe('PHASE_5_GPU_EXPANSION');
    expect(derivePhase({ ...state, gpuInstalled: gpu }, mb)).toBe('PHASE_5_GPU_EXPANSION');
    expect(derivePhase({ ...state, gpuInstalled: gpu, gpuScrewed: true }, mb)).toBe('PHASE_6_CABLING');
  });

  it('exige os cabos (incluindo SATA e PCIe quando aplicável) na Fase 6 e libera o boot na Fase 7', () => {
    const cabled: AssemblyState = {
      ...caseDone,
      motherboardScrewed: true,
      gpuInstalled: gpu,
      gpuScrewed: true,
      storageInstalled: STORAGES.find((s) => s.storageType === 'SATA_SSD')!,
      cableAtx24PinConnected: true,
      cableCpu8PinConnected: true,
      cableGpuPcieConnected: true,
      cableSataConnected: true,
      frontPanelPowerSwConnected: true,
    };
    expect(derivePhase(cabled, mb)).toBe('PHASE_7_BOOT_POST');
    expect(derivePhase({ ...cabled, cableSataConnected: false }, mb)).toBe('PHASE_6_CABLING');
    expect(derivePhase({ ...cabled, cableGpuPcieConnected: false }, mb)).toBe('PHASE_6_CABLING');
    expect(derivePhase({ ...cabled, cableAtx24PinConnected: false }, mb)).toBe('PHASE_6_CABLING');
    expect(derivePhase({ ...cabled, frontPanelPowerSwConnected: false }, mb)).toBe('PHASE_6_CABLING');
  });
});
