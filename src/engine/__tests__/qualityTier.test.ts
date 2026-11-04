import { describe, it, expect } from 'vitest';
import { QUALITY_SETTINGS, detectGpuClass, resolveQualityTier } from '../qualityTier';

describe('Níveis de qualidade da bancada 3D (#63)', () => {
  it('reconhece vídeo integrado e renderização por software pelo renderer do WebGL', () => {
    ['ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)', 'Intel Iris Xe', 'AMD Radeon(TM) Graphics', 'AMD Radeon Vega 8 Graphics',
      'Mali-G52', 'Adreno (TM) 610', 'Google SwiftShader', 'llvmpipe (LLVM 15.0.7, 256 bits)', 'Apple M1'].forEach((r) =>
      expect(detectGpuClass(r), r).toBe('INTEGRADA')
    );
    ['ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)', 'AMD Radeon RX 6600', 'NVIDIA GeForce GTX 1650'].forEach((r) =>
      expect(detectGpuClass(r), r).toBe('DEDICADA')
    );
    expect(detectGpuClass(null)).toBe('INTEGRADA');
  });

  it('automático: integrado → leve; dedicado → alta; a escolha do aluno prevalece', () => {
    expect(resolveQualityTier('Intel(R) UHD Graphics 620', 'AUTO')).toBe('LEVE');
    expect(resolveQualityTier('NVIDIA GeForce RTX 3060', 'AUTO')).toBe('ALTA');
    expect(resolveQualityTier('NVIDIA GeForce RTX 3060', 'LEVE')).toBe('LEVE');
    expect(resolveQualityTier('Intel(R) UHD Graphics 620', 'ALTA')).toBe('ALTA');
  });

  it('leve: pixel ratio máximo 1, sombras menores, sem antialias nem oclusão ambiente', () => {
    const leve = QUALITY_SETTINGS.LEVE;
    const alta = QUALITY_SETTINGS.ALTA;
    expect(Math.max(...leve.dpr)).toBe(1);
    expect(leve.shadowMapSize).toBeLessThan(alta.shadowMapSize);
    expect(leve.antialias).toBe(false);
    expect(leve.ambientOcclusion).toBe(false);
    expect(Math.max(...alta.dpr)).toBeLessThanOrEqual(1.5);
  });
});
