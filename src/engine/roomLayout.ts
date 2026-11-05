/**
 * Geometria do quarto do Modo Decorar (#84), pura e em metros.
 *
 * O quarto é a própria sala da mesa: 4 m × 4 m, parede do fundo em WALL_Z (a mesma das tomadas do
 * cabeamento externo) e parede esquerda com janela e porta. A mesa, a cadeira e o PC ficam fixos
 * onde o aluno os posicionou; a decoração é que se adapta a eles.
 */
import { CaseComponent } from './types';
import { Aabb, Vec3 } from './geometry3d';
import { DESK_DEPTH, DESK_TOP_HEIGHT, DeskSnapPointId, PlacedDeskItem, getDeskWidth, getSnapPointPosition } from './deskSetup';
import { deskItemPlacements } from './deskGeometry';
import { WALL_Z } from './externalCabling';

export const ROOM_SIZE = 4;
export const ROOM_HEIGHT = 2.7;
export const ROOM_MIN_X = -ROOM_SIZE / 2;
export const ROOM_MAX_X = ROOM_SIZE / 2;
export const ROOM_MIN_Z = WALL_Z;
export const ROOM_MAX_Z = WALL_Z + ROOM_SIZE;

/** Faixa de altura em que a parede recebe decoração (abaixo fica o rodapé; acima, a sanca) */
export const WALL_MIN_Y = 0.3;
export const WALL_MAX_Y = 2.4;

/** Grades de encaixe por zona */
export const FLOOR_GRID = 0.1;
export const WALL_GRID = 0.1;
export const DESK_GRID = 0.05;
export const CEILING_GRID = 0.25;

export type WallId = 'BACK' | 'LEFT';

/** Retângulo no plano de uma parede: u é a coordenada horizontal (x na parede do fundo, z na esquerda) */
export interface WallRect {
  wall: WallId;
  u: [number, number];
  y: [number, number];
}

/** Janela e porta ficam na parede esquerda */
export const WINDOW: WallRect = { wall: 'LEFT', u: [WALL_Z + 1.05, WALL_Z + 2.25], y: [0.9, 2.1] };
export const DOOR: WallRect = { wall: 'LEFT', u: [WALL_Z + 2.95, WALL_Z + 3.85], y: [0, 2.1] };
/** Área de abertura da porta no chão (folha de 90 cm girando para dentro) */
export const DOOR_SWING: Aabb = { min: [ROOM_MIN_X, 0, DOOR.u[0]], max: [ROOM_MIN_X + 0.95, ROOM_HEIGHT, DOOR.u[1]] };

/** Tomadas e ponto de rede na parede do fundo (posições do motor de cabeamento externo) */
export const OUTLETS: WallRect = { wall: 'BACK', u: [0.12, 0.78], y: [0.15, 0.45] };

export type ForbiddenZoneId = 'PORTA' | 'CAMINHO_DA_CADEIRA' | 'FRENTE_DA_MESA' | 'TRAJETO_DOS_CABOS';

export interface ForbiddenZone {
  id: ForbiddenZoneId;
  box: Aabb;
  message: string;
}

/** Limites de desempenho do quarto (seção 7 da especificação), por nível de qualidade (#63) */
export interface RoomLimits {
  maxItems: number;
  maxFaces: number;
  maxAnimated: number;
  /** Lado máximo das texturas geradas por código (pôsteres, neon) */
  maxTexture: number;
}

export const ROOM_LIMITS: Record<'ALTA' | 'LEVE', RoomLimits> = {
  ALTA: { maxItems: 24, maxFaces: 150000, maxAnimated: 4, maxTexture: 1024 },
  LEVE: { maxItems: 12, maxFaces: 75000, maxAnimated: 4, maxTexture: 512 },
};

/** Tampo livre da mesa (a decoração de mesa só fica aqui, fora dos periféricos) */
export interface DeskTop {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
}

/** Tudo o que o posicionamento precisa saber da sala real do aluno */
export interface RoomContext {
  deskWidth: number;
  /** Mesa, cadeira, torre e periféricos: volumes fixos que a decoração não atravessa */
  obstacles: { label: string; box: Aabb }[];
  deskTop: DeskTop | null;
  forbidden: ForbiddenZone[];
  limits: RoomLimits;
}

