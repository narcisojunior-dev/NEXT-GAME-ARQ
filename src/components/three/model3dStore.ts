import { create } from 'zustand';

interface Model3DViewState {
  /** Modelo aberto no visualizador */
  modelId: string | null;
  /** Vitrine com todos os modelos disponíveis */
  isGalleryOpen: boolean;
  openModel: (modelId: string) => void;
  openGallery: () => void;
  selectInGallery: (modelId: string) => void;
  close: () => void;
}

/** Estado de interface do visualizador 3D (abre a partir da ficha didática, dos periféricos e do HUD) */
export const useModel3DStore = create<Model3DViewState>((set) => ({
  modelId: null,
  isGalleryOpen: false,
  openModel: (modelId) => set({ modelId, isGalleryOpen: false }),
  openGallery: () => set({ isGalleryOpen: true, modelId: null }),
  selectInGallery: (modelId) => set({ modelId }),
  close: () => set({ modelId: null, isGalleryOpen: false }),
}));
