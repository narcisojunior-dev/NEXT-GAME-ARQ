/**
 * Lógica canônica de pinagem do cabeçalho F_PANEL (Painel Frontal)
 * Padrão Intel 10-1 pin header (utilizado por ASUS, MSI, Gigabyte, ASRock)
 */

export interface FPanelPin {
  id: number;
  row: 'TOP' | 'BOTTOM';
  col: number; // 1 a 5
  label: string;
  name: string;
  polarity?: '+' | '-';
  isKeyOrNc: boolean;
}

export const FPANEL_PINS: FPanelPin[] = [
  // Linha Superior (Ímpares)
  { id: 1, row: 'TOP', col: 1, label: '+HDD_LED', name: 'HDD Activity LED (+)', polarity: '+', isKeyOrNc: false },
  { id: 3, row: 'TOP', col: 2, label: '-HDD_LED', name: 'HDD Activity LED (-)', polarity: '-', isKeyOrNc: false },
  { id: 5, row: 'TOP', col: 3, label: 'RESET_SW', name: 'Reset Switch (Terra)', isKeyOrNc: false },
  { id: 7, row: 'TOP', col: 4, label: 'RESET_SW', name: 'Reset Switch (Sinal)', isKeyOrNc: false },
  { id: 9, row: 'TOP', col: 5, label: 'NC', name: 'Reservado (+5V, Não Conectar)', isKeyOrNc: true },

  // Linha Inferior (Pares)
  { id: 2, row: 'BOTTOM', col: 1, label: '+P_LED', name: 'Power LED (+)', polarity: '+', isKeyOrNc: false },
  { id: 4, row: 'BOTTOM', col: 2, label: '-P_LED', name: 'Power LED (-)', polarity: '-', isKeyOrNc: false },
  { id: 6, row: 'BOTTOM', col: 3, label: 'PWR_SW', name: 'Power Switch (Sinal)', isKeyOrNc: false },
  { id: 8, row: 'BOTTOM', col: 4, label: 'PWR_SW', name: 'Power Switch (Terra)', isKeyOrNc: false },
  { id: 10, row: 'BOTTOM', col: 5, label: 'KEY', name: 'Pino Ausente (Chave Guia)', isKeyOrNc: true },
];

export type FPanelConnectorId = 'POWER_SW' | 'RESET_SW' | 'HDD_LED' | 'POWER_LED';

export interface FPanelConnector {
  id: FPanelConnectorId;
  name: string;
  wireColor: string;
  pinsRequired: number;
  isPolaritySensitive: boolean;
  correctPinPair: [number, number]; // [pos/pinA, neg/pinB]
  description: string;
  didacticTip: string;
}

export const FPANEL_CONNECTORS: FPanelConnector[] = [
  {
    id: 'POWER_SW',
    name: 'POWER SW',
    wireColor: '#EF4444', // Vermelho e Preto
    pinsRequired: 2,
    isPolaritySensitive: false,
    correctPinPair: [6, 8],
    description: 'Conector de 2 pinos do botão Liga/Desliga frontal.',
    didacticTip: 'Botões de pulso (Switches) NÃO têm polaridade! Não importa qual lado é positivo.',
  },
  {
    id: 'RESET_SW',
    name: 'RESET SW',
    wireColor: '#3B82F6', // Azul e Branco
    pinsRequired: 2,
    isPolaritySensitive: false,
    correctPinPair: [5, 7],
    description: 'Conector de 2 pinos do botão de reiniciar.',
    didacticTip: 'Também é um botão de contato momentâneo sem polaridade.',
  },
  {
    id: 'HDD_LED',
    name: 'HDD LED (+/-)',
    wireColor: '#F97316', // Laranja e Branco
    pinsRequired: 2,
    isPolaritySensitive: true,
    correctPinPair: [1, 3],
    description: 'LED que pisca quando o SSD/HD está lendo ou gravando dados.',
    didacticTip: 'Diodos emissores de luz (LED) POSSUEM polaridade! O fio colorido (+) deve ir no pino 1 (+HDD_LED).',
  },
  {
    id: 'POWER_LED',
    name: 'POWER LED (+/-)',
    wireColor: '#10B981', // Verde e Branco
    pinsRequired: 2,
    isPolaritySensitive: true,
    correctPinPair: [2, 4],
    description: 'LED que indica se o computador está ligado ou em suspensão.',
    didacticTip: 'O fio positivo (+) deve ir obrigatoriamente no pino 2 (+P_LED).',
  },
];

export interface ValidationResult {
  success: boolean;
  isPolarityInverted?: boolean;
  message: string;
}

/**
 * Valida a conexão de um conector específico nos pinos selecionados
 */
