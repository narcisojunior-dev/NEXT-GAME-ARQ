import { describe, it, expect } from 'vitest';
import {
  CABLES,
  CABLE_TARGETS,
  EMPTY_CABLE_CONNECTIONS,
  validateCableConnection,
  isCableAvailable,
  isTargetAvailable,
  cableFlags,
  cableConnectionsFromAssembly,
  pruneCableConnections,
  getRequiredCables,
  findNearestTarget,
} from '../cabling';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';
import { CPUS, MOTHERBOARDS, COOLERS, PSUS, STORAGES, GPUS, CASES } from '../hardwareCatalog';
import { AssemblyState } from '../types';

const byId = <T extends { id: string }>(list: T[], id: string): T => {
  const item = list.find((x) => x.id === id);
  if (!item) throw new Error(`Peça ${id} não encontrada no catálogo`);
  return item;
};

const mb = byId(MOTHERBOARDS, 'mb-b760m-d5');
const full: AssemblyState = {
  ...INITIAL_ASSEMBLY_STATE,
  cpuInstalled: byId(CPUS, 'cpu-i5-13400f'),
  coolerInstalled: byId(COOLERS, 'cooler-deepcool-ag400'),
  psuInstalled: byId(PSUS, 'psu-650w-bronze'),
  gpuInstalled: byId(GPUS, 'gpu-rtx-4060'),
  storageInstalled: byId(STORAGES, 'ssd-sata-480gb'),
  caseInstalled: byId(CASES, 'case-gamer-mesh'),
};

describe('Catálogo de cabos e conectores', () => {
  it('cada cabo aponta para um conector existente e encaixa nele', () => {
    CABLES.forEach((cable) => {
      expect(CABLE_TARGETS.some((t) => t.id === cable.target)).toBe(true);
      expect(validateCableConnection(cable.id, cable.target).success).toBe(true);
    });
  });

  it('tem cabos vindos da fonte, do gabinete e das peças', () => {
    expect(new Set(CABLES.map((c) => c.source))).toEqual(new Set(['PSU', 'CASE', 'PARTS']));
  });
});

describe('Erros clássicos de cabeamento', () => {
  it('EPS da CPU no conector de energia da GPU (e vice-versa) é perigoso', () => {
    const eps = validateCableConnection('EPS_8PIN', 'GPU_POWER');
    expect(eps.success).toBe(false);
    expect(eps.dangerous).toBe(true);
    expect(eps.message).toContain('PCIe');

    const pcie = validateCableConnection('PCIE_8PIN', 'ATX12V');
    expect(pcie.success).toBe(false);
    expect(pcie.dangerous).toBe(true);
  });

  it('HD_AUDIO no cabeçalho USB 2.0 explica a diferença da chave', () => {
    const result = validateCableConnection('FRONT_AUDIO', 'USB2_HEADER');
    expect(result.success).toBe(false);
    expect(result.dangerous).toBeFalsy();
    expect(result.message).toContain('pino 8');
  });

  it('ventoinha do cooler no SYS_FAN gera o alerta "CPU Fan Error"', () => {
    expect(validateCableConnection('CPU_FAN_CABLE', 'SYS_FAN').message).toContain('CPU Fan Error');
  });

  it('energia SATA na porta SATA da placa é recusada: a porta só leva dados', () => {
    const result = validateCableConnection('SATA_POWER', 'SATA_PORT');
    expect(result.success).toBe(false);
    expect(result.message).toContain('dados');
  });

  it('combinações sem erro específico recebem uma mensagem genérica', () => {
    const result = validateCableConnection('ATX_24PIN', 'HD_AUDIO');
    expect(result.success).toBe(false);
    expect(result.message.length).toBeGreaterThan(10);
  });
});

describe('Disponibilidade de cabos e conectores', () => {
  it('cabos da fonte só existem com a fonte instalada', () => {
    expect(isCableAvailable('ATX_24PIN', INITIAL_ASSEMBLY_STATE)).toBe(false);
    expect(isCableAvailable('ATX_24PIN', full)).toBe(true);
  });

  it('cabo da ventoinha do cooler exige cooler; cabos do gabinete exigem gabinete', () => {
    expect(isCableAvailable('CPU_FAN_CABLE', { ...full, coolerInstalled: null })).toBe(false);
    expect(isCableAvailable('FRONT_USB3', { ...full, caseInstalled: null })).toBe(false);
    expect(isCableAvailable('FRONT_USB3', full)).toBe(true);
  });

  it('cabo de dados SATA só aparece com um disco SATA', () => {
    expect(isCableAvailable('SATA_DATA', full)).toBe(true);
    expect(isCableAvailable('SATA_DATA', { ...full, storageInstalled: byId(STORAGES, 'ssd-nvme-1tb') })).toBe(false);
  });

  it('conector de energia da GPU só existe em placas de vídeo que pedem energia extra', () => {
    expect(isTargetAvailable('GPU_POWER', full, mb)).toBe(true);
    expect(isTargetAvailable('GPU_POWER', { ...full, gpuInstalled: byId(GPUS, 'gpu-gtx-1650') }, mb)).toBe(false);
    expect(isTargetAvailable('ATX_PWR', full, null)).toBe(false);
  });
});

