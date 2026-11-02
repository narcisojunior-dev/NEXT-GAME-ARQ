import { AssemblyState, MotherboardComponent } from './types';
import { CPUS, MOTHERBOARDS, RAMS, COOLERS, STORAGES, GPUS, PSUS } from './hardwareCatalog';

export interface DiagnosticScenario {
  id: string;
  title: string;
  difficulty: 'FÁCIL' | 'MÉDIO' | 'AVANÇADO';
  clientName: string;
  clientRole: string;
  clientAvatar: string;
  clientStory: string;
  symptomSummary: string;
  symptomTechnical: string;
  motherboard: MotherboardComponent;
  initialAssembly: AssemblyState;
  defectExplanation: string;
  solutionHint: string;
  isResolved: (state: AssemblyState, mb: MotherboardComponent) => boolean;
  rewardPoints: number;
}

const defaultMb = MOTHERBOARDS.find((m) => m.id === 'mb-b760m-d5') || MOTHERBOARDS[0];
const defaultCpu = CPUS.find((c) => c.id === 'cpu-i5-13400f') || CPUS[0];
const defaultRam = RAMS.find((r) => r.id === 'ram-16gb-d5-dual') || RAMS[0];
const defaultCooler = COOLERS[0];
const defaultStorage = STORAGES[0];
const defaultGpu = GPUS[0];
const defaultPsu = PSUS.find((p) => p.wattage === 650) || PSUS[0];

const baseWorkingAssembly: AssemblyState = {
  esdDischarged: true,
  cpuInstalled: defaultCpu,
  socketLeverLocked: true,
  thermalPasteApplied: true,
  coolerInstalled: defaultCooler,
  coolerFanConnected: true,
  ramInstalledSlot2: defaultRam,
  ramInstalledSlot4: defaultRam,
  storageInstalled: defaultStorage,
  ioShieldInstalled: true,
  standoffsInstalled: true,
  psuInstalled: defaultPsu,
  motherboardScrewed: true,
  gpuInstalled: defaultGpu,
  gpuScrewed: true,
  cableAtx24PinConnected: true,
  cableCpu8PinConnected: true,
  cableGpuPcieConnected: true,
  frontPanelPowerSwConnected: true,
  frontPanelResetSwConnected: true,
  frontPanelLedsConnected: true,
  psuSwitchOn: true,
};

