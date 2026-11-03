import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  EXTERNAL_CABLES,
  EXTERNAL_PORTS,
  ExternalCableId,
  ExternalPortId,
  validateExternalCableConnection,
  evaluateExternalCablesStatus,
  pruneExternalCables,
  createInitialExternalCablesState,
  ExternalCablingState,
  getCableEndCandidates,
  getFixedCableEnd,
  getPortStatus,
} from '../externalCabling';
import { AssemblyState } from '../types';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';
import { DeskSnapPointId, PlacedDeskItem } from '../deskSetup';
import {
  CPU_NO_IGPU,
  CPU_WITH_IGPU,
  FULL_DESK_ITEMS,
  READY_GPU,
  REQUIRED_DESK_ITEMS,
} from './fixtures/readyPc';

/** Cabeamento obrigatório completo e correto (vídeo na GPU dedicada) */
const COMPLETE_CONNECTIONS: ExternalCablingState['connections'] = {
  CABLE_POWER_AC: { sourcePort: 'PC_AC_INLET', destPort: 'WALL_OUTLET_1' },
  CABLE_POWER_MONITOR: { sourcePort: 'MONITOR_AC_INLET', destPort: 'WALL_OUTLET_2' },
  CABLE_DISPLAY: { sourcePort: 'GPU_HDMI_1', destPort: 'MONITOR_HDMI_IN' },
  CABLE_USB_KEYBOARD: { sourcePort: 'KEYBOARD_USB', destPort: 'PC_USB_1' },
  CABLE_USB_MOUSE: { sourcePort: 'MOUSE_USB', destPort: 'PC_USB_2' },
  CABLE_AUDIO_JACK: null,
  CABLE_ETHERNET: null,
};

describe('1. Especificação de Cabos e Portas Externas (EXTERNAL_CABLES & EXTERNAL_PORTS)', () => {
  const REQUIRED_CABLES: ExternalCableId[] = [
    'CABLE_POWER_AC',
    'CABLE_POWER_MONITOR',
    'CABLE_DISPLAY',
    'CABLE_USB_KEYBOARD',
    'CABLE_USB_MOUSE',
    'CABLE_AUDIO_JACK',
    'CABLE_ETHERNET',
  ];

  it('deve conter exatamente os 7 cabos externos canônicos', () => {
    expect(Object.keys(EXTERNAL_CABLES)).toHaveLength(7);
    REQUIRED_CABLES.forEach((id) => {
      const cable = EXTERNAL_CABLES[id];
      expect(cable).toBeDefined();
      expect(cable.id).toBe(id);
      expect(typeof cable.name).toBe('string');
      expect(cable.allowedSourcePorts.length).toBeGreaterThan(0);
      expect(cable.allowedDestinationPorts.length).toBeGreaterThan(0);
    });
  });

  it('deve conter as portas de alimentação, vídeo da GPU, vídeo onboard, USBs, áudio e rede', () => {
    const REQUIRED_PORTS: ExternalPortId[] = [
      'PC_AC_INLET',
      'MONITOR_AC_INLET',
      'GPU_DP_1',
      'GPU_HDMI_1',
      'MB_HDMI',
      'MB_DP',
      'MONITOR_DP_IN',
      'MONITOR_HDMI_IN',
      'PC_USB_1',
      'PC_USB_2',
      'PC_AUDIO_OUT',
      'PC_ETHERNET_PORT',
      'WALL_OUTLET_1',
      'WALL_OUTLET_2',
      'WALL_RJ45',
      'KEYBOARD_USB',
      'MOUSE_USB',
      'HEADSET_P2',
    ];

    REQUIRED_PORTS.forEach((portId) => {
      expect(EXTERNAL_PORTS[portId]).toBeDefined();
      expect(EXTERNAL_PORTS[portId].id).toBe(portId);
    });
  });

  it('cada cabo tem duas pontas distintas: origem e destino nunca compartilham portas', () => {
    // Regressão: os cabos USB/P2 aceitavam a mesma porta nas duas pontas (PC_USB_1 → PC_USB_1)
    Object.values(EXTERNAL_CABLES).forEach((cable) => {
      const overlap = cable.allowedSourcePorts.filter((p) => cable.allowedDestinationPorts.includes(p));
      expect(overlap).toEqual([]);
    });
  });

  it('as pontas de cada cabo usam o mesmo tipo de conector físico', () => {
    Object.values(EXTERNAL_CABLES).forEach((cable) => {
      const sourceTypes = new Set(cable.allowedSourcePorts.map((p) => EXTERNAL_PORTS[p].portType));
      const destTypes = new Set(cable.allowedDestinationPorts.map((p) => EXTERNAL_PORTS[p].portType));
      [...sourceTypes].forEach((type) => expect(destTypes.has(type)).toBe(true));
    });
  });
});

