/**
 * Validação das entradas do Modo Professor (#72–#75). Pura: a API chama antes de gravar, e as
 * telas usam as mesmas regras para avisar o usuário antes de enviar.
 */
import { BUDGET_PROFILES, BudgetChallengeConfig, BudgetProfileId, BudgetRequirements } from '../budgetChallenge';
import { CampaignMission, MissionObjective } from '../campaign';
import { CAMPAIGN_MISSIONS, findMission } from '../campaignMissions';
import { DIAGNOSTIC_SCENARIOS } from '../diagnosticCases';
import { containsBlockedWord, looksLikeLink } from '../textFilter';
import { ActivityCommon, ActivityKind, BUILD_STEP_KEYS, BuildStepKey, LiveState, SubmissionBuild, SubmissionMetrics } from './types';

export type Result<T> = { ok: true; value: T } | { ok: false; code: string; message: string };
const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(code: string, message: string): Result<T> => ({ ok: false, code, message });

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const cleanText = (raw: string) => raw.normalize('NFC').replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------------------------
 * Professor
 * ------------------------------------------------------------------------------------ */
export function validateUsername(raw: unknown): Result<string> {
  if (typeof raw !== 'string') return fail('USUARIO_INVALIDO', 'Informe o usuário.');
  const username = raw.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return fail('USUARIO_INVALIDO', 'O usuário tem de 3 a 32 caracteres: letras sem acento, números, ponto, hífen ou sublinhado.');
  }
  return ok(username);
}

export const PASSWORD_MIN = 8;

export function validatePassword(raw: unknown): Result<string> {
  if (typeof raw !== 'string' || raw.length < PASSWORD_MIN) return fail('SENHA_CURTA', `A senha precisa de pelo menos ${PASSWORD_MIN} caracteres.`);
  if (raw.length > 128) return fail('SENHA_LONGA', 'A senha pode ter até 128 caracteres.');
  return ok(raw);
}

export function validatePersonName(raw: unknown, field = 'nome'): Result<string> {
  if (typeof raw !== 'string') return fail('NOME_INVALIDO', `Informe o ${field}.`);
  const name = cleanText(raw);
  if (name.length < 2 || name.length > 60) return fail('NOME_INVALIDO', `O ${field} tem de 2 a 60 caracteres.`);
  if (looksLikeLink(name)) return fail('NOME_INVALIDO', `O ${field} não pode ter endereços.`);
  return ok(name);
}

export const validateClassroomName = (raw: unknown) => validatePersonName(raw, 'nome da turma');

/* ------------------------------------------------------------------------------------
 * Aluno: apelido (LGPD: primeiro nome + bancada, nada obrigatório além disso)
 * ------------------------------------------------------------------------------------ */
export function validateDisplayName(raw: unknown): Result<string> {
  if (typeof raw !== 'string') return fail('APELIDO_INVALIDO', 'Escreva um apelido.');
  const name = cleanText(raw);
  if (name.length < 2 || name.length > 32) return fail('APELIDO_INVALIDO', 'O apelido tem de 2 a 32 caracteres (ex.: "Ana – Bancada 3").');
  if (looksLikeLink(name)) return fail('APELIDO_INVALIDO', 'O apelido não pode ter endereços nem @.');
  if (containsBlockedWord(name)) return fail('APELIDO_INVALIDO', 'Esse apelido não pode ser usado na turma.');
  return ok(name);
}

/* ------------------------------------------------------------------------------------
 * Atividades
 * ------------------------------------------------------------------------------------ */
/** Objetivos que dependem da mesa e dos periféricos: o envio da turma traz só a bancada */
const DESK_OBJECTIVES: MissionObjective['kind'][] = [
  'DESK_ITEMS',
  'DESK_STAGE',
  'EXTERNAL_CABLES',
  'MONITOR_SIGNAL',
  'MONITOR_REFRESH_COHERENT',
  'HEADSET',
  'PERIPHERAL_BUDGET_MAX',
];

/** Missões que a turma pode fazer: só as avaliáveis pela bancada (a mesa fica para depois) */
export function isClassroomMission(mission: CampaignMission): boolean {
  if (mission.track === 'DIAGNOSTICO' || mission.track === 'MESA') return false;
  return [...mission.objectives, ...mission.bonus].every((o) => !DESK_OBJECTIVES.includes(o.kind));
}

