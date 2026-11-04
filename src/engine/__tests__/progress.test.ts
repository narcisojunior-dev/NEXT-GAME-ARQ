import { describe, it, expect } from 'vitest';
import {
  PROGRESS_VERSION,
  addLeaderboardEntry,
  createEmptyProgress,
  mergeMissionResult,
  mergeTeamRecord,
  sanitizeProgress,
} from '../progress';

describe('Progresso salvo (#30)', () => {
  it('guarda o melhor resultado de cada missão (estrelas e tempo independentes)', () => {
    const first = { stars: 2 as const, bestTimeSeconds: 300, completedAt: '2026-11-01' };
    const merged = mergeMissionResult(first, { stars: 1, bestTimeSeconds: 200, completedAt: '2026-11-02' });
    expect(merged.stars).toBe(2);
    expect(merged.bestTimeSeconds).toBe(200);
    expect(merged.completedAt).toBe('2026-11-01');
  });

  it('recorde por equipe guarda a maior pontuação e o menor tempo', () => {
    const r = mergeTeamRecord(mergeTeamRecord(undefined, 5000, 400), 4000, 300);
    expect(r).toEqual({ bestScore: 5000, bestTimeSeconds: 300 });
  });

  it('placar ordena pela pontuação e ignora o mesmo código duas vezes', () => {
    const a = { teamName: 'A', totalScore: 100, timeSpentSeconds: 50, code: 'X', addedAt: '' };
    const b = { teamName: 'B', totalScore: 200, timeSpentSeconds: 60, code: 'Y', addedAt: '' };
    const board = addLeaderboardEntry(addLeaderboardEntry([], a), b);
    expect(board.map((e) => e.teamName)).toEqual(['B', 'A']);
    expect(addLeaderboardEntry(board, a)).toBe(board);
  });

  describe('sanitização de dados do localStorage', () => {
    it('dados ausentes ou corrompidos viram progresso vazio, sem exceção', () => {
      for (const raw of [undefined, null, 42, 'lixo', [], { missionResults: 'x' }]) {
        expect(sanitizeProgress(raw)).toEqual(createEmptyProgress());
      }
    });

    it('descarta só as entradas inválidas e mantém as válidas', () => {
      const progress = sanitizeProgress({
        version: 0,
        missionResults: {
          ok: { stars: 3, bestTimeSeconds: 120, completedAt: 'hoje', answerCorrect: true },
          estrelasInvalidas: { stars: 7, bestTimeSeconds: 10 },
          tempoNegativo: { stars: 1, bestTimeSeconds: -5 },
        },
        teamRecords: { Azul: { bestScore: 900, bestTimeSeconds: 200 }, Ruim: { bestScore: 'x' } },
        leaderboard: [{ teamName: 'Azul', totalScore: 900, timeSpentSeconds: 200, code: 'C' }, { teamName: 1 }],
        soundMuted: true,
        teacherUnlockAll: 'sim',
      });
      expect(Object.keys(progress.missionResults)).toEqual(['ok']);
      expect(Object.keys(progress.teamRecords)).toEqual(['Azul']);
      expect(progress.leaderboard).toHaveLength(1);
      expect(progress.soundMuted).toBe(true);
      expect(progress.teacherUnlockAll).toBe(false);
      expect(progress.version).toBe(PROGRESS_VERSION);
    });
  });
});
