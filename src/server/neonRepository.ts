import 'server-only';
import { neon, NeonQueryFunction } from '@neondatabase/serverless';
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
import { ClassroomPatch, ClassroomRepository, ClassroomState, NewActivity, NewSubmission, NewTeacher, RepositoryError, SubmissionRow, isRepositoryError } from './repository';

/**
 * Repositório Postgres no Neon (#71), pelo driver HTTP `@neondatabase/serverless` e SQL puro,
 * sem ORM: cada chamada é uma requisição curta, adequada às funções serverless da Vercel.
 */
type Row = Record<string, unknown>;

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));
const isoOrNull = (v: unknown): string | null => (v === null || v === undefined ? null : iso(v));

const toTeacher = (r: Row): Teacher => ({ id: String(r.id), username: String(r.username), displayName: String(r.display_name), createdAt: iso(r.created_at) });
const toTeacherWithSecrets = (r: Row): TeacherWithSecrets => ({ ...toTeacher(r), passwordHash: String(r.password_hash), recoveryHash: String(r.recovery_hash) });

const toClassroom = (r: Row): Classroom => ({
  id: String(r.id),
  teacherId: String(r.teacher_id),
  name: String(r.name),
  code: String(r.code).trim(),
  joinsOpen: Boolean(r.joins_open),
  archivedAt: isoOrNull(r.archived_at),
  createdAt: iso(r.created_at),
});

const toActivity = (r: Row): Activity => ({
  id: String(r.id),
  classroomId: String(r.classroom_id),
  kind: r.kind as ActivityKind,
  title: String(r.title),
  config: r.config as ActivityConfig,
  status: r.status as ActivityStatus,
  catalogRev: String(r.catalog_rev),
  startedAt: isoOrNull(r.started_at),
  closedAt: isoOrNull(r.closed_at),
  createdAt: iso(r.created_at),
});

const toParticipant = (r: Row): Participant => ({
  id: String(r.id),
  classroomId: String(r.classroom_id),
  displayName: String(r.display_name),
  live: (r.live as LiveState | null) ?? null,
  removedAt: isoOrNull(r.removed_at),
  joinedAt: iso(r.joined_at),
});

const toSubmission = (r: Row): Submission => ({
  id: String(r.id),
  activityId: String(r.activity_id),
  participantId: String(r.participant_id),
  attemptNo: Number(r.attempt_no),
  build: r.build as SubmissionBuild,
  metrics: r.metrics as SubmissionMetrics,
  completed: Boolean(r.completed),
  scoreTotal: Number(r.score_total),
  breakdown: r.breakdown as OfficialScore,
  totalSpent: Number(r.total_spent),
  status: r.status as SubmissionStatus,
  flags: Array.isArray(r.flags) ? r.flags.map(String) : [],
  createdAt: iso(r.created_at),
});

/** Violação de unicidade do Postgres → erro de regra com mensagem em português */
function translate(error: unknown): never {
  const e = error as { code?: string; constraint?: string; message?: string };
  if (e.code === '23505') {
    const c = e.constraint ?? e.message ?? '';
    if (c.includes('teachers_username')) throw new RepositoryError('USUARIO_EM_USO', 'Esse usuário já existe.');
    if (c.includes('classrooms_code')) throw new RepositoryError('CODIGO_EM_USO', 'Código já usado.');
    if (c.includes('participants')) throw new RepositoryError('APELIDO_EM_USO', 'Esse apelido já está na turma. Acrescente o número da bancada.');
    if (c.includes('submissions')) throw new RepositoryError('ENVIO_SIMULTANEO', 'Dois envios ao mesmo tempo: tente de novo.');
  }
  throw error;
}

export class NeonRepository implements ClassroomRepository {
  private readonly sql: NeonQueryFunction<false, false>;

  constructor(url: string) {
    this.sql = neon(url);
  }

  private async rows(text: string, params: unknown[] = []): Promise<Row[]> {
    try {
      return (await this.sql.query(text, params)) as Row[];
    } catch (error) {
      translate(error);
    }
  }

  private async one(text: string, params: unknown[] = []): Promise<Row | null> {
    return (await this.rows(text, params))[0] ?? null;
  }

  async createTeacher(input: NewTeacher) {
    const r = await this.one(
      'INSERT INTO teachers (username, display_name, password_hash, recovery_hash) VALUES ($1, $2, $3, $4) RETURNING *',
      [input.username, input.displayName, input.passwordHash, input.recoveryHash]
    );
    return toTeacher(r!);
  }

