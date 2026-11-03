import { create } from 'zustand';
import { DeskSnapPointId, PlacedDeskItem } from '@/engine/deskSetup';
import { ExternalCableId, ExternalCableValidationResult, ExternalPortId, getFixedCableEnd } from '@/engine/externalCabling';
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
  /** Cabo externo em mãos e a ponta já escolhida (Issue 04) */
  heldCable: { cableId: ExternalCableId; firstPort: ExternalPortId | null } | null;
  /** Última porta recusada: dispara o tremor do ponto de conexão */
  lastRejectedPort: { port: ExternalPortId; nonce: number } | null;

  holdItem: (item: PlacedDeskItem | null) => void;
  startDrag: (item: PlacedDeskItem) => void;
  endDrag: () => void;
  setMagnetSnap: (snap: DeskSnapPointId | null) => void;
  notifyPlaced: (snapPointId: DeskSnapPointId) => void;
  notifyRejected: (snapPointId: DeskSnapPointId) => void;
  inspect: (snap: DeskSnapPointId | null) => void;
  holdCable: (cableId: ExternalCableId | null) => void;
  setFirstPort: (port: ExternalPortId | null) => void;
  notifyRejectedPort: (port: ExternalPortId) => void;
}

export const useDeskPlacementStore = create<DeskPlacementState>((set) => ({
  heldItem: null,
  isDragging: false,
  magnetSnap: null,
  lastPlaced: null,
  lastRejected: null,
  inspectedSnap: null,
  heldCable: null,
  lastRejectedPort: null,

  // Item e cabo em mãos são exclusivos: pegar um solta o outro
  holdItem: (item) => set({ heldItem: item, heldCable: null, isDragging: false, magnetSnap: null, inspectedSnap: null }),
  startDrag: (item) => set({ heldItem: item, heldCable: null, isDragging: true, magnetSnap: null, inspectedSnap: null }),
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
  holdCable: (cableId) =>
    set({
      heldCable: cableId ? { cableId, firstPort: getFixedCableEnd(cableId) } : null,
      heldItem: null,
      isDragging: false,
      magnetSnap: null,
      inspectedSnap: null,
    }),
  setFirstPort: (port) => set((st) => (st.heldCable ? { heldCable: { ...st.heldCable, firstPort: port } } : st)),
  notifyRejectedPort: (port) =>
    set((st) => ({ lastRejectedPort: { port, nonce: (st.lastRejectedPort?.nonce ?? 0) + 1 } })),
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

/**
 * Escolhe uma porta para o cabo em mãos (clique no ponto 3D ou botão acessível do inventário).
 * Primeira porta = uma ponta; segunda = conecta via store (regras, som e alerta didático).
 * Retorna o resultado da conexão quando ela foi tentada.
 */
export function pickCablePort(port: ExternalPortId): ExternalCableValidationResult | null {
  const placement = useDeskPlacementStore.getState();
  const held = placement.heldCable;
  if (!held) return null;
  if (!held.firstPort) {
    placement.setFirstPort(port);
    return null;
  }
  if (held.firstPort === port) {
    // Clicar de novo na mesma ponta a solta (exceto a ponta fixa do periférico, que já vem escolhida)
    if (getFixedCableEnd(held.cableId) !== port) placement.setFirstPort(null);
    return null;
  }
  const result = useAssemblyStore.getState().connectExternalCable(held.cableId, held.firstPort, port);
  if (result.allowed) placement.holdCable(null);
  else placement.notifyRejectedPort(port);
  return result;
}
