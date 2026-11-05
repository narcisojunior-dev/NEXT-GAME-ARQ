import 'server-only';
import type {
  Activity,
  ActivityConfig,
  ActivityKind,
  ActivityStatus,
  Classroom,
  LiveState,
  OfficialScore,
  Participant,
  Submission,
  SubmissionBuild,
  SubmissionMetrics,
  SubmissionStatus,
  Teacher,
  TeacherWithSecrets,
} from '../engine/classroom/types';

/**
 * Acesso aos dados do Modo Professor (#71). A API só conhece esta interface: em produção ela fala
 * com o Postgres do Neon; nos testes e no E2E, com a memória. Um SQLite para a rede da escola pode
 * entrar depois sem tocar nas rotas.
 */
export interface NewTeacher {
  username: string;
  displayName: string;
  passwordHash: string;
  recoveryHash: string;
}

export interface NewActivity {
  kind: ActivityKind;
  title: string;
  config: ActivityConfig;
  catalogRev: string;
}

export interface NewSubmission {
  activityId: string;
  participantId: string;
  build: SubmissionBuild;
  metrics: SubmissionMetrics;
  completed: boolean;
  scoreTotal: number;
  breakdown: OfficialScore;
  totalSpent: number;
  status: SubmissionStatus;
  flags: string[];
}

export interface ClassroomState {
  classroom: Classroom;
  activity: Activity | null;
}

export interface SubmissionRow extends Submission {
  displayName: string;
}

export interface ClassroomPatch {
  name?: string;
  joinsOpen?: boolean;
  archived?: boolean;
}

/** Erro de regra do banco (código e mensagem prontos para a API) */
export class RepositoryError extends Error {
  readonly name = 'RepositoryError';
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

/**
 * Pelo nome e não por instanceof: no servidor de desenvolvimento cada rota pode ter a própria
 * cópia deste módulo, e o repositório compartilhado lança a classe de outra cópia.
 */
export function isRepositoryError(error: unknown, code?: string): error is RepositoryError {
  const e = error as { name?: unknown; code?: unknown } | null;
  return typeof e === 'object' && e !== null && e.name === 'RepositoryError' && typeof e.code === 'string' && (code === undefined || e.code === code);
}

export interface ClassroomRepository {
  createTeacher(input: NewTeacher): Promise<Teacher>;
  findTeacherByUsername(username: string): Promise<TeacherWithSecrets | null>;
  getTeacher(id: string): Promise<Teacher | null>;
  updateTeacherSecrets(id: string, passwordHash: string, recoveryHash: string): Promise<void>;

  /** Grava a turma com o código; `CODIGO_EM_USO` se o código já existir (quem chama sorteia outro) */
  createClassroom(teacherId: string, name: string, code: string): Promise<Classroom>;
  listClassrooms(teacherId: string): Promise<Classroom[]>;
  getClassroom(id: string): Promise<Classroom | null>;
  getClassroomByCode(code: string): Promise<Classroom | null>;
  updateClassroom(id: string, patch: ClassroomPatch): Promise<Classroom>;
  deleteClassroom(id: string): Promise<void>;

  createActivity(classroomId: string, input: NewActivity): Promise<Activity>;
  listActivities(classroomId: string): Promise<Activity[]>;
  getActivity(id: string): Promise<Activity | null>;
  /** Ativar encerra a atividade ativa anterior da turma (no máximo uma ativa) */
  setActivityStatus(id: string, status: ActivityStatus): Promise<Activity>;
  updateActivityConfig(id: string, config: ActivityConfig): Promise<Activity>;
  /** Turma pelo código com a atividade ativa (a rota tira o que o aluno não pode ver) */
  getPublicState(code: string): Promise<ClassroomState | null>;

  /** `APELIDO_EM_USO` se o apelido já existir na turma */
  addParticipant(classroomId: string, displayName: string, tokenHash: string): Promise<Participant>;
  findParticipantByToken(tokenHash: string): Promise<Participant | null>;
  getParticipant(id: string): Promise<Participant | null>;
  listParticipants(classroomId: string): Promise<Participant[]>;
  updateLiveState(participantId: string, live: LiveState): Promise<void>;
  removeParticipant(participantId: string): Promise<void>;

  /** Numera a tentativa (1, 2, 3…) dentro da atividade */
  saveSubmission(input: NewSubmission): Promise<Submission>;
  listSubmissions(activityId: string): Promise<SubmissionRow[]>;
  getSubmission(id: string): Promise<Submission | null>;
  setSubmissionStatus(id: string, status: SubmissionStatus): Promise<Submission>;

  /** Janela fixa: true enquanto o limite não estourou */
  hitRateLimit(key: string, windowSeconds: number, max: number): Promise<boolean>;
  /** Rotina de retenção (LGPD): apaga turmas arquivadas antes da data e limpa limites velhos */
  purgeArchivedBefore(date: Date): Promise<number>;
  purgeRateLimitsBefore(date: Date): Promise<void>;
}