describe('2. Validação Didática da Saída de Vídeo (Regra de Ouro da GPU)', () => {
  const assemblyWithGpu: AssemblyState = {
    ...INITIAL_ASSEMBLY_STATE,
    cpuInstalled: CPU_NO_IGPU, // Core i5-13400F (sem iGPU)
    gpuInstalled: READY_GPU, // RTX 4060
  };

  const assemblyWithIgpuNoGpu: AssemblyState = {
    ...INITIAL_ASSEMBLY_STATE,
    cpuInstalled: CPU_WITH_IGPU, // Core i5-13600K (com iGPU)
    gpuInstalled: null,
  };

  const assemblyNoIgpuNoGpu: AssemblyState = {
    ...INITIAL_ASSEMBLY_STATE,
    cpuInstalled: CPU_NO_IGPU,
    gpuInstalled: null,
  };

  it('permite e aprova conexão de vídeo nas saídas da GPU dedicada (GPU_HDMI_1 / GPU_DP_1)', () => {
    const hdmi = validateExternalCableConnection('CABLE_DISPLAY', 'GPU_HDMI_1', 'MONITOR_HDMI_IN', assemblyWithGpu);
    expect(hdmi.allowed).toBe(true);
    expect(hdmi.isPedagogicallyValid).toBe(true);
    expect(hdmi.errorType).toBeUndefined();

    const dp = validateExternalCableConnection('CABLE_DISPLAY', 'GPU_DP_1', 'MONITOR_DP_IN', assemblyWithGpu);
    expect(dp.allowed).toBe(true);
    expect(dp.isPedagogicallyValid).toBe(true);
  });

  it('detecta o erro clássico de montador iniciante: vídeo na placa-mãe (MB_HDMI) com GPU dedicada instalada', () => {
    const res = validateExternalCableConnection('CABLE_DISPLAY', 'MB_HDMI', 'MONITOR_HDMI_IN', assemblyWithGpu);
    // Fisicamente a ponta entra no HDMI da placa-mãe, mas didaticamente não dá vídeo!
    expect(res.allowed).toBe(true);
    expect(res.isPedagogicallyValid).toBe(false);
    expect(res.errorType).toBe('GPU_BYPASS_NO_SIGNAL');
    expect(res.title).toMatch(/Sem Sinal/i);
    expect(res.message).toMatch(/placa de vídeo dedicada/i);
  });

  it('aplica a mesma regra no DisplayPort onboard (MB_DP)', () => {
    const res = validateExternalCableConnection('CABLE_DISPLAY', 'MB_DP', 'MONITOR_DP_IN', assemblyWithGpu);
    expect(res.allowed).toBe(true);
    expect(res.errorType).toBe('GPU_BYPASS_NO_SIGNAL');
  });

  it('permite e aprova vídeo na placa-mãe (MB_HDMI) quando o processador possui vídeo integrado e não há GPU', () => {
    const res = validateExternalCableConnection('CABLE_DISPLAY', 'MB_HDMI', 'MONITOR_HDMI_IN', assemblyWithIgpuNoGpu);
    expect(res.allowed).toBe(true);
    expect(res.isPedagogicallyValid).toBe(true);
    expect(res.errorType).toBeUndefined();
  });

  it('avisa que não haverá imagem com vídeo onboard quando a CPU não tem iGPU e não há GPU', () => {
    const res = validateExternalCableConnection('CABLE_DISPLAY', 'MB_HDMI', 'MONITOR_HDMI_IN', assemblyNoIgpuNoGpu);
    expect(res.allowed).toBe(true);
    expect(res.isPedagogicallyValid).toBe(false);
    expect(res.errorType).toBe('NO_IGPU_NO_SIGNAL');
  });

  it('recusa as saídas da GPU quando não há placa de vídeo dedicada instalada (a porta não existe)', () => {
    // Regressão: antes era aprovado como vídeo correto mesmo sem GPU no PC
    const res = validateExternalCableConnection('CABLE_DISPLAY', 'GPU_HDMI_1', 'MONITOR_HDMI_IN', assemblyWithIgpuNoGpu);
    expect(res.allowed).toBe(false);
    expect(res.isPedagogicallyValid).toBe(false);
    expect(res.errorType).toBe('PORT_NOT_PRESENT');
  });

  it('recusa HDMI de um lado e DisplayPort do outro (conectores físicos diferentes)', () => {
    const res = validateExternalCableConnection('CABLE_DISPLAY', 'GPU_HDMI_1', 'MONITOR_DP_IN', assemblyWithGpu);
    expect(res.allowed).toBe(false);
    expect(res.errorType).toBe('INCOMPATIBLE_PORT');
    expect(res.message).toMatch(/HDMI/);
  });

  it('rejeita porta incompatível com o tipo de cabo (ex: cabo de energia AC tentando plugar em porta HDMI)', () => {
    const res = validateExternalCableConnection('CABLE_POWER_AC', 'PC_AC_INLET', 'MONITOR_HDMI_IN', assemblyWithGpu);
    expect(res.allowed).toBe(false);
    expect(res.isPedagogicallyValid).toBe(false);
    expect(res.errorType).toBe('INCOMPATIBLE_PORT');
  });

  it('rejeita ligar as duas pontas do cabo de força na parede (tomada → tomada)', () => {
    const res = validateExternalCableConnection('CABLE_POWER_AC', 'WALL_OUTLET_1', 'WALL_OUTLET_2', assemblyWithGpu);
    expect(res.allowed).toBe(false);
    expect(res.errorType).toBe('INCOMPATIBLE_PORT');
  });

  it('rejeita cabo USB do teclado ligado de uma porta USB do PC para outra', () => {
    const res = validateExternalCableConnection('CABLE_USB_KEYBOARD', 'PC_USB_1', 'PC_USB_2', assemblyWithGpu);
    expect(res.allowed).toBe(false);
    expect(res.errorType).toBe('INCOMPATIBLE_PORT');
  });

  it('aceita as pontas em ordem invertida e devolve a conexão normalizada (origem → destino)', () => {
    const res = validateExternalCableConnection('CABLE_DISPLAY', 'MONITOR_HDMI_IN', 'GPU_HDMI_1', assemblyWithGpu);
    expect(res.allowed).toBe(true);
    expect(res.isPedagogicallyValid).toBe(true);
    expect(res.connection).toEqual({ sourcePort: 'GPU_HDMI_1', destPort: 'MONITOR_HDMI_IN' });
  });
});

