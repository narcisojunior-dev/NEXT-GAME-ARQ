import 'server-only';
import { randomUUID } from 'node:crypto';
import type { Activity, ActivityStatus, Classroom, Participant, Submission, Teacher, TeacherWithSecrets } from '../engine/classroom/types';
import { ClassroomPatch, ClassroomRepository, ClassroomState, NewActivity, NewSubmission, NewTeacher, RepositoryError, SubmissionRow } from './repository';

/**
 * Repositório em memória (#71): testes, E2E e desenvolvimento sem banco. Mesmas regras do
 * Postgres (unicidade, uma atividade ativa por turma, cascata), conferidas pela mesma suíte.
 */
export class MemoryRepository implements ClassroomRepository {
  private teachers = new Map<string, TeacherWithSecrets>();
  private classrooms = new Map<string, Classroom>();
  private activities = new Map<string, Activity>();
  private participants = new Map<string, Participant & { tokenHash: string }>();
  private submissions = new Map<string, Submission>();
  private limits = new Map<string, { windowStart: number; count: number }>();

  constructor(private readonly now: () => Date = () => new Date()) {}

  private iso() {
    return this.now().toISOString();
  }

  private static publicTeacher({ passwordHash: _p, recoveryHash: _r, ...t }: TeacherWithSecrets): Teacher {
    void _p;
    void _r;
    return t;
  }

  private static publicParticipant({ tokenHash: _t, ...p }: Participant & { tokenHash: string }): Participant {
    void _t;
    return p;
  }

  async createTeacher(input: NewTeacher): Promise<Teacher> {
    if ([...this.teachers.values()].some((t) => t.username === input.username)) throw new RepositoryError('USUARIO_EM_USO', 'Esse usuário já existe.');
    const teacher: TeacherWithSecrets = { id: randomUUID(), createdAt: this.iso(), ...input };
    this.teachers.set(teacher.id, teacher);
    return MemoryRepository.publicTeacher(teacher);
  }

  async findTeacherByUsername(username: string) {
    return [...this.teachers.values()].find((t) => t.username === username) ?? null;
  }

  async getTeacher(id: string) {
    const t = this.teachers.get(id);
    return t ? MemoryRepository.publicTeacher(t) : null;
  }

  async updateTeacherSecrets(id: string, passwordHash: string, recoveryHash: string) {
    const t = this.teachers.get(id);
    if (t) this.teachers.set(id, { ...t, passwordHash, recoveryHash });
  }

  async createClassroom(teacherId: string, name: string, code: string): Promise<Classroom> {
    if ([...this.classrooms.values()].some((c) => c.code === code)) throw new RepositoryError('CODIGO_EM_USO', 'Código já usado.');
    const classroom: Classroom = { id: randomUUID(), teacherId, name, code, joinsOpen: true, archivedAt: null, createdAt: this.iso() };
    this.classrooms.set(classroom.id, classroom);
    return classroom;
  }

