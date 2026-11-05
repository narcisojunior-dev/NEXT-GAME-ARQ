import { AssemblyState, MotherboardComponent } from '../../types';
import { INITIAL_ASSEMBLY_STATE } from '../../assemblyState';
import { CASES, COOLERS, CPUS, GPUS, MOTHERBOARDS, PSUS, RAMS, STORAGES } from '../../hardwareCatalog';
import { DeskSnapPointId, PlacedDeskItem } from '../../deskSetup';

/**
 * Fixtures compartilhadas pelos testes da Fase 4 (mesa e cabeamento externo).
 * Busca por id explícito para que os testes não dependam da ordem do catálogo.
 */
export const byId = <T extends { id: string }>(list: T[], id: string): T => {
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error(`Fixture: id "${id}" não existe no catálogo`);
  return found;
};

/** ATX LGA1700 com espelho I/O integrado */
export const READY_MB: MotherboardComponent = byId(MOTHERBOARDS, 'mb-z790-max');
/** Core i5-13400F: sem vídeo integrado (exige GPU dedicada) */
export const CPU_NO_IGPU = byId(CPUS, 'cpu-i5-13400f');
/** Core i5-13600K: com vídeo integrado (Intel UHD 770) */
export const CPU_WITH_IGPU = byId(CPUS, 'cpu-i5-13600k');
/** RTX 4060: exige cabo PCIe 8 pinos */
export const READY_GPU = byId(GPUS, 'gpu-rtx-4060');

interface ReadyAssemblyOptions {
  /** Instala a GPU dedicada (padrão: true) */
  withGpu?: boolean;
  /** Usa CPU com vídeo integrado (padrão: false) */
  cpuWithIgpu?: boolean;
}

/**
 * Montagem física completa: derivePhase(...) === 'PHASE_7_BOOT_POST'.
 * Todas as etapas internas concluídas (ESD, pasta, cooler, cabos 24/8 pinos, painel frontal...).
 */
export function buildReadyAssembly(options: ReadyAssemblyOptions = {}): AssemblyState {
  const { withGpu = true, cpuWithIgpu = false } = options;
  const ram = byId(RAMS, 'ram-16gb-d5-dual');
  return {
    ...INITIAL_ASSEMBLY_STATE,
    esdDischarged: true,
    cpuInstalled: cpuWithIgpu ? CPU_WITH_IGPU : CPU_NO_IGPU,
    socketLeverLocked: true,
    thermalPasteApplied: true,
    coolerInstalled: byId(COOLERS, 'cooler-deepcool-ag400'),
    coolerFanConnected: true,
    ramInstalledSlot2: ram,
    ramInstalledSlot4: ram,
    storageInstalled: byId(STORAGES, 'ssd-nvme-1tb'),
    caseInstalled: byId(CASES, 'case-gamer-mesh'),
    standoffsInstalled: true,
    ioShieldInstalled: true,
    psuInstalled: byId(PSUS, 'psu-650w-bronze'),
    motherboardScrewed: true,
    gpuInstalled: withGpu ? READY_GPU : null,
    gpuScrewed: withGpu,
    cableAtx24PinConnected: true,
    cableCpu8PinConnected: true,
    cableGpuPcieConnected: withGpu,
    frontPanelPowerSwConnected: true,
    frontPanelResetSwConnected: true,
    frontPanelLedsConnected: true,
    caseFansConnected: true,
    frontUsbConnected: true,
    frontAudioConnected: true,
  };
}

const deskItem = (snapPointId: DeskSnapPointId, category: string, price = 0): PlacedDeskItem => ({
  snapPointId,
  itemId: `${snapPointId.toLowerCase()}-fixture`,
  name: snapPointId,
  category,
  price,
});

/** Itens obrigatórios para o boot posicionados na mesa */
export const REQUIRED_DESK_ITEMS: Partial<Record<DeskSnapPointId, PlacedDeskItem>> = {
  DESK_BASE: deskItem('DESK_BASE', 'DESK', 400),
  PC_TOWER: deskItem('PC_TOWER', 'PC_TOWER'),
  MONITOR_MAIN: deskItem('MONITOR_MAIN', 'MONITOR', 1000),
  KEYBOARD: deskItem('KEYBOARD', 'KEYBOARD', 200),
  MOUSE: deskItem('MOUSE', 'MOUSE', 150),
};

/** Mesa completa, incluindo headset (para o cabo P2) */
export const FULL_DESK_ITEMS: Partial<Record<DeskSnapPointId, PlacedDeskItem>> = {
  ...REQUIRED_DESK_ITEMS,
  HEADSET: deskItem('HEADSET', 'AUDIO', 300),
};

export { deskItem };
