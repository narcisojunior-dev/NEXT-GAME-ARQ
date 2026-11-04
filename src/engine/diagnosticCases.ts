import { AssemblyState, MotherboardComponent } from './types';
import { CPUS, MOTHERBOARDS, RAMS, COOLERS, STORAGES, GPUS, PSUS, CASES } from './hardwareCatalog';

/** Causas que o aluno pode apontar como hipótese antes de abrir a máquina (#32) */
export type DiagnosticCauseId =
  | 'PSU_SWITCH'
  | 'POWER_SW'
  | 'THERMAL_PASTE'
  | 'RAM_MISSING'
  | 'STANDOFFS'
  | 'NO_VIDEO_OUTPUT'
  | 'EPS_CABLE'
  | 'FRONT_USB'
  | 'GPU_POWER'
  | 'BIOS_BATTERY';

export const DIAGNOSTIC_CAUSES: Record<DiagnosticCauseId, string> = {
  PSU_SWITCH: 'Chave I/O da fonte desligada',
  POWER_SW: 'Botão Power desconectado do F_PANEL',
  THERMAL_PASTE: 'Falta de pasta térmica entre CPU e cooler',
  RAM_MISSING: 'Memória RAM ausente ou mal encaixada',
  STANDOFFS: 'Placa encostando no gabinete (sem espaçadores)',
  NO_VIDEO_OUTPUT: 'Sem saída de vídeo (CPU sem vídeo integrado e sem GPU)',
  EPS_CABLE: 'Cabo EPS 8 pinos da CPU solto',
  FRONT_USB: 'Cabo USB frontal desligado da placa',
  GPU_POWER: 'Cabo PCIe da placa de vídeo solto',
  BIOS_BATTERY: 'Bateria CR2032 da BIOS descarregada',
};

export interface DiagnosticScenario {
  id: string;
  /** Causa real do defeito (a hipótese correta) */
  cause: DiagnosticCauseId;
  /** Outras formas de o cliente relatar o mesmo sintoma (sorteadas a cada chamado) */
  symptomVariants: string[];
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
const defaultCase = CASES.find((c) => c.id === 'case-gamer-mesh') || CASES[0];

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
  cableSataConnected: true,
  caseInstalled: defaultCase,
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
  caseFansConnected: true,
  frontUsbConnected: true,
  frontAudioConnected: true,
  psuSwitchOn: true,
};

export const DIAGNOSTIC_SCENARIOS: DiagnosticScenario[] = [
  {
    id: 'case-psu-switch',
    cause: 'PSU_SWITCH',
    symptomVariants: ['Aperto o botão e nada: nem luz, nem barulho de ventoinha.', 'O PC parece desligado da tomada, mas o cabo está ligado.'],
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
    cause: 'POWER_SW',
    symptomVariants: ['A luz da fonte acende, mas o botão do gabinete parece decorativo.', 'Com a tomada ligada, apertar o Power não faz o PC partir.'],
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
    cause: 'THERMAL_PASTE',
    symptomVariants: ['Liga, as ventoinhas aceleram e depois de alguns segundos tudo apaga.', 'O PC desliga sozinho logo depois de ligar, cada vez mais rápido.'],
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
    solutionHint: 'Remova o cooler, aplique a pasta térmica sobre a CPU, reinstale o cooler e conecte o cabo CPU_FAN.',
    isResolved: (state) => Boolean(state.thermalPasteApplied && state.coolerInstalled && state.coolerFanConnected),
    rewardPoints: 1500,
  },
  {
    id: 'case-ram-dram-led',
    cause: 'RAM_MISSING',
    symptomVariants: ['Liga, mas o monitor fica preto e acende uma luz vermelha escrita DRAM.', 'As ventoinhas giram, sem imagem, e a placa mostra o LED da memória aceso.'],
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
    cause: 'STANDOFFS',
    symptomVariants: ['A fonte dá um estalo e desliga na hora em que aperto o Power.', 'Logo ao ligar ouço um clique da fonte e tudo apaga.'],
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
    cause: 'NO_VIDEO_OUTPUT',
    symptomVariants: ['Tudo liga, mas o monitor ligado na placa-mãe diz “Sem sinal”.', 'As luzes acendem e o LED VGA fica vermelho; a tela não mostra nada.'],
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
  {
    id: 'case-eps-loose',
    cause: 'EPS_CABLE',
    symptomVariants: [
      'As ventoinhas giram, mas a tela não liga e o LED CPU fica vermelho.',
      'Depois de trocar o gabinete, o PC acende as luzes e para no LED do processador.',
    ],
    title: 'Caso #7: "LED CPU Aceso Depois da Troca de Gabinete"',
    difficulty: 'MÉDIO',
    clientName: 'Ana Paula',
    clientRole: 'Técnica do Laboratório de Informática',
    clientAvatar: '👩‍🏭',
    clientStory:
      'Passei as peças de um gabinete velho para um novo, mais espaçoso. Liguei tudo de novo, as ventoinhas giram, mas não aparece imagem e a placa-mãe acende a luzinha vermelha do CPU.',
    symptomSummary: 'Ventoinhas giram, sem vídeo, LED CPU aceso.',
    symptomTechnical: 'Sem 12 V no conector ATX12V perto do soquete: o regulador de tensão (VRM) da CPU não recebe energia.',
    motherboard: defaultMb,
    initialAssembly: {
      ...baseWorkingAssembly,
      cableCpu8PinConnected: false,
    },
    defectExplanation:
      'O processador não é alimentado pelo cabo de 24 pinos: ele tem um cabo próprio, o EPS de 8 pinos (CPU), que vai no canto superior esquerdo da placa. Na troca de gabinete ele costuma ficar para trás, porque passa por trás da chapa.',
    solutionHint: 'Ligue o cabo EPS 8 pinos (CPU) da fonte no conector ATX12V, ao lado do soquete.',
    isResolved: (state) => Boolean(state.cableCpu8PinConnected),
    rewardPoints: 1400,
  },
  {
    id: 'case-front-usb',
    cause: 'FRONT_USB',
    symptomVariants: [
      'O pen drive funciona atrás do gabinete, mas na frente não é reconhecido.',
      'Nenhum dispositivo funciona nas portas USB da frente do gabinete.',
    ],
    title: 'Caso #8: "USB da Frente Não Funciona"',
    difficulty: 'FÁCIL',
    clientName: 'Rafael Costa',
    clientRole: 'Professor de Matemática',
    clientAvatar: '🧑‍🏫',
    clientStory:
      'O computador liga e funciona normalmente, mas quando coloco o pen drive com as provas na frente do gabinete, nada acontece. Atrás funciona! Será que a porta da frente queimou?',
    symptomSummary: 'O PC funciona, mas as portas USB frontais não reconhecem nada.',
    symptomTechnical: 'Portas frontais sem 5 V e sem dados: o cabo do painel frontal não chega ao cabeçalho USB 3.0 da placa.',
    motherboard: defaultMb,
    initialAssembly: {
      ...baseWorkingAssembly,
      frontUsbConnected: false,
    },
    defectExplanation:
      'As portas da frente do gabinete são só uma extensão: um cabo de 19 pinos precisa estar ligado no cabeçalho USB 3.0 da placa-mãe. Sem ele, o PC funciona, mas as portas frontais ficam mortas.',
    solutionHint: 'Ligue o cabo USB 3.0 frontal no cabeçalho USB3 (19 pinos) da placa-mãe — não no USB 2.0.',
    isResolved: (state) => Boolean(state.frontUsbConnected),
    rewardPoints: 1100,
  },
];

