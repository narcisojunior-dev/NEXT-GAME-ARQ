import MODELS_DATA from './models3d.data.json';
import { AVAILABLE_MODELS_INDEX } from './models3dIndex';

/** Licenças aceitas (RNF10): permitem uso e modificação com crédito ao autor */
export const ALLOWED_3D_LICENSES = ['CC-BY-4.0', 'CC-BY-SA-4.0', 'CC0-1.0'] as const;
export type Model3DLicense = (typeof ALLOWED_3D_LICENSES)[number];

/** Orçamento por modelo para manter 60 FPS em vídeo integrado (RNF07) */
export const MAX_MODEL_FACES = 30000;

export type Model3DCategory =
  | 'CPU'
  | 'MOTHERBOARD'
  | 'RAM'
  | 'COOLER'
  | 'FAN'
  | 'GPU'
  | 'STORAGE'
  | 'PSU'
  | 'CASE'
  | 'MONITOR'
  | 'KEYBOARD'
  | 'MOUSE'
  | 'MOUSEPAD'
  | 'AUDIO'
  | 'GAMEPAD'
  | 'STAND'
  | 'WEBCAM'
  | 'MICROPHONE'
  | 'CHAIR'
  | 'DESK';

export interface Model3D {
  id: string;
  /** Identificador do modelo no Sketchfab */
  uid: string;
  name: string;
  author: string;
  license: Model3DLicense;
  faces: number;
  group: 'COMPONENT' | 'PERIPHERAL';
  category: Model3DCategory;
  /** Ids do catálogo (hardware ou periféricos) representados por este modelo */
  targets: string[];
  /** O modelo representa a categoria, mas não é exatamente o produto do catálogo */
  illustrative: boolean;
  note: string;
}

/**
 * Manifesto gerado a partir de docs/modelos-3d.md (curadoria com licença e peso verificados).
 * Fonte única: models3d.data.json.
 */
export const MODELS_3D = MODELS_DATA as Model3D[];

/**
 * Modelos já baixados e otimizados em public/models (arquivo regenerado por `npm run models:optimize`)
 */
export const AVAILABLE_MODEL_IDS: ReadonlySet<string> = new Set(AVAILABLE_MODELS_INDEX.map((entry) => entry.id));

export const CATEGORY_3D_LABELS: Record<Model3DCategory, string> = {
  CPU: 'Processadores',
  MOTHERBOARD: 'Placas-mãe',
  RAM: 'Memórias',
  COOLER: 'Coolers',
  FAN: 'Ventoinhas',
  GPU: 'Placas de vídeo',
  STORAGE: 'Armazenamento',
  PSU: 'Fontes',
  CASE: 'Gabinetes',
  MONITOR: 'Monitores',
  KEYBOARD: 'Teclados',
  MOUSE: 'Mouses',
  MOUSEPAD: 'Mousepads',
  AUDIO: 'Áudio',
  GAMEPAD: 'Gamepads',
  STAND: 'Suportes',
  WEBCAM: 'Webcams',
  MICROPHONE: 'Microfones',
  CHAIR: 'Cadeiras',
  DESK: 'Mesas',
};

export const LICENSE_LABELS: Record<Model3DLicense, string> = {
  'CC-BY-4.0': 'CC BY 4.0',
  'CC-BY-SA-4.0': 'CC BY-SA 4.0',
  'CC0-1.0': 'CC0',
};

/** Modelo que representa uma peça do catálogo, ou null quando não há modelo fiel ao formato real */
export function findModel3D(catalogId: string): Model3D | null {
  return MODELS_3D.find((model) => model.targets.includes(catalogId)) ?? null;
}

export function isModelAvailable(modelId: string, available: ReadonlySet<string> = AVAILABLE_MODEL_IDS): boolean {
  return available.has(modelId);
}

export function getAvailableModels(available: ReadonlySet<string> = AVAILABLE_MODEL_IDS): Model3D[] {
  return MODELS_3D.filter((model) => available.has(model.id));
}

export const modelSourceUrl = (model: Model3D) => `https://sketchfab.com/3d-models/${model.uid}`;
export const modelAuthorUrl = (model: Model3D) => `https://sketchfab.com/${model.author}`;
export const modelFileUrl = (model: Model3D) => `/models/${model.id}.glb`;
