import { create } from 'zustand';
import { CutawaySubsystem } from '@/engine/cutaway';

/**
 * Estado de interface do modo "Abrir o PC" e da vista explodida (#38, #61, #62). Não faz parte
 * do jogo salvo: sair do modo devolve a bancada exatamente como estava.
 */
export type CutawayMode = 'OFF' | 'EXPLODED' | 'OPEN';

interface CutawayState {
  mode: CutawayMode;
  selection: CutawaySubsystem | null;
  /** O tour está conduzindo a seleção (o aluno não está mexendo) */
  touring: boolean;
  /** Instante (performance.now) da última entrada do aluno: base da ociosidade do tour */
  lastInputAt: number;
  tourSkipped: boolean;
  setMode: (mode: CutawayMode) => void;
  select: (selection: CutawaySubsystem | null) => void;
  setTouring: (touring: boolean) => void;
  markInput: () => void;
  skipTour: () => void;
  replayTour: (idleMs: number) => void;
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : 0);

export const useCutawayStore = create<CutawayState>((set) => ({
  mode: 'OFF',
  selection: null,
  touring: false,
  lastInputAt: 0,
  tourSkipped: false,
  setMode: (mode) => set({ mode, selection: null, touring: false, lastInputAt: now(), tourSkipped: false }),
  select: (selection) => set({ selection }),
  setTouring: (touring) => set({ touring }),
  markInput: () => set({ lastInputAt: now(), touring: false }),
  skipTour: () => set({ tourSkipped: true, touring: false, lastInputAt: now() }),
  // "Ver de novo": volta a contar como se o aluno já estivesse parado há `idleMs`
  replayTour: (idleMs) => set({ tourSkipped: false, lastInputAt: now() - idleMs }),
}));
