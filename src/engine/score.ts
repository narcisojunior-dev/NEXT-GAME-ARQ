import { AssemblyState, ClientMission, GroupScore, MotherboardComponent } from './types';
import { calculateBenchmark, BenchmarkResult } from './benchmark';
import { calculateTotalSpent, evaluatePostTest, PostResult } from './compatibility';

/**
 * Pontuação final da bancada (#26, tabela no ADR-005). Função pura: o store só repassa o estado.
 *
 * | Bloco      | Máx.  | Regra                                                                          |
 * |------------|-------|--------------------------------------------------------------------------------|
 * | Precisão   | 4.000 | −500 por erro físico (mín. 500) e −250 por alerta de qualidade do POST          |
 * | Orçamento  | 2.500 | Sem missão: 2.500. Com missão: 1.500 + sobra proporcional; estourou = 0         |
 * | Benchmark  | 2.000 | 2.000 × (pontuação do benchmark ÷ meta) × (1 − gargalo), limitado a 2.000; sem boot = 0 |
 * | Velocidade | 1.500 | 5 pontos por segundo abaixo da meta de 300 s                                    |
 */
export const SCORE_TABLE = {
  precisionMax: 4000,
  precisionFloor: 500,
  penaltyPerError: 500,
  penaltyPerWarning: 250,
  budgetMax: 2500,
  budgetBase: 1500,
  budgetBonus: 1000,
  benchmarkMax: 2000,
  /** Meta de benchmark sem missão de cliente (a "máquina de jogos" padrão em 1080p) */
  defaultBenchmarkTarget: 8000,
  /** O gargalo tira no máximo metade dos pontos de benchmark */
  maxBottleneckLoss: 0.5,
  speedMax: 1500,
  speedTargetSeconds: 300,
  speedPerSecond: 5,
} as const;

export interface ScoreInput {
  assembly: AssemblyState;
  motherboard: MotherboardComponent | null;
  elapsedSeconds: number;
  penaltiesCount: number;
  mission: ClientMission | null;
  teamName: string;
}

export interface ScoreBreakdown extends Omit<GroupScore, 'hashValidation'> {
  /** Alertas do POST que tiraram pontos de qualidade (cooler fraco, fonte abaixo do recomendado...) */
  qualityWarnings: string[];
  benchmark: BenchmarkResult;
  bootSuccess: boolean;
}

/** POST da montagem como se a chave da fonte estivesse ligada: avalia a qualidade da máquina */
function postOf(assembly: AssemblyState, motherboard: MotherboardComponent | null): PostResult {
  return evaluatePostTest({ ...assembly, psuSwitchOn: true }, motherboard);
}

export function calculateGroupScore({ assembly, motherboard, elapsedSeconds, penaltiesCount, mission, teamName }: ScoreInput): ScoreBreakdown {
  const t = SCORE_TABLE;
  const post = postOf(assembly, motherboard);
  const qualityWarnings = post.issues.filter((i) => i.type === 'WARNING').map((i) => i.title);

  // Precisão: erros físicos e alertas de qualidade
  const precisionPoints = Math.max(
    0,
    Math.max(t.precisionFloor, t.precisionMax - penaltiesCount * t.penaltyPerError) - qualityWarnings.length * t.penaltyPerWarning
  );

  // Orçamento
  let budgetPoints: number = t.budgetMax;
  let budgetRemaining = 0;
  if (mission) {
    budgetRemaining = mission.budgetMax - calculateTotalSpent(assembly, motherboard);
    budgetPoints = budgetRemaining < 0 ? 0 : Math.round(t.budgetBase + (budgetRemaining / mission.budgetMax) * t.budgetBonus);
  }

  // Benchmark: o motor de desempenho (ADR-007) contra a meta da missão, descontando o gargalo
  const benchmark = calculateBenchmark(assembly, motherboard, '1080p');
  const target = mission?.targetBenchmarkScore ?? t.defaultBenchmarkTarget;
  const bottleneckLoss = Math.min(t.maxBottleneckLoss, Math.max(0, benchmark.bottleneckPercent) / 100);
  const benchmarkPoints = post.bootSuccess
    ? Math.round(Math.min(t.benchmarkMax, t.benchmarkMax * (Math.max(0, benchmark.score) / Math.max(1, target))) * (1 - bottleneckLoss))
    : 0;

  // Velocidade
  const speedPoints = Math.min(t.speedMax, Math.round(Math.max(0, t.speedTargetSeconds - elapsedSeconds) * t.speedPerSecond));

  return {
    teamName,
    totalScore: precisionPoints + budgetPoints + benchmarkPoints + speedPoints,
    precisionPoints,
    budgetPoints,
    benchmarkPoints,
    speedPoints,
    penaltyPoints: penaltiesCount * t.penaltyPerError,
    timeSpentSeconds: elapsedSeconds,
    budgetRemaining,
    qualityWarnings,
    benchmark,
    bootSuccess: post.bootSuccess,
  };
}
