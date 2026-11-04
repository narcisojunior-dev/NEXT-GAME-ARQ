'use client';

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useProgressStore } from '@/store/useProgressStore';
import { useRoomDecorStore } from '@/store/useRoomDecorStore';
import { ROOM_LIMITS, RoomContext, buildRoomContext } from '@/engine/roomLayout';
import { DecorItem, findDecorItem } from '@/engine/roomDecor';
import { isUnlocked } from '@/engine/decorUnlocks';
import { NudgeDirection, nudgePlacement, rotatePlacement, suggestPlacements } from '@/engine/roomPlacement';
import { QualityTier, resolveQualityTier } from '@/engine/qualityTier';
import { soundEngine } from '@/engine/audio/soundEngine';
import { getWebGLRenderer } from '@/components/three/webglDetect';
import { useDecorModeStore } from './decorModeStore';

/* ------------------------------------------------------------------------------------
 * Contexto da sala: mesa do aluno + nível de qualidade (#63, #91)
 * ------------------------------------------------------------------------------------ */
let cachedRenderer: string | null | undefined;
function rendererName(): string | null {
  if (cachedRenderer === undefined) cachedRenderer = getWebGLRenderer();
  return cachedRenderer;
}

export function currentTier(): QualityTier {
  return resolveQualityTier(rendererName(), useProgressStore.getState().qualityPreference);
}

export function getRoomContext(): RoomContext {
  const s = useAssemblyStore.getState();
  return buildRoomContext(s.deskSetup.placedDeskItems, s.assembly.caseInstalled, ROOM_LIMITS[currentTier()]);
}

export function useRoomContext(): RoomContext {
  const { placed, caseInstalled } = useAssemblyStore(useShallow((s) => ({ placed: s.deskSetup.placedDeskItems, caseInstalled: s.assembly.caseInstalled })));
  const preference = useProgressStore((s) => s.qualityPreference);
  return useMemo(
    () => buildRoomContext(placed, caseInstalled, ROOM_LIMITS[resolveQualityTier(rendererName(), preference)]),
    [placed, caseInstalled, preference]
  );
}

export function isDecorUnlocked(decorId: string): boolean {
  const item = findDecorItem(decorId);
  return Boolean(item && isUnlocked(item.unlock, useProgressStore.getState()));
}

/** Prepara o quarto salvo (ou o conjunto inicial) para a mesa atual */
export function prepareRoom() {
  const theme = useAssemblyStore.getState().selectedRoomTheme;
  useRoomDecorStore.getState().prepare(getRoomContext(), isDecorUnlocked, theme);
}

/* ------------------------------------------------------------------------------------
 * Ações
 * ------------------------------------------------------------------------------------ */
const soundFor = (item: DecorItem) => {
  if (item.id === 'proc-fita-led' || item.id === 'proc-hexagonos' || item.id === 'proc-neon-texto' || item.id.startsWith('decor-neon')) return 'LIGHT';
  return item.zones[0] === 'WALL' ? 'WALL' : 'FLOOR';
};

/** Pega um item da gaveta (clique ou início do arraste) */
export function pickFromDrawer(decorId: string, dragging = false) {
  const item = findDecorItem(decorId);
  if (!item) return;
  const mode = useDecorModeStore.getState();
  if (!dragging && mode.held?.decorId === decorId && !mode.held.instanceId) {
    mode.hold(null);
    mode.say('Item devolvido à gaveta.');
    return;
  }
  mode.hold({ decorId, placement: null, rotationY: 0, variant: item.variants?.[0]?.id, text: item.id === 'proc-neon-texto' ? useAssemblyStore.getState().teamName.slice(0, 12) || 'PC ACADEMY' : undefined }, dragging);
  mode.say(`Em mãos: ${item.name}. Arraste até o quarto ou clique num ponto destacado. Setas movem, Q e E giram, Enter confirma.`);
}

/** Pega uma peça que já está no quarto para mudar de lugar */
export function pickPlaced(instanceId: string, dragging = false) {
  const placed = useRoomDecorStore.getState().items.find((p) => p.instanceId === instanceId);
  const item = placed ? findDecorItem(placed.decorId) : null;
  if (!placed || !item) return;
  const { instanceId: id, decorId, rotationY, variant, text, zone, position, wall, shelfRef } = placed;
  useDecorModeStore.getState().hold({ decorId, instanceId: id, rotationY, variant, text, placement: { zone, position, rotationY, wall, shelfRef } }, dragging);
  useDecorModeStore.getState().say(`Movendo: ${item.name}. Setas movem 10 cm, Enter confirma, Esc cancela.`);
}

