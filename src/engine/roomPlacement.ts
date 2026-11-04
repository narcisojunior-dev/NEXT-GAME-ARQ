/**
 * Regras de posicionamento da decoração (#84). Puro.
 *
 * Toda peça ocupa uma caixa 3D (AABB) no quarto. Ela precisa caber no quarto e na zona
 * (chão, parede, mesa, prateleira, teto), não pode encostar em outra peça nem na mesa,
 * cadeira e periféricos, e não pode ficar nas zonas proibidas (porta, caminho da cadeira,
 * frente da mesa, tomadas e trajeto dos cabos). Cada recusa traz um texto didático.
 */
import { Aabb, Vec3 } from './geometry3d';
import { DecorItem, DecorZone, ANIMATED_LED_VARIANTS, ZONE_LABELS, findDecorItem, isFlat } from './roomDecor';
import {
  CEILING_GRID,
  DESK_GRID,
  FLOOR_GRID,
  ROOM_BOUNDS,
  ROOM_HEIGHT,
  ROOM_MAX_X,
  ROOM_MAX_Z,
  ROOM_MIN_X,
  ROOM_MIN_Z,
  RoomContext,
  WALL_GRID,
  WALL_KEEP_CLEAR,
  WALL_MAX_Y,
  WALL_MIN_Y,
  WINDOW,
  WallId,
  WallRect,
} from './roomLayout';
import { RoomThemeId } from './roomThemes';

export type Rotation = 0 | 90 | 180 | 270;

export interface ShelfRef {
  instanceId: string;
  slot: number;
}

export interface DecorPlacement {
  zone: DecorZone;
  /** x e z no centro da pegada; y na base da peça */
  position: Vec3;
  rotationY: Rotation;
  wall?: WallId;
  shelfRef?: ShelfRef;
}

export interface PlacedDecor extends DecorPlacement {
  instanceId: string;
  decorId: string;
  variant?: string;
  /** Texto do neon (proc-neon-texto) */
  text?: string;
}

export const ROOM_DECOR_VERSION = 1;

export interface RoomDecorState {
  version: typeof ROOM_DECOR_VERSION;
  theme: RoomThemeId;
  items: PlacedDecor[];
}

export type PlacementRefusal = 'FORA_DO_QUARTO' | 'COLISAO' | 'ZONA_PROIBIDA' | 'SEM_SLOT' | 'LIMITE_DO_ITEM' | 'LIMITE_DO_QUARTO';

export type PlacementCheck = { ok: true } | { ok: false; reason: PlacementRefusal; message: string };

const EPS = 1e-6;
/** Tolerância de contato: encostar não é colidir */
const TOUCH = 0.002;

const refuse = (reason: PlacementRefusal, message: string): PlacementCheck => ({ ok: false, reason, message });

const round = (value: number, grid: number) => Math.round(value / grid) * grid;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
/** Evita 0.30000000000000004 nas posições salvas */
const tidy = (v: number) => Math.round(v * 1000) / 1000;

/* ------------------------------------------------------------------------------------
 * Caixas
 * ------------------------------------------------------------------------------------ */
export function rotatedFootprint(item: DecorItem, rotationY: Rotation): { x: number; z: number } {
  const { w, d } = item.footprint;
  return rotationY === 90 || rotationY === 270 ? { x: d, z: w } : { x: w, z: d };
}

export function boxAt(item: DecorItem, position: Vec3, rotationY: Rotation): Aabb {
  const { x, z } = rotatedFootprint(item, rotationY);
  const [px, py, pz] = position;
  return { min: [px - x / 2, py, pz - z / 2], max: [px + x / 2, py + item.footprint.h, pz + z / 2] };
}

export function overlaps(a: Aabb, b: Aabb, tolerance = TOUCH): boolean {
  return [0, 1, 2].every((i) => a.min[i] < b.max[i] - tolerance && b.min[i] < a.max[i] - tolerance);
}

