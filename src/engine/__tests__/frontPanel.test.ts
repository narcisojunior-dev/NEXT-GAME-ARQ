import { describe, it, expect } from 'vitest';
import {
  FPANEL_PINS,
  FPANEL_CONNECTORS,
  FPANEL_PIN_PAIRS,
  validateConnectorPlacement,
  orientPinPair,
  pairForPin,
  findNearestPinPair,
  getOccupiedPins,
  connectionsFromAssembly,
} from '../frontPanel';

describe('F_PANEL: pares de pinos onde um conector de 2 vias pode encaixar', () => {
  it('oferece apenas pares horizontais vizinhos, sem o pino NC nem a chave guia', () => {
    expect(FPANEL_PIN_PAIRS).toEqual([
      [1, 3],
      [3, 5],
      [5, 7],
      [2, 4],
      [4, 6],
      [6, 8],
    ]);
  });

  it('orienta o par conforme o lado do fio colorido (+) do conector', () => {
    expect(orientPinPair([1, 3], false)).toEqual([1, 3]);
    expect(orientPinPair([1, 3], true)).toEqual([3, 1]);
  });

  it('clicar em um pino escolhe o par que começa nele, ou o par que termina nele no fim da fileira', () => {
    expect(pairForPin(1)).toEqual([1, 3]);
    expect(pairForPin(3)).toEqual([3, 5]);
    expect(pairForPin(7)).toEqual([5, 7]);
    expect(pairForPin(8)).toEqual([6, 8]);
    expect(pairForPin(9)).toBeNull();
    expect(pairForPin(10)).toBeNull();
  });

  it('lista os pinos ocupados pelos conectores já encaixados, ignorando o que está sendo movido', () => {
    const connections = { POWER_SW: [6, 8] as [number, number], RESET_SW: null, HDD_LED: [1, 3] as [number, number], POWER_LED: null };
    expect([...getOccupiedPins(connections)].sort()).toEqual([1, 3, 6, 8]);
    expect([...getOccupiedPins(connections, 'HDD_LED')].sort()).toEqual([6, 8]);
  });

  it('reconstrói os conectores encaixados a partir do estado da montagem', () => {
    const none = connectionsFromAssembly({
      frontPanelPowerSwConnected: false,
      frontPanelResetSwConnected: false,
      frontPanelLedsConnected: false,
    });
    expect(Object.values(none).every((pins) => pins === null)).toBe(true);

    const all = connectionsFromAssembly({
      frontPanelPowerSwConnected: true,
      frontPanelResetSwConnected: true,
      frontPanelLedsConnected: true,
    });
    expect(all).toEqual({ POWER_SW: [6, 8], RESET_SW: [5, 7], HDD_LED: [1, 3], POWER_LED: [2, 4] });
  });

  describe('atração magnética ao arrastar', () => {
    // Pinos a cada 50px; linha de cima em y=0, linha de baixo em y=50
    const centers = Object.fromEntries(
      FPANEL_PINS.map((p) => [p.id, { x: (p.col - 1) * 50, y: p.row === 'TOP' ? 0 : 50 }])
    ) as Record<number, { x: number; y: number }>;

    it('escolhe o par cujo ponto médio está mais perto do ponteiro', () => {
      expect(findNearestPinPair({ x: 27, y: 4 }, centers, new Set(), 40)).toEqual([1, 3]);
      expect(findNearestPinPair({ x: 124, y: 48 }, centers, new Set(), 40)).toEqual([6, 8]);
    });

    it('não atrai quando o ponteiro está longe dos pinos', () => {
      expect(findNearestPinPair({ x: 25, y: 200 }, centers, new Set(), 40)).toBeNull();
    });

    it('pula pares com pinos já ocupados por outro conector', () => {
      expect(findNearestPinPair({ x: 40, y: 4 }, centers, new Set([1]), 40)).toEqual([3, 5]);
    });
  });
});

