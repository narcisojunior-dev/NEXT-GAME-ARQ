import { ComponentCategory, HardwareComponent } from '@/engine/types';
import { PriceTier } from '@/engine/cardInsights';

export const CATEGORY_LABELS: Record<ComponentCategory, string> = {
  CPU: 'Processador',
  MOTHERBOARD: 'Placa-mãe',
  RAM: 'Memória RAM',
  COOLER: 'Cooler',
  PASTE: 'Pasta térmica',
  GPU: 'Placa de vídeo',
  STORAGE: 'Armazenamento',
  PSU: 'Fonte',
  CASE: 'Gabinete',
  CABLES: 'Cabos',
};

export const TIER_LABELS: Record<PriceTier, string> = {
  ENTRADA: 'Entrada',
  INTERMEDIARIO: 'Intermediário',
  TOPO: 'Topo de linha',
};

/**
 * Linha curta com as especificações que importam para a compatibilidade da peça
 */
export function getSpecLine(component: HardwareComponent): string {
  switch (component.category) {
    case 'CPU':
      return `${component.socket} · ${component.cores}C/${component.threads}T · ${component.boostClockGhz.toFixed(1)}GHz`;
    case 'MOTHERBOARD':
      return `${component.socket} · ${component.supportedRam} · ${component.formFactor}`;
    case 'RAM':
      return `${component.ramType} · ${component.moduleCount}×${component.capacityGb / component.moduleCount}GB · ${component.frequencyMhz}MHz`;
    case 'COOLER':
      return `${component.supportedSockets.join('/')} · até ${component.maxTdpWatts}W`;
    case 'PASTE':
      return `Condutividade ${component.thermalConductivity}`;
    case 'GPU':
      return `${component.vramGb}GB · ${component.lengthMm}mm · fonte ${component.requiredPsuWatts}W`;
    case 'STORAGE': {
      const type = component.storageType === 'NVMe_M2' ? 'M.2 NVMe' : component.storageType === 'SATA_SSD' ? 'SSD SATA' : 'HD SATA';
      return `${type} · ${component.readSpeedMbps.toLocaleString('pt-BR')} MB/s`;
    }
    case 'PSU':
      return `${component.efficiencyRating} · ${component.isModular ? 'modular' : 'cabos fixos'}`;
    case 'CASE':
      return `${component.supportedFormFactors.join('/')} · GPU até ${component.maxGpuLengthMm}mm`;
    default:
      return '';
  }
}
