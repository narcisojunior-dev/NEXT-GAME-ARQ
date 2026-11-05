import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { RoomContext } from '../engine/roomLayout';
import { DecorPlacement, PlacedDecor, PlacementCheck, ROOM_DECOR_VERSION } from '../engine/roomPlacement';
import { addDecor, createRoomDecor, moveDecor, removeDecor, sanitizeRoomDecor, updateDecor } from '../engine/roomDecorState';
import { RoomThemeId } from '../engine/roomThemes';
import { STORAGE_KEYS, safeStateStorage } from './safeStorage';

/**
 * Quarto decorado do aluno (#90), persistido e sanitizado.
 *
 * O contexto da sala (mesa, cadeira, periféricos e nível de qualidade) muda fora deste store,
 * por isso cada ação recebe o `RoomContext` atual. O módulo só é baixado com o Modo Decorar.
 */
const UNDO_LIMIT = 30;

interface PersistedRoom {
  version: typeof ROOM_DECOR_VERSION;
  theme: RoomThemeId;
  items: PlacedDecor[];
  /** O conjunto inicial já foi montado uma vez (o aluno pode ter esvaziado o quarto de propósito) */
  created: boolean;
}

interface RoomDecorStore extends PersistedRoom {
  /** Já passou pela sanitização nesta sessão */
  ready: boolean;
  undoStack: PlacedDecor[][];

  /** Sanitiza o que veio do localStorage ou monta o conjunto inicial do tema */
  prepare: (ctx: RoomContext, isUnlocked: (decorId: string) => boolean, theme: RoomThemeId) => void;
  place: (decorId: string, placement: DecorPlacement, ctx: RoomContext, extra?: { variant?: string; text?: string }) => { check: PlacementCheck; instanceId?: string };
  move: (instanceId: string, placement: DecorPlacement, ctx: RoomContext) => { check: PlacementCheck };
  remove: (instanceId: string) => void;
  setVariant: (instanceId: string, patch: { variant?: string; text?: string }) => void;
  setTheme: (theme: RoomThemeId) => void;
  undo: () => boolean;
  /** "Recomeçar quarto": volta ao conjunto inicial do tema */
  restart: (ctx: RoomContext) => void;
  /** "Começar do zero" do jogo: apaga o quarto */
  forget: () => void;
}

const pushUndo = (stack: PlacedDecor[][], items: PlacedDecor[]) => [...stack, items].slice(-UNDO_LIMIT);

export const useRoomDecorStore = create<RoomDecorStore>()(
  persist(
    (set, get) => ({
      version: ROOM_DECOR_VERSION,
      theme: 'ROOM_GAMER',
      items: [],
      created: false,
      ready: false,
      undoStack: [],

      prepare: (ctx, isUnlocked, theme) => {
        const st = get();
        if (!st.created) {
          const fresh = createRoomDecor(theme, ctx);
          set({ ...fresh, created: true, ready: true, undoStack: [] });
          return;
        }
        const clean = sanitizeRoomDecor({ theme: st.theme, items: st.items }, ctx, isUnlocked, theme);
        set({ theme: clean.theme, items: clean.items, ready: true });
      },

      place: (decorId, placement, ctx, extra) => {
        const st = get();
        const result = addDecor({ version: ROOM_DECOR_VERSION, theme: st.theme, items: st.items }, decorId, placement, ctx, extra);
        if (result.check.ok) set({ items: result.state.items, undoStack: pushUndo(st.undoStack, st.items) });
        return { check: result.check, instanceId: result.instanceId };
      },

      move: (instanceId, placement, ctx) => {
        const st = get();
        const result = moveDecor({ version: ROOM_DECOR_VERSION, theme: st.theme, items: st.items }, instanceId, placement, ctx);
        if (result.check.ok) set({ items: result.state.items, undoStack: pushUndo(st.undoStack, st.items) });
        return { check: result.check };
      },

      remove: (instanceId) => {
        const st = get();
        set({ items: removeDecor({ version: ROOM_DECOR_VERSION, theme: st.theme, items: st.items }, instanceId).items, undoStack: pushUndo(st.undoStack, st.items) });
      },

      setVariant: (instanceId, patch) => {
        const st = get();
        set({ items: updateDecor({ version: ROOM_DECOR_VERSION, theme: st.theme, items: st.items }, instanceId, patch).items, undoStack: pushUndo(st.undoStack, st.items) });
      },

      setTheme: (theme) => set({ theme }),

      undo: () => {
        const { undoStack } = get();
        const previous = undoStack[undoStack.length - 1];
        if (!previous) return false;
        set({ items: previous, undoStack: undoStack.slice(0, -1) });
        return true;
      },

      restart: (ctx) => {
        const st = get();
        set({ items: createRoomDecor(st.theme, ctx).items, undoStack: pushUndo(st.undoStack, st.items) });
      },

      forget: () => set({ theme: 'ROOM_GAMER', items: [], created: false, ready: false, undoStack: [] }),
    }),
    {
      name: STORAGE_KEYS.room,
      version: ROOM_DECOR_VERSION,
      storage: createJSONStorage(() => safeStateStorage),
      skipHydration: true,
      partialize: (st): PersistedRoom => ({ version: ROOM_DECOR_VERSION, theme: st.theme, items: st.items, created: st.created }),
      // A sanitização de verdade precisa da sala e dos desbloqueios: acontece em prepare()
      merge: (persisted, current) => {
        const raw = typeof persisted === 'object' && persisted !== null ? (persisted as Partial<PersistedRoom>) : {};
        return {
          ...current,
          theme: typeof raw.theme === 'string' ? raw.theme : current.theme,
          items: Array.isArray(raw.items) ? raw.items : [],
          created: raw.created === true,
          ready: false,
        };
      },
    }
  )
);