describe('3. Contexto físico da mesa: dispositivos posicionados e portas ocupadas', () => {
  const assemblyWithGpu: AssemblyState = {
    ...INITIAL_ASSEMBLY_STATE,
    cpuInstalled: CPU_NO_IGPU,
    gpuInstalled: READY_GPU,
  };

  it('recusa conectar um cabo se o dispositivo da ponta ainda não está na mesa', () => {
    const withoutPc: Partial<Record<DeskSnapPointId, PlacedDeskItem>> = { ...REQUIRED_DESK_ITEMS };
    delete withoutPc.PC_TOWER;

    const res = validateExternalCableConnection('CABLE_POWER_AC', 'PC_AC_INLET', 'WALL_OUTLET_1', assemblyWithGpu, {
      placedDeskItems: withoutPc,
    });
    expect(res.allowed).toBe(false);
    expect(res.errorType).toBe('DEVICE_NOT_PLACED');
    expect(res.message).toMatch(/Gabinete/i);
  });

  it('recusa o cabo do headset sem headset na mesa e aceita depois de posicioná-lo', () => {
    const blocked = validateExternalCableConnection('CABLE_AUDIO_JACK', 'HEADSET_P2', 'PC_AUDIO_OUT', assemblyWithGpu, {
      placedDeskItems: REQUIRED_DESK_ITEMS,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.errorType).toBe('DEVICE_NOT_PLACED');

    const ok = validateExternalCableConnection('CABLE_AUDIO_JACK', 'HEADSET_P2', 'PC_AUDIO_OUT', assemblyWithGpu, {
      placedDeskItems: FULL_DESK_ITEMS,
    });
    expect(ok.allowed).toBe(true);
  });

  it('recusa plugar dois cabos na mesma porta (teclado e mouse na PC_USB_1)', () => {
    const cablingState: ExternalCablingState = {
      connections: { ...createInitialExternalCablesState().connections, CABLE_USB_KEYBOARD: { sourcePort: 'KEYBOARD_USB', destPort: 'PC_USB_1' } },
    };
    const res = validateExternalCableConnection('CABLE_USB_MOUSE', 'MOUSE_USB', 'PC_USB_1', assemblyWithGpu, {
      placedDeskItems: REQUIRED_DESK_ITEMS,
      cablingState,
    });
    expect(res.allowed).toBe(false);
    expect(res.errorType).toBe('PORT_OCCUPIED');
    expect(res.message).toMatch(/Teclado/i);
  });

  it('permite reconectar o mesmo cabo em outra porta (a porta antiga dele não conta como ocupada)', () => {
    const cablingState: ExternalCablingState = {
      connections: { ...createInitialExternalCablesState().connections, CABLE_USB_KEYBOARD: { sourcePort: 'KEYBOARD_USB', destPort: 'PC_USB_1' } },
    };
    const res = validateExternalCableConnection('CABLE_USB_KEYBOARD', 'KEYBOARD_USB', 'PC_USB_3', assemblyWithGpu, {
      placedDeskItems: REQUIRED_DESK_ITEMS,
      cablingState,
    });
    expect(res.allowed).toBe(true);
  });
});

describe('4. Avaliação de Status dos Cabos Externos (evaluateExternalCablesStatus)', () => {
  const assemblyWithGpu: AssemblyState = {
    ...INITIAL_ASSEMBLY_STATE,
    cpuInstalled: CPU_NO_IGPU,
    gpuInstalled: READY_GPU,
  };

  it('indica falta de cabos obrigatórios quando a mesa está sem conexões', () => {
    const state = createInitialExternalCablesState();
    const status = evaluateExternalCablesStatus(state, assemblyWithGpu);
    expect(status.allRequiredConnected).toBe(false);
    expect(status.hasPowerAc).toBe(false);
    expect(status.hasPowerMonitor).toBe(false);
    expect(status.hasDisplayCorrect).toBe(false);
  });

  it('aprova o cabeamento obrigatório completo e correto para ligar o PC na mesa', () => {
    const status = evaluateExternalCablesStatus({ connections: COMPLETE_CONNECTIONS }, assemblyWithGpu);
    expect(status.hasPowerAc).toBe(true);
    expect(status.hasPowerMonitor).toBe(true);
    expect(status.hasDisplayCorrect).toBe(true);
    expect(status.allRequiredConnected).toBe(true);
  });

  it('reprova hasDisplayCorrect se o cabo de vídeo estiver conectado na placa-mãe em vez da GPU', () => {
    const status = evaluateExternalCablesStatus(
      { connections: { ...COMPLETE_CONNECTIONS, CABLE_DISPLAY: { sourcePort: 'MB_HDMI', destPort: 'MONITOR_HDMI_IN' } } },
      assemblyWithGpu
    );
    expect(status.hasPowerAc).toBe(true);
    expect(status.hasDisplayCorrect).toBe(false);
    expect(status.allRequiredConnected).toBe(false);
  });

  it('reprova o vídeo ligado na GPU se a GPU for removida depois (porta deixa de existir)', () => {
    const status = evaluateExternalCablesStatus({ connections: COMPLETE_CONNECTIONS }, { ...assemblyWithGpu, gpuInstalled: null });
    expect(status.hasDisplay).toBe(true);
    expect(status.hasDisplayCorrect).toBe(false);
    expect(status.allRequiredConnected).toBe(false);
  });
});

describe('5. Poda Automática de Cabos Externos (pruneExternalCables)', () => {
  it('remove cabos de itens que foram retirados da mesa', () => {
    const placedItemsWithoutMonitor: Partial<Record<DeskSnapPointId, PlacedDeskItem>> = { ...REQUIRED_DESK_ITEMS };
    delete placedItemsWithoutMonitor.MONITOR_MAIN;

    const pruned = pruneExternalCables({ connections: COMPLETE_CONNECTIONS }, placedItemsWithoutMonitor);
    // CABLE_POWER_MONITOR e CABLE_DISPLAY devem ter sido podados para null
    expect(pruned.connections.CABLE_POWER_MONITOR).toBeNull();
    expect(pruned.connections.CABLE_DISPLAY).toBeNull();

    // Cabos do PC e periféricos mantidos continuam conectados
    expect(pruned.connections.CABLE_POWER_AC).not.toBeNull();
    expect(pruned.connections.CABLE_USB_KEYBOARD).not.toBeNull();
    expect(pruned.connections.CABLE_USB_MOUSE).not.toBeNull();
  });

  it('remove todos os cabos quando a mesa é esvaziada', () => {
    const pruned = pruneExternalCables({ connections: COMPLETE_CONNECTIONS }, {});
    Object.values(pruned.connections).forEach((conn) => expect(conn).toBeNull());
  });

  it('não muta o estado de entrada', () => {
    const input: ExternalCablingState = { connections: { ...COMPLETE_CONNECTIONS } };
    pruneExternalCables(input, {});
    expect(input.connections.CABLE_POWER_AC).not.toBeNull();
  });
});

describe('6. Pureza do Motor de Cabeamento Externo', () => {
  it('src/engine/externalCabling.ts não deve importar bibliotecas de UI ou DOM', () => {
    const filePath = path.resolve(__dirname, '../externalCabling.ts');
    const content = fs.readFileSync(filePath, 'utf-8');
    const FORBIDDEN = ['react', 'three', '@react-three', 'zustand', 'next', 'window', 'document'];
    FORBIDDEN.forEach((pkg) => {
      const importRegex = new RegExp(`from ['"]${pkg}['"]|require\\(['"]${pkg}['"]\\)`, 'g');
      expect(content).not.toMatch(importRegex);
    });
  });
});

describe('7. Escolha das pontas do cabo (getCableEndCandidates / getPortStatus)', () => {
  const assemblyWithGpu: AssemblyState = { ...INITIAL_ASSEMBLY_STATE, cpuInstalled: CPU_NO_IGPU, gpuInstalled: READY_GPU };
  const assemblyNoGpu: AssemblyState = { ...INITIAL_ASSEMBLY_STATE, cpuInstalled: CPU_WITH_IGPU, gpuInstalled: null };

  it('sem ponta escolhida, oferece as portas das duas pontas; depois, só as do lado oposto', () => {
    expect(getCableEndCandidates('CABLE_DISPLAY', null)).toEqual([
      'GPU_HDMI_1', 'GPU_DP_1', 'MB_HDMI', 'MB_DP', 'MONITOR_HDMI_IN', 'MONITOR_DP_IN',
    ]);
    expect(getCableEndCandidates('CABLE_DISPLAY', 'GPU_DP_1')).toEqual(['MONITOR_HDMI_IN', 'MONITOR_DP_IN']);
    expect(getCableEndCandidates('CABLE_DISPLAY', 'MONITOR_DP_IN')).toEqual(['GPU_HDMI_1', 'GPU_DP_1', 'MB_HDMI', 'MB_DP']);
  });

  it('cabos com ponta fixa (periféricos, força) já começam pela ponta do dispositivo', () => {
    expect(getFixedCableEnd('CABLE_USB_KEYBOARD')).toBe('KEYBOARD_USB');
    expect(getFixedCableEnd('CABLE_POWER_AC')).toBe('PC_AC_INLET');
    expect(getFixedCableEnd('CABLE_DISPLAY')).toBeNull();
  });

  it('porta ocupada por outro cabo e saídas inexistentes da GPU', () => {
    const cabling: ExternalCablingState = {
      connections: { ...createInitialExternalCablesState().connections, CABLE_USB_KEYBOARD: { sourcePort: 'KEYBOARD_USB', destPort: 'PC_USB_1' } },
    };
    expect(getPortStatus('PC_USB_1', 'CABLE_USB_MOUSE', assemblyWithGpu, cabling)).toEqual({ status: 'OCCUPIED', occupiedBy: 'CABLE_USB_KEYBOARD' });
    expect(getPortStatus('PC_USB_1', 'CABLE_USB_KEYBOARD', assemblyWithGpu, cabling).status).toBe('FREE');
    expect(getPortStatus('GPU_HDMI_1', 'CABLE_DISPLAY', assemblyNoGpu, cabling).status).toBe('NOT_PRESENT');
    expect(getPortStatus('GPU_HDMI_1', 'CABLE_DISPLAY', assemblyWithGpu, cabling).status).toBe('FREE');
  });
});
