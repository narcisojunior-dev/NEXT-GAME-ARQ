import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryRepository } from '../memoryRepository';
import { setTestContext } from '../http';
import * as authApi from '../api/authApi';
import * as teacherApi from '../api/teacherApi';
import * as studentApi from '../api/studentApi';
import * as cronApi from '../api/cronApi';
import { BUILD_STEP_KEYS, SubmissionBuild } from '../../engine/classroom/types';
import { BUDGET_PROFILES, analyzeBudget, buildAssemblyFromIds } from '../../engine/budgetChallenge';
import { AssemblyState, MotherboardComponent } from '../../engine/types';

/**
 * API do Modo Professor (#72–#75, #77, #79, #81) com Request reais, repositório em memória e
 * relógio controlado: autenticação, permissão, ciclo da atividade, limites, cache e ranking.
 */
const BASE = 'http://localhost:3000';
let clock = new Date('2026-11-05T13:00:00Z');
const advance = (seconds: number) => (clock = new Date(clock.getTime() + seconds * 1000));

beforeEach(() => {
  clock = new Date('2026-11-05T13:00:00Z');
  setTestContext(new MemoryRepository(() => clock), () => clock);
});

interface Opts {
  body?: unknown;
  cookie?: string;
  token?: string;
  origin?: string | null;
  ip?: string;
}

function req(method: string, path: string, opts: Opts = {}): Request {
  const headers: Record<string, string> = { host: 'localhost:3000' };
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  if (opts.cookie) headers.cookie = opts.cookie;
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.origin !== null) headers.origin = opts.origin ?? BASE;
  if (opts.ip) headers['x-real-ip'] = opts.ip;
  return new Request(`${BASE}${path}`, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
}

const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const body = async (r: Response) => r.json() as Promise<Record<string, never>>;
const cookieOf = (r: Response) => (r.headers.get('set-cookie') ?? '').split(';')[0];

async function registerTeacher(username = 'prof.ana') {
  const r = await authApi.register(req('POST', '/api/v1/auth/register', { body: { username, password: 'senha-forte-1', displayName: 'Profa. Ana' } }));
  expect(r.status).toBe(200);
  return { cookie: cookieOf(r), recoveryCode: (await body(r)).recoveryCode as string };
}

async function classroomOf(cookie: string, name = '1º Ano B') {
  const r = await teacherApi.createClassroom(req('POST', '/api/v1/classrooms', { cookie, body: { name } }));
  expect(r.status).toBe(201);
  return (await body(r)).classroom as { id: string; code: string };
}

async function activityOf(cookie: string, classroomId: string, input: unknown) {
  const r = await teacherApi.createActivity(req('POST', `/api/v1/classrooms/${classroomId}/activities`, { cookie, body: input }), params({ id: classroomId }));
  return { status: r.status, json: await body(r) };
}

async function activate(cookie: string, activityId: string, status = 'ATIVA') {
  return teacherApi.updateActivity(req('PATCH', `/api/v1/activities/${activityId}`, { cookie, body: { status } }), params({ id: activityId }));
}

async function joinAs(code: string, displayName: string, ip = '10.0.0.1') {
  const r = await studentApi.join(req('POST', '/api/v1/join', { body: { code, displayName }, origin: null, ip }));
  return { status: r.status, json: await body(r) };
}

function payloadOf(assembly: AssemblyState, mb: MotherboardComponent | null): SubmissionBuild {
  return {
    motherboardId: mb?.id ?? null,
    cpuId: assembly.cpuInstalled?.id ?? null,
    coolerId: assembly.coolerInstalled?.id ?? null,
    ramSlot2Id: assembly.ramInstalledSlot2?.id ?? null,
    ramSlot4Id: assembly.ramInstalledSlot4?.id ?? null,
    storageId: assembly.storageInstalled?.id ?? null,
    caseId: assembly.caseInstalled?.id ?? null,
    psuId: assembly.psuInstalled?.id ?? null,
    gpuId: assembly.gpuInstalled?.id ?? null,
    steps: Object.fromEntries(BUILD_STEP_KEYS.map((k) => [k, assembly[k]])) as SubmissionBuild['steps'],
  };
}

