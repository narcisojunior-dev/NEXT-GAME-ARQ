/**
 * Envio de resultado da turma (#75): o servidor recebe só ids do catálogo, as etapas da montagem
 * e as métricas; reconstrói as peças pelo catálogo (preço e desempenho não podem ser forjados),
 * recalcula a pontuação oficial e confere se tempo e erros são plausíveis. Puro.
 */
import { AssemblyState, HardwareComponent, MotherboardComponent } from '../types';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';
import { BudgetAnalysis, buildBudgetMission } from '../budgetChallenge';
import { CampaignMission, MissionSession, calculateMissionSpent, evaluateMission, findCatalogComponent } from '../campaign';
import { findMission } from '../campaignMissions';
import { evaluatePostTest, validateRamType, validateSocket, validateCoolerSocket } from '../compatibility';
import { DIAGNOSTIC_SCENARIOS } from '../diagnosticCases';
import { calculateGroupScore } from '../score';
import { scoreBudgetSubmission } from '../scoring';
import { createInitialExternalCablesState } from '../externalCabling';
import { DEFAULT_STUDENT_SETUP } from '../peripheralsCatalog';
import { ActivityConfig, BUILD_STEP_KEYS, OfficialScore, SubmissionBuild, SubmissionMetrics } from './types';
import { Result } from './validation';

const fail = <T>(code: string, message: string): Result<T> => ({ ok: false, code, message });

type Category = HardwareComponent['category'];

function partOf<C extends Category>(id: string | null, category: C): Result<Extract<HardwareComponent, { category: C }> | null> {
  if (!id) return { ok: true, value: null };
  const part = findCatalogComponent(id);
  if (!part) return fail('PECA_DESCONHECIDA', `Peça desconhecida no envio: ${id}.`);
  if (part.category !== category) return fail('PECA_INVALIDA', `${part.name} não é ${category}.`);
  return { ok: true, value: part as Extract<HardwareComponent, { category: C }> };
}

export interface RebuiltBuild {
  assembly: AssemblyState;
  motherboard: MotherboardComponent | null;
}

/** Reconstrói a montagem a partir dos ids; recusa montagens fisicamente impossíveis */
export function rebuildAssembly(build: SubmissionBuild): Result<RebuiltBuild> {
  const mb = partOf(build.motherboardId, 'MOTHERBOARD');
  const cpu = partOf(build.cpuId, 'CPU');
  const cooler = partOf(build.coolerId, 'COOLER');
  const ram2 = partOf(build.ramSlot2Id, 'RAM');
  const ram4 = partOf(build.ramSlot4Id, 'RAM');
  const storage = partOf(build.storageId, 'STORAGE');
  const pcCase = partOf(build.caseId, 'CASE');
  const psu = partOf(build.psuId, 'PSU');
  const gpu = partOf(build.gpuId, 'GPU');
  for (const r of [mb, cpu, cooler, ram2, ram4, storage, pcCase, psu, gpu]) if (!r.ok) return r;
  if (!mb.ok || !cpu.ok || !cooler.ok || !ram2.ok || !ram4.ok || !storage.ok || !pcCase.ok || !psu.ok || !gpu.ok) return fail('ENVIO_INVALIDO', 'Envio inválido.');

  const motherboard = mb.value;
  const impossible = (message: string) => fail<RebuiltBuild>('MONTAGEM_IMPOSSIVEL', message);
  if (!motherboard && (cpu.value || ram2.value || ram4.value || gpu.value)) return impossible('Há peças na placa-mãe, mas nenhuma placa-mãe.');
  if (cooler.value && !cpu.value) return impossible('Há cooler instalado sem processador.');
  if (motherboard && cpu.value && validateSocket(cpu.value, motherboard)) return impossible(`${cpu.value.name} não encaixa no soquete da ${motherboard.name}.`);
  if (motherboard) {
    for (const ram of [ram2.value, ram4.value]) if (ram && validateRamType(ram, motherboard)) return impossible(`${ram.name} não encaixa nos slots da ${motherboard.name}.`);
  }
  if (cooler.value && cpu.value && validateCoolerSocket(cooler.value, cpu.value)) return impossible(`${cooler.value.name} não fixa no soquete do processador.`);

  const steps = Object.fromEntries(BUILD_STEP_KEYS.map((k) => [k, build.steps[k]])) as Pick<AssemblyState, (typeof BUILD_STEP_KEYS)[number]>;
  const assembly: AssemblyState = {
    ...INITIAL_ASSEMBLY_STATE,
    ...steps,
    cpuInstalled: cpu.value,
    coolerInstalled: cooler.value,
    ramInstalledSlot2: ram2.value,
    ramInstalledSlot4: ram4.value,
    storageInstalled: storage.value,
    caseInstalled: pcCase.value,
    psuInstalled: psu.value,
    gpuInstalled: gpu.value,
  };
  return { ok: true, value: { assembly, motherboard } };
}

