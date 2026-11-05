import { AssemblyState, MotherboardComponent } from './types';
import { derivePhase } from './phases';
import { CHAIRS, DESKS, MOUSEPADS, PeripheralItem, StudentSetupConfig } from './peripheralsCatalog';

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
  /**
   * Posição nominal em metros (1 unidade de mundo = 1 m) na mesa de referência de 140 cm.
   * Use getSnapPointPosition() para a posição na mesa realmente posicionada (X empacotado).
   */
  nominalPosition: [number, number, number];
  /** Rotação em Y (radianos): frente do item voltada para o aluno (+Z) por padrão */
  nominalRotation?: [number, number, number];
  /** Área ocupada no plano [largura em X, profundidade em Z], em metros (hologramas e colisões) */
  footprint: [number, number];
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

/* ------------------------------------------------------------------------------------
 * Geometria da estação (metros). A mesa fica centrada na origem, frente voltada para +Z
 * (lado do aluno), tampo a 75 cm do chão (altura ergonômica padrão).
 * ------------------------------------------------------------------------------------ */
export const DESK_TOP_HEIGHT = 0.75;
export const DESK_DEPTH = 0.6;
/** Largura da mesa de referência usada nas posições nominais */
export const REFERENCE_DESK_WIDTH = 1.4;

/** Largura (m) de cada mesa do catálogo */
export const DESK_WIDTH_BY_ID: Record<string, number> = {
  'desk-gamer-carbon': 1.4,
  'desk-wood-minimal': 1.2,
};

export const DESK_SNAP_POINTS: Record<DeskSnapPointId, DeskSnapPointSpec> = {
  DESK_BASE: {
    id: 'DESK_BASE',
    label: 'Mesa de Trabalho',
    nominalPosition: [0, 0, 0],
    nominalRotation: [0, 0, 0],
    footprint: [REFERENCE_DESK_WIDTH, DESK_DEPTH],
    isRequiredForBoot: true,
    allowedCategories: ['DESK'],
  },
  PC_TOWER: {
    id: 'PC_TOWER',
    label: 'Gabinete do PC (Torre)',
    // Lado direito do tampo, painel traseiro (portas) voltado para a parede
    nominalPosition: [0.56, DESK_TOP_HEIGHT, -0.03],
    nominalRotation: [0, 0, 0],
    footprint: [0.23, 0.47],
    isRequiredForBoot: true,
    allowedCategories: ['PC_TOWER', 'CASE'],
    parentSnapPoint: 'DESK_BASE',
  },
  MONITOR_MAIN: {
    id: 'MONITOR_MAIN',
    label: 'Monitor Principal',
    // Recuado o bastante para a base não pisar no mousepad
    nominalPosition: [-0.015, DESK_TOP_HEIGHT, -0.195],
    nominalRotation: [0, 0, 0],
    footprint: [0.3, 0.18],
    isRequiredForBoot: true,
    allowedCategories: ['MONITOR'],
    parentSnapPoint: 'DESK_BASE',
  },
  MONITOR_ARM: {
    id: 'MONITOR_ARM',
    label: 'Braço Articulado do Monitor',
    // Grampo preso na borda traseira do tampo
    nominalPosition: [-0.015, DESK_TOP_HEIGHT, -0.25],
    nominalRotation: [0, 0, 0],
    footprint: [0.12, 0.1],
    isRequiredForBoot: false,
    allowedCategories: ['STAND'],
    parentSnapPoint: 'DESK_BASE',
  },
  MOUSEPAD: {
    id: 'MOUSEPAD',
    label: 'Mousepad Gamer / Deskmat',
    nominalPosition: [-0.045, DESK_TOP_HEIGHT, 0.095],
    nominalRotation: [0, 0, 0],
    footprint: [0.9, 0.4],
    isRequiredForBoot: false,
    allowedCategories: ['MOUSEPAD'],
    parentSnapPoint: 'DESK_BASE',
  },
  KEYBOARD: {
    id: 'KEYBOARD',
    label: 'Teclado',
    nominalPosition: [-0.115, DESK_TOP_HEIGHT + 0.004, 0.12],
    nominalRotation: [0, 0, 0],
    footprint: [0.36, 0.13],
    isRequiredForBoot: true,
    allowedCategories: ['KEYBOARD'],
    parentSnapPoint: 'DESK_BASE',
  },
  MOUSE: {
    id: 'MOUSE',
    label: 'Mouse',
    nominalPosition: [0.285, DESK_TOP_HEIGHT + 0.004, 0.13],
    nominalRotation: [0, 0, 0],
    footprint: [0.07, 0.12],
    isRequiredForBoot: true,
    allowedCategories: ['MOUSE'],
    parentSnapPoint: 'DESK_BASE',
  },
  HEADSET: {
    id: 'HEADSET',
    label: 'Headset / Áudio',
    // Canto traseiro esquerdo, atrás do mousepad
    nominalPosition: [-0.555, DESK_TOP_HEIGHT, -0.2],
    nominalRotation: [0, 0.3, 0],
    footprint: [0.19, 0.1],
    isRequiredForBoot: false,
    allowedCategories: ['AUDIO'],
    parentSnapPoint: 'DESK_BASE',
  },
  CHAIR: {
    id: 'CHAIR',
    label: 'Cadeira do Aluno',
    nominalPosition: [-0.115, 0, 0.75],
    nominalRotation: [0, Math.PI, 0],
    footprint: [0.65, 0.65],
    isRequiredForBoot: false,
    allowedCategories: ['CHAIR'],
  },
};

