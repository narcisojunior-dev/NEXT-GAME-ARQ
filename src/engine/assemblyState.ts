import { AssemblyState } from './types';

/**
 * Estado inicial da bancada: nenhuma peça instalada e nenhum cabo conectado
 */
export const INITIAL_ASSEMBLY_STATE: AssemblyState = {
  esdDischarged: false,
  cpuInstalled: null,
  socketLeverLocked: false,
  thermalPasteApplied: false,
  coolerInstalled: null,
  coolerFanConnected: false,
  ramInstalledSlot2: null,
  ramInstalledSlot4: null,
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