export function validateConnectorPlacement(
  connectorId: FPanelConnectorId,
  selectedPins: [number, number]
): ValidationResult {
  const connector = FPANEL_CONNECTORS.find((c) => c.id === connectorId);
  if (!connector) return { success: false, message: 'Conector desconhecido.' };

  const [expectedPin1, expectedPin2] = connector.correctPinPair;
  const [actualPin1, actualPin2] = selectedPins;

  // Se acertou exatamente a posição esperada
  if (actualPin1 === expectedPin1 && actualPin2 === expectedPin2) {
    return {
      success: true,
      message: `${connector.name} conectado com perfeição nos pinos corretos!`,
    };
  }

  // Se conectou invertido
  if (actualPin1 === expectedPin2 && actualPin2 === expectedPin1) {
    if (connector.isPolaritySensitive) {
      return {
        success: false,
        isPolarityInverted: true,
        message: `Polaridade Invertida! O ${connector.name} é um diodo LED e o polo positivo (+) deve ficar no pino ${expectedPin1}. Se invertido, o LED não acende.`,
      };
    } else {
      // Switches não ligam para polaridade
      return {
        success: true,
        message: `${connector.name} conectado! Por ser um interruptor de contato, a polaridade não afeta o funcionamento.`,
      };
    }
  }

  return {
    success: false,
    message: `Pinos incorretos para ${connector.name}. Consulte a serigrafia da placa-mãe.`,
  };
}

export type PinPair = [number, number];

/**
 * Pares de pinos vizinhos na mesma fileira onde um conector de 2 vias consegue encaixar.
 * Pares com o pino reservado (NC) ou com a posição da chave guia ficam de fora.
 */
export const FPANEL_PIN_PAIRS: PinPair[] = (['TOP', 'BOTTOM'] as const).flatMap((row) => {
  const pins = FPANEL_PINS.filter((p) => p.row === row).sort((a, b) => a.col - b.col);
  const pairs: PinPair[] = [];
  for (let i = 0; i < pins.length - 1; i++) {
    if (!pins[i].isKeyOrNc && !pins[i + 1].isKeyOrNc) pairs.push([pins[i].id, pins[i + 1].id]);
  }
  return pairs;
});

/**
 * Converte o par físico (esquerda, direita) na ordem [fio colorido (+), outro fio] do conector.
 * Girar o conector 180° inverte qual pino recebe o fio colorido.
 */
export function orientPinPair(pair: PinPair, flipped: boolean): PinPair {
  return flipped ? [pair[1], pair[0]] : pair;
}

/** Par usado no modo clicar-para-encaixar: começa no pino clicado ou, no fim da fileira, termina nele */
export function pairForPin(pinId: number): PinPair | null {
  return FPANEL_PIN_PAIRS.find((p) => p[0] === pinId) ?? FPANEL_PIN_PAIRS.find((p) => p[1] === pinId) ?? null;
}

/** Pinos já ocupados por conectores encaixados (opcionalmente ignorando o conector que está sendo movido) */
export function getOccupiedPins(
  connections: Record<FPanelConnectorId, PinPair | null>,
  exceptId?: FPanelConnectorId
): Set<number> {
  const occupied = new Set<number>();
  (Object.keys(connections) as FPanelConnectorId[]).forEach((id) => {
    const pins = connections[id];
    if (pins && id !== exceptId) pins.forEach((pin) => occupied.add(pin));
  });
  return occupied;
}

/**
 * Atração magnética: devolve o par livre cujo ponto médio está mais perto do ponteiro,
 * desde que dentro do raio de atração.
 */
export function findNearestPinPair(
  point: { x: number; y: number },
  pinCenters: Record<number, { x: number; y: number }>,
  occupiedPins: Set<number>,
  maxDistance: number
): PinPair | null {
  let best: PinPair | null = null;
  let bestDistance = maxDistance;
  for (const pair of FPANEL_PIN_PAIRS) {
    if (occupiedPins.has(pair[0]) || occupiedPins.has(pair[1])) continue;
    const a = pinCenters[pair[0]];
    const b = pinCenters[pair[1]];
    if (!a || !b) continue;
    const distance = Math.hypot(point.x - (a.x + b.x) / 2, point.y - (a.y + b.y) / 2);
    if (distance <= bestDistance) {
      best = pair;
      bestDistance = distance;
    }
  }
  return best;
}

const correctPairOf = (id: FPanelConnectorId): PinPair =>
  FPANEL_CONNECTORS.find((c) => c.id === id)!.correctPinPair;

/**
 * Reconstrói os conectores encaixados a partir das flags da montagem
 * (ex: casos de diagnóstico que já começam com o painel frontal ligado)
 */
export function connectionsFromAssembly(state: {
  frontPanelPowerSwConnected: boolean;
  frontPanelResetSwConnected: boolean;
  frontPanelLedsConnected: boolean;
}): Record<FPanelConnectorId, PinPair | null> {
  return {
    POWER_SW: state.frontPanelPowerSwConnected ? correctPairOf('POWER_SW') : null,
    RESET_SW: state.frontPanelResetSwConnected ? correctPairOf('RESET_SW') : null,
    HDD_LED: state.frontPanelLedsConnected ? correctPairOf('HDD_LED') : null,
    POWER_LED: state.frontPanelLedsConnected ? correctPairOf('POWER_LED') : null,
  };
}