/** Largura da mesa posicionada (ou a de referência, se ainda não houver mesa) */
export function getDeskWidth(placedItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>): number {
  const deskId = placedItems.DESK_BASE?.itemId;
  return (deskId && DESK_WIDTH_BY_ID[deskId]) || REFERENCE_DESK_WIDTH;
}

/* ------------------------------------------------------------------------------------
 * Arranjo da mesa: as posições em X são EMPACOTADAS a partir das larguras reais reservadas
 * (zona de áudio à esquerda, monitor, torre à direita; mousepad, teclado e mouse na frente).
 * As reservas cobrem o maior item de cada categoria (validado em deskGeometry.test.ts), então
 * nenhum item muda de lugar quando outro é posicionado e nenhuma combinação se sobrepõe.
 * ------------------------------------------------------------------------------------ */
/** Folga até a borda do tampo e entre itens vizinhos (m) */
export const DESK_EDGE_MARGIN = 0.02;
export const DESK_ITEM_GAP = 0.01;
/** Larguras reservadas (m): maior gabinete, maior dispositivo de áudio, maior monitor, maior mousepad */
export const TOWER_ZONE_WIDTH = 0.24;
export const AUDIO_ZONE_WIDTH = 0.25;
export const MONITOR_ZONE_WIDTH = 0.82;
export const MOUSEPAD_ZONE_WIDTH = 0.9;

/** Largura mínima de tampo para a torre ficar sobre a mesa junto com áudio e monitor */
export const MIN_DESK_WIDTH_FOR_TOWER_ON_TOP =
  2 * DESK_EDGE_MARGIN + AUDIO_ZONE_WIDTH + MONITOR_ZONE_WIDTH + TOWER_ZONE_WIDTH + 2 * DESK_ITEM_GAP;

/**
 * Em mesas compactas (120 cm) a torre não cabe ao lado de um monitor ultrawide e do áudio:
 * ela fica no chão, ao lado direito da mesa — como nos laboratórios de informática reais.
 */
export function isTowerOnFloor(deskWidth: number): boolean {
  return deskWidth < MIN_DESK_WIDTH_FOR_TOWER_ON_TOP;
}

/** Posições relativas na frente: mousepad à frente do monitor, teclado à esquerda do centro do pad e mouse à direita */
const PAD_OFFSET_FROM_MONITOR = -0.03;
const KEYBOARD_OFFSET_FROM_PAD = -0.07;
const MOUSE_OFFSET_FROM_PAD = 0.33;

const clamp = (v: number, lo: number, hi: number) => (lo <= hi ? Math.min(hi, Math.max(lo, v)) : (lo + hi) / 2);

interface DeskRowLayout {
  towerX: number;
  monitorX: number;
  audioX: number;
  padX: number;
}

function deskRowLayout(deskWidth: number): DeskRowLayout {
  const half = deskWidth / 2;
  const onFloor = isTowerOnFloor(deskWidth);
  const towerX = onFloor ? half + DESK_EDGE_MARGIN + TOWER_ZONE_WIDTH / 2 : half - DESK_EDGE_MARGIN - TOWER_ZONE_WIDTH / 2;
  // Limite direito livre do tampo (a torre sobre a mesa ocupa a faixa direita inteira, de trás até a frente)
  const rightLimit = onFloor ? half - DESK_EDGE_MARGIN : towerX - TOWER_ZONE_WIDTH / 2 - DESK_ITEM_GAP;
  const audioX = -half + DESK_EDGE_MARGIN + AUDIO_ZONE_WIDTH / 2;
  const monitorX = clamp(
    DESK_SNAP_POINTS.MONITOR_MAIN.nominalPosition[0],
    audioX + AUDIO_ZONE_WIDTH / 2 + DESK_ITEM_GAP + MONITOR_ZONE_WIDTH / 2,
    rightLimit - MONITOR_ZONE_WIDTH / 2
  );
  // Mousepad centrado à frente do monitor (levemente à direita, onde fica o mouse)
  const padX = clamp(
    monitorX + PAD_OFFSET_FROM_MONITOR,
    -half + DESK_EDGE_MARGIN + MOUSEPAD_ZONE_WIDTH / 2,
    rightLimit - MOUSEPAD_ZONE_WIDTH / 2
  );
  return { towerX, monitorX, audioX, padX };
}

