import {
  AssemblyState,
  CaseComponent,
  CoolerComponent,
  CpuComponent,
  GpuComponent,
  HardwareComponent,
  MotherboardComponent,
  PsuComponent,
  RamComponent,
  StorageComponent,
} from './types';
import { CASES, COOLERS, CPUS, GPUS, MOTHERBOARDS, PSUS, RAMS, STORAGES } from './hardwareCatalog';
import { calculateBenchmark } from './benchmark';
import { calculateTotalSpent, calculateTotalTdp } from './compatibility';
import { CampaignMission, MissionObjective, buildMissionInitialState } from './campaign';
import { sha256Hex } from './validationCode';

/**
 * Motor puro do Modo Orçamento (#67; docs/modo-professor-turmas-ranking-orcamento.md, seção 6.3).
 * Decidir com dinheiro limitado: o que ganha não é gastar tudo, é desempenho por real
 * atendendo o cliente. Sem dependência de store/, server/ ou app/.
 */
export type BudgetProfileId = 'ESTUDOS' | 'ESCRITORIO' | 'JOGOS_1080P' | 'JOGOS_1440P' | 'CRIADOR' | 'PERSONALIZADO';
export type BudgetResolution = '1080p' | '1440p';

export interface BudgetRequirements {
  minRamGb: number;
  minStorageGb: number;
  storageType?: 'NVMe_M2' | 'SATA_SSD';
  /** Leitura mínima do disco (400 MB/s = qualquer SSD, exclui HD mecânico) */
  minReadMbps?: number;
  /** FPS mínimo na resolução do desafio */
  minFps?: number;
  requireDedicatedGpu: boolean;
  /** Temperatura máxima da CPU no benchmark (°C) */
  maxCpuTempC?: number;
}

export interface BudgetProfile {
  id: BudgetProfileId;
  title: string;
  client: { name: string; role: string; avatar: string };
  story: string;
  resolution: BudgetResolution;
  requirements: BudgetRequirements;
  bonus: MissionObjective[];
}

const SSD_READ_MBPS = 400;

export const BUDGET_PROFILES: Record<BudgetProfileId, BudgetProfile> = {
  ESTUDOS: {
    id: 'ESTUDOS',
    title: 'PC para Estudos',
    client: { name: 'Larissa', role: 'Estudante do EAD', avatar: '📚' },
    story: 'Preciso de um PC para as aulas on-line, trabalhos e pesquisa. Nada de jogos: só não pode travar.',
    resolution: '1080p',
    requirements: { minRamGb: 8, minStorageGb: 256, minReadMbps: SSD_READ_MBPS, requireDedicatedGpu: false },
    bonus: [{ kind: 'DUAL_CHANNEL' }, { kind: 'PSU_RECOMMENDED' }],
  },
  ESCRITORIO: {
    id: 'ESCRITORIO',
    title: 'PC da Secretaria',
    client: { name: 'Dona Célia', role: 'Secretaria da escola', avatar: '🗂️' },
    story: 'Planilhas, documentos e o sistema da escola abertos o dia todo. Precisa de espaço para os arquivos.',
    resolution: '1080p',
    requirements: { minRamGb: 8, minStorageGb: 500, minReadMbps: SSD_READ_MBPS, requireDedicatedGpu: false },
    bonus: [{ kind: 'NO_PENALTIES' }, { kind: 'PSU_RECOMMENDED' }],
  },
  JOGOS_1080P: {
    id: 'JOGOS_1080P',
    title: 'Gamer Iniciante',
    client: { name: 'Pedro', role: 'Gamer iniciante', avatar: '🎮' },
    story: 'Quero jogar os lançamentos em Full HD sem engasgar. Pelo menos 60 FPS!',
    resolution: '1080p',
    requirements: { minRamGb: 16, minStorageGb: 500, minReadMbps: SSD_READ_MBPS, minFps: 60, requireDedicatedGpu: false },
    bonus: [{ kind: 'DUAL_CHANNEL' }, { kind: 'BOTTLENECK_MAX', percent: 15 }],
  },
  JOGOS_1440P: {
    id: 'JOGOS_1440P',
    title: 'Gamer Competitivo',
    client: { name: 'Bia', role: 'Jogadora competitiva', avatar: '🏆' },
    story: 'Jogo em 1440p e os jogos ocupam muito espaço. Quero 60 FPS ou mais e um SSD NVMe grande.',
    resolution: '1440p',
    requirements: { minRamGb: 16, minStorageGb: 1000, storageType: 'NVMe_M2', minFps: 60, requireDedicatedGpu: false },
    bonus: [{ kind: 'BOTTLENECK_MAX', percent: 15 }, { kind: 'CPU_TEMP_MAX', celsius: 85 }],
  },
  CRIADOR: {
    id: 'CRIADOR',
    title: 'Ilha de Edição',
    client: { name: 'Camila', role: 'Editora de vídeo', avatar: '🎬' },
    story: 'Edito vídeos em 4K: muita memória, um NVMe rápido e um processador que não esquente.',
    resolution: '1080p',
    requirements: { minRamGb: 32, minStorageGb: 1000, storageType: 'NVMe_M2', requireDedicatedGpu: false, maxCpuTempC: 85 },
    bonus: [{ kind: 'DUAL_CHANNEL' }, { kind: 'PSU_RECOMMENDED' }],
  },
  PERSONALIZADO: {
    id: 'PERSONALIZADO',
    title: 'Pedido Personalizado',
    client: { name: 'Professor(a)', role: 'Cliente definido pela turma', avatar: '🧑‍🏫' },
    story: 'Requisitos definidos pelo professor para este desafio.',
    resolution: '1080p',
    requirements: { minRamGb: 8, minStorageGb: 256, requireDedicatedGpu: false },
    bonus: [{ kind: 'DUAL_CHANNEL' }, { kind: 'NO_PENALTIES' }],
  },
};

