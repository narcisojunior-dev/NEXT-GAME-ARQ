import { AssemblyState } from './types';
import { DESK_SNAP_POINTS, DeskSnapPointId, PlacedDeskItem, REFERENCE_DESK_WIDTH, getSnapPointPosition } from './deskSetup';

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
  | 'WALL_RJ45'
  // Pontas fixas (cabos cativos) dos periféricos: o cabo sai do próprio dispositivo
  | 'KEYBOARD_USB'
  | 'MOUSE_USB'
  | 'HEADSET_P2';

export type ExternalPortType = 'AC_POWER' | 'HDMI' | 'DP' | 'USB' | 'AUDIO_35MM' | 'RJ45';

export interface ExternalPortSpec {
  id: ExternalPortId;
  name: string;
  hostComponent: 'PC' | 'MONITOR' | 'WALL' | 'DESK' | 'PERIPHERAL';
  /** Dispositivo da mesa onde a porta fica; 'WALL' = parede do laboratório */
  hostSnapPoint: DeskSnapPointId | 'WALL';
  portType: ExternalPortType;
  /**
   * Metros. Para portas de dispositivos: deslocamento em relação ao snap point do dispositivo
   * (as portas acompanham o PC/monitor quando a mesa muda de largura). Para a parede: posição no mundo.
   */
  relativePosition: [number, number, number];
}

/** Plano da parede atrás da mesa (m), onde ficam as tomadas e o ponto de rede */
export const WALL_Z = -0.55;
/** Painel traseiro do gabinete: metade da profundidade da torre (0,47 m) */
const PC_REAR = -0.235;
/** Traseira do painel do monitor em relação ao centro da base */
const MONITOR_REAR = -0.04;