const inside = (inner: Aabb, outer: Aabb) => [0, 1, 2].every((i) => inner.min[i] >= outer.min[i] - EPS && inner.max[i] <= outer.max[i] + EPS);

/** Rotação de uma posição local (x, z) da peça para o mundo (rotação em Y do three.js) */
function rotateLocal(lx: number, lz: number, rotationY: Rotation): [number, number] {
  const t = (rotationY * Math.PI) / 180;
  const c = Math.round(Math.cos(t));
  const s = Math.round(Math.sin(t));
  return [lx * c + lz * s, -lx * s + lz * c];
}

/* ------------------------------------------------------------------------------------
 * Paredes: posição e rotação de uma peça encostada em cada parede
 * ------------------------------------------------------------------------------------ */
export const WALL_ROTATION: Record<WallId, Rotation> = { BACK: 0, LEFT: 90 };
const WALL_RANGE: Record<WallId, [number, number]> = { BACK: [ROOM_MIN_X, ROOM_MAX_X], LEFT: [ROOM_MIN_Z, ROOM_MAX_Z] };

export function wallPosition(item: DecorItem, wall: WallId, u: number, baseY: number): Vec3 {
  const half = item.footprint.d / 2;
  return wall === 'BACK' ? [tidy(u), tidy(baseY), tidy(ROOM_MIN_Z + half)] : [tidy(ROOM_MIN_X + half), tidy(baseY), tidy(u)];
}

/** Retângulo que a peça de parede cobre no plano da parede */
function wallRectOf(item: DecorItem, placement: DecorPlacement): WallRect | null {
  if (placement.zone !== 'WALL' || !placement.wall) return null;
  const u = placement.wall === 'BACK' ? placement.position[0] : placement.position[2];
  const [, y] = placement.position;
  return { wall: placement.wall, u: [u - item.footprint.w / 2, u + item.footprint.w / 2], y: [y, y + item.footprint.h] };
}

const rectsOverlap = (a: WallRect, b: WallRect) =>
  a.wall === b.wall && a.u[0] < b.u[1] - TOUCH && b.u[0] < a.u[1] - TOUCH && a.y[0] < b.y[1] - TOUCH && b.y[0] < a.y[1] - TOUCH;

/* ------------------------------------------------------------------------------------
 * Prateleiras
 * ------------------------------------------------------------------------------------ */
interface ShelfLayout {
  cols: number;
  /** Altura de cada tábua, a partir da base do móvel */
  levels: number[];
  /** Altura livre de cada nicho */
  clearance: number;
}

export const SHELF_LAYOUTS: Record<string, ShelfLayout> = {
  'decor-estante-parede': { cols: 2, levels: [0.02, 0.3], clearance: 0.26 },
  'decor-estante-decorada': { cols: 2, levels: [0.82, 1.22], clearance: 0.36 },
  'decor-vitrine': { cols: 1, levels: [0.1, 0.5, 0.9, 1.3], clearance: 0.36 },
  'proc-linha-do-tempo': { cols: 4, levels: [0.45], clearance: 0.6 },
  'proc-aparador': { cols: 2, levels: [0.75], clearance: 0.6 },
};

export interface ShelfSlot {
  slot: number;
  /** Base do nicho, no mundo */
  position: Vec3;
  rotationY: Rotation;
  maxWidth: number;
  maxHeight: number;
  maxDepth: number;
}

export function shelfSlots(host: PlacedDecor): ShelfSlot[] {
  const hostItem = findDecorItem(host.decorId);
  const layout = SHELF_LAYOUTS[host.decorId];
  if (!hostItem || !layout) return [];
  const colWidth = hostItem.footprint.w / layout.cols;
  const slots: ShelfSlot[] = [];
  layout.levels.forEach((levelY, level) => {
    for (let col = 0; col < layout.cols; col++) {
      const lx = -hostItem.footprint.w / 2 + (col + 0.5) * colWidth;
      const [dx, dz] = rotateLocal(lx, 0, host.rotationY);
      slots.push({
        slot: level * layout.cols + col,
        position: [tidy(host.position[0] + dx), tidy(host.position[1] + levelY), tidy(host.position[2] + dz)],
        rotationY: host.rotationY,
        maxWidth: colWidth,
        maxHeight: layout.clearance,
        maxDepth: hostItem.footprint.d + 0.02,
      });
    }
  });
  return slots;
}

