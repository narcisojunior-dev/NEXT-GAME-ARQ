import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STORAGE_KEYS, safeStateStorage } from './safeStorage';
import { useProgressStore } from './useProgressStore';
import { encodeValidationCode } from '../engine/validationCode';
import { buildAssemblyChecklist, pendingBenchSteps } from '../engine/assemblyChecklist';
import {
  MissionEvaluation,
  MissionSession,
  buildMissionInitialState,
  evaluateMission,
} from '../engine/campaign';
import { findMission } from '../engine/campaignMissions';
import { buildDeskInventory } from '../engine/deskSetup';
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
  ComponentCategory,
} from '../engine/types';
import { MOTHERBOARDS, CLIENT_MISSIONS } from '../engine/hardwareCatalog';
import { DiagnosticScenario, DIAGNOSTIC_SCENARIOS } from '../engine/diagnosticCases';
import { FPanelConnectorId, ValidationResult, validateConnectorPlacement, connectionsFromAssembly } from '../engine/frontPanel';
import { StudentSetupConfig, DEFAULT_STUDENT_SETUP, PeripheralItem } from '../engine/peripheralsCatalog';
import { RoomThemeId } from '../engine/roomThemes';
import {
  evaluatePostTest,
  PostResult,
  validateSocket,
  validateRamType,
  validateEsdDischarged,
  validateCoolerSocket,
  validateCoolerPrerequisites,
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
import { MonitorScreenInfo, deriveMonitorScreen } from '../engine/monitorScreen';
import {
  DeskSnapPointId,
  DeskStage,
  PlacedDeskItem,
  DeskSetupState,
  createInitialDeskSetupState,
  canPlaceOnDesk,
  canRemoveFromDesk,
  deriveDeskStage,
  isPcReadyForDesk,
  canPowerOnDesk,
  PlacementValidationResult,
  RemovalValidationResult,
} from '../engine/deskSetup';
import {
  ExternalCableId,
  ExternalPortId,
  ExternalCablingState,
  ExternalCableValidationResult,
  createInitialExternalCablesState,
  validateExternalCableConnection,
  evaluateExternalCablesStatus,
  pruneExternalCables,
} from '../engine/externalCabling';


import {
  CableId,
  CableTargetId,
  CableResult,
  CableConnections,
  CABLES,
  EMPTY_CABLE_CONNECTIONS,
  cableById,
  validateCableConnection,
  isCableAvailable,
  isTargetAvailable,
  cableFlags,
  cableConnectionsFromAssembly,
  pruneCableConnections,
} from '../engine/cabling';

const PSU_CABLES: CableId[] = ['ATX_24PIN', 'EPS_8PIN', 'PCIE_8PIN', 'SATA_POWER'];
const CASE_CABLES: CableId[] = ['CASE_FAN', 'FRONT_USB3', 'FRONT_AUDIO'];

/**
 * Aplica uma nova montagem mantendo cabos e flags coerentes: solta os cabos listados
 * (peça trocada), solta os que perderam a peça de origem/destino e recalcula as flags
 */
const syncCables = (nextAssembly: AssemblyState, connections: CableConnections, release: CableId[] = []) => {
  const next = { ...connections };
  release.forEach((id) => (next[id] = null));
  const cableConnections = pruneCableConnections(next, nextAssembly);
  return { assembly: { ...nextAssembly, ...cableFlags(cableConnections) }, cableConnections };
};

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
  cableConnections: CableConnections;
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
  connectFPanelJumper: (connectorId: FPanelConnectorId, pins: [number, number]) => ValidationResult;
  disconnectFPanelJumper: (connectorId: FPanelConnectorId) => void;
  autoConnectAllFPanel: () => void;
  tickTimer: () => void;

  // Ações de Montagem (com regras e áudio)
  dischargeEsd: () => void;
  installCpu: (cpu: CpuComponent) => boolean;
  toggleSocketLever: () => void;
  applyThermalPaste: () => void;
  installCooler: (cooler: CoolerComponent) => boolean;
  removeCooler: () => void;
  installRam: (slot: 2 | 4, ram: RamComponent) => boolean;
  installStorage: (storage: StorageComponent, slot: StorageSlot) => void;
  installCase: (pcCase: CaseComponent) => void;
  installIoShield: () => void;
  installStandoffs: () => void;
  installPsu: (psu: PsuComponent) => void;
  screwMotherboard: () => void;
  installGpu: (gpu: GpuComponent) => void;
  screwGpu: () => void;
  connectCableTo: (cableId: CableId, targetId: CableTargetId) => CableResult;
  disconnectCable: (cableId: CableId) => void;
  togglePsuSwitch: () => void;
  triggerPostBoot: () => void;
  calculateFinalScore: () => GroupScore;
  // Visualização Ativa (Bancada de Montagem ou Mesa Battlestation)
  activeWorkbenchView: 'bench' | 'desk';
  setActiveWorkbenchView: (view: 'bench' | 'desk') => void;

  // Setup da Mesa e Battlestation (Fase 4)
  deskSetup: DeskSetupState;
  placeDeskItem: (snapPointId: DeskSnapPointId, item: PlacedDeskItem) => boolean;
  removeDeskItem: (snapPointId: DeskSnapPointId) => boolean;
  clearDeskSetup: () => void;
  /** Liga/desliga a estação. Ligar só é aceito em READY_TO_BOOT; retorna se a ação foi aplicada. */
  setDeskPower: (on: boolean) => boolean;
  setDeskCameraPreset: (preset: 'setup-wide' | 'setup-top' | 'setup-pc' | 'setup-seat') => void;
  canPlaceOnDeskSnapPoint: (snapPointId: DeskSnapPointId, item: unknown) => PlacementValidationResult;
  canRemoveDeskSnapPoint: (snapPointId: DeskSnapPointId) => RemovalValidationResult;
  // Cabeamento Externo (Fase 4)
  externalCabling: ExternalCablingState;
  connectExternalCable: (cableId: ExternalCableId, sourcePort: ExternalPortId, destPort: ExternalPortId) => ExternalCableValidationResult;
  disconnectExternalCable: (cableId: ExternalCableId) => void;
  clearExternalCables: () => void;
  resetAssembly: () => void;

  // Campanha de missões sequenciais (#43, #44)
  activeCampaignMissionId: string | null;
  /** Títulos dos erros cometidos na missão atual (objetivos "sem o erro X") */
  missionErrorLog: string[];
  postAttempts: number;
  /** Peças do cliente (custo zero) e categorias que podem ser compradas na missão */
  campaignInventory: { clientPartIds: string[]; purchasableCategories: ComponentCategory[] | null } | null;
  campaignHideHelpers: boolean;
  isCampaignMapOpen: boolean;
  /** Resultado exibido no debriefing */
  missionDebrief: { missionId: string; evaluation: MissionEvaluation } | null;
  openCampaignMap: () => void;
  closeCampaignMap: () => void;
  startCampaignMission: (missionId: string) => void;
  abandonCampaignMission: () => void;
  /** Avalia a missão ativa, registra o progresso se concluída e abre o debriefing */
  finishCampaignMission: () => MissionEvaluation | null;
  closeMissionDebrief: () => void;
  /** Zera montagem, campanha e progresso salvo (#30 "Começar do zero") */
  startFromScratch: () => void;
}

