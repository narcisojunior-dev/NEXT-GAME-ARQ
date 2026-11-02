import { describe, it, expect } from 'vitest';
import {
  validateStorageSlot,
  validateCoolerSocket,
  validateCoolerCapacity,
  validateThermalPasteApplication,
  validateEsdDischarged,
  validateCaseFormFactor,
  validateGpuLength,
  evaluatePostTest,
} from '../compatibility';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';
import { CPUS, MOTHERBOARDS, RAMS, COOLERS, PSUS, STORAGES, GPUS, CASES } from '../hardwareCatalog';
import { AssemblyState } from '../types';

const byId = <T extends { id: string }>(list: T[], id: string): T => {
  const item = list.find((x) => x.id === id);
  if (!item) throw new Error(`Peça ${id} não encontrada no catálogo`);
  return item;
};

describe('Catálogo: classificação correta das peças', () => {
  it('o HD mecânico deve ser classificado como SATA_HDD (não como SSD)', () => {
    expect(byId(STORAGES, 'hdd-seagate-2tb').storageType).toBe('SATA_HDD');
  });

  it('a fonte genérica "Sem Selo" não pode ter certificação 80 Plus', () => {
    expect(byId(PSUS, 'psu-generic-200w').efficiencyRating).toBe('Sem Selo');
  });

  it('deve existir ao menos um cooler que não suporta todos os soquetes', () => {
    expect(COOLERS.some((c) => c.supportedSockets.length < 3)).toBe(true);
  });
});

describe('Regra: SSD NVMe vai no slot M.2, SSD/HD SATA vai na baia SATA', () => {
  const nvme = byId(STORAGES, 'ssd-nvme-1tb');
  const sataSsd = byId(STORAGES, 'ssd-sata-480gb');
  const hdd = byId(STORAGES, 'hdd-seagate-2tb');

  it('aprova NVMe no slot M.2 e SATA na baia SATA', () => {
    expect(validateStorageSlot(nvme, 'M2')).toBeNull();
    expect(validateStorageSlot(sataSsd, 'SATA')).toBeNull();
    expect(validateStorageSlot(hdd, 'SATA')).toBeNull();
  });

  it('reprova SSD SATA e HD no slot M.2', () => {
    expect(validateStorageSlot(sataSsd, 'M2')?.type).toBe('ERROR');
    expect(validateStorageSlot(hdd, 'M2')?.type).toBe('ERROR');
  });

  it('reprova NVMe na baia SATA', () => {
    expect(validateStorageSlot(nvme, 'SATA')?.type).toBe('ERROR');
  });
});

describe('Regra: compatibilidade do cooler', () => {
  const i7 = byId(CPUS, 'cpu-i7-13700k');
  const r5 = byId(CPUS, 'cpu-r5-7600');
  const stock = byId(COOLERS, 'cooler-box-stock');
  const tower = byId(COOLERS, 'cooler-deepcool-ag400');
  const intelOnly = COOLERS.find((c) => !c.supportedSockets.includes('AM5'))!;

  it('reprova cooler que não suporta o soquete da CPU', () => {
    const issue = validateCoolerSocket(intelOnly, r5);
    expect(issue?.type).toBe('ERROR');
    expect(issue?.message).toContain('AM5');
  });

  it('aprova cooler com suporte ao soquete', () => {
    expect(validateCoolerSocket(tower, r5)).toBeNull();
  });

  it('alerta quando o TDP da CPU supera a capacidade do cooler', () => {
    const issue = validateCoolerCapacity(stock, i7);
    expect(issue?.type).toBe('WARNING');
    expect(issue?.message).toContain('125W');
  });

  it('não alerta quando o cooler dá conta do TDP', () => {
    expect(validateCoolerCapacity(tower, i7)).toBeNull();
  });
});

describe('Regra: ordem da pasta térmica', () => {
  const cpu = CPUS[0];

  it('reprova pasta sem processador no soquete', () => {
    expect(validateThermalPasteApplication(INITIAL_ASSEMBLY_STATE)?.type).toBe('ERROR');
  });

  it('reprova pasta com o cooler já instalado por cima', () => {
    const state: AssemblyState = { ...INITIAL_ASSEMBLY_STATE, cpuInstalled: cpu, coolerInstalled: COOLERS[1] };
    const issue = validateThermalPasteApplication(state);
    expect(issue?.type).toBe('ERROR');
    expect(issue?.suggestedAction).toContain('Remova o cooler');
  });

  it('aprova pasta com CPU instalada e sem cooler', () => {
    const state: AssemblyState = { ...INITIAL_ASSEMBLY_STATE, cpuInstalled: cpu };
    expect(validateThermalPasteApplication(state)).toBeNull();
  });
});

describe('Regra: descarga eletrostática antes de manusear peças', () => {
  it('reprova manuseio sem ESD descarregada', () => {
    expect(validateEsdDischarged(INITIAL_ASSEMBLY_STATE)?.type).toBe('ERROR');
  });

  it('aprova após descarregar a estática', () => {
    expect(validateEsdDischarged({ ...INITIAL_ASSEMBLY_STATE, esdDischarged: true })).toBeNull();
  });
});