export const EXTERNAL_PORTS: Record<ExternalPortId, ExternalPortSpec> = {
  PC_AC_INLET: {
    id: 'PC_AC_INLET',
    name: 'Entrada de Energia da Fonte (AC C14)',
    hostComponent: 'PC',
    hostSnapPoint: 'PC_TOWER',
    portType: 'AC_POWER',
    relativePosition: [0.05, 0.06, PC_REAR],
  },
  MONITOR_AC_INLET: {
    id: 'MONITOR_AC_INLET',
    name: 'Entrada de Energia do Monitor (AC)',
    hostComponent: 'MONITOR',
    hostSnapPoint: 'MONITOR_MAIN',
    portType: 'AC_POWER',
    relativePosition: [-0.08, 0.15, MONITOR_REAR],
  },
  GPU_DP_1: {
    id: 'GPU_DP_1',
    name: 'DisplayPort 1 (Placa de Vídeo Dedicada)',
    hostComponent: 'PC',
    hostSnapPoint: 'PC_TOWER',
    portType: 'DP',
    relativePosition: [-0.02, 0.2, PC_REAR],
  },
  GPU_HDMI_1: {
    id: 'GPU_HDMI_1',
    name: 'HDMI 1 (Placa de Vídeo Dedicada)',
    hostComponent: 'PC',
    hostSnapPoint: 'PC_TOWER',
    portType: 'HDMI',
    relativePosition: [-0.05, 0.2, PC_REAR],
  },
  MB_HDMI: {
    id: 'MB_HDMI',
    name: 'HDMI Onboard (Painel Traseiro da Placa-Mãe)',
    hostComponent: 'PC',
    hostSnapPoint: 'PC_TOWER',
    portType: 'HDMI',
    relativePosition: [-0.07, 0.36, PC_REAR],
  },
  MB_DP: {
    id: 'MB_DP',
    name: 'DisplayPort Onboard (Painel Traseiro da Placa-Mãe)',
    hostComponent: 'PC',
    hostSnapPoint: 'PC_TOWER',
    portType: 'DP',
    relativePosition: [-0.04, 0.36, PC_REAR],
  },
  MONITOR_DP_IN: {
    id: 'MONITOR_DP_IN',
    name: 'DisplayPort IN (Monitor)',
    hostComponent: 'MONITOR',
    hostSnapPoint: 'MONITOR_MAIN',
    portType: 'DP',
    relativePosition: [0.02, 0.15, MONITOR_REAR],
  },
  MONITOR_HDMI_IN: {
    id: 'MONITOR_HDMI_IN',
    name: 'HDMI IN (Monitor)',
    hostComponent: 'MONITOR',
    hostSnapPoint: 'MONITOR_MAIN',
    portType: 'HDMI',
    relativePosition: [0.06, 0.15, MONITOR_REAR],
  },
  PC_USB_1: {
    id: 'PC_USB_1',
    name: 'USB Traseira 1',
    hostComponent: 'PC',
    hostSnapPoint: 'PC_TOWER',
    portType: 'USB',
    relativePosition: [-0.07, 0.4, PC_REAR],
  },
  PC_USB_2: {
    id: 'PC_USB_2',
    name: 'USB Traseira 2',
    hostComponent: 'PC',
    hostSnapPoint: 'PC_TOWER',
    portType: 'USB',
    relativePosition: [-0.04, 0.4, PC_REAR],
  },
  PC_USB_3: {
    id: 'PC_USB_3',
    name: 'USB Traseira 3',
    hostComponent: 'PC',
    hostSnapPoint: 'PC_TOWER',
    portType: 'USB',
    relativePosition: [-0.07, 0.42, PC_REAR],
  },
  PC_USB_4: {
    id: 'PC_USB_4',
    name: 'USB Traseira 4',
    hostComponent: 'PC',
    hostSnapPoint: 'PC_TOWER',
    portType: 'USB',
    relativePosition: [-0.04, 0.42, PC_REAR],
  },
  PC_AUDIO_OUT: {
    id: 'PC_AUDIO_OUT',
    name: 'Saída de Áudio Verde P2 (Line-Out)',
    hostComponent: 'PC',
    hostSnapPoint: 'PC_TOWER',
    portType: 'AUDIO_35MM',
    relativePosition: [-0.055, 0.32, PC_REAR],
  },
  PC_ETHERNET_PORT: {
    id: 'PC_ETHERNET_PORT',
    name: 'Porta Gigabit Ethernet (RJ-45)',
    hostComponent: 'PC',
    hostSnapPoint: 'PC_TOWER',
    portType: 'RJ45',
    relativePosition: [-0.055, 0.385, PC_REAR],
  },
  WALL_OUTLET_1: {
    id: 'WALL_OUTLET_1',
    name: 'Tomada da Parede / Filtro 1 (PC)',
    hostComponent: 'WALL',
    hostSnapPoint: 'WALL',
    portType: 'AC_POWER',
    relativePosition: [0.25, 0.3, WALL_Z],
  },
  WALL_OUTLET_2: {
    id: 'WALL_OUTLET_2',
    name: 'Tomada da Parede / Filtro 2 (Monitor)',
    hostComponent: 'WALL',
    hostSnapPoint: 'WALL',
    portType: 'AC_POWER',
    relativePosition: [0.4, 0.3, WALL_Z],
  },
  WALL_RJ45: {
    id: 'WALL_RJ45',
    name: 'Tomada de Rede RJ-45 da Sala',
    hostComponent: 'WALL',
    hostSnapPoint: 'WALL',
    portType: 'RJ45',
    relativePosition: [0.65, 0.3, WALL_Z],
  },
  KEYBOARD_USB: {
    id: 'KEYBOARD_USB',
    name: 'Conector USB-A do Teclado (cabo fixo)',
    hostComponent: 'PERIPHERAL',
    hostSnapPoint: 'KEYBOARD',
    portType: 'USB',
    relativePosition: [0, 0.01, -0.065],
  },
  MOUSE_USB: {
    id: 'MOUSE_USB',
    name: 'Conector USB-A do Mouse (cabo fixo)',
    hostComponent: 'PERIPHERAL',
    hostSnapPoint: 'MOUSE',
    portType: 'USB',
    relativePosition: [0, 0.01, -0.06],
  },
  HEADSET_P2: {
    id: 'HEADSET_P2',
    name: 'Plugue P2 3,5 mm do Headset',
    hostComponent: 'PERIPHERAL',
    hostSnapPoint: 'HEADSET',
    portType: 'AUDIO_35MM',
    relativePosition: [0, 0.02, 0],
  },
};

/** Posição da porta no mundo (m), para a mesa de largura `deskWidth` */
export function getExternalPortWorldPosition(
  portId: ExternalPortId,
  deskWidth: number = REFERENCE_DESK_WIDTH
): [number, number, number] {
  const { hostSnapPoint, relativePosition } = EXTERNAL_PORTS[portId];
  if (hostSnapPoint === 'WALL') return relativePosition;
  const [hx, hy, hz] = getSnapPointPosition(hostSnapPoint, deskWidth);
  return [hx + relativePosition[0], hy + relativePosition[1], hz + relativePosition[2]];
}

