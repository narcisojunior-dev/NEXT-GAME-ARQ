import { AssemblyState } from './types';
import { DeskSnapPointId, PlacedDeskItem } from './deskSetup';
import { EXTERNAL_PORTS, ExternalCablingState, validateExternalCableConnection } from './externalCabling';

/**
 * Estado da tela do monitor 3D (Fase 4 · Issue 05), derivado só do estado físico:
 * energia do monitor, PC ligado e onde o cabo de vídeo está conectado.
 */
export type MonitorScreenState =
  /** Não há monitor na mesa */
  | 'NO_MONITOR'
  /** Monitor sem cabo de força: tela e LED apagados */
  | 'OFF'
  /** Monitor energizado aguardando o PC: tela preta, LED âmbar */
  | 'STANDBY'
  /** PC ligado, mas nenhum sinal chega à entrada do monitor */
  | 'NO_SIGNAL'
  /** Imagem: POST → AcademyOS */
  | 'SIGNAL';

export type NoSignalReason = 'NO_CABLE' | 'GPU_BYPASS_NO_SIGNAL' | 'NO_IGPU_NO_SIGNAL' | 'PORT_NOT_PRESENT' | 'INCOMPATIBLE_PORT';

export type MonitorLed = 'OFF' | 'AMBER' | 'ON';

export interface MonitorScreenInfo {
  state: MonitorScreenState;
  led: MonitorLed;
  reason?: NoSignalReason;
  /** Entrada usada pelo monitor (exibida no aviso "SEM SINAL" e na barra do AcademyOS) */
  input?: 'HDMI' | 'DisplayPort';
  /** Texto curto para o aluno (também anunciado a leitores de tela) */
  title: string;
  message: string;
  keyboardDetected: boolean;
  mouseDetected: boolean;
  /** Com imagem, mas o POST do PC reprovou: a tela para na mensagem de erro */
  postFailure?: { title: string; message: string };
}

export interface DeriveMonitorScreenParams {
  placedDeskItems: Partial<Record<DeskSnapPointId, PlacedDeskItem>>;
  externalCabling: ExternalCablingState;
  assembly: AssemblyState;
  isPcPoweredOn: boolean;
  postFailure?: { title: string; message: string } | null;
}

const NO_SIGNAL_MESSAGES: Record<NoSignalReason, string> = {
  NO_CABLE: 'Nenhum cabo de vídeo chega ao monitor. Conecte o cabo HDMI/DisplayPort entre o PC e o monitor.',
  GPU_BYPASS_NO_SIGNAL:
    'O cabo de vídeo está na placa-mãe, mas este PC tem placa de vídeo dedicada: o sinal sai pelas portas da GPU.',
  NO_IGPU_NO_SIGNAL: 'O processador não tem vídeo integrado: as saídas da placa-mãe não geram imagem.',
  PORT_NOT_PRESENT: 'O cabo está numa saída que não existe neste PC.',
  INCOMPATIBLE_PORT: 'Os conectores das duas pontas do cabo de vídeo não são compatíveis.',
};

export function deriveMonitorScreen(params: DeriveMonitorScreenParams): MonitorScreenInfo {
  const { placedDeskItems, externalCabling, assembly, isPcPoweredOn } = params;
  const { connections } = externalCabling;
  const keyboardDetected = isPcPoweredOn && Boolean(connections.CABLE_USB_KEYBOARD);
  const mouseDetected = isPcPoweredOn && Boolean(connections.CABLE_USB_MOUSE);
  const base = { keyboardDetected, mouseDetected };

  if (!placedDeskItems.MONITOR_MAIN) {
    return { ...base, state: 'NO_MONITOR', led: 'OFF', title: 'Sem monitor', message: 'Posicione o monitor na mesa.' };
  }
  if (!connections.CABLE_POWER_MONITOR) {
    return {
      ...base,
      state: 'OFF',
      led: 'OFF',
      title: 'Monitor sem energia',
      message: 'Conecte o cabo de força do monitor na tomada.',
    };
  }
  if (!isPcPoweredOn) {
    return {
      ...base,
      state: 'STANDBY',
      led: 'AMBER',
      title: 'Monitor em espera',
      message: 'O monitor está energizado e aguarda o computador ser ligado.',
    };
  }

  const display = connections.CABLE_DISPLAY;
  if (!display) {
    return { ...base, state: 'NO_SIGNAL', led: 'AMBER', reason: 'NO_CABLE', title: 'SEM SINAL', message: NO_SIGNAL_MESSAGES.NO_CABLE };
  }

  const input = EXTERNAL_PORTS[display.destPort].portType === 'DP' ? 'DisplayPort' : 'HDMI';
  const validation = validateExternalCableConnection('CABLE_DISPLAY', display.sourcePort, display.destPort, assembly);
  if (!validation.allowed || !validation.isPedagogicallyValid) {
    const reason: NoSignalReason =
      validation.errorType === 'GPU_BYPASS_NO_SIGNAL' ||
      validation.errorType === 'NO_IGPU_NO_SIGNAL' ||
      validation.errorType === 'PORT_NOT_PRESENT'
        ? validation.errorType
        : 'INCOMPATIBLE_PORT';
    return { ...base, state: 'NO_SIGNAL', led: 'AMBER', reason, input, title: 'SEM SINAL', message: NO_SIGNAL_MESSAGES[reason] };
  }

  if (params.postFailure) {
    return {
      ...base,
      state: 'SIGNAL',
      led: 'ON',
      input,
      postFailure: params.postFailure,
      title: 'Falha no POST',
      message: params.postFailure.message,
    };
  }

  return {
    ...base,
    state: 'SIGNAL',
    led: 'ON',
    input,
    title: 'Imagem OK',
    message: `Sinal de vídeo recebido pela entrada ${input}.`,
  };
}

/* ------------------------------------------------------------------------------------
 * Linha do tempo do boot exibida na tela (POST → carregamento → área de trabalho)
 * ------------------------------------------------------------------------------------ */
export type BootPhase = 'POST' | 'LOADING' | 'DESKTOP';

export const BOOT_TIMELINE_MS = { POST: 1800, LOADING: 1800 } as const;

export function getBootPhase(elapsedMs: number): BootPhase {
  if (elapsedMs < BOOT_TIMELINE_MS.POST) return 'POST';
  if (elapsedMs < BOOT_TIMELINE_MS.POST + BOOT_TIMELINE_MS.LOADING) return 'LOADING';
  return 'DESKTOP';
}
