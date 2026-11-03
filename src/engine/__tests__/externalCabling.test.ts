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
} from '../externalCabling';
import { CPUS, MOTHERBOARDS, GPUS } from '../hardwareCatalog';
import { AssemblyState } from '../types';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';
import { PlacedDeskItem } from '../deskSetup';

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
    ];

    REQUIRED_PORTS.forEach((portId) => {
      expect(EXTERNAL_PORTS[portId]).toBeDefined();
      expect(EXTERNAL_PORTS[portId].id).toBe(portId);
    });
  });
});

describe('2. Validação Didática da Saída de Vídeo (Regra de Ouro da GPU)', () => {
  const assemblyWithGpu: AssemblyState = {
    ...INITIAL_ASSEMBLY_STATE,
    cpuInstalled: CPUS[0], // Ryzen 5600 (sem iGPU)
    gpuInstalled: GPUS[0], // RTX 3060
  };

  const assemblyWithIgpuNoGpu: AssemblyState = {
    ...INITIAL_ASSEMBLY_STATE,
    cpuInstalled: {
      ...CPUS[0],
      hasIntegratedGpu: true,
    },
    gpuInstalled: null,
  };

  it('permite e aprova conexão de vídeo nas saídas da GPU dedicada (GPU_HDMI_1 / GPU_DP_1)', () => {
    const res = validateExternalCableConnection(
      'CABLE_DISPLAY',
      'GPU_HDMI_1',
      'MONITOR_HDMI_IN',
      assemblyWithGpu
    );
    expect(res.allowed).toBe(true);
    expect(res.isPedagogicallyValid).toBe(true);
    expect(res.errorType).toBeUndefined();
  });

  it('detecta o erro clássico de montador iniciante: vídeo na placa-mãe (MB_HDMI) com GPU dedicada instalada', () => {
    const res = validateExternalCableConnection(
      'CABLE_DISPLAY',
      'MB_HDMI',
      'MONITOR_HDMI_IN',
      assemblyWithGpu
    );
    // Fisicamente a ponta entra no HDMI da placa-mãe, mas didaticamente não dá vídeo!
    expect(res.allowed).toBe(true);
    expect(res.isPedagogicallyValid).toBe(false);
    expect(res.errorType).toBe('GPU_BYPASS_NO_SIGNAL');
    expect(res.title).toMatch(/Sem Sinal/i);
    expect(res.message).toMatch(/placa de vídeo dedicada/i);
  });

  it('permite e aprova vídeo na placa-mãe (MB_HDMI) quando o processador possui vídeo integrado e não há GPU', () => {
    const res = validateExternalCableConnection(
      'CABLE_DISPLAY',
      'MB_HDMI',
      'MONITOR_HDMI_IN',
      assemblyWithIgpuNoGpu
    );
    expect(res.allowed).toBe(true);
    expect(res.isPedagogicallyValid).toBe(true);
    expect(res.errorType).toBeUndefined();
  });

  it('rejeita porta incompatível com o tipo de cabo (ex: cabo de energia AC tentando plugar em porta HDMI)', () => {
    const res = validateExternalCableConnection(
      'CABLE_POWER_AC',
      'PC_AC_INLET',
      'MONITOR_HDMI_IN',
      assemblyWithGpu
    );
    expect(res.allowed).toBe(false);
    expect(res.isPedagogicallyValid).toBe(false);
  });
});