/* ------------------------------------------------------------------------------------
 * Orçamento de desempenho
 * ------------------------------------------------------------------------------------ */
export function isAnimatedPlacement(item: DecorItem, variant?: string): boolean {
  if (item.id === 'proc-fita-led') return ANIMATED_LED_VARIANTS.has(variant ?? 'tema');
  if (item.id === 'proc-hexagonos') return variant === 'arco-iris';
  return item.animated;
}

export function roomUsage(items: PlacedDecor[]): { items: number; faces: number; animated: number } {
  let faces = 0;
  let animated = 0;
  items.forEach((p) => {
    const it = findDecorItem(p.decorId);
    if (!it) return;
    faces += it.faces;
    if (isAnimatedPlacement(it, p.variant)) animated += 1;
  });
  return { items: items.length, faces, animated };
}

/* ------------------------------------------------------------------------------------
 * Validação
 * ------------------------------------------------------------------------------------ */
export interface CanPlaceOptions {
  /** Peça que está sendo movida (não colide consigo mesma nem conta em dobro) */
  ignoreInstanceId?: string;
  variant?: string;
}

/** Caixa ocupada por uma peça já posicionada (as de prateleira ficam dentro do móvel) */
export function placedBox(p: PlacedDecor): Aabb | null {
  const item = findDecorItem(p.decorId);
  return item ? boxAt(item, p.position, p.rotationY) : null;
}

export function canPlace(
  state: Pick<RoomDecorState, 'items'>,
  item: DecorItem,
  placement: DecorPlacement,
  ctx: RoomContext,
  opts: CanPlaceOptions = {}
): PlacementCheck {
  const others = state.items.filter((p) => p.instanceId !== opts.ignoreInstanceId);

  if (!item.zones.includes(placement.zone)) {
    return refuse('ZONA_PROIBIDA', `${item.name} não fica ${ZONE_LABELS[placement.zone]}. Lugares possíveis: ${item.zones.map((z) => ZONE_LABELS[z]).join(' ou ')}.`);
  }

  const sameKind = others.filter((p) => p.decorId === item.id).length;
  if (sameKind >= item.maxPerRoom) {
    return refuse('LIMITE_DO_ITEM', `Limite de ${item.maxPerRoom} ${item.maxPerRoom === 1 ? 'unidade' : 'unidades'} de ${item.name} no quarto.`);
  }

  const usage = roomUsage(others);
  const { limits } = ctx;
  if (usage.items + 1 > limits.maxItems) {
    return refuse('LIMITE_DO_QUARTO', `O quarto já tem ${limits.maxItems} itens, o limite para manter 60 FPS neste computador. Retire um item antes.`);
  }
  if (usage.faces + item.faces > limits.maxFaces) {
    return refuse('LIMITE_DO_QUARTO', `Os modelos do quarto passariam de ${Math.round(limits.maxFaces / 1000)} mil faces, o limite para manter 60 FPS. Retire um item pesado antes.`);
  }
  if (isAnimatedPlacement(item, opts.variant) && usage.animated + 1 > limits.maxAnimated) {
    return refuse('LIMITE_DO_QUARTO', `Já há ${limits.maxAnimated} itens animados no quarto, o máximo para não pesar no processador.`);
  }

  if (placement.zone === 'SHELF') return checkShelf(others, item, placement);

  const box = boxAt(item, placement.position, placement.rotationY);
  if (!inside(box, ROOM_BOUNDS)) return refuse('FORA_DO_QUARTO', `Fora do quarto: ${item.name} precisa caber entre as paredes, o chão e o teto.`);

  const zoneCheck = checkZone(item, placement, box, ctx);
  if (!zoneCheck.ok) return zoneCheck;

  const flat = isFlat(item);
  if (!flat) {
    const hit = ctx.obstacles.find((o) => overlaps(box, o.box));
    if (hit) return refuse('COLISAO', `Encosta ${hit.label}: escolha um lugar livre.`);
  }
  for (const other of others) {
    if (other.zone === 'SHELF') continue;
    const otherItem = findDecorItem(other.decorId);
    if (!otherItem || isFlat(otherItem) !== flat) continue;
    if (overlaps(box, boxAt(otherItem, other.position, other.rotationY))) {
      return refuse('COLISAO', `Encosta em outro item (${otherItem.name}): escolha um lugar livre.`);
    }
  }
  return { ok: true };
}

