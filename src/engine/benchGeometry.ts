import { AssemblyState, MotherboardComponent } from './types';
import { resolveWorkbenchModelId, workbenchModelRotation } from './workbenchModels';
import { Aabb, Vec3, fittedExtents, modelDimensions, placedBox } from './geometry3d';

/**
 * Geometria da bancada 3D (fonte única para o Workbench3D e para os testes de encaixe).
 *
 * Unidades de mundo da bancada: a placa-mãe é normalizada para 7,2 de largura. As posições de
 * soquete, slots DIMM e PCIe foram MEDIDAS na geometria de cada GLB (mapa de altura) e a escala
 * em mm/unidade deriva do comprimento real de um pente DIMM (133 mm) em cada placa.
 */
export const BOARD_WIDTH = 7.2;

export interface BenchLayout {
  /** Centro do soquete; Y = altura onde a base da CPU assenta */
  CPU_SOCKET: Vec3;
  /** Ponta da alavanca de retenção, à direita do soquete */
  SOCKET_LEVER: Vec3;
  CPU_FAN_HEADER: Vec3;
  ATX12V_HEADER: Vec3;
  RAM_SLOT_2: Vec3;
  RAM_SLOT_4: Vec3;
  /** Centro do SSD M.2 deitado sobre a placa */
  M2_SLOT: Vec3;
  /** Centro do slot PCIe x16; Y = topo do slot (onde a borda da GPU assenta) */
  PCIE_SLOT: Vec3;
  ATX24P_HEADER: Vec3;
  FPANEL_HEADER: Vec3;
  DEBUG_LEDS: Vec3;
  /**
   * Cabeçalhos dos cabos do gabinete e do disco SATA. Posições típicas do padrão ATX (borda
   * direita e borda inferior), aproximadas: os GLBs não têm esses conectores modelados.
   */
  SYS_FAN_HEADER: Vec3;
  USB3_HEADER: Vec3;
  USB2_HEADER: Vec3;
  HD_AUDIO_HEADER: Vec3;
  SATA_PORTS: Vec3;
}

export interface BenchBoard {
  modelId: 'mb-b550m' | 'mb-z790-atx';
  /** Profundidade (Z) da placa normalizada */
  depth: number;
  /** Altura máxima de componentes da placa (dissipadores, I/O) */
  height: number;
  mmPerUnit: number;
  layout: BenchLayout;
}

const boardDepthAndHeight = (modelId: BenchBoard['modelId']): [number, number] => {
  const [x, y, z] = modelDimensions(modelId);
  // Modelos "Z-up" (menor dimensão em Z) são girados −90° em X pela bancada
  const zUp = z < y && z < x;
  const scale = BOARD_WIDTH / x;
  return zUp ? [y * scale, z * scale] : [z * scale, y * scale];
};

const RAM_STICK_MM = 133;

export const BENCH_BOARDS: Record<BenchBoard['modelId'], BenchBoard> = {
  // AMD AM4/AM5: soquete AM4 x∈[−0,28; 1,12] com alavanca à direita; 2 slots DIMM; PCIe x16 em z≈1,6
  'mb-b550m': {
    modelId: 'mb-b550m',
    depth: boardDepthAndHeight('mb-b550m')[0],
    height: boardDepthAndHeight('mb-b550m')[1],
    mmPerUnit: RAM_STICK_MM / 3.7,
    layout: {
      CPU_SOCKET: [0.42, 0.22, -1.13],
      SOCKET_LEVER: [1.2, 0.22, -1.13],
      CPU_FAN_HEADER: [-0.2, 0.22, -2.45],
      ATX12V_HEADER: [-2.75, 0.22, -3.1],
      RAM_SLOT_2: [2.38, 0.19, -1.12],
      RAM_SLOT_4: [2.72, 0.19, -1.12],
      // Área livre entre o suporte do soquete e o PCIe x16
      M2_SLOT: [-0.15, 0.05, 1.02],
      PCIE_SLOT: [0.0, 0.28, 1.605],
      ATX24P_HEADER: [3.1, 0.22, -0.6],
      FPANEL_HEADER: [2.85, 0.22, 3.1],
      DEBUG_LEDS: [2.9, 0.22, -2.8],
      SYS_FAN_HEADER: [-0.9, 0.22, 3.3],
      USB3_HEADER: [3.2, 0.22, 0.6],
      USB2_HEADER: [1.6, 0.22, 3.3],
      HD_AUDIO_HEADER: [-3.0, 0.22, 3.3],
      SATA_PORTS: [3.2, 0.22, 2.4],
    },
  },
  // Intel LGA1700: ILM x∈[−0,40; 1,00]; DIMMs A1 1,875 | A2 2,125 | B1 2,388 | B2 2,65; PCIe x16 em z≈0,92
  'mb-z790-atx': {
    modelId: 'mb-z790-atx',
    depth: boardDepthAndHeight('mb-z790-atx')[0],
    height: boardDepthAndHeight('mb-z790-atx')[1],
    mmPerUnit: RAM_STICK_MM / 3.85,
    layout: {
      CPU_SOCKET: [0.3, 0.25, -1.69],
      SOCKET_LEVER: [1.08, 0.25, -1.69],
      CPU_FAN_HEADER: [0.45, 0.22, -2.85],
      ATX12V_HEADER: [-1.9, 0.22, -3.2],
      RAM_SLOT_2: [2.125, 0.18, -1.66],
      RAM_SLOT_4: [2.65, 0.18, -1.66],
      // Sobre a placa de dissipação do M.2, abaixo do soquete e fora do alcance das GPUs mais grossas
      // (em z = 0,20 a borda de uma RTX 3060 cobria 16% do SSD — achado pelo teste de encaixe)
      M2_SLOT: [-0.4, 0.3, -0.05],
      PCIE_SLOT: [-1.06, 0.3, 0.92],
      ATX24P_HEADER: [3.15, 0.22, -0.65],
      FPANEL_HEADER: [2.85, 0.22, 3.35],
      DEBUG_LEDS: [2.95, 0.22, -2.9],
      SYS_FAN_HEADER: [-0.9, 0.22, 3.45],
      USB3_HEADER: [3.2, 0.22, 0.3],
      USB2_HEADER: [1.6, 0.22, 3.45],
      HD_AUDIO_HEADER: [-3.0, 0.22, 3.45],
      SATA_PORTS: [3.2, 0.22, 2.2],
    },
  },
};

