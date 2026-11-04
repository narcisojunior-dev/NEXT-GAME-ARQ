import { DESK_DEPTH, DESK_TOP_HEIGHT, REFERENCE_DESK_WIDTH, getSnapPointPosition } from './deskSetup';
import { EXTERNAL_PORTS, ExternalCableConnection, ExternalPortId, getExternalPortWorldPosition } from './externalCabling';

/**
 * Roteamento físico dos cabos externos (Fase 4 · Issue 04), em metros.
 * Gera pontos de controle para uma curva Catmull-Rom (desenhada como tubo na cena 3D).
 * Regras: cabo nunca atravessa o chão, o tampo nem o gabinete; cabos entre itens da mesa
 * correm sobre o tampo por uma faixa traseira (atrás do monitor e do PC); cabos até a parede
 * descem pela borda traseira e fazem uma "barriga" antes da tomada; a torre no chão (mesa compacta)
 * recebe os cabos por trás, sem que eles atravessem o volume da mesa.
 */
export type Vec3 = [number, number, number];

/** Altura do cabo apoiado no tampo (espessura de ~6 mm) */
const SURFACE_Y = DESK_TOP_HEIGHT + 0.006;
/** Faixa traseira do tampo: atrás da base do monitor (z −0,283) e antes da borda (z −0,30) */
const REAR_LANE_Z = -0.292;
/** Borda traseira do tampo */
const DESK_BACK_Z = -DESK_DEPTH / 2;
/** Altura mínima da barriga do cabo em relação ao chão */
const MIN_HANG_Y = 0.03;

export interface CableRouteOptions {
  /** A ponta A está em um item sobre a mesa (e não na parede) */
  aOnDesk: boolean;
  bOnDesk: boolean;
  /** A ponta está num dispositivo apoiado no chão ao lado da mesa (torre em mesa compacta) */
  aOnFloor?: boolean;
  bOnFloor?: boolean;
  /** Ponto logo após o conector (o cabo sai perpendicular à porta) */
  aExit?: Vec3;
  bExit?: Vec3;
}

const sameVec = (p: Vec3, q: Vec3) => p[0] === q[0] && p[1] === q[1] && p[2] === q[2];

function dedupe(points: Vec3[]): Vec3[] {
  return points.filter((p, i) => i === 0 || !sameVec(p, points[i - 1]));
}

type EndKind = 'DESK' | 'FLOOR' | 'WALL';

export function buildCableControlPoints(a: Vec3, b: Vec3, options: CableRouteOptions): Vec3[] {
  const aExit = options.aExit ?? a;
  const bExit = options.bExit ?? b;
  const kindA: EndKind = options.aOnDesk ? 'DESK' : options.aOnFloor ? 'FLOOR' : 'WALL';
  const kindB: EndKind = options.bOnDesk ? 'DESK' : options.bOnFloor ? 'FLOOR' : 'WALL';
  const edgeZ = DESK_BACK_Z - 0.015;
  /** Corredor atrás da mesa, por onde o cabo desce/corre sem tocar no tampo nem nos pés */
  const behindZ = edgeZ - 0.025;
  const middle: Vec3[] = [];

  if (kindA === 'DESK' && kindB === 'DESK') {
    // Desce até o tampo, vai para a faixa traseira, percorre a faixa e sobe até a outra porta
    middle.push(
      [aExit[0], SURFACE_Y, aExit[2]],
      [aExit[0], SURFACE_Y, REAR_LANE_Z],
      [bExit[0], SURFACE_Y, REAR_LANE_Z],
      [bExit[0], SURFACE_Y, bExit[2]]
    );
  } else {
    // Sempre do lado A para o B; inverte no fim se a ponta da mesa for a B
    const flip = kindB === 'DESK' || (kindB === 'FLOOR' && kindA === 'WALL');
    const [nearKind, nearEnd, farKind, farEnd] = flip ? [kindB, bExit, kindA, aExit] : [kindA, aExit, kindB, bExit];
    const path: Vec3[] = [];
    if (nearKind === 'DESK') {
      path.push(
        [nearEnd[0], SURFACE_Y, Math.max(nearEnd[2], REAR_LANE_Z)],
        [nearEnd[0], SURFACE_Y, edgeZ],
        // Começa a cair logo atrás da borda do tampo
        [nearEnd[0], DESK_TOP_HEIGHT - 0.08, behindZ]
      );
    } else {
      // Torre no chão: sai pela traseira e recua até o corredor atrás da mesa
      path.push([nearEnd[0], nearEnd[1], behindZ]);
    }
    const startY = path[path.length - 1][1];
    if (farKind === 'FLOOR') {
      // Barriga atrás da mesa e chegada pela traseira da torre
      path.push(
        [(nearEnd[0] + farEnd[0]) / 2, Math.max(MIN_HANG_Y, Math.min(startY, farEnd[1]) - 0.1), behindZ],
        [farEnd[0], farEnd[1], behindZ]
      );
    } else {
      // Barriga do cabo entre a mesa e a tomada
      path.push([(nearEnd[0] + farEnd[0]) / 2, Math.max(MIN_HANG_Y, farEnd[1] - 0.18), (behindZ + farEnd[2]) / 2]);
    }
    middle.push(...(flip ? path.reverse() : path));
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
  const level = (portId: ExternalPortId): 'DESK' | 'FLOOR' | 'WALL' => {
    const host = EXTERNAL_PORTS[portId].hostSnapPoint;
    if (host === 'WALL') return 'WALL';
    return getSnapPointPosition(host, deskWidth)[1] < DESK_TOP_HEIGHT - 1e-6 ? 'FLOOR' : 'DESK';
  };
  const [la, lb] = [level(connection.sourcePort), level(connection.destPort)];
  return buildCableControlPoints(a, b, {
    aOnDesk: la === 'DESK',
    bOnDesk: lb === 'DESK',
    aOnFloor: la === 'FLOOR',
    bOnFloor: lb === 'FLOOR',
    aExit: exitPoint(connection.sourcePort, a),
    bExit: exitPoint(connection.destPort, b),
  });
}
