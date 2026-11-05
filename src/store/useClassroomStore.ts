import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS, safeStateStorage } from './safeStorage';
import type { OfficialScore } from '../engine/classroom/types';

/**
 * Turma do aluno (#78): token do participante e o último resultado. Sem a turma o jogo continua
 * igual (LocalOnly); com ela, o banner fala com /api/v1. O token fica só neste computador.
 */
export interface ClassroomSession {
  code: string;
  classroomName: string;
  participantId: string;
  displayName: string;
  token: string;
}

export interface RankingEntryView {
  position: number;
  participantId: string;
  displayName: string;
  score: number;
  completed: boolean;
}

export interface SubmissionReceipt {
  activityId: string;
  attemptNo: number;
  attemptsLeft: number;
  score: OfficialScore;
  status: 'VALIDO' | 'SINALIZADO' | 'INVALIDO';
  flags: string[];
  ranking: { top: RankingEntryView[]; own: RankingEntryView | null; participants: number; closed: boolean };
}

interface ClassroomStore {
  session: ClassroomSession | null;
  /** Atividade já aplicada à bancada (não reinicia a cada consulta) */
  startedActivityId: string | null;
  lastReceipt: SubmissionReceipt | null;
  joinOpen: boolean;
  prefillCode: string;

  setSession: (session: ClassroomSession | null) => void;
  markStarted: (activityId: string | null) => void;
  setReceipt: (receipt: SubmissionReceipt | null) => void;
  openJoin: (code?: string) => void;
  closeJoin: () => void;
  leave: () => void;
}

export const useClassroomStore = create<ClassroomStore>()(
  persist(
    (set) => ({
      session: null,
      startedActivityId: null,
      lastReceipt: null,
      joinOpen: false,
      prefillCode: '',
      setSession: (session) => set({ session, startedActivityId: null, lastReceipt: null }),
      markStarted: (startedActivityId) => set({ startedActivityId }),
      setReceipt: (lastReceipt) => set({ lastReceipt }),
      openJoin: (code = '') => set({ joinOpen: true, prefillCode: code }),
      closeJoin: () => set({ joinOpen: false }),
      leave: () => set({ session: null, startedActivityId: null, lastReceipt: null }),
    }),
    {
      name: STORAGE_KEYS.classroom,
      version: 1,
      storage: createJSONStorage(() => safeStateStorage),
      skipHydration: true,
      partialize: (s) => ({ session: s.session, startedActivityId: s.startedActivityId, lastReceipt: s.lastReceipt }),
    }
  )
);