export const requirementsOf = (profile: BudgetProfileId): BudgetRequirements => BUDGET_PROFILES[profile].requirements;

/** Peças de uma montagem por id do catálogo */
export interface BuildIds {
  motherboardId: string;
  cpuId: string;
  ramId: string;
  ramSlots: (2 | 4)[];
  gpuId: string | null;
  coolerId: string;
  psuId: string;
  storageId: string;
  caseId: string;
}

export interface BudgetBuildSummary {
  build: BuildIds;
  cost: number;
  score: number;
  avgFps: number;
  bottleneckPercent: number;
}

export interface BudgetAnalysis {
  feasible: boolean;
  /** Custo do PC mais barato que atende os requisitos (Infinity se nenhum atende) */
  cheapestCost: number;
  cheapestBuild: BuildIds | null;
  /** Build de maior pontuação de benchmark com custo ≤ orçamento (null se inviável) */
  reference: BudgetBuildSummary | null;
  /** Custo do melhor PC possível sem limite de orçamento */
  ceilingCost: number;
  catalogRev: string;
}

export interface BudgetCatalog {
  cpus: CpuComponent[];
  motherboards: MotherboardComponent[];
  rams: RamComponent[];
  gpus: GpuComponent[];
  coolers: CoolerComponent[];
  psus: PsuComponent[];
  storages: StorageComponent[];
  cases: CaseComponent[];
}

export const FULL_CATALOG: BudgetCatalog = {
  cpus: CPUS,
  motherboards: MOTHERBOARDS,
  rams: RAMS,
  gpus: GPUS,
  coolers: COOLERS,
  psus: PSUS,
  storages: STORAGES,
  cases: CASES,
};

/** Montagem completa (ESD, pasta, cabos e parafusos) a partir dos ids */
export function buildAssemblyFromIds(ids: BuildIds): { assembly: AssemblyState; motherboard: MotherboardComponent | null } {
  return buildMissionInitialState({
    gameMode: 'MISSAO',
    prepared: 'FULL',
    installed: {
      motherboardId: ids.motherboardId,
      cpuId: ids.cpuId,
      ramId: ids.ramId,
      ramSlots: ids.ramSlots,
      gpuId: ids.gpuId ?? undefined,
      coolerId: ids.coolerId,
      psuId: ids.psuId,
      storageId: ids.storageId,
      caseId: ids.caseId,
    },
  });
}

export function storageMeets(storage: StorageComponent, req: BudgetRequirements): boolean {
  return (
    storage.capacityGb >= req.minStorageGb &&
    (req.storageType === undefined || storage.storageType === req.storageType) &&
    (req.minReadMbps === undefined || storage.readSpeedMbps >= req.minReadMbps)
  );
}

const byPrice = <T extends { price: number }>(list: T[]) => [...list].sort((a, b) => a.price - b.price);

/**
 * Busca exaustiva CPU × placa (soquete) × RAM (geração; 1 ou 2 pentes) × GPU (inclusive sem GPU
 * com vídeo integrado). Cooler, fonte, disco e gabinete: o mais barato que atende (guloso).
 */
