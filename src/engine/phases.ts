import { AssemblyPhase, AssemblyState, MotherboardComponent } from './types';

/** Rótulos curtos das 7 fases canônicas (HUD e inventário da mesa) */
export const PHASE_LABELS: { id: AssemblyPhase; label: string; number: number }[] = [
  { id: 'PHASE_1_PREPARATION', label: '1. Bancada & ESD', number: 1 },
  { id: 'PHASE_2_BENCH_ASSEMBLY', label: '2. Pré-Gabinete', number: 2 },
  { id: 'PHASE_3_CASE_PREPARATION', label: '3. Gabinete & Fonte', number: 3 },
  { id: 'PHASE_4_MOTHERBOARD_INSTALL', label: '4. Fixar Placa', number: 4 },
  { id: 'PHASE_5_GPU_EXPANSION', label: '5. Placa de Vídeo', number: 5 },
  { id: 'PHASE_6_CABLING', label: '6. Cabeamento', number: 6 },
  { id: 'PHASE_7_BOOT_POST', label: '7. Teste de Boot', number: 7 },
];

/**
 * Deriva a fase canônica atual a partir do estado físico da montagem.
 * Retorna a primeira fase cujos requisitos ainda não foram cumpridos.
 */
export function derivePhase(state: AssemblyState, mb: MotherboardComponent | null): AssemblyPhase {
  if (!state.esdDischarged) return 'PHASE_1_PREPARATION';

  const benchDone =
    mb !== null &&
    state.cpuInstalled !== null &&
    state.socketLeverLocked &&
    state.thermalPasteApplied &&
    state.coolerInstalled !== null &&
    state.coolerFanConnected &&
    (state.ramInstalledSlot2 !== null || state.ramInstalledSlot4 !== null);
  if (!benchDone || !mb) return 'PHASE_2_BENCH_ASSEMBLY';

  const caseDone =
    state.caseInstalled !== null &&
    state.standoffsInstalled &&
    state.psuInstalled !== null &&
    (state.ioShieldInstalled || mb.hasIntegratedIoShield);
  if (!caseDone) return 'PHASE_3_CASE_PREPARATION';

  if (!state.motherboardScrewed) return 'PHASE_4_MOTHERBOARD_INSTALL';

  const needsGpu = !state.cpuInstalled?.hasIntegratedGpu;
  const gpuDone = state.gpuInstalled ? state.gpuScrewed : !needsGpu;
  if (!gpuDone) return 'PHASE_5_GPU_EXPANSION';

  const gpuNeedsPower = state.gpuInstalled !== null && state.gpuInstalled.powerPins !== 'none';
  const storageIsSata = state.storageInstalled !== null && state.storageInstalled.storageType !== 'NVMe_M2';
  const cablingDone =
    state.cableAtx24PinConnected &&
    state.cableCpu8PinConnected &&
    (!gpuNeedsPower || state.cableGpuPcieConnected) &&
    (!storageIsSata || state.cableSataConnected) &&
    state.frontPanelPowerSwConnected &&
    // Cabos do gabinete: ventoinhas, USB e áudio frontais
    (!state.caseInstalled ||
      ((state.caseInstalled.fansIncluded === 0 || state.caseFansConnected) && state.frontUsbConnected && state.frontAudioConnected));
  if (!cablingDone) return 'PHASE_6_CABLING';

  return 'PHASE_7_BOOT_POST';
}
