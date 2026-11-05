import { CaseComponent } from '@/engine/types';
import { DeskSnapPointId, PlacedDeskItem } from '@/engine/deskSetup';
import { DeskModelSpec as EngineDeskModelSpec, caseModelIdFor, deskModelSpecFor } from '@/engine/deskGeometry';

export { towerHeightFor } from '@/engine/deskGeometry';

/**
 * Adaptador da cena: as medidas e rotações vêm do motor (src/engine/deskGeometry.ts), que é
 * a mesma fonte usada pelos testes de encaixe de todas as combinações de periféricos.
 */
export interface DeskModelSpec extends EngineDeskModelSpec {
  url: string;
}

const modelUrl = (modelId: string) => `/models/${modelId}.glb`;

/** Gabinete do aluno: mesma regra visual da bancada 3D (Micro-ATX/ITX → compacto) */
export function caseModelUrlFor(caseInstalled: CaseComponent | null): string {
  return modelUrl(caseModelIdFor(caseInstalled));
}

/**
 * Modelo GLB do item, ou null quando o item é desenhado proceduralmente
 * (mesa, mousepad, braço articulado e o PC, que depende do gabinete montado).
 */
export function deskModelFor(snapPointId: DeskSnapPointId, item: PlacedDeskItem): DeskModelSpec | null {
  const spec = deskModelSpecFor(snapPointId, item);
  return spec ? { ...spec, url: modelUrl(spec.modelId) } : null;
}