export function benchBoardFor(motherboard: MotherboardComponent | null): BenchBoard {
  const id = motherboard ? resolveWorkbenchModelId(motherboard) : null;
  return BENCH_BOARDS[id === 'mb-z790-atx' ? 'mb-z790-atx' : 'mb-b550m'];
}

/** Caixa da placa-mãe na bancada (base em Y = 0, centralizada na origem) */
export function benchBoardBox(board: BenchBoard): Aabb {
  return placedBox([BOARD_WIDTH, board.height, board.depth], [0, 0, 0]);
}

/* ------------------------------------------------------------------------------------
 * Tamanhos reais das peças (mm) convertidos para a escala da placa
 * ------------------------------------------------------------------------------------ */
const CPU_SIZE = 1.15;
const TOWER_COOLER_HEIGHT_MM = 150;
const M2_SSD_LENGTH_MM = 80;
/** Bomba do water cooler: base de 60 × 60 mm e 40 mm de altura */
export const AIO_PUMP_MM: Vec3 = [60, 40, 60];
/** Distância do PCB da GPU ao centro do slot, do lado da CPU (unidades da placa) */
const GPU_PCB_OFFSET = 0.1;
/** Camada de pasta espalhada pelo cooler */
export const PASTE_LAYER = 0.01;

export type BenchPartId = 'CPU' | 'COOLER' | 'RAM_2' | 'RAM_4' | 'M2_SSD' | 'GPU' | 'SATA_DRIVE';

/** Medidas reais [comprimento, altura, largura] (mm) dos discos SATA deitados sobre o tapete */
export const SATA_DRIVE_MM: Record<'SATA_SSD' | 'SATA_HDD', Vec3> = {
  SATA_SSD: [100, 7, 70],
  SATA_HDD: [147, 26, 101],
};
/** Distância (unidades) entre a borda inferior da placa e o disco SATA no tapete */
const SATA_DRIVE_GAP = 0.3;

export interface BenchPartPlacement {
  part: BenchPartId;
  /** GLB (null = procedural, ex.: bomba do water cooler) */
  modelId: string | null;
  /** Tamanho alvo na maior dimensão (o que AutoNormalizedPart recebe) */
  targetSize: number;
  rotation: Vec3;
  position: Vec3;
  box: Aabb;
}

export interface BenchPlacements {
  board: BenchBoard;
  parts: BenchPartPlacement[];
  /** Topo do IHS da CPU (onde a pasta e o cooler assentam) */
  ihsTopY: number;
  /** Conector PCIe 8 pinos na borda superior da GPU (pino de cabo) */
  gpuPowerAnchor: Vec3 | null;
  /** Entrada de energia SATA (15 pinos) na ponta do disco */
  drivePowerAnchor: Vec3 | null;
}

function glbPart(part: BenchPartId, modelId: string, targetSize: number, position: Vec3, rotation?: Vec3): BenchPartPlacement {
  const rot = rotation ?? workbenchModelRotation(modelId);
  const extents = fittedExtents({ dims: modelDimensions(modelId), rotation: rot, fitAxis: 'max', size: targetSize });
  return { part, modelId, targetSize, rotation: rot, position, box: placedBox(extents, position) };
}

