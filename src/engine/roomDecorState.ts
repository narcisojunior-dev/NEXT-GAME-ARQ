/**
 * Estado do quarto decorado (#90): conjunto inicial por tema, colocar, mover, retirar e
 * sanitizar o que vem do localStorage. Puro: a persistência fica no useRoomDecorStore.
 */
import { Vec3 } from './geometry3d';
import { DecorZone, findDecorItem, validateNeonText } from './roomDecor';
import {
  DecorPlacement,
  PlacedDecor,
  PlacementCheck,
  ROOM_DECOR_VERSION,
  Rotation,
  RoomDecorState,
  canPlace,
  shelfPlacement,
  shelfSlots,
  snapToZone,
} from './roomPlacement';
import { RoomContext, WallId } from './roomLayout';
import { ROOM_THEMES, RoomThemeId } from './roomThemes';

/** Item do conjunto inicial: posição pedida (o encaixe da grade decide a final) */
interface StarterItem {
  decorId: string;
  zone: Exclude<DecorZone, 'SHELF'> | { shelfOf: string; slot: number };
  point?: Vec3;
  rotationY?: Rotation;
  wall?: WallId;
  variant?: string;
}

/** Conjuntos iniciais do pacote Clássico: só chão, parede, teto e prateleira (a mesa de cada aluno muda) */
export const STARTER_SETS: Record<RoomThemeId, StarterItem[]> = {
  ROOM_GAMER: [
    { decorId: 'decor-cama', zone: 'FLOOR', point: [1.25, 0, 2.4] },
    { decorId: 'decor-tapete-retangular', zone: 'FLOOR', point: [-0.1, 0, 1.1] },
    { decorId: 'decor-estante-parede', zone: 'WALL', wall: 'BACK', point: [-1.3, 1.65, 0] },
    { decorId: 'decor-livros', zone: { shelfOf: 'decor-estante-parede', slot: 0 } },
    { decorId: 'proc-fita-led', zone: 'WALL', wall: 'BACK', point: [-0.1, 1.45, 0], variant: 'onda' },
    { decorId: 'proc-poster', zone: 'WALL', wall: 'LEFT', point: [0, 1.6, 0.0], variant: 'pixel-cpu' },
    { decorId: 'decor-luminaria-teto', zone: 'CEILING', point: [0, 0, 1.0] },
    { decorId: 'decor-plantas', zone: 'FLOOR', point: [-1.6, 0, -0.2] },
  ],
  ROOM_OFFICE: [
    { decorId: 'decor-estante-decorada', zone: 'FLOOR', point: [-1.5, 0, -0.35] },
    { decorId: 'decor-planta-jade', zone: { shelfOf: 'decor-estante-decorada', slot: 1 } },
    { decorId: 'decor-plantas', zone: 'FLOOR', point: [1.3, 0, -0.2] },
    { decorId: 'decor-puff', zone: 'FLOOR', point: [1.4, 0, 2.5] },
    { decorId: 'decor-tapete-redondo', zone: 'FLOOR', point: [1.2, 0, 2.4] },
    { decorId: 'decor-quadro', zone: 'WALL', wall: 'BACK', point: [-0.1, 1.6, 0], variant: 'ficha-setup' },
    { decorId: 'decor-relogio-parede', zone: 'WALL', wall: 'BACK', point: [1.3, 1.8, 0] },
    { decorId: 'decor-persiana', zone: 'WALL', wall: 'LEFT' },
    { decorId: 'decor-luminaria-teto', zone: 'CEILING', point: [0, 0, 1.0] },
  ],
  ROOM_LAB: [
    { decorId: 'decor-estante-decorada', zone: 'FLOOR', point: [-1.5, 0, -0.35] },
    { decorId: 'decor-livros', zone: { shelfOf: 'decor-estante-decorada', slot: 0 } },
    { decorId: 'decor-moldura-poster', zone: 'WALL', wall: 'BACK', point: [-0.1, 1.65, 0], variant: 'mapa-soquetes' },
    { decorId: 'proc-poster', zone: 'WALL', wall: 'LEFT', point: [0, 1.6, 0.0], variant: 'grafico-fps' },
    { decorId: 'decor-relogio-parede', zone: 'WALL', wall: 'BACK', point: [1.3, 1.8, 0] },
    { decorId: 'decor-luminaria-teto', zone: 'CEILING', point: [0, 0, 1.0] },
    { decorId: 'decor-lixeira', zone: 'FLOOR', point: [1.3, 0, -0.3] },
  ],
  ROOM_VAPORWAVE: [
    { decorId: 'decor-tapete-redondo', zone: 'FLOOR', point: [0.9, 0, 2.2] },
    { decorId: 'decor-puff', zone: 'FLOOR', point: [1.1, 0, 2.3] },
    { decorId: 'proc-fita-led', zone: 'WALL', wall: 'BACK', point: [-0.1, 1.45, 0], variant: 'arco-iris' },
    { decorId: 'proc-poster', zone: 'WALL', wall: 'LEFT', point: [0, 1.6, 0.0], variant: 'pixel-cpu' },
    { decorId: 'decor-moldura-poster', zone: 'WALL', wall: 'BACK', point: [1.3, 1.6, 0], variant: 'certificado' },
    { decorId: 'decor-plantas', zone: 'FLOOR', point: [-1.6, 0, -0.2] },
    { decorId: 'decor-ventilador-teto', zone: 'CEILING', point: [0, 0, 1.3] },
  ],
};

