import { AssemblyState, MotherboardComponent } from './types';
import { BenchmarkResult, fanRpmFor } from './benchmark';
import { BOARD_WIDTH, BenchPartId, benchBoardFor, benchPartPlacements } from './benchGeometry';
import { Aabb, Vec3, placedBox } from './geometry3d';

/**
 * Modelo puro do modo "Abrir o PC" (#60, ADR-013) e da vista explodida da bancada (#38).
 * Um único número, `opening` ∈ [0, 1], comanda a pose: 0 = montado, 1 = explodido.
 * As leituras do painel vêm do benchmark — nunca de constantes soltas.
 */
export type CutawaySubsystem = 'CPU_COOLER' | 'PSU' | 'MEMORY' | 'GPU' | 'STORAGE';

/** Ordem didática (também a ordem do tour): térmico, energia, memória, vídeo, armazenamento */
export const CUTAWAY_SUBSYSTEMS: CutawaySubsystem[] = ['CPU_COOLER', 'PSU', 'MEMORY', 'GPU', 'STORAGE'];

export const SUBSYSTEM_LABELS: Record<CutawaySubsystem, string> = {
  CPU_COOLER: 'Processador e cooler',
  PSU: 'Fonte de alimentação',
  MEMORY: 'Memória RAM',
  GPU: 'Placa de vídeo',
  STORAGE: 'Armazenamento',
};

export type CutawayPartId = BenchPartId | 'PSU';

const SUBSYSTEM_OF: Record<CutawayPartId, CutawaySubsystem> = {
  CPU: 'CPU_COOLER',
  COOLER: 'CPU_COOLER',
  RAM_2: 'MEMORY',
  RAM_4: 'MEMORY',
  M2_SSD: 'STORAGE',
  SATA_DRIVE: 'STORAGE',
  GPU: 'GPU',
  PSU: 'PSU',
};

/** Deslocamento na vista explodida (unidades da bancada), de cima para baixo na ordem de montagem */
const EXPLODE: Record<CutawayPartId, Vec3> = {
  COOLER: [0, 3.2, 0],
  CPU: [0, 1.6, 0],
  RAM_2: [0, 2.2, 0],
  RAM_4: [0, 2.2, 0],
  M2_SSD: [0, 1.2, 0],
  GPU: [0, 1.0, 2.6],
  SATA_DRIVE: [1.2, 0.6, 1.2],
  PSU: [-1.5, 0.5, 0],
};

/** Fonte ATX real: 150 × 86 × 140 mm (só existe em 3D dentro da vista explodida) */
export const PSU_MM: Vec3 = [150, 86, 140];
/** Distância extra das peças fora de foco ao isolar um subsistema */
const ISOLATION_PUSH = 4.5;
const DIMMED_OPACITY = 0.18;

export interface CutawayPart {
  part: CutawayPartId;
  subsystem: CutawaySubsystem;
  modelId: string | null;
  targetSize: number;
  rotation: Vec3;
  /** Posição de montagem (opening = 0) */
  basePosition: Vec3;
  /** Deslocamento explodido aplicado (já multiplicado por opening) */
  offset: Vec3;
  /** Posição final = base + deslocamento (+ isolamento) */
  position: Vec3;
  /** Caixa da peça na posição final */
  box: Aabb;
  focus: boolean;
  opacity: number;
}

export interface CutawayReading {
  key: string;
  label: string;
  value: number;
  unit: string;
}

export interface CutawayPose {
  opening: number;
  selection: CutawaySubsystem | null;
  parts: CutawayPart[];
  /** Subsistemas presentes na montagem, na ordem didática */
  subsystems: CutawaySubsystem[];
  readings: Partial<Record<CutawaySubsystem, CutawayReading[]>>;
  warnings: Partial<Record<CutawaySubsystem, string[]>>;
}

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
const shiftBox = (box: Aabb, d: Vec3): Aabb => ({ min: add(box.min, d), max: add(box.max, d) });

