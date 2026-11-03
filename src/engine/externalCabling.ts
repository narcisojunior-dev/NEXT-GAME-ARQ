import { AssemblyState } from './types';
import { DeskSnapPointId, PlacedDeskItem } from './deskSetup';

export type ExternalCableId =
  | 'CABLE_POWER_AC'
  | 'CABLE_POWER_MONITOR'
  | 'CABLE_DISPLAY'
  | 'CABLE_USB_KEYBOARD'
  | 'CABLE_USB_MOUSE'
  | 'CABLE_AUDIO_JACK'
  | 'CABLE_ETHERNET';

export type ExternalPortId =
  | 'PC_AC_INLET'
  | 'MONITOR_AC_INLET'
  | 'GPU_DP_1'
  | 'GPU_HDMI_1'
  | 'MB_HDMI'
  | 'MB_DP'
  | 'MONITOR_DP_IN'
  | 'MONITOR_HDMI_IN'
  | 'PC_USB_1'
  | 'PC_USB_2'
  | 'PC_USB_3'
  | 'PC_USB_4'
  | 'PC_AUDIO_OUT'
  | 'PC_ETHERNET_PORT'
  | 'WALL_OUTLET_1'
  | 'WALL_OUTLET_2'
  | 'WALL_RJ45';

export interface ExternalPortSpec {
  id: ExternalPortId;
  name: string;
  hostComponent: 'PC' | 'MONITOR' | 'WALL' | 'DESK';
  portType: 'AC_POWER' | 'HDMI' | 'DP' | 'USB' | 'AUDIO_35MM' | 'RJ45';
  relativePosition: [number, number, number];
}

export const EXTERNAL_PORTS: Record<ExternalPortId, ExternalPortSpec> = {
  PC_AC_INLET: {
    id: 'PC_AC_INLET',
    name: 'Entrada de Energia da Fonte (AC C14)',
    hostComponent: 'PC',
    portType: 'AC_POWER',
    relativePosition: [1.35, 0.45, -0.32],
  },
  MONITOR_AC_INLET: {
    id: 'MONITOR_AC_INLET',
    name: 'Entrada de Energia do Monitor (AC)',
    hostComponent: 'MONITOR',
    portType: 'AC_POWER',
    relativePosition: [-0.15, 0.95, -0.42],
  },
  GPU_DP_1: {
    id: 'GPU_DP_1',
    name: 'DisplayPort 1 (Placa de Vídeo Dedicada)',
    hostComponent: 'PC',
    portType: 'DP',
    relativePosition: [1.35, 0.65, -0.32],
  },
  GPU_HDMI_1: {
    id: 'GPU_HDMI_1',
    name: 'HDMI 1 (Placa de Vídeo Dedicada)',
    hostComponent: 'PC',
    portType: 'HDMI',
    relativePosition: [1.35, 0.62, -0.32],
  },
  MB_HDMI: {
    id: 'MB_HDMI',
    name: 'HDMI Onboard (Painel Traseiro da Placa-Mãe)',
    hostComponent: 'PC',
    portType: 'HDMI',
    relativePosition: [1.35, 0.82, -0.32],
  },
  MB_DP: {
    id: 'MB_DP',
    name: 'DisplayPort Onboard (Painel Traseiro da Placa-Mãe)',
    hostComponent: 'PC',
    portType: 'DP',
    relativePosition: [1.35, 0.85, -0.32],
  },
  MONITOR_DP_IN: {
    id: 'MONITOR_DP_IN',
    name: 'DisplayPort IN (Monitor)',
    hostComponent: 'MONITOR',
    portType: 'DP',
    relativePosition: [0.05, 0.95, -0.42],
  },
  MONITOR_HDMI_IN: {
    id: 'MONITOR_HDMI_IN',
    name: 'HDMI IN (Monitor)',
    hostComponent: 'MONITOR',
    portType: 'HDMI',
    relativePosition: [0.15, 0.95, -0.42],
  },
  PC_USB_1: {
    id: 'PC_USB_1',
    name: 'USB Traseira 1 (Teclado)',
    hostComponent: 'PC',
    portType: 'USB',
    relativePosition: [1.35, 0.78, -0.32],
  },
  PC_USB_2: {
    id: 'PC_USB_2',
    name: 'USB Traseira 2 (Mouse)',
    hostComponent: 'PC',
    portType: 'USB',
    relativePosition: [1.35, 0.76, -0.32],
  },
  PC_USB_3: {
    id: 'PC_USB_3',
    name: 'USB Traseira 3',
    hostComponent: 'PC',
    portType: 'USB',
    relativePosition: [1.35, 0.74, -0.32],
  },
  PC_USB_4: {
    id: 'PC_USB_4',
    name: 'USB Traseira 4',
    hostComponent: 'PC',
    portType: 'USB',
    relativePosition: [1.35, 0.72, -0.32],
  },
  PC_AUDIO_OUT: {
    id: 'PC_AUDIO_OUT',
    name: 'Saída de Áudio Verde P2 (Line-Out)',
    hostComponent: 'PC',
    portType: 'AUDIO_35MM',
    relativePosition: [1.35, 0.70, -0.32],
  },
  PC_ETHERNET_PORT: {
    id: 'PC_ETHERNET_PORT',
    name: 'Porta Gigabit Ethernet (RJ-45)',
    hostComponent: 'PC',
    portType: 'RJ45',
    relativePosition: [1.35, 0.80, -0.32],
  },
  WALL_OUTLET_1: {
    id: 'WALL_OUTLET_1',
    name: 'Tomada da Parede / Filtro 1 (PC)',
    hostComponent: 'WALL',
    portType: 'AC_POWER',
    relativePosition: [1.2, 0.15, -0.9],
  },
  WALL_OUTLET_2: {
    id: 'WALL_OUTLET_2',
    name: 'Tomada da Parede / Filtro 2 (Monitor)',
    hostComponent: 'WALL',
    portType: 'AC_POWER',
    relativePosition: [0.8, 0.15, -0.9],
  },
  WALL_RJ45: {
    id: 'WALL_RJ45',
    name: 'Tomada de Rede RJ-45 da Sala',
    hostComponent: 'WALL',
    portType: 'RJ45',
    relativePosition: [1.5, 0.25, -0.9],
  },
};

