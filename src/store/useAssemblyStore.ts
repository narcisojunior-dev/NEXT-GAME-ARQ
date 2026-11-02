import { create } from 'zustand';
import {
  HardwareComponent,
  CpuComponent,
  MotherboardComponent,
  RamComponent,
  CoolerComponent,
  GpuComponent,
  StorageComponent,
  PsuComponent,
  AssemblyPhase,
  AssemblyState,
  ClientMission,
  GroupScore,
} from '../engine/types';
import { MOTHERBOARDS, CLIENT_MISSIONS } from '../engine/hardwareCatalog';
import { evaluatePostTest, PostResult, validateSocket, validateRamType } from '../engine/compatibility';
import { soundEngine } from '../engine/audio/soundEngine';

export type GameMode = 'OFICINA' | 'MISSAO' | 'DESAFIO';

interface AssemblyStore {
  // Configurações Gerais
  gameMode: GameMode;
  selectedMotherboard: MotherboardComponent;
  currentPhase: AssemblyPhase;
  activeMission: ClientMission | null;
  teamName: string;
  elapsedSeconds: number;
  isTimerRunning: boolean;
  penaltiesCount: number;

  // Estado da Montagem Física
  assembly: AssemblyState;

  // Modais e Diálogos
  inspectedComponent: HardwareComponent | null;
  selectedComponentForPlacement: HardwareComponent | null; // Suporte a Click-to-Place
  postResult: PostResult | null;
  isBiosOpen: boolean;
  isScoreModalOpen: boolean;
  activeAlert: { title: string; message: string; type: 'error' | 'success' | 'warning' } | null;

  // Ações
  setGameMode: (mode: GameMode) => void;
  setTeamName: (name: string) => void;
  selectMission: (missionId: string) => void;
  selectMotherboard: (mb: MotherboardComponent) => void;
  setCurrentPhase: (phase: AssemblyPhase) => void;
  setInspectedComponent: (comp: HardwareComponent | null) => void;
  setSelectedComponentForPlacement: (comp: HardwareComponent | null) => void;
  dismissAlert: () => void;
  closeBios: () => void;
  closeScoreModal: () => void;
  tickTimer: () => void;

  // Ações de Montagem (com regras e áudio)
  dischargeEsd: () => void;
  installCpu: (cpu: CpuComponent) => boolean;
  toggleSocketLever: () => void;
  applyThermalPaste: () => void;
  installCooler: (cooler: CoolerComponent) => boolean;
  connectCoolerFan: () => void;
  installRam: (slot: 2 | 4, ram: RamComponent) => boolean;
  installStorage: (storage: StorageComponent) => void;
  installIoShield: () => void;
  installStandoffs: () => void;
  installPsu: (psu: PsuComponent) => void;
  screwMotherboard: () => void;
  installGpu: (gpu: GpuComponent) => void;
  screwGpu: () => void;
  connectCable: (cableType: 'ATX24' | 'CPU8' | 'GPU_PCIE' | 'POWER_SW' | 'RESET_SW' | 'LEDS') => void;
  togglePsuSwitch: () => void;
  triggerPostBoot: () => void;
  calculateFinalScore: () => GroupScore;
  resetAssembly: () => void;
}

const initialAssemblyState: AssemblyState = {
  esdDischarged: false,
  cpuInstalled: null,
  socketLeverLocked: false,
  thermalPasteApplied: false,
  coolerInstalled: null,
  coolerFanConnected: false,
  ramInstalledSlot2: null,
  ramInstalledSlot4: null,
  storageInstalled: null,
  ioShieldInstalled: false,
  standoffsInstalled: false,
  psuInstalled: null,
  motherboardScrewed: false,
  gpuInstalled: null,
  gpuScrewed: false,
  cableAtx24PinConnected: false,
  cableCpu8PinConnected: false,
  cableGpuPcieConnected: false,
  frontPanelPowerSwConnected: false,
  frontPanelResetSwConnected: false,
  frontPanelLedsConnected: false,
  psuSwitchOn: false,
};

