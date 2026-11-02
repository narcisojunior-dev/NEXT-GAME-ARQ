export type RoomThemeId = 'ROOM_GAMER' | 'ROOM_OFFICE' | 'ROOM_LAB' | 'ROOM_VAPORWAVE';

export interface RoomTheme {
  id: RoomThemeId;
  name: string;
  tagline: string;
  avatar: string;
  description: string;
  primaryColor: string;
  wallBgGradient: [string, string];
  deskTexture: 'CARBON' | 'WOOD' | 'METAL' | 'SYNTH';
  lightingEffect: 'NEON_CYAN_MAGENTA' | 'NATURAL_SUNLIGHT' | 'TECH_FLUORESCENT' | 'PURPLE_VAPOR';
  ambientDetails: string[];
}

export const ROOM_THEMES: RoomTheme[] = [
  {
    id: 'ROOM_GAMER',
    name: 'Quarto Gamer RGB',
    tagline: 'Neon Cyberpunk & LEDs Dinâmicos',
    avatar: '🎮',
    description: 'Iluminação ambiente em tons neon ciano e magenta, mesa preta com textura de fibra de carbono e prateleiras com colecionáveis.',
    primaryColor: '#06B6D4',
    wallBgGradient: ['#0B0F19', '#1E1B4B'],
    deskTexture: 'CARBON',
    lightingEffect: 'NEON_CYAN_MAGENTA',
    ambientDetails: ['Fita LED Traseira', 'Mesa Fibra de Carbono', 'Colecionáveis nas Prateleiras'],
  },
  {
    id: 'ROOM_OFFICE',
    name: 'Escritório Minimalista Clean',
    tagline: 'Madeira Clara, Luz Natural & Plantas',
    avatar: '🌿',
    description: 'Design escandinavo com mesa em carvalho claro, luminária articulada quente e plantas suculentas com vista relaxante.',
    primaryColor: '#10B981',
    wallBgGradient: ['#1C1917', '#292524'],
    deskTexture: 'WOOD',
    lightingEffect: 'NATURAL_SUNLIGHT',
    ambientDetails: ['Madeira Maciça Clara', 'Plantas Suculentas', 'Luminária Quente de Leitura'],
  },
  {
    id: 'ROOM_LAB',
    name: 'Laboratório Escolar Tech',
    tagline: 'Bancada de Engenharia & Instrumentos',
    avatar: '🔬',
    description: 'Estética de bancada de testes de hardware com tapete azul milimetrado, osciloscópio, banners didáticos e ferramentas industriais.',
    primaryColor: '#3B82F6',
    wallBgGradient: ['#0F172A', '#1E293B'],
    deskTexture: 'METAL',
    lightingEffect: 'TECH_FLUORESCENT',
    ambientDetails: ['Manta Antiestática Azul', 'Osciloscópio e Multímetro', 'Banner Didático de Circuitos'],
  },
  {
    id: 'ROOM_VAPORWAVE',
    name: 'Quarto Retrô / Vaporwave',
    tagline: 'Estética Anos 90, Lilás & Pôr do Sol Virtual',
    avatar: '🌆',
    description: 'Paleta vaporwave nostálgica com tons roxos e dourados, grade cibernética no horizonte e referências aos primeiros PCs clássicos.',
    primaryColor: '#D946EF',
    wallBgGradient: ['#2E1065', '#4C1D95'],
    deskTexture: 'SYNTH',
    lightingEffect: 'PURPLE_VAPOR',
    ambientDetails: ['Pôr do Sol Virtual Retrô', 'Grade Perspectiva Wireframe', 'Luminária de Neon Roxa'],
  },
];
