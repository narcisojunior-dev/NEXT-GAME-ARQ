import { describe, it, expect } from 'vitest';
import {
  DESK_SNAP_POINTS,
  DESK_TOP_HEIGHT,
  DESK_DEPTH,
  DeskSnapPointId,
  PlacedDeskItem,
  buildDeskInventory,
  evaluateDeskSnapPoints,
  getDeskWidth,
  getSnapPointPosition,
} from '../deskSetup';
import { EXTERNAL_PORTS, ExternalPortId, WALL_Z, getExternalPortWorldPosition } from '../externalCabling';
import { DEFAULT_STUDENT_SETUP, DESKS, KEYBOARDS, MONITOR_STANDS, MOUSEPADS } from '../peripheralsCatalog';
import { deskItem } from './fixtures/readyPc';

const DESK_WIDTHS = [1.4, 1.2];

/** Retângulo [xMin, xMax, zMin, zMax] ocupado por um snap point na mesa de largura `deskWidth` */
function footprintRect(id: DeskSnapPointId, deskWidth: number): [number, number, number, number] {
  const [x, , z] = getSnapPointPosition(id, deskWidth);
  const [w, d] = DESK_SNAP_POINTS[id].footprint;
  return [x - w / 2, x + w / 2, z - d / 2, z + d / 2];
}

const overlaps = (a: number[], b: number[]) => a[0] < b[1] && b[0] < a[1] && a[2] < b[3] && b[2] < a[3];
const contains = (outer: number[], inner: number[]) =>
  inner[0] >= outer[0] && inner[1] <= outer[1] && inner[2] >= outer[2] && inner[3] <= outer[3];

const ON_DESK_TOP: DeskSnapPointId[] = ['PC_TOWER', 'MONITOR_MAIN', 'MONITOR_ARM', 'MOUSEPAD', 'KEYBOARD', 'MOUSE', 'HEADSET'];

describe('1. Layout físico da mesa (metros: 1 unidade de mundo = 1 m)', () => {
  it('a largura da mesa vem do catálogo (140 cm carbono, 120 cm madeira)', () => {
    expect(getDeskWidth({})).toBe(1.4);
    expect(getDeskWidth({ DESK_BASE: deskItem('DESK_BASE', 'DESK') })).toBe(1.4);
    expect(getDeskWidth({ DESK_BASE: { ...deskItem('DESK_BASE', 'DESK'), itemId: DESKS[1].id } })).toBe(1.2);
  });

  DESK_WIDTHS.forEach((width) => {
    describe(`mesa de ${width * 100} cm`, () => {
      const top: [number, number, number, number] = [-width / 2, width / 2, -DESK_DEPTH / 2, DESK_DEPTH / 2];

      it('todo item de tampo fica inteiro dentro do tampo e apoiado na altura do tampo', () => {
        ON_DESK_TOP.forEach((id) => {
          expect(contains(top, footprintRect(id, width)), `${id} dentro do tampo`).toBe(true);
          expect(getSnapPointPosition(id, width)[1]).toBeGreaterThanOrEqual(DESK_TOP_HEIGHT);
        });
      });

      it('o gabinete não invade monitor, mousepad, teclado, mouse nem headset', () => {
        const pc = footprintRect('PC_TOWER', width);
        (['MONITOR_MAIN', 'MOUSEPAD', 'KEYBOARD', 'MOUSE', 'HEADSET'] as DeskSnapPointId[]).forEach((id) => {
          expect(overlaps(pc, footprintRect(id, width)), `PC x ${id}`).toBe(false);
        });
      });

      it('teclado e mouse ficam apoiados sobre o mousepad (coerente com a regra de remoção)', () => {
        const pad = footprintRect('MOUSEPAD', width);
        expect(contains(pad, footprintRect('KEYBOARD', width))).toBe(true);
        expect(contains(pad, footprintRect('MOUSE', width))).toBe(true);
      });

      it('a cadeira fica no chão, em frente à mesa', () => {
        const [, y, z] = getSnapPointPosition('CHAIR', width);
        expect(y).toBe(0);
        expect(footprintRect('CHAIR', width)[2]).toBeGreaterThan(DESK_DEPTH / 2);
        expect(z).toBeGreaterThan(DESK_DEPTH / 2);
      });

      it('as portas do PC ficam no painel traseiro do gabinete', () => {
        const pc = footprintRect('PC_TOWER', width);
        (Object.keys(EXTERNAL_PORTS) as ExternalPortId[])
          .filter((id) => EXTERNAL_PORTS[id].hostSnapPoint === 'PC_TOWER')
          .forEach((id) => {
            const [x, y, z] = getExternalPortWorldPosition(id, width);
            expect(x, id).toBeGreaterThanOrEqual(pc[0]);
            expect(x, id).toBeLessThanOrEqual(pc[1]);
            expect(z, id).toBeCloseTo(pc[2], 2);
            expect(y, id).toBeGreaterThan(DESK_TOP_HEIGHT);
            expect(y, id).toBeLessThan(DESK_TOP_HEIGHT + 0.5);
          });
      });

      it('tomadas e ponto de rede ficam na parede, atrás da mesa', () => {
        (['WALL_OUTLET_1', 'WALL_OUTLET_2', 'WALL_RJ45'] as ExternalPortId[]).forEach((id) => {
          const [, , z] = getExternalPortWorldPosition(id, width);
          expect(z).toBeCloseTo(WALL_Z, 5);
          expect(z).toBeLessThan(-DESK_DEPTH / 2);
        });
      });
    });
  });
});

