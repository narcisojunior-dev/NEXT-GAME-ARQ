import { HardwareComponent } from './types';
import { AVAILABLE_MODELS_INDEX, AvailableModelEntry, findAvailableModelId } from './models3dIndex';

/**
 * Escolhe o GLB que representa uma peça instalada na bancada 3D.
 *
 * Usa o modelo fiel ao produto quando existe; senão, um modelo da mesma família física
 * (soquete, geração de memória, tipo de refrigeração), para nunca mostrar, por exemplo,
 * um processador Intel LGA dentro de um soquete AM5.
 *
 * A GPU usa sempre o modelo calibrado da bancada: os demais GLBs de GPU têm orientações
 * diferentes e ainda não foram calibrados no slot PCIe.
 */
export function resolveWorkbenchModelId(
  component: HardwareComponent,
  index: AvailableModelEntry[] = AVAILABLE_MODELS_INDEX
): string | null {
  switch (component.category) {
    case 'MOTHERBOARD':
      // As âncoras da bancada são calibradas por formato de placa, não por modelo exato
      return component.formFactor === 'Micro-ATX'
        ? 'mb-b550m'
        : component.formFactor === 'ATX'
        ? 'mb-z790-atx'
        : 'mb-generica';
    case 'CPU': {
      const exact = findAvailableModelId(component.id, index);
      if (exact) return exact;
      if (component.socket === 'AM5') return 'cpu-ryzen-am5';
      if (component.socket === 'AM4') return 'cpu-ryzen-am4';
      return 'cpu-intel-lga1700';
    }
    case 'RAM':
      return component.ramType === 'DDR5' ? 'ram-ddr5-corsair' : 'ram-ddr4-crucial';
    case 'COOLER':
      return component.coolerType === 'Water' ? 'cooler-aio-240' : 'cooler-torre';
    case 'GPU':
      return 'gpu-rx-6700xt';
    case 'STORAGE':
      return component.storageType === 'NVMe_M2' ? 'ssd-nvme-990pro' : null;
    default:
      return null;
  }
}

export const workbenchModelUrl = (modelId: string) => `/models/${modelId}.glb`;

/**
 * Rotação (Euler XYZ, radianos) que assenta cada GLB na bancada antes da normalização.
 * Cada autor exporta com eixos próprios: o DDR4 vem com o comprimento em X e a altura em Z;
 * o DDR5, com o comprimento em Z e a altura em X. Uma rotação única deitava o DDR5 fora da placa.
 * Alvo comum dos pentes: comprimento ao longo dos trilhos DIMM (Z) e altura em Y.
 */
export const WORKBENCH_MODEL_ROTATIONS: Record<string, [number, number, number]> = {
  'ram-ddr4-crucial': [-Math.PI / 2, 0, Math.PI / 2],
  'ram-ddr5-corsair': [0, 0, Math.PI / 2],
  'ssd-nvme-990pro': [0, Math.PI / 2, 0],
};

const NO_ROTATION: [number, number, number] = [0, 0, 0];

export const workbenchModelRotation = (modelId: string): [number, number, number] =>
  WORKBENCH_MODEL_ROTATIONS[modelId] ?? NO_ROTATION;
