/**
 * Campanha de missões sequenciais (#43, #44, #27).
 * Modelo declarativo: cada missão tem objetivos obrigatórios e bônus avaliados por uma função
 * pura sobre um retrato da sessão (montagem, gastos, erros, mesa, cabos externos...).
 */
import {
  AssemblyPhase,
  AssemblyState,
  CaseComponent,
  ComponentCategory,
  CoolerComponent,
  CpuComponent,
  CpuSocket,
  GpuComponent,
  HardwareComponent,
  MotherboardComponent,
  PsuComponent,
  RamComponent,
  RamType,
  StorageComponent,
  StorageType,
} from './types';
import { INITIAL_ASSEMBLY_STATE } from './assemblyState';
import { derivePhase } from './phases';
import { calculateTotalSpent, evaluatePostTest, validateCoolerCapacity, validateCaseFormFactor, validateGpuLength } from './compatibility';
import { calculateBenchmark } from './benchmark';
import {
  CASES,
  COOLERS,
  CPUS,
  GPUS,
  MOTHERBOARDS,
  PSUS,
  RAMS,
  STORAGES,
} from './hardwareCatalog';
import { DeskSnapPointId, DeskStage, PlacedDeskItem, deriveDeskStage } from './deskSetup';
import { ExternalCableId, ExternalCablingState, evaluateExternalCablesStatus } from './externalCabling';
import { deriveMonitorScreen } from './monitorScreen';
import { MONITORS, StudentSetupConfig } from './peripheralsCatalog';

/* ====================================================================================
 * Tipos
 * ==================================================================================== */
export type CampaignTrackId = 'JORNADA' | 'OFICINA' | 'DIAGNOSTICO' | 'MESA' | 'DESAFIO';
export type CampaignGameMode = 'OFICINA' | 'MISSAO' | 'DESAFIO' | 'DIAGNOSTICO';

export type MissionObjective =
  | { kind: 'POST_OK' }
  | { kind: 'POST_FIRST_TRY' }
  | { kind: 'PHASE_REACHED'; phase: AssemblyPhase }
  | { kind: 'CABLES_COMPLETE' }
  | { kind: 'NO_ERROR'; errorTitleIncludes: string; label: string }
  | { kind: 'BUDGET_MAX'; value: number }
  | { kind: 'SOCKET'; socket: CpuSocket }
  | { kind: 'RAM_TYPE'; ramType: RamType }
  | { kind: 'RAM_MIN_GB'; gb: number }
  | { kind: 'DUAL_CHANNEL' }
  | { kind: 'STORAGE_MIN'; minGb: number; minReadMbps?: number; storageType?: StorageType }
  | { kind: 'INTEGRATED_VIDEO' }
  | { kind: 'FPS_MIN'; fps: number; resolution: '1080p' | '1440p' }
  | { kind: 'SCORE_MIN'; score: number }
  | { kind: 'BOTTLENECK_MAX'; percent: number }
  | { kind: 'CPU_TEMP_MAX'; celsius: number }
  | { kind: 'PSU_RECOMMENDED' }
  | { kind: 'COOLER_OK' }
  | { kind: 'FITS_CASE' }
  | { kind: 'NO_PENALTIES' }
  | { kind: 'MAX_PENALTIES'; count: number }
  | { kind: 'TIME_MAX'; seconds: number }
  | { kind: 'DIAGNOSTIC_RESOLVED'; scenarioId: string }
  | { kind: 'DESK_ITEMS'; snapPoints: DeskSnapPointId[] }
  | { kind: 'DESK_STAGE'; stage: DeskStage }
  | { kind: 'EXTERNAL_CABLES'; cables: ExternalCableId[] }
  | { kind: 'MONITOR_SIGNAL' }
  | { kind: 'MONITOR_REFRESH_COHERENT'; maxRatio: number }
  | { kind: 'HEADSET' }
  | { kind: 'PERIPHERAL_BUDGET_MAX'; value: number };