export const DIAGNOSTIC_SCENARIOS: DiagnosticScenario[] = [
  {
    id: 'case-psu-switch',
    title: 'Caso #1: "PC Morto" (Nenhum Sinal de Vida)',
    difficulty: 'FÁCIL',
    clientName: 'Prof. Marcos',
    clientRole: 'Coordenador do Laboratório de Robótica',
    clientAvatar: '👨‍🏫',
    clientStory:
      'Ontem à tarde o computador estava funcionando normalmente. Hoje cheguei para abrir a aula, tentei ligar e não deu sinal nenhum de vida: nenhum LED, nenhuma ventoinha girando. Achei que a fonte queimou com a chuva de ontem!',
    symptomSummary: 'O computador não liga nada ao apertar o botão Power.',
    symptomTechnical: 'Linha primária de 12V em 0V. O circuito de Standby da placa-mãe não recebe corrente.',
    motherboard: defaultMb,
    initialAssembly: {
      ...baseWorkingAssembly,
      psuSwitchOn: false, // Chave I/O desligada
    },
    defectExplanation:
      'Muitas vezes alguém esbarra na chave I/O atrás da fonte ou ela foi desligada intencionalmente na faxina. Basta colocar a chave na posição [I] (Ligado)!',
    solutionHint: 'Verifique a chave seletora I/O na parte traseira da fonte de alimentação.',
    isResolved: (state) => Boolean(state.psuInstalled && state.psuSwitchOn),
    rewardPoints: 1000,
  },
  {
    id: 'case-power-sw-loose',
    title: 'Caso #2: "Botão Fantasma" (Chave Conectada, Mas Botão Não Age)',
    difficulty: 'FÁCIL',
    clientName: 'Lucas Ferreira',
    clientRole: 'Aluno do 1º Ano B',
    clientAvatar: '🧑‍🎓',
    clientStory:
      'Fui limpar a poeira de dentro do meu gabinete no final de semana e tirei uns fios fininhos coloridos para passar o pincel. Conectei quase tudo de volta, a luz da fonte acende, mas ao apertar o botão Power do gabinete nada acontece!',
    symptomSummary: 'Pressionar o botão Power do gabinete não tem efeito nenhum.',
    symptomTechnical: 'Conector POWER SW desconectado dos pinos do cabeçalho F_PANEL da placa-mãe.',
    motherboard: defaultMb,
    initialAssembly: {
      ...baseWorkingAssembly,
      frontPanelPowerSwConnected: false, // Cabo do botão Power solto
    },
    defectExplanation:
      'O botão frontal do gabinete é um interruptor momentâneo. Se o conector "POWER SW" não estiver encaixado nos pinos corretos do painel frontal da placa-mãe, o circuito não fecha.',
    solutionHint: 'Conecte o conector POWER SW no cabeçalho F_PANEL da placa-mãe.',
    isResolved: (state) => Boolean(state.frontPanelPowerSwConnected),
    rewardPoints: 1200,
  },
  {
    id: 'case-thermal-shutdown',
    title: 'Caso #3: "Desligamento Térmico de Emergência"',
    difficulty: 'MÉDIO',
    clientName: 'Camila Rocha',
    clientRole: 'Editora de Vídeo do Grêmio Estudantil',
    clientAvatar: '👩‍💻',
    clientStory:
      'O computador liga, as ventoinhas começam a girar bem rápido e barulhentas, mas depois de 10 a 15 segundos ele desliga sozinho do nada! Se eu tentar ligar logo em seguida, ele desliga ainda mais rápido.',
    symptomSummary: 'O PC desliga abruptamente poucos segundos após ser ligado.',
    symptomTechnical: 'Temperatura da CPU sobe para 105°C no boot. O circuito PROCHOT/Thermal Trip desliga a placa para proteção.',
    motherboard: defaultMb,
    initialAssembly: {
      ...baseWorkingAssembly,
      thermalPasteApplied: false, // Pasta térmica ausente
    },
    defectExplanation:
      'Sem a pasta térmica preenchendo as ranhuras microscópicas entre o IHS do processador e a base de cobre do cooler, o ar atua como isolante térmico e a CPU atinge 105°C quase instantaneamente.',
    solutionHint: 'Aplique a pasta térmica sobre a CPU e garanta que o cooler esteja devidamente fixado.',
    isResolved: (state) => Boolean(state.thermalPasteApplied && state.coolerInstalled && state.coolerFanConnected),
    rewardPoints: 1500,
  },
  {
    id: 'case-ram-dram-led',
    title: 'Caso #4: "Tela Preta & LED DRAM Aceso"',
    difficulty: 'MÉDIO',
    clientName: 'Beatriz Lima',
    clientRole: 'Aluna do Curso Técnico de Informática',
    clientAvatar: '👩‍🔧',
    clientStory:
      'Liguei o computador hoje para estudar, os ventiladores ligam e ficam girando, mas a tela do monitor fica preta sem sinal. Reparei que tem uma luzinha vermelha bem brilhante acesa na placa-mãe perto do nome DRAM.',
    symptomSummary: 'Computador liga as ventoinhas, mas não dá vídeo e o LED DRAM fica aceso em vermelho.',
    symptomTechnical: 'Falha de inicialização no barramento de memória (POST DRAM Fail). Nenhuma RAM funcional detectada.',
    motherboard: defaultMb,
    initialAssembly: {
      ...baseWorkingAssembly,
      ramInstalledSlot2: null,
      ramInstalledSlot4: null, // Sem RAM instalada nos slots
    },
    defectExplanation:
      'O LED de diagnóstico DRAM acende quando a placa-mãe não consegue comunicação com a memória RAM. O pente precisa estar firmemente encaixado nos slots prioritários (geralmente slot 2 ou 4) com as travas fechadas.',
    solutionHint: 'Instale pentes de memória RAM compatíveis nos slots 2 e 4 da placa-mãe.',
    isResolved: (state, mb) => {
      const hasRam = Boolean(state.ramInstalledSlot2 || state.ramInstalledSlot4);
      if (!hasRam) return false;
      if (state.ramInstalledSlot2 && state.ramInstalledSlot2.ramType !== mb.supportedRam) return false;
      if (state.ramInstalledSlot4 && state.ramInstalledSlot4.ramType !== mb.supportedRam) return false;
      return true;
    },
    rewardPoints: 1400,
  },
  {
    id: 'case-short-circuit-standoffs',
    title: 'Caso #5: "Curto-Circuito com a Lata do Gabinete"',
    difficulty: 'AVANÇADO',
    clientName: 'Renato Silva',
    clientRole: 'Estagiário de Manutenção Escolar',
    clientAvatar: '👨‍💼',
    clientStory:
      'Montei as peças em um gabinete novo da escola. Apertei bem todos os parafusos na carcaça de metal. Mas quando coloco na tomada e tento ligar, a fonte faz um estalo rápido e apaga na hora!',
    symptomSummary: 'A fonte desarma imediatamente com barulho de desarme de proteção (estalo/clique).',
    symptomTechnical: 'Acionamento da proteção contra curto-circuito (SCP/Short-Circuit Protection) da fonte ATX.',
    motherboard: defaultMb,
    initialAssembly: {
      ...baseWorkingAssembly,
      standoffsInstalled: false, // Sem espaçadores de latão
    },
    defectExplanation:
      'A parte traseira da placa-mãe tem centenas de pontos de solda expostos com energia viva. Sem os espaçadores de latão (standoffs), esses pontos tocam direto na chapa de ferro do chassi, causando curto-circuito geral!',
    solutionHint: 'Instale os espaçadores dourados de latão (Standoffs) antes de parafusar a placa-mãe.',
    isResolved: (state) => Boolean(state.standoffsInstalled && state.motherboardScrewed),
    rewardPoints: 1600,
  },
  {
    id: 'case-cpu-f-no-gpu',
    title: 'Caso #6: "Processador Linha F Sem Placa de Vídeo"',
    difficulty: 'AVANÇADO',
    clientName: 'Guilherme Santos',
    clientRole: 'Capitão da Equipe de E-sports Escolar',
    clientAvatar: '🎮',
    clientStory:
      'Comprei um processador Core i5-13400F e montei tudo certinho. Pluguei o cabo HDMI na placa-mãe, liguei o PC, as luzes acenderam, mas o monitor fica em tela preta dizendo "Sem Sinal de Entrada". O processador veio estragado?',
    symptomSummary: 'O computador liga completamente, mas não gera sinal de vídeo na porta HDMI da placa-mãe.',
    symptomTechnical: 'CPU com sufixo "F" não possui chip gráfico integrado (iGPU). O LED VGA fica aceso em vermelho.',
    motherboard: defaultMb,
    initialAssembly: {
      ...baseWorkingAssembly,
      gpuInstalled: null,
      gpuScrewed: false,
      cableGpuPcieConnected: false,
    },
    defectExplanation:
      'Processadores com sufixo "F" (como i3-12100F, i5-13400F) não têm chip gráfico interno! As saídas HDMI/DisplayPort da placa-mãe ficam desativadas. É obrigatório instalar uma placa de vídeo dedicada e conectar o monitor nela.',
    solutionHint: 'Instale uma placa de vídeo (GPU) no slot PCIe x16 e conecte a alimentação PCIe da fonte.',
    isResolved: (state) => Boolean(state.gpuInstalled && state.gpuScrewed && state.cableGpuPcieConnected),
    rewardPoints: 1800,
  },
];