describe('Ligações viram flags da montagem', () => {
  it('SATA só conta como ligado com dados E energia', () => {
    const onlyData = { ...EMPTY_CABLE_CONNECTIONS, SATA_DATA: 'SATA_PORT' as const };
    expect(cableFlags(onlyData).cableSataConnected).toBe(false);
    const both = { ...onlyData, SATA_POWER: 'DRIVE_POWER' as const };
    expect(cableFlags(both).cableSataConnected).toBe(true);
  });

  it('mapeia cada cabo para a flag correspondente', () => {
    const flags = cableFlags({
      ...EMPTY_CABLE_CONNECTIONS,
      ATX_24PIN: 'ATX_PWR',
      EPS_8PIN: 'ATX12V',
      CPU_FAN_CABLE: 'CPU_FAN',
      CASE_FAN: 'SYS_FAN',
      FRONT_USB3: 'USB3_HEADER',
      FRONT_AUDIO: 'HD_AUDIO',
    });
    expect(flags).toMatchObject({
      cableAtx24PinConnected: true,
      cableCpu8PinConnected: true,
      cableGpuPcieConnected: false,
      coolerFanConnected: true,
      caseFansConnected: true,
      frontUsbConnected: true,
      frontAudioConnected: true,
    });
  });

  it('reconstrói as ligações a partir das flags (casos de diagnóstico)', () => {
    const state = { ...INITIAL_ASSEMBLY_STATE, cableAtx24PinConnected: true, cableSataConnected: true, frontUsbConnected: true };
    const connections = cableConnectionsFromAssembly(state);
    expect(connections.ATX_24PIN).toBe('ATX_PWR');
    expect(connections.SATA_DATA).toBe('SATA_PORT');
    expect(connections.SATA_POWER).toBe('DRIVE_POWER');
    expect(connections.FRONT_USB3).toBe('USB3_HEADER');
    expect(connections.EPS_8PIN).toBeNull();
  });

  it('solta os cabos cujas peças saíram da montagem', () => {
    const connections = {
      ...EMPTY_CABLE_CONNECTIONS,
      CPU_FAN_CABLE: 'CPU_FAN' as const,
      SATA_DATA: 'SATA_PORT' as const,
      PCIE_8PIN: 'GPU_POWER' as const,
    };
    const pruned = pruneCableConnections(connections, {
      ...full,
      coolerInstalled: null,
      storageInstalled: byId(STORAGES, 'ssd-nvme-1tb'),
      gpuInstalled: byId(GPUS, 'gpu-gtx-1650'),
    });
    expect(pruned.CPU_FAN_CABLE).toBeNull();
    expect(pruned.SATA_DATA).toBeNull();
    expect(pruned.PCIE_8PIN).toBeNull();
  });
});

describe('Cabos obrigatórios da montagem', () => {
  it('lista tudo que a montagem completa precisa ter ligado', () => {
    expect(new Set(getRequiredCables(full))).toEqual(
      new Set(['ATX_24PIN', 'EPS_8PIN', 'PCIE_8PIN', 'SATA_DATA', 'SATA_POWER', 'CPU_FAN_CABLE', 'CASE_FAN', 'FRONT_USB3', 'FRONT_AUDIO'])
    );
  });

  it('não pede PCIe para GPU sem conector de energia nem SATA para NVMe', () => {
    const required = getRequiredCables({ ...full, gpuInstalled: byId(GPUS, 'gpu-gtx-1650'), storageInstalled: byId(STORAGES, 'ssd-nvme-1tb') });
    expect(required).not.toContain('PCIE_8PIN');
    expect(required).not.toContain('SATA_DATA');
  });
});

describe('Atração magnética para conectores', () => {
  const targets = [
    { id: 'ATX_PWR' as const, rect: { left: 100, top: 100, right: 140, bottom: 220 } },
    { id: 'ATX12V' as const, rect: { left: 300, top: 20, right: 360, bottom: 50 } },
  ];

  it('dentro do retângulo, escolhe aquele conector', () => {
    expect(findNearestTarget({ x: 120, y: 150 }, targets, 30)).toBe('ATX_PWR');
  });

  it('perto da borda, ainda atrai dentro do raio', () => {
    expect(findNearestTarget({ x: 165, y: 150 }, targets, 30)).toBe('ATX_PWR');
  });

  it('longe de tudo, não atrai', () => {
    expect(findNearestTarget({ x: 600, y: 600 }, targets, 30)).toBeNull();
  });
});
