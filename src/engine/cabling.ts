import { AssemblyState, MotherboardComponent } from './types';

export type CableId =
  | 'ATX_24PIN'
  | 'EPS_8PIN'
  | 'PCIE_8PIN'
  | 'SATA_POWER'
  | 'SATA_DATA'
  | 'CPU_FAN_CABLE'
  | 'CASE_FAN'
  | 'FRONT_USB3'
  | 'FRONT_AUDIO';

export type CableTargetId =
  | 'ATX_PWR'
  | 'ATX12V'
  | 'GPU_POWER'
  | 'DRIVE_POWER'
  | 'SATA_PORT'
  | 'CPU_FAN'
  | 'SYS_FAN'
  | 'USB3_HEADER'
  | 'USB2_HEADER'
  | 'HD_AUDIO';

export type CableSource = 'PSU' | 'CASE' | 'PARTS';

export interface CableSpec {
  id: CableId;
  name: string;
  source: CableSource;
  pins: string;
  color: string; // Cor do conector/fio na ilustração
  target: CableTargetId;
  description: string;
}

export interface CableTargetSpec {
  id: CableTargetId;
  label: string; // Serigrafia impressa na placa
  description: string;
}

export interface CableResult {
  success: boolean;
  dangerous?: boolean;
  message: string;
}

export type CableConnections = Record<CableId, CableTargetId | null>;

export const CABLES: CableSpec[] = [
  {
    id: 'ATX_24PIN',
    name: 'ATX 24 pinos',
    source: 'PSU',
    pins: '24 pinos',
    color: '#1F2937',
    target: 'ATX_PWR',
    description: 'O cabo mais grosso da fonte: alimenta a placa-mãe inteira.',
  },
  {
    id: 'EPS_8PIN',
    name: 'EPS 8 pinos (CPU)',
    source: 'PSU',
    pins: '4+4 pinos',
    color: '#EAB308',
    target: 'ATX12V',
    description: 'Energia exclusiva do processador, no canto superior esquerdo da placa.',
  },
  {
    id: 'PCIE_8PIN',
    name: 'PCIe 8 pinos (GPU)',
    source: 'PSU',
    pins: '6+2 pinos',
    color: '#A855F7',
    target: 'GPU_POWER',
    description: 'Energia extra para placas de vídeo que consomem mais que os 75W do slot.',
  },
  {
    id: 'SATA_POWER',
    name: 'Energia SATA',
    source: 'PSU',
    pins: '15 pinos',
    color: '#F97316',
    target: 'DRIVE_POWER',
    description: 'Conector achatado em "L" que leva energia da fonte até o SSD ou HD.',
  },
  {
    id: 'SATA_DATA',
    name: 'Dados SATA',
    source: 'PARTS',
    pins: '7 pinos',
    color: '#DC2626',
    target: 'SATA_PORT',
    description: 'Cabo fino (vem na caixa da placa-mãe) que leva os dados do disco até a placa.',
  },
  {
    id: 'CPU_FAN_CABLE',
    name: 'Ventoinha do cooler',
    source: 'PARTS',
    pins: '4 pinos PWM',
    color: '#0EA5E9',
    target: 'CPU_FAN',
    description: 'Cabo da ventoinha do cooler: a placa controla a rotação conforme a temperatura da CPU.',
  },
  {
    id: 'CASE_FAN',
    name: 'Ventoinhas do gabinete',
    source: 'CASE',
    pins: '4 pinos PWM',
    color: '#64748B',
    target: 'SYS_FAN',
    description: 'Cabo (ou hub) das ventoinhas do gabinete, que renovam o ar dentro do PC.',
  },
  {
    id: 'FRONT_USB3',
    name: 'USB 3.0 frontal',
    source: 'CASE',
    pins: '19 pinos',
    color: '#2563EB',
    target: 'USB3_HEADER',
    description: 'Cabo azul e grosso que faz funcionar as portas USB da frente do gabinete.',
  },
  {
    id: 'FRONT_AUDIO',
    name: 'HD Audio frontal',
    source: 'CASE',
    pins: '9 pinos',
    color: '#111827',
    target: 'HD_AUDIO',
    description: 'Liga as entradas de fone e microfone da frente do gabinete.',
  },
];

export const CABLE_TARGETS: CableTargetSpec[] = [
  { id: 'ATX_PWR', label: 'ATX_PWR', description: 'Conector principal de 24 pinos da placa-mãe' },
  { id: 'ATX12V', label: 'ATX12V', description: 'Conector de 8 pinos de energia do processador' },
  { id: 'GPU_POWER', label: 'PCIe 8 pinos', description: 'Entrada de energia extra da placa de vídeo' },
  { id: 'DRIVE_POWER', label: 'SATA (energia)', description: 'Entrada de energia de 15 pinos do disco' },
  { id: 'SATA_PORT', label: 'SATA6G', description: 'Portas de dados SATA da placa-mãe' },
  { id: 'CPU_FAN', label: 'CPU_FAN', description: 'Conector de 4 pinos da ventoinha do processador' },
  { id: 'SYS_FAN', label: 'SYS_FAN1', description: 'Conector de 4 pinos para ventoinhas do gabinete' },
  { id: 'USB3_HEADER', label: 'USB3_1', description: 'Cabeçalho USB 3.0 de 19 pinos' },
  { id: 'USB2_HEADER', label: 'USB2_1', description: 'Cabeçalho USB 2.0 de 9 pinos (sem o pino 10)' },
  { id: 'HD_AUDIO', label: 'HD_AUDIO', description: 'Cabeçalho de áudio frontal de 9 pinos (sem o pino 8)' },
];