/** Referência estável: um [] novo a cada leitura faria seletores rasos re-renderizarem em loop */
const NO_CLIENT_PARTS: string[] = [];

/** Retrato da sessão que a avaliação de missão lê */
export const selectMissionSession = (s: AssemblyStore): MissionSession => ({
  assembly: s.assembly,
  motherboard: s.selectedMotherboard,
  elapsedSeconds: s.elapsedSeconds,
  penaltiesCount: s.penaltiesCount,
  errorLog: s.missionErrorLog,
  postAttempts: s.postAttempts,
  clientPartIds: s.campaignInventory?.clientPartIds ?? NO_CLIENT_PARTS,
  placedDeskItems: s.deskSetup.placedDeskItems,
  externalCabling: s.externalCabling,
  isDeskPoweredOn: s.deskSetup.isDeskPoweredOn,
  resolvedScenarioIds: s.resolvedScenarioIds,
  studentSetup: s.studentSetup,
});

/**
 * Fase canônica atual, derivada do estado físico da montagem
 */
export const selectDeskStage = (
  state: Pick<AssemblyStore, 'assembly' | 'selectedMotherboard' | 'deskSetup' | 'externalCabling'>
): DeskStage => deriveDeskStage(deskStageParams(state));

/** POST do PC montado, como se a chave da fonte estivesse ligada (a mesa liga o PC pelo botão) */
const evaluateDeskPost = (state: Pick<AssemblyStore, 'assembly' | 'selectedMotherboard'>) =>
  evaluatePostTest({ ...state.assembly, psuSwitchOn: true }, state.selectedMotherboard);

