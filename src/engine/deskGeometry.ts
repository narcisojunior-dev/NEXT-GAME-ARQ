import { CaseComponent } from './types';
import {
  DESK_DEPTH,
  DESK_SNAP_POINTS,
  DESK_TOP_HEIGHT,
  DESK_WIDTH_BY_ID,
  DeskSnapPointId,
  PlacedDeskItem,
  REFERENCE_DESK_WIDTH,
  getSnapPointPosition,
} from './deskSetup';
import { Aabb, FitAxis, Vec3, fittedExtents, modelDimensions, placedBox } from './geometry3d';

/**
 * Como cada item da mesa é desenhado em 3D (metros, frente para o aluno em +Z) e onde ele fica.
 * Fonte única para a cena da mesa e para os testes de encaixe de todas as combinações de periféricos.
 * As rotações compensam os eixos de cada GLB (medidos e conferidos visualmente).
 */
export interface DeskModelSpec {
  modelId: string;
  fitAxis: FitAxis;
  size: number;
  rotation?: Vec3;
  /** Cópias extras com deslocamento em X (ex.: par de caixas de som) */
  copiesX?: number[];
  /** Monitores: malha da tela que recebe a CanvasTexture e a proporção do painel */
  screen?: { materialName: string; uAxis: 'x' | 'z'; aspect: number };
}

const OFFICE_SCREEN = { materialName: 'Display', uAxis: 'x' as const, aspect: 16 / 9 };

export const DESK_MODELS_BY_ITEM_ID: Record<string, DeskModelSpec> = {
  // Monitores (largura do painel). monitor-27-gamer.glb contém DOIS monitores: usa o modelo de monitor único
  'mon-24-75hz': { modelId: 'monitor-24-office', fitAxis: 'x', size: 0.54, screen: OFFICE_SCREEN },
  'mon-27-180hz': { modelId: 'monitor-24-office', fitAxis: 'x', size: 0.61, screen: OFFICE_SCREEN },
  'mon-34-ultrawide': {
    modelId: 'monitor-ultrawide',
    fitAxis: 'x',
    size: 0.81,
    rotation: [0, Math.PI / 2, 0],
    screen: { materialName: 'Material.003', uAxis: 'z', aspect: 21 / 9 },
  },
  // Teclados (largura). teclado-mecanico.glb inclui um cabo enrolado que distorce o encaixe
  'kb-membrane-office': { modelId: 'teclado-membrana', fitAxis: 'x', size: 0.44 },
  'kb-mech-tkl-red': { modelId: 'teclado-mecanico-custom', fitAxis: 'x', size: 0.36 },
  'kb-mech-60-blue': { modelId: 'teclado-mecanico-custom', fitAxis: 'x', size: 0.3 },
  // Mouses (comprimento ao longo de Z)
  'mouse-gamer-65g': { modelId: 'mouse-gamer', fitAxis: 'z', size: 0.125, rotation: [0, Math.PI / 2, 0] },
  'mouse-vertical-office': { modelId: 'mouse-gamer', fitAxis: 'z', size: 0.12, rotation: [0, Math.PI / 2, 0] },
  // Áudio (altura)
  'audio-headset-71': { modelId: 'headphone-estudio', fitAxis: 'y', size: 0.2 },
  'audio-wood-speakers': { modelId: 'caixas-madeira', fitAxis: 'y', size: 0.2, copiesX: [-0.055, 0.055] },
  // Cadeiras (altura total)
  'chair-ergonomic-mesh': { modelId: 'cadeira-escritorio', fitAxis: 'y', size: 1.05 },
  'chair-gamer-recline': { modelId: 'cadeira-escritorio', fitAxis: 'y', size: 1.15 },
};

const FALLBACK_BY_SNAP: Partial<Record<DeskSnapPointId, DeskModelSpec>> = {
  MONITOR_MAIN: DESK_MODELS_BY_ITEM_ID['mon-27-180hz'],
  KEYBOARD: DESK_MODELS_BY_ITEM_ID['kb-membrane-office'],
  MOUSE: DESK_MODELS_BY_ITEM_ID['mouse-gamer-65g'],
  HEADSET: DESK_MODELS_BY_ITEM_ID['audio-headset-71'],
  CHAIR: DESK_MODELS_BY_ITEM_ID['chair-ergonomic-mesh'],
};