/* ------------------------------------------------------------------------------------
 * Plausibilidade: o que só o cliente conhece (tempo e penalidades) é conferido, não descartado
 * ------------------------------------------------------------------------------------ */
export const MIN_BUILD_SECONDS = 45;
export const TIME_TOLERANCE_SECONDS = 60;

export function plausibilityFlags(metrics: SubmissionMetrics, ctx: { serverWindowSeconds: number; buildBoots: boolean }): string[] {
  const flags: string[] = [];
  if (metrics.elapsedSeconds > ctx.serverWindowSeconds + TIME_TOLERANCE_SECONDS) flags.push('TEMPO_INCOERENTE');
  if (ctx.buildBoots && metrics.elapsedSeconds < MIN_BUILD_SECONDS) flags.push('TEMPO_IMPOSSIVEL');
  return flags;
}

export const FLAG_LABELS: Record<string, string> = {
  TEMPO_INCOERENTE: 'O tempo informado é maior que o tempo desde a entrada na turma',
  TEMPO_IMPOSSIVEL: 'Montagem completa em menos de 45 segundos',
};

/* ------------------------------------------------------------------------------------
 * Pontuação oficial por tipo de atividade
 * ------------------------------------------------------------------------------------ */
function sessionOf(rebuilt: RebuiltBuild, metrics: SubmissionMetrics, mission: CampaignMission | null): MissionSession {
  return {
    assembly: rebuilt.assembly,
    motherboard: rebuilt.motherboard,
    elapsedSeconds: metrics.elapsedSeconds,
    penaltiesCount: metrics.penaltiesCount,
    errorLog: metrics.errorLog,
    postAttempts: metrics.postAttempts,
    clientPartIds: mission?.setup.clientPartIds ?? [],
    placedDeskItems: {},
    externalCabling: createInitialExternalCablesState(),
    isDeskPoweredOn: false,
    resolvedScenarioIds: [],
    studentSetup: DEFAULT_STUDENT_SETUP,
  };
}

/** Pontuação das missões, desafios e diagnóstico (#26), com a meta da missão quando houver */
function groupScore(rebuilt: RebuiltBuild, metrics: SubmissionMetrics, mission: CampaignMission | null, completed: boolean, stars: 0 | 1 | 2 | 3): OfficialScore {
  const scoreMin = mission?.objectives.find((o) => o.kind === 'SCORE_MIN');
  const s = calculateGroupScore({
    assembly: rebuilt.assembly,
    motherboard: rebuilt.motherboard,
    elapsedSeconds: metrics.elapsedSeconds,
    penaltiesCount: metrics.penaltiesCount,
    mission: mission?.budgetMax
      ? {
          id: mission.id,
          clientName: mission.client.name,
          clientRole: mission.client.role,
          clientAvatar: mission.client.avatar,
          title: mission.title,
          description: mission.briefing,
          budgetMax: mission.budgetMax,
          targetBenchmarkScore: scoreMin && scoreMin.kind === 'SCORE_MIN' ? scoreMin.score : 0,
          requiredRamGb: 0,
          requiredStorageGb: 0,
          needsDedicatedGpu: false,
        }
      : null,
    teamName: '',
  });
  const spent = calculateMissionSpent(rebuilt.assembly, rebuilt.motherboard, mission?.setup.clientPartIds ?? []);
  return {
    total: s.totalScore,
    completed,
    parts: [
      { key: 'precisao', label: 'Precisão', points: s.precisionPoints, max: 4000, explanation: `${metrics.penaltiesCount} penalidade(s) e ${s.qualityWarnings.length} alerta(s) do POST.` },
      { key: 'orcamento', label: 'Orçamento', points: s.budgetPoints, max: 2500, explanation: mission?.budgetMax ? `Saldo de R$ ${s.budgetRemaining.toLocaleString('pt-BR')}.` : 'Sem limite de orçamento.' },
      { key: 'desempenho', label: 'Desempenho e equilíbrio', points: s.benchmarkPoints, max: 2000, explanation: `Benchmark ${Math.round(s.benchmark.score)} com gargalo de ${Math.round(s.benchmark.bottleneckPercent)}%.` },
      { key: 'velocidade', label: 'Velocidade', points: s.speedPoints, max: 1500, explanation: `${Math.round(metrics.elapsedSeconds / 60)} min de montagem.` },
    ],
    totalSpent: spent,
    benchmark: { score: Math.round(s.benchmark.score), avgFps: Math.round(s.benchmark.avgFps), bottleneckPercent: Math.round(s.benchmark.bottleneckPercent) },
    stars,
  };
}