export interface MissionQuestion {
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

/** Peças instaladas no início (ids do catálogo) */
export interface MissionPartsPreset {
  motherboardId?: string;
  cpuId?: string;
  coolerId?: string;
  ramId?: string;
  /** Slots ocupados pela RAM (kit dual = [2, 4]) */
  ramSlots?: (2 | 4)[];
  storageId?: string;
  gpuId?: string;
  psuId?: string;
  caseId?: string;
}

export interface MissionSetup {
  gameMode: CampaignGameMode;
  /** Peças já instaladas ao começar */
  installed?: MissionPartsPreset;
  /** Montagem já preparada: ESD, pasta, alavanca, espaçadores, parafusos e cabos */
  prepared?: 'NONE' | 'NO_CABLES' | 'FULL';
  /** Peças do cliente: custo zero no orçamento (aparecem com a etiqueta "Do cliente") */
  clientPartIds?: string[];
  /** Categorias que o aluno pode comprar (ausente = catálogo inteiro) */
  purchasableCategories?: ComponentCategory[];
  /** Caso do modo diagnóstico carregado na bancada */
  diagnosticScenarioId?: string;
  /** Mesa: itens já posicionados e cabos já ligados; abre a visão da mesa */
  desk?: {
    placed: DeskSnapPointId[];
    cables?: Partial<ExternalCablingState['connections']>;
  };
  /** Esconde o checklist e o tutor (prova final) */
  hideHelpers?: boolean;
}

export interface CampaignMission {
  id: string;
  track: CampaignTrackId;
  order: number;
  act?: number;
  title: string;
  lesson: string;
  client: { name: string; role: string; avatar: string };
  briefing: string;
  budgetMax?: number;
  setup: MissionSetup;
  objectives: MissionObjective[];
  bonus: MissionObjective[];
  /** Explicação da armadilha (exibida no debriefing) */
  trap: string;
  debriefing: string;
  question: MissionQuestion;
}

export interface CampaignTrack {
  id: CampaignTrackId;
  title: string;
  description: string;
  icon: string;
}

/** Retrato da sessão que a avaliação lê (montado a partir do store) */
export interface MissionSession {
  assembly: AssemblyState;
  motherboard: MotherboardComponent | null;
  elapsedSeconds: number;
  penaltiesCount: number;
  /** Títulos dos erros cometidos (alertas de erro) */
  errorLog: string[];
  postAttempts: number;
  clientPartIds: string[];
  placedDeskItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>;
  externalCabling: ExternalCablingState;
  isDeskPoweredOn: boolean;
  resolvedScenarioIds: string[];
  studentSetup: StudentSetupConfig;
}

export interface ObjectiveResult {
  objective: MissionObjective;
  met: boolean;
  label: string;
  /** Explicação didática quando não foi cumprido */
  explanation?: string;
}

export interface MissionEvaluation {
  completed: boolean;
  required: ObjectiveResult[];
  bonus: ObjectiveResult[];
  stars: 0 | 1 | 2 | 3;
  totalSpent: number;
}

/* ====================================================================================
 * Gastos: peças do cliente não entram no orçamento
 * ==================================================================================== */
export function calculateMissionSpent(
  assembly: AssemblyState,
  motherboard: MotherboardComponent | null,
  clientPartIds: string[]
): number {
  const client = new Set(clientPartIds);
  const own = <T extends { id: string }>(part: T | null): T | null => (part && !client.has(part.id) ? part : null);
  return calculateTotalSpent(
    {
      ...assembly,
      cpuInstalled: own(assembly.cpuInstalled),
      coolerInstalled: own(assembly.coolerInstalled),
      ramInstalledSlot2: own(assembly.ramInstalledSlot2),
      ramInstalledSlot4: own(assembly.ramInstalledSlot4),
      storageInstalled: own(assembly.storageInstalled),
      gpuInstalled: own(assembly.gpuInstalled),
      psuInstalled: own(assembly.psuInstalled),
      caseInstalled: own(assembly.caseInstalled),
    },
    own(motherboard)
  );
}

/** Capacidade de RAM considerando kits (kit dual ocupa os dois slots com a capacidade total) */
export function totalRamGb(assembly: AssemblyState): number {
  const a = assembly.ramInstalledSlot2;
  const b = assembly.ramInstalledSlot4;
  if (a && b && a.id === b.id && a.moduleCount === 2) return a.capacityGb;
  return (a?.capacityGb ?? 0) + (b?.capacityGb ?? 0);
}

/** Taxa de atualização do monitor escolhido (Hz), lida do nome do catálogo */
export function monitorRefreshHz(monitorId: string): number {
  const monitor = MONITORS.find((m) => m.id === monitorId);
  const match = monitor ? /(\d{2,3})\s*Hz/i.exec(monitor.name) : null;
  return match ? Number(match[1]) : 60;
}

/* ====================================================================================
 * Avaliação pura
 * ==================================================================================== */
export function evaluateMission(mission: CampaignMission, session: MissionSession): MissionEvaluation {
  const { assembly, motherboard } = session;
  const post = evaluatePostTest({ ...assembly, psuSwitchOn: true }, motherboard);
  const bench1080 = calculateBenchmark(assembly, motherboard, '1080p');
  const totalSpent = calculateMissionSpent(assembly, motherboard, session.clientPartIds);
  const phase = derivePhase(assembly, motherboard);
  const cablesStatus = evaluateExternalCablesStatus(session.externalCabling, assembly);
  const deskStage = deriveDeskStage({
    assembly,
    selectedMotherboard: motherboard,
    deskSetup: { placedDeskItems: session.placedDeskItems, isDeskPoweredOn: session.isDeskPoweredOn, deskCameraPreset: 'setup-wide' },
    isDeskPoweredOn: session.isDeskPoweredOn,
    externalCablesStatus: cablesStatus,
    postBootSuccess: post.bootSuccess,
  });

  const check = (o: MissionObjective): ObjectiveResult => {
    const r = (met: boolean, label: string, explanation: string): ObjectiveResult => ({
      objective: o,
      met,
      label,
      explanation: met ? undefined : explanation,
    });
    switch (o.kind) {
      case 'POST_OK':
        return r(
          post.bootSuccess,
          'POST aprovado (o PC liga e chega ao sistema)',
          post.issues.find((i) => i.type === 'ERROR')?.message ?? 'Monte o PC completo e ligue-o para o teste de POST.'
        );
      case 'POST_FIRST_TRY':
        return r(post.bootSuccess && session.postAttempts <= 1, 'POST aprovado na primeira tentativa', 'Revise toda a montagem antes de apertar o botão de ligar.');
      case 'PHASE_REACHED': {
        const order: AssemblyPhase[] = [
          'PHASE_1_PREPARATION',
          'PHASE_2_BENCH_ASSEMBLY',
          'PHASE_3_CASE_PREPARATION',
          'PHASE_4_MOTHERBOARD_INSTALL',
          'PHASE_5_GPU_EXPANSION',
          'PHASE_6_CABLING',
          'PHASE_7_BOOT_POST',
        ];
        return r(order.indexOf(phase) >= order.indexOf(o.phase), `Chegar à etapa ${order.indexOf(o.phase) + 1} da montagem`, 'Siga o checklist até concluir a etapa.');
      }
      case 'CABLES_COMPLETE':
        return r(phase === 'PHASE_7_BOOT_POST', 'Todos os cabos internos ligados', 'Faltam cabos: 24 pinos, EPS da CPU, PCIe da GPU, SATA, ventoinhas, USB/áudio frontais ou o F_PANEL.');
      case 'NO_ERROR':
        return r(
          !session.errorLog.some((t) => t.toLowerCase().includes(o.errorTitleIncludes.toLowerCase())),
          o.label,
          'Esse erro aconteceu durante a montagem. Releia o debriefing para entender por que ele é perigoso.'
        );
      case 'BUDGET_MAX':
        return r(totalSpent <= o.value, `Gastar no máximo R$ ${o.value.toLocaleString('pt-BR')}`, `Você gastou R$ ${totalSpent.toLocaleString('pt-BR')}: troque alguma peça por uma mais barata.`);
      case 'SOCKET':
        return r(motherboard?.socket === o.socket, `Placa-mãe com soquete ${o.socket}`, 'O soquete da placa precisa ser o mesmo do processador.');
      case 'RAM_TYPE': {
        const ram = assembly.ramInstalledSlot2 ?? assembly.ramInstalledSlot4;
        return r(ram?.ramType === o.ramType, `Memória ${o.ramType}`, `A placa e o processador desta missão usam ${o.ramType}.`);
      }
      case 'RAM_MIN_GB':
        return r(totalRamGb(assembly) >= o.gb, `${o.gb} GB de RAM ou mais`, `Há ${totalRamGb(assembly)} GB instalados.`);
      case 'DUAL_CHANNEL':
        return r(Boolean(assembly.ramInstalledSlot2 && assembly.ramInstalledSlot4), 'Dois pentes em dual channel (slots 2 e 4)', 'Um pente só funciona em single channel: a banda de memória cai pela metade.');
      case 'STORAGE_MIN': {
        const s = assembly.storageInstalled;
        const ok =
          Boolean(s) &&
          (s?.capacityGb ?? 0) >= o.minGb &&
          (o.minReadMbps === undefined || (s?.readSpeedMbps ?? 0) >= o.minReadMbps) &&
          (o.storageType === undefined || s?.storageType === o.storageType);
        const label = `Disco de ${o.minGb >= 1000 ? `${o.minGb / 1000} TB` : `${o.minGb} GB`} ou mais${o.minReadMbps ? ` com leitura ≥ ${o.minReadMbps.toLocaleString('pt-BR')} MB/s` : ''}`;
        return r(ok, label, s ? `${s.name}: ${s.capacityGb} GB, ${s.readSpeedMbps} MB/s.` : 'Nenhum disco instalado.');
      }
      case 'INTEGRATED_VIDEO':
        return r(
          !assembly.gpuInstalled && Boolean(assembly.cpuInstalled?.hasIntegratedGpu) && post.debugLed.vga === 'GREEN',
          'Imagem pelo vídeo integrado (sem placa de vídeo dedicada)',
          'Processadores com sufixo F não têm vídeo integrado: sem GPU dedicada, a tela fica preta.'
        );
      case 'FPS_MIN': {
        const fps = o.resolution === '1080p' ? bench1080.avgFps : calculateBenchmark(assembly, motherboard, o.resolution).avgFps;
        return r(fps >= o.fps, `${o.fps} FPS ou mais em ${o.resolution}`, `O benchmark mediu ${Math.round(fps)} FPS em ${o.resolution}.`);
      }
      case 'SCORE_MIN':
        return r(bench1080.score >= o.score, `Pontuação de benchmark ≥ ${o.score.toLocaleString('pt-BR')}`, `O benchmark marcou ${bench1080.score.toLocaleString('pt-BR')} pontos.`);
      case 'BOTTLENECK_MAX':
        return r(bench1080.bottleneckPercent <= o.percent, `Gargalo de no máximo ${o.percent}%`, `Gargalo medido: ${bench1080.bottleneckPercent}% (${bench1080.bottleneckType === 'CPU_BOUND' ? 'a CPU segura a GPU' : 'a GPU segura a CPU'}).`);
      case 'CPU_TEMP_MAX':
        return r(bench1080.cpuTempC <= o.celsius, `CPU a no máximo ${o.celsius} °C no benchmark`, `A CPU chegou a ${bench1080.cpuTempC} °C: o cooler não dá conta do TDP.`);
      case 'PSU_RECOMMENDED': {
        const psu = assembly.psuInstalled;
        const need = assembly.gpuInstalled?.requiredPsuWatts ?? 0;
        return r(Boolean(psu) && (psu?.wattage ?? 0) >= need, 'Fonte dentro da recomendação da placa de vídeo', `A placa de vídeo pede fonte de ${need} W; a instalada tem ${psu?.wattage ?? 0} W.`);
      }
      case 'COOLER_OK': {
        const cpu = assembly.cpuInstalled;
        const cooler = assembly.coolerInstalled;
        const ok = Boolean(cpu && cooler && assembly.thermalPasteApplied && !validateCoolerCapacity(cooler, cpu));
        return r(ok, 'Cooler à altura do TDP, com pasta térmica', cooler && cpu ? `${cooler.name} suporta ${cooler.maxTdpWatts} W; a CPU dissipa ${cpu.tdpWatts} W.` : 'Instale pasta térmica e um cooler adequado.');
      }
      case 'FITS_CASE': {
        const pcCase = assembly.caseInstalled;
        const fits =
          Boolean(pcCase && motherboard) &&
          !(pcCase && motherboard && validateCaseFormFactor(pcCase, motherboard)) &&
          !(pcCase && assembly.gpuInstalled && validateGpuLength(assembly.gpuInstalled, pcCase));
        return r(fits, 'Placa-mãe e placa de vídeo cabem no gabinete', 'Confira o formato aceito pelo gabinete e o comprimento máximo de GPU.');
      }
      case 'NO_PENALTIES':
        return r(session.penaltiesCount === 0, 'Nenhuma penalidade', `${session.penaltiesCount} penalidade(s) por encaixe errado ou forçado.`);
      case 'MAX_PENALTIES':
        return r(session.penaltiesCount <= o.count, `No máximo ${o.count} penalidade(s)`, `${session.penaltiesCount} penalidades.`);
      case 'TIME_MAX':
        return r(session.elapsedSeconds <= o.seconds, `Concluir em até ${Math.round(o.seconds / 60)} min`, `Tempo: ${Math.floor(session.elapsedSeconds / 60)} min ${session.elapsedSeconds % 60} s.`);
      case 'DIAGNOSTIC_RESOLVED':
        return r(session.resolvedScenarioIds.includes(o.scenarioId), 'Defeito encontrado e corrigido', 'O defeito do cliente ainda não foi resolvido.');
      case 'DESK_ITEMS':
        return r(o.snapPoints.every((s) => Boolean(session.placedDeskItems[s])), 'Itens posicionados na mesa', 'Ainda falta posicionar itens na mesa.');
      case 'DESK_STAGE': {
        const order: DeskStage[] = ['LOCKED', 'FURNISHING', 'CABLING', 'READY_TO_BOOT', 'RUNNING'];
        return r(order.indexOf(deskStage) >= order.indexOf(o.stage), o.stage === 'RUNNING' ? 'Estação ligada com o AcademyOS em execução' : 'Estação pronta para ligar', 'Confira os cabos externos e ligue a estação.');
      }
      case 'EXTERNAL_CABLES':
        return r(o.cables.every((c) => Boolean(session.externalCabling.connections[c])), 'Cabos externos conectados', 'Ainda há cabos externos desconectados.');
      case 'MONITOR_SIGNAL': {
        const screen = deriveMonitorScreen({
          placedDeskItems: session.placedDeskItems,
          externalCabling: session.externalCabling,
          assembly,
          isPcPoweredOn: session.isDeskPoweredOn,
        });
        return r(screen.state === 'SIGNAL', 'Imagem no monitor', screen.message);
      }
      case 'MONITOR_REFRESH_COHERENT': {
        const hz = monitorRefreshHz(session.studentSetup.monitor.id);
        const limit = Math.round(bench1080.avgFps * o.maxRatio);
        return r(hz <= limit, `Monitor coerente com o PC (até ${o.maxRatio}× o FPS)`, `O PC faz ${Math.round(bench1080.avgFps)} FPS e o monitor tem ${hz} Hz: a maior parte da taxa nunca será usada.`);
      }
      case 'HEADSET':
        return r(session.studentSetup.audio.id === 'audio-headset-71', 'Headset com microfone para falar na live', 'Caixas de som não têm microfone e vazam o áudio para a transmissão.');
      case 'PERIPHERAL_BUDGET_MAX': {
        const total = session.studentSetup.monitor.price + session.studentSetup.audio.price;
        return r(total <= o.value, `Periféricos até R$ ${o.value.toLocaleString('pt-BR')}`, `Monitor + áudio custam R$ ${total.toLocaleString('pt-BR')}.`);
      }
    }
  };

  const required = mission.objectives.map(check);
  const bonus = mission.bonus.map(check);
  const completed = required.every((x) => x.met);
  const bonusMet = bonus.filter((x) => x.met).length;
  const stars: MissionEvaluation['stars'] = !completed
    ? 0
    : bonus.length === 0 || bonusMet === bonus.length
    ? 3
    : bonusMet > 0
    ? 2
    : 1;
  return { completed, required, bonus, stars, totalSpent };
}

/* ====================================================================================
 * Máquina de estados da campanha: LOCKED → AVAILABLE → IN_PROGRESS → COMPLETED
 * ==================================================================================== */
export type MissionStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED';

export function getMissionStatus(
  mission: CampaignMission,
  trackMissions: CampaignMission[],
  completedIds: ReadonlySet<string>,
  activeMissionId: string | null,
  teacherUnlockAll = false
): MissionStatus {
  if (completedIds.has(mission.id)) return activeMissionId === mission.id ? 'IN_PROGRESS' : 'COMPLETED';
  if (activeMissionId === mission.id) return 'IN_PROGRESS';
  if (teacherUnlockAll) return 'AVAILABLE';
  const sorted = [...trackMissions].sort((a, b) => a.order - b.order);
  const index = sorted.findIndex((m) => m.id === mission.id);
  // A primeira missão de cada módulo está sempre liberada; a N exige a N−1 concluída
  return index <= 0 || completedIds.has(sorted[index - 1].id) ? 'AVAILABLE' : 'LOCKED';
}

/* ====================================================================================
 * Estado inicial da missão (peças do catálogo + preparação)
 * ==================================================================================== */
const findIn = <T extends { id: string }>(list: T[], id: string | undefined, kind: string): T | null => {
  if (!id) return null;
  const found = list.find((x) => x.id === id);
  if (!found) throw new Error(`Missão: ${kind} "${id}" não existe no catálogo`);
  return found;
};

export interface MissionInitialState {
  assembly: AssemblyState;
  motherboard: MotherboardComponent | null;
}

export function buildMissionInitialState(setup: MissionSetup): MissionInitialState {
  const p = setup.installed ?? {};
  const motherboard = findIn<MotherboardComponent>(MOTHERBOARDS, p.motherboardId, 'placa-mãe');
  const cpu = findIn<CpuComponent>(CPUS, p.cpuId, 'CPU');
  const cooler = findIn<CoolerComponent>(COOLERS, p.coolerId, 'cooler');
  const ram = findIn<RamComponent>(RAMS, p.ramId, 'RAM');
  const storage = findIn<StorageComponent>(STORAGES, p.storageId, 'disco');
  const gpu = findIn<GpuComponent>(GPUS, p.gpuId, 'GPU');
  const psu = findIn<PsuComponent>(PSUS, p.psuId, 'fonte');
  const pcCase = findIn<CaseComponent>(CASES, p.caseId, 'gabinete');
  const slots = p.ramSlots ?? (ram && ram.moduleCount >= 2 ? [2, 4] : [2]);
  const prepared = setup.prepared ?? 'NONE';
  const isPrepared = prepared !== 'NONE';
  const cabled = prepared === 'FULL';

  const assembly: AssemblyState = {
    ...INITIAL_ASSEMBLY_STATE,
    esdDischarged: isPrepared,
    cpuInstalled: cpu,
    socketLeverLocked: Boolean(cpu) && isPrepared,
    thermalPasteApplied: Boolean(cpu && cooler) && isPrepared,
    coolerInstalled: cooler,
    coolerFanConnected: Boolean(cooler) && cabled,
    ramInstalledSlot2: ram && slots.includes(2) ? ram : null,
    ramInstalledSlot4: ram && slots.includes(4) ? ram : null,
    storageInstalled: storage,
    cableSataConnected: Boolean(storage && storage.storageType !== 'NVMe_M2') && cabled,
    caseInstalled: pcCase,
    ioShieldInstalled: Boolean(pcCase) && isPrepared,
    standoffsInstalled: Boolean(pcCase) && isPrepared,
    psuInstalled: psu,
    motherboardScrewed: Boolean(pcCase && motherboard) && isPrepared,
    gpuInstalled: gpu,
    gpuScrewed: Boolean(gpu) && isPrepared,
    cableAtx24PinConnected: Boolean(psu) && cabled,
    cableCpu8PinConnected: Boolean(psu) && cabled,
    cableGpuPcieConnected: Boolean(psu && gpu && gpu.powerPins !== 'none') && cabled,
    frontPanelPowerSwConnected: Boolean(pcCase) && cabled,
    frontPanelResetSwConnected: Boolean(pcCase) && cabled,
    frontPanelLedsConnected: Boolean(pcCase) && cabled,
    caseFansConnected: Boolean(pcCase) && cabled,
    frontUsbConnected: Boolean(pcCase) && cabled,
    frontAudioConnected: Boolean(pcCase) && cabled,
  };
  return { assembly, motherboard };
}

/** Componente do catálogo pelo id (inventário com as peças do cliente) */
export function findCatalogComponent(id: string): HardwareComponent | null {
  const all: HardwareComponent[] = [...CPUS, ...MOTHERBOARDS, ...RAMS, ...COOLERS, ...GPUS, ...STORAGES, ...PSUS, ...CASES];
  return all.find((c) => c.id === id) ?? null;
}
