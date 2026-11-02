export type MonitorType = 'MONITOR_75HZ_OFFICE' | 'MONITOR_180HZ_GAMER' | 'MONITOR_ULTRAWIDE_144HZ';
export type KeyboardType = 'KEYBOARD_MEMBRANE' | 'KEYBOARD_TKL_RED' | 'KEYBOARD_60_BLUE';
export type MouseType = 'MOUSE_OFFICE_VERTICAL' | 'MOUSE_GAMER_65G';
export type StandType = 'STAND_DESK_BASE' | 'STAND_GAS_ARM';
export type AudioType = 'AUDIO_WOOD_SPEAKERS' | 'AUDIO_HEADSET_71';
export type GamepadType = 'GAMEPAD_HALL_EFFECT' | 'GAMEPAD_NONE';
export type CaseThemeType = 'CASE_MESH_BLACK' | 'CASE_AQUARIUM_RGB' | 'CASE_MINIMAL_WHITE';

export interface PeripheralItem {
  id: string;
  name: string;
  category: 'MONITOR' | 'KEYBOARD' | 'MOUSE' | 'STAND' | 'AUDIO' | 'GAMEPAD' | 'CASE_THEME';
  price: number;
  description: string;
  featureBadge: string;
  specs: Record<string, string>;
}

export const MONITORS: PeripheralItem[] = [
  {
    id: 'mon-24-75hz',
    name: 'Monitor AOC 24" IPS 75Hz Anti-Reflexo',
    category: 'MONITOR',
    price: 650,
    description: 'Monitor versátil de 24 polegadas com painel IPS, bordas ultrafinas e tecnologia anti-cansaço visual.',
    featureBadge: 'AOC 75Hz • IPS 1080p',
    specs: { Tamanho: '24"', Resolução: '1920x1080', Painel: 'IPS', 'Tempo de Resposta': '5ms' },
  },
  {
    id: 'mon-27-180hz',
    name: 'Monitor Gamer LG UltraGear 27" Fast IPS 180Hz',
    category: 'MONITOR',
    price: 1250,
    description: 'Monitor esportivo consagrado de 180Hz com 1ms de resposta real GtG e suporte a NVIDIA G-Sync e AMD FreeSync.',
    featureBadge: 'LG 180Hz • Fast IPS 1ms',
    specs: { Tamanho: '27"', Resolução: '1920x1080', Painel: 'Fast IPS', 'Tempo de Resposta': '1ms GtG' },
  },
  {
    id: 'mon-34-ultrawide',
    name: 'Monitor Samsung Odyssey G5 34" Ultra-Wide Curvo 144Hz',
    category: 'MONITOR',
    price: 2400,
    description: 'Campo de visão cinematográfico de 21:9 com curvatura 1000R para produtividade avançada e imersão total.',
    featureBadge: 'Samsung 144Hz • WQHD 1440p',
    specs: { Tamanho: '34"', Resolução: '3440x1440', Painel: 'VA Curvo 1000R', 'Tempo de Resposta': '1ms' },
  },
];

export const KEYBOARDS: PeripheralItem[] = [
  {
    id: 'kb-membrane-office',
    name: 'Teclado Silencioso Logitech K120 ABNT2 Office',
    category: 'KEYBOARD',
    price: 90,
    description: 'Teclado clássico de alta durabilidade com teclas macias, silenciosas e padrão brasileiro oficial ABNT2.',
    featureBadge: 'Logitech • ABNT2',
    specs: { Tipo: 'Membrana Silenciosa', Layout: 'ABNT2 com Ç', Durabilidade: '10 milhões de toques' },
  },
  {
    id: 'kb-mech-tkl-red',
    name: 'Teclado Mecânico Redragon Kumara TKL Switch Red',
    category: 'KEYBOARD',
    price: 290,
    description: 'Formato Tenkeyless compacto (sem bloco numérico) com switches mecânicos lineares suaves para digitação rápida.',
    featureBadge: 'Redragon • Switch Red',
    specs: { Tipo: 'Mecânico Linear', Switches: 'Outemu Red', Iluminação: 'RGB Per-Key' },
  },
  {
    id: 'kb-mech-60-blue',
    name: 'Teclado Mecânico HyperX Alloy Origins 60% Switch Blue',
    category: 'KEYBOARD',
    price: 320,
    description: 'Design ultracompacto 60% com corpo em alumínio aeroespacial e o clássico clique sonoro dos switches azuis.',
    featureBadge: 'HyperX • 60% Clicky',
    specs: { Tipo: 'Mecânico Tátil Clicky', Switches: 'HyperX Blue', Iluminação: 'RGB Personalizável' },
  },
];

export const MICE: PeripheralItem[] = [
  {
    id: 'mouse-vertical-office',
    name: 'Mouse Ergonômico Vertical Logitech Lift',
    category: 'MOUSE',
    price: 130,
    description: 'Formato ergonômico vertical que mantém o punho em ângulo natural de 57°, prevenindo dores e tendinite.',
    featureBadge: 'Logitech 57° • Anti-LER',
    specs: { Sensor: 'Óptico Avançado', Formato: 'Vertical Ergonômico', Cliques: 'Silenciosos' },
  },
  {
    id: 'mouse-gamer-65g',
    name: 'Mouse Gamer Logitech G Pro X Superlight 63g',
    category: 'MOUSE',
    price: 220,
    description: 'O mouse de eSports mais vitorioso do mundo com peso pena de 63g e sensor HERO 25K de máxima precisão.',
    featureBadge: 'Logitech • HERO 25K',
    specs: { Sensor: 'HERO 25.600 DPI', Peso: '63g Ultraleve', Pés: '100% PTFE Puro' },
  },
];

