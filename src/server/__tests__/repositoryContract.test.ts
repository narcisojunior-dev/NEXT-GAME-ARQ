import { describe, it, expect, afterAll } from 'vitest';
import { neon } from '@neondatabase/serverless';
import { randomInt } from 'node:crypto';
import { generateClassCode } from '../../engine/classroom/classCode';
import { ClassroomRepository, NewSubmission } from '../repository';
import { MemoryRepository } from '../memoryRepository';
import { NeonRepository } from '../neonRepository';
import type { ActivityConfig, OfficialScore } from '../../engine/classroom/types';
import { BUILD_STEP_KEYS } from '../../engine/classroom/types';

/**
 * Mesma suíte de contrato para os dois repositórios (#71): a memória roda sempre; o Neon roda
 * quando DATABASE_URL existe (ex.: `set -a; . ./.env.local; npx vitest run repositoryContract`).
 * Os dados do teste usam o prefixo "contrato-" e são apagados no fim.
 */
const RUN = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;
const config: ActivityConfig = { kind: 'OFICINA_LIVRE', maxAttempts: 3, attemptPolicy: 'MELHOR', rankingVisibility: 'AO_VIVO' };
const score: OfficialScore = { total: 5000, completed: true, parts: [], totalSpent: 3000, benchmark: { score: 100, avgFps: 90, bottleneckPercent: 5 }, stars: 2 };
const steps = Object.fromEntries(BUILD_STEP_KEYS.map((k) => [k, true])) as NewSubmission['build']['steps'];
const build: NewSubmission['build'] = { motherboardId: null, cpuId: null, coolerId: null, ramSlot2Id: null, ramSlot4Id: null, storageId: null, caseId: null, psuId: null, gpuId: null, steps };

