import { describe, it, expect } from 'vitest';
import { getCompatibilityHint, getPriceTier } from '../cardInsights';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';
import { CPUS, MOTHERBOARDS, RAMS, COOLERS, PSUS, STORAGES, GPUS, CASES, THERMAL_PASTES } from '../hardwareCatalog';
import { AssemblyState } from '../types';

const byId = <T extends { id: string }>(list: T[], id: string): T => {
  const item = list.find((x) => x.id === id);
  if (!item) throw new Error(`Peça ${id} não encontrada no catálogo`);
  return item;
};

const intelMb = byId(MOTHERBOARDS, 'mb-b760m-d5'); // LGA1700, DDR5, Micro-ATX
const atxMb = byId(MOTHERBOARDS, 'mb-z790-max');
const i5f = byId(CPUS, 'cpu-i5-13400f');
const i7 = byId(CPUS, 'cpu-i7-13700k');
const r5 = byId(CPUS, 'cpu-r5-7600');

describe('Faixa de preço dentro da categoria', () => {
  it('classifica a GPU mais barata como entrada e a mais cara como topo de linha', () => {
    expect(getPriceTier(byId(GPUS, 'gpu-gtx-1650'))).toBe('ENTRADA');
    expect(getPriceTier(byId(GPUS, 'gpu-rtx-4060'))).toBe('INTERMEDIARIO');
    expect(getPriceTier(byId(GPUS, 'gpu-rtx-4070-super'))).toBe('TOPO');
  });

  it('funciona para todas as categorias do catálogo', () => {
    expect(getPriceTier(byId(PSUS, 'psu-750w-gold'))).toBe('TOPO');
    expect(getPriceTier(byId(CASES, 'case-office-compact'))).toBe('ENTRADA');
  });
});

describe('Selo de compatibilidade do card', () => {
  const withMb: AssemblyState = { ...INITIAL_ASSEMBLY_STATE, esdDischarged: true };

  it('não mostra selo quando ainda não há com o que comparar', () => {
    expect(getCompatibilityHint(i5f, INITIAL_ASSEMBLY_STATE, null)).toBeNull();
    expect(getCompatibilityHint(byId(RAMS, 'ram-16gb-d5-dual'), INITIAL_ASSEMBLY_STATE, null)).toBeNull();
    expect(getCompatibilityHint(THERMAL_PASTES[0], withMb, intelMb)).toBeNull();
  });

  it('marca a peça que já está instalada', () => {
    const state = { ...withMb, cpuInstalled: i5f };
    expect(getCompatibilityHint(i5f, state, intelMb)?.status).toBe('INSTALLED');
    expect(getCompatibilityHint(intelMb, state, intelMb)?.status).toBe('INSTALLED');
  });

  it('CPU: soquete diferente da placa é perigo, igual é ok', () => {
    const bad = getCompatibilityHint(r5, withMb, intelMb);
    expect(bad?.status).toBe('DANGER');
    expect(bad?.label).toContain('LGA1700');
    expect(getCompatibilityHint(i7, withMb, intelMb)?.status).toBe('OK');
  });

  it('CPU sem vídeo integrado e sem GPU recebe alerta', () => {
    const hint = getCompatibilityHint(i5f, withMb, intelMb);
    expect(hint?.status).toBe('WARNING');
    expect(hint?.label).toContain('GPU');
  });

  it('RAM: geração diferente da placa é perigo', () => {
    const hint = getCompatibilityHint(byId(RAMS, 'ram-16gb-d4-dual'), withMb, intelMb);
    expect(hint?.status).toBe('DANGER');
    expect(hint?.label).toContain('DDR5');
    expect(getCompatibilityHint(byId(RAMS, 'ram-16gb-d5-dual'), withMb, intelMb)?.status).toBe('OK');
  });

  it('Cooler: soquete sem suporte é perigo e capacidade baixa é alerta', () => {
    const amdState = { ...withMb, cpuInstalled: r5 };
    expect(getCompatibilityHint(byId(COOLERS, 'cooler-intel-laminar'), amdState, byId(MOTHERBOARDS, 'mb-b650m-am5'))?.status).toBe('DANGER');

    const i7State = { ...withMb, cpuInstalled: i7 };
    const weak = getCompatibilityHint(byId(COOLERS, 'cooler-box-stock'), i7State, intelMb);
    expect(weak?.status).toBe('WARNING');
    expect(weak?.label).toContain('125W');
    expect(getCompatibilityHint(byId(COOLERS, 'cooler-deepcool-ag400'), i7State, intelMb)?.status).toBe('OK');
  });

  it('GPU: comprimento maior que o gabinete é perigo; fonte abaixo do recomendado é alerta', () => {
    const office = byId(CASES, 'case-office-compact');
    const tooLong = getCompatibilityHint(byId(GPUS, 'gpu-rtx-4070-super'), { ...withMb, caseInstalled: office }, intelMb);
    expect(tooLong?.status).toBe('DANGER');
    expect(tooLong?.label).toContain('230mm');

    const weakPsu = getCompatibilityHint(byId(GPUS, 'gpu-rx-6700xt'), { ...withMb, psuInstalled: byId(PSUS, 'psu-500w-white') }, intelMb);
    expect(weakPsu?.status).toBe('WARNING');
  });

  it('Gabinete: placa ATX em gabinete Micro-ATX é perigo', () => {
    const hint = getCompatibilityHint(byId(CASES, 'case-office-compact'), withMb, atxMb);
    expect(hint?.status).toBe('DANGER');
    expect(getCompatibilityHint(byId(CASES, 'case-gamer-mesh'), withMb, atxMb)?.status).toBe('OK');
  });

  it('Fonte: potência abaixo do consumo com margem é perigo; com folga é ok', () => {
    const state = { ...withMb, cpuInstalled: i7, gpuInstalled: byId(GPUS, 'gpu-rtx-4070-super') };
    expect(getCompatibilityHint(byId(PSUS, 'psu-generic-200w'), state, intelMb)?.status).toBe('DANGER');
    const ok = getCompatibilityHint(byId(PSUS, 'psu-750w-gold'), state, intelMb);
    expect(ok?.status).toBe('OK');
    expect(ok?.label).toContain('Folga');
  });

  it('Armazenamento indica onde o disco é instalado', () => {
    const nvme = getCompatibilityHint(byId(STORAGES, 'ssd-nvme-1tb'), withMb, intelMb);
    expect(nvme?.status).toBe('INFO');
    expect(nvme?.label).toContain('M.2');
    expect(getCompatibilityHint(byId(STORAGES, 'hdd-seagate-2tb'), withMb, intelMb)?.label).toContain('SATA');
  });
});
