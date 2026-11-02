import { AssemblyPhase, AssemblyState, MotherboardComponent } from './types';

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