function checkShelf(others: PlacedDecor[], item: DecorItem, placement: DecorPlacement): PlacementCheck {
  const ref = placement.shelfRef;
  const host = ref ? others.find((p) => p.instanceId === ref.instanceId) : undefined;
  if (!ref || !host) return refuse('SEM_SLOT', 'Sem prateleira para esse item: coloque uma estante ou a vitrine no quarto primeiro.');
  const slot = shelfSlots(host).find((s) => s.slot === ref.slot);
  if (!slot) return refuse('SEM_SLOT', 'Esse nicho não existe nessa estante.');
  if (others.some((p) => p.shelfRef?.instanceId === ref.instanceId && p.shelfRef.slot === ref.slot)) {
    return refuse('SEM_SLOT', 'Esse nicho da prateleira já está ocupado.');
  }
  const { w, d, h } = item.footprint;
  if (w > slot.maxWidth + EPS || h > slot.maxHeight + EPS || d > slot.maxDepth + EPS) {
    return refuse('SEM_SLOT', `${item.name} não cabe nesse nicho da prateleira.`);
  }
  return { ok: true };
}

function checkZone(item: DecorItem, placement: DecorPlacement, box: Aabb, ctx: RoomContext): PlacementCheck {
  switch (placement.zone) {
    case 'FLOOR': {
      if (Math.abs(placement.position[1]) > EPS) return refuse('FORA_DO_QUARTO', `${item.name} precisa ficar apoiado no chão.`);
      if (isFlat(item)) return { ok: true };
      const zone = ctx.forbidden.find((f) => overlaps(box, f.box));
      return zone ? refuse('ZONA_PROIBIDA', zone.message) : { ok: true };
    }
    case 'DESK': {
      const top = ctx.deskTop;
      if (!top) return refuse('ZONA_PROIBIDA', 'Ainda não há mesa no quarto.');
      const onTop =
        Math.abs(placement.position[1] - top.y) < EPS &&
        box.min[0] >= top.minX - EPS &&
        box.max[0] <= top.maxX + EPS &&
        box.min[2] >= top.minZ - EPS &&
        box.max[2] <= top.maxZ + EPS;
      return onTop ? { ok: true } : refuse('FORA_DO_QUARTO', `${item.name} precisa ficar inteiro sobre o tampo da mesa.`);
    }
    case 'CEILING':
      return Math.abs(box.max[1] - ROOM_HEIGHT) < EPS ? { ok: true } : refuse('FORA_DO_QUARTO', `${item.name} precisa ficar preso no teto.`);
    case 'WALL': {
      const rect = wallRectOf(item, placement);
      if (!rect || placement.rotationY !== WALL_ROTATION[rect.wall]) return refuse('FORA_DO_QUARTO', `${item.name} precisa ficar encostado numa parede.`);
      const expected = wallPosition(item, rect.wall, rect.wall === 'BACK' ? placement.position[0] : placement.position[2], placement.position[1]);
      if (expected.some((v, i) => Math.abs(v - placement.position[i]) > EPS)) return refuse('FORA_DO_QUARTO', `${item.name} precisa ficar encostado numa parede.`);
      if (rect.y[0] < WALL_MIN_Y - EPS || rect.y[1] > WALL_MAX_Y + EPS) {
        return refuse('FORA_DO_QUARTO', 'Na parede, a decoração fica entre 30 cm e 2,40 m de altura.');
      }
      if (item.coversWindow) {
        const centerU = (rect.u[0] + rect.u[1]) / 2;
        const centerY = (rect.y[0] + rect.y[1]) / 2;
        const onWindow = rect.wall === WINDOW.wall && centerU >= WINDOW.u[0] && centerU <= WINDOW.u[1] && centerY >= WINDOW.y[0] && centerY <= WINDOW.y[1];
        return onWindow ? { ok: true } : refuse('ZONA_PROIBIDA', 'A persiana só fica sobre a janela.');
      }
      const blocked = WALL_KEEP_CLEAR.find((k) => rectsOverlap(rect, k.rect));
      return blocked ? refuse('ZONA_PROIBIDA', blocked.message) : { ok: true };
    }
    case 'SHELF':
      return { ok: true };
  }
}

