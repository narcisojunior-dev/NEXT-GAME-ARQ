/**
 * Tipos do Modo Professor (#71–#81): turma, atividade, participante e envio.
 * Puros e compartilhados entre o jogo, o painel do professor e a API.
 */
import type { BudgetBuildSummary, BudgetChallengeConfig } from '../budgetChallenge';
import type { AttemptPolicy, RankingVisibility } from '../ranking';

export type ActivityStatus = 'RASCUNHO' | 'ATIVA' | 'ENCERRADA';
export type SubmissionStatus = 'VALIDO' | 'SINALIZADO' | 'INVALIDO';
export type ActivityKind = 'MISSAO_CAMPANHA' | 'DESAFIO_EQUIPE' | 'DIAGNOSTICO' | 'ORCAMENTO' | 'OFICINA_LIVRE';

/** Desafio de Orçamento de uma turma: a referência é calculada pelo servidor e congelada */
export interface ClassroomBudgetConfig extends BudgetChallengeConfig {
  reference: BudgetBuildSummary;
  cheapestCost: number;
  ceilingCost: number;
}

export type ActivityKindConfig =
  | { kind: 'MISSAO_CAMPANHA'; missionId: string }
  | { kind: 'DESAFIO_EQUIPE'; missionId: string }
  | { kind: 'DIAGNOSTICO'; scenarioId: string | 'SORTEADO' }
  | { kind: 'ORCAMENTO'; budget: ClassroomBudgetConfig }
  | { kind: 'OFICINA_LIVRE' };

export interface ActivityCommon {
  /** Texto curto do professor, mostrado no banner do aluno */
  instructions?: string;
  /** O envio fecha ao estourar (segundos desde o início da atividade) */
  timeLimitSeconds?: number;
  maxAttempts: number;
  attemptPolicy: AttemptPolicy;
  rankingVisibility: RankingVisibility;
  /** Modo Orçamento: a build de referência só aparece para os alunos depois de revelada ou encerrada */
  referenceRevealed?: boolean;
}

export type ActivityConfig = ActivityKindConfig & ActivityCommon;

/** Configuração vista pelo aluno: a referência do Modo Orçamento fica nula até o professor revelar */
export type PublicBudgetConfig = Omit<ClassroomBudgetConfig, 'reference'> & { reference: BudgetBuildSummary | null };
export type PublicActivityConfig =
  | (Exclude<ActivityKindConfig, { kind: 'ORCAMENTO' }> & ActivityCommon)
  | ({ kind: 'ORCAMENTO'; budget: PublicBudgetConfig } & ActivityCommon);

export interface Teacher {
  id: string;
  username: string;
  displayName: string;
  createdAt: string;
}

export interface TeacherWithSecrets extends Teacher {
  passwordHash: string;
  recoveryHash: string;
}

export interface Classroom {
  id: string;
  teacherId: string;
  name: string;
  code: string;
  joinsOpen: boolean;
  archivedAt: string | null;
  createdAt: string;
}

export interface Activity {
  id: string;
  classroomId: string;
  kind: ActivityKind;
  title: string;
  config: ActivityConfig;
  status: ActivityStatus;
  catalogRev: string;
  startedAt: string | null;
  closedAt: string | null;
  createdAt: string;
}

/** O que o aluno conta ao servidor quando muda de fase */
export interface LiveState {
  activityId: string;
  phase: number;
  percent: number;
  spent: number;
  penalties: number;
  updatedAt: string;
}

export interface Participant {
  id: string;
  classroomId: string;
  displayName: string;
  live: LiveState | null;
  removedAt: string | null;
  joinedAt: string;
}

export interface Submission {
  id: string;
  activityId: string;
  participantId: string;
  attemptNo: number;
  build: SubmissionBuild;
  metrics: SubmissionMetrics;
  completed: boolean;
  scoreTotal: number;
  breakdown: OfficialScore;
  totalSpent: number;
  status: SubmissionStatus;
  flags: string[];
  createdAt: string;
}

/** Atividade vista pelo aluno: nada de dados de outros alunos nem a referência antes da hora */
export interface PublicActivity {
  id: string;
  kind: ActivityKind;
  title: string;
  config: PublicActivityConfig;
  startedAt: string | null;
  /** Fim do envio quando há tempo limite */
  endsAt: string | null;
}

export interface PublicClassroomState {
  code: string;
  name: string;
  joinsOpen: boolean;
  activity: PublicActivity | null;
}

/* ------------------------------------------------------------------------------------
 * Envio: só ids do catálogo, as etapas da montagem e as métricas da sessão
 * ------------------------------------------------------------------------------------ */
export const BUILD_STEP_KEYS = [
  'esdDischarged',
  'socketLeverLocked',
  'thermalPasteApplied',
  'coolerFanConnected',
  'cableSataConnected',
  'ioShieldInstalled',
  'standoffsInstalled',
  'motherboardScrewed',
  'gpuScrewed',
  'cableAtx24PinConnected',
  'cableCpu8PinConnected',
  'cableGpuPcieConnected',
  'frontPanelPowerSwConnected',
  'frontPanelResetSwConnected',
  'frontPanelLedsConnected',
  'caseFansConnected',
  'frontUsbConnected',
  'frontAudioConnected',
  'psuSwitchOn',
] as const;
export type BuildStepKey = (typeof BUILD_STEP_KEYS)[number];

export interface SubmissionBuild {
  motherboardId: string | null;
  cpuId: string | null;
  coolerId: string | null;
  ramSlot2Id: string | null;
  ramSlot4Id: string | null;
  storageId: string | null;
  caseId: string | null;
  psuId: string | null;
  gpuId: string | null;
  steps: Record<BuildStepKey, boolean>;
  /** Diagnóstico sorteado: o caso que o aluno recebeu */
  scenarioId?: string;
}

export interface SubmissionMetrics {
  elapsedSeconds: number;
  penaltiesCount: number;
  errorLog: string[];
  postAttempts: number;
}

/** Pontuação oficial gravada com o envio */
export interface OfficialScore {
  total: number;
  completed: boolean;
  parts: { key: string; label: string; points: number; max: number; explanation: string }[];
  totalSpent: number;
  benchmark: { score: number; avgFps: number; bottleneckPercent: number };
  stars: 0 | 1 | 2 | 3;
}

/** Erro padronizado da API, com mensagem em português que o jogo mostra direto */
export interface ApiErrorBody {
  error: { code: string; message: string };
}