describe('Minigame do Painel Frontal (F_PANEL)', () => {
  it('deve conter a matriz canônica de 10 pinos padrão Intel (pino 10 ausente como KEY)', () => {
    expect(FPANEL_PINS.length).toBe(10);
    const keyPin = FPANEL_PINS.find((p) => p.id === 10)!;
    expect(keyPin.isKeyOrNc).toBe(true);
    expect(keyPin.label).toBe('KEY');

    const pin9 = FPANEL_PINS.find((p) => p.id === 9)!;
    expect(pin9.isKeyOrNc).toBe(true);
    expect(pin9.label).toBe('NC');
  });

  it('deve seguir a serigrafia Intel: HDD LED 1/3, Power LED 2/4, Reset 5/7, Power SW 6/8', () => {
    const label = (id: number) => FPANEL_PINS.find((p) => p.id === id)!.label;
    expect(label(1)).toBe('+HDD_LED');
    expect(label(3)).toBe('-HDD_LED');
    expect(label(2)).toBe('+P_LED');
    expect(label(4)).toBe('-P_LED');
    expect(label(5)).toBe('RESET_SW');
    expect(label(7)).toBe('RESET_SW');
    expect(label(6)).toBe('PWR_SW');
    expect(label(8)).toBe('PWR_SW');
  });

  it('deve manter pinos ímpares na linha superior e pares na linha inferior', () => {
    FPANEL_PINS.forEach((pin) => {
      expect(pin.row).toBe(pin.id % 2 === 1 ? 'TOP' : 'BOTTOM');
    });
  });

  it('deve conter os 4 conectores de gabinete padrão (POWER SW, RESET SW, HDD LED, POWER LED)', () => {
    expect(FPANEL_CONNECTORS.length).toBe(4);
    expect(FPANEL_CONNECTORS.some((c) => c.id === 'POWER_SW')).toBe(true);
    expect(FPANEL_CONNECTORS.some((c) => c.id === 'RESET_SW')).toBe(true);
    expect(FPANEL_CONNECTORS.some((c) => c.id === 'HDD_LED')).toBe(true);
    expect(FPANEL_CONNECTORS.some((c) => c.id === 'POWER_LED')).toBe(true);
  });

  it('POWER SW: deve aceitar em [6, 8] e em [8, 6] sem erro de polaridade', () => {
    expect(validateConnectorPlacement('POWER_SW', [6, 8]).success).toBe(true);
    expect(validateConnectorPlacement('POWER_SW', [8, 6]).success).toBe(true);
  });

  it('RESET SW: deve aceitar em [5, 7] e em [7, 5]', () => {
    expect(validateConnectorPlacement('RESET_SW', [5, 7]).success).toBe(true);
    expect(validateConnectorPlacement('RESET_SW', [7, 5]).success).toBe(true);
  });

  it('HDD LED: deve aceitar na polaridade correta [1, 3] e reprovar se invertido [3, 1]', () => {
    expect(validateConnectorPlacement('HDD_LED', [1, 3]).success).toBe(true);

    const resInverted = validateConnectorPlacement('HDD_LED', [3, 1]);
    expect(resInverted.success).toBe(false);
    expect(resInverted.isPolarityInverted).toBe(true);
    expect(resInverted.message).toContain('Polaridade Invertida');
  });

  it('POWER LED: deve aceitar [2, 4] e reprovar se invertido [4, 2]', () => {
    expect(validateConnectorPlacement('POWER_LED', [2, 4]).success).toBe(true);

    const resInverted = validateConnectorPlacement('POWER_LED', [4, 2]);
    expect(resInverted.success).toBe(false);
    expect(resInverted.isPolarityInverted).toBe(true);
  });

  it('deve reprovar os pares antigos (pinagem não padrão) e pinos completamente errados', () => {
    expect(validateConnectorPlacement('POWER_SW', [5, 7]).success).toBe(false);
    expect(validateConnectorPlacement('HDD_LED', [2, 4]).success).toBe(false);
    expect(validateConnectorPlacement('POWER_SW', [1, 2]).success).toBe(false);
  });

  it('as dicas didáticas devem citar o pino positivo correto de cada LED', () => {
    const hdd = FPANEL_CONNECTORS.find((c) => c.id === 'HDD_LED')!;
    const pled = FPANEL_CONNECTORS.find((c) => c.id === 'POWER_LED')!;
    expect(hdd.didacticTip).toContain('pino 1');
    expect(pled.didacticTip).toContain('pino 2');
  });
});