/* ------------------------------------------------------------------------------------
 * Encaixe: do ponto apontado pelo aluno para uma posição válida da grade
 * ------------------------------------------------------------------------------------ */
export function nearestWall(point: Vec3): WallId {
  return Math.abs(point[0] - ROOM_MIN_X) < Math.abs(point[2] - ROOM_MIN_Z) ? 'LEFT' : 'BACK';
}

export function snapToZone(
  item: DecorItem,
  zone: Exclude<DecorZone, 'SHELF'>,
  point: Vec3,
  rotationY: Rotation,
  ctx: RoomContext,
  wallHint?: WallId
): DecorPlacement {
  if (zone === 'WALL') {
    const wall = wallHint ?? nearestWall(point);
    const { w, h } = item.footprint;
    if (item.coversWindow) {
      const u = (WINDOW.u[0] + WINDOW.u[1]) / 2;
      const y = (WINDOW.y[0] + WINDOW.y[1]) / 2 - h / 2;
      return { zone, wall: 'LEFT', rotationY: WALL_ROTATION.LEFT, position: wallPosition(item, 'LEFT', tidy(u), tidy(y)) };
    }
    const [lo, hi] = WALL_RANGE[wall];
    const rawU = wall === 'BACK' ? point[0] : point[2];
    const u = clamp(round(rawU, WALL_GRID), lo + w / 2, hi - w / 2);
    const y = clamp(round(point[1] - h / 2, WALL_GRID), WALL_MIN_Y, WALL_MAX_Y - h);
    return { zone, wall, rotationY: WALL_ROTATION[wall], position: wallPosition(item, wall, tidy(u), tidy(y)) };
  }
  const grid = zone === 'CEILING' ? CEILING_GRID : zone === 'DESK' ? DESK_GRID : FLOOR_GRID;
  const { x: ex, z: ez } = rotatedFootprint(item, rotationY);
  let x = round(point[0], grid);
  let z = round(point[2], grid);
  if (zone === 'DESK' && ctx.deskTop) {
    x = clamp(x, ctx.deskTop.minX + ex / 2, ctx.deskTop.maxX - ex / 2);
    z = clamp(z, ctx.deskTop.minZ + ez / 2, ctx.deskTop.maxZ - ez / 2);
  } else {
    x = clamp(x, ROOM_MIN_X + ex / 2, ROOM_MAX_X - ex / 2);
    z = clamp(z, ROOM_MIN_Z + ez / 2, ROOM_MAX_Z - ez / 2);
  }
  const y = zone === 'CEILING' ? ROOM_HEIGHT - item.footprint.h : zone === 'DESK' ? (ctx.deskTop?.y ?? 0) : 0;
  return { zone, rotationY, position: [tidy(x), tidy(y), tidy(z)] };
}

