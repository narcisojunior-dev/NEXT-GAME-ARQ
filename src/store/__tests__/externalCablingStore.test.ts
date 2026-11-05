import { describe, it, expect, beforeEach } from 'vitest';
import { useAssemblyStore, selectDeskStage, selectMonitorScreen } from '../useAssemblyStore';
import { DeskSnapPointId, PlacedDeskItem } from '../../engine/deskSetup';
import { READY_MB, REQUIRED_DESK_ITEMS, buildReadyAssembly, deskItem } from '../../engine/__tests__/fixtures/readyPc';

const store = () => useAssemblyStore.getState();

/** Leva um PC realmente completo (PHASE_7) para a mesa com todos os itens obrigatórios */
function setupReadyDesk(options: Parameters<typeof buildReadyAssembly>[0] = {}) {
  useAssemblyStore.setState({ assembly: buildReadyAssembly(options), selectedMotherboard: READY_MB });
  // O setup padrão do aluno usa braço articulado a gás: ele é fixado antes do monitor
  const placementOrder: [DeskSnapPointId, PlacedDeskItem | undefined][] = [
    ['DESK_BASE', REQUIRED_DESK_ITEMS.DESK_BASE],
    ['PC_TOWER', REQUIRED_DESK_ITEMS.PC_TOWER],
    ['MONITOR_ARM', deskItem('MONITOR_ARM', 'STAND')],
    ['MONITOR_MAIN', REQUIRED_DESK_ITEMS.MONITOR_MAIN],
    ['KEYBOARD', REQUIRED_DESK_ITEMS.KEYBOARD],
    ['MOUSE', REQUIRED_DESK_ITEMS.MOUSE],
  ];
  placementOrder.forEach(([id, item]) => {
    if (!item) throw new Error(`Fixture sem item para ${id}`);
    expect(store().placeDeskItem(id, item), `posicionar ${id}`).toBe(true);
  });
}

function connectAllRequired() {
  store().connectExternalCable('CABLE_POWER_AC', 'PC_AC_INLET', 'WALL_OUTLET_1');
  store().connectExternalCable('CABLE_POWER_MONITOR', 'MONITOR_AC_INLET', 'WALL_OUTLET_2');
  store().connectExternalCable('CABLE_DISPLAY', 'GPU_DP_1', 'MONITOR_DP_IN');
  store().connectExternalCable('CABLE_USB_KEYBOARD', 'KEYBOARD_USB', 'PC_USB_1');
  store().connectExternalCable('CABLE_USB_MOUSE', 'MOUSE_USB', 'PC_USB_2');
}