export function analyzeBudget(
  budget: number,
  req: BudgetRequirements,
  resolution: BudgetResolution,
  catalog: BudgetCatalog = FULL_CATALOG
): BudgetAnalysis {
  const coolers = byPrice(catalog.coolers);
  const psus = byPrice(catalog.psus);
  const cases = byPrice(catalog.cases);
  const storage = byPrice(catalog.storages).find((s) => storageMeets(s, req)) ?? null;

  let cheapest: { cost: number; build: BuildIds } | null = null;
  let reference: BudgetBuildSummary | null = null;
  let ceiling: { score: number; cost: number } | null = null;

  if (storage) {
    for (const cpu of catalog.cpus) {
      const cooler = coolers.find((k) => k.supportedSockets.includes(cpu.socket) && k.maxTdpWatts >= cpu.tdpWatts);
      if (!cooler) continue;
      for (const mb of catalog.motherboards) {
        if (mb.socket !== cpu.socket) continue;
        for (const ram of catalog.rams) {
          if (ram.ramType !== mb.supportedRam) continue;
          const slotOptions: (2 | 4)[][] = ram.moduleCount >= 2 ? [[2, 4]] : [[2], [2, 4]];
          for (const ramSlots of slotOptions) {
            const ramGb = ram.moduleCount >= 2 ? ram.capacityGb : ram.capacityGb * ramSlots.length;
            if (ramGb < req.minRamGb) continue;
            const gpuOptions: (GpuComponent | null)[] = cpu.hasIntegratedGpu && !req.requireDedicatedGpu ? [null, ...catalog.gpus] : catalog.gpus;
            for (const gpu of gpuOptions) {
              const pcCase = cases.find((c) => c.supportedFormFactors.includes(mb.formFactor) && c.maxGpuLengthMm >= (gpu?.lengthMm ?? 0));
              if (!pcCase) continue;
              // Fonte: recomendação da GPU e 25% de folga sobre o consumo (as mesmas regras do POST)
              const probe: AssemblyState = buildAssemblyFromIds({
                motherboardId: mb.id, cpuId: cpu.id, ramId: ram.id, ramSlots, gpuId: gpu?.id ?? null,
                coolerId: cooler.id, psuId: psus[0].id, storageId: storage.id, caseId: pcCase.id,
              }).assembly;
              const needWatts = Math.max(gpu?.requiredPsuWatts ?? 0, calculateTotalTdp(probe, mb) * 1.25);
              const psu = psus.find((p) => p.wattage >= needWatts);
              if (!psu) continue;
              const assembly: AssemblyState = { ...probe, psuInstalled: psu };
              const bench = calculateBenchmark(assembly, mb, resolution);
              if (req.minFps !== undefined && bench.avgFps < req.minFps) continue;
              if (req.maxCpuTempC !== undefined && bench.cpuTempC > req.maxCpuTempC) continue;
              const cost = calculateTotalSpent(assembly, mb);
              const build: BuildIds = {
                motherboardId: mb.id, cpuId: cpu.id, ramId: ram.id, ramSlots, gpuId: gpu?.id ?? null,
                coolerId: cooler.id, psuId: psu.id, storageId: storage.id, caseId: pcCase.id,
              };
              if (!cheapest || cost < cheapest.cost) cheapest = { cost, build };
              if (!ceiling || bench.score > ceiling.score || (bench.score === ceiling.score && cost < ceiling.cost)) ceiling = { score: bench.score, cost };
              if (cost <= budget && (!reference || bench.score > reference.score || (bench.score === reference.score && cost < reference.cost))) {
                reference = { build, cost, score: bench.score, avgFps: bench.avgFps, bottleneckPercent: bench.bottleneckPercent };
              }
            }
          }
        }
      }
    }
  }

  return {
    feasible: reference !== null,
    cheapestCost: cheapest?.cost ?? Number.POSITIVE_INFINITY,
    cheapestBuild: cheapest?.build ?? null,
    reference,
    ceilingCost: ceiling?.cost ?? Number.POSITIVE_INFINITY,
    catalogRev: catalogRevision(catalog),
  };
}

/** Hash estável do catálogo (ids, preços e dados das regras): congela a referência do desafio */
export function catalogRevision(catalog: BudgetCatalog = FULL_CATALOG): string {
  const all = [
    ...catalog.cpus, ...catalog.motherboards, ...catalog.rams, ...catalog.gpus,
    ...catalog.coolers, ...catalog.psus, ...catalog.storages, ...catalog.cases,
  ];
  const fingerprint = all
    .map((p) => `${p.id}:${p.price}:${p.tdpWatts}`)
    .sort()
    .join('|');
  return sha256Hex(fingerprint).slice(0, 12);
}