export interface ExternalCableSpec {
  id: ExternalCableId;
  name: string;
  cableType: 'POWER' | 'DISPLAY' | 'USB' | 'AUDIO' | 'NETWORK';
  color: string;
  thickness: number;
  isRequiredForBoot: boolean;
  allowedSourcePorts: ExternalPortId[];
  allowedDestinationPorts: ExternalPortId[];
  associatedSnapPoints: DeskSnapPointId[];
}

export const EXTERNAL_CABLES: Record<ExternalCableId, ExternalCableSpec> = {
  CABLE_POWER_AC: {
    id: 'CABLE_POWER_AC',
    name: 'Cabo de Força Tripolar C13/C14 (Fonte do PC)',
    cableType: 'POWER',
    color: '#0f172a',
    thickness: 0.015,
    isRequiredForBoot: true,
    allowedSourcePorts: ['PC_AC_INLET'],
    allowedDestinationPorts: ['WALL_OUTLET_1', 'WALL_OUTLET_2'],
    associatedSnapPoints: ['PC_TOWER', 'DESK_BASE'],
  },
  CABLE_POWER_MONITOR: {
    id: 'CABLE_POWER_MONITOR',
    name: 'Cabo de Força do Monitor',
    cableType: 'POWER',
    color: '#1e293b',
    thickness: 0.013,
    isRequiredForBoot: true,
    allowedSourcePorts: ['MONITOR_AC_INLET'],
    allowedDestinationPorts: ['WALL_OUTLET_1', 'WALL_OUTLET_2'],
    associatedSnapPoints: ['MONITOR_MAIN', 'DESK_BASE'],
  },
  CABLE_DISPLAY: {
    id: 'CABLE_DISPLAY',
    name: 'Cabo de Vídeo HDMI / DisplayPort de Alta Velocidade',
    cableType: 'DISPLAY',
    color: '#0284c7',
    thickness: 0.012,
    isRequiredForBoot: true,
    allowedSourcePorts: ['GPU_HDMI_1', 'GPU_DP_1', 'MB_HDMI', 'MB_DP'],
    allowedDestinationPorts: ['MONITOR_HDMI_IN', 'MONITOR_DP_IN'],
    associatedSnapPoints: ['PC_TOWER', 'MONITOR_MAIN'],
  },
  CABLE_USB_KEYBOARD: {
    id: 'CABLE_USB_KEYBOARD',
    name: 'Cabo USB do Teclado',
    cableType: 'USB',
    color: '#334155',
    thickness: 0.009,
    isRequiredForBoot: true,
    allowedSourcePorts: ['PC_USB_1', 'PC_USB_2', 'PC_USB_3', 'PC_USB_4'],
    allowedDestinationPorts: ['PC_USB_1', 'PC_USB_2', 'PC_USB_3', 'PC_USB_4'],
    associatedSnapPoints: ['KEYBOARD', 'PC_TOWER'],
  },
  CABLE_USB_MOUSE: {
    id: 'CABLE_USB_MOUSE',
    name: 'Cabo USB do Mouse',
    cableType: 'USB',
    color: '#334155',
    thickness: 0.008,
    isRequiredForBoot: true,
    allowedSourcePorts: ['PC_USB_1', 'PC_USB_2', 'PC_USB_3', 'PC_USB_4'],
    allowedDestinationPorts: ['PC_USB_1', 'PC_USB_2', 'PC_USB_3', 'PC_USB_4'],
    associatedSnapPoints: ['MOUSE', 'PC_TOWER'],
  },
  CABLE_AUDIO_JACK: {
    id: 'CABLE_AUDIO_JACK',
    name: 'Cabo de Áudio P2 3.5mm / Headset',
    cableType: 'AUDIO',
    color: '#10b981',
    thickness: 0.007,
    isRequiredForBoot: false,
    allowedSourcePorts: ['PC_AUDIO_OUT'],
    allowedDestinationPorts: ['PC_AUDIO_OUT'],
    associatedSnapPoints: ['HEADSET', 'PC_TOWER'],
  },
  CABLE_ETHERNET: {
    id: 'CABLE_ETHERNET',
    name: 'Cabo de Rede Ethernet Cat6 RJ-45',
    cableType: 'NETWORK',
    color: '#eab308',
    thickness: 0.010,
    isRequiredForBoot: false,
    allowedSourcePorts: ['PC_ETHERNET_PORT'],
    allowedDestinationPorts: ['WALL_RJ45'],
    associatedSnapPoints: ['PC_TOWER', 'DESK_BASE'],
  },
};