export const CLASSROOM_MISSIONS = CAMPAIGN_MISSIONS.filter(isClassroomMission);

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  MISSAO_CAMPANHA: 'Missão da campanha',
  DESAFIO_EQUIPE: 'Desafio em equipe',
  DIAGNOSTICO: 'Diagnóstico',
  ORCAMENTO: 'Desafio de Orçamento',
  OFICINA_LIVRE: 'Oficina livre (sem ranking)',
};

/** Atividade como o professor a pede; a referência do Modo Orçamento é calculada pelo servidor */
export type ActivityDraft =
  | ({ kind: 'MISSAO_CAMPANHA' | 'DESAFIO_EQUIPE'; missionId: string } & ActivityCommon & { title: string })
  | ({ kind: 'DIAGNOSTICO'; scenarioId: string } & ActivityCommon & { title: string })
  | ({ kind: 'ORCAMENTO'; budget: BudgetChallengeConfig } & ActivityCommon & { title: string })
  | ({ kind: 'OFICINA_LIVRE' } & ActivityCommon & { title: string });

const PROFILE_IDS = Object.keys(BUDGET_PROFILES) as BudgetProfileId[];

function validateRequirements(raw: unknown): Result<BudgetRequirements> {
  if (!isRecord(raw)) return fail('REQUISITOS_INVALIDOS', 'Informe os requisitos do cliente.');
  const { minRamGb, minStorageGb, storageType, minFps, requireDedicatedGpu } = raw;
  if (!isInt(minRamGb) || minRamGb < 4 || minRamGb > 128) return fail('REQUISITOS_INVALIDOS', 'RAM mínima entre 4 e 128 GB.');
  if (!isInt(minStorageGb) || minStorageGb < 64 || minStorageGb > 8000) return fail('REQUISITOS_INVALIDOS', 'Armazenamento mínimo entre 64 GB e 8 TB.');
  if (storageType !== undefined && storageType !== 'NVMe_M2' && storageType !== 'SATA_SSD') return fail('REQUISITOS_INVALIDOS', 'Tipo de armazenamento inválido.');
  if (minFps !== undefined && (!isInt(minFps) || minFps < 1 || minFps > 360)) return fail('REQUISITOS_INVALIDOS', 'FPS mínimo entre 1 e 360.');
  if (typeof requireDedicatedGpu !== 'boolean') return fail('REQUISITOS_INVALIDOS', 'Diga se a placa de vídeo dedicada é obrigatória.');
  return ok({
    minRamGb,
    minStorageGb,
    ...(storageType ? { storageType } : {}),
    ...(minFps !== undefined ? { minFps } : {}),
    requireDedicatedGpu,
  } as BudgetRequirements);
}

export function validateBudgetConfig(raw: unknown): Result<BudgetChallengeConfig> {
  if (!isRecord(raw)) return fail('ORCAMENTO_INVALIDO', 'Configure o Desafio de Orçamento.');
  const { budget, profile, requirements, resolution, targetTimeSeconds } = raw;
  if (!isInt(budget) || budget < 500 || budget > 50000) return fail('ORCAMENTO_INVALIDO', 'O orçamento vai de R$ 500 a R$ 50.000.');
  if (typeof profile !== 'string' || !PROFILE_IDS.includes(profile as BudgetProfileId)) return fail('ORCAMENTO_INVALIDO', 'Escolha o perfil do cliente.');
  if (resolution !== '1080p' && resolution !== '1440p') return fail('ORCAMENTO_INVALIDO', 'Resolução 1080p ou 1440p.');
  const target = targetTimeSeconds === undefined ? 600 : targetTimeSeconds;
  if (!isInt(target) || target < 120 || target > 3600) return fail('ORCAMENTO_INVALIDO', 'O tempo-alvo vai de 2 a 60 minutos.');
  const config: BudgetChallengeConfig = { budget, profile: profile as BudgetProfileId, resolution, targetTimeSeconds: target };
  if (profile === 'PERSONALIZADO') {
    const req = validateRequirements(requirements);
    if (!req.ok) return req;
    config.requirements = req.value;
  }
  return ok(config);
}