describe('Regra: gabinete (formato da placa e comprimento da GPU)', () => {
  const office = byId(CASES, 'case-office-compact');
  const mesh = byId(CASES, 'case-gamer-mesh');
  const atxBoard = byId(MOTHERBOARDS, 'mb-z790-max');
  const matxBoard = byId(MOTHERBOARDS, 'mb-b760m-d5');

  it('reprova placa ATX em gabinete Micro-ATX', () => {
    const issue = validateCaseFormFactor(office, atxBoard);
    expect(issue?.type).toBe('ERROR');
    expect(issue?.message).toContain('ATX');
  });

  it('aprova placa Micro-ATX em gabinete compacto e ATX em mid-tower', () => {
    expect(validateCaseFormFactor(office, matxBoard)).toBeNull();
    expect(validateCaseFormFactor(mesh, atxBoard)).toBeNull();
  });

  it('reprova GPU maior que o espaço interno do gabinete', () => {
    const rtx4070 = byId(GPUS, 'gpu-rtx-4070-super');
    const issue = validateGpuLength(rtx4070, office);
    expect(issue?.type).toBe('ERROR');
    expect(issue?.message).toContain('295mm');
  });

  it('aprova GPU curta em gabinete compacto', () => {
    expect(validateGpuLength(byId(GPUS, 'gpu-gtx-1650'), office)).toBeNull();
  });
});

describe('POST: novas verificações', () => {
  const mb = byId(MOTHERBOARDS, 'mb-b760m-d5');
  const base: AssemblyState = {
    ...INITIAL_ASSEMBLY_STATE,
    esdDischarged: true,
    cpuInstalled: byId(CPUS, 'cpu-i5-13400f'),
    socketLeverLocked: true,
    thermalPasteApplied: true,
    coolerInstalled: byId(COOLERS, 'cooler-deepcool-ag400'),
    coolerFanConnected: true,
    ramInstalledSlot2: byId(RAMS, 'ram-16gb-d5-dual'),
    ramInstalledSlot4: byId(RAMS, 'ram-16gb-d5-dual'),
    storageInstalled: byId(STORAGES, 'ssd-nvme-1tb'),
    ioShieldInstalled: true,
    standoffsInstalled: true,
    psuInstalled: byId(PSUS, 'psu-650w-bronze'),
    motherboardScrewed: true,
    gpuInstalled: byId(GPUS, 'gpu-rtx-4060'),
    gpuScrewed: true,
    caseInstalled: byId(CASES, 'case-gamer-mesh'),
    cableAtx24PinConnected: true,
    cableCpu8PinConnected: true,
    cableGpuPcieConnected: true,
    frontPanelPowerSwConnected: true,
    psuSwitchOn: true,
  };

  it('a montagem base deve dar boot sem alertas', () => {
    const result = evaluatePostTest(base, mb);
    expect(result.bootSuccess).toBe(true);
    expect(result.issues.filter((i) => i.type !== 'TIP')).toHaveLength(0);
  });

  it('alerta quando o cooler é fraco para o TDP da CPU', () => {
    const state = { ...base, cpuInstalled: byId(CPUS, 'cpu-i7-13700k'), coolerInstalled: byId(COOLERS, 'cooler-box-stock') };
    const result = evaluatePostTest(state, mb);
    expect(result.issues.some((i) => i.type === 'WARNING' && i.title.includes('Cooler Subdimensionado'))).toBe(true);
  });

  it('alerta quando a fonte está abaixo da potência recomendada pelo fabricante da GPU', () => {
    const state = { ...base, gpuInstalled: byId(GPUS, 'gpu-rx-6700xt'), psuInstalled: byId(PSUS, 'psu-500w-white') };
    const result = evaluatePostTest(state, mb);
    expect(result.issues.some((i) => i.type === 'WARNING' && i.title.includes('Recomendad'))).toBe(true);
  });

  it('disco SATA sem cabos SATA não é detectado (LED BOOT vermelho)', () => {
    const state = { ...base, storageInstalled: byId(STORAGES, 'ssd-sata-480gb'), cableSataConnected: false };
    const result = evaluatePostTest(state, mb);
    expect(result.debugLed.boot).toBe('RED');
    expect(result.issues.some((i) => i.title.includes('SATA'))).toBe(true);
  });

  it('disco SATA com cabos de dados e energia conectados é detectado', () => {
    const state = { ...base, storageInstalled: byId(STORAGES, 'ssd-sata-480gb'), cableSataConnected: true };
    expect(evaluatePostTest(state, mb).debugLed.boot).toBe('GREEN');
  });

  it('reprova o boot se o gabinete instalado não comporta a placa ou a GPU', () => {
    const state = { ...base, caseInstalled: byId(CASES, 'case-office-compact'), gpuInstalled: byId(GPUS, 'gpu-rtx-4070-super') };
    const result = evaluatePostTest(state, mb);
    expect(result.bootSuccess).toBe(false);
    expect(result.issues.some((i) => i.type === 'ERROR' && i.message.includes('295mm'))).toBe(true);
  });

  it('teste em bancada (sem gabinete) continua permitido', () => {
    expect(evaluatePostTest({ ...base, caseInstalled: null }, mb).bootSuccess).toBe(true);
  });
});
