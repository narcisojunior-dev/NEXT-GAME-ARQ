import { AssemblyState, MotherboardComponent } from './types';
import { CableId, cableById, getRequiredCables } from './cabling';

/**
 * Checklist da montagem na bancada: fonte única para o painel "Objetivo atual" e para a
 * mensagem que explica por que o PC ainda não pode ir para a mesa.
 * Cobre TODOS os requisitos de derivePhase(...) === 'PHASE_7_BOOT_POST' (validado em teste):
 * antes, parafusar a placa e a placa de vídeo não apareciam e o checklist chegava a 100%
 * com a montagem ainda presa na fase 5.
 */
export type AssemblyStepId =
  | 'esd'
  | 'motherboard'
  | 'cpu'
  | 'lever'
  | 'paste'
  | 'cooler'
  | 'ram'
  | 'storage'
  | 'case_prep'
  | 'mb_screws'
  | 'gpu'
  | 'fpanel'
  | 'cables'
  | 'boot';

export interface AssemblyStep {
  id: AssemblyStepId;
  title: string;
  desc: string;
  isDone: boolean;
}

export interface ChecklistContext {
  cableConnections: Partial<Record<CableId, string | null>>;
  /** O POST já passou (o último passo é ligar o PC de verdade, não só a chave da fonte) */
  bootSuccess: boolean;
}

export function buildAssemblyChecklist(
  assembly: AssemblyState,
  mb: MotherboardComponent | null,
  { cableConnections, bootSuccess }: ChecklistContext
): AssemblyStep[] {
  const needsGpu = !assembly.cpuInstalled?.hasIntegratedGpu;
  const gpuNeedsPower = Boolean(assembly.gpuInstalled && assembly.gpuInstalled.powerPins !== 'none');
  const requiredCables = getRequiredCables(assembly);
  const missingCables = requiredCables.filter((id) => cableConnections[id] !== cableById(id).target);

  const raw: (Omit<AssemblyStep, 'title'> & { label: string })[] = [
    { id: 'esd', label: 'Descarregar Estática (ESD)', desc: 'Toque no botão de aterramento para proteger os circuitos.', isDone: assembly.esdDischarged },
    {
      id: 'motherboard',
      label: 'Escolher e Posicionar Placa-Mãe',
      desc: 'Escolha a placa-mãe no inventário e assente-a na bancada.',
      isDone: mb !== null,
    },
    { id: 'cpu', label: 'Instalar Processador (CPU)', desc: 'Alinhe o triângulo dourado com o soquete.', isDone: assembly.cpuInstalled !== null },
    {
      id: 'lever',
      label: 'Travar a Alavanca do Soquete',
      desc: 'Abaixe a alavanca lateral do soquete até travar (pino "Alavanca do Soquete" na bancada).',
      isDone: assembly.socketLeverLocked,
    },
    { id: 'paste', label: 'Aplicar Pasta Térmica', desc: 'Uma gota central do tamanho de uma ervilha.', isDone: assembly.thermalPasteApplied },
    {
      id: 'cooler',
      label: 'Fixar Cooler & Conectar CPU_FAN',
      desc: 'Aperte os parafusos e ligue o cabo do ventilador.',
      isDone: assembly.coolerInstalled !== null && assembly.coolerFanConnected,
    },
    {
      id: 'ram',
      label: 'Instalar Memória RAM (Dual Channel)',
      desc: 'Encaixe nos slots 2 e 4 até ouvir o duplo clique.',
      isDone: assembly.ramInstalledSlot2 !== null || assembly.ramInstalledSlot4 !== null,
    },
    {
      id: 'storage',
      label: 'Instalar Armazenamento (SSD/HD)',
      desc: 'NVMe vai no slot M.2 da placa; SSD SATA e HD vão na baia com cabo de dados e energia SATA (15 pinos).',
      isDone:
        assembly.storageInstalled !== null &&
        (assembly.storageInstalled.storageType === 'NVMe_M2' || assembly.cableSataConnected),
    },
    {
      id: 'case_prep',
      label: 'Gabinete, Fonte, Espelho I/O & Espaçadores',
      desc: 'Escolha um gabinete compatível, encaixe a fonte, o espelho traseiro e os espaçadores dourados.',
      isDone:
        assembly.caseInstalled !== null &&
        assembly.psuInstalled !== null &&
        (assembly.ioShieldInstalled || Boolean(mb?.hasIntegratedIoShield)) &&
        assembly.standoffsInstalled,
    },
    {
      id: 'mb_screws',
      label: 'Parafusar a Placa-Mãe',
      desc: 'Aperte os parafusos M3 sobre os espaçadores.',
      isDone: assembly.motherboardScrewed,
    },
    {
      id: 'gpu',
      label: 'Encaixar e Parafusar a Placa de Vídeo',
      desc: assembly.gpuInstalled
        ? 'Parafuse o suporte traseiro da GPU no gabinete (pino "PCIe x16").'
        : needsGpu
        ? 'Este processador não tem vídeo integrado: encaixe uma placa de vídeo no PCIe x16.'
        : 'Opcional: o processador tem vídeo integrado.',
      isDone: assembly.gpuInstalled ? assembly.gpuScrewed : !needsGpu,
    },
    {
      id: 'fpanel',
      label: 'Ligar Painel Frontal (F_PANEL)',
      desc: assembly.frontPanelPowerSwConnected
        ? 'Botão POWER SW conectado nos pinos da placa-mãe ✓'
        : 'Ligue o conector POWER SW nos pinos F_PANEL da placa.',
      isDone: assembly.frontPanelPowerSwConnected,
    },
    {
      id: 'cables',
      label: 'Cabos de Energia e do Gabinete',
      desc:
        missingCables.length > 0
          ? `Faltam: ${missingCables.map((id) => cableById(id).name).join(', ')}.`
          : `ATX 24P, CPU 8P${gpuNeedsPower ? ', PCIe da GPU' : ''} e cabos do gabinete ligados ✓`,
      isDone: assembly.psuInstalled !== null && missingCables.length === 0,
    },
    {
      id: 'boot',
      label: 'Ligar o PC (Teste POST)',
      desc: 'Ligue a chave da fonte [I] e pressione o botão Ligar!',
      isDone: bootSuccess,
    },
  ];
  return raw.map(({ label, ...step }, i) => ({ ...step, title: `${i + 1}. ${label}` }));
}

/** Passos da montagem (sem o boot) que ainda impedem levar o PC para a mesa */
export function pendingBenchSteps(steps: AssemblyStep[]): AssemblyStep[] {
  return steps.filter((s) => s.id !== 'boot' && !s.isDone);
}