export function nextInstanceId(items: PlacedDecor[], decorId: string): string {
  let n = 1;
  const taken = new Set(items.map((p) => p.instanceId));
  while (taken.has(`${decorId}#${n}`)) n++;
  return `${decorId}#${n}`;
}

export interface PlaceResult {
  state: RoomDecorState;
  check: PlacementCheck;
  instanceId?: string;
}

/** Coloca uma peça nova (ou recusa, com a mensagem de canPlace) */
export function addDecor(
  state: RoomDecorState,
  decorId: string,
  placement: DecorPlacement,
  ctx: RoomContext,
  extra: { variant?: string; text?: string } = {}
): PlaceResult {
  const item = findDecorItem(decorId);
  if (!item) return { state, check: { ok: false, reason: 'FORA_DO_QUARTO', message: 'Item desconhecido.' } };
  const variant = extra.variant ?? item.variants?.[0]?.id;
  const check = canPlace(state, item, placement, ctx, { variant });
  if (!check.ok) return { state, check };
  const instanceId = nextInstanceId(state.items, decorId);
  const placed: PlacedDecor = { instanceId, decorId, ...placement, ...(variant ? { variant } : {}), ...(extra.text ? { text: extra.text } : {}) };
  return { state: { ...state, items: [...state.items, placed] }, check, instanceId };
}

/** Itens apoiados numa estante acompanham o móvel quando ele muda de lugar */
function reseatShelfItems(items: PlacedDecor[], hostId: string): PlacedDecor[] {
  const host = items.find((p) => p.instanceId === hostId);
  if (!host) return items;
  return items.map((p) => {
    if (p.shelfRef?.instanceId !== hostId) return p;
    const seat = shelfPlacement(host, p.shelfRef.slot);
    return seat ? { ...p, position: seat.position, rotationY: seat.rotationY } : p;
  });
}

export function moveDecor(state: RoomDecorState, instanceId: string, placement: DecorPlacement, ctx: RoomContext): PlaceResult {
  const current = state.items.find((p) => p.instanceId === instanceId);
  const item = current ? findDecorItem(current.decorId) : null;
  if (!current || !item) return { state, check: { ok: false, reason: 'FORA_DO_QUARTO', message: 'Item não está no quarto.' } };
  // Uma estante não pode ir para dentro de si mesma
  if (placement.shelfRef?.instanceId === instanceId) {
    return { state, check: { ok: false, reason: 'SEM_SLOT', message: 'Um móvel não cabe na própria prateleira.' } };
  }
  const check = canPlace(state, item, placement, ctx, { ignoreInstanceId: instanceId, variant: current.variant });
  if (!check.ok) return { state, check };
  const { shelfRef: _drop, wall: _wall, ...rest } = current;
  void _drop;
  void _wall;
  const moved: PlacedDecor = { ...rest, ...placement };
  const items = state.items.map((p) => (p.instanceId === instanceId ? moved : p));
  return { state: { ...state, items: reseatShelfItems(items, instanceId) }, check, instanceId };
}

/** Retira a peça e o que estava na prateleira dela */
export function removeDecor(state: RoomDecorState, instanceId: string): RoomDecorState {
  return { ...state, items: state.items.filter((p) => p.instanceId !== instanceId && p.shelfRef?.instanceId !== instanceId) };
}

export function updateDecor(state: RoomDecorState, instanceId: string, patch: { variant?: string; text?: string }): RoomDecorState {
  return { ...state, items: state.items.map((p) => (p.instanceId === instanceId ? { ...p, ...patch } : p)) };
}

/** Quarto do tema com o conjunto inicial (itens que não cabem na mesa deste aluno ficam de fora) */
export function createRoomDecor(theme: RoomThemeId, ctx: RoomContext): RoomDecorState {
  let state: RoomDecorState = { version: ROOM_DECOR_VERSION, theme, items: [] };
  for (const s of STARTER_SETS[theme]) {
    const item = findDecorItem(s.decorId);
    if (!item) continue;
    let placement: DecorPlacement | null;
    if (typeof s.zone === 'object') {
      const shelfOf = s.zone.shelfOf;
      const host = state.items.find((p) => p.decorId === shelfOf);
      placement = host ? shelfPlacement(host, s.zone.slot) : null;
    } else {
      placement = snapToZone(item, s.zone, s.point ?? [0, 0, 0], s.rotationY ?? 0, ctx, s.wall);
    }
    if (!placement) continue;
    state = addDecor(state, s.decorId, placement, ctx, { variant: s.variant }).state;
  }
  return state;
}

