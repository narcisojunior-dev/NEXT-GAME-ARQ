import { describe, it, expect } from 'vitest';
import {
  MODELS_3D,
  ALLOWED_3D_LICENSES,
  MAX_MODEL_FACES,
  findModel3D,
  modelSourceUrl,
  modelAuthorUrl,
  modelFileUrl,
  isModelAvailable,
  getAvailableModels,
} from '../models3d';
import { findAvailableModelId, hasAvailableModels, buildAvailableIndex } from '../models3dIndex';
import { CPUS, MOTHERBOARDS, RAMS, COOLERS, GPUS, STORAGES, PSUS, CASES, THERMAL_PASTES } from '../hardwareCatalog';
import { MONITORS, KEYBOARDS, MICE, MONITOR_STANDS, GAMEPADS, AUDIO_DEVICES, CASE_THEMES, DESKS, CHAIRS, MOUSEPADS } from '../peripheralsCatalog';

const CATALOG_IDS = new Set(
  [CPUS, MOTHERBOARDS, RAMS, COOLERS, GPUS, STORAGES, PSUS, CASES, THERMAL_PASTES, MONITORS, KEYBOARDS, MICE, MONITOR_STANDS, GAMEPADS, AUDIO_DEVICES, CASE_THEMES, DESKS, CHAIRS, MOUSEPADS]
    .flat()
    .map((item) => item.id)
);

describe('Manifesto de modelos 3D: licenças e orçamento', () => {
  it('só contém licenças que permitem uso e modificação com crédito', () => {
    MODELS_3D.forEach((model) => expect(ALLOWED_3D_LICENSES).toContain(model.license));
  });

  it('respeita o orçamento de faces por modelo', () => {
    MODELS_3D.forEach((model) => expect(model.faces).toBeLessThanOrEqual(MAX_MODEL_FACES));
  });

  it('não repete ids nem modelos do Sketchfab', () => {
    expect(new Set(MODELS_3D.map((m) => m.id)).size).toBe(MODELS_3D.length);
    expect(new Set(MODELS_3D.map((m) => m.uid)).size).toBe(MODELS_3D.length);
    MODELS_3D.forEach((m) => expect(m.uid).toMatch(/^[0-9a-f]{32}$/));
  });

  it('tem componentes e periféricos, incluindo novos periféricos para a vitrine', () => {
    const categories = new Set(MODELS_3D.map((m) => m.category));
    ['MONITOR', 'KEYBOARD', 'MOUSE', 'AUDIO', 'GAMEPAD', 'WEBCAM', 'MICROPHONE', 'CHAIR', 'DESK', 'GPU', 'CPU', 'CASE'].forEach((c) =>
      expect(categories.has(c as never)).toBe(true)
    );
  });
});

describe('Ligação entre modelos e peças do catálogo', () => {
  it('cada peça atendida existe no catálogo e é atendida por um único modelo', () => {
    const seen = new Set<string>();
    MODELS_3D.flatMap((m) => m.targets).forEach((target) => {
      expect(CATALOG_IDS.has(target)).toBe(true);
      expect(seen.has(target)).toBe(false);
      seen.add(target);
    });
  });

  it('acha o modelo exato quando existe e marca os aproximados como ilustrativos', () => {
    expect(findModel3D('gpu-rx-6700xt')).toMatchObject({ id: 'gpu-rx-6700xt', illustrative: false });
    expect(findModel3D('gpu-rtx-4060')?.illustrative).toBe(true);
    expect(findModel3D('mon-34-ultrawide')?.id).toBe('monitor-ultrawide');
  });

  it('não liga modelos que ensinariam um formato errado', () => {
    // Ryzen AM5 não tem pinos no processador; o único modelo Ryzen é AM4 (com pinos)
    expect(findModel3D('cpu-r5-7600')).toBeNull();
    expect(findModel3D('cpu-r7-7700x')).toBeNull();
    // Memórias DDR5 têm o chanfro em outra posição; os modelos de pente são DDR4
    expect(findModel3D('ram-16gb-d5-dual')).toBeNull();
    expect(findModel3D('ram-32gb-d5-rgb')).toBeNull();
    expect(findModel3D('ram-16gb-d4-dual')?.id).toBe('ram-ddr4-crucial');
  });
});

describe('Índice leve de modelos baixados (carga inicial do jogo)', () => {
  const index = [{ id: 'gpu-rx-6700xt', targets: ['gpu-rx-6700xt'] }, { id: 'webcam', targets: [] }];

  it('acha o modelo baixado de uma peça do catálogo', () => {
    expect(findAvailableModelId('gpu-rx-6700xt', index)).toBe('gpu-rx-6700xt');
    expect(findAvailableModelId('gpu-rtx-4060', index)).toBeNull();
  });

  it('informa se existe algum modelo para a vitrine', () => {
    expect(hasAvailableModels(index)).toBe(true);
    expect(hasAvailableModels([])).toBe(false);
  });

  it('é gerado a partir do manifesto, com as mesmas peças atendidas', () => {
    const built = buildAvailableIndex(MODELS_3D, ['gpu-rx-6700xt']);
    expect(built).toEqual([{ id: 'gpu-rx-6700xt', targets: ['gpu-rx-6700xt'] }]);
  });
});

describe('Créditos e arquivos', () => {
  const model = MODELS_3D.find((m) => m.id === 'gpu-rx-6700xt')!;

  it('monta os links de origem e do autor no Sketchfab', () => {
    expect(modelSourceUrl(model)).toBe(`https://sketchfab.com/3d-models/${model.uid}`);
    expect(modelAuthorUrl(model)).toBe(`https://sketchfab.com/${model.author}`);
  });

  it('aponta para o arquivo otimizado em public/models', () => {
    expect(modelFileUrl(model)).toBe('/models/gpu-rx-6700xt.glb');
  });

  it('só considera disponível o modelo que já foi baixado e otimizado', () => {
    expect(isModelAvailable('gpu-rx-6700xt', new Set())).toBe(false);
    expect(isModelAvailable('gpu-rx-6700xt', new Set(['gpu-rx-6700xt']))).toBe(true);
    expect(getAvailableModels(new Set(['webcam', 'gpu-rx-6700xt'])).map((m) => m.id).sort()).toEqual(['gpu-rx-6700xt', 'webcam']);
  });
});