/** Modelo GLB do item, ou null quando ele é procedural (mesa, mousepad, braço e o PC) */
export function deskModelSpecFor(snapPointId: DeskSnapPointId, item: PlacedDeskItem): DeskModelSpec | null {
  return DESK_MODELS_BY_ITEM_ID[item.itemId] ?? FALLBACK_BY_SNAP[snapPointId] ?? null;
}

/** Gabinete do aluno: mesma regra visual da bancada (Micro-ATX/ITX → compacto) */
export function caseModelIdFor(caseInstalled: CaseComponent | null): string {
  return caseInstalled && !caseInstalled.supportedFormFactors.includes('ATX') ? 'case-compacto' : 'case-corsair-4000d';
}

/** Altura real da torre (m) */
export function towerHeightFor(caseInstalled: CaseComponent | null): number {
  return caseInstalled && !caseInstalled.supportedFormFactors.includes('ATX') ? 0.4 : 0.47;
}

/** Medidas (m) dos itens procedurais. Os dois mousepads têm 4 mm: teclado e mouse apoiam exatamente no topo */
export const MOUSEPAD_SIZE: Record<string, Vec3> = {
  'mousepad-speed-xl': [0.9, 0.004, 0.4],
  'mousepad-control-desk': [0.8, 0.004, 0.3],
};
export const MOUSEPAD_THICKNESS = 0.004;
/** Grampo + coluna do braço articulado */
export const MONITOR_ARM_SIZE: Vec3 = [0.09, 0.36, 0.09];

export interface DeskItemPlacement {
  snapPointId: DeskSnapPointId;
  box: Aabb;
}

/** Caixa ocupada por cada item posicionado (exatamente como a cena 3D o desenha) */
export function deskItemPlacements(
  placedItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>,
  caseInstalled: CaseComponent | null,
  deskWidth: number = (placedItems.DESK_BASE && DESK_WIDTH_BY_ID[placedItems.DESK_BASE.itemId]) || REFERENCE_DESK_WIDTH
): DeskItemPlacement[] {
  const out: DeskItemPlacement[] = [];
  (Object.keys(DESK_SNAP_POINTS) as DeskSnapPointId[]).forEach((snapPointId) => {
    const item = placedItems[snapPointId];
    if (!item) return;
    const position = getSnapPointPosition(snapPointId, deskWidth);
    const yaw = DESK_SNAP_POINTS[snapPointId].nominalRotation?.[1] ?? 0;
    let extents: Vec3;

    if (snapPointId === 'DESK_BASE') {
      // Volume inteiro da mesa (pés + tampo): nada pode atravessá-la
      extents = [deskWidth, DESK_TOP_HEIGHT, DESK_DEPTH];
    } else if (snapPointId === 'MOUSEPAD') {
      extents = MOUSEPAD_SIZE[item.itemId] ?? MOUSEPAD_SIZE['mousepad-speed-xl'];
    } else if (snapPointId === 'MONITOR_ARM') {
      extents = MONITOR_ARM_SIZE;
    } else if (snapPointId === 'PC_TOWER') {
      extents = fittedExtents({ dims: modelDimensions(caseModelIdFor(caseInstalled)), fitAxis: 'y', size: towerHeightFor(caseInstalled) });
    } else {
      const spec = deskModelSpecFor(snapPointId, item);
      if (!spec) return;
      const single = fittedExtents({ dims: modelDimensions(spec.modelId), rotation: spec.rotation, fitAxis: spec.fitAxis, size: spec.size });
      const offsets = spec.copiesX ?? [0];
      const span = Math.max(...offsets) - Math.min(...offsets);
      extents = [single[0] + span, single[1], single[2]];
    }
    out.push({ snapPointId, box: placedBox(extents, position, yaw) });
  });
  return out;
}
