import { create } from 'zustand';
import type { DecorPlacement, Rotation } from '@/engine/roomPlacement';

/**
 * Estado efêmero do Modo Decorar (não é salvo): item em mãos, arraste, seleção e gatilhos de
 * animação. Fica num módulo leve, sem o catálogo, para o botão "Decorar o quarto" não pesar.
 */
export interface HeldDecor {
  decorId: string;
  /** Peça que já está no quarto e está sendo movida */
  instanceId?: string;
  /** Posição do fantasma (null até o cursor ou o teclado escolher um lugar) */
  placement: DecorPlacement | null;
  rotationY: Rotation;
  variant?: string;
  text?: string;
}

export type PhotoAngle = 0 | 1 | 2;

/** Três vistas prontas do quarto: câmera do Modo Decorar e ângulos da foto (#86, #90) */
export const ROOM_VIEWS: { label: string; pos: [number, number, number]; target: [number, number, number] }[] = [
  { label: 'Panorâmica', pos: [0.5, 2.7, 4.7], target: [-0.3, 0.8, 0.9] },
  { label: 'Mesa e parede', pos: [0.9, 1.5, 2.6], target: [-0.2, 1.0, -0.2] },
  { label: 'Canto da janela', pos: [1.2, 2.3, 3.6], target: [-1.6, 1.2, 1.0] },
];

interface DecorModeState {
  isOpen: boolean;
  held: HeldDecor | null;
  isDragging: boolean;
  selectedId: string | null;
  /** Mensagem da última recusa (texto do fantasma vermelho e da região anunciada) */
  message: { text: string; tone: 'ok' | 'error' | 'info'; nonce: number } | null;
  lastPlaced: { instanceId: string; nonce: number } | null;
  lastRejected: { nonce: number } | null;
  /** Foto do quarto: a cena registra a função de captura quando está montada */
  capturePhoto: ((angle: PhotoAngle) => Promise<Blob | null>) | null;
  /** Vista da câmera no Modo Decorar (e a nonce reaplica a mesma vista) */
  view: { angle: PhotoAngle; nonce: number };

  open: () => void;
  close: () => void;
  hold: (held: HeldDecor | null, dragging?: boolean) => void;
  setPlacement: (placement: DecorPlacement | null) => void;
  updateHeld: (patch: Partial<HeldDecor>) => void;
  endDrag: () => void;
  select: (instanceId: string | null) => void;
  say: (text: string, tone?: 'ok' | 'error' | 'info') => void;
  notifyPlaced: (instanceId: string) => void;
  notifyRejected: (text: string) => void;
  registerPhoto: (fn: ((angle: PhotoAngle) => Promise<Blob | null>) | null) => void;
  setView: (angle: PhotoAngle) => void;
}

let nonce = 0;

export const useDecorModeStore = create<DecorModeState>((set) => ({
  isOpen: false,
  held: null,
  isDragging: false,
  selectedId: null,
  message: null,
  lastPlaced: null,
  lastRejected: null,
  capturePhoto: null,
  view: { angle: 0, nonce: 0 },

  open: () => set({ isOpen: true, view: { angle: 0, nonce: ++nonce }, held: null, isDragging: false, selectedId: null, message: null }),
  close: () => set({ isOpen: false, held: null, isDragging: false, selectedId: null, message: null }),
  hold: (held, dragging = false) => set({ held, isDragging: Boolean(held) && dragging, selectedId: held?.instanceId ?? null }),
  setPlacement: (placement) => set((s) => (s.held ? { held: { ...s.held, placement } } : s)),
  updateHeld: (patch) => set((s) => (s.held ? { held: { ...s.held, ...patch } } : s)),
  endDrag: () => set({ isDragging: false }),
  select: (selectedId) => set({ selectedId }),
  say: (text, tone = 'info') => set({ message: { text, tone, nonce: ++nonce } }),
  notifyPlaced: (instanceId) => set({ lastPlaced: { instanceId, nonce: ++nonce } }),
  notifyRejected: (text) => set({ lastRejected: { nonce: ++nonce }, message: { text, tone: 'error', nonce: ++nonce } }),
  registerPhoto: (capturePhoto) => set({ capturePhoto }),
  setView: (angle) => set({ view: { angle, nonce: ++nonce } }),
}));