const BUDGET = 5000;
const profile = BUDGET_PROFILES.JOGOS_1080P;
const reference = analyzeBudget(BUDGET, profile.requirements, profile.resolution).reference!;
const refBuild = (() => {
  const { assembly, motherboard } = buildAssemblyFromIds(reference.build);
  return payloadOf(assembly, motherboard);
})();

async function submit(token: string, activityId: string, build: SubmissionBuild, elapsedSeconds = 500, penaltiesCount = 0) {
  const r = await studentApi.submit(
    req('POST', '/api/v1/submissions', { token, origin: null, body: { activityId, build, metrics: { elapsedSeconds, penaltiesCount, errorLog: [], postAttempts: 1 } } })
  );
  return { status: r.status, json: await body(r) };
}

describe('Autenticação do professor (#72)', () => {
  it('cadastro mostra o código de recuperação uma vez e abre a sessão em cookie seguro', async () => {
    const r = await authApi.register(req('POST', '/api/v1/auth/register', { body: { username: 'Prof.Ana', password: 'senha-forte-1', displayName: 'Profa. Ana' } }));
    const json = await body(r);
    expect(json.recoveryCode).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const setCookie = r.headers.get('set-cookie') ?? '';
    expect(setCookie).toMatch(/^pcba_session=/);
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Max-Age=43200');
    const me = await authApi.me(req('GET', '/api/v1/auth/me', { cookie: cookieOf(r) }));
    expect(await body(me)).toMatchObject({ teacher: { username: 'prof.ana', displayName: 'Profa. Ana' } });
  });

  it('senha errada, usuário repetido e senha curta são recusados', async () => {
    await registerTeacher();
    const wrong = await authApi.login(req('POST', '/api/v1/auth/login', { body: { username: 'prof.ana', password: 'errada-123' } }));
    expect(wrong.status).toBe(401);
    expect(await body(wrong)).toMatchObject({ error: { code: 'LOGIN_INVALIDO', message: 'Usuário ou senha incorretos.' } });
    const dup = await authApi.register(req('POST', '/api/v1/auth/register', { body: { username: 'prof.ana', password: 'senha-forte-1', displayName: 'Outra' } }));
    expect(dup.status).toBe(409);
    const short = await authApi.register(req('POST', '/api/v1/auth/register', { body: { username: 'prof.bia', password: '123', displayName: 'Bia' } }));
    expect(await body(short)).toMatchObject({ error: { code: 'SENHA_CURTA' } });
  });

  it('limite: 5 tentativas de login a cada 15 minutos por usuário', async () => {
    await registerTeacher();
    for (let i = 0; i < 5; i++) await authApi.login(req('POST', '/api/v1/auth/login', { body: { username: 'prof.ana', password: 'errada-123' } }));
    const blocked = await authApi.login(req('POST', '/api/v1/auth/login', { body: { username: 'prof.ana', password: 'senha-forte-1' } }));
    expect(blocked.status).toBe(429);
    advance(15 * 60 + 1);
    expect((await authApi.login(req('POST', '/api/v1/auth/login', { body: { username: 'prof.ana', password: 'senha-forte-1' } }))).status).toBe(200);
  });

  it('cookie adulterado e sessão expirada (12 h) não entram', async () => {
    const { cookie } = await registerTeacher();
    const tampered = cookie.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A'));
    expect((await authApi.me(req('GET', '/api/v1/auth/me', { cookie: tampered }))).status).toBe(401);
    advance(12 * 3600 + 1);
    expect((await authApi.me(req('GET', '/api/v1/auth/me', { cookie }))).status).toBe(401);
  });

  it('recuperar a senha troca a senha e gera um código novo; o antigo deixa de valer', async () => {
    const { recoveryCode } = await registerTeacher();
    const r = await authApi.recover(req('POST', '/api/v1/auth/recover', { body: { username: 'prof.ana', recoveryCode: recoveryCode.toLowerCase(), newPassword: 'nova-senha-22' } }));
    expect(r.status).toBe(200);
    const fresh = (await body(r)).recoveryCode;
    expect(fresh).not.toBe(recoveryCode);
    expect((await authApi.login(req('POST', '/api/v1/auth/login', { body: { username: 'prof.ana', password: 'nova-senha-22' } }))).status).toBe(200);
    const again = await authApi.recover(req('POST', '/api/v1/auth/recover', { body: { username: 'prof.ana', recoveryCode, newPassword: 'outra-senha-33' } }));
    expect(again.status).toBe(401);
  });

  it('mutações sem Origin ou de outra origem são recusadas', async () => {
    const { cookie } = await registerTeacher();
    const noOrigin = await teacherApi.createClassroom(req('POST', '/api/v1/classrooms', { cookie, origin: null, body: { name: 'Turma' } }));
    expect(noOrigin.status).toBe(403);
    const evil = await teacherApi.createClassroom(req('POST', '/api/v1/classrooms', { cookie, origin: 'https://site-malicioso.com', body: { name: 'Turma' } }));
    expect(evil.status).toBe(403);
  });
});