  async findTeacherByUsername(username: string) {
    const r = await this.one('SELECT * FROM teachers WHERE username = $1', [username]);
    return r ? toTeacherWithSecrets(r) : null;
  }

  async getTeacher(id: string) {
    const r = await this.one('SELECT * FROM teachers WHERE id = $1', [id]);
    return r ? toTeacher(r) : null;
  }

  async updateTeacherSecrets(id: string, passwordHash: string, recoveryHash: string) {
    await this.rows('UPDATE teachers SET password_hash = $2, recovery_hash = $3 WHERE id = $1', [id, passwordHash, recoveryHash]);
  }

  async createClassroom(teacherId: string, name: string, code: string) {
    const r = await this.one('INSERT INTO classrooms (teacher_id, name, code) VALUES ($1, $2, $3) RETURNING *', [teacherId, name, code]);
    return toClassroom(r!);
  }

  async listClassrooms(teacherId: string) {
    return (await this.rows('SELECT * FROM classrooms WHERE teacher_id = $1 ORDER BY created_at DESC', [teacherId])).map(toClassroom);
  }

  async getClassroom(id: string) {
    const r = await this.one('SELECT * FROM classrooms WHERE id = $1', [id]);
    return r ? toClassroom(r) : null;
  }

  async getClassroomByCode(code: string) {
    const r = await this.one('SELECT * FROM classrooms WHERE code = $1', [code]);
    return r ? toClassroom(r) : null;
  }

  async updateClassroom(id: string, patch: ClassroomPatch) {
    const r = await this.one(
      `UPDATE classrooms SET
         name = COALESCE($2, name),
         joins_open = COALESCE($3, joins_open),
         archived_at = CASE WHEN $4::boolean IS NULL THEN archived_at WHEN $4 THEN COALESCE(archived_at, now()) ELSE NULL END
       WHERE id = $1 RETURNING *`,
      [id, patch.name ?? null, patch.joinsOpen ?? null, patch.archived ?? null]
    );
    if (!r) throw new RepositoryError('TURMA_NAO_ENCONTRADA', 'Turma não encontrada.');
    return toClassroom(r);
  }

  async deleteClassroom(id: string) {
    await this.rows('DELETE FROM classrooms WHERE id = $1', [id]);
  }

  async createActivity(classroomId: string, input: NewActivity) {
    const r = await this.one('INSERT INTO activities (classroom_id, kind, title, config, catalog_rev) VALUES ($1, $2, $3, $4, $5) RETURNING *', [
      classroomId,
      input.kind,
      input.title,
      JSON.stringify(input.config),
      input.catalogRev,
    ]);
    return toActivity(r!);
  }

  async listActivities(classroomId: string) {
    return (await this.rows('SELECT * FROM activities WHERE classroom_id = $1 ORDER BY created_at', [classroomId])).map(toActivity);
  }

  async getActivity(id: string) {
    const r = await this.one('SELECT * FROM activities WHERE id = $1', [id]);
    return r ? toActivity(r) : null;
  }

  async setActivityStatus(id: string, status: ActivityStatus) {
    try {
      const results = await this.sql.transaction([
        // Ativar encerra a ativa anterior da mesma turma (o índice parcial garante uma só)
        this.sql.query(
          `UPDATE activities SET status = 'ENCERRADA', closed_at = now()
           WHERE $2 = 'ATIVA' AND status = 'ATIVA' AND id <> $1 AND classroom_id = (SELECT classroom_id FROM activities WHERE id = $1)`,
          [id, status]
        ),
        this.sql.query(
          `UPDATE activities SET status = $2::activity_status,
             started_at = CASE WHEN $2 = 'ATIVA' THEN now() ELSE started_at END,
             closed_at = CASE WHEN $2 = 'ENCERRADA' THEN now() WHEN $2 = 'ATIVA' THEN NULL ELSE closed_at END
           WHERE id = $1 RETURNING *`,
          [id, status]
        ),
      ]);
      const r = (results[1] as Row[])[0];
      if (!r) throw new RepositoryError('ATIVIDADE_NAO_ENCONTRADA', 'Atividade não encontrada.');
      return toActivity(r);
    } catch (error) {
      if (isRepositoryError(error)) throw error;
      translate(error);
    }
  }

  async updateActivityConfig(id: string, config: ActivityConfig) {
    const r = await this.one('UPDATE activities SET config = $2 WHERE id = $1 RETURNING *', [id, JSON.stringify(config)]);
    if (!r) throw new RepositoryError('ATIVIDADE_NAO_ENCONTRADA', 'Atividade não encontrada.');
    return toActivity(r);
  }

