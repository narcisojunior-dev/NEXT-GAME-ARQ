/**
 * Níveis de qualidade da bancada 3D (#63, ADR-013): leve para vídeo integrado de PC escolar
 * (60 FPS, RNF07) e alta para placa dedicada. Puro: a detecção do renderer fica no componente.
 * O nível nunca muda regras, pontuação nem as leituras do modo "Abrir o PC".
 */
export type QualityTier = 'LEVE' | 'ALTA';
export type QualityPreference = 'AUTO' | QualityTier;
export type GpuClass = 'INTEGRADA' | 'DEDICADA';

export interface QualitySettings {
  /** Faixa de pixel ratio do Canvas */
  dpr: [number, number];
  shadowMapSize: number;
  antialias: boolean;
  ambientOcclusion: boolean;
}

export const QUALITY_SETTINGS: Record<QualityTier, QualitySettings> = {
  LEVE: { dpr: [1, 1], shadowMapSize: 512, antialias: false, ambientOcclusion: false },
  ALTA: { dpr: [1, 1.5], shadowMapSize: 1024, antialias: true, ambientOcclusion: false },
};

export const QUALITY_LABELS: Record<QualityPreference, string> = {
  AUTO: 'Automático',
  LEVE: 'Leve (vídeo integrado)',
  ALTA: 'Alta (placa de vídeo)',
};

/** Vídeo integrado, de celular ou renderização por software (sem renderer = trata como integrado) */
const INTEGRATED = /intel|iris|uhd|hd graphics|radeon\(tm\) graphics|radeon graphics|vega \d+ graphics|mali|adreno|powervr|apple|swiftshader|llvmpipe|software|microsoft basic/i;
const DEDICATED = /nvidia|geforce|quadro|rtx|gtx|radeon rx|radeon pro|arc a\d/i;

export function detectGpuClass(renderer: string | null): GpuClass {
  if (!renderer) return 'INTEGRADA';
  if (DEDICATED.test(renderer)) return 'DEDICADA';
  if (INTEGRATED.test(renderer)) return 'INTEGRADA';
  return 'DEDICADA';
}

export function resolveQualityTier(renderer: string | null, preference: QualityPreference): QualityTier {
  if (preference !== 'AUTO') return preference;
  return detectGpuClass(renderer) === 'INTEGRADA' ? 'LEVE' : 'ALTA';
}