export const EMPTY_CABLE_CONNECTIONS: CableConnections = {
  ATX_24PIN: null,
  EPS_8PIN: null,
  PCIE_8PIN: null,
  SATA_POWER: null,
  SATA_DATA: null,
  CPU_FAN_CABLE: null,
  CASE_FAN: null,
  FRONT_USB3: null,
  FRONT_AUDIO: null,
};

export const cableById = (id: CableId) => CABLES.find((c) => c.id === id)!;
export const cableTargetById = (id: CableTargetId) => CABLE_TARGETS.find((t) => t.id === id)!;

// Erros que acontecem de verdade em montagens, com a explicação de por que não funcionam
const CLASSIC_MISTAKES: Partial<Record<`${CableId}->${CableTargetId}`, Omit<CableResult, 'success'>>> = {
  'EPS_8PIN->GPU_POWER': {
    dangerous: true,
    message:
      'Cuidado! O EPS de 8 pinos (CPU) e o PCIe de 8 pinos (GPU) parecem iguais, mas o 12V e o terra ficam em posições trocadas. As travas plásticas têm formatos diferentes justamente para impedir esse erro: forçar pode queimar a placa de vídeo.',
  },
  'PCIE_8PIN->ATX12V': {
    dangerous: true,
    message:
      'Cuidado! O cabo PCIe de 8 pinos é da placa de vídeo. Ele lembra o EPS da CPU, mas a pinagem é diferente: forçar no ATX12V pode causar curto e queimar a placa-mãe.',
  },
  'FRONT_AUDIO->USB2_HEADER': {
    message:
      'Quase! O HD_AUDIO e o USB 2.0 têm 9 pinos cada, mas a chave é diferente: no USB 2.0 falta o pino 10 e no HD_AUDIO falta o pino 8. Procure a serigrafia HD_AUDIO (às vezes AAFP).',
  },
  'FRONT_USB3->USB2_HEADER': {
    message: 'O cabo USB 3.0 tem 19 pinos e é bem mais largo: não cabe no cabeçalho USB 2.0 de 9 pinos. Procure o conector azul USB3.',
  },
  'CPU_FAN_CABLE->SYS_FAN': {
    message:
      'Até encaixa, mas a placa só monitora a ventoinha do processador pelo CPU_FAN. No SYS_FAN, a BIOS mostra "CPU Fan Error" e pode desligar o PC para proteger a CPU.',
  },
  'CASE_FAN->CPU_FAN': {
    message: 'O CPU_FAN é reservado para o cooler do processador. As ventoinhas do gabinete vão no SYS_FAN (ou CHA_FAN).',
  },
  'SATA_DATA->DRIVE_POWER': {
    message: 'Esse é o cabo de dados (fino, 7 pinos). No disco, a entrada maior de 15 pinos é a de energia, que vem da fonte.',
  },
  'SATA_POWER->SATA_PORT': {
    message: 'As portas SATA da placa-mãe só levam dados, não energia. O cabo de energia SATA vem da fonte e vai direto no disco.',
  },
};

/**
 * Valida se um cabo encaixa no conector escolhido, explicando os erros mais comuns
 */
export function validateCableConnection(cableId: CableId, targetId: CableTargetId): CableResult {
  const cable = cableById(cableId);
  const target = cableTargetById(targetId);
  if (cable.target === targetId) {
    return { success: true, message: `${cable.name} encaixado no ${target.label}. A trava fez clique!` };
  }
  const mistake = CLASSIC_MISTAKES[`${cableId}->${targetId}`];
  if (mistake) return { success: false, ...mistake };
  return {
    success: false,
    message: `O ${cable.name} (${cable.pins}) não encaixa no ${target.label}: ${target.description.toLowerCase()} tem outro formato.`,
  };
}

const hasSataDrive = (state: AssemblyState) =>
  state.storageInstalled !== null && state.storageInstalled.storageType !== 'NVMe_M2';

/** O cabo existe na bancada? (cabos da fonte exigem fonte, cabos do gabinete exigem gabinete etc.) */
export function isCableAvailable(cableId: CableId, state: AssemblyState): boolean {
  switch (cableId) {
    case 'ATX_24PIN':
    case 'EPS_8PIN':
    case 'PCIE_8PIN':
    case 'SATA_POWER':
      return state.psuInstalled !== null;
    case 'SATA_DATA':
      return hasSataDrive(state);
    case 'CPU_FAN_CABLE':
      return state.coolerInstalled !== null;
    case 'CASE_FAN':
      return state.caseInstalled !== null && state.caseInstalled.fansIncluded > 0;
    case 'FRONT_USB3':
    case 'FRONT_AUDIO':
      return state.caseInstalled !== null;
  }
}

