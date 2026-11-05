import { CaseComponent } from '@/engine/types';
import { DeskSnapPointId, PlacedDeskItem } from '@/engine/deskSetup';
import type { FitAxis } from './FittedModel';

/**
 * Como cada item da mesa é desenhado em 3D, em METROS e com a frente voltada para o aluno (+Z).
 * As rotações compensam os eixos arbitrários dos GLBs (medidos das bounding boxes e conferidos
 * visualmente na cena); `size` é a dimensão real do produto no eixo `fitAxis`.
 */
export interface DeskModelSpec {
  url: string;
  fitAxis: FitAxis;
  size: number;
  rotation?: [number, number, number];
  /** Cópias extras com deslocamento em X (ex.: par de caixas de som) */
  copiesX?: number[];
  /** Monitores: malha da tela que recebe a CanvasTexture e a proporção do painel */
  screen?: { materialName: string; uAxis: 'x' | 'z'; aspect: number };
}

const OFFICE_SCREEN = { materialName: 'Display', uAxis: 'x' as const, aspect: 16 / 9 };

/** Gabinete do aluno: mesma regra visual da bancada 3D (Micro-ATX/ITX → compacto) */
export function caseModelUrlFor(caseInstalled: CaseComponent | null): string {
  return caseInstalled && !caseInstalled.supportedFormFactors.includes('ATX')
    ? '/models/case-compacto.glb'
    : '/models/case-corsair-4000d.glb';
}

const MODELS_BY_ITEM_ID: Record<string, DeskModelSpec> = {
  // Monitores (largura do painel)
  'mon-24-75hz': { url: '/models/monitor-24-office.glb', fitAxis: 'x', size: 0.54, screen: OFFICE_SCREEN },
  // monitor-27-gamer.glb contém DOIS monitores (curvo + plano): usa o modelo de monitor único
  'mon-27-180hz': { url: '/models/monitor-24-office.glb', fitAxis: 'x', size: 0.61, screen: OFFICE_SCREEN },
  'mon-34-ultrawide': {
    url: '/models/monitor-ultrawide.glb',
    fitAxis: 'x',
    size: 0.81,
    rotation: [0, Math.PI / 2, 0],
    // Tela curva com a largura no eixo Z do modelo
    screen: { materialName: 'Material.003', uAxis: 'z', aspect: 21 / 9 },
  },
  // Teclados (largura)
  'kb-membrane-office': { url: '/models/teclado-membrana.glb', fitAxis: 'x', size: 0.44 },
  // teclado-mecanico.glb inclui um cabo enrolado que distorce o encaixe: usa o modelo compacto
  'kb-mech-tkl-red': { url: '/models/teclado-mecanico-custom.glb', fitAxis: 'x', size: 0.36 },
  'kb-mech-60-blue': { url: '/models/teclado-mecanico-custom.glb', fitAxis: 'x', size: 0.3 },
  // Mouses (comprimento ao longo de Z)
  'mouse-gamer-65g': { url: '/models/mouse-gamer.glb', fitAxis: 'z', size: 0.125, rotation: [0, Math.PI / 2, 0] },
  'mouse-vertical-office': { url: '/models/mouse-gamer.glb', fitAxis: 'z', size: 0.12, rotation: [0, Math.PI / 2, 0] },
  // Áudio (altura)
  'audio-headset-71': { url: '/models/headphone-estudio.glb', fitAxis: 'y', size: 0.2 },
  'audio-wood-speakers': { url: '/models/caixas-madeira.glb', fitAxis: 'y', size: 0.2, copiesX: [-0.055, 0.055] },
  // Cadeiras (altura total)
  'chair-ergonomic-mesh': { url: '/models/cadeira-escritorio.glb', fitAxis: 'y', size: 1.05 },
  'chair-gamer-recline': { url: '/models/cadeira-escritorio.glb', fitAxis: 'y', size: 1.15 },
};

const FALLBACK_BY_SNAP: Partial<Record<DeskSnapPointId, DeskModelSpec>> = {
  MONITOR_MAIN: MODELS_BY_ITEM_ID['mon-27-180hz'],
  KEYBOARD: MODELS_BY_ITEM_ID['kb-membrane-office'],
  MOUSE: MODELS_BY_ITEM_ID['mouse-gamer-65g'],
  HEADSET: MODELS_BY_ITEM_ID['audio-headset-71'],
  CHAIR: MODELS_BY_ITEM_ID['chair-ergonomic-mesh'],
};

/**
 * Modelo GLB do item, ou null quando o item é desenhado proceduralmente
 * (mesa, mousepad, braço articulado e o PC, que depende do gabinete montado).
 */
export function deskModelFor(snapPointId: DeskSnapPointId, item: PlacedDeskItem): DeskModelSpec | null {
  return MODELS_BY_ITEM_ID[item.itemId] ?? FALLBACK_BY_SNAP[snapPointId] ?? null;
}

/** Altura real da torre (m) por tipo de gabinete */
export function towerHeightFor(caseInstalled: CaseComponent | null): number {
  return caseInstalled && !caseInstalled.supportedFormFactors.includes('ATX') ? 0.4 : 0.47;
}
