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
  CaseComponent,
  StorageSlot,
  AssemblyPhase,
  AssemblyState,
  ClientMission,
  GroupScore,
  ValidationIssue,
} from '../engine/types';
import { MOTHERBOARDS, CLIENT_MISSIONS } from '../engine/hardwareCatalog';
import { DiagnosticScenario, DIAGNOSTIC_SCENARIOS } from '../engine/diagnosticCases';
import { FPanelConnectorId, validateConnectorPlacement } from '../engine/frontPanel';
import { StudentSetupConfig, DEFAULT_STUDENT_SETUP, PeripheralItem } from '../engine/peripheralsCatalog';
import { RoomThemeId } from '../engine/roomThemes';
import {
  evaluatePostTest,
  PostResult,
  validateSocket,
  validateRamType,
  validateEsdDischarged,
  validateCoolerSocket,
  validateCoolerCapacity,
  validateThermalPasteApplication,
  validateStorageSlot,
  validateCaseFormFactor,
  validateGpuLength,
  calculateTotalSpent,
} from '../engine/compatibility';
import { INITIAL_ASSEMBLY_STATE } from '../engine/assemblyState';
import { derivePhase } from '../engine/phases';
import { soundEngine } from '../engine/audio/soundEngine';

export type GameMode = 'OFICINA' | 'MISSAO' | 'DESAFIO' | 'DIAGNOSTICO';

interface AssemblyStore {
  // Configurações Gerais
  gameMode: GameMode;
  selectedMotherboard: MotherboardComponent | null;
  activeMission: ClientMission | null;
  activeDiagnosticScenario: DiagnosticScenario | null;
  resolvedScenarioIds: string[];
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
  isFrontPanelModalOpen: boolean;
  isAcademyOSOpen: boolean;
  isVirtualRoomModalOpen: boolean;
  isTeacherDashboardOpen: boolean;
  studentSetup: StudentSetupConfig;
  selectedRoomTheme: RoomThemeId;
  fPanelConnections: Record<FPanelConnectorId, [number, number] | null>;
  activeAlert: { title: string; message: string; type: 'error' | 'success' | 'warning' } | null;

  // Ações
  setGameMode: (mode: GameMode) => void;
  setTeamName: (name: string) => void;
  selectMission: (missionId: string) => void;
  selectDiagnosticScenario: (scenarioId: string) => void;
  checkDiagnosticResolution: () => boolean;
  selectMotherboard: (mb: MotherboardComponent | null) => void;
  installMotherboard: (mb: MotherboardComponent) => void;
  setInspectedComponent: (comp: HardwareComponent | null) => void;
  setSelectedComponentForPlacement: (comp: HardwareComponent | null) => void;
  dismissAlert: () => void;
  closeBios: () => void;
  closeScoreModal: () => void;
  openFrontPanelModal: () => void;
  closeFrontPanelModal: () => void;
  openAcademyOS: () => void;
  closeAcademyOS: () => void;
  openVirtualRoomModal: () => void;
  closeVirtualRoomModal: () => void;
  openTeacherDashboard: () => void;
  closeTeacherDashboard: () => void;
  setStudentPeripheral: (category: keyof StudentSetupConfig, item: PeripheralItem) => void;
  setSelectedRoomTheme: (themeId: RoomThemeId) => void;
  connectFPanelJumper: (connectorId: FPanelConnectorId, pins: [number, number]) => { success: boolean; message: string };
  disconnectFPanelJumper: (connectorId: FPanelConnectorId) => void;
  tickTimer: () => void;