/** O conector existe na montagem atual? */
export function isTargetAvailable(targetId: CableTargetId, state: AssemblyState, mb: MotherboardComponent | null): boolean {
  if (targetId === 'GPU_POWER') return state.gpuInstalled !== null && state.gpuInstalled.powerPins !== 'none';
  if (targetId === 'DRIVE_POWER') return hasSataDrive(state);
  return mb !== null;
}

const isCorrect = (connections: CableConnections, id: CableId) => connections[id] === cableById(id).target;

/** Converte as ligações em flags da montagem usadas pelo POST e pelas fases */
export function cableFlags(connections: CableConnections) {
  return {
    cableAtx24PinConnected: isCorrect(connections, 'ATX_24PIN'),
    cableCpu8PinConnected: isCorrect(connections, 'EPS_8PIN'),
    cableGpuPcieConnected: isCorrect(connections, 'PCIE_8PIN'),
    cableSataConnected: isCorrect(connections, 'SATA_DATA') && isCorrect(connections, 'SATA_POWER'),
    coolerFanConnected: isCorrect(connections, 'CPU_FAN_CABLE'),
    caseFansConnected: isCorrect(connections, 'CASE_FAN'),
    frontUsbConnected: isCorrect(connections, 'FRONT_USB3'),
    frontAudioConnected: isCorrect(connections, 'FRONT_AUDIO'),
  };
}

/** Reconstrói as ligações a partir das flags (ex: casos de diagnóstico que começam montados) */
export function cableConnectionsFromAssembly(state: AssemblyState): CableConnections {
  const at = (connected: boolean, id: CableId) => (connected ? cableById(id).target : null);
  return {
    ATX_24PIN: at(state.cableAtx24PinConnected, 'ATX_24PIN'),
    EPS_8PIN: at(state.cableCpu8PinConnected, 'EPS_8PIN'),
    PCIE_8PIN: at(state.cableGpuPcieConnected, 'PCIE_8PIN'),
    SATA_POWER: at(state.cableSataConnected, 'SATA_POWER'),
    SATA_DATA: at(state.cableSataConnected, 'SATA_DATA'),
    CPU_FAN_CABLE: at(state.coolerFanConnected, 'CPU_FAN_CABLE'),
    CASE_FAN: at(state.caseFansConnected, 'CASE_FAN'),
    FRONT_USB3: at(state.frontUsbConnected, 'FRONT_USB3'),
    FRONT_AUDIO: at(state.frontAudioConnected, 'FRONT_AUDIO'),
  };
}

/** Solta cabos cuja peça de origem ou conector de destino não existe mais na montagem */
export function pruneCableConnections(connections: CableConnections, state: AssemblyState): CableConnections {
  const pruned = { ...connections };
  (Object.keys(pruned) as CableId[]).forEach((id) => {
    const target = pruned[id];
    if (!target) return;
    const targetGone = (target === 'GPU_POWER' || target === 'DRIVE_POWER') && !isTargetAvailable(target, state, null);
    if (!isCableAvailable(id, state) || targetGone) pruned[id] = null;
  });
  return pruned;
}

/** Cabos que a montagem atual precisa ter ligados para ficar completa */
export function getRequiredCables(state: AssemblyState): CableId[] {
  const required: CableId[] = [];
  if (state.psuInstalled) required.push('ATX_24PIN', 'EPS_8PIN');
  if (state.psuInstalled && state.gpuInstalled && state.gpuInstalled.powerPins !== 'none') required.push('PCIE_8PIN');
  if (hasSataDrive(state)) required.push('SATA_DATA', 'SATA_POWER');
  if (state.coolerInstalled) required.push('CPU_FAN_CABLE');
  if (state.caseInstalled) {
    if (state.caseInstalled.fansIncluded > 0) required.push('CASE_FAN');
    required.push('FRONT_USB3', 'FRONT_AUDIO');
  }
  return required;
}

/**
 * Atração magnética: devolve o conector mais próximo do ponteiro (distância até a borda do
 * retângulo; zero se estiver dentro), desde que dentro do raio de atração
 */
export function findNearestTarget(
  point: { x: number; y: number },
  targets: { id: CableTargetId; rect: { left: number; top: number; right: number; bottom: number } }[],
  maxDistance: number
): CableTargetId | null {
  let best: CableTargetId | null = null;
  let bestDistance = maxDistance;
  for (const { id, rect } of targets) {
    const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
    const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
    const distance = Math.hypot(dx, dy);
    if (distance <= bestDistance) {
      best = id;
      bestDistance = distance;
    }
  }
  return best;
}
