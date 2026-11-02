export type ComponentCategory =
  | 'CPU'
  | 'MOTHERBOARD'
  | 'RAM'
  | 'COOLER'
  | 'PASTE'
  | 'GPU'
  | 'STORAGE'
  | 'PSU'
  | 'CASE'
  | 'CABLES';

export type CpuSocket = 'LGA1700' | 'AM5' | 'AM4';
export type RamType = 'DDR4' | 'DDR5';
export type FormFactor = 'ATX' | 'Micro-ATX' | 'Mini-ITX';
export type StorageType = 'NVMe_M2' | 'SATA_SSD' | 'SATA_HDD';
export type StorageSlot = 'M2' | 'SATA';

export interface BaseComponent {
  id: string;
  name: string;
  category: ComponentCategory;
  price: number;
  tdpWatts: number;
  description: string;
  analogy: string; // Analogia didática (ex: "O cérebro do PC")
  trivia: string; // Curiosidade técnica para os alunos
  imageUrl?: string;
}

export interface CpuComponent extends BaseComponent {
  category: 'CPU';
  socket: CpuSocket;
  cores: number;
  threads: number;
  baseClockGhz: number;
  boostClockGhz: number;
  supportedRam: RamType[];
  hasIntegratedGpu: boolean;
}

export interface MotherboardComponent extends BaseComponent {
  category: 'MOTHERBOARD';
  socket: CpuSocket;
  supportedRam: RamType;
  formFactor: FormFactor;
  ramSlotsCount: number; // normalmente 4 ou 2
  m2SlotsCount: number;
  pcieSlotsCount: number;
  hasIntegratedIoShield: boolean;
  chipset: string;
}

export interface RamComponent extends BaseComponent {
  category: 'RAM';
  ramType: RamType;
  capacityGb: number;
  frequencyMhz: number;
  moduleCount: number; // 1 = Single Stick, 2 = Kit Dual Channel
}

export interface CoolerComponent extends BaseComponent {
  category: 'COOLER';
  supportedSockets: CpuSocket[];
  maxTdpWatts: number;
  coolerType: 'Air' | 'Water';
  fanRpmMax: number;
}

export interface ThermalPasteComponent extends BaseComponent {
  category: 'PASTE';
  thermalConductivity: string;
}

export interface GpuComponent extends BaseComponent {
  category: 'GPU';
  vramGb: number;
  lengthMm: number;
  requiredPsuWatts: number;
  powerPins: '8pin' | '6+2pin' | 'none';
  benchmarkScore: number; // Pontuação teórica para jogos
}

export interface StorageComponent extends BaseComponent {
  category: 'STORAGE';
  storageType: StorageType;
  capacityGb: number;
  readSpeedMbps: number;
}

export interface PsuComponent extends BaseComponent {
  category: 'PSU';
  wattage: number;
  efficiencyRating: '80 Plus White' | '80 Plus Bronze' | '80 Plus Gold';
  isModular: boolean;
}

export interface CaseComponent extends BaseComponent {
  category: 'CASE';
  supportedFormFactors: FormFactor[];
  maxGpuLengthMm: number;
  fansIncluded: number;
}

export type HardwareComponent =
  | CpuComponent
  | MotherboardComponent
  | RamComponent
  | CoolerComponent
  | ThermalPasteComponent
  | GpuComponent
  | StorageComponent
  | PsuComponent
  | CaseComponent;

// As 7 Fases Canônicas de Montagem (definidas no PRD)
export type AssemblyPhase =
  | 'PHASE_1_PREPARATION'
  | 'PHASE_2_BENCH_ASSEMBLY'
  | 'PHASE_3_CASE_PREPARATION'
  | 'PHASE_4_MOTHERBOARD_INSTALL'
  | 'PHASE_5_GPU_EXPANSION'
  | 'PHASE_6_CABLING'
  | 'PHASE_7_BOOT_POST';

export interface PhaseInfo {
  phase: AssemblyPhase;
  number: number;
  title: string;
  shortDesc: string;
  goal: string;
}

export interface AssemblyState {
  esdDischarged: boolean;
  cpuInstalled: CpuComponent | null;
  socketLeverLocked: boolean;
  thermalPasteApplied: boolean;
  coolerInstalled: CoolerComponent | null;
  coolerFanConnected: boolean;
  ramInstalledSlot2: RamComponent | null;
  ramInstalledSlot4: RamComponent | null;
  storageInstalled: StorageComponent | null; // M.2 (NVMe) ou baia SATA
  cableSataConnected: boolean; // Cabos de dados + energia SATA
  caseInstalled: CaseComponent | null;
  ioShieldInstalled: boolean;
  standoffsInstalled: boolean;
  psuInstalled: PsuComponent | null;
  motherboardScrewed: boolean;
  gpuInstalled: GpuComponent | null;
  gpuScrewed: boolean;
  cableAtx24PinConnected: boolean;
  cableCpu8PinConnected: boolean;
  cableGpuPcieConnected: boolean;
  frontPanelPowerSwConnected: boolean;
  frontPanelResetSwConnected: boolean;
  frontPanelLedsConnected: boolean;
  psuSwitchOn: boolean;
}

export interface ValidationIssue {
  type: 'ERROR' | 'WARNING' | 'TIP';
  title: string;
  message: string;
  suggestedAction?: string;
}

export interface ClientMission {
  id: string;
  clientName: string;
  clientRole: string;
  clientAvatar: string;
  title: string;
  description: string;
  budgetMax: number;
  targetBenchmarkScore: number;
  requiredRamGb: number;
  requiredStorageGb: number;
  needsDedicatedGpu: boolean;
}

export interface GroupScore {
  teamName: string;
  totalScore: number;
  precisionPoints: number;
  budgetPoints: number;
  benchmarkPoints: number;
  speedPoints: number;
  penaltyPoints: number;
  timeSpentSeconds: number;
  budgetRemaining: number;
  hashValidation: string;
}

