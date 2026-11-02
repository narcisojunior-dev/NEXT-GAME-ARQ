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