  async getPublicState(code: string): Promise<ClassroomState | null> {
    const c = await this.one('SELECT * FROM classrooms WHERE code = $1 AND archived_at IS NULL', [code]);
    if (!c) return null;
    const a = await this.one(`SELECT * FROM activities WHERE classroom_id = $1 AND status = 'ATIVA'`, [c.id]);
    return { classroom: toClassroom(c), activity: a ? toActivity(a) : null };
  }

  async addParticipant(classroomId: string, displayName: string, tokenHash: string) {
    const r = await this.one('INSERT INTO participants (classroom_id, display_name, token_hash) VALUES ($1, $2, $3) RETURNING *', [classroomId, displayName, tokenHash]);
    return toParticipant(r!);
  }

  async findParticipantByToken(tokenHash: string) {
    const r = await this.one('SELECT * FROM participants WHERE token_hash = $1', [tokenHash]);
    return r ? toParticipant(r) : null;
  }

  async getParticipant(id: string) {
    const r = await this.one('SELECT * FROM participants WHERE id = $1', [id]);
    return r ? toParticipant(r) : null;
  }

  async listParticipants(classroomId: string) {
    return (await this.rows('SELECT * FROM participants WHERE classroom_id = $1 ORDER BY joined_at', [classroomId])).map(toParticipant);
  }

  async updateLiveState(participantId: string, live: LiveState) {
    await this.rows('UPDATE participants SET live = $2 WHERE id = $1', [participantId, JSON.stringify(live)]);
  }

  async removeParticipant(participantId: string) {
    await this.rows('DELETE FROM participants WHERE id = $1', [participantId]);
  }

  async saveSubmission(input: NewSubmission) {
    const r = await this.one(
      `INSERT INTO submissions (activity_id, participant_id, attempt_no, build, metrics, completed, score_total, breakdown, total_spent, status, flags)
       VALUES ($1, $2, (SELECT COALESCE(MAX(attempt_no), 0) + 1 FROM submissions WHERE activity_id = $1 AND participant_id = $2),
               $3, $4, $5, $6, $7, $8, $9::submission_status, $10)
       RETURNING *`,
      [
        input.activityId,
        input.participantId,
        JSON.stringify(input.build),
        JSON.stringify(input.metrics),
        input.completed,
        input.scoreTotal,
        JSON.stringify(input.breakdown),
        input.totalSpent,
        input.status,
        input.flags,
      ]
    );
    return toSubmission(r!);
  }

  async listSubmissions(activityId: string): Promise<SubmissionRow[]> {
    const rows = await this.rows(
      `SELECT s.*, p.display_name FROM submissions s JOIN participants p ON p.id = s.participant_id WHERE s.activity_id = $1 ORDER BY s.created_at`,
      [activityId]
    );
    return rows.map((r) => ({ ...toSubmission(r), displayName: String(r.display_name) }));
  }

  async getSubmission(id: string) {
    const r = await this.one('SELECT * FROM submissions WHERE id = $1', [id]);
    return r ? toSubmission(r) : null;
  }

  async setSubmissionStatus(id: string, status: SubmissionStatus) {
    const r = await this.one('UPDATE submissions SET status = $2::submission_status WHERE id = $1 RETURNING *', [id, status]);
    if (!r) throw new RepositoryError('ENVIO_NAO_ENCONTRADO', 'Envio não encontrado.');
    return toSubmission(r);
  }

  async hitRateLimit(key: string, windowSeconds: number, max: number) {
    const r = await this.one(
      `INSERT INTO rate_limits (key, window_start, count) VALUES ($1, now(), 1)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2::double precision) THEN 1 ELSE rate_limits.count + 1 END,
         window_start = CASE WHEN rate_limits.window_start < now() - make_interval(secs => $2::double precision) THEN now() ELSE rate_limits.window_start END
       RETURNING count`,
      [key, windowSeconds]
    );
    return Number(r?.count ?? 1) <= max;
  }

  async purgeArchivedBefore(date: Date) {
    const rows = await this.rows('DELETE FROM classrooms WHERE archived_at IS NOT NULL AND archived_at < $1 RETURNING id', [date.toISOString()]);
    return rows.length;
  }

  async purgeRateLimitsBefore(date: Date) {
    await this.rows('DELETE FROM rate_limits WHERE window_start < $1', [date.toISOString()]);
  }
}
