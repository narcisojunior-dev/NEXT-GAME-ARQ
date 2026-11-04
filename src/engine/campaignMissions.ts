import { CampaignMission, CampaignTrack, CampaignTrackId, MissionPartsPreset } from './campaign';

/**
 * Campanha "Jornada do Técnico": 5 trilhas (uma por módulo de jogo), missões sequenciais em
 * cada uma. Metas de FPS, pontuação e orçamento foram calibradas no motor de benchmark e
 * conferidas por testes (a montagem de referência conclui; a armadilha falha na lição).
 */
export const CAMPAIGN_TRACKS: CampaignTrack[] = [
  { id: 'OFICINA', title: 'Oficina Guiada', description: 'Aprenda a montagem completa, etapa por etapa, na bancada.', icon: '🛠️' },
  { id: 'JORNADA', title: 'Jornada do Técnico', description: 'Clientes reais, orçamentos e armadilhas clássicas de compatibilidade.', icon: '🧑‍🔧' },
  { id: 'DIAGNOSTICO', title: 'Laboratório de Diagnóstico', description: 'O que está quebrado? Descubra e corrija o defeito de cada cliente.', icon: '🔍' },
  { id: 'MESA', title: 'Mesa & Battlestation', description: 'Leve o PC para a mesa, cabeie tudo e ligue a estação.', icon: '🖥️' },
  { id: 'DESAFIO', title: 'Desafio em Grupos', description: 'Montagens cronometradas para a turma competir.', icon: '🏆' },
];

/** PC de referência já montado e cabeado (missões da mesa) */
const READY_PC: MissionPartsPreset = {
  motherboardId: 'mb-b650m-am5',
  cpuId: 'cpu-r5-7600',
  coolerId: 'cooler-deepcool-ag400',
  ramId: 'ram-16gb-d5-dual',
  storageId: 'ssd-nvme-1tb',
  gpuId: 'gpu-rtx-4060',
  psuId: 'psu-650w-bronze',
  caseId: 'case-gamer-mesh',
};
const READY_PC_IDS = Object.values(READY_PC).filter((id): id is string => typeof id === 'string');

const REQUIRED_DESK = ['DESK_BASE', 'PC_TOWER', 'MONITOR_MAIN', 'KEYBOARD', 'MOUSE'] as const;
const REQUIRED_CABLES = ['CABLE_POWER_AC', 'CABLE_POWER_MONITOR', 'CABLE_USB_KEYBOARD', 'CABLE_USB_MOUSE'] as const;

const ASSISTENTE = { name: 'Seu Jorge', role: 'Dono da assistência técnica', avatar: '👨‍🔧' };

/* ====================================================================================
 * 1. OFICINA GUIADA — as 7 fases canônicas, uma por missão
 * ==================================================================================== */
