import { DESK_DEPTH, DESK_TOP_HEIGHT, REFERENCE_DESK_WIDTH } from './deskSetup';
import { EXTERNAL_PORTS, ExternalCableConnection, ExternalPortId, getExternalPortWorldPosition } from './externalCabling';

/**
 * Roteamento físico dos cabos externos (Fase 4 · Issue 04), em metros.
 * Gera pontos de controle para uma curva Catmull-Rom (desenhada como tubo na cena 3D).
 * Regras: cabo nunca atravessa o chão, o tampo nem o gabinete; cabos entre itens da mesa
 * correm sobre o tampo por uma faixa traseira (atrás do monitor e do PC); cabos até a parede
 * descem pela borda traseira e fazem uma "barriga" antes da tomada.
 */
export type Vec3 = [number, number, number];

/** Altura do cabo apoiado no tampo (espessura de ~6 mm) */
const SURFACE_Y = DESK_TOP_HEIGHT + 0.006;
/** Faixa traseira do tampo: atrás da base do monitor (z −0,28) e antes da borda (z −0,30) */
const REAR_LANE_Z = -0.287;
/** Borda traseira do tampo */
const DESK_BACK_Z = -DESK_DEPTH / 2;
/** Altura mínima da barriga do cabo em relação ao chão */
const MIN_HANG_Y = 0.03;

export interface CableRouteOptions {
  /** A ponta A está em um item sobre a mesa (e não na parede) */
  aOnDesk: boolean;
  bOnDesk: boolean;
  /** Ponto logo após o conector (o cabo sai perpendicular à porta) */
  aExit?: Vec3;
  bExit?: Vec3;
}

const sameVec = (p: Vec3, q: Vec3) => p[0] === q[0] && p[1] === q[1] && p[2] === q[2];

function dedupe(points: Vec3[]): Vec3[] {
  return points.filter((p, i) => i === 0 || !sameVec(p, points[i - 1]));
}

export function buildCableControlPoints(a: Vec3, b: Vec3, options: CableRouteOptions): Vec3[] {
  const aExit = options.aExit ?? a;
  const bExit = options.bExit ?? b;
  const middle: Vec3[] = [];

  if (options.aOnDesk && options.bOnDesk) {
    // Desce até o tampo, vai para a faixa traseira, percorre a faixa e sobe até a outra porta
    middle.push(
      [aExit[0], SURFACE_Y, aExit[2]],
      [aExit[0], SURFACE_Y, REAR_LANE_Z],
      [bExit[0], SURFACE_Y, REAR_LANE_Z],
      [bExit[0], SURFACE_Y, bExit[2]]
    );
  } else {
    const deskEnd = options.aOnDesk ? aExit : bExit;
    const wallEnd = options.aOnDesk ? bExit : aExit;
    const edgeZ = DESK_BACK_Z - 0.015;
    const fromDesk: Vec3[] = [
      [deskEnd[0], SURFACE_Y, Math.max(deskEnd[2], REAR_LANE_Z)],
      [deskEnd[0], SURFACE_Y, edgeZ],
      // Começa a cair logo atrás da borda do tampo
      [deskEnd[0], DESK_TOP_HEIGHT - 0.08, edgeZ - 0.025],
      // Barriga do cabo entre a mesa e a tomada
      [(deskEnd[0] + wallEnd[0]) / 2, Math.max(MIN_HANG_Y, wallEnd[1] - 0.18), (edgeZ + wallEnd[2]) / 2],
    ];
    middle.push(...(options.aOnDesk ? fromDesk : fromDesk.reverse()));
  }

  return dedupe([a, aExit, ...middle, bExit, b]);
}

/** Ponto de saída do cabo logo após o conector, perpendicular à face onde a porta fica */
function exitPoint(portId: ExternalPortId, position: Vec3): Vec3 {
  const host = EXTERNAL_PORTS[portId].hostSnapPoint;
  if (host === 'WALL') return [position[0], position[1], position[2] + 0.06];
  if (host === 'PC_TOWER' || host === 'MONITOR_MAIN') return [position[0], position[1], position[2] - 0.025];
  return [position[0], position[1], position[2] - 0.04];
}

/** Caminho completo de um cabo conectado, na mesa de largura `deskWidth` */
export function buildExternalCablePath(
  connection: ExternalCableConnection,
  deskWidth: number = REFERENCE_DESK_WIDTH
): Vec3[] {
  const a = getExternalPortWorldPosition(connection.sourcePort, deskWidth);
  const b = getExternalPortWorldPosition(connection.destPort, deskWidth);
  return buildCableControlPoints(a, b, {
    aOnDesk: EXTERNAL_PORTS[connection.sourcePort].hostSnapPoint !== 'WALL',
    bOnDesk: EXTERNAL_PORTS[connection.destPort].hostSnapPoint !== 'WALL',
    aExit: exitPoint(connection.sourcePort, a),
    bExit: exitPoint(connection.destPort, b),
  });
}
