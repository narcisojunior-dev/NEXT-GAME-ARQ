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

  // 1. A mesa e a cadeira assentam diretamente no chão
  if (snapPointId === 'DESK_BASE' || snapPointId === 'CHAIR') {
    // Validação de categoria para a mesa e cadeira
    const itemCat = typeof item === 'object' && item !== null && 'category' in item
      ? (item as { category: string }).category
      : typeof item === 'string'
      ? item
      : '';
    if (itemCat && !spec.allowedCategories.includes(itemCat)) {
      return {
        allowed: false,
        isErrorPenalty: true,
        message: `O snap point ${spec.label} aceita apenas itens da categoria ${spec.allowedCategories.join(' ou ')}.`,
      };
    }
    return { allowed: true };
  }

  // 2. Todos os outros itens requerem que a mesa esteja posicionada
  if (!placedItems.DESK_BASE) {
    return {
      allowed: false,
      isErrorPenalty: false,
      message: 'Posicione a mesa de trabalho antes de colocar periféricos sobre ela.',
    };
  }

  // 3. Extrai categoria do item
  let itemCategory = '';
  if (typeof item === 'object' && item !== null && 'category' in item) {
    itemCategory = (item as { category: string }).category;
  } else if (typeof item === 'string') {
    itemCategory = item;
  }

  // 4. Validação estrita de categoria compatível
  if (itemCategory && !spec.allowedCategories.includes(itemCategory)) {
    return {
      allowed: false,
      isErrorPenalty: true,
      message: `O snap point ${spec.label} aceita apenas itens da categoria ${spec.allowedCategories.join(' ou ')}.`,
    };
  }

  // 5. Regra da Torre do PC: só pode colocar na mesa se a montagem estiver finalizada
  if (snapPointId === 'PC_TOWER') {
    if (context && context.isPcAssembled === false) {
      return {
        allowed: false,
        isErrorPenalty: false,
        message: 'Finalize a montagem do computador na bancada antes de levá-lo para a mesa.',
      };
    }
  }

  // 6. Regra do Monitor com Braço Articulado: se o setup exigir braço articulado, MONITOR_ARM deve estar posto
  if (snapPointId === 'MONITOR_MAIN') {
    if (context && context.studentSetup?.stand?.id === 'stand-gas-arm' && !placedItems.MONITOR_ARM) {
      return {
        allowed: false,
        isErrorPenalty: false,
        message: 'O setup configurado requer o suporte articulado a gás (MONITOR_ARM) instalado na mesa antes de fixar o monitor.',
      };
    }
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

  // 1. LOCKED: PC ainda não está finalizado / pronto para o POST
  const isPcAssembled =
    Boolean(selectedMotherboard) &&
    Boolean(assembly.cpuInstalled) &&
    Boolean(assembly.coolerInstalled) &&
    Boolean(assembly.socketLeverLocked) &&
    (Boolean(assembly.ramInstalledSlot2) || Boolean(assembly.ramInstalledSlot4)) &&
    Boolean(assembly.caseInstalled) &&
    Boolean(assembly.psuInstalled) &&
    (Boolean(assembly.cpuInstalled?.hasIntegratedGpu) || Boolean(assembly.gpuInstalled));

  if (!isPcAssembled) {
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
