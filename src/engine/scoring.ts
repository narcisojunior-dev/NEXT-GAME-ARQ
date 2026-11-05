import { AssemblyState, MotherboardComponent } from './types';
import { calculateBenchmark } from './benchmark';
import { calculateTotalSpent } from './compatibility';
import { BudgetBuildSummary, BudgetResolution } from './budgetChallenge';

/**
 * Pontuação do Modo Orçamento (#68; docs/modo-professor-turmas-ranking-orcamento.md, seção 7.3).
 * Função pura: no servidor (Modo Professor) ela grava o valor oficial; no cliente é a prévia.
 *
 * | Parte           | Máx   | Cálculo                                                                    |
 * |-----------------|-------|----------------------------------------------------------------------------|
 * | Precisão        | 3.000 | max(500, 3000 − 500 × penalidades)                                          |
 * | Desempenho      | 3.000 | 3000 × min(1, pontuação ÷ pontuação da referência)                           |
 * | Custo-benefício | 2.000 | 2000 × min(1, (pontos ÷ gasto) ÷ (ref. pontos ÷ ref. custo)); estourou → 0   |
 * | Equilíbrio      | 1.000 | 1000 × fator de gargalo (1 até o limite, 0 trinta pontos acima)             |
 * | Velocidade      | 1.000 | 1000 × clamp((2T − t) ÷ T, 0, 1)                                            |
 *
 * Equilíbrio: o limite é 10% de gargalo ou o gargalo da própria referência, o que for maior.
 * Assim a referência montada sem penalidades no tempo-alvo soma exatamente 10.000 (critério da
 * #68) mesmo quando o melhor PC possível com aquele dinheiro já tem algum gargalo.
 */
export const BUDGET_SCORE_TABLE = {
  PRECISAO: 3000,
  DESEMPENHO: 3000,
  CUSTO_BENEFICIO: 2000,
  EQUILIBRIO: 1000,
  VELOCIDADE: 1000,
} as const;

export type BudgetScorePartKey = keyof typeof BUDGET_SCORE_TABLE;

export interface ScorePart {
  key: BudgetScorePartKey;
  label: string;
  points: number;
  max: number;
  explanation: string;
}

export interface BudgetScoreBreakdown {
  total: number;
  /** Objetivos obrigatórios cumpridos (POST, orçamento e requisitos do cliente) */
  completed: boolean;
  parts: ScorePart[];
  totalSpent: number;
  benchmark: { score: number; avgFps: number; bottleneckPercent: number };
}

export interface BudgetScoreInput {
  assembly: AssemblyState;
  motherboard: MotherboardComponent | null;
  penaltiesCount: number;
  elapsedSeconds: number;
  /** Resultado do evaluateMission (requisitos, POST e teto) */
  completed: boolean;
  budget: number;
  targetTimeSeconds: number;
  resolution: BudgetResolution;
  reference: BudgetBuildSummary;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function balanceFactor(bottleneckPercent: number, referenceBottleneckPercent: number): number {
  const limit = Math.max(10, referenceBottleneckPercent);
  return clamp01(1 - (bottleneckPercent - limit) / 30);
}

export function speedFactor(seconds: number, targetSeconds: number): number {
  const t = Math.max(1, targetSeconds);
  return clamp01((2 * t - seconds) / t);
}

export function scoreBudgetSubmission(input: BudgetScoreInput): BudgetScoreBreakdown {
  const { assembly, motherboard, reference: ref } = input;
  const bench = calculateBenchmark(assembly, motherboard, input.resolution);
  const spent = calculateTotalSpent(assembly, motherboard);
  const t = BUDGET_SCORE_TABLE;

  const precision = Math.max(500, t.PRECISAO - 500 * input.penaltiesCount);
  const performance = Math.round(t.DESEMPENHO * clamp01(bench.score / Math.max(1, ref.score)));
  const overBudget = spent > input.budget;
  const refRatio = ref.score / Math.max(1, ref.cost);
  const costBenefit =
    overBudget || spent <= 0 ? 0 : Math.round(t.CUSTO_BENEFICIO * clamp01(bench.score / spent / Math.max(1e-9, refRatio)));
  const balance = Math.round(t.EQUILIBRIO * balanceFactor(bench.bottleneckPercent, ref.bottleneckPercent));
  const speed = Math.round(t.VELOCIDADE * speedFactor(input.elapsedSeconds, input.targetTimeSeconds));
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`;

  const parts: ScorePart[] = [
    {
      key: 'PRECISAO',
      label: 'Precisão da montagem',
      points: precision,
      max: t.PRECISAO,
      explanation: `${input.penaltiesCount} penalidade(s) por encaixe errado ou forçado (−500 cada).`,
    },
    {
      key: 'DESEMPENHO',
      label: 'Desempenho',
      points: performance,
      max: t.DESEMPENHO,
      explanation: `${bench.score.toLocaleString('pt-BR')} pontos de benchmark contra ${ref.score.toLocaleString('pt-BR')} da melhor montagem possível.`,
    },
    {
      key: 'CUSTO_BENEFICIO',
      label: 'Custo-benefício',
      points: costBenefit,
      max: t.CUSTO_BENEFICIO,
      explanation: overBudget
        ? `Orçamento estourado em ${fmt(spent - input.budget)}.`
        : `${(bench.score / Math.max(1, spent)).toFixed(2)} pontos por real; a referência faz ${refRatio.toFixed(2)}.`,
    },
    {
      key: 'EQUILIBRIO',
      label: 'Equilíbrio CPU × GPU',
      points: balance,
      max: t.EQUILIBRIO,
      explanation: `Gargalo de ${bench.bottleneckPercent}% (referência: ${ref.bottleneckPercent}%).`,
    },
    {
      key: 'VELOCIDADE',
      label: 'Velocidade',
      points: speed,
      max: t.VELOCIDADE,
      explanation: `${Math.round(input.elapsedSeconds / 60)} min para um tempo-alvo de ${Math.round(input.targetTimeSeconds / 60)} min.`,
    },
  ];

  return {
    total: parts.reduce((sum, p) => sum + p.points, 0),
    completed: input.completed,
    parts,
    totalSpent: spent,
    benchmark: { score: bench.score, avgFps: bench.avgFps, bottleneckPercent: bench.bottleneckPercent },
  };
}

/* ------------------------------------------------------------------------------------
 * Desempate (usado pelo ranking, #69). Concluídos sempre antes; depois pontos ↓.
 * ------------------------------------------------------------------------------------ */
export interface RankableSubmission {
  completed: boolean;
  score: number;
  spent: number;
  penalties: number;
  timeSeconds: number;
  /** ISO 8601 */
  submittedAt: string;
}

const head = (a: RankableSubmission, b: RankableSubmission) => Number(b.completed) - Number(a.completed) || b.score - a.score;
const tail = (a: RankableSubmission, b: RankableSubmission) =>
  a.penalties - b.penalties || a.timeSeconds - b.timeSeconds || a.submittedAt.localeCompare(b.submittedAt);

/** Modo Orçamento: menor gasto → menos penalidades → menor tempo → envio mais antigo */
export const compareBudgetSubmissions = (a: RankableSubmission, b: RankableSubmission): number =>
  head(a, b) || a.spent - b.spent || tail(a, b);

/** Missões e desafios: menos penalidades → menor tempo → envio mais antigo */
export const compareMissionSubmissions = (a: RankableSubmission, b: RankableSubmission): number => head(a, b) || tail(a, b);
