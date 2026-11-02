import { describe, it, expect } from 'vitest';
import {
  MONITORS,
  KEYBOARDS,
  MICE,
  MONITOR_STANDS,
  AUDIO_DEVICES,
  GAMEPADS,
  CASE_THEMES,
  DEFAULT_STUDENT_SETUP,
} from '../peripheralsCatalog';
import { ROOM_THEMES } from '../roomThemes';

describe('Customizador de Setup de Periféricos e Sala Virtual do Aluno', () => {
  it('deve conter opções completas de periféricos em todas as categorias essenciais', () => {
    expect(MONITORS.length).toBeGreaterThanOrEqual(3);
    expect(KEYBOARDS.length).toBeGreaterThanOrEqual(3);
    expect(MICE.length).toBeGreaterThanOrEqual(2);
    expect(MONITOR_STANDS.length).toBeGreaterThanOrEqual(2);
    expect(AUDIO_DEVICES.length).toBeGreaterThanOrEqual(2);
    expect(GAMEPADS.length).toBeGreaterThanOrEqual(2);
    expect(CASE_THEMES.length).toBeGreaterThanOrEqual(3);
  });

  it('deve conter os 4 ambientes temáticos virtuais canônicos', () => {
    expect(ROOM_THEMES.length).toBe(4);
    const ids = ROOM_THEMES.map((r) => r.id);
    expect(ids).toContain('ROOM_GAMER');
    expect(ids).toContain('ROOM_OFFICE');
    expect(ids).toContain('ROOM_LAB');
    expect(ids).toContain('ROOM_VAPORWAVE');
  });

  it('deve inicializar com setup padrão balanceado e completo', () => {
    expect(DEFAULT_STUDENT_SETUP.monitor).toBeDefined();
    expect(DEFAULT_STUDENT_SETUP.keyboard).toBeDefined();
    expect(DEFAULT_STUDENT_SETUP.mouse).toBeDefined();
    expect(DEFAULT_STUDENT_SETUP.stand).toBeDefined();
    expect(DEFAULT_STUDENT_SETUP.caseTheme).toBeDefined();
  });

  it('deve calcular corretamente o custo total de periféricos do setup', () => {
    const totalPeripheralsPrice =
      DEFAULT_STUDENT_SETUP.monitor.price +
      DEFAULT_STUDENT_SETUP.keyboard.price +
      DEFAULT_STUDENT_SETUP.mouse.price +
      DEFAULT_STUDENT_SETUP.stand.price +
      DEFAULT_STUDENT_SETUP.audio.price +
      DEFAULT_STUDENT_SETUP.gamepad.price +
      DEFAULT_STUDENT_SETUP.caseTheme.price;

    expect(totalPeripheralsPrice).toBeGreaterThan(1500);
  });
});