const deskStageParams = (
  state: Pick<AssemblyStore, 'assembly' | 'selectedMotherboard' | 'deskSetup' | 'externalCabling'>
) => ({
  assembly: state.assembly,
  selectedMotherboard: state.selectedMotherboard,
  deskSetup: state.deskSetup,
  isDeskPoweredOn: state.deskSetup.isDeskPoweredOn,
  externalCablesStatus: evaluateExternalCablesStatus(state.externalCabling, state.assembly),
  postBootSuccess: evaluateDeskPost(state).bootSuccess,
});

/** Pode ligar a estação? (PC montado, itens obrigatórios na mesa e cabo de força na tomada) */
export const selectCanPowerOnDesk = (
  state: Pick<AssemblyStore, 'assembly' | 'selectedMotherboard' | 'deskSetup' | 'externalCabling'>
) => canPowerOnDesk(deskStageParams(state));

/** O que a tela do monitor 3D mostra agora (Issue 05) */
export const selectMonitorScreen = (
  state: Pick<AssemblyStore, 'assembly' | 'selectedMotherboard' | 'deskSetup' | 'externalCabling'>
): MonitorScreenInfo => {
  const post = state.deskSetup.isDeskPoweredOn ? evaluateDeskPost(state) : null;
  const firstError = post && !post.bootSuccess ? post.issues.find((i) => i.type === 'ERROR') : undefined;
  return deriveMonitorScreen({
    placedDeskItems: state.deskSetup.placedDeskItems,
    externalCabling: state.externalCabling,
    assembly: state.assembly,
    isPcPoweredOn: state.deskSetup.isDeskPoweredOn,
    postFailure: firstError ? { title: firstError.title, message: firstError.message } : null,
  });
};

export const selectCurrentPhase = (state: Pick<AssemblyStore, 'assembly' | 'selectedMotherboard'>): AssemblyPhase =>
  derivePhase(state.assembly, state.selectedMotherboard);

