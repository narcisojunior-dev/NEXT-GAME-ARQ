import 'server-only';
import { normalizeClassCode } from '../../engine/classroom/classCode';
import { validateDisplayName, validateLiveState, validateSubmissionPayload } from '../../engine/classroom/validation';
import { FLAG_LABELS, plausibilityFlags, rebuildAssembly, scoreClassroomSubmission } from '../../engine/classroom/submission';
import type { Activity, Participant, PublicClassroomState } from '../../engine/classroom/types';
import { visibleToStudent } from '../../engine/ranking';
import { bearerToken, generateParticipantToken, hashToken } from '../auth';
import { ApiError, PUBLIC_RANKING_CACHE, PUBLIC_STATE_CACHE, clientIp, getRepository, handle, json, now, readJson, requireRateLimit } from '../http';
import { entryView, highlightsView, isClosed, isOpen, modeOf, publicActivity, rankingOf } from '../results';

type Params<K extends string> = { params: Promise<Record<K, string>> };

async function requireParticipant(request: Request): Promise<Participant> {
  const token = bearerToken(request);
  const participant = token ? await getRepository().findParticipantByToken(hashToken(token)) : null;
  if (!participant) throw new ApiError(401, 'PARTICIPANTE_INVALIDO', 'Você não está mais nesta turma. Entre de novo com o código.');
  return participant;
}

async function participantActivity(participant: Participant, activityId: unknown): Promise<Activity> {
  const activity = typeof activityId === 'string' ? await getRepository().getActivity(activityId) : null;
  if (!activity || activity.classroomId !== participant.classroomId) throw new ApiError(404, 'ATIVIDADE_NAO_ENCONTRADA', 'Atividade não encontrada nesta turma.');
  return activity;
}

/** Entrar na turma: código + apelido, sem conta e sem e-mail */
export const join = (request: Request) =>
  handle(async () => {
    const body = (await readJson(request)) as Record<string, unknown>;
    const code = typeof body.code === 'string' ? normalizeClassCode(body.code) : null;
    if (!code) throw new ApiError(400, 'CODIGO_INVALIDO', 'O código da turma tem 6 letras e números (ex.: K7P2QX).');
    await requireRateLimit(`join:${clientIp(request)}:${code}`, 60, 10, 'Muitas tentativas de entrar. Espere 1 minuto.');
    const repo = getRepository();
    const classroom = await repo.getClassroomByCode(code);
    if (!classroom || classroom.archivedAt) throw new ApiError(404, 'TURMA_NAO_ENCONTRADA', 'Turma não encontrada: confira o código no quadro.');
    if (!classroom.joinsOpen) throw new ApiError(403, 'ENTRADAS_FECHADAS', 'O professor fechou as entradas desta turma.');
    const name = validateDisplayName(body.displayName);
    if (!name.ok) throw new ApiError(400, name.code, name.message);
    const token = generateParticipantToken();
    const participant = await repo.addParticipant(classroom.id, name.value, hashToken(token));
    return json({ participantToken: token, participantId: participant.id, displayName: participant.displayName, classroom: { code: classroom.code, name: classroom.name } }, { status: 201 });
  });

/** Atividade ativa e configuração pública, em cache na CDN (sem dados de alunos) */
export const state = (_request: Request, { params }: Params<'code'>) =>
  handle(async () => {
    const { code: raw } = await params;
    const code = normalizeClassCode(raw);
    const found = code ? await getRepository().getPublicState(code) : null;
    if (!found) throw new ApiError(404, 'TURMA_NAO_ENCONTRADA', 'Turma não encontrada.');
    const t = now();
    const body: PublicClassroomState & { serverTime: string } = {
      code: found.classroom.code,
      name: found.classroom.name,
      joinsOpen: found.classroom.joinsOpen,
      activity: found.activity && isOpen(found.activity, t) ? publicActivity(found.activity) : null,
      serverTime: t.toISOString(),
    };
    return json(body, { cache: PUBLIC_STATE_CACHE });
  });

/** Progresso ao vivo: só ao mudar de fase, no máximo 1 a cada 15 s */
export const progress = (request: Request) =>
  handle(async () => {
    const participant = await requireParticipant(request);
    const live = validateLiveState(await readJson(request), now());
    if (!live.ok) throw new ApiError(400, live.code, live.message);
    const activity = await participantActivity(participant, live.value.activityId);
    if (!isOpen(activity, now())) throw new ApiError(409, 'ATIVIDADE_ENCERRADA', 'Esta atividade já foi encerrada.');
    await requireRateLimit(`progress:${participant.id}`, 15, 1, 'Progresso enviado há pouco.');
    await getRepository().updateLiveState(participant.id, live.value);
    return json({ ok: true });
  });

