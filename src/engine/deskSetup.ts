import { AssemblyState, MotherboardComponent } from './types';
import { derivePhase } from './phases';
import { StudentSetupConfig } from './peripheralsCatalog';

export type DeskSnapPointId =
  | 'DESK_BASE'
  | 'PC_TOWER'
  | 'MONITOR_MAIN'
  | 'MONITOR_ARM'
  | 'MOUSEPAD'
  | 'KEYBOARD'
  | 'MOUSE'
  | 'HEADSET'
  | 'CHAIR';

export type DeskStage =
  | 'LOCKED'
  | 'FURNISHING'
  | 'CABLING'
  | 'READY_TO_BOOT'
  | 'RUNNING';

export interface DeskSnapPointSpec {
  id: DeskSnapPointId;
  label: string;
  nominalPosition: [number, number, number];
  nominalRotation?: [number, number, number];
  isRequiredForBoot: boolean;
  allowedCategories: string[];
  parentSnapPoint?: DeskSnapPointId;
}

export interface PlacedDeskItem {
  snapPointId: DeskSnapPointId;
  itemId: string;
  name: string;
  category: string;
  price: number;
}

export interface DeskSetupState {
  placedDeskItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>;
  isDeskPoweredOn: boolean;
  deskCameraPreset: 'setup-wide' | 'setup-top' | 'setup-pc' | 'setup-seat';
}

export const DESK_SNAP_POINTS: Record<DeskSnapPointId, DeskSnapPointSpec> = {
  DESK_BASE: {
    id: 'DESK_BASE',
    label: 'Mesa de Trabalho',
    nominalPosition: [0, 0, 0],
    nominalRotation: [0, 0, 0],
    isRequiredForBoot: true,
    allowedCategories: ['DESK'],
  },
  PC_TOWER: {
    id: 'PC_TOWER',
    label: 'Gabinete do PC (Torre)',
    nominalPosition: [1.35, 0.75, -0.1],
    nominalRotation: [0, -Math.PI / 2, 0],
    isRequiredForBoot: true,
    allowedCategories: ['PC_TOWER', 'CASE'],
    parentSnapPoint: 'DESK_BASE',
  },
  MONITOR_MAIN: {
    id: 'MONITOR_MAIN',
    label: 'Monitor Principal',
    nominalPosition: [0, 0.75, -0.4],
    nominalRotation: [0, 0, 0],
    isRequiredForBoot: true,
    allowedCategories: ['MONITOR'],
    parentSnapPoint: 'DESK_BASE',
  },
  MONITOR_ARM: {
    id: 'MONITOR_ARM',
    label: 'Braço Articulado do Monitor',
    nominalPosition: [0, 0.75, -0.58],
    nominalRotation: [0, 0, 0],
    isRequiredForBoot: false,
    allowedCategories: ['STAND'],
    parentSnapPoint: 'DESK_BASE',
  },
  MOUSEPAD: {
    id: 'MOUSEPAD',
    label: 'Mousepad Gamer / Deskmat',
    nominalPosition: [0.1, 0.752, 0.15],
    nominalRotation: [0, 0, 0],
    isRequiredForBoot: false,
    allowedCategories: ['MOUSEPAD'],
    parentSnapPoint: 'DESK_BASE',
  },
  KEYBOARD: {
    id: 'KEYBOARD',
    label: 'Teclado',
    nominalPosition: [-0.15, 0.76, 0.2],
    nominalRotation: [0, 0, 0],
    isRequiredForBoot: true,
    allowedCategories: ['KEYBOARD'],
    parentSnapPoint: 'DESK_BASE',
  },
  MOUSE: {
    id: 'MOUSE',
    label: 'Mouse',
    nominalPosition: [0.45, 0.76, 0.2],
    nominalRotation: [0, 0, 0],
    isRequiredForBoot: true,
    allowedCategories: ['MOUSE'],
    parentSnapPoint: 'DESK_BASE',
  },
  HEADSET: {
    id: 'HEADSET',
    label: 'Headset / Áudio',
    nominalPosition: [-0.65, 0.75, -0.2],
    nominalRotation: [0, 0.3, 0],
    isRequiredForBoot: false,
    allowedCategories: ['AUDIO'],
    parentSnapPoint: 'DESK_BASE',
  },
  CHAIR: {
    id: 'CHAIR',
    label: 'Cadeira do Aluno',
    nominalPosition: [0, 0, 0.95],
    nominalRotation: [0, Math.PI, 0],
    isRequiredForBoot: false,
    allowedCategories: ['CHAIR'],
  },
};

