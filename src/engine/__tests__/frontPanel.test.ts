import { describe, it, expect } from 'vitest';
import {
  FPANEL_PINS,
  FPANEL_CONNECTORS,
  validateConnectorPlacement,
} from '../frontPanel';

describe('Minigame do Painel Frontal (F_PANEL)', () => {
  it('deve conter a matriz canônica de 10 pinos padrão Intel (com pino 9 como KEY)', () => {
    expect(FPANEL_PINS.length).toBe(10);
    const keyPin = FPANEL_PINS.find((p) => p.id === 9)!;
    expect(keyPin.isKeyOrNc).toBe(true);
    expect(keyPin.label).toBe('KEY');
  });

  it('deve conter os 4 conectores de gabinete padrão (POWER SW, RESET SW, HDD LED, POWER LED)', () => {
    expect(FPANEL_CONNECTORS.length).toBe(4);
    expect(FPANEL_CONNECTORS.some((c) => c.id === 'POWER_SW')).toBe(true);
    expect(FPANEL_CONNECTORS.some((c) => c.id === 'RESET_SW')).toBe(true);
    expect(FPANEL_CONNECTORS.some((c) => c.id === 'HDD_LED')).toBe(true);
    expect(FPANEL_CONNECTORS.some((c) => c.id === 'POWER_LED')).toBe(true);
  });

  it('POWER SW: deve aceitar em [5, 7] e em [7, 5] sem erro de polaridade', () => {
    const resDirect = validateConnectorPlacement('POWER_SW', [5, 7]);
    expect(resDirect.success).toBe(true);

    const resInverted = validateConnectorPlacement('POWER_SW', [7, 5]);
    expect(resInverted.success).toBe(true);
  });

  it('RESET SW: deve aceitar em [6, 8] e em [8, 6]', () => {
    const resDirect = validateConnectorPlacement('RESET_SW', [6, 8]);
    expect(resDirect.success).toBe(true);

    const resInverted = validateConnectorPlacement('RESET_SW', [8, 6]);
    expect(resInverted.success).toBe(true);
  });

  it('HDD LED: deve aceitar na polaridade correta [2, 4] e reprovar se invertido [4, 2]', () => {
    const resDirect = validateConnectorPlacement('HDD_LED', [2, 4]);
    expect(resDirect.success).toBe(true);

    const resInverted = validateConnectorPlacement('HDD_LED', [4, 2]);
    expect(resInverted.success).toBe(false);
    expect(resInverted.isPolarityInverted).toBe(true);
    expect(resInverted.message).toContain('Polaridade Invertida');
  });

  it('POWER LED: deve aceitar [1, 3] e reprovar se invertido [3, 1]', () => {
    const resDirect = validateConnectorPlacement('POWER_LED', [1, 3]);
    expect(resDirect.success).toBe(true);

    const resInverted = validateConnectorPlacement('POWER_LED', [3, 1]);
    expect(resInverted.success).toBe(false);
    expect(resInverted.isPolarityInverted).toBe(true);
  });

  it('deve reprovar tentativa de ligar em pinos completamente errados', () => {
    const resWrong = validateConnectorPlacement('POWER_SW', [1, 2]);
    expect(resWrong.success).toBe(false);
  });
});
