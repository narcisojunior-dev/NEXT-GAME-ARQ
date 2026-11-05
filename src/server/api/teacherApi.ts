import 'server-only';
import { randomInt } from 'node:crypto';
import { generateClassCode } from '../../engine/classroom/classCode';
import { validateActivityInput, validateBudgetConfig, validateClassroomName } from '../../engine/classroom/validation';
import type { Activity, ActivityConfig, Classroom, Teacher } from '../../engine/classroom/types';
import { BUDGET_PROFILES, analyzeBudget, catalogRevision } from '../../engine/budgetChallenge';
import { rankClass } from '../../engine/ranking';
import { ApiError, getRepository, handle, json, now, readJson, requireTeacher } from '../http';
import { isRepositoryError } from '../repository';
import { activityReport, entryView, isClosed, isOpen, rankingOf, resultsCsv } from '../results';

type Params<K extends string> = { params: Promise<Record<K, string>> };

/** Turma do professor logado; a de outro professor responde como inexistente */
async function ownedClassroom(teacher: Teacher, id: string): Promise<Classroom> {
  const c = await getRepository().getClassroom(id);
  if (!c || c.teacherId !== teacher.id) throw new ApiError(404, 'TURMA_NAO_ENCONTRADA', 'Turma não encontrada.');
  return c;
}

async function ownedActivity(teacher: Teacher, id: string): Promise<{ activity: Activity; classroom: Classroom }> {
  const activity = await getRepository().getActivity(id);
  if (!activity) throw new ApiError(404, 'ATIVIDADE_NAO_ENCONTRADA', 'Atividade não encontrada.');
  const classroom = await ownedClassroom(teacher, activity.classroomId);
  return { activity, classroom };
}

/* ------------------------------------------------------------------------------------
 * Turmas
 * ------------------------------------------------------------------------------------ */
export const listClassrooms = (request: Request) =>
  handle(async () => {
    const teacher = await requireTeacher(request);
    return json({ classrooms: await getRepository().listClassrooms(teacher.id) });
  });

export const createClassroom = (request: Request) =>
  handle(async () => {
    const teacher = await requireTeacher(request, { mutation: true });
    const body = (await readJson(request)) as Record<string, unknown>;
    const name = validateClassroomName(body.name);
    if (!name.ok) throw new ApiError(400, name.code, name.message);
    // Código sorteado; em caso raro de colisão, sorteia de novo
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const classroom = await getRepository().createClassroom(teacher.id, name.value, generateClassCode(randomInt));
        return json({ classroom }, { status: 201 });
      } catch (error) {
        if (!isRepositoryError(error, 'CODIGO_EM_USO')) throw error;
      }
    }
    throw new ApiError(503, 'CODIGO_INDISPONIVEL', 'Não foi possível gerar um código agora. Tente de novo.');
  });

export const updateClassroom = (request: Request, { params }: Params<'id'>) =>
  handle(async () => {
    const teacher = await requireTeacher(request, { mutation: true });
    const { id } = await params;
    await ownedClassroom(teacher, id);
    const body = (await readJson(request)) as Record<string, unknown>;
    const patch: { name?: string; joinsOpen?: boolean; archived?: boolean } = {};
    if (body.name !== undefined) {
      const name = validateClassroomName(body.name);
      if (!name.ok) throw new ApiError(400, name.code, name.message);
      patch.name = name.value;
    }
    if (typeof body.joinsOpen === 'boolean') patch.joinsOpen = body.joinsOpen;
    if (typeof body.archived === 'boolean') patch.archived = body.archived;
    return json({ classroom: await getRepository().updateClassroom(id, patch) });
  });

/** Exclusão em cascata (LGPD, #81): turma, atividades, participantes e envios */
export const deleteClassroom = (request: Request, { params }: Params<'id'>) =>
  handle(async () => {
    const teacher = await requireTeacher(request, { mutation: true });
    const { id } = await params;
    await ownedClassroom(teacher, id);
    await getRepository().deleteClassroom(id);
    return json({ ok: true });
  });

/* ------------------------------------------------------------------------------------
 * Atividades
 * ------------------------------------------------------------------------------------ */
