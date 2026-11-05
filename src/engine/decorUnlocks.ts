/**
 * Desbloqueios da decoração do quarto (#85): a decoração é recompensa por conquistas
 * pedagógicas. Puro: avaliado sobre o progresso salvo do aluno (PlayerProgress).
 */
import { PlayerProgress } from './progress';
import { CampaignTrackId } from './campaign';
import { CAMPAIGN_MISSIONS, CAMPAIGN_TRACKS, missionsOfTrack } from './campaignMissions';

export type UnlockRule =
  | { kind: 'DESK_RUNNING' }
  | { kind: 'MISSIONS_COMPLETED'; count: number }
  | { kind: 'THREE_STARS'; count: number }
  | { kind: 'TRACK_COMPLETED'; track: CampaignTrackId }
  | { kind: 'DIAGNOSTICS_RESOLVED'; count: number }
  | { kind: 'CORRECT_ANSWERS'; count: number }
  | { kind: 'POST_FIRST_TRY'; count: number }
  | { kind: 'BUDGET_CHALLENGE_DONE' }
  | { kind: 'CAMPAIGN_COMPLETED' }
  | { kind: 'ALL'; rules: UnlockRule[] };

/** Parte do progresso que os desbloqueios leem */
export type UnlockProgress = Pick<
  PlayerProgress,
  'missionResults' | 'teacherUnlockAll' | 'deskRunningAt' | 'postFirstTryCount' | 'diagnosticsResolved'
>;

/** Missão que encerra a campanha (Prova Final, #57) */
export const FINAL_MISSION_ID = 'jornada-13';

const CAMPAIGN_IDS = new Set(CAMPAIGN_MISSIONS.map((m) => m.id));

/** Só missões da campanha contam: o Desafio de Orçamento é registrado à parte */
const campaignResults = (p: UnlockProgress) => Object.entries(p.missionResults).filter(([id]) => CAMPAIGN_IDS.has(id));

/** Casos resolvidos no modo livre e na trilha de diagnóstico da campanha, sem contar duas vezes */
function diagnosticsResolved(p: UnlockProgress): number {
  const ids = new Set(p.diagnosticsResolved);
  missionsOfTrack('DIAGNOSTICO').forEach((m) => {
    const scenarioId = m.setup.diagnosticScenarioId;
    if (scenarioId && p.missionResults[m.id]) ids.add(scenarioId);
  });
  return ids.size;
}

const isBudgetMissionId = (id: string) => id.startsWith('orcamento-');

/** Quanto falta para cada regra; regras sem contagem valem 0 ou 1 */
export function unlockProgress(rule: UnlockRule, p: UnlockProgress): { current: number; target: number } {
  switch (rule.kind) {
    case 'DESK_RUNNING':
      return { current: p.deskRunningAt ? 1 : 0, target: 1 };
    case 'MISSIONS_COMPLETED':
      return { current: campaignResults(p).length, target: rule.count };
    case 'THREE_STARS':
      return { current: campaignResults(p).filter(([, r]) => r.stars === 3).length, target: rule.count };
    case 'TRACK_COMPLETED': {
      const missions = missionsOfTrack(rule.track);
      return { current: missions.filter((m) => p.missionResults[m.id]).length, target: missions.length };
    }
    case 'DIAGNOSTICS_RESOLVED':
      return { current: diagnosticsResolved(p), target: rule.count };
    case 'CORRECT_ANSWERS':
      return { current: Object.values(p.missionResults).filter((r) => r.answerCorrect === true).length, target: rule.count };
    case 'POST_FIRST_TRY':
      return { current: p.postFirstTryCount, target: rule.count };
    case 'BUDGET_CHALLENGE_DONE':
      return { current: Object.keys(p.missionResults).some(isBudgetMissionId) ? 1 : 0, target: 1 };
    case 'CAMPAIGN_COMPLETED':
      return { current: p.missionResults[FINAL_MISSION_ID] ? 1 : 0, target: 1 };
    case 'ALL': {
      const parts = rule.rules.map((r) => unlockProgress(r, p));
      return { current: parts.filter((x) => x.current >= x.target).length, target: parts.length };
    }
  }
}

export function isUnlocked(rule: UnlockRule, p: UnlockProgress): boolean {
  if (p.teacherUnlockAll) return true;
  const { current, target } = unlockProgress(rule, p);
  return current >= target;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const trackTitle = (track: CampaignTrackId) => CAMPAIGN_TRACKS.find((t) => t.id === track)?.title ?? track;

/** Conquista exigida, em português, para o card bloqueado da gaveta */
export function describeUnlock(rule: UnlockRule): string {
  switch (rule.kind) {
    case 'DESK_RUNNING':
      return 'Ligue o PC na mesa e abra o AcademyOS';
    case 'MISSIONS_COMPLETED':
      return `Conclua ${plural(rule.count, 'missão', 'missões')} da campanha`;
    case 'THREE_STARS':
      return `Ganhe 3 estrelas em ${plural(rule.count, 'missão', 'missões')}`;
    case 'TRACK_COMPLETED':
      return `Conclua a trilha "${trackTitle(rule.track)}"`;
    case 'DIAGNOSTICS_RESOLVED':
      return `Resolva ${plural(rule.count, 'caso', 'casos')} no modo diagnóstico`;
    case 'CORRECT_ANSWERS':
      return `Acerte ${plural(rule.count, 'pergunta', 'perguntas')} de fixação das missões`;
    case 'POST_FIRST_TRY':
      return `Passe no POST de primeira ${plural(rule.count, 'vez', 'vezes')}`;
    case 'BUDGET_CHALLENGE_DONE':
      return 'Conclua um Desafio de Orçamento';
    case 'CAMPAIGN_COMPLETED':
      return 'Conclua a campanha (Prova Final)';
    case 'ALL':
      return rule.rules.map(describeUnlock).join(' e ');
  }
}

/** Vitrine: um troféu por missão da campanha com 3 estrelas, na ordem da campanha */
export function showcaseTrophies(p: Pick<PlayerProgress, 'missionResults'>): { missionId: string; title: string }[] {
  return CAMPAIGN_MISSIONS.filter((m) => p.missionResults[m.id]?.stars === 3).map((m) => ({ missionId: m.id, title: m.title }));
}
