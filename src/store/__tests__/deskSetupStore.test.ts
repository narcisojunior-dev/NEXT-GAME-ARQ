import { describe, it, expect, beforeEach } from 'vitest';
import { useAssemblyStore, selectDeskStage } from '../useAssemblyStore';
import { DESKS, KEYBOARDS, CHAIRS } from '../../engine/peripheralsCatalog';

describe('useAssemblyStore - Integração da Mesa de Setup (Fase 4)', () => {
  beforeEach(() => {
    useAssemblyStore.getState().resetAssembly();
    useAssemblyStore.getState().clearDeskSetup();
  });

  it('inicia com deskSetup vazio e câmera em setup-wide', () => {
    const state = useAssemblyStore.getState();
    expect(state.deskSetup.placedDeskItems).toEqual({});
    expect(state.deskSetup.isDeskPoweredOn).toBe(false);
    expect(state.deskSetup.deskCameraPreset).toBe('setup-wide');
    expect(selectDeskStage(state)).toBe('LOCKED');
  });

  it('permite posicionar a mesa DESK_BASE e atualiza o estado imutavelmente', () => {
    const store = useAssemblyStore.getState();
    const ok = store.placeDeskItem('DESK_BASE', {
      snapPointId: 'DESK_BASE',
      itemId: DESKS[0].id,
      name: DESKS[0].name,
      category: 'DESK',
      price: DESKS[0].price,
    });
    expect(ok).toBe(true);

    const state = useAssemblyStore.getState();
    expect(state.deskSetup.placedDeskItems.DESK_BASE).toBeDefined();
    expect(state.deskSetup.placedDeskItems.DESK_BASE?.itemId).toBe(DESKS[0].id);
  });

  it('rejeita posicionar teclado sem mesa prévia e não altera o estado', () => {
    const store = useAssemblyStore.getState();
    const ok = store.placeDeskItem('KEYBOARD', {
      snapPointId: 'KEYBOARD',
      itemId: KEYBOARDS[0].id,
      name: KEYBOARDS[0].name,
      category: 'KEYBOARD',
      price: KEYBOARDS[0].price,
    });
    expect(ok).toBe(false);

    const state = useAssemblyStore.getState();
    expect(state.deskSetup.placedDeskItems.KEYBOARD).toBeUndefined();
    expect(state.activeAlert?.type).toBe('warning');
  });

  it('rejeita remover a mesa se houver itens sobre ela', () => {
    const store = useAssemblyStore.getState();
    store.placeDeskItem('DESK_BASE', {
      snapPointId: 'DESK_BASE',
      itemId: DESKS[0].id,
      name: DESKS[0].name,
      category: 'DESK',
      price: DESKS[0].price,
    });
    store.placeDeskItem('KEYBOARD', {
      snapPointId: 'KEYBOARD',
      itemId: KEYBOARDS[0].id,
      name: KEYBOARDS[0].name,
      category: 'KEYBOARD',
      price: KEYBOARDS[0].price,
    });

    const removed = store.removeDeskItem('DESK_BASE');
    expect(removed).toBe(false);
    expect(useAssemblyStore.getState().deskSetup.placedDeskItems.DESK_BASE).toBeDefined();

    // Remove primeiro o teclado
    const removedKb = store.removeDeskItem('KEYBOARD');
    expect(removedKb).toBe(true);
    expect(useAssemblyStore.getState().deskSetup.placedDeskItems.KEYBOARD).toBeUndefined();

    // Agora consegue remover a mesa
    const removedDesk = store.removeDeskItem('DESK_BASE');
    expect(removedDesk).toBe(true);
    expect(useAssemblyStore.getState().deskSetup.placedDeskItems.DESK_BASE).toBeUndefined();
  });

  it('permite ligar/desligar a energia da mesa e alterar presets de câmera', () => {
    const store = useAssemblyStore.getState();
    store.setDeskPower(true);
    expect(useAssemblyStore.getState().deskSetup.isDeskPoweredOn).toBe(true);

    store.setDeskPower(false);
    expect(useAssemblyStore.getState().deskSetup.isDeskPoweredOn).toBe(false);

    store.setDeskCameraPreset('setup-pc');
    expect(useAssemblyStore.getState().deskSetup.deskCameraPreset).toBe('setup-pc');
  });
});