describe('2. Estado dos hologramas (evaluateDeskSnapPoints)', () => {
  const desk = { DESK_BASE: deskItem('DESK_BASE', 'DESK') };
  const ctx = { isPcAssembled: true, studentSetup: DEFAULT_STUDENT_SETUP };

  it('sem item selecionado: vazio ou ocupado', () => {
    const states = evaluateDeskSnapPoints(null, desk, ctx);
    expect(states.DESK_BASE.status).toBe('OCCUPIED');
    expect(states.KEYBOARD.status).toBe('EMPTY');
  });

  it('com teclado selecionado: só o snap do teclado acende; os demais ficam incompatíveis', () => {
    const states = evaluateDeskSnapPoints(KEYBOARDS[0], desk, ctx);
    expect(states.KEYBOARD.status).toBe('AVAILABLE');
    expect(states.MOUSE.status).toBe('INCOMPATIBLE');
    expect(states.MONITOR_MAIN.status).toBe('INCOMPATIBLE');
  });

  it('pré-requisito pendente vira BLOQUEADO com a mensagem do motor', () => {
    const states = evaluateDeskSnapPoints(KEYBOARDS[0], {}, ctx);
    expect(states.KEYBOARD.status).toBe('BLOCKED');
    expect(states.KEYBOARD.message).toMatch(/mesa/i);
  });

  it('snap ocupado continua OCUPADO mesmo com item compatível selecionado', () => {
    const placed: Partial<Record<DeskSnapPointId, PlacedDeskItem>> = { ...desk, KEYBOARD: deskItem('KEYBOARD', 'KEYBOARD') };
    expect(evaluateDeskSnapPoints(KEYBOARDS[1], placed, ctx).KEYBOARD.status).toBe('OCCUPIED');
  });

  it('PC incompleto bloqueia o snap do gabinete', () => {
    const states = evaluateDeskSnapPoints('PC_TOWER', desk, { ...ctx, isPcAssembled: false });
    expect(states.PC_TOWER.status).toBe('BLOCKED');
  });
});

describe('3. Inventário da mesa (buildDeskInventory)', () => {
  it('lista mesa, cadeira, PC e os periféricos do setup, cada um com seu snap point', () => {
    const inventory = buildDeskInventory(DEFAULT_STUDENT_SETUP);
    const byTarget = Object.fromEntries(inventory.map((e) => [e.targetSnapPoint, e.item]));

    expect(byTarget.DESK_BASE?.itemId).toBe(DEFAULT_STUDENT_SETUP.desk?.id);
    expect(byTarget.PC_TOWER?.category).toBe('PC_TOWER');
    expect(byTarget.MONITOR_MAIN?.itemId).toBe(DEFAULT_STUDENT_SETUP.monitor.id);
    expect(byTarget.KEYBOARD?.itemId).toBe(DEFAULT_STUDENT_SETUP.keyboard.id);
    expect(byTarget.MOUSE?.itemId).toBe(DEFAULT_STUDENT_SETUP.mouse.id);
    expect(byTarget.MOUSEPAD?.itemId).toBe(MOUSEPADS[0].id);
    expect(byTarget.HEADSET?.itemId).toBe(DEFAULT_STUDENT_SETUP.audio.id);
    expect(byTarget.CHAIR?.itemId).toBe(DEFAULT_STUDENT_SETUP.chair?.id);
    inventory.forEach((e) => expect(e.item.snapPointId).toBe(e.targetSnapPoint));
  });

  it('inclui o braço articulado só quando o setup usa braço a gás', () => {
    const withArm = buildDeskInventory({ ...DEFAULT_STUDENT_SETUP, stand: MONITOR_STANDS[1] });
    const withBase = buildDeskInventory({ ...DEFAULT_STUDENT_SETUP, stand: MONITOR_STANDS[0] });
    expect(withArm.some((e) => e.targetSnapPoint === 'MONITOR_ARM')).toBe(true);
    expect(withBase.some((e) => e.targetSnapPoint === 'MONITOR_ARM')).toBe(false);
  });

  it('segue a ordem física de montagem (mesa antes dos periféricos, braço antes do monitor, mousepad antes de teclado/mouse)', () => {
    const order = buildDeskInventory(DEFAULT_STUDENT_SETUP).map((e) => e.targetSnapPoint);
    expect(order.indexOf('DESK_BASE')).toBe(0);
    expect(order.indexOf('MONITOR_ARM')).toBeLessThan(order.indexOf('MONITOR_MAIN'));
    expect(order.indexOf('MOUSEPAD')).toBeLessThan(order.indexOf('KEYBOARD'));
    expect(order.indexOf('MOUSEPAD')).toBeLessThan(order.indexOf('MOUSE'));
  });

  it('todo item do inventário passa na validação de categoria do seu snap point', () => {
    buildDeskInventory(DEFAULT_STUDENT_SETUP).forEach((e) => {
      expect(DESK_SNAP_POINTS[e.targetSnapPoint].allowedCategories).toContain(e.item.category);
    });
  });
});