/**
 * Posição do snap point na mesa de largura `deskWidth` (metros). Y é a base do item:
 * tampo para os itens de mesa, chão para mesa, cadeira e a torre em mesas compactas.
 */
export function getSnapPointPosition(
  snapPointId: DeskSnapPointId,
  deskWidth: number = REFERENCE_DESK_WIDTH
): [number, number, number] {
  const [, y, z] = DESK_SNAP_POINTS[snapPointId].nominalPosition;
  const row = deskRowLayout(deskWidth);
  switch (snapPointId) {
    case 'DESK_BASE':
      return [0, y, z];
    case 'PC_TOWER':
      return [row.towerX, isTowerOnFloor(deskWidth) ? 0 : y, z];
    case 'MONITOR_MAIN':
    case 'MONITOR_ARM':
      return [row.monitorX, y, z];
    case 'HEADSET':
      return [row.audioX, y, z];
    case 'MOUSEPAD':
      return [row.padX, y, z];
    case 'KEYBOARD':
    case 'CHAIR':
      return [row.padX + KEYBOARD_OFFSET_FROM_PAD, y, z];
    case 'MOUSE':
      return [row.padX + MOUSE_OFFSET_FROM_PAD, y, z];
  }
}

export function createInitialDeskSetupState(): DeskSetupState {
  return {
    placedDeskItems: {},
    isDeskPoweredOn: false,
    deskCameraPreset: 'setup-wide',
  };
}

export interface PlaceOnDeskContext {
  isPcAssembled?: boolean;
  /** Passos da bancada que faltam (para dizer exatamente o que impede levar o PC) */
  pendingBenchSteps?: string[];
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
        context.pendingBenchSteps && context.pendingBenchSteps.length > 0
          ? `Finalize a montagem do computador na bancada antes de levá-lo para a mesa. Falta: ${context.pendingBenchSteps.join('; ')}.`
          : 'Finalize a montagem do computador na bancada (incluindo os cabos internos) antes de levá-lo para a mesa.',
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
  /** Resultado do POST do PC montado (false = travou no POST e não carrega o sistema) */
  postBootSuccess?: boolean;
}

/** Itens que precisam estar na mesa para o computador ser usado */
export const REQUIRED_BOOT_SNAP_POINTS: readonly DeskSnapPointId[] = [
  'DESK_BASE',
  'PC_TOWER',
  'MONITOR_MAIN',
  'KEYBOARD',
  'MOUSE',
];

export function hasRequiredDeskItems(placedItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>): boolean {
  return REQUIRED_BOOT_SNAP_POINTS.every((id) => Boolean(placedItems[id]));
}

export interface PowerOnValidationResult {
  allowed: boolean;
  message?: string;
}

/**
 * O PC liga quando está montado, na mesa e com o cabo de força na tomada — mesmo com o cabo de
 * vídeo errado ou ausente. É exatamente assim que o aluno descobre o "SEM SINAL" no monitor.
 * "Em execução" (RUNNING) continua exigindo todo o cabeamento correto (deriveDeskStage).
 */
export function canPowerOnDesk(params: DeriveDeskStageParams): PowerOnValidationResult {
  const { assembly, selectedMotherboard, deskSetup, externalCablesStatus } = params;
  if (!isPcReadyForDesk(assembly, selectedMotherboard)) {
    return { allowed: false, message: 'Finalize a montagem do PC na bancada antes de ligá-lo na mesa.' };
  }
  if (!hasRequiredDeskItems(deskSetup.placedDeskItems)) {
    return { allowed: false, message: 'Posicione mesa, gabinete, monitor, teclado e mouse antes de ligar o computador.' };
  }
  if (!externalCablesStatus?.hasPowerAc) {
    return {
      allowed: false,
      message: 'O computador está sem energia: conecte o cabo de força da fonte (C13/C14) na tomada da parede.',
    };
  }
  return { allowed: true };
}

export function deriveDeskStage(params: DeriveDeskStageParams): DeskStage {
  const { assembly, selectedMotherboard, deskSetup, isDeskPoweredOn, externalCablesStatus } = params;

  // 1. LOCKED: PC ainda não está finalizado / pronto para o POST (PHASE_7_BOOT_POST)
  if (!isPcReadyForDesk(assembly, selectedMotherboard)) {
    return 'LOCKED';
  }

  // 2. FURNISHING: PC está pronto, mas faltam itens obrigatórios na mesa para uso
  const hasAllRequiredItems = hasRequiredDeskItems(deskSetup.placedDeskItems);

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
    // Ligado, mas travado no POST: o sistema não carrega (a tela mostra o erro do POST)
    return params.postBootSuccess === false ? 'READY_TO_BOOT' : 'RUNNING';
  }

  return 'READY_TO_BOOT';
}