export const MONITOR_STANDS: PeripheralItem[] = [
  {
    id: 'stand-desk',
    name: 'Base de Mesa Original Ajustável',
    category: 'STAND',
    price: 0,
    description: 'Base padrão de metal que acompanha o monitor com ajuste simples de inclinação.',
    featureBadge: 'Base Original',
    specs: { Tipo: 'Fixo de Mesa', 'Liberação de Espaço': '0%' },
  },
  {
    id: 'stand-gas-arm',
    name: 'Suporte Articulado a Gás ELG F80N 360°',
    category: 'STAND',
    price: 210,
    description: 'Braço mecânico com pistão a gás e amortecedor hidráulico que flutua o monitor no ar, liberando 80% da mesa.',
    featureBadge: 'ELG F80N • Pistão a Gás',
    specs: { Tipo: 'Articulado a Gás', Ajustes: 'Altura, Giro e Rotação 360°', 'Espaço Liberado': '80%' },
  },
];

export const GAMEPADS: PeripheralItem[] = [
  {
    id: 'gamepad-none',
    name: 'Sem Gamepad (Teclado e Mouse)',
    category: 'GAMEPAD',
    price: 0,
    description: 'Foco exclusivo na experiência clássica de Teclado & Mouse de alta precisão.',
    featureBadge: 'KBM Padrão',
    specs: { Conexão: 'N/A' },
  },
  {
    id: 'gamepad-hall-effect',
    name: 'Controle 8BitDo Ultimate Wireless Hall Effect',
    category: 'GAMEPAD',
    price: 260,
    description: 'Controle sem fio de elite com sensores magnéticos Hall Effect nos analógicos e gatilhos (zero risco de drift).',
    featureBadge: '8BitDo • Anti-Drift',
    specs: { Sensores: 'Magnéticos Hall Effect', Bateria: '22 horas', Acessório: 'Base de Carregamento Dock' },
  },
];

export const AUDIO_DEVICES: PeripheralItem[] = [
  {
    id: 'audio-wood-speakers',
    name: 'Caixas de Som Estéreo Edifier R1000T4 Madeira',
    category: 'AUDIO',
    price: 180,
    description: 'Par de caixas acústicas estéreo de mesa construídas em madeira MDF de alta densidade para som natural.',
    featureBadge: 'Edifier Hi-Fi • MDF',
    specs: { Potência: '24W RMS', Conexão: 'Dupla RCA + P2 3.5mm' },
  },
  {
    id: 'audio-headset-71',
    name: 'Headset Gamer HyperX Cloud II 7.1 Surround',
    category: 'AUDIO',
    price: 250,
    description: 'O headset gamer mais premiado do mercado com arco em alumínio, almofadas em couro sintético e som surround 7.1.',
    featureBadge: 'HyperX • 7.1 Surround',
    specs: { Drivers: '53mm Neodímio', Microfone: 'Certificado Discord & TeamSpeak' },
  },
];

export const CASE_THEMES: PeripheralItem[] = [
  {
    id: 'case-mesh-black',
    name: 'Gabinete Corsair 4000D Airflow Mesh Black',
    category: 'CASE_THEME',
    price: 280,
    description: 'Frente em malha perfurada (Mesh) de alto fluxo de ar com lateral em vidro temperado escurecido.',
    featureBadge: 'Corsair • Alto Fluxo de Ar',
    specs: { Formato: 'Mid-Tower', Ventoinhas: '2x 120mm AirGuide', Lateral: 'Vidro Temperado' },
  },
  {
    id: 'case-aquarium-rgb',
    name: 'Gabinete Lian Li O11 Dynamic EVO Aquário RGB',
    category: 'CASE_THEME',
    price: 450,
    description: 'Design de aquário sem coluna frontal com vidro temperado duplo e iluminação ARGB sincronizada.',
    featureBadge: 'Lian Li • Aquário 270°',
    specs: { Formato: 'Mid-Tower Aquário', Visibilidade: 'Painel Duplo de Vidro', Iluminação: 'Faixa ARGB Integrada' },
  },
  {
    id: 'case-minimal-white',
    name: 'Gabinete NZXT H5 Flow Minimalist White',
    category: 'CASE_THEME',
    price: 360,
    description: 'Design limpo escandinavo todo em aço branco fosco com duto de ventoinha dedicado para a GPU.',
    featureBadge: 'NZXT • Minimalist White',
    specs: { Formato: 'Mid-Tower Compacto', Acabamento: 'Aço Branco Fosco', Gestão: 'Canais Rápidos de Cabos' },
  },
];

export interface StudentSetupConfig {
  monitor: PeripheralItem;
  keyboard: PeripheralItem;
  mouse: PeripheralItem;
  stand: PeripheralItem;
  audio: PeripheralItem;
  gamepad: PeripheralItem;
  caseTheme: PeripheralItem;
}

export const DEFAULT_STUDENT_SETUP: StudentSetupConfig = {
  monitor: MONITORS[1], // 27" Fast IPS 180Hz
  keyboard: KEYBOARDS[1], // TKL Red
  mouse: MICE[1], // Gamer 65g
  stand: MONITOR_STANDS[1], // Braço a gás
  audio: AUDIO_DEVICES[1], // Headset 7.1
  gamepad: GAMEPADS[1], // Gamepad Hall Effect
  caseTheme: CASE_THEMES[1], // Aquário RGB
};

