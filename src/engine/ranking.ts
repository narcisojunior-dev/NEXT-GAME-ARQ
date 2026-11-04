import { RankableSubmission, compareBudgetSubmissions, compareMissionSubmissions } from './scoring';

/**
 * Ranking puro (#69; docs/modo-professor-turmas-ranking-orcamento.md, seção 8): usado pela API
 * do Modo Professor e pelas telas. Sem sorteio: empate exato divide a posição (1º, 1º, 3º).
 */
export type ActivityMode = 'MISSAO' | 'ORCAMENTO';
export type AttemptPolicy = 'MELHOR' | 'ULTIMO';
export type SubmissionStatus = 'VALIDO' | 'SINALIZADO';
export type RankingVisibility = 'AO_VIVO' | 'AO_ENCERRAR' | 'SO_PROFESSOR';

export interface Submission extends RankableSubmission {
  participantId: string;
  nickname: string;
  status: SubmissionStatus;
  bottleneckPercent: number;
}

export interface RankedEntry {
  position: number;
  submission: Submission;
  /** Envios válidos do participante nesta atividade */
  attempts: number;
}

const comparatorFor = (mode: ActivityMode) => (mode === 'ORCAMENTO' ? compareBudgetSubmissions : compareMissionSubmissions);

/** Mesma posição só quando nada desempata (pontos, conclusão e todos os critérios do modo) */
function sameRank(a: Submission, b: Submission, mode: ActivityMode): boolean {
  const cmp = comparatorFor(mode);
  // Ignora o horário do envio no empate "exato": o desempate final por envio mais antigo vale para ordenar,
  // mas dois envios idênticos em tudo dividem a posição
  return cmp({ ...a, submittedAt: '' }, { ...b, submittedAt: '' }) === 0;
}

export interface RankActivityOptions {
  mode: ActivityMode;
  attemptPolicy: AttemptPolicy;
  /** Visão do professor: inclui envios sinalizados */
  includeFlagged?: boolean;
}

export function rankActivity(submissions: Submission[], options: RankActivityOptions): RankedEntry[] {
  const cmp = comparatorFor(options.mode);
  const eligible = submissions.filter((s) => s.status === 'VALIDO' || options.includeFlagged);
  const byParticipant = new Map<string, Submission[]>();
  eligible.forEach((s) => byParticipant.set(s.participantId, [...(byParticipant.get(s.participantId) ?? []), s]));

  const chosen = [...byParticipant.values()].map((list) => {
    const pick =
      options.attemptPolicy === 'ULTIMO'
        ? [...list].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0]
        : [...list].sort(cmp)[0];
    return { submission: pick, attempts: list.length };
  });
  chosen.sort((a, b) => cmp(a.submission, b.submission));

  const ranked: RankedEntry[] = [];
  chosen.forEach((entry, index) => {
    const previous = ranked[index - 1];
    const position = previous && sameRank(previous.submission, entry.submission, options.mode) ? previous.position : index + 1;
    ranked.push({ position, submission: entry.submission, attempts: entry.attempts });
  });
  return ranked;
}

/* ------------------------------------------------------------------------------------
 * Ranking da turma: soma das atividades ENCERRADAS + quantas cada participante fez
 * ------------------------------------------------------------------------------------ */
export interface ClosedActivityRanking {
  activityId: string;
  closed: boolean;
  entries: RankedEntry[];
}

export interface ClassRankingEntry {
  position: number;
  participantId: string;
  nickname: string;
  total: number;
  activitiesDone: number;
}

export function rankClass(activities: ClosedActivityRanking[]): ClassRankingEntry[] {
  const totals = new Map<string, { nickname: string; total: number; activitiesDone: number }>();
  activities
    .filter((a) => a.closed)
    .forEach((a) =>
      a.entries.forEach(({ submission }) => {
        const current = totals.get(submission.participantId) ?? { nickname: submission.nickname, total: 0, activitiesDone: 0 };
        totals.set(submission.participantId, {
          nickname: submission.nickname,
          total: current.total + submission.score,
          activitiesDone: current.activitiesDone + 1,
        });
      })
    );
  const list = [...totals.entries()]
    .map(([participantId, t]) => ({ participantId, ...t }))
    .sort((a, b) => b.total - a.total || b.activitiesDone - a.activitiesDone);
  const ranked: ClassRankingEntry[] = [];
  list.forEach((e, i) => {
    const previous = ranked[i - 1];
    const tie = previous && previous.total === e.total && previous.activitiesDone === e.activitiesDone;
    ranked.push({ ...e, position: tie ? previous.position : i + 1 });
  });
  return ranked;
}

/* ------------------------------------------------------------------------------------
 * Destaques: reconhecer mais alunos que só o pódio
 * ------------------------------------------------------------------------------------ */
export interface Highlights {
  podium: RankedEntry[];
  fastest: Submission[];
  bestValue: Submission[];
  cleanBuild: Submission[];
  mostBalanced: Submission[];
}

const allWith = <T>(list: T[], value: (x: T) => number, best: 'MIN' | 'MAX'): T[] => {
  if (list.length === 0) return [];
  const values = list.map(value);
  const target = best === 'MIN' ? Math.min(...values) : Math.max(...values);
  return list.filter((_, i) => values[i] === target);
};

export function highlightsOf(ranked: RankedEntry[], mode: ActivityMode): Highlights {
  const completed = ranked.filter((r) => r.submission.completed).map((r) => r.submission);
  return {
    podium: ranked.filter((r) => r.position <= 3 && r.submission.completed),
    fastest: allWith(completed, (s) => s.timeSeconds, 'MIN'),
    bestValue: mode === 'ORCAMENTO' ? allWith(completed.filter((s) => s.spent > 0), (s) => s.score / s.spent, 'MAX') : [],
    cleanBuild: completed.filter((s) => s.penalties === 0),
    mostBalanced: allWith(completed, (s) => s.bottleneckPercent, 'MIN'),
  };
}

/* ------------------------------------------------------------------------------------
 * Quem vê o quê (8.4): o aluno nunca recebe a lista inteira
 * ------------------------------------------------------------------------------------ */
export interface StudentView {
  top: RankedEntry[];
  highlights: Highlights | null;
  own: RankedEntry | null;
  /** Total de participantes ranqueados (para "4º de 27") */
  participants: number;
}

export function visibleToStudent(
  ranked: RankedEntry[],
  participantId: string,
  visibility: RankingVisibility,
  activityClosed: boolean,
  mode: ActivityMode
): StudentView {
  const own = ranked.find((r) => r.submission.participantId === participantId) ?? null;
  const showTop = visibility === 'AO_VIVO' || (visibility === 'AO_ENCERRAR' && activityClosed);
  const showOwnPosition = showTop || (visibility === 'SO_PROFESSOR' && activityClosed);
  return {
    top: showTop ? ranked.slice(0, 10) : [],
    highlights: showTop && activityClosed ? highlightsOf(ranked, mode) : null,
    own: own ? (showOwnPosition ? own : { ...own, position: 0 }) : null,
    participants: showOwnPosition ? ranked.length : 0,
  };
}