export interface ExternalCableSpec {
  id: ExternalCableId;
  name: string;
  cableType: 'POWER' | 'DISPLAY' | 'USB' | 'AUDIO' | 'NETWORK';
  color: string;
  thickness: number;
  isRequiredForBoot: boolean;
  /** Ponta de origem (equipamento que gera energia/sinal ou periférico com cabo fixo) */
  allowedSourcePorts: ExternalPortId[];
  /** Ponta de destino. Nunca compartilha portas com a origem. */
  allowedDestinationPorts: ExternalPortId[];
  /** Itens da mesa que precisam estar posicionados para o cabo existir */
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
    allowedSourcePorts: ['KEYBOARD_USB'],
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
    allowedSourcePorts: ['MOUSE_USB'],
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
    allowedSourcePorts: ['HEADSET_P2'],
    allowedDestinationPorts: ['PC_AUDIO_OUT'],
    associatedSnapPoints: ['HEADSET', 'PC_TOWER'],
  },
  CABLE_ETHERNET: {
    id: 'CABLE_ETHERNET',
    name: 'Cabo de Rede Ethernet Cat6 RJ-45',
    cableType: 'NETWORK',
    color: '#eab308',
    thickness: 0.01,
    isRequiredForBoot: false,
    allowedSourcePorts: ['PC_ETHERNET_PORT'],
    allowedDestinationPorts: ['WALL_RJ45'],
    associatedSnapPoints: ['PC_TOWER', 'DESK_BASE'],
  },
};

/** Lista tipada dos 7 cabos canônicos (evita type-casting de Object.keys) */
export const EXTERNAL_CABLE_IDS: readonly ExternalCableId[] = [
  'CABLE_POWER_AC',
  'CABLE_POWER_MONITOR',
  'CABLE_DISPLAY',
  'CABLE_USB_KEYBOARD',
  'CABLE_USB_MOUSE',
  'CABLE_AUDIO_JACK',
  'CABLE_ETHERNET',
];

const GPU_VIDEO_PORTS: readonly ExternalPortId[] = ['GPU_HDMI_1', 'GPU_DP_1'];
const MOTHERBOARD_VIDEO_PORTS: readonly ExternalPortId[] = ['MB_HDMI', 'MB_DP'];

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

export type ExternalCableErrorType =
  | 'GPU_BYPASS_NO_SIGNAL'
  | 'NO_IGPU_NO_SIGNAL'
  | 'INCOMPATIBLE_PORT'
  | 'PORT_NOT_PRESENT'
  | 'DEVICE_NOT_PLACED'
  | 'PORT_OCCUPIED';

export interface ExternalCableValidationResult {
  allowed: boolean;
  isPedagogicallyValid: boolean;
  errorType?: ExternalCableErrorType;
  title?: string;
  message?: string;
  penalty?: number;
  /** Conexão normalizada (origem → destino) quando o aluno conecta pela ponta invertida */
  connection?: ExternalCableConnection;
}

/**
 * Contexto físico opcional da mesa. Quando informado, a validação também exige que os
 * dispositivos das pontas estejam posicionados e que as portas estejam livres.
 */
export interface ExternalCableContext {
  placedDeskItems?: Partial<Record<DeskSnapPointId, PlacedDeskItem>>;
  cablingState?: ExternalCablingState;
}

const rejected = (
  errorType: ExternalCableErrorType,
  title: string,
  message: string
): ExternalCableValidationResult => ({ allowed: false, isPedagogicallyValid: false, errorType, title, message });

/** Resolve a orientação das pontas: aceita origem→destino ou destino→origem */
function normalizeConnection(
  spec: ExternalCableSpec,
  portA: ExternalPortId,
  portB: ExternalPortId
): ExternalCableConnection | null {
  if (spec.allowedSourcePorts.includes(portA) && spec.allowedDestinationPorts.includes(portB)) {
    return { sourcePort: portA, destPort: portB };
  }
  if (spec.allowedSourcePorts.includes(portB) && spec.allowedDestinationPorts.includes(portA)) {
    return { sourcePort: portB, destPort: portA };
  }
  return null;
}

function findCableUsingPort(
  cablingState: ExternalCablingState,
  port: ExternalPortId,
  ignoreCable: ExternalCableId
): ExternalCableId | null {
  const found = EXTERNAL_CABLE_IDS.find((id) => {
    const conn = cablingState.connections[id];
    return id !== ignoreCable && conn !== null && (conn.sourcePort === port || conn.destPort === port);
  });
  return found ?? null;
}