/** Tenta colocar o item em mãos no lugar do fantasma */
export function commitHeld(): boolean {
  const mode = useDecorModeStore.getState();
  const held = mode.held;
  const item = held ? findDecorItem(held.decorId) : null;
  if (!held || !item) return false;
  // Sem lugar escolhido (teclado ou botão "Colocar"): usa o primeiro lugar livre
  if (!held.placement && !ensurePlacement()) return false;
  const placement = useDecorModeStore.getState().held?.placement;
  if (!placement) return false;
  const ctx = getRoomContext();
  const room = useRoomDecorStore.getState();
  const result = held.instanceId
    ? { ...room.move(held.instanceId, placement, ctx), instanceId: held.instanceId }
    : room.place(held.decorId, placement, ctx, { variant: held.variant, text: held.text });
  if (!result.check.ok) {
    soundEngine.playErrorBuzz();
    mode.notifyRejected(result.check.message);
    return false;
  }
  soundEngine.playDecorPlace(soundFor(item));
  if (result.instanceId) mode.notifyPlaced(result.instanceId);
  mode.hold(null);
  if (result.instanceId) mode.select(result.instanceId);
  mode.say(`${item.name} ${held.instanceId ? 'mudou de lugar' : 'foi colocado no quarto'}.`, 'ok');
  return true;
}

/** Primeiro lugar válido para o teclado começar (sem mouse) */
export function ensurePlacement(): boolean {
  const mode = useDecorModeStore.getState();
  const held = mode.held;
  const item = held ? findDecorItem(held.decorId) : null;
  if (!held || !item) return false;
  if (held.placement) return true;
  const first = suggestPlacements(useRoomDecorStore.getState(), item, getRoomContext(), { limit: 1, ignoreInstanceId: held.instanceId, variant: held.variant })[0];
  if (!first) {
    mode.notifyRejected(`Não há lugar livre para ${item.name} neste quarto. Retire algum item.`);
    return false;
  }
  mode.setPlacement(first.placement);
  return true;
}

export function nudgeHeld(dir: NudgeDirection) {
  if (!ensurePlacement()) return;
  const { held } = useDecorModeStore.getState();
  const item = held ? findDecorItem(held.decorId) : null;
  if (!held?.placement || !item) return;
  useDecorModeStore.getState().setPlacement(nudgePlacement(useRoomDecorStore.getState(), item, held.placement, dir, getRoomContext()));
}

export function rotateHeld(step: 1 | -1) {
  const mode = useDecorModeStore.getState();
  const held = mode.held;
  const item = held ? findDecorItem(held.decorId) : null;
  if (!held || !item) return;
  const rotationY = (((held.rotationY + step * 90) % 360) + 360) % 360 as 0 | 90 | 180 | 270;
  mode.updateHeld({ rotationY, placement: held.placement ? rotatePlacement(item, held.placement, step, getRoomContext()) : null });
}

/** Gira uma peça já colocada (botão ↻ do painel) */
export function rotatePlaced(instanceId: string, step: 1 | -1 = 1) {
  const placed = useRoomDecorStore.getState().items.find((p) => p.instanceId === instanceId);
  const item = placed ? findDecorItem(placed.decorId) : null;
  if (!placed || !item) return;
  if (placed.zone === 'WALL') {
    useDecorModeStore.getState().say(`${item.name} fica rente à parede e não gira.`);
    return;
  }
  const ctx = getRoomContext();
  const { check } = useRoomDecorStore.getState().move(instanceId, rotatePlacement(item, placed, step, ctx), ctx);
  if (check.ok) {
    soundEngine.playDecorPlace(soundFor(item));
    useDecorModeStore.getState().notifyPlaced(instanceId);
    useDecorModeStore.getState().say(`${item.name} girou 90°.`, 'ok');
  } else {
    soundEngine.playErrorBuzz();
    useDecorModeStore.getState().notifyRejected(`Não dá para girar: ${check.message}`);
  }
}

/** Move uma peça já colocada pelas setas, sem pegá-la (painel acessível) */
export function nudgePlaced(instanceId: string, dir: NudgeDirection) {
  const room = useRoomDecorStore.getState();
  const placed = room.items.find((p) => p.instanceId === instanceId);
  const item = placed ? findDecorItem(placed.decorId) : null;
  if (!placed || !item) return;
  const ctx = getRoomContext();
  const { check } = room.move(instanceId, nudgePlacement(room, item, placed, dir, ctx), ctx);
  if (!check.ok) {
    soundEngine.playErrorBuzz();
    useDecorModeStore.getState().notifyRejected(check.message);
  }
}

export function removePlaced(instanceId: string) {
  const placed = useRoomDecorStore.getState().items.find((p) => p.instanceId === instanceId);
  const item = placed ? findDecorItem(placed.decorId) : null;
  if (!placed || !item) return;
  useRoomDecorStore.getState().remove(instanceId);
  const mode = useDecorModeStore.getState();
  if (mode.selectedId === instanceId) mode.select(null);
  if (mode.held?.instanceId === instanceId) mode.hold(null);
  mode.say(`${item.name} voltou para a gaveta.`, 'ok');
}

export function undoRoom() {
  const done = useRoomDecorStore.getState().undo();
  useDecorModeStore.getState().say(done ? 'Última mudança desfeita.' : 'Nada para desfazer.', done ? 'ok' : 'info');
}
