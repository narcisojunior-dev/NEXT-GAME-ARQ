import { describe, it, expect } from 'vitest';
import {
  FPANEL_PINS,
  FPANEL_CONNECTORS,
  validateConnectorPlacement,
} from '../frontPanel';

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
