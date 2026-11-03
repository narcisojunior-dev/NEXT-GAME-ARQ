import { describe, it, expect } from 'vitest';
import { buildCableControlPoints, buildExternalCablePath, Vec3 } from '../cableRouting';
import { DESK_DEPTH, DESK_SNAP_POINTS, DESK_TOP_HEIGHT, getSnapPointPosition } from '../deskSetup';
import { EXTERNAL_CABLES, ExternalCableConnection, ExternalCableId, WALL_Z } from '../externalCabling';

const CONNECTIONS: Record<ExternalCableId, ExternalCableConnection> = {
  CABLE_POWER_AC: { sourcePort: 'PC_AC_INLET', destPort: 'WALL_OUTLET_1' },
  CABLE_POWER_MONITOR: { sourcePort: 'MONITOR_AC_INLET', destPort: 'WALL_OUTLET_2' },
  CABLE_DISPLAY: { sourcePort: 'GPU_DP_1', destPort: 'MONITOR_DP_IN' },
  CABLE_USB_KEYBOARD: { sourcePort: 'KEYBOARD_USB', destPort: 'PC_USB_1' },
  CABLE_USB_MOUSE: { sourcePort: 'MOUSE_USB', destPort: 'PC_USB_2' },
  CABLE_AUDIO_JACK: { sourcePort: 'HEADSET_P2', destPort: 'PC_AUDIO_OUT' },
  CABLE_ETHERNET: { sourcePort: 'PC_ETHERNET_PORT', destPort: 'WALL_RJ45' },
};

/** Ponto dentro do volume do gabinete (com 5 mm de tolerância nas faces) */
function insidePc([x, y, z]: Vec3, deskWidth: number): boolean {
  const [px, py, pz] = getSnapPointPosition('PC_TOWER', deskWidth);
  const [w, d] = DESK_SNAP_POINTS.PC_TOWER.footprint;
  const m = 0.005;
  return (
    x > px - w / 2 + m && x < px + w / 2 - m && z > pz - d / 2 + m && z < pz + d / 2 - m && y > py + m && y < py + 0.47 - m
  );
}

describe('Roteamento físico dos cabos externos (buildExternalCablePath)', () => {
  [1.4, 1.2].forEach((deskWidth) => {
    describe(`mesa de ${deskWidth * 100} cm`, () => {
      (Object.keys(CONNECTIONS) as ExternalCableId[]).forEach((cableId) => {
        const points = buildExternalCablePath(CONNECTIONS[cableId], deskWidth);

        it(`${cableId}: começa e termina exatamente nas portas`, () => {
          const again = buildExternalCablePath(CONNECTIONS[cableId], deskWidth);
          expect(points.length).toBeGreaterThanOrEqual(4);
          expect(again).toEqual(points);
        });

        it(`${cableId}: nunca atravessa o chão nem o gabinete`, () => {
          points.forEach((p) => {
            expect(p[1]).toBeGreaterThanOrEqual(0.005);
            expect(insidePc(p, deskWidth), `ponto ${p.map((v) => v.toFixed(3))} dentro do PC`).toBe(false);
          });
        });
      });

      it('cabos entre dois itens da mesa correm sobre o tampo (não atravessam a mesa)', () => {
        (['CABLE_DISPLAY', 'CABLE_USB_KEYBOARD', 'CABLE_USB_MOUSE', 'CABLE_AUDIO_JACK'] as ExternalCableId[]).forEach((id) => {
          buildExternalCablePath(CONNECTIONS[id], deskWidth).forEach((p) => {
            expect(p[1], id).toBeGreaterThanOrEqual(DESK_TOP_HEIGHT);
          });
        });
      });

      it('cabos até a parede descem por trás da mesa antes de chegar à tomada', () => {
        (['CABLE_POWER_AC', 'CABLE_POWER_MONITOR', 'CABLE_ETHERNET'] as ExternalCableId[]).forEach((id) => {
          const points = buildExternalCablePath(CONNECTIONS[id], deskWidth);
          const behindDesk = points.filter((p) => p[2] < -DESK_DEPTH / 2);
          expect(behindDesk.some((p) => p[1] < DESK_TOP_HEIGHT), `${id} pendurado atrás da mesa`).toBe(true);
          expect(points[points.length - 1][2]).toBeCloseTo(WALL_Z, 5);
        });
      });
    });
  });

  it('a espessura e a cor de cada cabo vêm da especificação do motor', () => {
    Object.values(EXTERNAL_CABLES).forEach((spec) => {
      expect(spec.thickness).toBeGreaterThan(0);
      expect(spec.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});

describe('buildCableControlPoints (função genérica)', () => {
  it('liga dois pontos no tampo sem descer abaixo dele', () => {
    const a: Vec3 = [-0.2, 0.76, 0.05];
    const b: Vec3 = [0.4, 1.0, -0.29];
    const points = buildCableControlPoints(a, b, { aOnDesk: true, bOnDesk: true });
    expect(points[0]).toEqual(a);
    expect(points[points.length - 1]).toEqual(b);
    points.forEach((p) => expect(p[1]).toBeGreaterThanOrEqual(DESK_TOP_HEIGHT));
  });
});