describe('Turmas e atividades (#73)', () => {
  it('cada professor só vê e altera as próprias turmas', async () => {
    const ana = await registerTeacher('prof.ana');
    const bia = await registerTeacher('prof.bia');
    const classroom = await classroomOf(ana.cookie);
    expect(classroom.code).toMatch(/^[A-HJKMNP-Z2-9]{6}$/);
    const list = await teacherApi.listClassrooms(req('GET', '/api/v1/classrooms', { cookie: bia.cookie }));
    expect((await body(list)).classrooms).toEqual([]);
    const steal = await teacherApi.updateClassroom(req('PATCH', `/api/v1/classrooms/${classroom.id}`, { cookie: bia.cookie, body: { joinsOpen: false } }), params({ id: classroom.id }));
    expect(steal.status).toBe(404);
    const del = await teacherApi.deleteClassroom(req('DELETE', `/api/v1/classrooms/${classroom.id}`, { cookie: bia.cookie }), params({ id: classroom.id }));
    expect(del.status).toBe(404);
  });

  it('Modo Orçamento: prévia, recusa abaixo do mínimo e referência congelada na criação', async () => {
    const { cookie } = await registerTeacher();
    const classroom = await classroomOf(cookie);
    const preview = await teacherApi.analyzeBudgetPreview(req('POST', '/api/v1/budget/analyze', { cookie, body: { budget: BUDGET, profile: 'JOGOS_1080P', resolution: '1080p' } }));
    expect(await body(preview)).toMatchObject({ feasible: true, reference: { cost: reference.cost, avgFps: reference.avgFps } });
    const low = await activityOf(cookie, classroom.id, { kind: 'ORCAMENTO', budget: { budget: 800, profile: 'JOGOS_1080P', resolution: '1080p' } });
    expect(low.status).toBe(422);
    expect(low.json).toMatchObject({ error: { code: 'ORCAMENTO_INVIAVEL' } });
    const ok = await activityOf(cookie, classroom.id, { kind: 'ORCAMENTO', budget: { budget: BUDGET, profile: 'JOGOS_1080P', resolution: '1080p' } });
    expect(ok.status).toBe(201);
    expect(ok.json).toMatchObject({ activity: { status: 'RASCUNHO', config: { budget: { reference: { cost: reference.cost } } } } });
  });

  it('ciclo RASCUNHO → ATIVA → ENCERRADA; ativar outra encerra a anterior; encerrada não reabre', async () => {
    const { cookie } = await registerTeacher();
    const classroom = await classroomOf(cookie);
    const a1 = (await activityOf(cookie, classroom.id, { kind: 'MISSAO_CAMPANHA', missionId: 'jornada-02' })).json.activity as { id: string };
    const a2 = (await activityOf(cookie, classroom.id, { kind: 'OFICINA_LIVRE' })).json.activity as { id: string };
    expect((await activate(cookie, a1.id)).status).toBe(200);
    await activate(cookie, a2.id);
    const list = await body(await teacherApi.listActivities(req('GET', '/', { cookie }), params({ id: classroom.id })));
    expect((list.activities as { status: string }[]).map((a) => a.status)).toEqual(['ENCERRADA', 'ATIVA']);
    const reopen = await activate(cookie, a1.id);
    expect(reopen.status).toBe(409);
    expect(await body(reopen)).toMatchObject({ error: { code: 'TRANSICAO_INVALIDA' } });
  });
});