/** Posição de um nicho de prateleira como encaixe */
export function shelfPlacement(host: PlacedDecor, slot: number): DecorPlacement | null {
  const s = shelfSlots(host).find((x) => x.slot === slot);
  return s ? { zone: 'SHELF', position: s.position, rotationY: s.rotationY, shelfRef: { instanceId: host.instanceId, slot } } : null;
}

/* ------------------------------------------------------------------------------------
 * Teclado: setas movem 10 cm (ou trocam de nicho), Q/E giram 90°
 * ------------------------------------------------------------------------------------ */
export type NudgeDirection = 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

export function nudgePlacement(
  state: Pick<RoomDecorState, 'items'>,
  item: DecorItem,
  placement: DecorPlacement,
  dir: NudgeDirection,
  ctx: RoomContext
): DecorPlacement {
  const sign = dir === 'LEFT' || dir === 'UP' ? -1 : 1;
  if (placement.zone === 'SHELF') {
    const host = state.items.find((p) => p.instanceId === placement.shelfRef?.instanceId);
    const slots = host ? shelfSlots(host) : [];
    if (!host || slots.length === 0 || !placement.shelfRef) return placement;
    const next = (placement.shelfRef.slot + sign + slots.length) % slots.length;
    return shelfPlacement(host, next) ?? placement;
  }
  const [x, y, z] = placement.position;
  if (placement.zone === 'WALL' && placement.wall) {
    const wall = placement.wall;
    const horizontal = dir === 'LEFT' || dir === 'RIGHT';
    const u = (wall === 'BACK' ? x : z) + (horizontal ? sign * WALL_GRID : 0);
    // Para cima na tela é subir na parede
    const centerY = y + item.footprint.h / 2 + (horizontal ? 0 : -sign * WALL_GRID);
    const point: Vec3 = wall === 'BACK' ? [u, centerY, z] : [x, centerY, u];
    return snapToZone(item, 'WALL', point, placement.rotationY, ctx, wall);
  }
  const grid = placement.zone === 'CEILING' ? CEILING_GRID : placement.zone === 'DESK' ? DESK_GRID : FLOOR_GRID;
  const horizontal = dir === 'LEFT' || dir === 'RIGHT';
  const point: Vec3 = [x + (horizontal ? sign * grid : 0), y, z + (horizontal ? 0 : sign * grid)];
  return snapToZone(item, placement.zone, point, placement.rotationY, ctx);
}

export function rotatePlacement(item: DecorItem, placement: DecorPlacement, step: 1 | -1, ctx: RoomContext): DecorPlacement {
  if (placement.zone === 'WALL') return placement;
  const rotationY = ((((placement.rotationY + step * 90) % 360) + 360) % 360) as Rotation;
  if (placement.zone === 'SHELF') return { ...placement, rotationY };
  return snapToZone(item, placement.zone, placement.position, rotationY, ctx);
}

/* ------------------------------------------------------------------------------------
 * Pontos destacados para o "clicar para posicionar"
 * ------------------------------------------------------------------------------------ */
export interface Suggestion {
  placement: DecorPlacement;
  label: string;
}