export function createInitialDeskSetupState(): DeskSetupState {
  return {
    placedDeskItems: {},
    isDeskPoweredOn: false,
    deskCameraPreset: 'setup-wide',
  };
}

export interface PlaceOnDeskContext {
  isPcAssembled?: boolean;
  studentSetup?: StudentSetupConfig;
}

export interface PlacementValidationResult {
  allowed: boolean;
  isErrorPenalty?: boolean;
  message?: string;
}

/**
 * Fonte única da regra "o PC pode ir para a mesa": a montagem física precisa estar
 * em PHASE_7_BOOT_POST (bancada, gabinete, placa parafusada, GPU/iGPU e cabos internos).
 */
export function isPcReadyForDesk(
  assembly: AssemblyState,
  selectedMotherboard: MotherboardComponent | null
): boolean {
  return derivePhase(assembly, selectedMotherboard) === 'PHASE_7_BOOT_POST';
}

/** Extrai a categoria de um item (objeto com `category` ou a própria categoria em string) sem type-casting */
function getItemCategory(item: unknown): string {
  if (typeof item === 'string') return item;
  if (typeof item === 'object' && item !== null && 'category' in item && typeof item.category === 'string') {
    return item.category;
  }
  return '';
}

export function canPlaceOnDesk(
  snapPointId: DeskSnapPointId,
  item: unknown,
  placedItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>,
  context?: PlaceOnDeskContext
): PlacementValidationResult {
  const spec = DESK_SNAP_POINTS[snapPointId];
  if (!spec) {
    return { allowed: false, isErrorPenalty: false, message: 'Snap point inválido.' };
  }

  // 1. Um snap point comporta um único item: trocar exige remover antes (o que poda os cabos do item antigo)
  const occupant = placedItems[snapPointId];
  if (occupant) {
    return {
      allowed: false,
      isErrorPenalty: false,
      message: `O espaço ${spec.label} já está ocupado por ${occupant.name}. Remova-o antes de posicionar outro item.`,
    };
  }

  // 2. Categoria obrigatória e compatível com o snap point
  const itemCategory = getItemCategory(item);
  if (!itemCategory) {
    return {
      allowed: false,
      isErrorPenalty: false,
      message: 'Item sem categoria identificável: não é possível posicioná-lo na mesa.',
    };
  }
  if (!spec.allowedCategories.includes(itemCategory)) {
    return {
      allowed: false,
      isErrorPenalty: true,
      message: `O snap point ${spec.label} aceita apenas itens da categoria ${spec.allowedCategories.join(' ou ')}.`,
    };
  }

  // 3. A mesa e a cadeira assentam diretamente no chão
  if (snapPointId === 'DESK_BASE' || snapPointId === 'CHAIR') {
    return { allowed: true };
  }

  // 4. Todos os outros itens requerem que a mesa esteja posicionada
  if (!placedItems.DESK_BASE) {
    return {
      allowed: false,
      isErrorPenalty: false,
      message: 'Posicione a mesa de trabalho antes de colocar periféricos sobre ela.',
    };
  }

  // 5. Regra da Torre do PC: só vai para a mesa com a montagem finalizada (PHASE_7_BOOT_POST)
  if (snapPointId === 'PC_TOWER' && context?.isPcAssembled === false) {
    return {
      allowed: false,
      isErrorPenalty: false,
      message:
        'Finalize a montagem do computador na bancada (incluindo os cabos internos) antes de levá-lo para a mesa.',
    };
  }

  // 6. Regra do Monitor com Braço Articulado: se o setup exigir braço articulado, MONITOR_ARM deve estar posto
  if (snapPointId === 'MONITOR_MAIN' && context?.studentSetup?.stand?.id === 'stand-gas-arm' && !placedItems.MONITOR_ARM) {
    return {
      allowed: false,
      isErrorPenalty: false,
      message:
        'O setup configurado requer o suporte articulado a gás (MONITOR_ARM) instalado na mesa antes de fixar o monitor.',
    };
  }

  // 7. Coerência com canRemoveFromDesk: o braço é fixado antes do monitor e o mousepad fica sob os periféricos
  if (snapPointId === 'MONITOR_ARM' && placedItems.MONITOR_MAIN) {
    return {
      allowed: false,
      isErrorPenalty: false,
      message: 'Retire o monitor da mesa antes de fixar o braço articulado; depois prenda o monitor no braço.',
    };
  }
  if (snapPointId === 'MOUSEPAD' && (placedItems.KEYBOARD || placedItems.MOUSE)) {
    return {
      allowed: false,
      isErrorPenalty: false,
      message: 'Retire o teclado e o mouse antes de estender o mousepad: eles ficam apoiados sobre ele.',
    };
  }

  return { allowed: true };
}

