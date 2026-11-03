import { create } from 'zustand';
import { DeskSnapPointId, PlacedDeskItem } from '@/engine/deskSetup';
import { useAssemblyStore } from '@/store/useAssemblyStore';

/**
 * Estado efêmero de interação da mesa 3D (não é regra de jogo, por isso fica fora do store
 * de montagem): item "em mãos", arraste e gatilhos de animação (encaixe elástico e tremor).
 */
interface DeskPlacementState {
  /** Item selecionado para posicionar (click-to-place) ou sendo arrastado */
  heldItem: PlacedDeskItem | null;
  isDragging: boolean;
  /** Snap point atraído magneticamente pelo item arrastado */
  magnetSnap: DeskSnapPointId | null;
  /** Último encaixe bem-sucedido: dispara a animação elástica de assentamento */
  lastPlaced: { snapPointId: DeskSnapPointId; nonce: number } | null;
  /** Última tentativa recusada: dispara o tremor do holograma */
  lastRejected: { snapPointId: DeskSnapPointId; nonce: number } | null;
  /** Item posicionado com o menu "Retirar" aberto */
  inspectedSnap: DeskSnapPointId | null;

  holdItem: (item: PlacedDeskItem | null) => void;
  startDrag: (item: PlacedDeskItem) => void;
  endDrag: () => void;
  setMagnetSnap: (snap: DeskSnapPointId | null) => void;
  notifyPlaced: (snapPointId: DeskSnapPointId) => void;
  notifyRejected: (snapPointId: DeskSnapPointId) => void;
  inspect: (snap: DeskSnapPointId | null) => void;
}

export const useDeskPlacementStore = create<DeskPlacementState>((set) => ({
  heldItem: null,
  isDragging: false,
  magnetSnap: null,
  lastPlaced: null,
  lastRejected: null,
  inspectedSnap: null,

  holdItem: (item) => set({ heldItem: item, isDragging: false, magnetSnap: null, inspectedSnap: null }),
  startDrag: (item) => set({ heldItem: item, isDragging: true, magnetSnap: null, inspectedSnap: null }),
  endDrag: () => set({ isDragging: false, magnetSnap: null }),
  setMagnetSnap: (snap) => set((st) => (st.magnetSnap === snap ? st : { magnetSnap: snap })),
  notifyPlaced: (snapPointId) =>
    set((st) => ({
      heldItem: null,
      isDragging: false,
      magnetSnap: null,
      lastPlaced: { snapPointId, nonce: (st.lastPlaced?.nonce ?? 0) + 1 },
    })),
  notifyRejected: (snapPointId) =>
    set((st) => ({ lastRejected: { snapPointId, nonce: (st.lastRejected?.nonce ?? 0) + 1 } })),
  inspect: (snap) => set({ inspectedSnap: snap }),
}));

/**
 * Tenta encaixar o item em mãos no snap point. Fonte única para os três caminhos equivalentes:
 * soltar o arraste, clicar no holograma e o botão acessível do inventário. As regras e o som
 * vêm do store de montagem (placeDeskItem); aqui só disparamos o feedback visual.
 */
export function placeHeldItem(snapPointId: DeskSnapPointId): boolean {
  const placement = useDeskPlacementStore.getState();
  const held = placement.heldItem;
  if (!held) return false;
  const ok = useAssemblyStore.getState().placeDeskItem(snapPointId, { ...held, snapPointId });
  if (ok) placement.notifyPlaced(snapPointId);
  else placement.notifyRejected(snapPointId);
  return ok;
}