/* ------------------------------------------------------------------------------------
 * Hologramas de encaixe (Issue 03): estado de cada snap point para o item em mãos
 * ------------------------------------------------------------------------------------ */
export type DeskSnapPointStatus =
  /** Nenhum item em mãos e espaço livre */
  | 'EMPTY'
  /** O item em mãos pode ser posicionado aqui agora */
  | 'AVAILABLE'
  /** O item é deste espaço, mas falta um pré-requisito (mensagem explica qual) */
  | 'BLOCKED'
  /** O item em mãos não pertence a este espaço */
  | 'INCOMPATIBLE'
  /** Já existe um item posicionado */
  | 'OCCUPIED';

export interface DeskSnapPointState {
  snapPointId: DeskSnapPointId;
  status: DeskSnapPointStatus;
  message?: string;
}

export const DESK_SNAP_POINT_IDS: readonly DeskSnapPointId[] = [
  'DESK_BASE',
  'PC_TOWER',
  'MONITOR_ARM',
  'MONITOR_MAIN',
  'MOUSEPAD',
  'KEYBOARD',
  'MOUSE',
  'HEADSET',
  'CHAIR',
];

export function evaluateDeskSnapPoints(
  item: unknown | null,
  placedItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>,
  context?: PlaceOnDeskContext
): Record<DeskSnapPointId, DeskSnapPointState> {
  const category = item === null ? '' : getItemCategory(item);
  const evaluate = (id: DeskSnapPointId): DeskSnapPointState => {
    const occupant = placedItems[id];
    if (occupant) return { snapPointId: id, status: 'OCCUPIED', message: `Ocupado por ${occupant.name}.` };
    if (item === null) return { snapPointId: id, status: 'EMPTY' };
    if (!DESK_SNAP_POINTS[id].allowedCategories.includes(category)) return { snapPointId: id, status: 'INCOMPATIBLE' };
    const validation = canPlaceOnDesk(id, item, placedItems, context);
    return validation.allowed
      ? { snapPointId: id, status: 'AVAILABLE' }
      : { snapPointId: id, status: 'BLOCKED', message: validation.message };
  };
  return {
    DESK_BASE: evaluate('DESK_BASE'),
    PC_TOWER: evaluate('PC_TOWER'),
    MONITOR_ARM: evaluate('MONITOR_ARM'),
    MONITOR_MAIN: evaluate('MONITOR_MAIN'),
    MOUSEPAD: evaluate('MOUSEPAD'),
    KEYBOARD: evaluate('KEYBOARD'),
    MOUSE: evaluate('MOUSE'),
    HEADSET: evaluate('HEADSET'),
    CHAIR: evaluate('CHAIR'),
  };
}

/* ------------------------------------------------------------------------------------
 * Inventário da mesa: itens do setup do aluno a posicionar, na ordem física de montagem
 * ------------------------------------------------------------------------------------ */
export interface DeskInventoryEntry {
  targetSnapPoint: DeskSnapPointId;
  item: PlacedDeskItem;
}

/** Id fixo do PC que o aluno montou na bancada */
export const STUDENT_PC_ITEM_ID = 'student-pc';

const toPlaced = (snapPointId: DeskSnapPointId, item: PeripheralItem): PlacedDeskItem => ({
  snapPointId,
  itemId: item.id,
  name: item.name,
  category: item.category,
  price: item.price,
});

export function buildDeskInventory(setup: StudentSetupConfig): DeskInventoryEntry[] {
  const entries: DeskInventoryEntry[] = [];
  const add = (snapPointId: DeskSnapPointId, item: PeripheralItem) =>
    entries.push({ targetSnapPoint: snapPointId, item: toPlaced(snapPointId, item) });

  add('DESK_BASE', setup.desk ?? DESKS[0]);
  add('CHAIR', setup.chair ?? CHAIRS[0]);
  entries.push({
    targetSnapPoint: 'PC_TOWER',
    item: {
      snapPointId: 'PC_TOWER',
      itemId: STUDENT_PC_ITEM_ID,
      name: 'Seu PC (montado na bancada)',
      category: 'PC_TOWER',
      price: 0,
    },
  });
  // O suporte de mesa padrão é a própria base do monitor: só o braço a gás é um item separado
  if (setup.stand.id === 'stand-gas-arm') add('MONITOR_ARM', setup.stand);
  add('MONITOR_MAIN', setup.monitor);
  add('MOUSEPAD', setup.mousepad ?? MOUSEPADS[0]);
  add('KEYBOARD', setup.keyboard);
  add('MOUSE', setup.mouse);
  add('HEADSET', setup.audio);
  return entries;
}