function validateCommon(raw: Record<string, unknown>): Result<ActivityCommon> {
  const { instructions, timeLimitSeconds, maxAttempts, attemptPolicy, rankingVisibility } = raw;
  if (instructions !== undefined && (typeof instructions !== 'string' || instructions.length > 280)) return fail('ATIVIDADE_INVALIDA', 'As instruções têm até 280 caracteres.');
  if (timeLimitSeconds !== undefined && (!isInt(timeLimitSeconds) || timeLimitSeconds < 60 || timeLimitSeconds > 4 * 3600)) {
    return fail('ATIVIDADE_INVALIDA', 'O tempo limite vai de 1 minuto a 4 horas.');
  }
  const attempts = maxAttempts === undefined ? 3 : maxAttempts;
  if (!isInt(attempts) || attempts < 1 || attempts > 10) return fail('ATIVIDADE_INVALIDA', 'Tentativas de 1 a 10.');
  const policy = attemptPolicy === undefined ? 'MELHOR' : attemptPolicy;
  if (policy !== 'MELHOR' && policy !== 'ULTIMO') return fail('ATIVIDADE_INVALIDA', 'Política de tentativas: melhor ou último envio.');
  const visibility = rankingVisibility === undefined ? 'AO_ENCERRAR' : rankingVisibility;
  if (visibility !== 'AO_VIVO' && visibility !== 'AO_ENCERRAR' && visibility !== 'SO_PROFESSOR') return fail('ATIVIDADE_INVALIDA', 'Visibilidade do ranking inválida.');
  return ok({
    ...(typeof instructions === 'string' && instructions.trim() ? { instructions: cleanText(instructions) } : {}),
    ...(timeLimitSeconds !== undefined ? { timeLimitSeconds: timeLimitSeconds as number } : {}),
    maxAttempts: attempts,
    attemptPolicy: policy,
    rankingVisibility: visibility,
  });
}

export function validateActivityInput(raw: unknown): Result<ActivityDraft> {
  if (!isRecord(raw)) return fail('ATIVIDADE_INVALIDA', 'Configure a atividade.');
  const common = validateCommon(raw);
  if (!common.ok) return common;
  const customTitle = typeof raw.title === 'string' && cleanText(raw.title).length >= 2 ? cleanText(raw.title).slice(0, 80) : null;

  switch (raw.kind) {
    case 'MISSAO_CAMPANHA':
    case 'DESAFIO_EQUIPE': {
      const mission = typeof raw.missionId === 'string' ? findMission(raw.missionId) : null;
      if (!mission) return fail('MISSAO_INVALIDA', 'Escolha uma missão da campanha.');
      if (raw.kind === 'DESAFIO_EQUIPE' && mission.track !== 'DESAFIO') return fail('MISSAO_INVALIDA', 'Desafio em equipe usa as missões da trilha Desafio.');
      if (!isClassroomMission(mission)) return fail('MISSAO_INVALIDA', 'Essa missão depende da mesa e dos periféricos e ainda não pode ser feita em turma.');
      return ok({ kind: raw.kind, missionId: mission.id, title: customTitle ?? mission.title, ...common.value });
    }
    case 'DIAGNOSTICO': {
      const id = raw.scenarioId;
      if (id !== 'SORTEADO' && !DIAGNOSTIC_SCENARIOS.some((s) => s.id === id)) return fail('CASO_INVALIDO', 'Escolha um caso de diagnóstico ou "sorteado".');
      const scenario = DIAGNOSTIC_SCENARIOS.find((s) => s.id === id);
      return ok({ kind: 'DIAGNOSTICO', scenarioId: id as string, title: customTitle ?? (scenario ? `Diagnóstico: ${scenario.title}` : 'Diagnóstico sorteado'), ...common.value });
    }
    case 'ORCAMENTO': {
      const budget = validateBudgetConfig(raw.budget);
      if (!budget.ok) return budget;
      const profile = BUDGET_PROFILES[budget.value.profile];
      return ok({ kind: 'ORCAMENTO', budget: budget.value, title: customTitle ?? `Orçamento: ${profile.title} (R$ ${budget.value.budget.toLocaleString('pt-BR')})`, ...common.value });
    }
    case 'OFICINA_LIVRE':
      return ok({ kind: 'OFICINA_LIVRE', title: customTitle ?? 'Oficina livre', ...common.value });
    default:
      return fail('ATIVIDADE_INVALIDA', 'Tipo de atividade desconhecido.');
  }
}

