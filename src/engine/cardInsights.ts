import { AssemblyState, HardwareComponent, MotherboardComponent } from './types';
import { CPUS, MOTHERBOARDS, RAMS, COOLERS, THERMAL_PASTES, GPUS, STORAGES, PSUS, CASES } from './hardwareCatalog';
import {
  validateSocket,
  validateRamType,
  validateCoolerSocket,
  validateCoolerCapacity,
  validateCaseFormFactor,
  validateGpuLength,
  calculateTotalTdp,
} from './compatibility';

export type PriceTier = 'ENTRADA' | 'INTERMEDIARIO' | 'TOPO';

export type HintStatus = 'INSTALLED' | 'OK' | 'INFO' | 'WARNING' | 'DANGER';

export interface CompatibilityHint {
  status: HintStatus;
  label: string;
}

const CATALOG_BY_CATEGORY: Record<HardwareComponent['category'], HardwareComponent[]> = {
  CPU: CPUS,
  MOTHERBOARD: MOTHERBOARDS,
  RAM: RAMS,
  COOLER: COOLERS,
  PASTE: THERMAL_PASTES,
  GPU: GPUS,
  STORAGE: STORAGES,
  PSU: PSUS,
  CASE: CASES,
};

/**
 * Classifica a peça em terços de preço dentro da própria categoria do catálogo
 */
export function getPriceTier(component: HardwareComponent): PriceTier {
  const siblings = [...CATALOG_BY_CATEGORY[component.category]].sort((a, b) => a.price - b.price);
  const rank = siblings.findIndex((c) => c.id === component.id);
  if (rank < 0 || siblings.length === 0) return 'INTERMEDIARIO';
  const tier = Math.floor((rank * 3) / siblings.length);
  return tier === 0 ? 'ENTRADA' : tier === 1 ? 'INTERMEDIARIO' : 'TOPO';
}

function isInstalled(component: HardwareComponent, state: AssemblyState, mb: MotherboardComponent | null): boolean {
  const installed = [
    mb,
    state.cpuInstalled,
    state.coolerInstalled,
    state.ramInstalledSlot2,
    state.ramInstalledSlot4,
    state.storageInstalled,
    state.gpuInstalled,
    state.psuInstalled,
    state.caseInstalled,
  ];
  return installed.some((part) => part?.id === component.id);
}

const ok = (label: string): CompatibilityHint => ({ status: 'OK', label });
const warning = (label: string): CompatibilityHint => ({ status: 'WARNING', label });
const danger = (label: string): CompatibilityHint => ({ status: 'DANGER', label });

/**
 * Resume em uma frase curta se a peça combina com o que já está na bancada.
 * Retorna null quando ainda não há com o que comparar.
 */
export function getCompatibilityHint(
  component: HardwareComponent,
  state: AssemblyState,
  mb: MotherboardComponent | null
): CompatibilityHint | null {
  if (isInstalled(component, state, mb)) return { status: 'INSTALLED', label: 'Instalada na bancada' };

  switch (component.category) {
    case 'MOTHERBOARD': {
      if (state.caseInstalled && validateCaseFormFactor(state.caseInstalled, component)) {
        return danger(`Não cabe: gabinete aceita ${state.caseInstalled.supportedFormFactors.join('/')}`);
      }
      if (state.cpuInstalled && validateSocket(state.cpuInstalled, component)) {
        return warning(`Soquete ${component.socket} ≠ CPU ${state.cpuInstalled.socket}`);
      }
      return state.caseInstalled || state.cpuInstalled ? ok('Compatível com a montagem') : null;
    }

    case 'CPU': {
      if (!mb) return null;
      if (validateSocket(component, mb)) return danger(`Placa usa soquete ${mb.socket}`);
      if (state.coolerInstalled && validateCoolerCapacity(state.coolerInstalled, component)) {
        return warning(`Cooler dissipa só ${state.coolerInstalled.maxTdpWatts}W`);
      }
      if (!component.hasIntegratedGpu && !state.gpuInstalled) return warning('Sem vídeo integrado: exige GPU');
      return ok(`Soquete ${mb.socket} compatível`);
    }

    case 'RAM': {
      if (!mb) return null;
      if (validateRamType(component, mb)) return danger(`Placa usa ${mb.supportedRam}`);
      return ok(`${component.ramType} compatível`);
    }

    case 'COOLER': {
      const cpu = state.cpuInstalled;
      if (!cpu) return null;
      if (validateCoolerSocket(component, cpu)) return danger(`Sem suporte para ${cpu.socket}`);
      if (validateCoolerCapacity(component, cpu)) return warning(`Fraco para CPU de ${cpu.tdpWatts}W`);
      return ok(`Dá conta de ${cpu.tdpWatts}W`);
    }

    case 'GPU': {
      if (state.caseInstalled && validateGpuLength(component, state.caseInstalled)) {
        return danger(`Não cabe: gabinete aceita ${state.caseInstalled.maxGpuLengthMm}mm`);
      }
      if (state.psuInstalled && state.psuInstalled.wattage < component.requiredPsuWatts) {
        return warning(`Pede fonte de ${component.requiredPsuWatts}W`);
      }
      return state.caseInstalled || state.psuInstalled ? ok('Cabe e tem energia') : null;
    }

    case 'CASE': {
      if (mb && validateCaseFormFactor(component, mb)) return danger(`Placa ${mb.formFactor} não cabe`);
      if (state.gpuInstalled && validateGpuLength(state.gpuInstalled, component)) {
        return danger(`GPU de ${state.gpuInstalled.lengthMm}mm não cabe`);
      }
      return mb ? ok(`Aceita placa ${mb.formFactor}`) : null;
    }

    case 'PSU': {
      if (!mb) return null;
      const totalTdp = calculateTotalTdp(state, mb);
      const required = Math.round(totalTdp * 1.25);
      if (component.wattage < required) return danger(`Fraca: precisa de ${required}W`);
      if (state.gpuInstalled && component.wattage < state.gpuInstalled.requiredPsuWatts) {
        return warning(`GPU pede ${state.gpuInstalled.requiredPsuWatts}W`);
      }
      return ok(`Folga de ${component.wattage - required}W`);
    }

    case 'STORAGE':
      return {
        status: 'INFO',
        label: component.storageType === 'NVMe_M2' ? 'Vai no slot M.2 da placa' : 'Vai na baia SATA com cabos',
      };

    default:
      return null;
  }
}