/** Com a preposição contraída: "Encosta na mesa" */
const OBSTACLE_LABELS: Record<DeskSnapPointId, string> = {
  DESK_BASE: 'na mesa',
  PC_TOWER: 'no gabinete do PC',
  MONITOR_MAIN: 'no monitor',
  MONITOR_ARM: 'no braço do monitor',
  MOUSEPAD: 'no mousepad',
  KEYBOARD: 'no teclado',
  MOUSE: 'no mouse',
  HEADSET: 'no fone ou nas caixas de som',
  CHAIR: 'na cadeira',
};

const box = (min: Vec3, max: Vec3): Aabb => ({ min, max });

/** Monta o contexto a partir da mesa realmente montada pelo aluno */
export function buildRoomContext(
  placedDeskItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>,
  caseInstalled: CaseComponent | null,
  limits: RoomLimits = ROOM_LIMITS.ALTA
): RoomContext {
  const deskWidth = getDeskWidth(placedDeskItems);
  const hasDesk = Boolean(placedDeskItems.DESK_BASE);
  // Mousepad e itens finos ganham 1 cm de altura: nada fica apoiado em cima deles
  const obstacles = deskItemPlacements(placedDeskItems, caseInstalled, deskWidth).map((p) => ({
    label: OBSTACLE_LABELS[p.snapPointId],
    box: p.box.max[1] - p.box.min[1] < 0.01 ? { min: p.box.min, max: [p.box.max[0], p.box.min[1] + 0.01, p.box.max[2]] as Vec3 } : p.box,
  }));

  const half = deskWidth / 2;
  const deskFront = DESK_DEPTH / 2;
  const [chairX, , chairZ] = getSnapPointPosition('CHAIR', deskWidth);
  const [towerX, towerY, towerZ] = getSnapPointPosition('PC_TOWER', deskWidth);

  const forbidden: ForbiddenZone[] = [
    { id: 'PORTA', box: DOOR_SWING, message: 'Bloqueia a porta: ela precisa abrir livre.' },
  ];
  if (hasDesk) {
    forbidden.push(
      {
        id: 'FRENTE_DA_MESA',
        box: box([-half, 0, deskFront], [half, ROOM_HEIGHT, deskFront + 0.7]),
        message: 'Fica na frente da mesa, onde o aluno senta e mexe no teclado.',
      },
      {
        id: 'CAMINHO_DA_CADEIRA',
        box: box([chairX - 0.55, 0, deskFront], [chairX + 0.55, ROOM_HEIGHT, chairZ + 0.85]),
        message: 'Atrapalha o caminho da cadeira: ela precisa de espaço para sair da mesa.',
      },
      {
        // Do gabinete até as tomadas, rente à parede: os cabos de força e de rede passam aqui.
        // Com a torre no tampo, os cabos descem atrás da mesa; com a torre no chão, saem dela.
        id: 'TRAJETO_DOS_CABOS',
        box: box(
          [Math.min(towerX, OUTLETS.u[0]) - 0.15, 0, ROOM_MIN_Z],
          [Math.max(towerX, OUTLETS.u[1]) + 0.15, OUTLETS.y[1] + 0.1, towerY === 0 ? towerZ : -deskFront]
        ),
        message: 'Esse lugar bloqueia o caminho dos cabos da tomada.',
      }
    );
  }

  return {
    deskWidth,
    obstacles,
    deskTop: hasDesk ? { minX: -half, maxX: half, minZ: -deskFront, maxZ: deskFront, y: DESK_TOP_HEIGHT } : null,
    forbidden,
    limits,
  };
}

/** Retângulos de parede que a decoração não pode cobrir */
export const WALL_KEEP_CLEAR: { rect: WallRect; message: string }[] = [
  { rect: WINDOW, message: 'Cobre a janela: deixe a luz natural entrar.' },
  { rect: DOOR, message: 'Fica em cima da porta.' },
  { rect: OUTLETS, message: 'Cobre as tomadas: elas precisam ficar acessíveis.' },
];

export const ROOM_BOUNDS: Aabb = { min: [ROOM_MIN_X, 0, ROOM_MIN_Z], max: [ROOM_MAX_X, ROOM_HEIGHT, ROOM_MAX_Z] };
