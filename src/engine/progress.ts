/**
 * Progresso salvo do aluno (#30): missões concluídas, estrelas, melhores tempos, recordes por
 * equipe, placar do professor e preferências. Puro: a persistência fica no store.
 */
export const PROGRESS_VERSION = 1;

export interface MissionResult {
  stars: 1 | 2 | 3;
  bestTimeSeconds: number;
  completedAt: string;
  /** Resposta da pergunta de fixação (registrada para o professor; não bloqueia a próxima missão) */
  answerCorrect?: boolean;
}

export interface TeamRecord {
  bestScore: number;
  bestTimeSeconds: number;
}

export interface LeaderboardEntry {
  teamName: string;
  totalScore: number;
  timeSpentSeconds: number;
  code: string;
  addedAt: string;
}

export interface PlayerProgress {
  version: number;
  missionResults: Record<string, MissionResult>;
  teamRecords: Record<string, TeamRecord>;
  leaderboard: LeaderboardEntry[];
  soundMuted: boolean;
  /** Modo professor: libera todas as missões da campanha */
  teacherUnlockAll: boolean;
}

export function createEmptyProgress(): PlayerProgress {
  return {
    version: PROGRESS_VERSION,
    missionResults: {},
    teamRecords: {},
    leaderboard: [],
    soundMuted: false,
    teacherUnlockAll: false,
  };
}

/** Guarda o melhor resultado: mais estrelas e menor tempo (independentes entre si) */
export function mergeMissionResult(previous: MissionResult | undefined, next: MissionResult): MissionResult {
  if (!previous) return next;
  return {
    stars: next.stars > previous.stars ? next.stars : previous.stars,
    bestTimeSeconds: Math.min(previous.bestTimeSeconds, next.bestTimeSeconds),
    completedAt: previous.completedAt,
    answerCorrect: next.answerCorrect ?? previous.answerCorrect,
  };
}

export function mergeTeamRecord(previous: TeamRecord | undefined, score: number, timeSeconds: number): TeamRecord {
  if (!previous) return { bestScore: score, bestTimeSeconds: timeSeconds };
  return { bestScore: Math.max(previous.bestScore, score), bestTimeSeconds: Math.min(previous.bestTimeSeconds, timeSeconds) };
}

/** Placar sem duplicatas (mesmo código só entra uma vez), do maior para o menor */
export function addLeaderboardEntry(board: LeaderboardEntry[], entry: LeaderboardEntry): LeaderboardEntry[] {
  if (board.some((e) => e.code === entry.code)) return board;
  return [...board, entry].sort((a, b) => b.totalScore - a.totalScore || a.timeSpentSeconds - b.timeSpentSeconds);
}

/* ------------------------------------------------------------------------------------
 * Sanitização / migração: dados do localStorage podem estar corrompidos, editados à mão
 * ou serem de uma versão antiga. Nada disso pode quebrar o jogo.
 * ------------------------------------------------------------------------------------ */
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function sanitizeMissionResult(raw: unknown): MissionResult | null {
  if (!isRecord(raw)) return null;
  const { stars, bestTimeSeconds, completedAt, answerCorrect } = raw;
  if (stars !== 1 && stars !== 2 && stars !== 3) return null;
  if (!isFiniteNumber(bestTimeSeconds) || bestTimeSeconds < 0) return null;
  return {
    stars,
    bestTimeSeconds,
    completedAt: typeof completedAt === 'string' ? completedAt : new Date(0).toISOString(),
    ...(typeof answerCorrect === 'boolean' ? { answerCorrect } : {}),
  };
}

function sanitizeLeaderboardEntry(raw: unknown): LeaderboardEntry | null {
  if (!isRecord(raw)) return null;
  const { teamName, totalScore, timeSpentSeconds, code, addedAt } = raw;
  if (typeof teamName !== 'string' || typeof code !== 'string') return null;
  if (!isFiniteNumber(totalScore) || !isFiniteNumber(timeSpentSeconds)) return null;
  return { teamName, totalScore, timeSpentSeconds, code, addedAt: typeof addedAt === 'string' ? addedAt : '' };
}

export function sanitizeProgress(raw: unknown): PlayerProgress {
  const base = createEmptyProgress();
  if (!isRecord(raw)) return base;

  const missionResults: Record<string, MissionResult> = {};
  if (isRecord(raw.missionResults)) {
    Object.entries(raw.missionResults).forEach(([id, value]) => {
      const result = sanitizeMissionResult(value);
      if (result) missionResults[id] = result;
    });
  }

  const teamRecords: Record<string, TeamRecord> = {};
  if (isRecord(raw.teamRecords)) {
    Object.entries(raw.teamRecords).forEach(([team, value]) => {
      if (isRecord(value) && isFiniteNumber(value.bestScore) && isFiniteNumber(value.bestTimeSeconds)) {
        teamRecords[team] = { bestScore: value.bestScore, bestTimeSeconds: value.bestTimeSeconds };
      }
    });
  }

  const leaderboard = Array.isArray(raw.leaderboard)
    ? raw.leaderboard.map(sanitizeLeaderboardEntry).filter((e): e is LeaderboardEntry => e !== null)
    : [];

  return {
    version: PROGRESS_VERSION,
    missionResults,
    teamRecords,
    leaderboard,
    soundMuted: raw.soundMuted === true,
    teacherUnlockAll: raw.teacherUnlockAll === true,
  };
}