  // Ações de Montagem (com regras e áudio)
  dischargeEsd: () => void;
  installCpu: (cpu: CpuComponent) => boolean;
  toggleSocketLever: () => void;
  applyThermalPaste: () => void;
  installCooler: (cooler: CoolerComponent) => boolean;
  removeCooler: () => void;
  connectCoolerFan: () => void;
  installRam: (slot: 2 | 4, ram: RamComponent) => boolean;
  installStorage: (storage: StorageComponent, slot: StorageSlot) => void;
  installCase: (pcCase: CaseComponent) => void;
  installIoShield: () => void;
  installStandoffs: () => void;
  installPsu: (psu: PsuComponent) => void;
  screwMotherboard: () => void;
  installGpu: (gpu: GpuComponent) => void;
  screwGpu: () => void;
  connectCable: (cableType: 'ATX24' | 'CPU8' | 'GPU_PCIE' | 'SATA' | 'POWER_SW' | 'RESET_SW' | 'LEDS') => void;
  togglePsuSwitch: () => void;
  triggerPostBoot: () => void;
  calculateFinalScore: () => GroupScore;
  resetAssembly: () => void;
}

/**
 * Fase canônica atual, derivada do estado físico da montagem
 */
export const selectCurrentPhase = (state: Pick<AssemblyStore, 'assembly' | 'selectedMotherboard'>): AssemblyPhase =>
  derivePhase(state.assembly, state.selectedMotherboard);