export function poseCutaway(
  assembly: AssemblyState,
  motherboard: MotherboardComponent | null,
  benchmark: BenchmarkResult,
  selection: CutawaySubsystem | null,
  opening: number
): CutawayPose {
  const t = Math.min(1, Math.max(0, opening));
  const empty: CutawayPose = { opening: t, selection, parts: [], subsystems: [], readings: {}, warnings: {} };
  if (!motherboard) return empty;

  const placements = benchPartPlacements(assembly, motherboard);
  const board = benchBoardFor(motherboard);
  const baseParts: Omit<CutawayPart, 'offset' | 'position' | 'box' | 'focus' | 'opacity'>[] = [];
  const boxes = new Map<CutawayPartId, Aabb>();

  placements.parts.forEach((p) => {
    baseParts.push({ part: p.part, subsystem: SUBSYSTEM_OF[p.part], modelId: p.modelId, targetSize: p.targetSize, rotation: p.rotation, basePosition: p.position });
    boxes.set(p.part, p.box);
  });

  if (assembly.psuInstalled) {
    const [l, h, w] = PSU_MM.map((mm) => mm / board.mmPerUnit);
    const position: Vec3 = [-BOARD_WIDTH / 2 - 0.6 - l / 2, 0, 0];
    baseParts.push({ part: 'PSU', subsystem: 'PSU', modelId: null, targetSize: l, rotation: [0, 0, 0], basePosition: position });
    boxes.set('PSU', placedBox([l, h, w], position));
  }

  const subsystems = CUTAWAY_SUBSYSTEMS.filter((s) => baseParts.some((p) => p.subsystem === s));
  const active = selection && subsystems.includes(selection) ? selection : null;

  // 1. Explosão
  const exploded = baseParts.map((p) => {
    const offset = scale(EXPLODE[p.part], t);
    return { ...p, offset, position: add(p.basePosition, offset) };
  });

  // 2. Isolamento: o subsistema ativo vai ao centro; o resto se afasta e esmaece
  let centerShift: Vec3 = [0, 0, 0];
  if (active) {
    const focused = exploded.filter((p) => p.subsystem === active);
    const cx = focused.reduce((s, p) => s + p.position[0], 0) / focused.length;
    const cz = focused.reduce((s, p) => s + p.position[2], 0) / focused.length;
    centerShift = [-cx * t, 0, -cz * t];
  }

  const parts: CutawayPart[] = exploded.map((p) => {
    const isFocus = active === null || p.subsystem === active;
    let position = p.position;
    if (active && isFocus) position = add(position, centerShift);
    if (active && !isFocus) {
      const r = Math.hypot(position[0], position[2]);
      const dir: Vec3 = r > 1e-6 ? [position[0] / r, 0, position[2] / r] : [0, 0, -1];
      position = add(position, scale(dir, ISOLATION_PUSH * t));
    }
    const base = boxes.get(p.part)!;
    return {
      ...p,
      position,
      box: shiftBox(base, [position[0] - p.basePosition[0], position[1] - p.basePosition[1], position[2] - p.basePosition[2]]),
      focus: active !== null && isFocus,
      opacity: active && !isFocus ? 1 - (1 - DIMMED_OPACITY) * t : 1,
    };
  });

  return {
    opening: t,
    selection: active,
    parts,
    subsystems,
    ...readingsFor(assembly, benchmark, subsystems),
  };
}

function readingsFor(
  assembly: AssemblyState,
  bench: BenchmarkResult,
  subsystems: CutawaySubsystem[]
): Pick<CutawayPose, 'readings' | 'warnings'> {
  const readings: CutawayPose['readings'] = {};
  const warnings: CutawayPose['warnings'] = {};
  const has = (s: CutawaySubsystem) => subsystems.includes(s);

  if (has('CPU_COOLER')) {
    readings.CPU_COOLER = [
      { key: 'cpuTempC', label: 'Temperatura da CPU', value: bench.cpuTempC, unit: '°C' },
      { key: 'fanRpm', label: 'Ventoinha do cooler', value: fanRpmFor(assembly.coolerInstalled, bench.cpuTempC), unit: 'RPM' },
    ];
    const w: string[] = [];
    if (bench.cpuTempC > 85 || bench.thermalThrottlePenalty) w.push('Temperatura acima de 85 °C: o cooler está abaixo do TDP da CPU ou falta pasta térmica.');
    if (!assembly.coolerFanConnected) w.push('Cabo CPU_FAN desligado: a ventoinha não gira.');
    if (w.length) warnings.CPU_COOLER = w;
  }
  if (has('PSU') && assembly.psuInstalled) {
    readings.PSU = [
      { key: 'totalPowerWatts', label: 'Consumo estimado em jogo', value: bench.totalPowerWatts, unit: 'W' },
      { key: 'psuWatts', label: 'Capacidade da fonte', value: assembly.psuInstalled.wattage, unit: 'W' },
    ];
    if (assembly.psuInstalled.wattage < bench.totalPowerWatts * 1.2) {
      warnings.PSU = ['Menos de 20% de folga entre o consumo e a capacidade da fonte.'];
    }
  }
  if (has('MEMORY')) {
    const sticks = [assembly.ramInstalledSlot2, assembly.ramInstalledSlot4].filter((r) => r !== null);
    const perStick = sticks.reduce((sum, r) => sum + r.capacityGb / Math.max(1, r.moduleCount), 0);
    readings.MEMORY = [
      { key: 'ramGb', label: 'Memória instalada', value: perStick, unit: 'GB' },
      { key: 'dualChannel', label: 'Dual channel ativo (1 = sim)', value: bench.singleChannelPenalty ? 0 : 1, unit: '' },
    ];
    if (bench.singleChannelPenalty) warnings.MEMORY = ['Só um pente: single channel derruba o 1% low dos jogos.'];
  }
  if (has('GPU')) {
    readings.GPU = [
      { key: 'gpuTempC', label: 'Temperatura da GPU', value: bench.gpuTempC, unit: '°C' },
      { key: 'avgFps', label: 'FPS médio em 1080p', value: bench.avgFps, unit: 'FPS' },
      { key: 'bottleneckPercent', label: 'Gargalo', value: bench.bottleneckPercent, unit: '%' },
    ];
    if (assembly.gpuInstalled && assembly.gpuInstalled.powerPins !== 'none' && !assembly.cableGpuPcieConnected) {
      warnings.GPU = ['Cabo PCIe de 8 pinos desligado: a placa de vídeo não recebe energia.'];
    }
  }
  if (has('STORAGE') && assembly.storageInstalled) {
    readings.STORAGE = [{ key: 'readSpeedMbps', label: 'Leitura sequencial', value: assembly.storageInstalled.readSpeedMbps, unit: 'MB/s' }];
  }
  return { readings, warnings };
}