/* ------------------------------------------------------------------------------------
 * Sanitização: dado salvo corrompido, editado à mão, de outra versão ou de um item que
 * deixou de caber (o aluno trocou a mesa) nunca quebra o jogo: a peça é descartada.
 * ------------------------------------------------------------------------------------ */
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isVec3 = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === 'number' && Number.isFinite(n));
const ZONES: DecorZone[] = ['FLOOR', 'WALL', 'DESK', 'SHELF', 'CEILING'];
const ROTATIONS: Rotation[] = [0, 90, 180, 270];

function readPlaced(raw: unknown): PlacedDecor | null {
  if (!isRecord(raw)) return null;
  const { instanceId, decorId, zone, position, rotationY, wall, shelfRef, variant, text } = raw;
  if (typeof instanceId !== 'string' || typeof decorId !== 'string') return null;
  if (typeof zone !== 'string' || !ZONES.includes(zone as DecorZone) || !isVec3(position)) return null;
  if (typeof rotationY !== 'number' || !ROTATIONS.includes(rotationY as Rotation)) return null;
  const placed: PlacedDecor = { instanceId, decorId, zone: zone as DecorZone, position, rotationY: rotationY as Rotation };
  if (wall === 'BACK' || wall === 'LEFT') placed.wall = wall;
  if (isRecord(shelfRef) && typeof shelfRef.instanceId === 'string' && typeof shelfRef.slot === 'number') {
    placed.shelfRef = { instanceId: shelfRef.instanceId, slot: shelfRef.slot };
  }
  if (typeof variant === 'string') placed.variant = variant;
  if (typeof text === 'string') placed.text = text;
  return placed;
}

export function sanitizeRoomDecor(raw: unknown, ctx: RoomContext, isItemUnlocked: (decorId: string) => boolean, fallbackTheme: RoomThemeId = 'ROOM_GAMER'): RoomDecorState {
  if (!isRecord(raw) || !Array.isArray(raw.items)) return createRoomDecor(fallbackTheme, ctx);
  const theme = ROOM_THEMES.some((t) => t.id === raw.theme) ? (raw.theme as RoomThemeId) : fallbackTheme;
  let state: RoomDecorState = { version: ROOM_DECOR_VERSION, theme, items: [] };
  const entries = raw.items.map(readPlaced).filter((p): p is PlacedDecor => p !== null);
  // Móveis antes do que fica nas prateleiras deles
  const ordered = [...entries.filter((p) => p.zone !== 'SHELF'), ...entries.filter((p) => p.zone === 'SHELF')];
  for (const p of ordered) {
    const item = findDecorItem(p.decorId);
    if (!item || !isItemUnlocked(p.decorId)) continue;
    if (state.items.some((q) => q.instanceId === p.instanceId)) continue;
    let placement: DecorPlacement = p;
    if (p.zone === 'SHELF') {
      const host = state.items.find((q) => q.instanceId === p.shelfRef?.instanceId);
      const seat = host && p.shelfRef ? shelfPlacement(host, p.shelfRef.slot) : null;
      if (!seat) continue;
      placement = seat;
    }
    const variant = p.variant && item.variants?.some((v) => v.id === p.variant) ? p.variant : item.variants?.[0]?.id;
    const neon = item.id === 'proc-neon-texto' ? validateNeonText(p.text ?? '') : null;
    if (neon && !neon.ok) continue;
    if (!canPlace(state, item, placement, ctx, { variant }).ok) continue;
    const clean: PlacedDecor = {
      instanceId: p.instanceId,
      decorId: p.decorId,
      ...placement,
      ...(variant ? { variant } : {}),
      ...(neon?.ok ? { text: neon.text } : {}),
    };
    state = { ...state, items: [...state.items, clean] };
  }
  return state;
}

/** Ocupação dos nichos de cada estante, para a vitrine mostrar troféus nos nichos vazios */
export function freeShelfSlots(state: Pick<RoomDecorState, 'items'>, hostInstanceId: string): number[] {
  const host = state.items.find((p) => p.instanceId === hostInstanceId);
  if (!host) return [];
  const used = new Set(state.items.filter((p) => p.shelfRef?.instanceId === hostInstanceId).map((p) => p.shelfRef?.slot));
  return shelfSlots(host).map((s) => s.slot).filter((s) => !used.has(s));
}