export interface BudgetChallengeConfig {
  budget: number;
  profile: BudgetProfileId;
  /** Obrigatório no perfil PERSONALIZADO */
  requirements?: BudgetRequirements;
  resolution: BudgetResolution;
  /** Tempo-alvo (s): escolher peças leva mais tempo que montar (padrão 600) */
  targetTimeSeconds: number;
}

/** Objetivos obrigatórios do desafio a partir dos requisitos */
export function requirementObjectives(budget: number, req: BudgetRequirements, resolution: BudgetResolution): MissionObjective[] {
  const objectives: MissionObjective[] = [
    { kind: 'POST_OK' },
    { kind: 'BUDGET_MAX', value: budget },
    { kind: 'RAM_MIN_GB', gb: req.minRamGb },
    { kind: 'STORAGE_MIN', minGb: req.minStorageGb, minReadMbps: req.minReadMbps, storageType: req.storageType },
  ];
  if (req.minFps !== undefined) objectives.push({ kind: 'FPS_MIN', fps: req.minFps, resolution });
  if (req.maxCpuTempC !== undefined) objectives.push({ kind: 'CPU_TEMP_MAX', celsius: req.maxCpuTempC });
  return objectives;
}

/** Missão avaliada pelo evaluateMission existente (objetivos do perfil + POST + teto do orçamento) */
export function buildBudgetMission(config: BudgetChallengeConfig, analysis: BudgetAnalysis): CampaignMission {
  const profile = BUDGET_PROFILES[config.profile];
  const req = config.requirements ?? profile.requirements;
  const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`;
  return {
    id: `orcamento-${config.profile.toLowerCase()}-${config.budget}`,
    track: 'DESAFIO',
    order: 0,
    title: `Desafio de Orçamento: ${profile.title}`,
    lesson: 'Custo-benefício e gargalo com dinheiro limitado',
    client: profile.client,
    briefing: `${profile.story} Orçamento: ${fmt(config.budget)}. Tempo-alvo: ${Math.round(config.targetTimeSeconds / 60)} min.`,
    budgetMax: config.budget,
    setup: { gameMode: 'MISSAO' },
    objectives: requirementObjectives(config.budget, req, config.resolution),
    bonus: profile.bonus,
    trap: 'Gastar tudo numa placa de vídeo com processador fraco cria gargalo e derruba o custo-benefício.',
    debriefing: analysis.reference
      ? `A melhor montagem possível com ${fmt(config.budget)} custa ${fmt(analysis.reference.cost)} e faz ${analysis.reference.avgFps} FPS em ${config.resolution}.`
      : 'Este orçamento não atende o cliente.',
    question: {
      prompt: 'O que mais pesa no custo-benefício de um PC de jogos?',
      options: ['Gastar o orçamento inteiro', 'Equilibrar CPU e GPU para não ter gargalo', 'Comprar a fonte mais potente'],
      correctIndex: 1,
      explanation: 'Desempenho por real vem do equilíbrio: uma GPU cara presa por uma CPU fraca desperdiça dinheiro.',
    },
  };
}

/**
 * Gasto se a peça for instalada agora (#70, card "cabe no saldo"): troca a peça da mesma categoria;
 * pente avulso ocupa o slot livre (ou troca o do slot 2); kit dual ocupa os dois slots.
 * Pasta térmica não entra no orçamento da montagem (null = sem efeito no saldo).
 */
export function spentIfInstalled(
  component: HardwareComponent,
  assembly: AssemblyState,
  motherboard: MotherboardComponent | null
): number | null {
  let next = assembly;
  let mb = motherboard;
  switch (component.category) {
    case 'MOTHERBOARD':
      mb = component;
      break;
    case 'CPU':
      next = { ...assembly, cpuInstalled: component };
      break;
    case 'COOLER':
      next = { ...assembly, coolerInstalled: component };
      break;
    case 'GPU':
      next = { ...assembly, gpuInstalled: component };
      break;
    case 'STORAGE':
      next = { ...assembly, storageInstalled: component };
      break;
    case 'PSU':
      next = { ...assembly, psuInstalled: component };
      break;
    case 'CASE':
      next = { ...assembly, caseInstalled: component };
      break;
    case 'RAM':
      if (component.moduleCount >= 2) next = { ...assembly, ramInstalledSlot2: component, ramInstalledSlot4: component };
      else if (!assembly.ramInstalledSlot2) next = { ...assembly, ramInstalledSlot2: component };
      else if (!assembly.ramInstalledSlot4) next = { ...assembly, ramInstalledSlot4: component };
      else next = { ...assembly, ramInstalledSlot2: component };
      break;
    default:
      return null;
  }
  return calculateTotalSpent(next, mb);
}