/** Onde cada peça instalada fica na bancada 3D */
export function benchPartPlacements(assembly: AssemblyState, motherboard: MotherboardComponent | null): BenchPlacements {
  const board = benchBoardFor(motherboard);
  const { layout, mmPerUnit } = board;
  const parts: BenchPartPlacement[] = [];
  let ihsTopY = layout.CPU_SOCKET[1];

  if (assembly.cpuInstalled) {
    const id = resolveWorkbenchModelId(assembly.cpuInstalled);
    if (id) {
      const cpu = glbPart('CPU', id, CPU_SIZE, layout.CPU_SOCKET);
      parts.push(cpu);
      ihsTopY = cpu.box.max[1];
    }
  }

  if (assembly.coolerInstalled) {
    const seat: Vec3 = [layout.CPU_SOCKET[0], ihsTopY + PASTE_LAYER, layout.CPU_SOCKET[2]];
    if (assembly.coolerInstalled.coolerType === 'Water') {
      const extents: Vec3 = [AIO_PUMP_MM[0] / mmPerUnit, AIO_PUMP_MM[1] / mmPerUnit, AIO_PUMP_MM[2] / mmPerUnit];
      parts.push({ part: 'COOLER', modelId: null, targetSize: extents[0], rotation: [0, 0, 0], position: seat, box: placedBox(extents, seat) });
    } else {
      // A torre é normalizada pela maior dimensão, que é a altura (150 mm reais)
      parts.push(glbPart('COOLER', 'cooler-torre', TOWER_COOLER_HEIGHT_MM / mmPerUnit, seat));
    }
  }

  const stickLength = RAM_STICK_MM / mmPerUnit;
  ([['RAM_2', assembly.ramInstalledSlot2, layout.RAM_SLOT_2], ['RAM_4', assembly.ramInstalledSlot4, layout.RAM_SLOT_4]] as const).forEach(
    ([part, ram, slot]) => {
      const id = ram ? resolveWorkbenchModelId(ram) : null;
      if (id) parts.push(glbPart(part, id, stickLength, slot));
    }
  );

  if (assembly.storageInstalled?.storageType === 'NVMe_M2') {
    // O SSD M.2 fica deitado ao longo de X (paralelo ao PCIe), como nas placas reais
    parts.push(glbPart('M2_SSD', 'ssd-nvme-990pro', M2_SSD_LENGTH_MM / mmPerUnit, layout.M2_SLOT, [0, 0, 0]));
  }

  let gpuPowerAnchor: Vec3 | null = null;
  if (assembly.gpuInstalled) {
    const id = resolveWorkbenchModelId(assembly.gpuInstalled) ?? 'gpu-rx-6700xt';
    const length = assembly.gpuInstalled.lengthMm / mmPerUnit;
    // O suporte da GPU fica alinhado à borda traseira (I/O) da placa; placas longas passam da borda direita
    const centerX = -BOARD_WIDTH / 2 + length / 2;
    // O PCB fica junto ao slot e o dissipador (2–3 slots de espessura) se projeta para baixo da placa (+Z),
    // como num gabinete; centralizar no slot jogaria metade do cooler sobre o M.2 e a CPU
    const thickness = fittedExtents({ dims: modelDimensions(id), rotation: workbenchModelRotation(id), fitAxis: 'max', size: length })[2];
    const centerZ = layout.PCIE_SLOT[2] - GPU_PCB_OFFSET + thickness / 2;
    const gpu = glbPart('GPU', id, length, [centerX, layout.PCIE_SLOT[1], centerZ]);
    parts.push(gpu);
    gpuPowerAnchor = [gpu.box.max[0] - 0.9, gpu.box.max[1], centerZ];
  }

  let drivePowerAnchor: Vec3 | null = null;
  const sataType = assembly.storageInstalled?.storageType;
  if (sataType === 'SATA_SSD' || sataType === 'SATA_HDD') {
    // Disco deitado no tapete, logo abaixo do canto inferior direito da placa (perto das portas SATA)
    // — fora do alcance das GPUs, que nunca passam da borda inferior da placa
    const [l, h, w] = SATA_DRIVE_MM[sataType].map((mm) => mm / mmPerUnit);
    const position: Vec3 = [BOARD_WIDTH / 2 - l / 2, 0, board.depth / 2 + SATA_DRIVE_GAP + w / 2];
    const box = placedBox([l, h, w], position);
    parts.push({ part: 'SATA_DRIVE', modelId: null, targetSize: l, rotation: [0, 0, 0], position, box });
    drivePowerAnchor = [box.max[0] - 0.25, box.max[1], box.min[2] + 0.15];
  }

  return { board, parts, ihsTopY, gpuPowerAnchor, drivePowerAnchor };
}
