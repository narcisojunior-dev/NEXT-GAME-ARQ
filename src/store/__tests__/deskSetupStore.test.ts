import { describe, it, expect, beforeEach } from 'vitest';
import { useAssemblyStore, selectDeskStage } from '../useAssemblyStore';
import { DESKS, KEYBOARDS } from '../../engine/peripheralsCatalog';
import { READY_MB, buildReadyAssembly, deskItem } from '../../engine/__tests__/fixtures/readyPc';

const store = () => useAssemblyStore.getState();

const deskBase = {
  snapPointId: 'DESK_BASE' as const,
  itemId: DESKS[0].id,
  name: DESKS[0].name,
  category: 'DESK',
  price: DESKS[0].price,
};

const keyboard = {
  snapPointId: 'KEYBOARD' as const,
  itemId: KEYBOARDS[0].id,
  name: KEYBOARDS[0].name,
  category: 'KEYBOARD',
  price: KEYBOARDS[0].price,
};

describe('useAssemblyStore - Integração da Mesa de Setup (Fase 4)', () => {
  beforeEach(() => {
    store().resetAssembly();
  });

  it('inicia com deskSetup vazio e câmera em setup-wide', () => {
    const state = store();
    expect(state.deskSetup.placedDeskItems).toEqual({});
    expect(state.deskSetup.isDeskPoweredOn).toBe(false);
    expect(state.deskSetup.deskCameraPreset).toBe('setup-wide');
    expect(selectDeskStage(state)).toBe('LOCKED');
  });

  it('permite posicionar a mesa DESK_BASE e atualiza o estado imutavelmente', () => {
    const before = store().deskSetup;
    expect(store().placeDeskItem('DESK_BASE', deskBase)).toBe(true);

    const state = store();
    expect(state.deskSetup).not.toBe(before);
    expect(state.deskSetup.placedDeskItems.DESK_BASE?.itemId).toBe(DESKS[0].id);
  });

  it('grava o item sempre sob o snap point de destino (snapPointId coerente)', () => {
    store().placeDeskItem('DESK_BASE', deskBase);
    store().placeDeskItem('KEYBOARD', { ...keyboard, snapPointId: 'MOUSE' });
    expect(store().deskSetup.placedDeskItems.KEYBOARD?.snapPointId).toBe('KEYBOARD');
  });

  it('rejeita posicionar teclado sem mesa prévia e não altera o estado', () => {
    expect(store().placeDeskItem('KEYBOARD', keyboard)).toBe(false);
    expect(store().deskSetup.placedDeskItems.KEYBOARD).toBeUndefined();
    expect(store().activeAlert?.type).toBe('warning');
  });

  it('rejeita levar à mesa um PC com peças encaixadas mas sem cabos internos', () => {
    useAssemblyStore.setState({
      assembly: { ...buildReadyAssembly(), cableAtx24PinConnected: false },
      selectedMotherboard: READY_MB,
    });
    store().placeDeskItem('DESK_BASE', deskBase);
    expect(store().placeDeskItem('PC_TOWER', deskItem('PC_TOWER', 'PC_TOWER'))).toBe(false);
    expect(store().activeAlert?.message).toMatch(/Finalize a montagem/i);
  });

  it('rejeita remover a mesa se houver itens sobre ela', () => {
    store().placeDeskItem('DESK_BASE', deskBase);
    store().placeDeskItem('KEYBOARD', keyboard);

    expect(store().removeDeskItem('DESK_BASE')).toBe(false);
    expect(store().deskSetup.placedDeskItems.DESK_BASE).toBeDefined();

    // Remove primeiro o teclado
    expect(store().removeDeskItem('KEYBOARD')).toBe(true);
    expect(store().deskSetup.placedDeskItems.KEYBOARD).toBeUndefined();

    // Agora consegue remover a mesa
    expect(store().removeDeskItem('DESK_BASE')).toBe(true);
    expect(store().deskSetup.placedDeskItems.DESK_BASE).toBeUndefined();
  });

  it('não liga a energia da mesa antes de READY_TO_BOOT', () => {
    expect(store().setDeskPower(true)).toBe(false);
    expect(store().deskSetup.isDeskPoweredOn).toBe(false);
    expect(store().activeAlert?.type).toBe('warning');

    // Desligar é sempre permitido
    expect(store().setDeskPower(false)).toBe(true);
  });

  it('altera presets de câmera', () => {
    store().setDeskCameraPreset('setup-pc');
    expect(store().deskSetup.deskCameraPreset).toBe('setup-pc');
  });

  it('clearDeskSetup também desconecta todos os cabos externos', () => {
    useAssemblyStore.setState({ assembly: buildReadyAssembly(), selectedMotherboard: READY_MB });
    store().placeDeskItem('DESK_BASE', deskBase);
    store().placeDeskItem('PC_TOWER', deskItem('PC_TOWER', 'PC_TOWER'));
    store().connectExternalCable('CABLE_POWER_AC', 'PC_AC_INLET', 'WALL_OUTLET_1');
    expect(store().externalCabling.connections.CABLE_POWER_AC).not.toBeNull();

    store().clearDeskSetup();
    expect(store().deskSetup.placedDeskItems).toEqual({});
    expect(store().externalCabling.connections.CABLE_POWER_AC).toBeNull();
  });

  it('alternar Bancada ⇄ Mesa preserva a montagem e a mesa', () => {
    useAssemblyStore.setState({ assembly: buildReadyAssembly(), selectedMotherboard: READY_MB });
    store().placeDeskItem('DESK_BASE', deskBase);
    const assemblyBefore = store().assembly;

    store().setActiveWorkbenchView('desk');
    store().setActiveWorkbenchView('bench');
    store().setActiveWorkbenchView('desk');

    expect(store().assembly).toBe(assemblyBefore);
    expect(store().deskSetup.placedDeskItems.DESK_BASE).toBeDefined();
    expect(store().activeWorkbenchView).toBe('desk');
  });
});