export const listActivities = (request: Request, { params }: Params<'id'>) =>
  handle(async () => {
    const teacher = await requireTeacher(request);
    const { id } = await params;
    await ownedClassroom(teacher, id);
    return json({ activities: await getRepository().listActivities(id) });
  });

/** Prévia de viabilidade para o formulário do Modo Orçamento (seção 6.3) */
export const analyzeBudgetPreview = (request: Request) =>
  handle(async () => {
    await requireTeacher(request, { mutation: true });
    const config = validateBudgetConfig(await readJson(request));
    if (!config.ok) throw new ApiError(400, config.code, config.message);
    const req = config.value.requirements ?? BUDGET_PROFILES[config.value.profile].requirements;
    const analysis = analyzeBudget(config.value.budget, req, config.value.resolution);
    return json({
      feasible: analysis.feasible,
      cheapestCost: Number.isFinite(analysis.cheapestCost) ? analysis.cheapestCost : null,
      ceilingCost: analysis.ceilingCost,
      reference: analysis.reference ? { cost: analysis.reference.cost, avgFps: analysis.reference.avgFps, score: analysis.reference.score } : null,
    });
  });

export const createActivity = (request: Request, { params }: Params<'id'>) =>
  handle(async () => {
    const teacher = await requireTeacher(request, { mutation: true });
    const { id } = await params;
    await ownedClassroom(teacher, id);
    const draft = validateActivityInput(await readJson(request));
    if (!draft.ok) throw new ApiError(400, draft.code, draft.message);
    const { title, ...rest } = draft.value;
    let config: ActivityConfig;
    let catalogRev = catalogRevision();
    if (rest.kind === 'ORCAMENTO') {
      // Referência calculada uma vez e congelada com a revisão do catálogo
      const req = rest.budget.requirements ?? BUDGET_PROFILES[rest.budget.profile].requirements;
      const analysis = analyzeBudget(rest.budget.budget, req, rest.budget.resolution);
      if (!analysis.feasible || !analysis.reference) {
        throw new ApiError(422, 'ORCAMENTO_INVIAVEL', `Abaixo do PC mais barato que atende esse cliente (R$ ${Math.ceil(analysis.cheapestCost).toLocaleString('pt-BR')}).`);
      }
      catalogRev = analysis.catalogRev;
      config = { ...rest, budget: { ...rest.budget, reference: analysis.reference, cheapestCost: analysis.cheapestCost, ceilingCost: analysis.ceilingCost } };
    } else {
      config = rest;
    }
    const activity = await getRepository().createActivity(id, { kind: config.kind, title, config, catalogRev });
    return json({ activity }, { status: 201 });
  });

/** RASCUNHO → ATIVA → ENCERRADA; revelar a build de referência do Modo Orçamento */
export const updateActivity = (request: Request, { params }: Params<'id'>) =>
  handle(async () => {
    const teacher = await requireTeacher(request, { mutation: true });
    const { id } = await params;
    let { activity } = await ownedActivity(teacher, id);
    const body = (await readJson(request)) as Record<string, unknown>;
    const repo = getRepository();
    if (body.status !== undefined) {
      const allowed: Record<string, string[]> = { RASCUNHO: ['ATIVA'], ATIVA: ['ENCERRADA'], ENCERRADA: [] };
      if (typeof body.status !== 'string' || !allowed[activity.status].includes(body.status)) {
        throw new ApiError(409, 'TRANSICAO_INVALIDA', activity.status === 'ENCERRADA' ? 'Atividade encerrada não volta a abrir: crie outra.' : 'Mudança de estado inválida.');
      }
      activity = await repo.setActivityStatus(id, body.status as Activity['status']);
    }
    if (body.revealReference === true) {
      if (activity.config.kind !== 'ORCAMENTO') throw new ApiError(400, 'SEM_REFERENCIA', 'Só o Modo Orçamento tem build de referência.');
      activity = await repo.updateActivityConfig(id, { ...activity.config, referenceRevealed: true });
    }
    return json({ activity });
  });

/* ------------------------------------------------------------------------------------
 * Acompanhamento ao vivo e resultados
 * ------------------------------------------------------------------------------------ */