  async listClassrooms(teacherId: string) {
    return [...this.classrooms.values()].filter((c) => c.teacherId === teacherId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getClassroom(id: string) {
    return this.classrooms.get(id) ?? null;
  }

  async getClassroomByCode(code: string) {
    return [...this.classrooms.values()].find((c) => c.code === code) ?? null;
  }

  async updateClassroom(id: string, patch: ClassroomPatch): Promise<Classroom> {
    const c = this.classrooms.get(id);
    if (!c) throw new RepositoryError('TURMA_NAO_ENCONTRADA', 'Turma não encontrada.');
    const next: Classroom = {
      ...c,
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.joinsOpen !== undefined ? { joinsOpen: patch.joinsOpen } : {}),
      ...(patch.archived !== undefined ? { archivedAt: patch.archived ? (c.archivedAt ?? this.iso()) : null } : {}),
    };
    this.classrooms.set(id, next);
    return next;
  }

  async deleteClassroom(id: string) {
    this.classrooms.delete(id);
    const activityIds = new Set([...this.activities.values()].filter((a) => a.classroomId === id).map((a) => a.id));
    activityIds.forEach((a) => this.activities.delete(a));
    const participantIds = new Set([...this.participants.values()].filter((p) => p.classroomId === id).map((p) => p.id));
    participantIds.forEach((p) => this.participants.delete(p));
    [...this.submissions.values()].forEach((s) => {
      if (activityIds.has(s.activityId) || participantIds.has(s.participantId)) this.submissions.delete(s.id);
    });
  }

  async createActivity(classroomId: string, input: NewActivity): Promise<Activity> {
    const activity: Activity = { id: randomUUID(), classroomId, ...input, status: 'RASCUNHO', startedAt: null, closedAt: null, createdAt: this.iso() };
    this.activities.set(activity.id, activity);
    return activity;
  }

  async listActivities(classroomId: string) {
    return [...this.activities.values()].filter((a) => a.classroomId === classroomId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getActivity(id: string) {
    return this.activities.get(id) ?? null;
  }

  async setActivityStatus(id: string, status: ActivityStatus): Promise<Activity> {
    const a = this.activities.get(id);
    if (!a) throw new RepositoryError('ATIVIDADE_NAO_ENCONTRADA', 'Atividade não encontrada.');
    const now = this.iso();
    if (status === 'ATIVA') {
      for (const other of this.activities.values()) {
        if (other.classroomId === a.classroomId && other.status === 'ATIVA' && other.id !== id) this.activities.set(other.id, { ...other, status: 'ENCERRADA', closedAt: now });
      }
    }
    const next: Activity = {
      ...a,
      status,
      startedAt: status === 'ATIVA' ? now : a.startedAt,
      closedAt: status === 'ENCERRADA' ? now : status === 'ATIVA' ? null : a.closedAt,
    };
    this.activities.set(id, next);
    return next;
  }

  async updateActivityConfig(id: string, config: Activity['config']) {
    const a = this.activities.get(id);
    if (!a) throw new RepositoryError('ATIVIDADE_NAO_ENCONTRADA', 'Atividade não encontrada.');
    const next = { ...a, config };
    this.activities.set(id, next);
    return next;
  }

  async getPublicState(code: string): Promise<ClassroomState | null> {
    const c = await this.getClassroomByCode(code);
    if (!c || c.archivedAt) return null;
    const active = [...this.activities.values()].find((a) => a.classroomId === c.id && a.status === 'ATIVA') ?? null;
    return { classroom: c, activity: active };
  }

  async addParticipant(classroomId: string, displayName: string, tokenHash: string): Promise<Participant> {
    const taken = [...this.participants.values()].some((p) => p.classroomId === classroomId && p.displayName.toLowerCase() === displayName.toLowerCase());
    if (taken) throw new RepositoryError('APELIDO_EM_USO', 'Esse apelido já está na turma. Acrescente o número da bancada.');
    const p = { id: randomUUID(), classroomId, displayName, tokenHash, live: null, removedAt: null, joinedAt: this.iso() };
    this.participants.set(p.id, p);
    return MemoryRepository.publicParticipant(p);
  }

  async findParticipantByToken(tokenHash: string) {
    const p = [...this.participants.values()].find((x) => x.tokenHash === tokenHash);
    return p ? MemoryRepository.publicParticipant(p) : null;
  }

  async getParticipant(id: string) {
    const p = this.participants.get(id);
    return p ? MemoryRepository.publicParticipant(p) : null;
  }

  async listParticipants(classroomId: string) {
    return [...this.participants.values()]
      .filter((p) => p.classroomId === classroomId)
      .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt))
      .map(MemoryRepository.publicParticipant);
  }

  async updateLiveState(participantId: string, live: Participant['live']) {
    const p = this.participants.get(participantId);
    if (p) this.participants.set(participantId, { ...p, live });
  }

  async removeParticipant(participantId: string) {
    this.participants.delete(participantId);
    [...this.submissions.values()].forEach((s) => s.participantId === participantId && this.submissions.delete(s.id));
  }

  async saveSubmission(input: NewSubmission): Promise<Submission> {
    const attemptNo = [...this.submissions.values()].filter((s) => s.activityId === input.activityId && s.participantId === input.participantId).length + 1;
    const s: Submission = { id: randomUUID(), attemptNo, createdAt: this.iso(), ...input };
    this.submissions.set(s.id, s);
    return s;
  }

  async listSubmissions(activityId: string): Promise<SubmissionRow[]> {
    return [...this.submissions.values()]
      .filter((s) => s.activityId === activityId)
      .map((s) => ({ ...s, displayName: this.participants.get(s.participantId)?.displayName ?? '?' }))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getSubmission(id: string) {
    return this.submissions.get(id) ?? null;
  }

  async setSubmissionStatus(id: string, status: Submission['status']) {
    const s = this.submissions.get(id);
    if (!s) throw new RepositoryError('ENVIO_NAO_ENCONTRADO', 'Envio não encontrado.');
    const next = { ...s, status };
    this.submissions.set(id, next);
    return next;
  }

  async hitRateLimit(key: string, windowSeconds: number, max: number) {
    const now = this.now().getTime();
    const cur = this.limits.get(key);
    const fresh = !cur || now - cur.windowStart >= windowSeconds * 1000;
    const next = fresh ? { windowStart: now, count: 1 } : { windowStart: cur.windowStart, count: cur.count + 1 };
    this.limits.set(key, next);
    return next.count <= max;
  }

  async purgeArchivedBefore(date: Date) {
    const old = [...this.classrooms.values()].filter((c) => c.archivedAt && c.archivedAt < date.toISOString());
    for (const c of old) await this.deleteClassroom(c.id);
    return old.length;
  }

  async purgeRateLimitsBefore(date: Date) {
    [...this.limits.entries()].forEach(([k, v]) => v.windowStart < date.getTime() && this.limits.delete(k));
  }
}