function contract(name: string, make: () => ClassroomRepository) {
  describe(`ClassroomRepository: ${name}`, () => {
    const repo = make();
    let n = 0;
    const uniq = (p: string) => `${p}${RUN}${n++}`.slice(0, 32);
    const code = () => generateClassCode(randomInt);

    async function setup() {
      const teacher = await repo.createTeacher({ username: uniq('contrato-'), displayName: 'Prof. Teste', passwordHash: 'x$y', recoveryHash: 'x$z' });
      const classroom = await repo.createClassroom(teacher.id, 'Turma A', code());
      return { teacher, classroom };
    }

    it('professor: cria, acha pelo usuário (com segredos) e recusa usuário repetido', async () => {
      const username = uniq('contrato-');
      const t = await repo.createTeacher({ username, displayName: 'Ana', passwordHash: 'a$b', recoveryHash: 'c$d' });
      expect(t).toMatchObject({ username, displayName: 'Ana' });
      expect(t).not.toHaveProperty('passwordHash');
      expect(await repo.findTeacherByUsername(username)).toMatchObject({ id: t.id, passwordHash: 'a$b', recoveryHash: 'c$d' });
      await expect(repo.createTeacher({ username, displayName: 'Outra', passwordHash: 'x', recoveryHash: 'y' })).rejects.toMatchObject({ code: 'USUARIO_EM_USO' });
      await repo.updateTeacherSecrets(t.id, 'n$1', 'n$2');
      expect(await repo.findTeacherByUsername(username)).toMatchObject({ passwordHash: 'n$1', recoveryHash: 'n$2' });
    });

    it('turma: código único, lista do professor, renomear, fechar entradas e arquivar', async () => {
      const { teacher, classroom } = await setup();
      expect(classroom).toMatchObject({ teacherId: teacher.id, joinsOpen: true, archivedAt: null });
      await expect(repo.createClassroom(teacher.id, 'Outra', classroom.code)).rejects.toMatchObject({ code: 'CODIGO_EM_USO' });
      expect((await repo.listClassrooms(teacher.id)).map((c) => c.id)).toEqual([classroom.id]);
      expect(await repo.getClassroomByCode(classroom.code)).toMatchObject({ id: classroom.id });
      const updated = await repo.updateClassroom(classroom.id, { name: 'Turma B', joinsOpen: false, archived: true });
      expect(updated).toMatchObject({ name: 'Turma B', joinsOpen: false });
      expect(updated.archivedAt).not.toBeNull();
      expect(await repo.getPublicState(classroom.code)).toBeNull();
      expect((await repo.updateClassroom(classroom.id, { archived: false })).archivedAt).toBeNull();
    });

    it('atividade: no máximo uma ativa por turma; o estado público traz a ativa', async () => {
      const { classroom } = await setup();
      const a1 = await repo.createActivity(classroom.id, { kind: 'OFICINA_LIVRE', title: 'Aula 1', config, catalogRev: 'r1' });
      const a2 = await repo.createActivity(classroom.id, { kind: 'OFICINA_LIVRE', title: 'Aula 2', config, catalogRev: 'r1' });
      expect(a1).toMatchObject({ status: 'RASCUNHO', startedAt: null, config });
      expect((await repo.setActivityStatus(a1.id, 'ATIVA')).startedAt).not.toBeNull();
      await repo.setActivityStatus(a2.id, 'ATIVA');
      expect(await repo.getActivity(a1.id)).toMatchObject({ status: 'ENCERRADA' });
      expect((await repo.getPublicState(classroom.code))?.activity?.id).toBe(a2.id);
      const closed = await repo.setActivityStatus(a2.id, 'ENCERRADA');
      expect(closed.closedAt).not.toBeNull();
      expect((await repo.getPublicState(classroom.code))?.activity).toBeNull();
      const revealed = await repo.updateActivityConfig(a1.id, { ...config, referenceRevealed: true });
      expect(revealed.config).toMatchObject({ referenceRevealed: true });
      expect((await repo.listActivities(classroom.id)).map((a) => a.title)).toEqual(['Aula 1', 'Aula 2']);
    });

    it('participante: apelido único sem diferenciar maiúsculas, token e estado ao vivo', async () => {
      const { classroom } = await setup();
      const p = await repo.addParticipant(classroom.id, 'Ana – Bancada 3', `hash-${uniq('t')}`);
      await expect(repo.addParticipant(classroom.id, 'ana – bancada 3', `hash-${uniq('t')}`)).rejects.toMatchObject({ code: 'APELIDO_EM_USO' });
      const live = { activityId: 'x', phase: 3, percent: 40, spent: 1200, penalties: 0, updatedAt: '2026-11-05T10:00:00.000Z' };
      await repo.updateLiveState(p.id, live);
      expect((await repo.getParticipant(p.id))?.live).toEqual(live);
      expect((await repo.listParticipants(classroom.id)).map((x) => x.displayName)).toEqual(['Ana – Bancada 3']);
    });

    it('envio: numera as tentativas, lista com o apelido, revisa e some com o participante', async () => {
      const { classroom } = await setup();
      const activity = await repo.createActivity(classroom.id, { kind: 'OFICINA_LIVRE', title: 'Aula', config, catalogRev: 'r1' });
      const tokenHash = `hash-${uniq('t')}`;
      const p = await repo.addParticipant(classroom.id, 'Léo', tokenHash);
      expect(await repo.findParticipantByToken(tokenHash)).toMatchObject({ id: p.id });
      const base: NewSubmission = { activityId: activity.id, participantId: p.id, build, metrics: { elapsedSeconds: 300, penaltiesCount: 1, errorLog: ['Encaixe Perigoso!'], postAttempts: 1 }, completed: true, scoreTotal: 5000, breakdown: score, totalSpent: 3000, status: 'VALIDO', flags: [] };
      const s1 = await repo.saveSubmission(base);
      const s2 = await repo.saveSubmission({ ...base, status: 'SINALIZADO', flags: ['TEMPO_IMPOSSIVEL'] });
      expect([s1.attemptNo, s2.attemptNo]).toEqual([1, 2]);
      const rows = await repo.listSubmissions(activity.id);
      expect(rows.map((r) => [r.displayName, r.attemptNo, r.flags])).toEqual([
        ['Léo', 1, []],
        ['Léo', 2, ['TEMPO_IMPOSSIVEL']],
      ]);
      expect(rows[0].breakdown).toEqual(score);
      expect((await repo.setSubmissionStatus(s2.id, 'VALIDO')).status).toBe('VALIDO');
      await repo.removeParticipant(p.id);
      expect(await repo.listSubmissions(activity.id)).toEqual([]);
      expect(await repo.findParticipantByToken(tokenHash)).toBeNull();
    });

    it('excluir a turma apaga tudo em cascata (LGPD)', async () => {
      const { classroom } = await setup();
      const activity = await repo.createActivity(classroom.id, { kind: 'OFICINA_LIVRE', title: 'Aula', config, catalogRev: 'r1' });
      const p = await repo.addParticipant(classroom.id, 'Bia', `hash-${uniq('t')}`);
      await repo.saveSubmission({ activityId: activity.id, participantId: p.id, build, metrics: { elapsedSeconds: 1, penaltiesCount: 0, errorLog: [], postAttempts: 0 }, completed: false, scoreTotal: 0, breakdown: score, totalSpent: 0, status: 'VALIDO', flags: [] });
      await repo.deleteClassroom(classroom.id);
      expect(await repo.getClassroom(classroom.id)).toBeNull();
      expect(await repo.getActivity(activity.id)).toBeNull();
      expect(await repo.getParticipant(p.id)).toBeNull();
    });

    it('limite de tentativas: estoura depois do máximo na mesma janela', async () => {
      const key = `teste:${uniq('k')}`;
      expect(await repo.hitRateLimit(key, 60, 2)).toBe(true);
      expect(await repo.hitRateLimit(key, 60, 2)).toBe(true);
      expect(await repo.hitRateLimit(key, 60, 2)).toBe(false);
    });

    it('retenção: apaga só turmas arquivadas antes da data', async () => {
      const { classroom } = await setup();
      const kept = await setup();
      await repo.updateClassroom(classroom.id, { archived: true });
      const removed = await repo.purgeArchivedBefore(new Date(Date.now() + 60_000));
      expect(removed).toBeGreaterThanOrEqual(1);
      expect(await repo.getClassroom(classroom.id)).toBeNull();
      expect(await repo.getClassroom(kept.classroom.id)).not.toBeNull();
    });
  });
}

contract('memória', () => new MemoryRepository());

const url = process.env.DATABASE_URL;
if (url) {
  contract('Neon (Postgres)', () => new NeonRepository(url));
  afterAll(async () => {
    await neon(url).query(`DELETE FROM teachers WHERE username LIKE 'contrato-%'`);
    await neon(url).query(`DELETE FROM rate_limits WHERE key LIKE 'teste:%'`);
  });
}

describe('MemoryRepository: janela do limite de tentativas', () => {
  it('a janela recomeça depois do tempo', async () => {
    let t = new Date('2026-11-05T10:00:00Z');
    const repo = new MemoryRepository(() => t);
    expect(await repo.hitRateLimit('k', 60, 1)).toBe(true);
    expect(await repo.hitRateLimit('k', 60, 1)).toBe(false);
    t = new Date('2026-11-05T10:01:01Z');
    expect(await repo.hitRateLimit('k', 60, 1)).toBe(true);
  });
});