export function describePlacement(placement: DecorPlacement, state: Pick<RoomDecorState, 'items'>): string {
  const [x, , z] = placement.position;
  switch (placement.zone) {
    case 'SHELF': {
      const host = state.items.find((p) => p.instanceId === placement.shelfRef?.instanceId);
      const hostName = host ? findDecorItem(host.decorId)?.name ?? 'estante' : 'estante';
      return `${hostName}, nicho ${(placement.shelfRef?.slot ?? 0) + 1}`;
    }
    case 'WALL': {
      const wall = placement.wall === 'LEFT' ? 'parede da janela' : 'parede do fundo';
      const u = placement.wall === 'LEFT' ? z : x;
      const side = placement.wall === 'LEFT' ? (u < WINDOW.u[0] ? 'perto do canto' : u > WINDOW.u[1] ? 'perto da porta' : 'na altura da janela') : u < -0.8 ? 'à esquerda' : u > 0.8 ? 'à direita' : 'atrás da mesa';
      return `${wall}, ${side}, a ${Math.round(placement.position[1] * 100)} cm do chão`;
    }
    case 'DESK':
      return `na mesa, ${x < -0.2 ? 'lado esquerdo' : x > 0.2 ? 'lado direito' : 'centro'}${z < 0 ? ', ao fundo' : ''}`;
    default: {
      const where = placement.zone === 'CEILING' ? 'no teto' : 'no chão';
      const side = x < -0.8 ? 'à esquerda' : x > 0.8 ? 'à direita' : 'no centro';
      const depth = z < 0.6 ? 'perto da parede do fundo' : z > 2.4 ? 'na frente do quarto' : 'no meio do quarto';
      return `${where}, ${side}, ${depth}`;
    }
  }
}

/** Até `limit` lugares válidos e espalhados, na ordem das zonas do item */
export function suggestPlacements(
  state: Pick<RoomDecorState, 'items'>,
  item: DecorItem,
  ctx: RoomContext,
  opts: CanPlaceOptions & { limit?: number } = {}
): Suggestion[] {
  const limit = opts.limit ?? 6;
  const found: DecorPlacement[] = [];
  const far = (p: DecorPlacement) =>
    found.every((q) => q.zone === 'SHELF' || p.zone === 'SHELF' || Math.hypot(q.position[0] - p.position[0], q.position[1] - p.position[1], q.position[2] - p.position[2]) >= 0.6);
  const tryAdd = (p: DecorPlacement) => {
    if (found.length >= limit) return;
    if (found.some((q) => q.zone === p.zone && q.position.every((v, i) => Math.abs(v - p.position[i]) < EPS) && q.wall === p.wall)) return;
    if (!far(p)) return;
    if (canPlace(state, item, p, ctx, opts).ok) found.push(p);
  };

  for (const zone of item.zones) {
    if (zone === 'SHELF') {
      state.items
        .filter((p) => p.instanceId !== opts.ignoreInstanceId && SHELF_LAYOUTS[p.decorId])
        .forEach((host) => shelfSlots(host).forEach((s) => {
          const p = shelfPlacement(host, s.slot);
          if (p) tryAdd(p);
        }));
    } else if (zone === 'WALL') {
      for (const y of [1.5, 1.2, 1.8, 0.9]) {
        for (let u = ROOM_MIN_X + 0.3; u <= ROOM_MAX_X - 0.3; u += 0.3) tryAdd(snapToZone(item, 'WALL', [u, y, ROOM_MIN_Z], 0, ctx, 'BACK'));
        for (let u = ROOM_MIN_Z + 0.3; u <= ROOM_MAX_Z - 0.3; u += 0.3) tryAdd(snapToZone(item, 'WALL', [ROOM_MIN_X, y, u], 0, ctx, 'LEFT'));
        if (item.coversWindow) break;
      }
    } else if (zone === 'DESK') {
      const top = ctx.deskTop;
      if (!top) continue;
      for (let x = top.minX; x <= top.maxX; x += 0.1) for (let z = top.minZ; z <= top.maxZ; z += 0.1) tryAdd(snapToZone(item, 'DESK', [x, top.y, z], 0, ctx));
    } else {
      for (let z = ROOM_MIN_Z + 0.2; z <= ROOM_MAX_Z - 0.2; z += 0.3) {
        for (let x = ROOM_MIN_X + 0.2; x <= ROOM_MAX_X - 0.2; x += 0.3) {
          tryAdd(snapToZone(item, zone, [x, 0, z], 0, ctx));
          tryAdd(snapToZone(item, zone, [x, 0, z], 90, ctx));
        }
      }
    }
    if (found.length >= limit) break;
  }
  return found.map((placement) => ({ placement, label: describePlacement(placement, state) }));
}