export const useAssemblyStore = create<AssemblyStore>((set, get) => ({
  gameMode: 'OFICINA',
  selectedMotherboard: MOTHERBOARDS[0], // B760M DDR5
  currentPhase: 'PHASE_1_PREPARATION',
  activeMission: null,
  teamName: 'Equipe Alfa',
  elapsedSeconds: 0,
  isTimerRunning: false,
  penaltiesCount: 0,

  assembly: initialAssemblyState,

  inspectedComponent: null,
  selectedComponentForPlacement: null,
  postResult: null,
  isBiosOpen: false,
  isScoreModalOpen: false,
  activeAlert: null,

  setGameMode: (mode) => {
    set({ gameMode: mode });
    get().resetAssembly();
    if (mode === 'MISSAO') {
      set({ activeMission: CLIENT_MISSIONS[0] });
    }
  },

  setTeamName: (name) => set({ teamName: name }),

  selectMission: (missionId) => {
    const mission = CLIENT_MISSIONS.find((m) => m.id === missionId) || CLIENT_MISSIONS[0];
    set({ activeMission: mission });
    get().resetAssembly();
  },

  selectMotherboard: (mb) => {
    set({ selectedMotherboard: mb });
    get().resetAssembly();
  },

  setCurrentPhase: (phase) => set({ currentPhase: phase }),

  setInspectedComponent: (comp) => set({ inspectedComponent: comp }),

  setSelectedComponentForPlacement: (comp) => set({ selectedComponentForPlacement: comp }),

  dismissAlert: () => set({ activeAlert: null }),

  closeBios: () => set({ isBiosOpen: false }),

  closeScoreModal: () => set({ isScoreModalOpen: false }),

  tickTimer: () => {
    if (get().isTimerRunning) {
      set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 }));
    }
  },

  // AÇÕES FÍSICAS

  dischargeEsd: () => {
    soundEngine.playSuccessChime();
    set((state) => ({
      assembly: { ...state.assembly, esdDischarged: true },
      currentPhase: 'PHASE_2_BENCH_ASSEMBLY',
      activeAlert: {
        type: 'success',
        title: 'Bancada Pronta & Estática Descarregada!',
        message: 'Você tocou no ponto de aterramento e eliminou qualquer risco de queimar componentes por descarga eletrostática (ESD).',
      },
    }));
  },

  installCpu: (cpu) => {
    const mb = get().selectedMotherboard;
    const socketError = validateSocket(cpu, mb);

    if (socketError) {
      soundEngine.playErrorBuzz();
      set((state) => ({
        penaltiesCount: state.penaltiesCount + 1,
        activeAlert: {
          type: 'error',
          title: socketError.title,
          message: socketError.message,
        },
      }));
      return false;
    }

    soundEngine.playSlotClick();
    set((state) => ({
      assembly: { ...state.assembly, cpuInstalled: cpu },
      selectedComponentForPlacement: null,
      activeAlert: {
        type: 'success',
        title: 'Processador Assentado!',
        message: 'A CPU foi posicionada com o triângulo dourado alinhado. Agora feche e trave a alavanca do soquete!',
      },
    }));
    return true;
  },

  toggleSocketLever: () => {
    soundEngine.playLeverLock();
    set((state) => ({
      assembly: { ...state.assembly, socketLeverLocked: !state.assembly.socketLeverLocked },
    }));
  },

  applyThermalPaste: () => {
    if (!get().assembly.cpuInstalled) {
      soundEngine.playErrorBuzz();
      set({
        activeAlert: {
          type: 'error',
          title: 'Onde aplicar?',
          message: 'Instale o processador no soquete antes de aplicar a pasta térmica!',
        },
      });
      return;
    }
    soundEngine.playPasteSquish();
    set((state) => ({
      assembly: { ...state.assembly, thermalPasteApplied: true },
      selectedComponentForPlacement: null,
      activeAlert: {
        type: 'success',
        title: 'Pasta Térmica Aplicada!',
        message: 'Uma gota uniforme do tamanho de uma ervilha foi colocada no centro do processador.',
      },
    }));
  },

  installCooler: (cooler) => {
    if (!get().assembly.cpuInstalled) {
      soundEngine.playErrorBuzz();
      set({
        activeAlert: {
          type: 'error',
          title: 'Soquete Vazio',
          message: 'Instale a CPU e aplique a pasta térmica antes de fixar o cooler.',
        },
      });
      return false;
    }

    soundEngine.playScrewSound();
    set((state) => ({
      assembly: { ...state.assembly, coolerInstalled: cooler },
      selectedComponentForPlacement: null,
      activeAlert: {
        type: 'success',
        title: 'Cooler Parafusado!',
        message: 'O cooler foi fixado com aperto em cruz. Não esqueça de ligar o conector da ventoinha (CPU_FAN)!',
      },
    }));
    return true;
  },

  connectCoolerFan: () => {
    soundEngine.playSlotClick();
    set((state) => ({
      assembly: { ...state.assembly, coolerFanConnected: true },
    }));
  },

  installRam: (slot, ram) => {
    const mb = get().selectedMotherboard;
    const ramError = validateRamType(ram, mb);

    if (ramError) {
      soundEngine.playErrorBuzz();
      set((state) => ({
        penaltiesCount: state.penaltiesCount + 1,
        activeAlert: {
          type: 'error',
          title: ramError.title,
          message: ramError.message,
        },
      }));
      return false;
    }

    soundEngine.playSlotClick();
    set((state) => ({
      assembly: {
        ...state.assembly,
        ...(slot === 2 ? { ramInstalledSlot2: ram } : { ramInstalledSlot4: ram }),
      },
      selectedComponentForPlacement: null,
      activeAlert: {
        type: 'success',
        title: `Memória Travada no Slot ${slot}!`,
        message: 'As travas plásticas fecharam com firmeza nos dois lados do pente de memória.',
      },
    }));
    return true;
  },

  installStorage: (storage) => {
    soundEngine.playScrewSound();
    set((state) => ({
      assembly: { ...state.assembly, storageInstalled: storage },
      selectedComponentForPlacement: null,
      activeAlert: {
        type: 'success',
        title: 'SSD M.2 NVMe Instalado!',
        message: 'Inserido a 30 graus no slot e fixado com o parafuso de retenção.',
      },
    }));
  },

  installIoShield: () => {
    soundEngine.playSlotClick();
    set((state) => ({
      assembly: { ...state.assembly, ioShieldInstalled: true },
    }));
  },

  installStandoffs: () => {
    soundEngine.playScrewSound();
    set((state) => ({
      assembly: { ...state.assembly, standoffsInstalled: true },
      activeAlert: {
        type: 'success',
        title: 'Espaçadores Dourados Instalados!',
        message: 'Os espaçadores de latão garantem que a placa-mãe não encoste no chassi metálico.',
      },
    }));
  },

  installPsu: (psu) => {
    soundEngine.playScrewSound();
    set((state) => ({
      assembly: { ...state.assembly, psuInstalled: psu },
      selectedComponentForPlacement: null,
      activeAlert: {
        type: 'success',
        title: 'Fonte Parafusada!',
        message: 'A fonte foi fixada com a ventoinha voltada para o filtro de ar do gabinete.',
      },
    }));
  },

  screwMotherboard: () => {
    soundEngine.playScrewSound();
    set((state) => ({
      assembly: { ...state.assembly, motherboardScrewed: true },
      currentPhase: 'PHASE_5_GPU_EXPANSION',
    }));
  },

  installGpu: (gpu) => {
    soundEngine.playSlotClick();
    set((state) => ({
      assembly: { ...state.assembly, gpuInstalled: gpu },
      selectedComponentForPlacement: null,
      activeAlert: {
        type: 'success',
        title: 'Placa de Vídeo Encaixada no PCIe x16!',
        message: 'A trava traseira do slot fechou. Parafuse a chapa traseira no gabinete.',
      },
    }));
  },

  screwGpu: () => {
    soundEngine.playScrewSound();
    set((state) => ({
      assembly: { ...state.assembly, gpuScrewed: true },
      currentPhase: 'PHASE_6_CABLING',
    }));
  },

  connectCable: (cableType) => {
    soundEngine.playSlotClick();
    set((state) => {
      const updated = { ...state.assembly };
      if (cableType === 'ATX24') updated.cableAtx24PinConnected = true;
      if (cableType === 'CPU8') updated.cableCpu8PinConnected = true;
      if (cableType === 'GPU_PCIE') updated.cableGpuPcieConnected = true;
      if (cableType === 'POWER_SW') updated.frontPanelPowerSwConnected = true;
      if (cableType === 'RESET_SW') updated.frontPanelResetSwConnected = true;
      if (cableType === 'LEDS') updated.frontPanelLedsConnected = true;
      return { assembly: updated };
    });
  },

  togglePsuSwitch: () => {
    soundEngine.playPowerSwitch();
    set((state) => ({
      assembly: { ...state.assembly, psuSwitchOn: !state.assembly.psuSwitchOn },
    }));
  },

  triggerPostBoot: () => {
    const { assembly, selectedMotherboard } = get();
    const result = evaluatePostTest(assembly, selectedMotherboard);

    if (result.canPowerOn) {
      soundEngine.playFanSpinUp();
      setTimeout(() => {
        soundEngine.playBiosBeep(result.bootSuccess);
        set({
          postResult: result,
          isBiosOpen: true,
          isTimerRunning: false,
        });
      }, 700);
    } else {
      soundEngine.playErrorBuzz();
      set({
        postResult: result,
        activeAlert: {
          type: 'error',
          title: result.issues[0]?.title || 'Não foi possível ligar',
          message: result.issues[0]?.message || 'Verifique se a fonte está instalada e ligada.',
        },
      });
    }
  },

  calculateFinalScore: () => {
    const { elapsedSeconds, penaltiesCount, assembly, activeMission, teamName } = get();
    let precision = 4000 - penaltiesCount * 500;
    if (precision < 500) precision = 500;

    // Bônus de tempo (meta de 300 segundos)
    const timeDelta = Math.max(0, 300 - elapsedSeconds);
    const speedPoints = Math.min(1500, Math.round(timeDelta * 5));

    // Bônus de orçamento (se estiver em missão)
    let budgetPoints = 2500;
    let budgetRemaining = 0;
    if (activeMission) {
      let spent = 0;
      if (assembly.cpuInstalled) spent += assembly.cpuInstalled.price;
      if (assembly.coolerInstalled) spent += assembly.coolerInstalled.price;
      if (assembly.ramInstalledSlot2) spent += assembly.ramInstalledSlot2.price;
      if (assembly.ramInstalledSlot4) spent += assembly.ramInstalledSlot4.price;
      if (assembly.storageInstalled) spent += assembly.storageInstalled.price;
      if (assembly.gpuInstalled) spent += assembly.gpuInstalled.price;
      if (assembly.psuInstalled) spent += assembly.psuInstalled.price;

      budgetRemaining = activeMission.budgetMax - spent;
      if (budgetRemaining < 0) {
        budgetPoints = 0;
      } else {
        budgetPoints = Math.round(1500 + (budgetRemaining / activeMission.budgetMax) * 1000);
      }
    }

    const benchmarkPoints = assembly.gpuInstalled ? 2000 : 800;
    const totalScore = precision + speedPoints + budgetPoints + benchmarkPoints;

    return {
      teamName,
      totalScore,
      precisionPoints: precision,
      budgetPoints,
      benchmarkPoints,
      speedPoints,
      penaltyPoints: penaltiesCount * 500,
      timeSpentSeconds: elapsedSeconds,
      budgetRemaining,
      hashValidation: `PCA-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    };
  },

  resetAssembly: () => {
    set({
      assembly: { ...initialAssemblyState },
      currentPhase: 'PHASE_1_PREPARATION',
      elapsedSeconds: 0,
      isTimerRunning: true,
      penaltiesCount: 0,
      postResult: null,
      isBiosOpen: false,
      isScoreModalOpen: false,
      activeAlert: null,
      selectedComponentForPlacement: null,
      inspectedComponent: null,
    });
  },
}));

