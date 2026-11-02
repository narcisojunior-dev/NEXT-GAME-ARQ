import { create } from 'zustand';
import { CableId, CableTargetId } from '@/engine/cabling';
import { useAssemblyStore } from '@/store/useAssemblyStore';

export type CableFeedback = { tone: 'success' | 'error' | 'info'; text: string };

interface CableDragState {
  /** Cabo "na mão": selecionado por clique ou sendo arrastado */
  heldCableId: CableId | null;
  isDragging: boolean;
  hoverTargetId: CableTargetId | null;
  feedback: CableFeedback | null;
  shakeCableId: CableId | null;
  setHeld: (id: CableId | null) => void;
  setDragging: (dragging: boolean) => void;
  setHoverTarget: (id: CableTargetId | null) => void;
  setFeedback: (feedback: CableFeedback | null) => void;
  /** Tenta ligar o cabo no conector, mostrando o resultado e tremendo o cabo em caso de erro */
  tryConnect: (cableId: CableId, targetId: CableTargetId) => boolean;
}

/**
 * Estado de interface do cabeamento (não faz parte do jogo salvo): compartilhado entre a
 * bandeja de cabos e os conectores desenhados na placa-mãe, na baia SATA e na GPU
 */
export const useCableDragStore = create<CableDragState>((set) => ({
  heldCableId: null,
  isDragging: false,
  hoverTargetId: null,
  feedback: null,
  shakeCableId: null,
  setHeld: (id) => set({ heldCableId: id }),
  setDragging: (dragging) => set({ isDragging: dragging }),
  setHoverTarget: (id) => set({ hoverTargetId: id }),
  setFeedback: (feedback) => set({ feedback }),
  tryConnect: (cableId, targetId) => {
    const result = useAssemblyStore.getState().connectCableTo(cableId, targetId);
    if (result.success) {
      set({ feedback: { tone: 'success', text: result.message }, heldCableId: null });
    } else {
      set({ feedback: { tone: 'error', text: result.message }, shakeCableId: cableId });
      window.setTimeout(() => set({ shakeCableId: null }), 450);
    }
    return result.success;
  },
}));