describe('Entrada, estado e envio do aluno (#74, #75)', () => {
  async function scenario(visibility = 'AO_VIVO') {
    const { cookie } = await registerTeacher();
    const classroom = await classroomOf(cookie);
    const activity = (
      await activityOf(cookie, classroom.id, { kind: 'ORCAMENTO', budget: { budget: BUDGET, profile: 'JOGOS_1080P', resolution: '1080p' }, rankingVisibility: visibility, maxAttempts: 2 })
    ).json.activity as { id: string };
    await activate(cookie, activity.id);
    return { cookie, classroom, activityId: activity.id };
  }

  it('entrar: código errado, apelido repetido e entradas fechadas', async () => {
    const { cookie, classroom } = await scenario();
    expect((await joinAs('ZZZZZZ', 'Ana')).json).toMatchObject({ error: { code: 'TURMA_NAO_ENCONTRADA' } });
    expect((await joinAs('abc', 'Ana')).json).toMatchObject({ error: { code: 'CODIGO_INVALIDO' } });
    const ana = await joinAs(classroom.code.toLowerCase(), 'Ana – Bancada 1');
    expect(ana.status).toBe(201);
    expect(ana.json.participantToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
    expect((await joinAs(classroom.code, 'ana – bancada 1')).json).toMatchObject({ error: { code: 'APELIDO_EM_USO' } });
    await teacherApi.updateClassroom(req('PATCH', '/', { cookie, body: { joinsOpen: false } }), params({ id: classroom.id }));
    expect((await joinAs(classroom.code, 'Léo')).json).toMatchObject({ error: { code: 'ENTRADAS_FECHADAS' } });
  });

  it('limite: 10 entradas por minuto por IP e código', async () => {
    const { classroom } = await scenario();
    for (let i = 0; i < 10; i++) await joinAs(classroom.code, `Aluno ${i}`, '10.0.0.9');
    expect((await joinAs(classroom.code, 'Aluno 11', '10.0.0.9')).status).toBe(429);
    expect((await joinAs(classroom.code, 'Aluno 11', '10.0.0.8')).status).toBe(201);
  });

  it('estado público: em cache na CDN, sem dados de alunos e sem a referência antes de revelar', async () => {
    const { cookie, classroom, activityId } = await scenario();
    const r = await studentApi.state(req('GET', `/api/v1/state/${classroom.code}`, { origin: null }), params({ code: classroom.code }));
    expect(r.headers.get('cache-control')).toBe('public, s-maxage=10, stale-while-revalidate=20');
    const json = await body(r);
    expect(json).toMatchObject({ code: classroom.code, activity: { id: activityId, kind: 'ORCAMENTO', config: { budget: { budget: BUDGET, reference: null } } } });
    expect(JSON.stringify(json)).not.toContain('participants');
    await teacherApi.updateActivity(req('PATCH', '/', { cookie, body: { revealReference: true } }), params({ id: activityId }));
    const revealed = await body(await studentApi.state(req('GET', '/', { origin: null }), params({ code: classroom.code })));
    expect(revealed).toMatchObject({ activity: { config: { budget: { reference: { cost: reference.cost } } } } });
  });

  it('progresso ao vivo: no máximo 1 a cada 15 s e aparece no painel do professor', async () => {
    const { cookie, classroom, activityId } = await scenario();
    const ana = await joinAs(classroom.code, 'Ana');
    const send = () => studentApi.progress(req('POST', '/api/v1/progress', { token: ana.json.participantToken, origin: null, body: { activityId, phase: 4, percent: 55, spent: 2100, penalties: 1 } }));
    expect((await send()).status).toBe(200);
    expect((await send()).status).toBe(429);
    const live = await body(await teacherApi.live(req('GET', '/', { cookie }), params({ id: classroom.id })));
    expect(live.participants).toEqual([expect.objectContaining({ displayName: 'Ana', live: expect.objectContaining({ phase: 4, percent: 55, spent: 2100 }) })]);
  });

  it('envio: pontuação oficial, ranking na ordem certa, tentativas e posição do aluno', async () => {
    const { cookie, classroom, activityId } = await scenario();
    const ana = await joinAs(classroom.code, 'Ana');
    const leo = await joinAs(classroom.code, 'Léo');
    advance(600);
    const a = await submit(ana.json.participantToken, activityId, refBuild, 500, 0);
    expect(a.status).toBe(201);
    expect(a.json).toMatchObject({ attemptNo: 1, attemptsLeft: 1, status: 'VALIDO', score: { total: 10000, completed: true } });
    const l = await submit(leo.json.participantToken, activityId, refBuild, 500, 2);
    expect((l.json.score as { total: number }).total).toBe(9000);
    expect(l.json).toMatchObject({ ranking: { own: { position: 2 }, participants: 2 } });
    // Preço adulterado não existe: o servidor usa o catálogo. Peça inventada é recusada.
    advance(30);
    const fake = await submit(ana.json.participantToken, activityId, { ...refBuild, gpuId: 'gpu-falsa' });
    expect(fake.json).toMatchObject({ error: { code: 'PECA_DESCONHECIDA' } });
    // Intervalo mínimo e limite de tentativas
    advance(30);
    expect((await submit(ana.json.participantToken, activityId, refBuild)).status).toBe(201);
    advance(30);
    expect((await submit(ana.json.participantToken, activityId, refBuild)).json).toMatchObject({ error: { code: 'LIMITE_DE_TENTATIVAS' } });
    const pos = await body(await studentApi.myPosition(req('GET', `/api/v1/me/position?activityId=${activityId}`, { token: leo.json.participantToken, origin: null })));
    expect(pos).toMatchObject({ own: { position: 2 }, participants: 2, attemptsUsed: 1, attemptsLeft: 1 });
    const live = await body(await teacherApi.live(req('GET', '/', { cookie }), params({ id: classroom.id })));
    expect((live.ranking as { displayName: string }[]).map((r) => r.displayName)).toEqual(['Ana', 'Léo']);
  });

  it('montagem rápida demais fica sinalizada, fora do ranking do aluno até o professor validar', async () => {
    const { cookie, classroom, activityId } = await scenario();
    const ana = await joinAs(classroom.code, 'Ana');
    advance(30);
    const fast = await submit(ana.json.participantToken, activityId, refBuild, 20, 0);
    expect(fast.json).toMatchObject({ status: 'SINALIZADO', flags: ['Montagem completa em menos de 45 segundos'] });
    expect(fast.json).toMatchObject({ ranking: { top: [] } });
    const report = await body(await teacherApi.results(req('GET', '/', { cookie }), params({ id: activityId })));
    expect(report.flagged).toEqual([expect.objectContaining({ displayName: 'Ana' })]);
    const submissionId = (report.flagged as { submissionId: string }[])[0].submissionId;
    await teacherApi.reviewSubmission(req('PATCH', '/', { cookie, body: { status: 'VALIDO' } }), params({ id: submissionId }));
    const ranking = await body(await studentApi.publicRanking(req('GET', '/', { origin: null }), params({ id: activityId })));
    expect((ranking.top as { displayName: string }[]).map((r) => r.displayName)).toEqual(['Ana']);
  });

  it('visibilidade "ao encerrar": durante a aula o aluno vê só a própria pontuação; depois, top 10 e destaques', async () => {
    const { cookie, classroom, activityId } = await scenario('AO_ENCERRAR');
    const ana = await joinAs(classroom.code, 'Ana');
    advance(600);
    const s = await submit(ana.json.participantToken, activityId, refBuild);
    expect(s.json).toMatchObject({ ranking: { top: [], own: { position: 0 }, participants: 0 } });
    expect(await body(await studentApi.publicRanking(req('GET', '/', { origin: null }), params({ id: activityId })))).toMatchObject({ visible: false, top: [] });
    await activate(cookie, activityId, 'ENCERRADA');
    const after = await body(await studentApi.publicRanking(req('GET', '/', { origin: null }), params({ id: activityId })));
    expect(after).toMatchObject({ visible: true, top: [expect.objectContaining({ displayName: 'Ana', position: 1 })], highlights: { cleanBuild: ['Ana'] } });
    // Envio depois de encerrar é recusado
    advance(30);
    expect((await submit(ana.json.participantToken, activityId, refBuild)).json).toMatchObject({ error: { code: 'ATIVIDADE_ENCERRADA' } });
  });

  it('tempo limite: o envio fecha sozinho quando o tempo acaba', async () => {
    const { cookie } = await registerTeacher();
    const classroom = await classroomOf(cookie);
    const activity = (await activityOf(cookie, classroom.id, { kind: 'MISSAO_CAMPANHA', missionId: 'jornada-02', timeLimitSeconds: 600 })).json.activity as { id: string };
    await activate(cookie, activity.id);
    const ana = await joinAs(classroom.code, 'Ana');
    advance(601);
    expect((await submit(ana.json.participantToken, activity.id, refBuild)).json).toMatchObject({ error: { code: 'ATIVIDADE_ENCERRADA' } });
    const state = await body(await studentApi.state(req('GET', '/', { origin: null }), params({ code: classroom.code })));
    expect(state.activity).toBeNull();
  });
});

describe('Resultados, CSV, moderação e LGPD (#79, #81)', () => {
  it('relatório, CSV, ranking da turma, remover participante e excluir a turma', async () => {
    const { cookie } = await registerTeacher();
    const classroom = await classroomOf(cookie);
    const activity = (await activityOf(cookie, classroom.id, { kind: 'ORCAMENTO', budget: { budget: BUDGET, profile: 'JOGOS_1080P', resolution: '1080p' } })).json.activity as { id: string };
    await activate(cookie, activity.id);
    const ana = await joinAs(classroom.code, 'Ana; "Bancada 1"');
    const leo = await joinAs(classroom.code, 'Léo');
    advance(600);
    await submit(ana.json.participantToken, activity.id, refBuild, 500, 0);
    await submit(leo.json.participantToken, activity.id, refBuild, 500, 1);
    await activate(cookie, activity.id, 'ENCERRADA');

    const report = await body(await teacherApi.results(req('GET', '/', { cookie }), params({ id: activity.id })));
    expect(report).toMatchObject({ activity: { closed: true }, highlights: { podium: [expect.anything(), expect.anything()], cleanBuild: ['Ana; "Bancada 1"'] } });

    const csvResponse = await teacherApi.resultsCsvExport(req('GET', '/', { cookie }), params({ id: activity.id }));
    expect(csvResponse.headers.get('content-type')).toContain('text/csv');
    expect(csvResponse.headers.get('content-disposition')).toMatch(/attachment; filename="resultados-orcamento-/);
    const csv = await csvResponse.text();
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toContain('Apelido;Posição;Pontuação;Concluído;Gasto (R$);Tempo (s);Penalidades;Tentativas;Status;Peças');
    expect(lines[1]).toMatch(/^"Ana; ""Bancada 1""";1;10000;sim;/);
    expect(lines[2]).toMatch(/^Léo;2;9500;sim;/);

    const classRanking = await body(await teacherApi.classRanking(req('GET', '/', { cookie }), params({ id: classroom.id })));
    expect(classRanking).toMatchObject({ closedActivities: 1, ranking: [expect.objectContaining({ nickname: 'Ana; "Bancada 1"', total: 10000, activitiesDone: 1 }), expect.anything()] });

    const removed = await teacherApi.removeParticipant(req('DELETE', '/', { cookie }), params({ id: leo.json.participantId }));
    expect(removed.status).toBe(200);
    expect((await studentApi.myPosition(req('GET', `/api/v1/me/position?activityId=${activity.id}`, { token: leo.json.participantToken, origin: null }))).status).toBe(401);

    expect((await teacherApi.deleteClassroom(req('DELETE', '/', { cookie }), params({ id: classroom.id }))).status).toBe(200);
    expect((await studentApi.state(req('GET', '/', { origin: null }), params({ code: classroom.code }))).status).toBe(404);
  });

  it('rotina de retenção só roda com o segredo do agendador', async () => {
    process.env.CRON_SECRET = 'segredo-do-cron-de-teste';
    expect((await cronApi.retention(req('GET', '/api/v1/cron/retention', { origin: null }))).status).toBe(401);
    const ok = await cronApi.retention(new Request(`${BASE}/api/v1/cron/retention`, { headers: { authorization: 'Bearer segredo-do-cron-de-teste' } }));
    expect(ok.status).toBe(200);
    expect(await body(ok)).toMatchObject({ removedClassrooms: 0 });
    delete process.env.CRON_SECRET;
  });
});
