import { DIAGNOSTIC_CAUSES, DiagnosticCauseId, DiagnosticScenario } from './diagnosticCases';

/**
 * Modo detetive do diagnóstico (#32), puro e determinístico (sorteio por semente):
 * 1. o aluno lê o chamado e registra a hipótese da causa ANTES de abrir a máquina;
 * 2. cada hipótese errada, cada tentativa de ligar que falha e a dica reduzem o valor do chamado;
 * 3. a ordem dos chamados e a forma como o cliente descreve o sintoma são sorteadas.
 */
export type DetectivePhase = 'HYPOTHESIS' | 'INVESTIGATING' | 'SOLVED';

export interface DetectiveRecord {
  scenarioId: string;
  /** Índice do relato sorteado (0 = relato original; 1.. = symptomVariants) */
  variant: number;
  hypothesis: DiagnosticCauseId | null;
  wrongHypotheses: number;
  failedBoots: number;
  hintUsed: boolean;
  /** Pontos ganhos ao resolver (null enquanto aberto) */
  points: number | null;
}

export const DETECTIVE_RULES = {
  wrongHypothesisLoss: 0.25,
  failedBootLoss: 0.15,
  hintLoss: 0.2,
  /** O chamado resolvido vale no mínimo 20% da recompensa */
  floor: 0.2,
  optionsCount: 4,
} as const;

/** PRNG mulberry32: mesma semente, mesmo sorteio (reprodutível em teste e em sala) */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const hashString = (text: string) => [...text].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

/** Ordem dos chamados sorteada pela semente */
export function drawCaseOrder(scenarioIds: readonly string[], seed: number): string[] {
  return shuffle(scenarioIds, createRng(seed));
}

/** Relato do cliente sorteado para este chamado */
export function drawVariant(scenario: DiagnosticScenario, seed: number): number {
  return Math.floor(createRng(seed ^ hashString(scenario.id))() * (scenario.symptomVariants.length + 1));
}

export function symptomFor(scenario: DiagnosticScenario, variant: number): string {
  return variant === 0 ? scenario.symptomSummary : scenario.symptomVariants[variant - 1] ?? scenario.symptomSummary;
}

/** Alternativas da hipótese: a causa real e distratores, embaralhados pela semente */
export function hypothesisOptions(scenario: DiagnosticScenario, seed: number): DiagnosticCauseId[] {
  const rng = createRng(seed ^ hashString(`${scenario.id}:opcoes`));
  const others = shuffle(
    (Object.keys(DIAGNOSTIC_CAUSES) as DiagnosticCauseId[]).filter((c) => c !== scenario.cause),
    rng
  ).slice(0, DETECTIVE_RULES.optionsCount - 1);
  return shuffle([scenario.cause, ...others], rng);
}

export function startRecord(scenario: DiagnosticScenario, seed: number): DetectiveRecord {
  return {
    scenarioId: scenario.id,
    variant: drawVariant(scenario, seed),
    hypothesis: null,
    wrongHypotheses: 0,
    failedBoots: 0,
    hintUsed: false,
    points: null,
  };
}

export function phaseOf(record: DetectiveRecord | undefined): DetectivePhase {
  if (!record || (record.hypothesis === null && record.points === null)) return 'HYPOTHESIS';
  return record.points === null ? 'INVESTIGATING' : 'SOLVED';
}

/** Registra a hipótese: certa libera a bancada; errada custa pontos e mantém a bancada lacrada */
export function submitHypothesis(
  record: DetectiveRecord,
  scenario: DiagnosticScenario,
  cause: DiagnosticCauseId
): { record: DetectiveRecord; correct: boolean } {
  if (phaseOf(record) !== 'HYPOTHESIS') return { record, correct: record.hypothesis === scenario.cause };
  const correct = cause === scenario.cause;
  return {
    correct,
    record: correct ? { ...record, hypothesis: cause } : { ...record, wrongHypotheses: record.wrongHypotheses + 1 },
  };
}

export const registerFailedBoot = (record: DetectiveRecord): DetectiveRecord =>
  phaseOf(record) === 'SOLVED' ? record : { ...record, failedBoots: record.failedBoots + 1 };

export const registerHint = (record: DetectiveRecord): DetectiveRecord => ({ ...record, hintUsed: true });

/** Valor atual do chamado (o que o aluno ganha se resolver agora) */
export function detectiveScore(scenario: DiagnosticScenario, record: DetectiveRecord): number {
  const r = DETECTIVE_RULES;
  const factor = Math.max(
    r.floor,
    1 - record.wrongHypotheses * r.wrongHypothesisLoss - record.failedBoots * r.failedBootLoss - (record.hintUsed ? r.hintLoss : 0)
  );
  return Math.round(scenario.rewardPoints * factor);
}

export function solveRecord(record: DetectiveRecord, scenario: DiagnosticScenario): DetectiveRecord {
  if (record.points !== null) return record;
  return { ...record, hypothesis: record.hypothesis ?? scenario.cause, points: detectiveScore(scenario, record) };
}