export const useAssemblyStore = create<AssemblyStore>((set, get) => {
  /** Recusa a ação com som de erro e alerta didático; penaliza quando a peça seria forçada ou danificada */
  const rejectAction = (issue: ValidationIssue, penalize: boolean) => {
    soundEngine.playErrorBuzz();
    set((state) => ({
      penaltiesCount: penalize ? state.penaltiesCount + 1 : state.penaltiesCount,
      activeAlert: {
        type: 'error',
        title: issue.title,
        message: issue.suggestedAction ? `${issue.message} ${issue.suggestedAction}` : issue.message,
      },
    }));
  };

  return {
  gameMode: 'OFICINA',
  selectedMotherboard: null,
  activeMission: null,
  activeDiagnosticScenario: null,
  resolvedScenarioIds: [],
  teamName: 'Equipe Alfa',
  elapsedSeconds: 0,
  isTimerRunning: false,
  penaltiesCount: 0,

  assembly: INITIAL_ASSEMBLY_STATE,

  inspectedComponent: null,
  selectedComponentForPlacement: null,
  postResult: null,
  isBiosOpen: false,
  isScoreModalOpen: false,
  isFrontPanelModalOpen: false,
  isAcademyOSOpen: false,
  isVirtualRoomModalOpen: false,
  isTeacherDashboardOpen: false,
  studentSetup: DEFAULT_STUDENT_SETUP,
  selectedRoomTheme: 'ROOM_GAMER',
  fPanelConnections: {
    POWER_SW: null,
    RESET_SW: null,
    HDD_LED: null,
    POWER_LED: null,
  },
  activeAlert: null,

  setGameMode: (mode) => {
    set({ gameMode: mode });
    get().resetAssembly();
    if (mode === 'MISSAO') {
      set({ activeMission: CLIENT_MISSIONS[0] });
    } else if (mode === 'DIAGNOSTICO') {
      get().selectDiagnosticScenario(DIAGNOSTIC_SCENARIOS[0].id);
    }
  },

  setTeamName: (name) => set({ teamName: name }),

  selectMission: (missionId) => {
    const mission = CLIENT_MISSIONS.find((m) => m.id === missionId) || CLIENT_MISSIONS[0];
    set({ activeMission: mission });
    get().resetAssembly();
  },

  selectDiagnosticScenario: (scenarioId) => {
    const scenario = DIAGNOSTIC_SCENARIOS.find((s) => s.id === scenarioId) || DIAGNOSTIC_SCENARIOS[0];
    set({
      activeDiagnosticScenario: scenario,
      selectedMotherboard: scenario.motherboard,
      assembly: { ...scenario.initialAssembly },
      elapsedSeconds: 0,
      postResult: null,
      activeAlert: {
        type: 'warning',
        title: `Caso Ativo: ${scenario.title}`,
        message: `${scenario.clientName} relata: "${scenario.clientStory}"`,
      },
    });
  },

  checkDiagnosticResolution: () => {
    const { gameMode, activeDiagnosticScenario, assembly, selectedMotherboard, resolvedScenarioIds } = get();
    if (gameMode !== 'DIAGNOSTICO' || !activeDiagnosticScenario || !selectedMotherboard) return false;

    if (activeDiagnosticScenario.isResolved(assembly, selectedMotherboard)) {
      if (!resolvedScenarioIds.includes(activeDiagnosticScenario.id)) {
        soundEngine.playSuccessChime();
        set((state) => ({
          resolvedScenarioIds: [...state.resolvedScenarioIds, activeDiagnosticScenario.id],
          activeAlert: {
            type: 'success',
            title: '🎯 DEFEITO RESOLVIDO COM SUCESSO!',
            message: `Excelente diagnóstico! ${activeDiagnosticScenario.defectExplanation} (+${activeDiagnosticScenario.rewardPoints} XP)`,
          },
        }));
        return true;
      }
    }
    return false;
  },

  selectMotherboard: (mb) => {
    set({ selectedMotherboard: mb });
    get().resetAssembly();
  },

  installMotherboard: (mb) => {
    const { assembly } = get();
    const blocker = validateEsdDischarged(assembly) ?? (assembly.caseInstalled ? validateCaseFormFactor(assembly.caseInstalled, mb) : null);
    if (blocker) {
      rejectAction(blocker, true);
      return;
    }

    soundEngine.playSlotClick();
    const current = get().selectedMotherboard;
    if (current && current.id !== mb.id) {
      set((state) => ({
        selectedMotherboard: mb,
        selectedComponentForPlacement: null,
        assembly: {
          ...state.assembly,
          cpuInstalled: null,
          socketLeverLocked: false,
          thermalPasteApplied: false,
          coolerInstalled: null,
          coolerFanConnected: false,
          ramInstalledSlot2: null,
          ramInstalledSlot4: null,
          storageInstalled: null,
          cableSataConnected: false,
          gpuInstalled: null,
          gpuScrewed: false,
          motherboardScrewed: false,
        },
        activeAlert: {
          type: 'warning',
          title: 'Placa-Mãe Trocada!',
          message: `Você substituiu a placa por ${mb.name}. Os componentes do soquete anterior foram devolvidos ao inventário para revalidação.`,
        },
      }));
      return;
    }

    set({
      selectedMotherboard: mb,
      selectedComponentForPlacement: null,
      activeAlert: {
        type: 'success',
        title: 'Placa-Mãe Posicionada!',
        message: `${mb.name} foi colocada sobre a bancada antiestática. Soquete ${mb.socket}, suporta memórias ${mb.supportedRam}.`,
      },
    });
  },

  setInspectedComponent: (comp) => set({ inspectedComponent: comp }),

  setSelectedComponentForPlacement: (comp) => set({ selectedComponentForPlacement: comp }),

  dismissAlert: () => set({ activeAlert: null }),

  closeBios: () => set({ isBiosOpen: false }),

  closeScoreModal: () => set({ isScoreModalOpen: false }),

  openFrontPanelModal: () => set({ isFrontPanelModalOpen: true }),

  closeFrontPanelModal: () => set({ isFrontPanelModalOpen: false }),

  openAcademyOS: () => set({ isAcademyOSOpen: true, isBiosOpen: false }),

  closeAcademyOS: () => set({ isAcademyOSOpen: false }),

  openVirtualRoomModal: () => set({ isVirtualRoomModalOpen: true }),

  closeVirtualRoomModal: () => set({ isVirtualRoomModalOpen: false }),

  openTeacherDashboard: () => set({ isTeacherDashboardOpen: true }),

  closeTeacherDashboard: () => set({ isTeacherDashboardOpen: false }),

  setStudentPeripheral: (category, item) => {
    soundEngine.playSlotClick();
    set((state) => ({
      studentSetup: {
        ...state.studentSetup,
        [category]: item,
      },
    }));
  },

  setSelectedRoomTheme: (themeId) => {
    soundEngine.playSuccessChime();
    set({ selectedRoomTheme: themeId });
  },

  connectFPanelJumper: (connectorId, pins) => {
    const result = validateConnectorPlacement(connectorId, pins);
    if (result.success) {
      soundEngine.playSlotClick();
      set((state) => {
        const nextConns = { ...state.fPanelConnections, [connectorId]: pins };
        const updatedAssembly = { ...state.assembly };
        if (connectorId === 'POWER_SW') updatedAssembly.frontPanelPowerSwConnected = true;
        if (connectorId === 'RESET_SW') updatedAssembly.frontPanelResetSwConnected = true;
        if (connectorId === 'HDD_LED' || connectorId === 'POWER_LED') {
          if (nextConns.HDD_LED && nextConns.POWER_LED) {
            updatedAssembly.frontPanelLedsConnected = true;
          }
        }
        return {
          fPanelConnections: nextConns,
          assembly: updatedAssembly,
          activeAlert: {
            type: 'success',
            title: `${connectorId} Conectado!`,
            message: result.message,
          },
        };
      });
      get().checkDiagnosticResolution();
      return result;
    } else {
      soundEngine.playErrorBuzz();
      set({
        activeAlert: {
          type: 'error',
          title: result.isPolarityInverted ? 'Polaridade Invertida (+/-)' : 'Pinos Incorretos',
          message: result.message,
        },
      });
      return result;
    }
  },

  disconnectFPanelJumper: (connectorId) => {
    soundEngine.playSlotClick();
    set((state) => {
      const nextConns = { ...state.fPanelConnections, [connectorId]: null };
      const updatedAssembly = { ...state.assembly };
      if (connectorId === 'POWER_SW') updatedAssembly.frontPanelPowerSwConnected = false;
      if (connectorId === 'RESET_SW') updatedAssembly.frontPanelResetSwConnected = false;
      if (connectorId === 'HDD_LED' || connectorId === 'POWER_LED') updatedAssembly.frontPanelLedsConnected = false;
      return {
        fPanelConnections: nextConns,
        assembly: updatedAssembly,
      };
    });
  },

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
      activeAlert: {
        type: 'success',
        title: 'Bancada Pronta & Estática Descarregada!',
        message: 'Você tocou no ponto de aterramento e eliminou qualquer risco de queimar componentes por descarga eletrostática (ESD).',
      },
    }));
  },

  installCpu: (cpu) => {
    const mb = get().selectedMotherboard;
    if (!mb) {
      soundEngine.playErrorBuzz();
      set({
        activeAlert: {
          type: 'error',
          title: 'Onde encaixar a CPU?',
          message: 'Você precisa posicionar uma placa-mãe na bancada antes de instalar o processador!',
        },
      });
      return false;
    }

    const cpuIssue = validateEsdDischarged(get().assembly) ?? validateSocket(cpu, mb);
    if (cpuIssue) {
      rejectAction(cpuIssue, true);
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
    const pasteIssue = validateThermalPasteApplication(get().assembly);
    if (pasteIssue) {
      rejectAction(pasteIssue, false);
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
    get().checkDiagnosticResolution();
  },

  installCooler: (cooler) => {
    const cpu = get().assembly.cpuInstalled;
    if (!cpu) {
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

    const socketIssue = validateCoolerSocket(cooler, cpu);
    if (socketIssue) {
      rejectAction(socketIssue, true);
      return false;
    }

    // Cooler fraco encaixa normalmente, mas o aluno é avisado das consequências térmicas
    const capacityIssue = validateCoolerCapacity(cooler, cpu);

    soundEngine.playScrewSound();
    set((state) => ({
      assembly: { ...state.assembly, coolerInstalled: cooler },
      selectedComponentForPlacement: null,
      activeAlert: capacityIssue
        ? { type: 'warning', title: capacityIssue.title, message: capacityIssue.message }
        : {
            type: 'success',
            title: 'Cooler Parafusado!',
            message: 'O cooler foi fixado com aperto em cruz. Não esqueça de ligar o conector da ventoinha (CPU_FAN)!',
          },
    }));
    get().checkDiagnosticResolution();
    return true;
  },

  removeCooler: () => {
    if (!get().assembly.coolerInstalled) return;
    soundEngine.playScrewSound();
    set((state) => ({
      assembly: {
        ...state.assembly,
        coolerInstalled: null,
        coolerFanConnected: false,
        // Ao remover o cooler, a camada de pasta se rompe e precisa ser limpa e reaplicada
        thermalPasteApplied: false,
      },
      activeAlert: {
        type: 'warning',
        title: 'Cooler Removido',
        message: 'A camada de pasta térmica antiga se rompeu ao separar o cooler. Limpe com álcool isopropílico e aplique uma nova gota antes de reinstalar.',
      },
    }));
  },

  connectCoolerFan: () => {
    if (!get().assembly.coolerInstalled) {
      soundEngine.playErrorBuzz();
      set({
        activeAlert: {
          type: 'error',
          title: 'Nenhum Cooler Instalado',
          message: 'Fixe o cooler sobre o processador antes de ligar o cabo da ventoinha no conector CPU_FAN.',
        },
      });
      return;
    }
    soundEngine.playSlotClick();
    set((state) => ({
      assembly: { ...state.assembly, coolerFanConnected: true },
    }));
  },

  installRam: (slot, ram) => {
    const mb = get().selectedMotherboard;
    if (!mb) {
      soundEngine.playErrorBuzz();
      set({
        activeAlert: {
          type: 'error',
          title: 'Sem Placa-Mãe',
          message: 'Instale uma placa-mãe na bancada antes de encaixar os pentes de memória RAM!',
        },
      });
      return false;
    }

    const ramIssue = validateEsdDischarged(get().assembly) ?? validateRamType(ram, mb);
    if (ramIssue) {
      rejectAction(ramIssue, true);
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
    get().checkDiagnosticResolution();
    return true;
  },

  installStorage: (storage, slot) => {
    const mb = get().selectedMotherboard;
    if (!mb) {
      soundEngine.playErrorBuzz();
      set({
        activeAlert: {
          type: 'error',
          title: 'Sem Placa-Mãe',
          message: 'Instale uma placa-mãe na bancada antes de instalar o armazenamento!',
        },
      });
      return;
    }

    const storageIssue = validateEsdDischarged(get().assembly) ?? validateStorageSlot(storage, slot);
    if (storageIssue) {
      rejectAction(storageIssue, true);
      return;
    }

    soundEngine.playScrewSound();
    set((state) => ({
      // Um disco novo chega sem cabos: os cabos SATA do disco anterior não valem mais
      assembly: { ...state.assembly, storageInstalled: storage, cableSataConnected: false },
      selectedComponentForPlacement: null,
      activeAlert:
        slot === 'M2'
          ? {
              type: 'success',
              title: 'SSD M.2 NVMe Instalado!',
              message: 'Inserido a 30 graus no slot e fixado com o parafuso de retenção.',
            }
          : {
              type: 'success',
              title: 'Disco Fixado na Baia SATA!',
              message: 'Agora conecte o cabo de dados SATA na placa-mãe e o cabo de energia SATA da fonte.',
            },
    }));
  },

  installCase: (pcCase) => {
    const { selectedMotherboard, assembly } = get();
    const caseIssue =
      (selectedMotherboard ? validateCaseFormFactor(pcCase, selectedMotherboard) : null) ??
      (assembly.gpuInstalled ? validateGpuLength(assembly.gpuInstalled, pcCase) : null);
    if (caseIssue) {
      rejectAction(caseIssue, true);
      return;
    }

    soundEngine.playScrewSound();
    set((state) => ({
      assembly: { ...state.assembly, caseInstalled: pcCase },
      selectedComponentForPlacement: null,
      activeAlert: {
        type: 'success',
        title: 'Gabinete Preparado!',
        message: `${pcCase.name} aceita placas ${pcCase.supportedFormFactors.join(', ')} e placas de vídeo de até ${pcCase.maxGpuLengthMm}mm.`,
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
    get().checkDiagnosticResolution();
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
    }));
  },

  installGpu: (gpu) => {
    const mb = get().selectedMotherboard;
    if (!mb) {
      soundEngine.playErrorBuzz();
      set({
        activeAlert: {
          type: 'error',
          title: 'Sem Placa-Mãe',
          message: 'Instale uma placa-mãe na bancada antes de encaixar a placa de vídeo no slot PCIe x16!',
        },
      });
      return;
    }

    const { assembly } = get();
    const gpuIssue =
      validateEsdDischarged(assembly) ?? (assembly.caseInstalled ? validateGpuLength(gpu, assembly.caseInstalled) : null);
    if (gpuIssue) {
      rejectAction(gpuIssue, true);
      return;
    }

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
    get().checkDiagnosticResolution();
  },

  screwGpu: () => {
    soundEngine.playScrewSound();
    set((state) => ({
      assembly: { ...state.assembly, gpuScrewed: true },
    }));
    get().checkDiagnosticResolution();
  },

  connectCable: (cableType) => {
    const storage = get().assembly.storageInstalled;
    if (cableType === 'SATA' && (!storage || storage.storageType === 'NVMe_M2')) {
      soundEngine.playErrorBuzz();
      set({
        activeAlert: {
          type: 'error',
          title: 'Nenhum Disco SATA Instalado',
          message: 'Os cabos SATA servem para SSDs de 2,5" e HDs. Instale um disco na baia SATA primeiro.',
        },
      });
      return;
    }

    soundEngine.playSlotClick();
    set((state) => {
      const updated = { ...state.assembly };
      if (cableType === 'ATX24') updated.cableAtx24PinConnected = true;
      if (cableType === 'CPU8') updated.cableCpu8PinConnected = true;
      if (cableType === 'GPU_PCIE') updated.cableGpuPcieConnected = true;
      if (cableType === 'SATA') updated.cableSataConnected = true;
      if (cableType === 'POWER_SW') updated.frontPanelPowerSwConnected = true;
      if (cableType === 'RESET_SW') updated.frontPanelResetSwConnected = true;
      if (cableType === 'LEDS') updated.frontPanelLedsConnected = true;
      return { assembly: updated };
    });
    get().checkDiagnosticResolution();
  },

  togglePsuSwitch: () => {
    soundEngine.playPowerSwitch();
    set((state) => ({
      assembly: { ...state.assembly, psuSwitchOn: !state.assembly.psuSwitchOn },
    }));
    get().checkDiagnosticResolution();
  },

  triggerPostBoot: () => {
    const { assembly, selectedMotherboard } = get();
    if (!selectedMotherboard) {
      soundEngine.playErrorBuzz();
      set({
        activeAlert: {
          type: 'error',
          title: 'Nenhuma Placa-Mãe Instalada!',
          message: 'Você precisa escolher e colocar uma placa-mãe na bancada antes de ligar o PC!',
        },
      });
      return;
    }

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
    const { elapsedSeconds, penaltiesCount, assembly, selectedMotherboard, activeMission, teamName } = get();
    let precision = 4000 - penaltiesCount * 500;
    if (precision < 500) precision = 500;

    // Bônus de tempo (meta de 300 segundos)
    const timeDelta = Math.max(0, 300 - elapsedSeconds);
    const speedPoints = Math.min(1500, Math.round(timeDelta * 5));

    // Bônus de orçamento (se estiver em missão)
    let budgetPoints = 2500;
    let budgetRemaining = 0;
    if (activeMission) {
      const spent = calculateTotalSpent(assembly, selectedMotherboard);
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
      selectedMotherboard: null,
      assembly: { ...INITIAL_ASSEMBLY_STATE },
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
  };
});

