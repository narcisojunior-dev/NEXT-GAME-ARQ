import 'server-only';
import type { Activity, ActivityConfig, PublicActivity, PublicActivityConfig } from '../engine/classroom/types';
import { ActivityMode, RankedEntry, Submission as RankableSubmission, highlightsOf, rankActivity } from '../engine/ranking';
import { ERROR_TYPES, addToTally, buildClassReport, toCsv } from '../engine/classReport';
import { FLAG_LABELS } from '../engine/classroom/submission';
import type { SubmissionRow } from './repository';

/**
 * Ranking, destaques, relatório e CSV de uma atividade (#77, #79), a partir dos envios gravados.
 * Usa o motor puro de ranking (#69) e o relatório de erros da turma (#34).
 */
export const modeOf = (activity: Pick<Activity, 'kind'>): ActivityMode => (activity.kind === 'ORCAMENTO' ? 'ORCAMENTO' : 'MISSAO');

export function toRankable(rows: SubmissionRow[]): RankableSubmission[] {
  return rows
    .filter((r) => r.status !== 'INVALIDO')
    .map((r) => ({
      participantId: r.participantId,
      nickname: r.displayName,
      status: r.status === 'SINALIZADO' ? 'SINALIZADO' : 'VALIDO',
      bottleneckPercent: r.breakdown.benchmark.bottleneckPercent,
      completed: r.completed,
      score: r.scoreTotal,
      spent: r.totalSpent,
      penalties: r.metrics.penaltiesCount,
      timeSeconds: r.metrics.elapsedSeconds,
      submittedAt: r.createdAt,
    }));
}

export function rankingOf(activity: Activity, rows: SubmissionRow[], includeFlagged: boolean): RankedEntry[] {
  return rankActivity(toRankable(rows), { mode: modeOf(activity), attemptPolicy: activity.config.attemptPolicy, includeFlagged });
}

/** Aberta para envios: ativa e dentro do tempo limite (quando houver) */
export function endsAt(activity: Activity): string | null {
  const limit = activity.config.timeLimitSeconds;
  if (!limit || !activity.startedAt) return null;
  return new Date(new Date(activity.startedAt).getTime() + limit * 1000).toISOString();
}

export function isOpen(activity: Activity, now: Date): boolean {
  if (activity.status !== 'ATIVA') return false;
  const end = endsAt(activity);
  return !end || now.getTime() < new Date(end).getTime();
}

export const isClosed = (activity: Activity, now: Date) => activity.status === 'ENCERRADA' || (activity.status === 'ATIVA' && !isOpen(activity, now));

/** O aluno nunca recebe a build de referência antes de o professor revelar */
export function publicConfig(config: ActivityConfig): PublicActivityConfig {
  if (config.kind !== 'ORCAMENTO' || config.referenceRevealed) return config;
  return { ...config, budget: { ...config.budget, reference: null } };
}

export function publicActivity(activity: Activity): PublicActivity {
  return { id: activity.id, kind: activity.kind, title: activity.title, config: publicConfig(activity.config), startedAt: activity.startedAt, endsAt: endsAt(activity) };
}

export function entryView(e: RankedEntry) {
  return {
    position: e.position,
    participantId: e.submission.participantId,
    displayName: e.submission.nickname,
    score: e.submission.score,
    completed: e.submission.completed,
    spent: e.submission.spent,
    penalties: e.submission.penalties,
    timeSeconds: e.submission.timeSeconds,
    bottleneckPercent: e.submission.bottleneckPercent,
    attempts: e.attempts,
    flagged: e.submission.status === 'SINALIZADO',
  };
}

/** Relatório completo do professor */
export function activityReport(activity: Activity, rows: SubmissionRow[], now: Date) {
  const ranked = rankingOf(activity, rows, true);
  const closed = isClosed(activity, now);
  const chosenIds = new Set(ranked.map((r) => `${r.submission.participantId}|${r.submission.submittedAt}`));
  const chosenRows = rows.filter((r) => chosenIds.has(`${r.participantId}|${r.createdAt}`));
  const errors = buildClassReport(
    chosenRows.map((r) => ({ teamName: r.displayName, totalScore: r.scoreTotal, timeSpentSeconds: r.metrics.elapsedSeconds, code: r.id, tally: r.metrics.errorLog.reduce(addToTally, {}) }))
  );
  const scores = ranked.map((r) => r.submission.score);
  const buckets = [0, 2000, 4000, 6000, 8000].map((from) => ({ from, to: from + 2000, count: scores.filter((s) => s >= from && (from === 8000 ? s <= 10000 : s < from + 2000)).length }));
  return {
    activity: { id: activity.id, classroomId: activity.classroomId, title: activity.title, kind: activity.kind, status: activity.status, closed, endsAt: endsAt(activity), config: activity.config },
    ranking: ranked.map(entryView),
    highlights: closed ? highlightsView(ranked, activity) : null,
    distribution: buckets,
    commonErrors: errors.mostCommon.map((e) => ({ id: e.id, label: e.label, total: e.total, participants: e.teamsAffected, skill: e.skill.label })),
    flagged: rows
      .filter((r) => r.status === 'SINALIZADO')
      .map((r) => ({ submissionId: r.id, displayName: r.displayName, attemptNo: r.attemptNo, score: r.scoreTotal, reasons: r.flags.map((f) => FLAG_LABELS[f] ?? f) })),
    submissions: rows.length,
  };
}

export function highlightsView(ranked: RankedEntry[], activity: Activity) {
  const h = highlightsOf(ranked, modeOf(activity));
  const names = (list: { nickname: string }[]) => list.map((s) => s.nickname);
  return {
    podium: h.podium.map(entryView),
    fastest: names(h.fastest),
    bestValue: names(h.bestValue),
    cleanBuild: names(h.cleanBuild),
    mostBalanced: names(h.mostBalanced),
  };
}

const partsOf = (row: SubmissionRow | undefined) =>
  row ? [row.build.cpuId, row.build.motherboardId, row.build.ramSlot2Id, row.build.gpuId, row.build.storageId, row.build.psuId, row.build.caseId].filter(Boolean).join(' + ') : '';

/** Planilha da atividade (seção 8.5): apelido; posição; pontuação; concluído; gasto; tempo; penalidades; tentativas; status; peças */
export function resultsCsv(activity: Activity, rows: SubmissionRow[]): string {
  const ranked = rankingOf(activity, rows, true);
  const header = ['Apelido', 'Posição', 'Pontuação', 'Concluído', 'Gasto (R$)', 'Tempo (s)', 'Penalidades', 'Tentativas', 'Status', 'Peças', ...ERROR_TYPES.map((t) => t.label)];
  const lines = ranked.map((r) => {
    const row = rows.find((x) => x.participantId === r.submission.participantId && x.createdAt === r.submission.submittedAt);
    const tally = row ? row.metrics.errorLog.reduce(addToTally, {}) : {};
    return [
      r.submission.nickname,
      r.position,
      r.submission.score,
      r.submission.completed ? 'sim' : 'não',
      r.submission.spent,
      r.submission.timeSeconds,
      r.submission.penalties,
      r.attempts,
      r.submission.status === 'SINALIZADO' ? 'sinalizado' : 'válido',
      partsOf(row),
      ...ERROR_TYPES.map((t) => tally[t.id] ?? 0),
    ];
  });
  return toCsv([header, ...lines]);
}