export interface ExternalCableConnection {
  sourcePort: ExternalPortId;
  destPort: ExternalPortId;
}

export interface ExternalCablingState {
  connections: Record<ExternalCableId, ExternalCableConnection | null>;
}

export function createInitialExternalCablesState(): ExternalCablingState {
  return {
    connections: {
      CABLE_POWER_AC: null,
      CABLE_POWER_MONITOR: null,
      CABLE_DISPLAY: null,
      CABLE_USB_KEYBOARD: null,
      CABLE_USB_MOUSE: null,
      CABLE_AUDIO_JACK: null,
      CABLE_ETHERNET: null,
    },
  };
}

export interface ExternalCableValidationResult {
  allowed: boolean;
  isPedagogicallyValid: boolean;
  errorType?: 'GPU_BYPASS_NO_SIGNAL' | 'NO_IGPU_NO_SIGNAL' | 'INCOMPATIBLE_PORT';
  title?: string;
  message?: string;
  penalty?: number;
}

export function validateExternalCableConnection(
  cableId: ExternalCableId,
  sourcePort: ExternalPortId,
  destPort: ExternalPortId,
  assembly: AssemblyState
): ExternalCableValidationResult {
  const spec = EXTERNAL_CABLES[cableId];
  if (!spec) {
    return {
      allowed: false,
      isPedagogicallyValid: false,
      message: 'Cabo externo inexistente.',
    };
  }

  // Verifica compatibilidade de portas com o cabo
  const isValidSource = spec.allowedSourcePorts.includes(sourcePort) || spec.allowedDestinationPorts.includes(sourcePort);
  const isValidDest = spec.allowedDestinationPorts.includes(destPort) || spec.allowedSourcePorts.includes(destPort);

  if (!isValidSource || !isValidDest) {
    return {
      allowed: false,
      isPedagogicallyValid: false,
      errorType: 'INCOMPATIBLE_PORT',
      title: 'Porta Incompatível',
      message: `O conector do cabo ${spec.name} não encaixa nesta porta.`,
    };
  }

  // REGRA DE OURO DIDÁTICA DA GPU (Erro clássico número 1 de montadores iniciantes)
  if (cableId === 'CABLE_DISPLAY') {
    const isPluggedIntoMotherboard =
      sourcePort === 'MB_HDMI' ||
      sourcePort === 'MB_DP' ||
      destPort === 'MB_HDMI' ||
      destPort === 'MB_DP';

    if (isPluggedIntoMotherboard) {
      if (assembly.gpuInstalled) {
        // Fisicamente aceito, mas pedagogicamente incorreto! Sem sinal na tela!
        return {
          allowed: true,
          isPedagogicallyValid: false,
          errorType: 'GPU_BYPASS_NO_SIGNAL',
          title: 'Tela Sem Sinal (Cabo no lugar errado!)',
          message:
            'Você conectou o monitor na saída de vídeo da placa-mãe, mas o computador possui uma placa de vídeo dedicada instalada. Conecte o cabo de vídeo diretamente nas saídas da GPU para ter sinal de vídeo!',
          penalty: 100,
        };
      }

      // Se não há GPU dedicada instalada, verifica se o processador tem vídeo integrado
      if (!assembly.cpuInstalled?.hasIntegratedGpu) {
        return {
          allowed: true,
          isPedagogicallyValid: false,
          errorType: 'NO_IGPU_NO_SIGNAL',
          title: 'Processador Sem Vídeo Integrado',
          message:
            'O processador instalado não possui chip gráfico integrado (iGPU). É necessário instalar uma placa de vídeo dedicada para obter imagem na tela.',
          penalty: 100,
        };
      }

      // CPU com iGPU e sem GPU dedicada: 100% válido conectar na placa-mãe!
      return {
        allowed: true,
        isPedagogicallyValid: true,
      };
    }

    // Plugado nas saídas da GPU dedicada
    const isPluggedIntoGpu =
      sourcePort === 'GPU_HDMI_1' ||
      sourcePort === 'GPU_DP_1' ||
      destPort === 'GPU_HDMI_1' ||
      destPort === 'GPU_DP_1';

    if (isPluggedIntoGpu) {
      return {
        allowed: true,
        isPedagogicallyValid: true,
      };
    }
  }

  return {
    allowed: true,
    isPedagogicallyValid: true,
  };
}