export interface RemovalValidationResult {
  allowed: boolean;
  message?: string;
}

export function canRemoveFromDesk(
  snapPointId: DeskSnapPointId,
  placedItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>
): RemovalValidationResult {
  // 1. Não pode remover DESK_BASE se houver itens apoiados nela
  if (snapPointId === 'DESK_BASE') {
    const desktopItems: DeskSnapPointId[] = [
      'PC_TOWER',
      'MONITOR_MAIN',
      'MONITOR_ARM',
      'MOUSEPAD',
      'KEYBOARD',
      'MOUSE',
      'HEADSET',
    ];
    const hasItemsOnDesk = desktopItems.some((id) => Boolean(placedItems[id]));
    if (hasItemsOnDesk) {
      return {
        allowed: false,
        message: 'Remova os periféricos e o gabinete antes de recolher a mesa de trabalho.',
      };
    }
  }

  // 2. Não pode remover MOUSEPAD se teclado ou mouse estiverem sobre ele
  if (snapPointId === 'MOUSEPAD') {
    if (placedItems.KEYBOARD || placedItems.MOUSE) {
      return {
        allowed: false,
        message: 'Remova o teclado e o mouse apoiados sobre o mousepad antes de retirá-lo.',
      };
    }
  }

  // 3. Não pode remover MONITOR_ARM se o monitor estiver nele
  if (snapPointId === 'MONITOR_ARM') {
    if (placedItems.MONITOR_MAIN) {
      return {
        allowed: false,
        message: 'Remova o monitor fixado no braço articulado antes de desinstalar o suporte.',
      };
    }
  }

  return { allowed: true };
}

export interface DeriveDeskStageParams {
  assembly: AssemblyState;
  selectedMotherboard: MotherboardComponent | null;
  deskSetup: DeskSetupState;
  isDeskPoweredOn?: boolean;
  externalCablesStatus?: {
    allRequiredConnected: boolean;
    hasPowerAc: boolean;
    hasDisplayCorrect: boolean;
  };
}

export function deriveDeskStage(params: DeriveDeskStageParams): DeskStage {
  const { assembly, selectedMotherboard, deskSetup, isDeskPoweredOn, externalCablesStatus } = params;

  // 1. LOCKED: PC ainda não está finalizado / pronto para o POST (PHASE_7_BOOT_POST)
  if (!isPcReadyForDesk(assembly, selectedMotherboard)) {
    return 'LOCKED';
  }

  // 2. FURNISHING: PC está pronto, mas faltam itens obrigatórios na mesa para uso
  const REQUIRED_BOOT_SNAP_POINTS: DeskSnapPointId[] = [
    'DESK_BASE',
    'PC_TOWER',
    'MONITOR_MAIN',
    'KEYBOARD',
    'MOUSE',
  ];

  const hasAllRequiredItems = REQUIRED_BOOT_SNAP_POINTS.every(
    (id) => Boolean(deskSetup.placedDeskItems[id])
  );

  if (!hasAllRequiredItems) {
    return 'FURNISHING';
  }

  // 3. CABLING: Todos os itens estão na mesa, mas cabeamento externo incompleto ou incorreto
  const isCablingReady =
    Boolean(externalCablesStatus) &&
    Boolean(externalCablesStatus?.allRequiredConnected) &&
    Boolean(externalCablesStatus?.hasPowerAc) &&
    Boolean(externalCablesStatus?.hasDisplayCorrect);

  if (!isCablingReady) {
    return 'CABLING';
  }

  // 4. READY_TO_BOOT ou RUNNING
  const isPowered = isDeskPoweredOn ?? deskSetup.isDeskPoweredOn;
  if (isPowered) {
    return 'RUNNING';
  }

  return 'READY_TO_BOOT';
}
