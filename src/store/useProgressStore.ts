import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  LeaderboardEntry,
  MissionResult,
  PROGRESS_VERSION,
  PlayerProgress,
  addLeaderboardEntry,
  createEmptyProgress,
  mergeMissionResult,
  mergeTeamRecord,
  sanitizeProgress,
} from '../engine/progress';
import { QualityPreference } from '../engine/qualityTier';
import { decodeValidationCode } from '../engine/validationCode';
import { soundEngine } from '../engine/audio/soundEngine';
import { STORAGE_KEYS, safeStateStorage } from './safeStorage';

/**
 * Progresso persistente do aluno (#30) e placar do professor (#29).
 * Separado do store de montagem: zerar a bancada não apaga estrelas nem o placar.
 */
interface ProgressStore extends PlayerProgress {
  recordMissionResult: (missionId: string, result: MissionResult) => void;
  recordAnswer: (missionId: string, correct: boolean) => void;
  recordTeamResult: (teamName: string, score: number, timeSeconds: number) => void;
  /** Valida o código da equipe e adiciona ao placar; retorna o motivo quando recusado */
  addLeaderboardCode: (code: string) => { ok: true; entry: LeaderboardEntry } | { ok: false; reason: 'FORMAT' | 'SEAL' | 'DUPLICATE' };
  removeLeaderboardEntry: (code: string) => void;
  setSoundMuted: (muted: boolean) => void;
  setTeacherUnlockAll: (unlock: boolean) => void;
  setQualityPreference: (preference: QualityPreference) => void;
  /** Conquistas que liberam a decoração do quarto (#85) */
  recordDeskRunning: () => void;
  recordPostFirstTry: () => void;
  recordDiagnosticResolved: (scenarioId: string) => void;
  resetProgress: () => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...createEmptyProgress(),

      recordMissionResult: (missionId, result) =>
        set((st) => ({ missionResults: { ...st.missionResults, [missionId]: mergeMissionResult(st.missionResults[missionId], result) } })),

      recordAnswer: (missionId, correct) =>
        set((st) => {
          const current = st.missionResults[missionId];
          return current ? { missionResults: { ...st.missionResults, [missionId]: { ...current, answerCorrect: correct } } } : st;
        }),

      recordTeamResult: (teamName, score, timeSeconds) =>
        set((st) => ({ teamRecords: { ...st.teamRecords, [teamName]: mergeTeamRecord(st.teamRecords[teamName], score, timeSeconds) } })),

      addLeaderboardCode: (code) => {
        const decoded = decodeValidationCode(code);
        if (!decoded.valid) return { ok: false, reason: decoded.reason };
        const normalized = code.trim().toUpperCase();
        if (get().leaderboard.some((e) => e.code === normalized)) return { ok: false, reason: 'DUPLICATE' };
        const entry: LeaderboardEntry = { ...decoded.payload, code: normalized, addedAt: new Date().toISOString() };
        set((st) => ({ leaderboard: addLeaderboardEntry(st.leaderboard, entry) }));
        return { ok: true, entry };
      },

      removeLeaderboardEntry: (code) => set((st) => ({ leaderboard: st.leaderboard.filter((e) => e.code !== code) })),

      setSoundMuted: (muted) => {
        soundEngine.setMuted(muted);
        set({ soundMuted: muted });
      },

      setTeacherUnlockAll: (unlock) => set({ teacherUnlockAll: unlock }),
      setQualityPreference: (qualityPreference) => set({ qualityPreference }),
      recordDeskRunning: () => set((st) => (st.deskRunningAt ? st : { deskRunningAt: new Date().toISOString() })),
      recordPostFirstTry: () => set((st) => ({ postFirstTryCount: st.postFirstTryCount + 1 })),
      recordDiagnosticResolved: (scenarioId) =>
        set((st) => (st.diagnosticsResolved.includes(scenarioId) ? st : { diagnosticsResolved: [...st.diagnosticsResolved, scenarioId] })),

      resetProgress: () => {
        soundEngine.setMuted(false);
        set(createEmptyProgress());
      },
    }),
    {
      name: STORAGE_KEYS.progress,
      version: PROGRESS_VERSION,
      storage: createJSONStorage(() => safeStateStorage),
      skipHydration: true,
      partialize: (st): PlayerProgress => ({
        version: PROGRESS_VERSION,
        missionResults: st.missionResults,
        teamRecords: st.teamRecords,
        leaderboard: st.leaderboard,
        soundMuted: st.soundMuted,
        teacherUnlockAll: st.teacherUnlockAll,
        qualityPreference: st.qualityPreference,
        deskRunningAt: st.deskRunningAt,
        postFirstTryCount: st.postFirstTryCount,
        diagnosticsResolved: st.diagnosticsResolved,
      }),
      // Qualquer versão antiga ou dado corrompido passa pela sanitização do motor
      migrate: (persisted) => sanitizeProgress(persisted),
      merge: (persisted, current) => {
        const clean = sanitizeProgress(persisted);
        soundEngine.setMuted(clean.soundMuted);
        return { ...current, ...clean };
      },
    }
  )
);
