import MODEL_DIMENSIONS_JSON from './modelDimensions.json';

/**
 * Geometria pura (sem three.js) para validar encaixes: caixas alinhadas aos eixos (AABB),
 * rotação de caixas e a mesma normalização usada pelos componentes 3D
 * (FittedModel e AutoNormalizedPart: rotaciona, mede, escala, centraliza em X/Z e assenta em Y).
 */
export type Vec3 = [number, number, number];

export interface Aabb {
  min: Vec3;
  max: Vec3;
}

/** Dimensões [x, y, z] de cada GLB de public/models (gerado por `npm run models:measure`) */
export const MODEL_DIMENSIONS: Record<string, Vec3> = Object.fromEntries(
  Object.entries(MODEL_DIMENSIONS_JSON).map(([id, dims]): [string, Vec3] => {
    if (dims.length !== 3 || dims.some((v) => !Number.isFinite(v) || v <= 0)) {
      throw new Error(`modelDimensions.json: medidas inválidas para ${id}`);
    }
    return [id, [dims[0], dims[1], dims[2]]];
  })
);

export function modelDimensions(modelId: string): Vec3 {
  const dims = MODEL_DIMENSIONS[modelId];
  if (!dims) throw new Error(`Modelo 3D sem medidas: ${modelId} (rode npm run models:measure)`);
  return dims;
}

/** Matriz de rotação Euler XYZ (mesma convenção do three.js: R = Rx · Ry · Rz) */
function rotationMatrix([x, y, z]: Vec3): number[][] {
  const [cx, sx, cy, sy, cz, sz] = [Math.cos(x), Math.sin(x), Math.cos(y), Math.sin(y), Math.cos(z), Math.sin(z)];
  return [
    [cy * cz, -cy * sz, sy],
    [cx * sz + sx * sy * cz, cx * cz - sx * sy * sz, -sx * cy],
    [sx * sz - cx * sy * cz, sx * cz + cx * sy * sz, cx * cy],
  ];
}

/** Dimensões da caixa envolvente de uma caixa `dims` girada por `rotation` */
export function rotatedExtents(dims: Vec3, rotation: Vec3): Vec3 {
  const r = rotationMatrix(rotation);
  const out = r.map((row) => Math.abs(row[0]) * dims[0] + Math.abs(row[1]) * dims[1] + Math.abs(row[2]) * dims[2]);
  return [out[0], out[1], out[2]];
}

export type FitAxis = 'x' | 'y' | 'z' | 'max';

export interface FitSpec {
  /** Dimensões originais do modelo */
  dims: Vec3;
  rotation?: Vec3;
  fitAxis: FitAxis;
  size: number;
}

/** Tamanho final (após girar e escalar) — exatamente o que FittedModel desenha */
export function fittedExtents({ dims, rotation = [0, 0, 0], fitAxis, size }: FitSpec): Vec3 {
  const rotated = rotatedExtents(dims, rotation);
  const measured = fitAxis === 'max' ? Math.max(...rotated) : rotated[fitAxis === 'x' ? 0 : fitAxis === 'y' ? 1 : 2];
  const scale = size / Math.max(1e-9, measured);
  return [rotated[0] * scale, rotated[1] * scale, rotated[2] * scale];
}

/**
 * Caixa no mundo: centralizada em X/Z na posição e com a base em position.y.
 * `yaw` é a rotação extra do grupo pai em Y (ex.: headset levemente girado).
 */
export function placedBox(extents: Vec3, position: Vec3, yaw = 0): Aabb {
  const [ex, ey, ez] = yaw ? rotatedExtents(extents, [0, yaw, 0]) : extents;
  return {
    min: [position[0] - ex / 2, position[1], position[2] - ez / 2],
    max: [position[0] + ex / 2, position[1] + ey, position[2] + ez / 2],
  };
}

export const volume = (b: Aabb): number =>
  Math.max(0, b.max[0] - b.min[0]) * Math.max(0, b.max[1] - b.min[1]) * Math.max(0, b.max[2] - b.min[2]);

export function intersection(a: Aabb, b: Aabb): Aabb | null {
  const min: Vec3 = [Math.max(a.min[0], b.min[0]), Math.max(a.min[1], b.min[1]), Math.max(a.min[2], b.min[2])];
  const max: Vec3 = [Math.min(a.max[0], b.max[0]), Math.min(a.max[1], b.max[1]), Math.min(a.max[2], b.max[2])];
  return min.every((v, i) => v < max[i]) ? { min, max } : null;
}

/**
 * Fração de sobreposição: volume em comum dividido pelo volume da MENOR peça.
 * 0 = não se tocam; 1 = a menor está inteira dentro da maior.
 */
export function overlapRatio(a: Aabb, b: Aabb): number {
  const i = intersection(a, b);
  if (!i) return 0;
  return volume(i) / Math.max(1e-12, Math.min(volume(a), volume(b)));
}

/** A caixa interna cabe na externa no plano XZ (com tolerância em metros/unidades) */
export function fitsInsideXZ(outer: Aabb, inner: Aabb, tolerance = 0): boolean {
  return (
    inner.min[0] >= outer.min[0] - tolerance &&
    inner.max[0] <= outer.max[0] + tolerance &&
    inner.min[2] >= outer.min[2] - tolerance &&
    inner.max[2] <= outer.max[2] + tolerance
  );
}
