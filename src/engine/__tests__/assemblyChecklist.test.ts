import { describe, it, expect } from 'vitest';
import { buildAssemblyChecklist, pendingBenchSteps } from '../assemblyChecklist';
import { cableConnectionsFromAssembly } from '../cabling';
import { derivePhase } from '../phases';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';
import { canPlaceOnDesk } from '../deskSetup';
import { AssemblyState } from '../types';
import { READY_MB, buildReadyAssembly, deskItem } from './fixtures/readyPc';

const checklist = (state: AssemblyState, bootSuccess = false) =>
  buildAssemblyChecklist(state, READY_MB, { cableConnections: cableConnectionsFromAssembly(state), bootSuccess });

/** Cada requisito físico desfeito, um de cada vez, a partir de um PC pronto */
const REGRESSIONS: [string, Partial<AssemblyState>][] = [
  ['ESD', { esdDischarged: false }],
  ['alavanca', { socketLeverLocked: false }],
  ['pasta', { thermalPasteApplied: false }],
  ['ventoinha do cooler', { coolerFanConnected: false }],
  ['memória', { ramInstalledSlot2: null, ramInstalledSlot4: null }],
  ['espaçadores', { standoffsInstalled: false }],
  ['fonte', { psuInstalled: null }],
  ['parafusos da placa', { motherboardScrewed: false }],
  ['parafuso da GPU', { gpuScrewed: false }],
  ['ATX 24 pinos', { cableAtx24PinConnected: false }],
  ['EPS 8 pinos', { cableCpu8PinConnected: false }],
  ['PCIe da GPU', { cableGpuPcieConnected: false }],
  ['painel frontal', { frontPanelPowerSwConnected: false }],
  ['ventoinhas do gabinete', { caseFansConnected: false }],
  ['USB frontal', { frontUsbConnected: false }],
  ['áudio frontal', { frontAudioConnected: false }],
];

describe('Checklist da bancada (fonte única com derivePhase)', () => {
  it('começa vazio, com o ESD como primeiro passo', () => {
    const steps = buildAssemblyChecklist(INITIAL_ASSEMBLY_STATE, null, { cableConnections: {}, bootSuccess: false });
    expect(steps[0].id).toBe('esd');
    expect(steps.every((s) => !s.isDone)).toBe(true);
    expect(steps.map((s) => s.title)).toEqual(steps.map((s, i) => expect.stringMatching(new RegExp(`^${i + 1}\\. `))));
  });

  it('PC pronto: todos os passos da bancada concluídos; o último só após o POST passar', () => {
    const ready = buildReadyAssembly();
    expect(derivePhase(ready, READY_MB)).toBe('PHASE_7_BOOT_POST');
    expect(pendingBenchSteps(checklist(ready))).toEqual([]);
    expect(checklist(ready).find((s) => s.id === 'boot')?.isDone).toBe(false);
    expect(checklist(ready, true).every((s) => s.isDone)).toBe(true);
  });

  it.each(REGRESSIONS)('sem %s: o checklist mostra o passo pendente e o PC não vai para a mesa', (_, change) => {
    const state = { ...buildReadyAssembly(), ...change };
    expect(derivePhase(state, READY_MB)).not.toBe('PHASE_7_BOOT_POST');
    expect(pendingBenchSteps(checklist(state)).length).toBeGreaterThan(0);
  });

  it('a recusa de levar o PC para a mesa diz exatamente o que falta', () => {
    const state = { ...buildReadyAssembly(), gpuScrewed: false };
    const missing = pendingBenchSteps(checklist(state)).map((s) => s.title.replace(/^\d+\. /, ''));
    expect(missing).toEqual(['Encaixar e Parafusar a Placa de Vídeo']);
    const result = canPlaceOnDesk('PC_TOWER', deskItem('PC_TOWER', 'PC_TOWER'), { DESK_BASE: deskItem('DESK_BASE', 'DESK') }, {
      isPcAssembled: false,
      pendingBenchSteps: missing,
    });
    expect(result.allowed).toBe(false);
    expect(result.message).toContain('Falta: Encaixar e Parafusar a Placa de Vídeo');
  });
});