export const useAssemblyStore = create<AssemblyStore>()(
  persist(
    (set, get) => {
  /** Recusa a ação com som de erro e alerta didático; penaliza quando a peça seria forçada ou danificada */
  const rejectAction = (issue: ValidationIssue, penalize: boolean) => {
    soundEngine.playErrorBuzz();
    set((state) => ({
      penaltiesCount: penalize ? state.penaltiesCount + 1 : state.penaltiesCount,
      missionErrorLog: [...state.missionErrorLog, issue.title].slice(-50),
      activeAlert: {
        type: 'error',
        title: issue.title,
        message: issue.suggestedAction ? `${issue.message} ${issue.suggestedAction}` : issue.message,
      },
    }));
  };

  /** POST em andamento (giro das ventoinhas antes do bip); evita boots duplicados e resultados obsoletos */
  let pendingPostBoot: ReturnType<typeof setTimeout> | null = null;
  const cancelPendingPostBoot = () => {
    if (pendingPostBoot) clearTimeout(pendingPostBoot);
    pendingPostBoot = null;
  };

  return {
  gameMode: 'OFICINA',
  activeWorkbenchView: 'bench',
  activeCampaignMissionId: null,
  missionErrorLog: [],
  postAttempts: 0,
  campaignInventory: null,
  campaignHideHelpers: false,
  isCampaignMapOpen: false,
  missionDebrief: null,
  selectedMotherboard: null,
  activeMission: null,
  activeDiagnosticScenario: null,
  resolvedScenarioIds: [],
  teamName: 'Equipe Alfa',
  elapsedSeconds: 0,
  isTimerRunning: false,
  penaltiesCount: 0,

  assembly: INITIAL_ASSEMBLY_STATE,
  deskSetup: createInitialDeskSetupState(),
  externalCabling: createInitialExternalCablesState(),

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
  fPanelConnections: connectionsFromAssembly(INITIAL_ASSEMBLY_STATE),
  cableConnections: EMPTY_CABLE_CONNECTIONS,
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

  setActiveWorkbenchView: (view) => set({ activeWorkbenchView: view }),

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
      fPanelConnections: connectionsFromAssembly(scenario.initialAssembly),
      cableConnections: cableConnectionsFromAssembly(scenario.initialAssembly),
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
        // Trocar a placa solta todos os cabos que estavam plugados nela
        ...syncCables(
          {
            ...state.assembly,
            cpuInstalled: null,
            socketLeverLocked: false,
            thermalPasteApplied: false,
            coolerInstalled: null,
            ramInstalledSlot2: null,
            ramInstalledSlot4: null,
            storageInstalled: null,
            gpuInstalled: null,
            gpuScrewed: false,
            motherboardScrewed: false,
          },
          state.cableConnections,
          CABLES.map((c) => c.id)
        ),
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

  autoConnectAllFPanel: () => {
    soundEngine.playSuccessChime();
    set((state) => {
      const nextConns: Record<FPanelConnectorId, [number, number]> = {
        POWER_SW: [6, 8],
        RESET_SW: [5, 7],
        HDD_LED: [1, 3],
        POWER_LED: [2, 4],
      };
      const updatedAssembly = {
        ...state.assembly,
        frontPanelPowerSwConnected: true,
        frontPanelResetSwConnected: true,
        frontPanelLedsConnected: true,
      };
      return {
        fPanelConnections: nextConns,
        assembly: updatedAssembly,
        activeAlert: {
          type: 'success',
          title: 'Painel Frontal Conectado!',
          message: 'Todos os 4 conectores (POWER SW, RESET SW, HDD LED, POWER LED) foram fixados nos pinos corretos.',
        },
      };
    });
    get().checkDiagnosticResolution();
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
    const { assembly } = get();
    const cpu = assembly.cpuInstalled;
    // Ordem didática CPU → Pasta → Cooler: regra do motor, válida para a bancada 2D e 3D
    const prerequisiteIssue = validateCoolerPrerequisites(assembly);
    if (!cpu) {
      if (prerequisiteIssue) rejectAction(prerequisiteIssue, false);
      return false;
    }

    // Soquete incompatível é erro de escolha de peça (penaliza) e tem prioridade sobre a falta de pasta
    const socketIssue = validateCoolerSocket(cooler, cpu);
    if (socketIssue) {
      rejectAction(socketIssue, true);
      return false;
    }

    if (prerequisiteIssue) {
      rejectAction(prerequisiteIssue, false);
      return false;
    }

    // Cooler fraco encaixa normalmente, mas o aluno é avisado das consequências térmicas
    const capacityIssue = validateCoolerCapacity(cooler, cpu);

    soundEngine.playScrewSound();
    set((state) => ({
      ...syncCables({ ...state.assembly, coolerInstalled: cooler }, state.cableConnections, ['CPU_FAN_CABLE']),
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
      ...syncCables(
        {
          ...state.assembly,
          coolerInstalled: null,
          // Ao remover o cooler, a camada de pasta se rompe e precisa ser limpa e reaplicada
          thermalPasteApplied: false,
        },
        state.cableConnections
      ),
      activeAlert: {
        type: 'warning',
        title: 'Cooler Removido',
        message: 'A camada de pasta térmica antiga se rompeu ao separar o cooler. Limpe com álcool isopropílico e aplique uma nova gota antes de reinstalar.',
      },
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
    const isDualKit = ram.moduleCount === 2;
    set((state) => ({
      assembly: {
        ...state.assembly,
        ...(isDualKit
          ? { ramInstalledSlot2: ram, ramInstalledSlot4: ram }
          : slot === 2
          ? { ramInstalledSlot2: ram }
          : { ramInstalledSlot4: ram }),
      },
      selectedComponentForPlacement: null,
      activeAlert: {
        type: 'success',
        title: isDualKit ? 'Kit Dual Channel Travado nos Slots 2 e 4!' : `Memória Travada no Slot ${slot}!`,
        message: isDualKit
          ? 'Os dois pentes do kit foram encaixados nos slots ideais (2 e 4) para ativar o modo Dual Channel.'
          : 'As travas plásticas fecharam com firmeza nos dois lados do pente de memória.',
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
      ...syncCables({ ...state.assembly, storageInstalled: storage }, state.cableConnections, ['SATA_DATA', 'SATA_POWER']),
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
      ...syncCables({ ...state.assembly, caseInstalled: pcCase }, state.cableConnections, CASE_CABLES),
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
      ...syncCables({ ...state.assembly, psuInstalled: psu }, state.cableConnections, PSU_CABLES),
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
      ...syncCables({ ...state.assembly, gpuInstalled: gpu }, state.cableConnections, ['PCIE_8PIN']),
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

  connectCableTo: (cableId, targetId) => {
    const { assembly, selectedMotherboard } = get();
    const cable = CABLES.find((c) => c.id === cableId);
    if (!cable) {
      return { success: false, message: 'Cabo desconhecido: ' + cableId };
    }

    if (!isCableAvailable(cableId, assembly) || !isTargetAvailable(targetId, assembly, selectedMotherboard)) {
      const result: CableResult = {
        success: false,
        message: !isCableAvailable(cableId, assembly)
          ? `O cabo ${cable.name} ainda não está na bancada: instale a peça de onde ele sai.`
          : 'Esse conector ainda não existe na montagem: instale a peça dele primeiro.',
      };
      rejectAction({ type: 'ERROR', title: 'Não Dá Para Ligar Ainda', message: result.message }, false);
      return result;
    }

    const result = validateCableConnection(cableId, targetId);
    if (!result.success) {
      // Só o encaixe forçado que pode queimar peças (EPS x PCIe) conta como erro de montagem
      rejectAction({ type: 'ERROR', title: result.dangerous ? 'Encaixe Perigoso!' : 'Não Encaixa Aqui', message: result.message }, Boolean(result.dangerous));
      return result;
    }

    soundEngine.playSlotClick();
    set((state) => ({
      ...syncCables(state.assembly, { ...state.cableConnections, [cableId]: targetId }),
      activeAlert: { type: 'success', title: `${cable.name} Conectado!`, message: result.message },
    }));
    get().checkDiagnosticResolution();
    return result;
  },

  disconnectCable: (cableId) => {
    if (!get().cableConnections[cableId]) return;
    soundEngine.playSlotClick();
    set((state) => syncCables(state.assembly, state.cableConnections, [cableId]));
  },

  togglePsuSwitch: () => {
    soundEngine.playPowerSwitch();
    set((state) => ({
      assembly: { ...state.assembly, psuSwitchOn: !state.assembly.psuSwitchOn },
    }));
    get().checkDiagnosticResolution();
  },

  triggerPostBoot: () => {
    // Cliques repetidos durante o giro das ventoinhas não agendam um segundo POST
    if (pendingPostBoot) return;

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
    const failures = result.issues.filter((i) => i.type === 'ERROR').map((i) => i.title);
    set((state) => ({
      postAttempts: state.postAttempts + 1,
      missionErrorLog: [...state.missionErrorLog, ...failures].slice(-50),
    }));

    if (result.canPowerOn) {
      soundEngine.playFanSpinUp();
      pendingPostBoot = setTimeout(() => {
        pendingPostBoot = null;
        // A bancada mudou durante o POST (fonte desligada, peça removida...): o resultado avaliado ficou obsoleto
        const current = get();
        if (current.assembly !== assembly || current.selectedMotherboard !== selectedMotherboard) {
          set({
            activeAlert: {
              type: 'warning',
              title: 'Boot Interrompido',
              message: 'A montagem foi alterada durante o teste de energia. Ligue o PC novamente.',
            },
          });
          return;
        }
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
      // Código verificável com selo SHA-256 (#29): determinístico, o professor confere no painel
      hashValidation: encodeValidationCode({ teamName: teamName || 'Equipe', totalScore, timeSpentSeconds: elapsedSeconds }),
    };
  },

  placeDeskItem: (snapPointId, item) => {
    const validation = get().canPlaceOnDeskSnapPoint(snapPointId, item);

    if (!validation.allowed) {
      if (validation.isErrorPenalty) {
        soundEngine.playErrorBuzz();
        set((st) => ({
          penaltiesCount: st.penaltiesCount + 1,
          activeAlert: {
            type: 'error',
            title: 'Posicionamento Incompatível!',
            message: validation.message ?? 'Não é possível posicionar este item aqui.',
          },
        }));
      } else {
        set({
          activeAlert: {
            type: 'warning',
            title: 'Pré-requisito Pendente',
            message: validation.message ?? 'Pré-requisito não atendido.',
          },
        });
      }
      return false;
    }

    soundEngine.playSlotClick();
    set((st) => ({
      deskSetup: {
        ...st.deskSetup,
        placedDeskItems: {
          ...st.deskSetup.placedDeskItems,
          // O snap point de destino é a fonte da verdade (evita item gravado com snapPointId divergente)
          [snapPointId]: { ...item, snapPointId },
        },
      },
    }));
    return true;
  },

  removeDeskItem: (snapPointId) => {
    const { deskSetup } = get();
    const validation = canRemoveFromDesk(snapPointId, deskSetup.placedDeskItems);
    if (!validation.allowed) {
      set({
        activeAlert: {
          type: 'warning',
          title: 'Não é Possível Remover',
          message: validation.message ?? 'Remova primeiro os itens dependentes.',
        },
      });
      return false;
    }

    soundEngine.playLeverRelease();
    set((st) => {
      const nextItems = { ...st.deskSetup.placedDeskItems };
      delete nextItems[snapPointId];
      const pruned = pruneExternalCables(st.externalCabling, nextItems);
      return {
        deskSetup: {
          ...st.deskSetup,
          placedDeskItems: nextItems,
        },
        externalCabling: pruned,
      };
    });
    return true;
  },

  clearDeskSetup: () => {
    set((st) => ({
      deskSetup: {
        ...st.deskSetup,
        placedDeskItems: {},
        isDeskPoweredOn: false,
      },
      // Mesa vazia: nenhum cabo pode continuar ligado a dispositivos que não existem mais
      externalCabling: createInitialExternalCablesState(),
    }));
  },

  setDeskPower: (on) => {
    if (on) {
      const power = selectCanPowerOnDesk(get());
      if (!power.allowed) {
        soundEngine.playErrorBuzz();
        set({
          activeAlert: {
            type: 'warning',
            title: 'Não Foi Possível Ligar',
            message: power.message ?? 'A estação ainda não está pronta para ligar.',
          },
        });
        return false;
      }
      // Chave da fonte + ventoinhas acelerando; o bip de POST toca quando a imagem aparece
      soundEngine.playPowerSwitch();
      soundEngine.playFanSpinUp();
    } else if (get().deskSetup.isDeskPoweredOn) {
      soundEngine.playPowerSwitch();
    }
    set((st) => ({
      deskSetup: {
        ...st.deskSetup,
        isDeskPoweredOn: on,
      },
    }));
    return true;
  },

  setDeskCameraPreset: (preset) => {
    set((st) => ({
      deskSetup: {
        ...st.deskSetup,
        deskCameraPreset: preset,
      },
    }));
  },

  canPlaceOnDeskSnapPoint: (snapPointId, item) => {
    const { deskSetup, assembly, selectedMotherboard, studentSetup, cableConnections, postResult } = get();
    const isPcAssembled = isPcReadyForDesk(assembly, selectedMotherboard);
    return canPlaceOnDesk(snapPointId, item, deskSetup.placedDeskItems, {
      isPcAssembled,
      pendingBenchSteps: isPcAssembled
        ? []
        : pendingBenchSteps(
            buildAssemblyChecklist(assembly, selectedMotherboard, { cableConnections, bootSuccess: Boolean(postResult?.bootSuccess) })
          ).map((step) => step.title.replace(/^\d+\. /, '')),
      studentSetup,
    });
  },

  canRemoveDeskSnapPoint: (snapPointId) => {
    const { deskSetup } = get();
    return canRemoveFromDesk(snapPointId, deskSetup.placedDeskItems);
  },

  connectExternalCable: (cableId, sourcePort, destPort) => {
    const { assembly, deskSetup, externalCabling } = get();
    const validation = validateExternalCableConnection(cableId, sourcePort, destPort, assembly, {
      placedDeskItems: deskSetup.placedDeskItems,
      cablingState: externalCabling,
    });

    if (!validation.allowed) {
      soundEngine.playErrorBuzz();
      set({
        activeAlert: {
          type: 'error',
          title: validation.title ?? 'Conexão Impossível!',
          message: validation.message ?? 'Porta incompatível com este cabo.',
        },
      });
      return validation;
    }

    if (!validation.isPedagogicallyValid) {
      soundEngine.playErrorBuzz();
      set((st) => ({
        penaltiesCount: validation.penalty ? st.penaltiesCount + 1 : st.penaltiesCount,
        activeAlert: {
          type: 'warning',
          title: validation.title ?? 'Alerta Pedagógico',
          message: validation.message ?? 'Conexão realizada, mas não haverá sinal de vídeo.',
        },
      }));
    } else {
      soundEngine.playSlotClick();
    }

    set((st) => ({
      externalCabling: {
        ...st.externalCabling,
        connections: {
          ...st.externalCabling.connections,
          [cableId]: validation.connection ?? { sourcePort, destPort },
        },
      },
    }));

    return validation;
  },

  disconnectExternalCable: (cableId) => {
    soundEngine.playLeverRelease();
    set((st) => ({
      externalCabling: {
        ...st.externalCabling,
        connections: {
          ...st.externalCabling.connections,
          [cableId]: null,
        },
      },
    }));
  },

  clearExternalCables: () => {
    set({
      externalCabling: createInitialExternalCablesState(),
    });
  },

  resetAssembly: () => {
    cancelPendingPostBoot();
    set({
      selectedMotherboard: null,
      assembly: { ...INITIAL_ASSEMBLY_STATE },
      fPanelConnections: connectionsFromAssembly(INITIAL_ASSEMBLY_STATE),
      cableConnections: EMPTY_CABLE_CONNECTIONS,
      elapsedSeconds: 0,
      isTimerRunning: true,
      penaltiesCount: 0,
      postResult: null,
      isBiosOpen: false,
      isScoreModalOpen: false,
      activeAlert: null,
      selectedComponentForPlacement: null,
      inspectedComponent: null,
      activeWorkbenchView: 'bench',
      deskSetup: createInitialDeskSetupState(),
      externalCabling: createInitialExternalCablesState(),
    });
  },

  openCampaignMap: () => set({ isCampaignMapOpen: true }),
  closeCampaignMap: () => set({ isCampaignMapOpen: false }),

  startCampaignMission: (missionId) => {
    const mission = findMission(missionId);
    if (!mission) return;
    const { setup } = mission;
    get().resetAssembly();

    if (setup.diagnosticScenarioId) {
      set({ gameMode: 'DIAGNOSTICO' });
      get().selectDiagnosticScenario(setup.diagnosticScenarioId);
    } else {
      const { assembly, motherboard } = buildMissionInitialState(setup);
      set({
        gameMode: setup.gameMode,
        activeMission: null,
        activeDiagnosticScenario: null,
        selectedMotherboard: motherboard,
        assembly,
        fPanelConnections: connectionsFromAssembly(assembly),
        cableConnections: cableConnectionsFromAssembly(assembly),
      });
    }

    // Mesa: itens já posicionados (do setup do aluno) e cabos já ligados
    const deskPreset = setup.desk;
    if (deskPreset) {
      const inventory = buildDeskInventory(get().studentSetup);
      const wanted = new Set(deskPreset.placed);
      // O monitor com braço a gás exige o braço já fixado
      if (wanted.has('MONITOR_MAIN')) wanted.add('MONITOR_ARM');
      const placedDeskItems = Object.fromEntries(
        inventory.filter((e) => wanted.has(e.targetSnapPoint)).map((e) => [e.targetSnapPoint, e.item])
      );
      set({
        activeWorkbenchView: 'desk',
        deskSetup: { ...createInitialDeskSetupState(), placedDeskItems },
        externalCabling: { connections: { ...createInitialExternalCablesState().connections, ...deskPreset.cables } },
      });
    }

    set({
      activeCampaignMissionId: mission.id,
      missionErrorLog: [],
      postAttempts: 0,
      penaltiesCount: 0,
      elapsedSeconds: 0,
      isTimerRunning: true,
      campaignInventory: {
        clientPartIds: setup.clientPartIds ?? [],
        purchasableCategories: setup.purchasableCategories ?? null,
      },
      campaignHideHelpers: Boolean(setup.hideHelpers),
      isCampaignMapOpen: false,
      missionDebrief: null,
      activeAlert: {
        type: 'success',
        title: `Missão: ${mission.title}`,
        message: mission.briefing,
      },
    });
  },

  abandonCampaignMission: () =>
    set({
      activeCampaignMissionId: null,
      campaignInventory: null,
      campaignHideHelpers: false,
      missionErrorLog: [],
      postAttempts: 0,
      missionDebrief: null,
    }),

  finishCampaignMission: () => {
    const state = get();
    const mission = state.activeCampaignMissionId ? findMission(state.activeCampaignMissionId) : null;
    if (!mission) return null;
    const evaluation = evaluateMission(mission, selectMissionSession(state));
    if (evaluation.completed && evaluation.stars > 0) {
      useProgressStore.getState().recordMissionResult(mission.id, {
        stars: evaluation.stars === 3 ? 3 : evaluation.stars === 2 ? 2 : 1,
        bestTimeSeconds: state.elapsedSeconds,
        completedAt: new Date().toISOString(),
      });
      soundEngine.playSuccessChime();
    } else {
      soundEngine.playErrorBuzz();
    }
    set({ missionDebrief: { missionId: mission.id, evaluation }, isTimerRunning: !evaluation.completed });
    return evaluation;
  },

  closeMissionDebrief: () => {
    const debrief = get().missionDebrief;
    set({ missionDebrief: null });
    // Missão concluída: sai do modo missão; não concluída: o aluno continua tentando
    if (debrief?.evaluation.completed) get().abandonCampaignMission();
  },

  startFromScratch: () => {
    get().abandonCampaignMission();
    get().resetAssembly();
    set({ gameMode: 'OFICINA', resolvedScenarioIds: [], activeMission: null, activeDiagnosticScenario: null, teamName: '' });
    useProgressStore.getState().resetProgress();
    void useAssemblyStore.persist.clearStorage();
    void useProgressStore.persist.clearStorage();
  },
  };
},
    {
      name: STORAGE_KEYS.assembly,
      version: 1,
      storage: createJSONStorage(() => safeStateStorage),
      // Hidratado no cliente (page.tsx), depois do primeiro render: evita divergência com o HTML do servidor
      skipHydration: true,
      partialize: (s) => ({
        gameMode: s.gameMode,
        selectedMotherboard: s.selectedMotherboard,
        activeMission: s.activeMission,
        // O caso de diagnóstico tem funções (isResolved): persiste só o id e reconstrói ao carregar
        activeDiagnosticScenarioId: s.activeDiagnosticScenario?.id ?? null,
        resolvedScenarioIds: s.resolvedScenarioIds,
        teamName: s.teamName,
        elapsedSeconds: s.elapsedSeconds,
        penaltiesCount: s.penaltiesCount,
        assembly: s.assembly,
        studentSetup: s.studentSetup,
        selectedRoomTheme: s.selectedRoomTheme,
        fPanelConnections: s.fPanelConnections,
        cableConnections: s.cableConnections,
        deskSetup: s.deskSetup,
        externalCabling: s.externalCabling,
        activeWorkbenchView: s.activeWorkbenchView,
        activeCampaignMissionId: s.activeCampaignMissionId,
        missionErrorLog: s.missionErrorLog,
        postAttempts: s.postAttempts,
        campaignInventory: s.campaignInventory,
        campaignHideHelpers: s.campaignHideHelpers,
      }),
      merge: (persisted, current) => {
        if (typeof persisted !== 'object' || persisted === null) return current;
        const scenarioId =
          'activeDiagnosticScenarioId' in persisted && typeof persisted.activeDiagnosticScenarioId === 'string'
            ? persisted.activeDiagnosticScenarioId
            : null;
        const scenario = DIAGNOSTIC_SCENARIOS.find((d) => d.id === scenarioId) ?? null;
        return { ...current, ...persisted, activeDiagnosticScenario: scenario, missionDebrief: null, isCampaignMapOpen: false };
      },
      // Versão nova do formato salvo: descarta o salvamento antigo em vez de quebrar
      migrate: () => ({}),
    }
  )
);

/**
 * Guarda central de energia da mesa (Fase 4).
 * Se a estação estiver ligada e deixar de cumprir qualquer requisito (cabo puxado, periférico
 * retirado, peça removida na bancada...), o PC apaga. Assim, reconectar o cabo leva a
 * READY_TO_BOOT e exige apertar o botão de novo, em vez de "pular" direto para RUNNING.
 */
useAssemblyStore.subscribe((state) => {
  if (!state.deskSetup.isDeskPoweredOn) return;
  // Vídeo errado/desconectado não desliga o PC (o monitor mostra SEM SINAL); falta de energia sim
  if (selectCanPowerOnDesk(state).allowed) return;
  useAssemblyStore.setState({
    deskSetup: { ...state.deskSetup, isDeskPoweredOn: false },
    activeAlert: {
      type: 'warning',
      title: 'Computador Desligado',
      message:
        'A estação perdeu a energia ou um item essencial (cabo de força, gabinete, periférico ou peça) e desligou. Corrija e ligue novamente.',
    },
  });
});