export function validateExternalCableConnection(
  cableId: ExternalCableId,
  sourcePort: ExternalPortId,
  destPort: ExternalPortId,
  assembly: AssemblyState,
  context?: ExternalCableContext
): ExternalCableValidationResult {
  const spec = EXTERNAL_CABLES[cableId];
  if (!spec) {
    return { allowed: false, isPedagogicallyValid: false, message: 'Cabo externo inexistente.' };
  }

  // 1. As duas pontas precisam pertencer ao cabo (uma de origem e uma de destino, em qualquer ordem)
  const connection = normalizeConnection(spec, sourcePort, destPort);
  if (!connection) {
    return rejected('INCOMPATIBLE_PORT', 'Porta Incompatível', `O conector do cabo ${spec.name} não encaixa nesta porta.`);
  }

  // 2. Conector físico idêntico nas duas pontas (um cabo HDMI não entra numa porta DisplayPort)
  const srcSpec = EXTERNAL_PORTS[connection.sourcePort];
  const dstSpec = EXTERNAL_PORTS[connection.destPort];
  if (srcSpec.portType !== dstSpec.portType) {
    return rejected(
      'INCOMPATIBLE_PORT',
      'Conectores Diferentes',
      `${srcSpec.name} usa conector ${srcSpec.portType} e ${dstSpec.name} usa ${dstSpec.portType}. Use as duas pontas com o mesmo padrão (HDMI ↔ HDMI ou DisplayPort ↔ DisplayPort).`
    );
  }

  // 3. Saídas da GPU só existem se houver placa de vídeo dedicada instalada
  if (GPU_VIDEO_PORTS.includes(connection.sourcePort) && !assembly.gpuInstalled) {
    return rejected(
      'PORT_NOT_PRESENT',
      'Porta Inexistente',
      'Este computador não tem placa de vídeo dedicada instalada, então as saídas HDMI/DisplayPort da GPU não existem no painel traseiro.'
    );
  }

  // 4. Dispositivos das pontas precisam estar na mesa (sem cabos flutuando no vazio)
  if (context?.placedDeskItems) {
    const placed = context.placedDeskItems;
    const missing = spec.associatedSnapPoints.filter((id) => !placed[id]);
    if (missing.length > 0) {
      const labels = missing.map((id) => DESK_SNAP_POINTS[id].label).join(', ');
      return rejected(
        'DEVICE_NOT_PLACED',
        'Dispositivo Fora da Mesa',
        `Posicione ${labels} na mesa antes de conectar o ${spec.name}.`
      );
    }
  }

  // 5. Uma porta física aceita um único conector
  if (context?.cablingState) {
    for (const port of [connection.sourcePort, connection.destPort]) {
      const occupiedBy = findCableUsingPort(context.cablingState, port, cableId);
      if (occupiedBy) {
        return rejected(
          'PORT_OCCUPIED',
          'Porta Ocupada',
          `${EXTERNAL_PORTS[port].name} já está em uso pelo ${EXTERNAL_CABLES[occupiedBy].name}. Escolha outra porta livre.`
        );
      }
    }
  }

  // 6. REGRA DE OURO DIDÁTICA DA GPU (Erro clássico número 1 de montadores iniciantes)
  if (cableId === 'CABLE_DISPLAY' && MOTHERBOARD_VIDEO_PORTS.includes(connection.sourcePort)) {
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
        connection,
      };
    }

    if (!assembly.cpuInstalled?.hasIntegratedGpu) {
      return {
        allowed: true,
        isPedagogicallyValid: false,
        errorType: 'NO_IGPU_NO_SIGNAL',
        title: 'Processador Sem Vídeo Integrado',
        message:
          'O processador instalado não possui chip gráfico integrado (iGPU). É necessário instalar uma placa de vídeo dedicada para obter imagem na tela.',
        penalty: 100,
        connection,
      };
    }
  }

  return { allowed: true, isPedagogicallyValid: true, connection };
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

  // Revalida contra a montagem atual: se a GPU sair do PC depois, o cabo nela deixa de dar imagem
  let hasDisplayCorrect = false;
  if (displayConn) {
    const val = validateExternalCableConnection('CABLE_DISPLAY', displayConn.sourcePort, displayConn.destPort, assembly);
    hasDisplayCorrect = val.allowed && val.isPedagogicallyValid;
  }

  const hasKeyboard = Boolean(cablingState.connections.CABLE_USB_KEYBOARD);
  const hasMouse = Boolean(cablingState.connections.CABLE_USB_MOUSE);

  const allRequiredConnected = hasPowerAc && hasPowerMonitor && hasDisplayCorrect && hasKeyboard && hasMouse;

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

/**
 * Poda automática: desconecta todo cabo cujo dispositivo de alguma ponta saiu da mesa.
 * Derivado de `associatedSnapPoints`, fonte única das dependências de cada cabo.
 */
export function pruneExternalCables(
  cablingState: ExternalCablingState,
  placedDeskItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>
): ExternalCablingState {
  const nextConnections = { ...cablingState.connections };

  EXTERNAL_CABLE_IDS.forEach((cableId) => {
    const dependsOnMissingItem = EXTERNAL_CABLES[cableId].associatedSnapPoints.some((id) => !placedDeskItems[id]);
    if (dependsOnMissingItem) {
      nextConnections[cableId] = null;
    }
  });

  return { connections: nextConnections };
}