describe('useAssemblyStore - Cabeamento Externo e Validação Didática (Fase 4)', () => {
  beforeEach(() => {
    store().resetAssembly();
  });

  it('inicia com todos os cabos externos desconectados', () => {
    expect(store().externalCabling.connections.CABLE_POWER_AC).toBeNull();
    expect(store().externalCabling.connections.CABLE_DISPLAY).toBeNull();
  });

  it('recusa ligar o cabo de força de um PC que ainda não está na mesa (sem cabos flutuando no vazio)', () => {
    const res = store().connectExternalCable('CABLE_POWER_AC', 'PC_AC_INLET', 'WALL_OUTLET_1');
    expect(res.allowed).toBe(false);
    expect(res.errorType).toBe('DEVICE_NOT_PLACED');
    expect(store().externalCabling.connections.CABLE_POWER_AC).toBeNull();
  });

  it('permite conectar cabo de força AC da fonte na tomada com o PC na mesa', () => {
    setupReadyDesk();
    const res = store().connectExternalCable('CABLE_POWER_AC', 'PC_AC_INLET', 'WALL_OUTLET_1');
    expect(res.allowed).toBe(true);
    expect(store().externalCabling.connections.CABLE_POWER_AC).toEqual({
      sourcePort: 'PC_AC_INLET',
      destPort: 'WALL_OUTLET_1',
    });
  });

  it('armazena a conexão normalizada quando o aluno arrasta o cabo pela outra ponta', () => {
    setupReadyDesk();
    store().connectExternalCable('CABLE_POWER_AC', 'WALL_OUTLET_1', 'PC_AC_INLET');
    expect(store().externalCabling.connections.CABLE_POWER_AC).toEqual({
      sourcePort: 'PC_AC_INLET',
      destPort: 'WALL_OUTLET_1',
    });
  });

  it('aplica a regra didática da GPU quando conectado em MB_HDMI com GPU dedicada', () => {
    setupReadyDesk({ withGpu: true });

    // Conecta vídeo na placa-mãe (erro clássico)
    const res = store().connectExternalCable('CABLE_DISPLAY', 'MB_HDMI', 'MONITOR_HDMI_IN');
    expect(res.allowed).toBe(true);
    expect(res.isPedagogicallyValid).toBe(false);
    expect(res.errorType).toBe('GPU_BYPASS_NO_SIGNAL');
    expect(store().activeAlert?.type).toBe('warning');
    expect(store().penaltiesCount).toBe(1);

    // Conecta na GPU (correto): o próprio cabo sai da porta antiga, sem conflito de ocupação
    const resCorrect = store().connectExternalCable('CABLE_DISPLAY', 'GPU_HDMI_1', 'MONITOR_HDMI_IN');
    expect(resCorrect.allowed).toBe(true);
    expect(resCorrect.isPedagogicallyValid).toBe(true);
  });

  it('recusa dois cabos na mesma porta USB', () => {
    setupReadyDesk();
    store().connectExternalCable('CABLE_USB_KEYBOARD', 'KEYBOARD_USB', 'PC_USB_1');
    const res = store().connectExternalCable('CABLE_USB_MOUSE', 'MOUSE_USB', 'PC_USB_1');
    expect(res.allowed).toBe(false);
    expect(res.errorType).toBe('PORT_OCCUPIED');
    expect(store().externalCabling.connections.CABLE_USB_MOUSE).toBeNull();
  });

  it('poda os cabos externos quando um periférico é removido da mesa', () => {
    setupReadyDesk();
    store().connectExternalCable('CABLE_POWER_MONITOR', 'MONITOR_AC_INLET', 'WALL_OUTLET_2');
    expect(store().externalCabling.connections.CABLE_POWER_MONITOR).not.toBeNull();

    store().removeDeskItem('MONITOR_MAIN');
    expect(store().externalCabling.connections.CABLE_POWER_MONITOR).toBeNull();
  });

  it('percorre CABLING → READY_TO_BOOT → RUNNING e desliga sozinho ao perder um cabo obrigatório', () => {
    setupReadyDesk();
    expect(selectDeskStage(store())).toBe('CABLING');

    connectAllRequired();
    expect(selectDeskStage(store())).toBe('READY_TO_BOOT');

    expect(store().setDeskPower(true)).toBe(true);
    expect(selectDeskStage(store())).toBe('RUNNING');

    // Puxou o cabo de força da tomada com o PC ligado: o PC apaga
    store().disconnectExternalCable('CABLE_POWER_AC');
    expect(store().deskSetup.isDeskPoweredOn).toBe(false);
    expect(selectDeskStage(store())).toBe('CABLING');

    // Religar o cabo não deve pular direto para RUNNING sem apertar o botão de novo
    store().connectExternalCable('CABLE_POWER_AC', 'PC_AC_INLET', 'WALL_OUTLET_1');
    expect(selectDeskStage(store())).toBe('READY_TO_BOOT');
  });

  it('liga com o vídeo na placa-mãe (SEM SINAL) e a imagem aparece ao mover o cabo para a GPU com o PC ligado', () => {
    setupReadyDesk({ withGpu: true });
    store().connectExternalCable('CABLE_POWER_AC', 'PC_AC_INLET', 'WALL_OUTLET_1');
    store().connectExternalCable('CABLE_POWER_MONITOR', 'MONITOR_AC_INLET', 'WALL_OUTLET_2');
    store().connectExternalCable('CABLE_USB_KEYBOARD', 'KEYBOARD_USB', 'PC_USB_1');
    store().connectExternalCable('CABLE_USB_MOUSE', 'MOUSE_USB', 'PC_USB_2');
    store().connectExternalCable('CABLE_DISPLAY', 'MB_HDMI', 'MONITOR_HDMI_IN');

    expect(store().setDeskPower(true)).toBe(true);
    expect(store().deskSetup.isDeskPoweredOn).toBe(true);
    expect(selectDeskStage(store())).toBe('CABLING');
    expect(selectMonitorScreen(store()).state).toBe('NO_SIGNAL');
    expect(selectMonitorScreen(store()).reason).toBe('GPU_BYPASS_NO_SIGNAL');

    // Hot-plug: o PC continua ligado e o vídeo aparece na saída da GPU
    store().connectExternalCable('CABLE_DISPLAY', 'GPU_HDMI_1', 'MONITOR_HDMI_IN');
    expect(store().deskSetup.isDeskPoweredOn).toBe(true);
    expect(selectDeskStage(store())).toBe('RUNNING');
    expect(selectMonitorScreen(store()).state).toBe('SIGNAL');
  });

  it('desconectar um cabo libera a porta para outro cabo', () => {
    setupReadyDesk();
    store().connectExternalCable('CABLE_USB_KEYBOARD', 'KEYBOARD_USB', 'PC_USB_1');
    store().disconnectExternalCable('CABLE_USB_KEYBOARD');
    expect(store().connectExternalCable('CABLE_USB_MOUSE', 'MOUSE_USB', 'PC_USB_1').allowed).toBe(true);
  });
});
