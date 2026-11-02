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
    name: 'Monitor Office 24" IPS 75Hz',
    category: 'MONITOR',
    price: 650,
    description: 'Monitor versátil de 24 polegadas com painel IPS e filtro de luz azul para estudo contínuo.',
    featureBadge: '75Hz • IPS 1080p',
    specs: { Tamanho: '24"', Resolução: '1920x1080', Painel: 'IPS', 'Tempo de Resposta': '5ms' },
  },
  {
    id: 'mon-27-180hz',
    name: 'Monitor Gamer 27" Fast IPS 180Hz',
    category: 'MONITOR',
    price: 1250,
    description: 'Monitor esportivo de 180Hz com 1ms de resposta real e fidelidade de cores de 99% sRGB.',
    featureBadge: '180Hz • Fast IPS 1ms',
    specs: { Tamanho: '27"', Resolução: '1920x1080', Painel: 'Fast IPS', 'Tempo de Resposta': '1ms' },
  },
  {
    id: 'mon-34-ultrawide',
    name: 'Monitor Ultra-Wide 34" Curvo 144Hz',
    category: 'MONITOR',
    price: 2400,
    description: 'Campo de visão cinematográfico 21:9 com curvatura 1500R para produtividade e imersão.',
    featureBadge: '144Hz • 21:9 WQHD 1440p',
    specs: { Tamanho: '34"', Resolução: '3440x1440', Painel: 'VA Curvo', 'Tempo de Resposta': '1ms' },
  },
];

export const KEYBOARDS: PeripheralItem[] = [
  {
    id: 'kb-membrane-office',
    name: 'Teclado Silencioso ABNT2 Office',
    category: 'KEYBOARD',
    price: 90,
    description: 'Teclado de membrana macio, totalmente silencioso com teclas multimídia e padrão brasileiro ABNT2.',
    featureBadge: 'Silencioso • ABNT2',
    specs: { Tipo: 'Membrana', Layout: 'ABNT2 com Ç', Iluminação: 'Nenhuma' },
  },
  {
    id: 'kb-mech-tkl-red',
    name: 'Teclado Mecânico TKL Switch Red',
    category: 'KEYBOARD',
    price: 290,
    description: 'Formato Tenkeyless compacto (sem numérico) com switches mecânicos lineares suaves e rápidos.',
    featureBadge: 'Mecânico TKL • Switch Red',
    specs: { Tipo: 'Mecânico Linear', Switches: 'Red 45g', Iluminação: 'RGB Per-Key' },
  },
  {
    id: 'kb-mech-60-blue',
    name: 'Teclado Mecânico 60% Switch Blue',
    category: 'KEYBOARD',
    price: 320,
    description: 'Design ultracompacto 60% com feedback tátil e o clássico clique sonoro dos switches azuis.',
    featureBadge: 'Compacto 60% • Switch Blue',
    specs: { Tipo: 'Mecânico Tátil Clicky', Switches: 'Blue 55g', Iluminação: 'RGB' },
  },
];

export const MICE: PeripheralItem[] = [
  {
    id: 'mouse-vertical-office',
    name: 'Mouse Ergonômico Vertical Office',
    category: 'MOUSE',
    price: 130,
    description: 'Formato ergonômico vertical que mantém o punho em posição neutra de aperto de mão, prevenindo LER.',
    featureBadge: 'Ergonomia 57° • Anti-LER',
    specs: { Sensor: 'Óptico 2400 DPI', Formato: 'Vertical Ergonômico', Peso: '110g' },
  },
  {
    id: 'mouse-gamer-65g',
    name: 'Mouse Gamer Ultraleve 65g PixArt',
    category: 'MOUSE',
    price: 220,
    description: 'Carcaça ultraleve de 65g com sensor topo de linha PixArt 3395 (26.000 DPI) e cabo paracord flexível.',
    featureBadge: '65g • Sensor PixArt 26K',
    specs: { Sensor: 'PixArt 3395', Peso: '65g', Switches: 'Ópticos 80M cliques' },
  },
];

export const MONITOR_STANDS: PeripheralItem[] = [
  {
    id: 'stand-desk',
    name: 'Base de Mesa Original',
    category: 'STAND',
    price: 0,
    description: 'Base padrão de metal/plástico que acompanha o monitor com ajuste simples de inclinação.',
    featureBadge: 'Base Padrão',
    specs: { Tipo: 'Fixo de Mesa', 'Liberação de Espaço': '0%' },
  },
  {
    id: 'stand-gas-arm',
    name: 'Suporte Articulado com Pistão a Gás',
    category: 'STAND',
    price: 210,
    description: 'Braço mecânico com pistão a gás que flutua o monitor no ar, liberando 80% do espaço útil da mesa.',
    featureBadge: 'Pistão a Gás • 360°',
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
    name: 'Gamepad Sem Fio Hall Effect',
    category: 'GAMEPAD',
    price: 260,
    description: 'Controle sem fio com sensores magnéticos Hall Effect nos analógicos e gatilhos (zero risco de drift).',
    featureBadge: 'Magnético • Anti-Drift',
    specs: { Sensores: 'Magnéticos Hall Effect', Bateria: '600mAh (20h)', Conexão: '2.4GHz + BT' },
  },
];

export const AUDIO_DEVICES: PeripheralItem[] = [
  {
    id: 'audio-wood-speakers',
    name: 'Caixas de Som Estéreo em Madeira',
    category: 'AUDIO',
    price: 180,
    description: 'Par de caixas acústicas estéreo de mesa com acabamento em madeira para som natural e equilibrado.',
    featureBadge: 'Madeira Acústica • Hi-Fi',
    specs: { Potência: '24W RMS', Conexão: 'P2 3.5mm + USB' },
  },
  {
    id: 'audio-headset-71',
    name: 'Headset Gamer 7.1 com Microfone',
    category: 'AUDIO',
    price: 250,
    description: 'Headset circumaural acolchoado com drivers de neodímio de 50mm e microfone com cancelamento de ruído.',
    featureBadge: 'Surround 7.1 • Conforto',
    specs: { Drivers: '50mm Neodímio', Microfone: 'Cardioide com Pop Filter' },
  },
];

export const CASE_THEMES: PeripheralItem[] = [
  {
    id: 'case-mesh-black',
    name: 'Gabinete Mid-Tower Mesh Black',
    category: 'CASE_THEME',
    price: 280,
    description: 'Frente em malha perfurada (Mesh) de alto fluxo de ar com lateral em vidro temperado escurecido.',
    featureBadge: 'Alto Fluxo de Ar • Mesh',
    specs: { Formato: 'Mid-Tower', Ventoinhas: '3x 120mm inclusas', Lateral: 'Vidro Temperado' },
  },
  {
    id: 'case-aquarium-rgb',
    name: 'Gabinete Aquário Panorâmico RGB',
    category: 'CASE_THEME',
    price: 450,
    description: 'Design de aquário sem coluna frontal com vidro temperado duplo e iluminação ARGB sincronizada.',
    featureBadge: 'Aquário 270° • ARGB',
    specs: { Formato: 'Mid-Tower Aquário', Visibilidade: 'Painel Duplo de Vidro', Iluminação: 'Controladora ARGB' },
  },
  {
    id: 'case-minimal-white',
    name: 'Gabinete Minimalista Clean White',
    category: 'CASE_THEME',
    price: 360,
    description: 'Estética minimalista branca em pintura fosca com linhas retas e isolamento acústico interno.',
    featureBadge: 'Clean White • Silencioso',
    specs: { Formato: 'Mid-Tower Clean', Cor: 'Branco Neve', Acabamento: 'Aço Laminado Fosco' },
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

