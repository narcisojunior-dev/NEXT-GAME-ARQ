import { describe, it, expect } from 'vitest';
import { BOOT_TIMELINE_MS, deriveMonitorScreen, getBootPhase } from '../monitorScreen';
import { ExternalCablingState, createInitialExternalCablesState } from '../externalCabling';
import { AssemblyState } from '../types';
import { buildReadyAssembly, REQUIRED_DESK_ITEMS } from './fixtures/readyPc';

const withConnections = (connections: Partial<ExternalCablingState['connections']>): ExternalCablingState => ({
  connections: { ...createInitialExternalCablesState().connections, ...connections },
});

const POWERED_MONITOR = { CABLE_POWER_MONITOR: { sourcePort: 'MONITOR_AC_INLET', destPort: 'WALL_OUTLET_2' } } as const;
const gpuPc: AssemblyState = buildReadyAssembly({ withGpu: true });
const igpuPc: AssemblyState = buildReadyAssembly({ withGpu: false, cpuWithIgpu: true });

describe('Estado da tela do monitor (deriveMonitorScreen)', () => {
  it('sem monitor na mesa', () => {
    const info = deriveMonitorScreen({
      placedDeskItems: {},
      externalCabling: createInitialExternalCablesState(),
      assembly: gpuPc,
      isPcPoweredOn: false,
    });
    expect(info.state).toBe('NO_MONITOR');
  });

  it('monitor sem cabo de força fica apagado, com o LED desligado', () => {
    const info = deriveMonitorScreen({
      placedDeskItems: REQUIRED_DESK_ITEMS,
      externalCabling: createInitialExternalCablesState(),
      assembly: gpuPc,
      isPcPoweredOn: true,
    });
    expect(info.state).toBe('OFF');
    expect(info.led).toBe('OFF');
  });

  it('monitor energizado com o PC desligado fica em espera (LED âmbar)', () => {
    const info = deriveMonitorScreen({
      placedDeskItems: REQUIRED_DESK_ITEMS,
      externalCabling: withConnections(POWERED_MONITOR),
      assembly: gpuPc,
      isPcPoweredOn: false,
    });
    expect(info.state).toBe('STANDBY');
    expect(info.led).toBe('AMBER');
  });

  it('PC ligado sem cabo de vídeo: SEM SINAL', () => {
    const info = deriveMonitorScreen({
      placedDeskItems: REQUIRED_DESK_ITEMS,
      externalCabling: withConnections(POWERED_MONITOR),
      assembly: gpuPc,
      isPcPoweredOn: true,
    });
    expect(info.state).toBe('NO_SIGNAL');
    expect(info.reason).toBe('NO_CABLE');
  });

  it('erro clássico: vídeo na placa-mãe com GPU dedicada → SEM SINAL com explicação', () => {
    const info = deriveMonitorScreen({
      placedDeskItems: REQUIRED_DESK_ITEMS,
      externalCabling: withConnections({ ...POWERED_MONITOR, CABLE_DISPLAY: { sourcePort: 'MB_HDMI', destPort: 'MONITOR_HDMI_IN' } }),
      assembly: gpuPc,
      isPcPoweredOn: true,
    });
    expect(info.state).toBe('NO_SIGNAL');
    expect(info.reason).toBe('GPU_BYPASS_NO_SIGNAL');
    expect(info.message).toMatch(/placa de vídeo/i);
  });

  it('vídeo na GPU dedicada: imagem na entrada certa (DisplayPort)', () => {
    const info = deriveMonitorScreen({
      placedDeskItems: REQUIRED_DESK_ITEMS,
      externalCabling: withConnections({ ...POWERED_MONITOR, CABLE_DISPLAY: { sourcePort: 'GPU_DP_1', destPort: 'MONITOR_DP_IN' } }),
      assembly: gpuPc,
      isPcPoweredOn: true,
    });
    expect(info.state).toBe('SIGNAL');
    expect(info.input).toBe('DisplayPort');
    expect(info.led).toBe('ON');
  });

  it('vídeo onboard com CPU de vídeo integrado e sem GPU: imagem via HDMI', () => {
    const info = deriveMonitorScreen({
      placedDeskItems: REQUIRED_DESK_ITEMS,
      externalCabling: withConnections({ ...POWERED_MONITOR, CABLE_DISPLAY: { sourcePort: 'MB_HDMI', destPort: 'MONITOR_HDMI_IN' } }),
      assembly: igpuPc,
      isPcPoweredOn: true,
    });
    expect(info.state).toBe('SIGNAL');
    expect(info.input).toBe('HDMI');
  });

  it('informa se teclado e mouse foram detectados pelo sistema', () => {
    const info = deriveMonitorScreen({
      placedDeskItems: REQUIRED_DESK_ITEMS,
      externalCabling: withConnections({
        ...POWERED_MONITOR,
        CABLE_DISPLAY: { sourcePort: 'GPU_DP_1', destPort: 'MONITOR_DP_IN' },
        CABLE_USB_KEYBOARD: { sourcePort: 'KEYBOARD_USB', destPort: 'PC_USB_1' },
      }),
      assembly: gpuPc,
      isPcPoweredOn: true,
    });
    expect(info.keyboardDetected).toBe(true);
    expect(info.mouseDetected).toBe(false);
  });
});

describe('Linha do tempo do boot (getBootPhase)', () => {
  it('POST → carregamento do AcademyOS → área de trabalho', () => {
    expect(getBootPhase(0)).toBe('POST');
    expect(getBootPhase(BOOT_TIMELINE_MS.POST - 1)).toBe('POST');
    expect(getBootPhase(BOOT_TIMELINE_MS.POST)).toBe('LOADING');
    expect(getBootPhase(BOOT_TIMELINE_MS.POST + BOOT_TIMELINE_MS.LOADING)).toBe('DESKTOP');
    expect(getBootPhase(60_000)).toBe('DESKTOP');
  });
});

describe('POST reprovado na tela', () => {
  it('com imagem, mas o POST falhou: a tela mostra o erro do POST', () => {
    const info = deriveMonitorScreen({
      placedDeskItems: REQUIRED_DESK_ITEMS,
      externalCabling: withConnections({ ...POWERED_MONITOR, CABLE_DISPLAY: { sourcePort: 'GPU_DP_1', destPort: 'MONITOR_DP_IN' } }),
      assembly: gpuPc,
      isPcPoweredOn: true,
      postFailure: { title: 'Fonte Insuficiente', message: 'A fonte não entrega a potência exigida.' },
    });
    expect(info.state).toBe('SIGNAL');
    expect(info.postFailure?.title).toBe('Fonte Insuficiente');
  });
});