function studentView(activity: Activity, rows: Awaited<ReturnType<ReturnType<typeof getRepository>['listSubmissions']>>, participantId: string) {
  const ranked = rankingOf(activity, rows, false);
  const closed = isClosed(activity, now());
  const view = visibleToStudent(ranked, participantId, activity.config.rankingVisibility, closed, modeOf(activity));
  return {
    top: view.top.map(entryView),
    highlights: view.highlights ? highlightsView(ranked, activity) : null,
    own: view.own ? entryView(view.own) : null,
    participants: view.participants,
    closed,
  };
}

/** Envio do resultado: pontuação oficial recalculada pelo servidor */
export const submit = (request: Request) =>
  handle(async () => {
    const participant = await requireParticipant(request);
    const payload = validateSubmissionPayload(await readJson(request));
    if (!payload.ok) throw new ApiError(400, payload.code, payload.message);
    const activity = await participantActivity(participant, payload.value.activityId);
    const t = now();
    if (!isOpen(activity, t)) throw new ApiError(409, 'ATIVIDADE_ENCERRADA', 'Esta atividade já foi encerrada: o envio não foi aceito.');
    const repo = getRepository();
    const previous = (await repo.listSubmissions(activity.id)).filter((s) => s.participantId === participant.id);
    if (previous.length >= activity.config.maxAttempts) {
      throw new ApiError(409, 'LIMITE_DE_TENTATIVAS', `Você já usou as ${activity.config.maxAttempts} tentativas desta atividade.`);
    }
    await requireRateLimit(`submit:${participant.id}`, 20, 1, 'Espere 20 segundos entre um envio e outro.');

    const rebuilt = rebuildAssembly(payload.value.build);
    if (!rebuilt.ok) throw new ApiError(400, rebuilt.code, rebuilt.message);
    const result = scoreClassroomSubmission(activity.config, rebuilt.value, payload.value.build, payload.value.metrics);
    if (!result.ok) throw new ApiError(400, result.code, result.message);

    // Janela do servidor: desde a entrada na turma ou o início da atividade, o que for mais recente
    const since = Math.max(new Date(participant.joinedAt).getTime(), activity.startedAt ? new Date(activity.startedAt).getTime() : 0);
    const flags = plausibilityFlags(payload.value.metrics, { serverWindowSeconds: (t.getTime() - since) / 1000, buildBoots: result.value.buildBoots });
    const saved = await repo.saveSubmission({
      activityId: activity.id,
      participantId: participant.id,
      build: payload.value.build,
      metrics: payload.value.metrics,
      completed: result.value.score.completed,
      scoreTotal: result.value.score.total,
      breakdown: result.value.score,
      totalSpent: result.value.score.totalSpent,
      status: flags.length ? 'SINALIZADO' : 'VALIDO',
      flags,
    });
    const view = studentView(activity, await repo.listSubmissions(activity.id), participant.id);
    return json(
      {
        submissionId: saved.id,
        attemptNo: saved.attemptNo,
        attemptsLeft: activity.config.maxAttempts - saved.attemptNo,
        score: result.value.score,
        status: saved.status,
        flags: flags.map((f) => FLAG_LABELS[f] ?? f),
        ranking: view,
      },
      { status: 201 }
    );
  });

/** Top 10 público (quando a visibilidade permite), em cache curto na CDN */
export const publicRanking = (_request: Request, { params }: Params<'id'>) =>
  handle(async () => {
    const { id } = await params;
    const activity = await getRepository().getActivity(id);
    if (!activity) throw new ApiError(404, 'ATIVIDADE_NAO_ENCONTRADA', 'Atividade não encontrada.');
    const closed = isClosed(activity, now());
    const visible = activity.config.rankingVisibility === 'AO_VIVO' || (activity.config.rankingVisibility === 'AO_ENCERRAR' && closed);
    if (!visible) return json({ top: [], highlights: null, visible: false }, { cache: PUBLIC_RANKING_CACHE });
    const ranked = rankingOf(activity, await getRepository().listSubmissions(id), false);
    return json({ top: ranked.slice(0, 10).map(entryView), highlights: closed ? highlightsView(ranked, activity) : null, visible: true }, { cache: PUBLIC_RANKING_CACHE });
  });

/** Posição do próprio participante ("Você está em 4º de 27") */
export const myPosition = (request: Request) =>
  handle(async () => {
    const participant = await requireParticipant(request);
    const activity = await participantActivity(participant, new URL(request.url).searchParams.get('activityId'));
    const rows = await getRepository().listSubmissions(activity.id);
    const mine = rows.filter((r) => r.participantId === participant.id);
    return json({ ...studentView(activity, rows, participant.id), attemptsUsed: mine.length, attemptsLeft: Math.max(0, activity.config.maxAttempts - mine.length) });
  });