export const live = (request: Request, { params }: Params<'id'>) =>
  handle(async () => {
    const teacher = await requireTeacher(request);
    const { id } = await params;
    const classroom = await ownedClassroom(teacher, id);
    const repo = getRepository();
    const [participants, activities] = await Promise.all([repo.listParticipants(id), repo.listActivities(id)]);
    const active = activities.find((a) => a.status === 'ATIVA') ?? null;
    const rows = active ? await repo.listSubmissions(active.id) : [];
    const t = now();
    return json({
      classroom,
      activity: active ? { ...active, open: isOpen(active, t) } : null,
      participants: participants.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        joinedAt: p.joinedAt,
        live: active && p.live?.activityId === active.id ? p.live : null,
        submissions: rows.filter((r) => r.participantId === p.id).length,
      })),
      ranking: active ? rankingOf(active, rows, true).map(entryView) : [],
      serverTime: t.toISOString(),
    });
  });

export const results = (request: Request, { params }: Params<'id'>) =>
  handle(async () => {
    const teacher = await requireTeacher(request);
    const { id } = await params;
    const { activity } = await ownedActivity(teacher, id);
    return json(activityReport(activity, await getRepository().listSubmissions(id), now()));
  });

export const resultsCsvExport = (request: Request, { params }: Params<'id'>) =>
  handle(async () => {
    const teacher = await requireTeacher(request);
    const { id } = await params;
    const { activity } = await ownedActivity(teacher, id);
    const csv = resultsCsv(activity, await getRepository().listSubmissions(id));
    const filename = `resultados-${activity.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)}.csv`;
    return new Response(csv, { headers: { 'content-type': 'text/csv; charset=utf-8', 'content-disposition': `attachment; filename="${filename}"`, 'cache-control': 'no-store' } });
  });

/** Ranking da turma: soma do envio escolhido em cada atividade encerrada (seção 8.2) */
export const classRanking = (request: Request, { params }: Params<'id'>) =>
  handle(async () => {
    const teacher = await requireTeacher(request);
    const { id } = await params;
    await ownedClassroom(teacher, id);
    const repo = getRepository();
    const t = now();
    const activities = (await repo.listActivities(id)).filter((a) => a.kind !== 'OFICINA_LIVRE');
    const rankings = await Promise.all(
      activities.map(async (a) => ({ activityId: a.id, closed: isClosed(a, t), entries: rankingOf(a, await repo.listSubmissions(a.id), false) }))
    );
    return json({ ranking: rankClass(rankings), closedActivities: rankings.filter((r) => r.closed).length });
  });

/* ------------------------------------------------------------------------------------
 * Moderação
 * ------------------------------------------------------------------------------------ */
export const reviewSubmission = (request: Request, { params }: Params<'id'>) =>
  handle(async () => {
    const teacher = await requireTeacher(request, { mutation: true });
    const { id } = await params;
    const repo = getRepository();
    const submission = await repo.getSubmission(id);
    if (!submission) throw new ApiError(404, 'ENVIO_NAO_ENCONTRADO', 'Envio não encontrado.');
    await ownedActivity(teacher, submission.activityId);
    const body = (await readJson(request)) as Record<string, unknown>;
    if (body.status !== 'VALIDO' && body.status !== 'INVALIDO') throw new ApiError(400, 'STATUS_INVALIDO', 'Valide ou invalide o envio.');
    return json({ submission: await repo.setSubmissionStatus(id, body.status) });
  });

/** Remove participante (apelido impróprio ou duplicado) e os envios dele */
export const removeParticipant = (request: Request, { params }: Params<'id'>) =>
  handle(async () => {
    const teacher = await requireTeacher(request, { mutation: true });
    const { id } = await params;
    const repo = getRepository();
    const participant = await repo.getParticipant(id);
    if (!participant) throw new ApiError(404, 'PARTICIPANTE_NAO_ENCONTRADO', 'Participante não encontrado.');
    await ownedClassroom(teacher, participant.classroomId);
    await repo.removeParticipant(id);
    return json({ ok: true });
  });