export interface OfficialResult {
  score: OfficialScore;
  buildBoots: boolean;
}

export function scoreClassroomSubmission(config: ActivityConfig, rebuilt: RebuiltBuild, build: SubmissionBuild, metrics: SubmissionMetrics): Result<OfficialResult> {
  const buildBoots = evaluatePostTest({ ...rebuilt.assembly, psuSwitchOn: true }, rebuilt.motherboard).bootSuccess;
  switch (config.kind) {
    case 'ORCAMENTO': {
      const b = config.budget;
      const analysis: BudgetAnalysis = {
        feasible: true,
        cheapestCost: b.cheapestCost,
        cheapestBuild: null,
        reference: b.reference,
        ceilingCost: b.ceilingCost,
        catalogRev: '',
      };
      const mission = buildBudgetMission(b, analysis);
      const evaluation = evaluateMission(mission, sessionOf(rebuilt, metrics, mission));
      const s = scoreBudgetSubmission({
        assembly: rebuilt.assembly,
        motherboard: rebuilt.motherboard,
        penaltiesCount: metrics.penaltiesCount,
        elapsedSeconds: metrics.elapsedSeconds,
        completed: evaluation.completed,
        budget: b.budget,
        targetTimeSeconds: b.targetTimeSeconds,
        resolution: b.resolution,
        reference: b.reference,
      });
      return { ok: true, value: { buildBoots, score: { ...s, stars: evaluation.completed ? evaluation.stars : 0 } } };
    }
    case 'MISSAO_CAMPANHA':
    case 'DESAFIO_EQUIPE': {
      const mission = findMission(config.missionId);
      if (!mission) return fail('MISSAO_INVALIDA', 'A missão desta atividade não existe mais.');
      const evaluation = evaluateMission(mission, sessionOf(rebuilt, metrics, mission));
      return { ok: true, value: { buildBoots, score: groupScore(rebuilt, metrics, mission, evaluation.completed, evaluation.completed ? evaluation.stars : 0) } };
    }
    case 'DIAGNOSTICO': {
      const id = config.scenarioId === 'SORTEADO' ? build.scenarioId : config.scenarioId;
      const scenario = DIAGNOSTIC_SCENARIOS.find((s) => s.id === id);
      if (!scenario) return fail('CASO_INVALIDO', 'Informe o caso de diagnóstico que você resolveu.');
      const resolved = Boolean(rebuilt.motherboard && scenario.isResolved(rebuilt.assembly, rebuilt.motherboard));
      const completed = resolved && buildBoots;
      return { ok: true, value: { buildBoots, score: groupScore(rebuilt, metrics, null, completed, completed ? (metrics.penaltiesCount === 0 ? 3 : 2) : 0) } };
    }
    case 'OFICINA_LIVRE':
      return fail('ATIVIDADE_SEM_RANKING', 'A oficina livre não tem envio nem ranking: é só para praticar.');
  }
}