const OFICINA: CampaignMission[] = [
  {
    id: 'oficina-01', track: 'OFICINA', order: 1, title: 'Bancada Segura', lesson: 'Descarga eletrostática (ESD)',
    client: ASSISTENTE,
    briefing: 'Antes de tocar em qualquer peça, descarregue a eletricidade estática do corpo na pulseira/tapete antiestático.',
    setup: { gameMode: 'OFICINA' },
    objectives: [{ kind: 'PHASE_REACHED', phase: 'PHASE_2_BENCH_ASSEMBLY' }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'Tocar na placa-mãe sem descarregar a estática pode queimar componentes sem deixar marca visível.',
    debriefing: 'A estática do corpo chega a milhares de volts: pouca energia, mas o suficiente para danificar trilhas microscópicas.',
    question: { prompt: 'Por que descarregar a estática antes da montagem?', options: ['Para o PC ligar mais rápido', 'Para não danificar os chips com uma descarga', 'Para aquecer as peças', 'Não é necessário'], correctIndex: 1, explanation: 'Uma descarga eletrostática pode danificar transistores sem deixar marca.' },
  },
  {
    id: 'oficina-02', track: 'OFICINA', order: 2, title: 'Pré-Gabinete', lesson: 'CPU, pasta, cooler e RAM na bancada',
    client: ASSISTENTE,
    briefing: 'Monte a placa fora do gabinete: CPU, alavanca, pasta térmica, cooler, ventoinha e memória.',
    setup: { gameMode: 'OFICINA' },
    objectives: [{ kind: 'PHASE_REACHED', phase: 'PHASE_3_CASE_PREPARATION' }],
    bonus: [{ kind: 'NO_PENALTIES' }, { kind: 'TIME_MAX', seconds: 420 }],
    trap: 'Instalar o cooler antes da pasta térmica deixa uma camada de ar isolante sobre a CPU.',
    debriefing: 'Montar na bancada é mais fácil e permite testar antes de fechar o gabinete.',
    question: { prompt: 'Onde a pasta térmica é aplicada?', options: ['Na base do gabinete', 'Entre a CPU e o cooler', 'Nos pentes de memória', 'No conector da fonte'], correctIndex: 1, explanation: 'Ela preenche as ranhuras microscópicas entre o IHS e a base do cooler.' },
  },
  {
    id: 'oficina-03', track: 'OFICINA', order: 3, title: 'Gabinete e Fonte', lesson: 'Espaçadores, espelho I/O e fonte',
    client: ASSISTENTE,
    briefing: 'Prepare o gabinete: espaçadores dourados, espelho I/O (se a placa não tiver integrado) e a fonte.',
    setup: { gameMode: 'OFICINA' },
    objectives: [{ kind: 'PHASE_REACHED', phase: 'PHASE_4_MOTHERBOARD_INSTALL' }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'Sem espaçadores, a placa encosta no chassi de metal e entra em curto.',
    debriefing: 'Os espaçadores mantêm a placa afastada do chassi e alinhada aos furos.',
    question: { prompt: 'Para que servem os espaçadores dourados?', options: ['Decoração', 'Afastar a placa do chassi e evitar curto', 'Prender a fonte', 'Resfriar a placa'], correctIndex: 1, explanation: 'Eles isolam a placa do metal do gabinete.' },
  },
  {
    id: 'oficina-04', track: 'OFICINA', order: 4, title: 'Fixar a Placa', lesson: 'Parafusar a placa-mãe no gabinete',
    client: ASSISTENTE,
    briefing: 'Assente a placa sobre os espaçadores e parafuse em X, sem forçar.',
    setup: { gameMode: 'OFICINA' },
    objectives: [{ kind: 'PHASE_REACHED', phase: 'PHASE_5_GPU_EXPANSION' }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'Apertar demais pode rachar as trilhas internas da placa.',
    debriefing: 'Aperto em X distribui a pressão por igual.',
    question: { prompt: 'Como apertar os parafusos da placa-mãe?', options: ['O mais forte possível', 'Em X, sem forçar', 'Só um parafuso', 'Com cola'], correctIndex: 1, explanation: 'O aperto cruzado evita empenar a placa.' },
  },
  {
    id: 'oficina-05', track: 'OFICINA', order: 5, title: 'Placa de Vídeo', lesson: 'Slot PCIe x16 e fixação da GPU',
    client: ASSISTENTE,
    briefing: 'Instale a placa de vídeo no slot PCIe x16 superior e parafuse no gabinete (ou use uma CPU com vídeo integrado).',
    setup: { gameMode: 'OFICINA' },
    objectives: [{ kind: 'PHASE_REACHED', phase: 'PHASE_6_CABLING' }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'GPU longa demais não cabe em gabinetes compactos.',
    debriefing: 'O slot superior tem 16 pistas ligadas direto à CPU.',
    question: { prompt: 'Qual slot usar para a placa de vídeo?', options: ['O PCIe x16 mais próximo da CPU', 'Qualquer slot de memória', 'O slot M.2', 'O conector SATA'], correctIndex: 0, explanation: 'Ele oferece a maior largura de banda.' },
  },
  {
    id: 'oficina-06', track: 'OFICINA', order: 6, title: 'Cabeamento Interno', lesson: 'Energia e dados dentro do gabinete',
    client: ASSISTENTE,
    briefing: 'Ligue 24 pinos, EPS da CPU, PCIe da GPU, SATA, ventoinhas, USB/áudio frontais e o F_PANEL.',
    setup: { gameMode: 'OFICINA' },
    objectives: [{ kind: 'CABLES_COMPLETE' }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'O EPS de 8 pinos da CPU e o PCIe da GPU parecem iguais, mas trocá-los é perigoso.',
    debriefing: 'Cada conector tem formato e chaveamento próprios.',
    question: { prompt: 'Qual cabo alimenta o processador?', options: ['ATX 24 pinos', 'EPS 8 pinos', 'SATA', 'USB'], correctIndex: 1, explanation: 'O EPS (CPU 4+4) fica no canto superior da placa.' },
  },
  {
    id: 'oficina-07', track: 'OFICINA', order: 7, title: 'Primeiro Boot', lesson: 'Teste de POST',
    client: ASSISTENTE,
    briefing: 'Ligue a chave da fonte e aperte o botão: o PC precisa passar no POST.',
    setup: { gameMode: 'OFICINA' },
    objectives: [{ kind: 'POST_OK' }],
    bonus: [{ kind: 'POST_FIRST_TRY' }, { kind: 'NO_PENALTIES' }],
    trap: 'Ligar com algo faltando acende o LED de debug da peça com problema.',
    debriefing: 'O POST testa CPU, memória, vídeo e boot antes do sistema carregar.',
    question: { prompt: 'O que o POST verifica?', options: ['A internet', 'CPU, memória, vídeo e dispositivo de boot', 'O antivírus', 'A impressora'], correctIndex: 1, explanation: 'É o autoteste de inicialização da placa-mãe.' },
  },
];

/* ====================================================================================
 * 2. JORNADA DO TÉCNICO — 13 missões com clientes (issues #45 a #57)
 * ==================================================================================== */
const JORNADA: CampaignMission[] = [
  {
    id: 'jornada-01', track: 'JORNADA', order: 1, act: 1, title: 'Primeiro Dia na Bancada', lesson: 'Segurança e ordem de montagem',
    client: ASSISTENTE,
    briefing: 'Seu Jorge entregou um kit completo de escritório. Monte com segurança: estática, espaçadores e pasta antes do cooler. Sem compras (só a pasta).',
    setup: {
      gameMode: 'MISSAO',
      clientPartIds: ['cpu-i3-12100', 'mb-h610m-d4', 'ram-8gb-d4-single', 'ssd-nvme-1tb', 'psu-500w-white', 'cooler-intel-laminar', 'case-office-compact'],
      purchasableCategories: ['PASTE'],
    },
    objectives: [
      { kind: 'POST_OK' },
      { kind: 'NO_ERROR', errorTitleIncludes: 'Descarga Eletrostática', label: 'Nenhum erro de estática (ESD)' },
      { kind: 'NO_ERROR', errorTitleIncludes: 'CURTO', label: 'Espaçadores antes de parafusar a placa' },
      { kind: 'NO_ERROR', errorTitleIncludes: 'Pasta Térmica Obrigatória', label: 'Pasta aplicada antes do cooler' },
    ],
    bonus: [{ kind: 'NO_PENALTIES' }, { kind: 'TIME_MAX', seconds: 480 }],
    trap: 'Montar sem descarregar a estática e sem espaçadores pode queimar a placa no primeiro dia.',
    debriefing: 'Estática, curto com o chassi e falta de pasta térmica são os três erros mais caros de um iniciante.',
    question: { prompt: 'Para que servem os espaçadores dourados?', options: ['Prender o cooler', 'Afastar a placa do chassi e evitar curto-circuito', 'Ligar a fonte', 'Segurar a memória'], correctIndex: 1, explanation: 'Sem eles, as soldas da placa tocam o metal do gabinete.' },
  },
  {
    id: 'jornada-02', track: 'JORNADA', order: 2, act: 1, title: 'O Processador Já Foi Comprado', lesson: 'Soquete da CPU e da placa-mãe',
    client: { name: 'Ana', role: 'Estudante de Administração', avatar: '👩‍🎓' }, budgetMax: 1400,
    briefing: 'Ana ganhou um Ryzen 5 4600G (AM4, com vídeo integrado) e o cooler box. Compre placa, memória, disco, fonte e gabinete com R$ 1.400.',
    setup: { gameMode: 'MISSAO', clientPartIds: ['cpu-r5-4600g', 'cooler-box-stock'], purchasableCategories: ['MOTHERBOARD', 'RAM', 'STORAGE', 'PSU', 'CASE', 'PASTE'] },
    objectives: [{ kind: 'SOCKET', socket: 'AM4' }, { kind: 'POST_OK' }, { kind: 'BUDGET_MAX', value: 1400 }],
    bonus: [{ kind: 'NO_PENALTIES' }, { kind: 'TIME_MAX', seconds: 600 }],
    trap: 'A H610M-D4 é a placa mais barata, mas usa soquete LGA1700 (Intel): o Ryzen não encaixa.',
    debriefing: 'Processador e placa-mãe precisam do mesmo soquete. O preço não importa se o encaixe é outro.',
    question: { prompt: 'O que precisa ser igual entre o processador e a placa-mãe?', options: ['A cor', 'O soquete', 'A marca da fonte', 'O tamanho do gabinete'], correctIndex: 1, explanation: 'AM4, AM5 e LGA1700 são encaixes físicos diferentes.' },
  },
  {
    id: 'jornada-03', track: 'JORNADA', order: 3, act: 1, title: 'Memória de Outra Geração', lesson: 'DDR4 × DDR5 e dual channel',
    client: { name: 'Prof.ª Rita', role: 'Professora de Física', avatar: '👩‍🏫' }, budgetMax: 1000,
    briefing: 'A professora já tem MSI B650M (AM5, DDR5), Ryzen 5 7600 e cooler box. Compre memória, disco, fonte e gabinete com R$ 1.000.',
    setup: { gameMode: 'MISSAO', clientPartIds: ['mb-msi-b650m-mortar', 'cpu-r5-7600', 'cooler-box-stock'], purchasableCategories: ['RAM', 'STORAGE', 'PSU', 'CASE', 'PASTE'] },
    objectives: [{ kind: 'RAM_TYPE', ramType: 'DDR5' }, { kind: 'RAM_MIN_GB', gb: 16 }, { kind: 'DUAL_CHANNEL' }, { kind: 'POST_OK' }, { kind: 'BUDGET_MAX', value: 1000 }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'O kit DDR4 não entra em slot DDR5, e um único pente DDR5 roda em single channel.',
    debriefing: 'DDR4 e DDR5 têm o chanfro em posições diferentes. Dois pentes nos slots 2 e 4 dobram a banda.',
    question: { prompt: 'Por que um pente DDR4 não entra num slot DDR5?', options: ['É mais largo', 'O chanfro fica em outra posição', 'É de outra cor', 'Precisa de driver'], correctIndex: 1, explanation: 'O chanfro impede o encaixe da geração errada.' },
  },
  {
    id: 'jornada-04', track: 'JORNADA', order: 4, act: 1, title: 'O PC da Secretaria', lesson: 'Vídeo integrado × processador "F"',
    client: { name: 'Dona Mariana', role: 'Secretária da Escola Municipal', avatar: '👩‍💼' }, budgetMax: 2000,
    briefing: 'Um PC de escritório com R$ 2.000, sem placa de vídeo dedicada: 8 GB de RAM e disco de 480 GB ou mais.',
    setup: { gameMode: 'MISSAO' },
    objectives: [{ kind: 'INTEGRATED_VIDEO' }, { kind: 'RAM_MIN_GB', gb: 8 }, { kind: 'STORAGE_MIN', minGb: 480 }, { kind: 'POST_OK' }, { kind: 'BUDGET_MAX', value: 2000 }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'O Core i3-12100F é mais barato, mas o "F" significa sem vídeo integrado: tela preta.',
    debriefing: 'Sem GPU dedicada, o processador precisa ter vídeo integrado (sem sufixo F na Intel).',
    question: { prompt: 'O que o sufixo F significa num processador Intel?', options: ['Mais rápido', 'Sem vídeo integrado', 'Para fontes grandes', 'Refrigeração líquida'], correctIndex: 1, explanation: 'O "F" não tem gráfico integrado: exige placa de vídeo.' },
  },
  {
    id: 'jornada-05', track: 'JORNADA', order: 5, act: 2, title: 'A Fonte que Desarmava', lesson: 'Dimensionamento da fonte',
    client: { name: 'Diego', role: 'Gamer', avatar: '🧑‍💻' }, budgetMax: 500,
    briefing: 'O PC do Diego desliga no meio dos jogos: a fonte genérica de 200 W não aguenta a RX 6700 XT. Troque só a fonte e religue os cabos (R$ 500).',
    setup: {
      gameMode: 'MISSAO', prepared: 'FULL',
      installed: { motherboardId: 'mb-b550m-am4', cpuId: 'cpu-r5-5600', coolerId: 'cooler-deepcool-ag400', ramId: 'ram-16gb-d4-dual', storageId: 'ssd-nvme-1tb', gpuId: 'gpu-rx-6700xt', psuId: 'psu-generic-200w', caseId: 'case-gamer-mesh' },
      clientPartIds: ['mb-b550m-am4', 'cpu-r5-5600', 'cooler-deepcool-ag400', 'ram-16gb-d4-dual', 'ssd-nvme-1tb', 'gpu-rx-6700xt', 'psu-generic-200w', 'case-gamer-mesh'],
      purchasableCategories: ['PSU'],
    },
    objectives: [{ kind: 'PSU_RECOMMENDED' }, { kind: 'CABLES_COMPLETE' }, { kind: 'POST_OK' }, { kind: 'BUDGET_MAX', value: 500 }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'Fontes de 500–550 W passam no consumo médio, mas ficam abaixo dos 650 W que a RX 6700 XT pede para os picos.',
    debriefing: 'A recomendação do fabricante da GPU cobre picos de consumo e o envelhecimento da fonte.',
    question: { prompt: 'Por que uma fonte de 550 W não serve se o PC consome 340 W em média?', options: ['Porque é feia', 'Os picos de consumo da GPU passam muito da média', 'Porque é de outra marca', 'Ela serve sim'], correctIndex: 1, explanation: 'GPUs têm picos curtos bem acima da média; a fonte desarma.' },
  },
  {
    id: 'jornada-06', track: 'JORNADA', order: 6, act: 2, title: 'Verão na Ilha de Edição', lesson: 'Cooler × TDP do processador',
    client: { name: 'Camila', role: 'Editora de vídeo', avatar: '🎬' }, budgetMax: 300,
    briefing: 'O Core i7-13700K (125 W) ficou sem cooler. Compre cooler e pasta com R$ 300: a CPU precisa ficar abaixo de 80 °C.',
    setup: {
      gameMode: 'MISSAO', prepared: 'FULL',
      installed: { motherboardId: 'mb-b760m-d5', cpuId: 'cpu-i7-13700k', ramId: 'ram-16gb-d5-dual', storageId: 'ssd-nvme-1tb', gpuId: 'gpu-rtx-4060', psuId: 'psu-650w-bronze', caseId: 'case-gamer-mesh' },
      clientPartIds: ['mb-b760m-d5', 'cpu-i7-13700k', 'ram-16gb-d5-dual', 'ssd-nvme-1tb', 'gpu-rtx-4060', 'psu-650w-bronze', 'case-gamer-mesh'],
      purchasableCategories: ['COOLER', 'PASTE'],
    },
    objectives: [{ kind: 'COOLER_OK' }, { kind: 'CPU_TEMP_MAX', celsius: 80 }, { kind: 'POST_OK' }, { kind: 'BUDGET_MAX', value: 300 }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'O cooler box e o Intel Laminar dissipam 65 W: a CPU chega a 105 °C e reduz o clock.',
    debriefing: 'O cooler precisa dissipar pelo menos o TDP do processador; o Wraith Prism nem tem suporte a LGA1700.',
    question: { prompt: 'O que acontece quando o cooler não dá conta do TDP?', options: ['Nada', 'A CPU superaquece e reduz o desempenho (throttling)', 'O monitor apaga', 'A memória dobra'], correctIndex: 1, explanation: 'Acima do limite térmico a CPU reduz o clock ou desliga.' },
  },
  {
    id: 'jornada-07', track: 'JORNADA', order: 7, act: 2, title: 'Cabo Certo, Lugar Certo', lesson: 'Cabeamento completo',
    client: { name: 'Renato', role: 'Montador iniciante', avatar: '🧑‍🏭' },
    briefing: 'Renato encaixou todas as peças, mas nenhum cabo. Ligue tudo e passe no POST.',
    setup: {
      gameMode: 'MISSAO', prepared: 'NO_CABLES',
      installed: { motherboardId: 'mb-msi-pro-b760m-d4', cpuId: 'cpu-i5-12400f', coolerId: 'cooler-thermalright-peerless', ramId: 'ram-16gb-d4-dual', storageId: 'ssd-crucial-bx500-1tb', gpuId: 'gpu-rtx-4060', psuId: 'psu-650w-bronze', caseId: 'case-gamer-mesh' },
      clientPartIds: ['mb-msi-pro-b760m-d4', 'cpu-i5-12400f', 'cooler-thermalright-peerless', 'ram-16gb-d4-dual', 'ssd-crucial-bx500-1tb', 'gpu-rtx-4060', 'psu-650w-bronze', 'case-gamer-mesh'],
      purchasableCategories: [],
    },
    objectives: [{ kind: 'CABLES_COMPLETE' }, { kind: 'POST_OK' }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'EPS da CPU na placa de vídeo, HD Audio no USB 2.0 e energia SATA na porta de dados são encaixes errados clássicos.',
    debriefing: 'Cada cabo tem um destino: energia da placa, da CPU, da GPU, do disco e os sinais do gabinete.',
    question: { prompt: 'Por que o EPS da CPU não pode ir na placa de vídeo?', options: ['É curto demais', 'A pinagem de 12 V e terra é invertida: pode queimar', 'É de outra cor', 'Pode sim'], correctIndex: 1, explanation: 'EPS e PCIe parecem iguais, mas a pinagem é diferente.' },
  },
  {
    id: 'jornada-08', track: 'JORNADA', order: 8, act: 3, title: 'Cabe no Gabinete?', lesson: 'Formato da placa e comprimento da GPU',
    client: { name: 'Júlia', role: 'Gamer com gabinete compacto', avatar: '🎮' }, budgetMax: 2600,
    briefing: 'Júlia quer jogar a 120 FPS sem trocar o Office Slim (Micro-ATX, GPU até 230 mm). Compre placa e GPU com R$ 2.600.',
    setup: {
      gameMode: 'MISSAO',
      clientPartIds: ['cpu-r5-5600', 'ram-16gb-d4-dual', 'ssd-nvme-1tb', 'psu-coolermaster-550w', 'cooler-box-stock', 'case-office-compact'],
      purchasableCategories: ['MOTHERBOARD', 'GPU', 'PASTE'],
    },
    objectives: [{ kind: 'FITS_CASE' }, { kind: 'FPS_MIN', fps: 120, resolution: '1080p' }, { kind: 'POST_OK' }, { kind: 'BUDGET_MAX', value: 2600 }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'A B550 Tomahawk é ATX e a RTX 3060 tem 242 mm: não cabem. A GTX 1650 cabe, mas faz 58 FPS.',
    debriefing: 'Antes de comprar, confira o formato aceito pelo gabinete e o comprimento máximo de GPU.',
    question: { prompt: 'O que conferir antes de comprar uma GPU para um gabinete pequeno?', options: ['A cor do LED', 'O comprimento máximo de GPU do gabinete', 'A marca do monitor', 'O tamanho da memória'], correctIndex: 1, explanation: 'O fabricante do gabinete informa o comprimento máximo em mm.' },
  },
  {
    id: 'jornada-09', track: 'JORNADA', order: 9, act: 3, title: '144 FPS no Competitivo', lesson: 'Equilíbrio entre CPU e GPU (gargalo)',
    client: { name: 'Lucas', role: 'Jogador competitivo', avatar: '🕹️' }, budgetMax: 5000,
    briefing: 'Lucas quer 140 FPS ou mais em 1080p com um PC equilibrado (gargalo até 10%) e R$ 5.000.',
    setup: { gameMode: 'MISSAO' },
    objectives: [{ kind: 'FPS_MIN', fps: 140, resolution: '1080p' }, { kind: 'BOTTLENECK_MAX', percent: 10 }, { kind: 'POST_OK' }, { kind: 'BUDGET_MAX', value: 5000 }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'Gastar demais no processador e economizar na placa de vídeo cria gargalo: a GPU segura o PC inteiro.',
    debriefing: 'Gargalo é quando uma peça limita as outras. Em jogos, a GPU costuma ser a peça decisiva.',
    question: { prompt: 'O que é gargalo num PC gamer?', options: ['Um defeito na fonte', 'Uma peça limitando o desempenho das outras', 'Um tipo de cabo', 'O cooler girando devagar'], correctIndex: 1, explanation: 'O PC anda na velocidade da peça mais fraca para aquela tarefa.' },
  },
  {
    id: 'jornada-10', track: 'JORNADA', order: 10, act: 3, title: 'Projetos que Abrem na Hora', lesson: 'NVMe × SSD SATA × HD',
    client: { name: 'Beatriz', role: 'Designer gráfica', avatar: '🎨' }, budgetMax: 500,
    briefing: 'O PC da Beatriz está montado, mas sem disco. Compre o disco do sistema: NVMe de 1 TB com leitura de 3.000 MB/s ou mais.',
    setup: {
      gameMode: 'MISSAO', prepared: 'FULL',
      installed: { ...READY_PC, storageId: undefined },
      clientPartIds: READY_PC_IDS,
      purchasableCategories: ['STORAGE'],
    },
    objectives: [{ kind: 'STORAGE_MIN', minGb: 1000, minReadMbps: 3000, storageType: 'NVMe_M2' }, { kind: 'POST_OK' }, { kind: 'BUDGET_MAX', value: 500 }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'O HD de 2 TB lê a 140 MB/s e o SSD SATA a 540 MB/s: espaço não é velocidade.',
    debriefing: 'NVMe usa as pistas PCIe e lê até dezenas de vezes mais rápido que um HD.',
    question: { prompt: 'Por que o HD de 2 TB não serve como disco do sistema?', options: ['Porque é pequeno', 'Porque é lento demais para abrir o sistema e os projetos', 'Porque é caro', 'Porque esquenta'], correctIndex: 1, explanation: 'Capacidade não é velocidade: o HD é mecânico.' },
  },
  {
    id: 'jornada-11', track: 'JORNADA', order: 11, act: 4, title: 'Upgrade, Não Troca Tudo', lesson: 'Reaproveitamento de peças',
    client: { name: 'Pedro', role: 'Estudante gamer', avatar: '👦' }, budgetMax: 2500,
    briefing: 'O PC do Pedro (Ryzen 5 3600 + GTX 1650) faz 3.155 pontos. Com R$ 2.500, dobre o desempenho trocando o mínimo.',
    setup: {
      gameMode: 'MISSAO', prepared: 'FULL',
      installed: { motherboardId: 'mb-gigabyte-b550m-ds3h', cpuId: 'cpu-r5-3600', coolerId: 'cooler-box-stock', ramId: 'ram-16gb-d4-dual', storageId: 'ssd-nvme-1tb', gpuId: 'gpu-gtx-1650', psuId: 'psu-500w-white', caseId: 'case-gamer-mesh' },
      clientPartIds: ['mb-gigabyte-b550m-ds3h', 'cpu-r5-3600', 'cooler-box-stock', 'ram-16gb-d4-dual', 'ssd-nvme-1tb', 'gpu-gtx-1650', 'psu-500w-white', 'case-gamer-mesh'],
    },
    objectives: [{ kind: 'SCORE_MIN', score: 6310 }, { kind: 'PSU_RECOMMENDED' }, { kind: 'POST_OK' }, { kind: 'BUDGET_MAX', value: 2500 }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'Uma plataforma AM5 nova estoura o orçamento sem ganho em jogos; a RX 6700 XT pede fonte de 650 W.',
    debriefing: 'Em jogos, trocar a placa de vídeo costuma render mais que trocar processador e placa-mãe.',
    question: { prompt: 'Qual peça trocar primeiro num PC que só roda jogos lentos?', options: ['O gabinete', 'A placa de vídeo', 'O teclado', 'O cooler'], correctIndex: 1, explanation: 'A GPU desenha os quadros: é a peça decisiva em jogos.' },
  },
  {
    id: 'jornada-12', track: 'JORNADA', order: 12, act: 4, title: 'O Setup da Streamer', lesson: 'Periféricos coerentes com o PC',
    client: { name: 'Mel', role: 'Streamer iniciante', avatar: '📹' }, budgetMax: 2500,
    briefing: 'O PC da Mel faz cerca de 58 FPS. Em "Meu Setup & Sala", escolha um monitor coerente (até 1,5× o FPS) e um headset com microfone, com R$ 2.500.',
    setup: {
      gameMode: 'MISSAO', prepared: 'FULL',
      installed: { ...READY_PC, gpuId: 'gpu-gtx-1650' },
      clientPartIds: [...READY_PC_IDS.filter((id) => id !== 'gpu-rtx-4060'), 'gpu-gtx-1650'],
      purchasableCategories: [],
    },
    objectives: [{ kind: 'MONITOR_REFRESH_COHERENT', maxRatio: 1.5 }, { kind: 'HEADSET' }, { kind: 'PERIPHERAL_BUDGET_MAX', value: 2500 }],
    bonus: [],
    trap: 'Um monitor de 180 Hz num PC que faz 58 FPS desperdiça dinheiro: dois terços da taxa nunca aparecem.',
    debriefing: 'Periférico bom é o coerente com o PC: o monitor só mostra os quadros que a GPU entrega.',
    question: { prompt: 'Vale comprar um monitor de 180 Hz para um PC que faz 60 FPS?', options: ['Sim, sempre', 'Não: o PC não entrega quadros para aproveitar a taxa', 'Só se for curvo', 'Só com cabo HDMI'], correctIndex: 1, explanation: 'A taxa útil é limitada pelo FPS que o PC produz.' },
  },
  {
    id: 'jornada-13', track: 'JORNADA', order: 13, act: 4, title: 'Prova Final — Técnico Certificado', lesson: 'Revisão de toda a jornada',
    client: { name: 'Gabriel', role: 'Desenvolvedor de jogos 3D', avatar: '🧠' }, budgetMax: 16000,
    briefing: 'O melhor PC para 1440p, edição e armazenamento com R$ 16.000. Sem checklist e sem tutor: POST na primeira tentativa.',
    setup: { gameMode: 'MISSAO', hideHelpers: true },
    objectives: [
      { kind: 'FPS_MIN', fps: 120, resolution: '1440p' },
      { kind: 'RAM_TYPE', ramType: 'DDR5' },
      { kind: 'RAM_MIN_GB', gb: 32 },
      { kind: 'DUAL_CHANNEL' },
      { kind: 'STORAGE_MIN', minGb: 2000, minReadMbps: 7000, storageType: 'NVMe_M2' },
      { kind: 'FITS_CASE' },
      { kind: 'PSU_RECOMMENDED' },
      { kind: 'CABLES_COMPLETE' },
      { kind: 'POST_FIRST_TRY' },
      { kind: 'BUDGET_MAX', value: 16000 },
    ],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'A RTX 4090 estoura o orçamento; um Ryzen 9 com RTX 4060 faz cerca de 100 FPS em 1440p.',
    debriefing: 'Um técnico certificado equilibra desempenho, compatibilidade, energia e orçamento ao mesmo tempo.',
    question: { prompt: 'Revisão: qual combinação liga com imagem sem placa de vídeo dedicada?', options: ['Core i3-12100F', 'Core i3-12100', 'Ryzen 5 5600', 'Ryzen 5 3600'], correctIndex: 1, explanation: 'Só o i3-12100 (sem F) tem vídeo integrado entre essas opções.' },
  },
];

/* ====================================================================================
 * 3. DIAGNÓSTICO — casos do modo "O que está quebrado?", do mais simples ao mais sutil
 * ==================================================================================== */
const diag = (
  order: number,
  scenarioId: string,
  title: string,
  lesson: string,
  question: CampaignMission['question']
): CampaignMission => ({
  id: `diagnostico-${String(order).padStart(2, '0')}`,
  track: 'DIAGNOSTICO',
  order,
  title,
  lesson,
  client: { name: 'Cliente da assistência', role: 'Relato na bancada', avatar: '🧰' },
  briefing: 'Leia o relato do cliente, observe os sintomas e os LEDs de debug e corrija o defeito.',
  setup: { gameMode: 'DIAGNOSTICO', diagnosticScenarioId: scenarioId },
  objectives: [{ kind: 'DIAGNOSTIC_RESOLVED', scenarioId }],
  bonus: [{ kind: 'NO_PENALTIES' }, { kind: 'TIME_MAX', seconds: 300 }],
  trap: 'Trocar peças às cegas custa caro: o sintoma aponta onde procurar.',
  debriefing: 'Diagnóstico é método: sintoma → hipótese → teste → correção.',
  question,
});

const DIAGNOSTICO: CampaignMission[] = [
  diag(1, 'case-psu-switch', 'Não Dá Sinal de Vida', 'Chave da fonte e energia', { prompt: 'O PC não dá nenhum sinal ao apertar o botão. O que verificar primeiro?', options: ['A placa de vídeo', 'A chave I/O da fonte e o cabo de força', 'A memória', 'O monitor'], correctIndex: 1, explanation: 'Sem energia nada liga: comece pelo mais simples.' }),
  diag(2, 'case-power-sw-loose', 'O Botão Não Funciona', 'Pinos do painel frontal (F_PANEL)', { prompt: 'Fonte ligada e nada ao apertar o botão. Qual a suspeita?', options: ['O POWER SW solto no F_PANEL', 'A GPU queimada', 'O SSD', 'A pasta térmica'], correctIndex: 0, explanation: 'O botão só fecha o contato dos pinos POWER SW.' }),
  diag(3, 'case-ram-dram-led', 'Tela Preta e LED DRAM', 'Memória mal encaixada', { prompt: 'O LED DRAM acende e a tela fica preta. O que fazer?', options: ['Trocar a fonte', 'Reencaixar a memória até as travas fecharem', 'Trocar o monitor', 'Formatar o disco'], correctIndex: 1, explanation: 'O LED de debug aponta a etapa do POST que falhou.' }),
  diag(4, 'case-thermal-shutdown', 'Desliga Sozinho', 'Superaquecimento por falta de pasta', { prompt: 'O PC desliga segundos após ligar e as ventoinhas aceleram. Suspeita?', options: ['Pasta térmica ausente', 'Teclado com defeito', 'Internet lenta', 'Monitor errado'], correctIndex: 0, explanation: 'Sem pasta a CPU chega a 105 °C e a proteção desliga a placa.' }),
  diag(5, 'case-short-circuit-standoffs', 'Estalo e Desligamento', 'Curto com o chassi', { prompt: 'A placa foi parafusada direto no chassi. Qual o risco?', options: ['Nenhum', 'Curto-circuito pelas soldas encostando no metal', 'Ficar mais rápido', 'Esquentar a memória'], correctIndex: 1, explanation: 'Os espaçadores isolam a placa do chassi.' }),
  diag(6, 'case-cpu-f-no-gpu', 'Liga, Mas Sem Imagem', 'Processador sem vídeo integrado', { prompt: 'Tudo liga, mas não há imagem e não existe placa de vídeo. Por quê?', options: ['Monitor quebrado', 'CPU com sufixo F sem vídeo integrado', 'Fonte fraca', 'Pouca memória'], correctIndex: 1, explanation: 'CPUs F exigem GPU dedicada.' }),
];

/* ====================================================================================
 * 4. MESA & BATTLESTATION — da mesa vazia ao AcademyOS
 * ==================================================================================== */
const MESA_CLIENT = { name: 'Laboratório de Informática', role: 'Montagem da estação', avatar: '🏫' };
const mesaBase = { gameMode: 'OFICINA' as const, prepared: 'FULL' as const, installed: READY_PC, clientPartIds: READY_PC_IDS, purchasableCategories: [] };

const MESA: CampaignMission[] = [
  {
    id: 'mesa-01', track: 'MESA', order: 1, title: 'Estação no Lugar', lesson: 'Posicionamento físico e ergonomia',
    client: MESA_CLIENT,
    briefing: 'O PC já está montado. Abra a Mesa 3D e posicione mesa, cadeira, gabinete, monitor, teclado e mouse.',
    setup: { ...mesaBase, desk: { placed: [] } },
    objectives: [{ kind: 'DESK_ITEMS', snapPoints: [...REQUIRED_DESK, 'CHAIR'] }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'Periféricos só vão para a mesa depois dela; o braço articulado é fixado antes do monitor.',
    debriefing: 'A ordem física importa: base primeiro, depois o que se apoia nela.',
    question: { prompt: 'O que vem antes de posicionar o monitor com braço articulado?', options: ['O mouse', 'Fixar o braço na mesa', 'Ligar o PC', 'O headset'], correctIndex: 1, explanation: 'O monitor é preso no braço já fixado.' },
  },
  {
    id: 'mesa-02', track: 'MESA', order: 2, title: 'Energia e Periféricos', lesson: 'Cabos de força e USB',
    client: MESA_CLIENT,
    briefing: 'Ligue o cabo de força do PC e do monitor nas tomadas e o teclado e o mouse nas USBs traseiras.',
    setup: { ...mesaBase, desk: { placed: [...REQUIRED_DESK] } },
    objectives: [{ kind: 'EXTERNAL_CABLES', cables: [...REQUIRED_CABLES] }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'Cada porta aceita um conector só: teclado e mouse em USBs diferentes.',
    debriefing: 'Força primeiro, periféricos depois. Sem energia, nada liga.',
    question: { prompt: 'Onde ligar o teclado USB?', options: ['Na tomada da parede', 'Numa porta USB livre do PC', 'Na saída de vídeo', 'No monitor de força'], correctIndex: 1, explanation: 'USB é a porta de dados dos periféricos.' },
  },
  {
    id: 'mesa-03', track: 'MESA', order: 3, title: 'Sem Sinal no Monitor', lesson: 'Vídeo na placa de vídeo, não na placa-mãe',
    client: MESA_CLIENT,
    briefing: 'Alguém ligou o cabo de vídeo na saída da placa-mãe. Ligue a estação, veja o problema e corrija até o AcademyOS aparecer.',
    setup: {
      ...mesaBase,
      desk: {
        placed: [...REQUIRED_DESK],
        cables: {
          CABLE_POWER_AC: { sourcePort: 'PC_AC_INLET', destPort: 'WALL_OUTLET_1' },
          CABLE_POWER_MONITOR: { sourcePort: 'MONITOR_AC_INLET', destPort: 'WALL_OUTLET_2' },
          CABLE_USB_KEYBOARD: { sourcePort: 'KEYBOARD_USB', destPort: 'PC_USB_1' },
          CABLE_USB_MOUSE: { sourcePort: 'MOUSE_USB', destPort: 'PC_USB_2' },
          CABLE_DISPLAY: { sourcePort: 'MB_HDMI', destPort: 'MONITOR_HDMI_IN' },
        },
      },
    },
    objectives: [{ kind: 'MONITOR_SIGNAL' }, { kind: 'DESK_STAGE', stage: 'RUNNING' }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'Com placa de vídeo dedicada, as saídas da placa-mãe ficam desativadas: tela sem sinal.',
    debriefing: 'O monitor vai sempre nas saídas da GPU quando há placa de vídeo dedicada.',
    question: { prompt: 'Com placa de vídeo dedicada, onde ligar o monitor?', options: ['No HDMI da placa-mãe', 'Nas saídas da placa de vídeo', 'Na USB', 'Na rede'], correctIndex: 1, explanation: 'A imagem é gerada pela GPU dedicada.' },
  },
  {
    id: 'mesa-04', track: 'MESA', order: 4, title: 'Som e Rede', lesson: 'Áudio P2 e cabo de rede',
    client: MESA_CLIENT,
    briefing: 'Posicione o headset, ligue o cabo P2 na saída verde e o cabo de rede na tomada RJ-45. Depois ligue a estação.',
    setup: {
      ...mesaBase,
      desk: {
        placed: [...REQUIRED_DESK],
        cables: {
          CABLE_POWER_AC: { sourcePort: 'PC_AC_INLET', destPort: 'WALL_OUTLET_1' },
          CABLE_POWER_MONITOR: { sourcePort: 'MONITOR_AC_INLET', destPort: 'WALL_OUTLET_2' },
          CABLE_USB_KEYBOARD: { sourcePort: 'KEYBOARD_USB', destPort: 'PC_USB_1' },
          CABLE_USB_MOUSE: { sourcePort: 'MOUSE_USB', destPort: 'PC_USB_2' },
          CABLE_DISPLAY: { sourcePort: 'GPU_HDMI_1', destPort: 'MONITOR_HDMI_IN' },
        },
      },
    },
    objectives: [{ kind: 'DESK_ITEMS', snapPoints: ['HEADSET'] }, { kind: 'EXTERNAL_CABLES', cables: ['CABLE_AUDIO_JACK', 'CABLE_ETHERNET'] }, { kind: 'DESK_STAGE', stage: 'RUNNING' }],
    bonus: [{ kind: 'NO_PENALTIES' }],
    trap: 'A saída de áudio é a verde (line-out); a rosa é de microfone.',
    debriefing: 'Cabo de rede garante conexão estável para a turma inteira.',
    question: { prompt: 'Qual a cor da saída de fone/caixa de som no painel traseiro?', options: ['Rosa', 'Verde', 'Azul', 'Amarela'], correctIndex: 1, explanation: 'Verde = line-out; rosa = microfone; azul = line-in.' },
  },
  {
    id: 'mesa-05', track: 'MESA', order: 5, title: 'Battlestation do Zero', lesson: 'Estação completa sem ajuda',
    client: MESA_CLIENT,
    briefing: 'Mesa vazia e cabos soltos: monte, cabeie e ligue a estação até o AcademyOS.',
    setup: { ...mesaBase, desk: { placed: [] } },
    objectives: [{ kind: 'DESK_STAGE', stage: 'RUNNING' }],
    bonus: [{ kind: 'NO_PENALTIES' }, { kind: 'TIME_MAX', seconds: 600 }],
    trap: 'Ligar antes de conectar o vídeo certo mostra SEM SINAL.',
    debriefing: 'Você montou uma estação inteira: móveis, energia, vídeo, periféricos e boot.',
    question: { prompt: 'Qual a ordem certa ao montar a estação?', options: ['Ligar, depois posicionar', 'Posicionar, cabear e só então ligar', 'Cabear sem posicionar', 'Tanto faz'], correctIndex: 1, explanation: 'Energia por último evita choques e curtos.' },
  },
];

/* ====================================================================================
 * 5. DESAFIO EM GRUPOS — montagens cronometradas (metas calibradas no benchmark)
 * ==================================================================================== */
const DESAFIO_CLIENT = { name: 'Professor', role: 'Juiz do desafio', avatar: '⏱️' };
const desafio = (
  order: number,
  title: string,
  budget: number,
  objectives: CampaignMission['objectives'],
  bonus: CampaignMission['bonus'],
  briefing: string
): CampaignMission => ({
  id: `desafio-${String(order).padStart(2, '0')}`,
  track: 'DESAFIO',
  order,
  title,
  lesson: 'Montar bem e rápido, em equipe',
  client: DESAFIO_CLIENT,
  budgetMax: budget,
  briefing,
  setup: { gameMode: 'DESAFIO' },
  objectives: [...objectives, { kind: 'BUDGET_MAX', value: budget }],
  bonus,
  trap: 'Pressa gera penalidade: um encaixe forçado custa mais que alguns segundos.',
  debriefing: 'Velocidade vem de método: sigam a ordem canônica e dividam as tarefas.',
  question: { prompt: 'Qual a melhor estratégia num desafio cronometrado?', options: ['Forçar os encaixes', 'Seguir a ordem canônica e dividir tarefas', 'Pular o POST', 'Ignorar o orçamento'], correctIndex: 1, explanation: 'Método reduz erros e retrabalho.' },
});

const DESAFIO: CampaignMission[] = [
  desafio(1, 'Bronze', 3000, [{ kind: 'POST_OK' }, { kind: 'FPS_MIN', fps: 50, resolution: '1080p' }], [{ kind: 'TIME_MAX', seconds: 900 }, { kind: 'NO_PENALTIES' }], 'Um PC que jogue a 50 FPS com R$ 3.000, em até 15 minutos.'),
  desafio(2, 'Prata', 4500, [{ kind: 'POST_OK' }, { kind: 'FPS_MIN', fps: 100, resolution: '1080p' }], [{ kind: 'TIME_MAX', seconds: 720 }, { kind: 'NO_PENALTIES' }], '100 FPS em 1080p com R$ 4.500, em até 12 minutos.'),
  desafio(3, 'Ouro', 6000, [{ kind: 'POST_OK' }, { kind: 'FPS_MIN', fps: 144, resolution: '1080p' }, { kind: 'BOTTLENECK_MAX', percent: 15 }], [{ kind: 'TIME_MAX', seconds: 600 }, { kind: 'NO_PENALTIES' }], '144 FPS equilibrados com R$ 6.000, em até 10 minutos.'),
  desafio(4, 'Platina', 9000, [{ kind: 'POST_FIRST_TRY' }, { kind: 'FPS_MIN', fps: 100, resolution: '1440p' }, { kind: 'CABLES_COMPLETE' }, { kind: 'FITS_CASE' }], [{ kind: 'TIME_MAX', seconds: 540 }, { kind: 'NO_PENALTIES' }], '100 FPS em 1440p com R$ 9.000, POST na primeira tentativa, em até 9 minutos.'),
];

export const CAMPAIGN_MISSIONS: CampaignMission[] = [...OFICINA, ...JORNADA, ...DIAGNOSTICO, ...MESA, ...DESAFIO];

export const missionsOfTrack = (track: CampaignTrackId): CampaignMission[] =>
  CAMPAIGN_MISSIONS.filter((m) => m.track === track).sort((a, b) => a.order - b.order);

export const findMission = (id: string): CampaignMission | null => CAMPAIGN_MISSIONS.find((m) => m.id === id) ?? null;
