import { describe, it, expect, beforeEach } from 'vitest';
import { useAssemblyStore, selectDeskStage } from '../useAssemblyStore';
import { DESKS, KEYBOARDS, MICE, MONITORS } from '../../engine/peripheralsCatalog';
import { CPUS, GPUS, MOTHERBOARDS, COOLERS, RAMS, STORAGES, CASES, PSUS } from '../../engine/hardwareCatalog';

describe('useAssemblyStore - Cabeamento Externo e Validação Didática (Fase 4)', () => {
  beforeEach(() => {
    useAssemblyStore.getState().resetAssembly();
    useAssemblyStore.getState().clearDeskSetup();
    useAssemblyStore.getState().dischargeEsd();
  });

  it('inicia com todos os cabos externos desconectados', () => {
    const state = useAssemblyStore.getState();
    expect(state.externalCabling.connections.CABLE_POWER_AC).toBeNull();
    expect(state.externalCabling.connections.CABLE_DISPLAY).toBeNull();
  });

  it('permite conectar cabo de força AC da fonte na tomada', () => {
    const store = useAssemblyStore.getState();
    const res = store.connectExternalCable('CABLE_POWER_AC', 'PC_AC_INLET', 'WALL_OUTLET_1');
    expect(res.allowed).toBe(true);
    expect(useAssemblyStore.getState().externalCabling.connections.CABLE_POWER_AC).toEqual({
      sourcePort: 'PC_AC_INLET',
      destPort: 'WALL_OUTLET_1',
    });
  });

  it('aplica a regra didática da GPU quando conectado em MB_HDMI com GPU dedicada', () => {
    const store = useAssemblyStore.getState();
    // Monta PC com GPU dedicada
    store.installMotherboard(MOTHERBOARDS[0]);
    store.installCpu(CPUS[0]); // Ryzen sem iGPU
    store.installGpu(GPUS[0]); // RTX 3060

    // Conecta vídeo na placa-mãe (erro clássico)
    const res = store.connectExternalCable('CABLE_DISPLAY', 'MB_HDMI', 'MONITOR_HDMI_IN');
    expect(res.allowed).toBe(true);
    expect(res.isPedagogicallyValid).toBe(false);
    expect(res.errorType).toBe('GPU_BYPASS_NO_SIGNAL');
    expect(useAssemblyStore.getState().activeAlert?.type).toBe('warning');

    // Conecta na GPU (correto)
    const resCorrect = store.connectExternalCable('CABLE_DISPLAY', 'GPU_HDMI_1', 'MONITOR_HDMI_IN');
    expect(resCorrect.allowed).toBe(true);
    expect(resCorrect.isPedagogicallyValid).toBe(true);
  });

  it('poda os cabos externos quando um periférico é removido da mesa', () => {
    const store = useAssemblyStore.getState();
    // Coloca mesa e monitor
    store.placeDeskItem('DESK_BASE', {
      snapPointId: 'DESK_BASE',
      itemId: DESKS[0].id,
      name: DESKS[0].name,
      category: 'DESK',
      price: DESKS[0].price,
    });
    store.placeDeskItem('MONITOR_MAIN', {
      snapPointId: 'MONITOR_MAIN',
      itemId: MONITORS[0].id,
      name: MONITORS[0].name,
      category: 'MONITOR',
      price: MONITORS[0].price,
    });

    // Conecta força do monitor
    store.connectExternalCable('CABLE_POWER_MONITOR', 'MONITOR_AC_INLET', 'WALL_OUTLET_2');
    expect(useAssemblyStore.getState().externalCabling.connections.CABLE_POWER_MONITOR).not.toBeNull();

    // Remove monitor da mesa
    store.removeDeskItem('MONITOR_MAIN');
    expect(useAssemblyStore.getState().externalCabling.connections.CABLE_POWER_MONITOR).toBeNull();
  });
});