/* ------------------------------------------------------------------------------------
 * Aluno: progresso ao vivo e envio
 * ------------------------------------------------------------------------------------ */
export function validateLiveState(raw: unknown, now: Date): Result<LiveState> {
  if (!isRecord(raw)) return fail('PROGRESSO_INVALIDO', 'Progresso inválido.');
  const { activityId, phase, percent, spent, penalties } = raw;
  if (typeof activityId !== 'string' || !activityId) return fail('PROGRESSO_INVALIDO', 'Atividade ausente.');
  if (!isInt(phase) || phase < 0 || phase > 20) return fail('PROGRESSO_INVALIDO', 'Fase inválida.');
  if (typeof percent !== 'number' || percent < 0 || percent > 100) return fail('PROGRESSO_INVALIDO', 'Porcentagem inválida.');
  if (!isInt(spent) || spent < 0 || spent > 1_000_000) return fail('PROGRESSO_INVALIDO', 'Gasto inválido.');
  if (!isInt(penalties) || penalties < 0 || penalties > 1000) return fail('PROGRESSO_INVALIDO', 'Penalidades inválidas.');
  return ok({ activityId, phase, percent: Math.round(percent), spent, penalties, updatedAt: now.toISOString() });
}

const ID_FIELDS = ['motherboardId', 'cpuId', 'coolerId', 'ramSlot2Id', 'ramSlot4Id', 'storageId', 'caseId', 'psuId', 'gpuId'] as const;

export function validateSubmissionPayload(raw: unknown): Result<{ activityId: string; build: SubmissionBuild; metrics: SubmissionMetrics }> {
  if (!isRecord(raw) || typeof raw.activityId !== 'string') return fail('ENVIO_INVALIDO', 'Envio sem atividade.');
  const { build, metrics } = raw;
  if (!isRecord(build) || !isRecord(metrics)) return fail('ENVIO_INVALIDO', 'Envio incompleto.');
  const ids = {} as Record<(typeof ID_FIELDS)[number], string | null>;
  for (const field of ID_FIELDS) {
    const v = build[field];
    if (v !== null && v !== undefined && (typeof v !== 'string' || v.length > 80)) return fail('ENVIO_INVALIDO', 'Peça inválida no envio.');
    ids[field] = typeof v === 'string' ? v : null;
  }
  const rawSteps = isRecord(build.steps) ? build.steps : {};
  const steps = Object.fromEntries(BUILD_STEP_KEYS.map((k) => [k, rawSteps[k] === true])) as Record<BuildStepKey, boolean>;
  const { elapsedSeconds, penaltiesCount, errorLog, postAttempts } = metrics;
  if (!isInt(elapsedSeconds) || elapsedSeconds < 0 || elapsedSeconds > 24 * 3600) return fail('ENVIO_INVALIDO', 'Tempo inválido.');
  if (!isInt(penaltiesCount) || penaltiesCount < 0 || penaltiesCount > 1000) return fail('ENVIO_INVALIDO', 'Penalidades inválidas.');
  if (!isInt(postAttempts) || postAttempts < 0 || postAttempts > 1000) return fail('ENVIO_INVALIDO', 'Tentativas de POST inválidas.');
  if (!Array.isArray(errorLog) || errorLog.length > 200 || !errorLog.every((e) => typeof e === 'string' && e.length <= 200)) return fail('ENVIO_INVALIDO', 'Registro de erros inválido.');
  return ok({
    activityId: raw.activityId,
    build: { ...ids, steps, ...(typeof build.scenarioId === 'string' ? { scenarioId: build.scenarioId } : {}) },
    metrics: { elapsedSeconds, penaltiesCount, errorLog: errorLog as string[], postAttempts },
  });
}