export interface ExternalCablesStatus {
  hasPowerAc: boolean;
  hasPowerMonitor: boolean;
  hasDisplay: boolean;
  hasDisplayCorrect: boolean;
  hasKeyboard: boolean;
  hasMouse: boolean;
  allRequiredConnected: boolean;
}

export function evaluateExternalCablesStatus(
  cablingState: ExternalCablingState,
  assembly: AssemblyState
): ExternalCablesStatus {
  const hasPowerAc = Boolean(cablingState.connections.CABLE_POWER_AC);
  const hasPowerMonitor = Boolean(cablingState.connections.CABLE_POWER_MONITOR);

  const displayConn = cablingState.connections.CABLE_DISPLAY;
  const hasDisplay = Boolean(displayConn);

  let hasDisplayCorrect = false;
  if (displayConn) {
    const val = validateExternalCableConnection(
      'CABLE_DISPLAY',
      displayConn.sourcePort,
      displayConn.destPort,
      assembly
    );
    hasDisplayCorrect = val.isPedagogicallyValid;
  }

  const hasKeyboard = Boolean(cablingState.connections.CABLE_USB_KEYBOARD);
  const hasMouse = Boolean(cablingState.connections.CABLE_USB_MOUSE);

  const allRequiredConnected =
    hasPowerAc &&
    hasPowerMonitor &&
    hasDisplayCorrect &&
    hasKeyboard &&
    hasMouse;

  return {
    hasPowerAc,
    hasPowerMonitor,
    hasDisplay,
    hasDisplayCorrect,
    hasKeyboard,
    hasMouse,
    allRequiredConnected,
  };
}

export function pruneExternalCables(
  cablingState: ExternalCablingState,
  placedDeskItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>
): ExternalCablingState {
  const nextConnections = { ...cablingState.connections };

  // Se o PC não estiver na mesa, nenhum cabo ligado ao PC pode permanecer
  if (!placedDeskItems.PC_TOWER) {
    nextConnections.CABLE_POWER_AC = null;
    nextConnections.CABLE_DISPLAY = null;
    nextConnections.CABLE_USB_KEYBOARD = null;
    nextConnections.CABLE_USB_MOUSE = null;
    nextConnections.CABLE_AUDIO_JACK = null;
    nextConnections.CABLE_ETHERNET = null;
  }

  // Se o monitor não estiver na mesa
  if (!placedDeskItems.MONITOR_MAIN) {
    nextConnections.CABLE_POWER_MONITOR = null;
    nextConnections.CABLE_DISPLAY = null;
  }

  // Se o teclado não estiver na mesa
  if (!placedDeskItems.KEYBOARD) {
    nextConnections.CABLE_USB_KEYBOARD = null;
  }

  // Se o mouse não estiver na mesa
  if (!placedDeskItems.MOUSE) {
    nextConnections.CABLE_USB_MOUSE = null;
  }

  // Se o headset não estiver na mesa
  if (!placedDeskItems.HEADSET) {
    nextConnections.CABLE_AUDIO_JACK = null;
  }

  return {
    connections: nextConnections,
  };
}

