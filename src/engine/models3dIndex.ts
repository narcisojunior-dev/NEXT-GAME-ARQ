import AVAILABLE_INDEX from './models3d.available.json';

/**
 * Índice mínimo dos modelos 3D já baixados e otimizados, usado na carga inicial do jogo
 * (botões "3D" e "Vitrine 3D"). O manifesto completo (models3d.ts) só é carregado com o
 * visualizador, para não pesar a primeira carga (RNF08).
 *
 * models3d.available.json é regenerado por `npm run models:optimize`.
 */
export interface AvailableModelEntry {
  id: string;
  targets: string[];
}

export const AVAILABLE_MODELS_INDEX = AVAILABLE_INDEX as AvailableModelEntry[];

/** Modelo baixado que representa a peça do catálogo, ou null */
export function findAvailableModelId(catalogId: string, index: AvailableModelEntry[] = AVAILABLE_MODELS_INDEX): string | null {
  return index.find((entry) => entry.targets.includes(catalogId))?.id ?? null;
}

export function hasAvailableModels(index: AvailableModelEntry[] = AVAILABLE_MODELS_INDEX): boolean {
  return index.length > 0;
}

/** Monta o índice a partir do manifesto e dos arquivos presentes em public/models */
export function buildAvailableIndex(models: { id: string; targets: string[] }[], downloadedIds: string[]): AvailableModelEntry[] {
  const downloaded = new Set(downloadedIds);
  return models.filter((m) => downloaded.has(m.id)).map((m) => ({ id: m.id, targets: m.targets }));
}