describe('3. Avaliação de Status dos Cabos Externos (evaluateExternalCablesStatus)', () => {
  const assemblyWithGpu: AssemblyState = {
    ...INITIAL_ASSEMBLY_STATE,
    cpuInstalled: CPUS[0],
    gpuInstalled: GPUS[0],
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
    const state: ExternalCablingState = {
      connections: {
        CABLE_POWER_AC: { sourcePort: 'PC_AC_INLET', destPort: 'WALL_OUTLET_1' },
        CABLE_POWER_MONITOR: { sourcePort: 'MONITOR_AC_INLET', destPort: 'WALL_OUTLET_2' },
        CABLE_DISPLAY: { sourcePort: 'GPU_HDMI_1', destPort: 'MONITOR_HDMI_IN' },
        CABLE_USB_KEYBOARD: { sourcePort: 'PC_USB_1', destPort: 'PC_USB_1' },
        CABLE_USB_MOUSE: { sourcePort: 'PC_USB_2', destPort: 'PC_USB_2' },
        CABLE_AUDIO_JACK: null,
        CABLE_ETHERNET: null,
      },
    };

    const status = evaluateExternalCablesStatus(state, assemblyWithGpu);
    expect(status.hasPowerAc).toBe(true);
    expect(status.hasPowerMonitor).toBe(true);
    expect(status.hasDisplayCorrect).toBe(true);
    expect(status.allRequiredConnected).toBe(true);
  });

  it('reprova hasDisplayCorrect se o cabo de vídeo estiver conectado na placa-mãe em vez da GPU', () => {
    const state: ExternalCablingState = {
      connections: {
        CABLE_POWER_AC: { sourcePort: 'PC_AC_INLET', destPort: 'WALL_OUTLET_1' },
        CABLE_POWER_MONITOR: { sourcePort: 'MONITOR_AC_INLET', destPort: 'WALL_OUTLET_2' },
        CABLE_DISPLAY: { sourcePort: 'MB_HDMI', destPort: 'MONITOR_HDMI_IN' },
        CABLE_USB_KEYBOARD: { sourcePort: 'PC_USB_1', destPort: 'PC_USB_1' },
        CABLE_USB_MOUSE: { sourcePort: 'PC_USB_2', destPort: 'PC_USB_2' },
        CABLE_AUDIO_JACK: null,
        CABLE_ETHERNET: null,
      },
    };

    const status = evaluateExternalCablesStatus(state, assemblyWithGpu);
    expect(status.hasPowerAc).toBe(true);
    expect(status.hasDisplayCorrect).toBe(false);
    expect(status.allRequiredConnected).toBe(false);
  });
});

describe('4. Poda Automática de Cabos Externos (pruneExternalCables)', () => {
  it('remove cabos de itens que foram retirados da mesa', () => {
    const initialConnections: ExternalCablingState = {
      connections: {
        CABLE_POWER_AC: { sourcePort: 'PC_AC_INLET', destPort: 'WALL_OUTLET_1' },
        CABLE_POWER_MONITOR: { sourcePort: 'MONITOR_AC_INLET', destPort: 'WALL_OUTLET_2' },
        CABLE_DISPLAY: { sourcePort: 'GPU_HDMI_1', destPort: 'MONITOR_HDMI_IN' },
        CABLE_USB_KEYBOARD: { sourcePort: 'PC_USB_1', destPort: 'PC_USB_1' },
        CABLE_USB_MOUSE: { sourcePort: 'PC_USB_2', destPort: 'PC_USB_2' },
        CABLE_AUDIO_JACK: null,
        CABLE_ETHERNET: null,
      },
    };

    // Suponha que o monitor foi removido da mesa (placedDeskItems não tem MONITOR_MAIN)
    const placedItemsWithoutMonitor: Partial<Record<string, PlacedDeskItem>> = {
      DESK_BASE: { snapPointId: 'DESK_BASE', itemId: 'desk', name: 'Mesa', category: 'DESK', price: 400 },
      PC_TOWER: { snapPointId: 'PC_TOWER', itemId: 'pc', name: 'PC', category: 'PC_TOWER', price: 0 },
      KEYBOARD: { snapPointId: 'KEYBOARD', itemId: 'kb', name: 'Teclado', category: 'KEYBOARD', price: 200 },
      MOUSE: { snapPointId: 'MOUSE', itemId: 'mouse', name: 'Mouse', category: 'MOUSE', price: 150 },
    };

    const pruned = pruneExternalCables(initialConnections, placedItemsWithoutMonitor as never);
    // CABLE_POWER_MONITOR e CABLE_DISPLAY devem ter sido podados para null
    expect(pruned.connections.CABLE_POWER_MONITOR).toBeNull();
    expect(pruned.connections.CABLE_DISPLAY).toBeNull();

    // Cabos do PC e periféricos mantidos continuam conectados
    expect(pruned.connections.CABLE_POWER_AC).not.toBeNull();
    expect(pruned.connections.CABLE_USB_KEYBOARD).not.toBeNull();
    expect(pruned.connections.CABLE_USB_MOUSE).not.toBeNull();
  });
});

describe('5. Pureza do Motor de Cabeamento Externo', () => {
  it('src/engine/externalCabling.ts não deve importar bibliotecas de UI ou DOM', () => {
    const filePath = path.resolve(__dirname, '../externalCabling.ts');
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    const FORBIDDEN = [
      'react',
      'three',
      '@react-three',
      'zustand',
      'next',
      'window',
      'document',
    ];
    FORBIDDEN.forEach((pkg) => {
      const importRegex = new RegExp(`from ['"]${pkg}['"]|require\\(['"]${pkg}['"]\\)`, 'g');
      expect(content).not.toMatch(importRegex);
    });
  });
});
