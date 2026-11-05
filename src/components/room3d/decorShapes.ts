/**
 * Versões leves, feitas por código, de cada modelo de decoração. São usadas enquanto o `.glb`
 * do Sketchfab não foi baixado (o download exige o token da conta) e também como fantasma.
 *
 * Coordenadas locais em metros: origem no centro da pegada, no chão do item; frente em +Z.
 * Cada receita usa poucas primitivas (dezenas de faces), bem abaixo do orçamento do modelo real.
 */
import type { DecorItem } from '@/engine/roomDecor';

export type PrimKind = 'box' | 'cyl' | 'sphere' | 'cone' | 'torus';
export type PrimAnim = 'spin' | 'bob' | 'wave' | 'blink';

export interface Prim {
  kind: PrimKind;
  /** Centro da primitiva */
  pos: [number, number, number];
  /** box: [x, y, z]; cyl: [raio topo, altura, raio base]; sphere: [raio]; cone: [raio, altura]; torus: [raio, tubo] */
  size: number[];
  color: string;
  rot?: [number, number, number];
  emissive?: boolean;
  metal?: number;
  rough?: number;
  anim?: PrimAnim;
}

const box = (pos: Prim['pos'], size: [number, number, number], color: string, extra: Partial<Prim> = {}): Prim => ({ kind: 'box', pos, size, color, ...extra });
const cyl = (pos: Prim['pos'], r: number, h: number, color: string, extra: Partial<Prim> = {}, rBottom = r): Prim => ({ kind: 'cyl', pos, size: [r, h, rBottom], color, ...extra });
const sphere = (pos: Prim['pos'], r: number, color: string, extra: Partial<Prim> = {}): Prim => ({ kind: 'sphere', pos, size: [r], color, ...extra });
const cone = (pos: Prim['pos'], r: number, h: number, color: string, extra: Partial<Prim> = {}): Prim => ({ kind: 'cone', pos, size: [r, h], color, ...extra });
const torus = (pos: Prim['pos'], r: number, tube: number, color: string, extra: Partial<Prim> = {}): Prim => ({ kind: 'torus', pos, size: [r, tube], color, ...extra });

const WOOD = '#8b6243';
const WOOD_LIGHT = '#c49a6c';
const WHITE = '#e5e7eb';
const DARK = '#1f2937';
const BLACK = '#0f172a';
const METAL = '#94a3b8';
const GREEN = '#15803d';
const SCREEN = '#38bdf8';

/** Planta em vaso: vaso cônico e copa em esferas */
const plant = (w: number, h: number, potColor = '#b45309'): Prim[] => [
  cyl([0, h * 0.15, 0], w * 0.35, h * 0.3, potColor, {}, w * 0.28),
  sphere([0, h * 0.55, 0], w * 0.42, GREEN, { rough: 0.9 }),
  sphere([w * 0.15, h * 0.75, w * 0.05], w * 0.3, '#16a34a', { rough: 0.9 }),
];

/** Pôster/quadro: moldura e tela (a arte vem por textura em ProceduralDecor) */
const frame = (w: number, d: number, h: number, frameColor: string): Prim[] => [box([0, h / 2, 0], [w, h, d], frameColor)];

export function shapeFor(item: DecorItem): Prim[] {
  const { w, d, h } = item.footprint;
  switch (item.id) {
    /* ---------------------------------- Clássico ---------------------------------- */
    case 'decor-cama':
      return [
        box([0, 0.15, 0], [w, 0.3, d], WOOD),
        box([0, 0.38, 0.05], [w - 0.06, 0.16, d - 0.12], WHITE, { rough: 0.95 }),
        box([0, 0.5, 0.35], [w - 0.1, 0.06, d * 0.6], '#3b82f6', { rough: 0.95 }),
        box([-w * 0.24, 0.52, -d / 2 + 0.25], [w * 0.4, 0.12, 0.3], '#f8fafc'),
        box([w * 0.24, 0.52, -d / 2 + 0.25], [w * 0.4, 0.12, 0.3], '#f8fafc'),
        box([0, h / 2, -d / 2 + 0.03], [w, h, 0.06], WOOD),
      ];
    case 'decor-beliche':
      return [
        ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => box([sx * (w / 2 - 0.03), h / 2, sz * (d / 2 - 0.03)], [0.06, h, 0.06], WOOD_LIGHT))),
        box([0, 0.3, 0], [w - 0.08, 0.14, d - 0.08], '#60a5fa'),
        box([0, 1.25, 0], [w - 0.08, 0.14, d - 0.08], '#f472b6'),
        box([w / 2 - 0.03, 0.95, d / 2 - 0.35], [0.04, 0.9, 0.3], WOOD_LIGHT),
      ];
    case 'decor-criado-mudo':
      return [box([0, h / 2, 0], [w, h, d], WOOD_LIGHT), box([0, h * 0.7, d / 2], [w * 0.8, h * 0.25, 0.01], WOOD), sphere([0, h * 0.7, d / 2 + 0.015], 0.015, METAL)];
    case 'decor-guarda-roupa':
      return [box([0, h / 2, 0], [w, h, d], '#d6c4a8'), box([0, h / 2, d / 2 + 0.003], [0.01, h - 0.1, 0.005], '#8b7355'), box([-0.06, h * 0.55, d / 2 + 0.02], [0.02, 0.2, 0.02], METAL), box([0.06, h * 0.55, d / 2 + 0.02], [0.02, 0.2, 0.02], METAL)];
    case 'decor-estante-parede':
      return [box([0, 0.01, 0], [w, 0.02, d], WOOD), box([0, 0.29, 0], [w, 0.02, d], WOOD), box([-w / 2 + 0.01, h / 2, 0], [0.02, h, d], WOOD), box([w / 2 - 0.01, h / 2, 0], [0.02, h, d], WOOD)];
    case 'decor-estante-decorada':
      return [
        box([0, h / 2, -d / 2 + 0.01], [w, h, 0.02], WOOD),
        ...[0, 0.4, 0.8, 1.2, 1.58].map((y) => box([0, y + 0.01, 0], [w, 0.02, d], WOOD)),
        box([-w / 2 + 0.01, h / 2, 0], [0.02, h, d], WOOD),
        box([w / 2 - 0.01, h / 2, 0], [0.02, h, d], WOOD),
        box([-0.2, 0.15, 0], [0.3, 0.26, 0.2], '#dc2626'),
        box([0.15, 0.53, 0], [0.4, 0.24, 0.2], '#2563eb'),
        sphere([0.25, 0.2, 0], 0.1, '#a16207'),
      ];
    case 'decor-puff':
      return [sphere([0, h * 0.45, 0], w * 0.5, '#f97316', { rough: 1 })];
    case 'decor-luminaria-mesa':
      return [cyl([0, 0.01, 0], 0.08, 0.02, DARK), cyl([0, 0.2, -0.04], 0.012, 0.38, METAL, { rot: [0.25, 0, 0] }), cone([0, h - 0.06, 0.06], 0.07, 0.12, DARK, { rot: [Math.PI - 0.6, 0, 0] }), sphere([0, h - 0.1, 0.09], 0.025, '#fde68a', { emissive: true })];
    case 'decor-luminaria-teto':
      return [cyl([0, h - 0.2, 0], 0.005, 0.4, DARK), cone([0, 0.1, 0], w / 2, 0.2, '#facc15'), sphere([0, 0.05, 0], 0.05, '#fef9c3', { emissive: true })];
    case 'decor-ventilador-teto':
      return [cyl([0, h - 0.1, 0], 0.02, 0.2, METAL), cyl([0, 0.12, 0], 0.08, 0.08, WHITE), ...[0, 1, 2, 3].map((i) => box([0, 0.1, 0], [w, 0.01, 0.12], WOOD_LIGHT, { rot: [0, (i * Math.PI) / 4, 0], anim: 'spin' }))];
    case 'decor-ar-condicionado':
      return [box([0, h / 2, 0], [w, h, d], '#f8fafc'), box([0, 0.05, d / 2 - 0.02], [w - 0.1, 0.03, 0.03], '#cbd5e1'), box([w / 2 - 0.1, h - 0.06, d / 2 + 0.002], [0.05, 0.015, 0.004], '#22c55e', { emissive: true })];
    case 'decor-relogio-parede':
      return [cyl([0, h / 2, 0], w / 2, d, WHITE, { rot: [Math.PI / 2, 0, 0] }), torus([0, h / 2, d / 2], w / 2 - 0.01, 0.012, DARK), box([0, h / 2 + 0.05, d / 2 + 0.006], [0.01, 0.1, 0.004], DARK), box([0.04, h / 2, d / 2 + 0.008], [0.08, 0.008, 0.004], DARK)];
    case 'decor-persiana':
      return Array.from({ length: 12 }, (_, i) => box([0, 0.06 + i * (h / 12), 0], [w, 0.012, d * 0.6], '#f1f5f9', { rot: [0.5, 0, 0] }));
    case 'decor-moldura-poster':
      return frame(w, d, h, BLACK);
    case 'decor-poster-branco':
      return frame(w, d, h, '#f8fafc');
    case 'decor-quadro':
      return frame(w, d, h, WOOD);
    case 'decor-tapete-redondo':
      return [cyl([0, h / 2, 0], w / 2, h, '#7c3aed', { rough: 1 }), cyl([0, h / 2 + 0.001, 0], w * 0.35, h, '#a78bfa', { rough: 1 })];
    case 'decor-tapete-retangular':
      return [box([0, h / 2, 0], [w, h, d], '#334155', { rough: 1 }), box([0, h / 2 + 0.001, 0], [w * 0.8, h, d * 0.7], '#64748b', { rough: 1 })];
    case 'decor-plantas':
      return plant(w, h);
    case 'decor-planta-jade':
      return plant(w, h, '#e2e8f0');
    case 'decor-suculentas':
      return [box([0, 0.03, 0], [w, 0.06, d], '#d97706'), cyl([-0.06, 0.1, 0], 0.025, 0.08, '#22c55e'), sphere([0.03, 0.09, 0], 0.035, '#4ade80'), cyl([0.08, 0.11, 0], 0.02, 0.1, '#15803d')];
    case 'decor-lixeira':
      return [cyl([0, h / 2, 0], w / 2, h, '#475569', {}, w * 0.4)];
    case 'decor-caneca':
      return [cyl([-0.01, h / 2, 0], 0.04, h, '#ef4444'), torus([0.04, h / 2, 0], 0.025, 0.007, '#ef4444', { rot: [Math.PI / 2, 0, Math.PI / 2] })];
    case 'decor-livros':
      return [box([-0.1, 0.11, 0], [0.04, 0.22, 0.17], '#dc2626'), box([-0.05, 0.12, 0], [0.05, 0.24, 0.18], '#2563eb'), box([0.01, 0.1, 0], [0.04, 0.2, 0.16], '#16a34a'), box([0.07, 0.115, 0], [0.05, 0.23, 0.17], '#facc15'), box([0.12, 0.09, 0], [0.03, 0.18, 0.15], '#9333ea', { rot: [0, 0, -0.2] })];
    case 'decor-violao':
      return [sphere([0, 0.22, 0], 0.17, '#b45309'), sphere([0, 0.45, 0], 0.13, '#b45309'), cyl([0, 0.42, 0.06], 0.045, 0.01, BLACK, { rot: [Math.PI / 2, 0, 0] }), box([0, 0.78, 0], [0.05, 0.45, 0.03], '#78350f')];
    case 'decor-skate':
      return [box([0, 0.09, 0], [w, 0.015, d], BLACK), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl([sx * 0.27, 0.03, sz * 0.07], 0.027, 0.03, '#fde047', { rot: [0, 0, Math.PI / 2] })))];
    case 'decor-bola-futebol':
      return [sphere([0, w / 2, 0], w / 2, WHITE), sphere([0, w / 2, w / 2 - 0.02], 0.035, BLACK)];
    case 'decor-caixa-som-bt':
      return [cyl([0, h / 2, 0], h / 2, w, '#0ea5e9', { rot: [0, 0, Math.PI / 2] }), cyl([0, h / 2, h / 2 - 0.005], 0.03, 0.01, BLACK, { rot: [Math.PI / 2, 0, 0] })];
    case 'decor-lava':
      return [cone([0, 0.06, 0], 0.06, 0.12, METAL), cyl([0, 0.22, 0], 0.035, 0.2, '#f43f5e', { emissive: true }, 0.05), cone([0, 0.36, 0], 0.035, 0.08, METAL)];

    /* ------------------------------------ Gamer ----------------------------------- */
    case 'decor-fliperama':
      return [box([0, h / 2, -0.05], [w, h, d - 0.1], '#1e1b4b'), box([0, 1.25, d / 2 - 0.2], [w - 0.1, 0.4, 0.02], SCREEN, { emissive: true, rot: [-0.25, 0, 0] }), box([0, 0.95, d / 2 - 0.12], [w - 0.04, 0.05, 0.25], '#312e81'), box([0, 1.7, 0.02], [w, 0.18, d - 0.1], '#db2777', { emissive: true }), cyl([-0.1, 1.0, d / 2 - 0.1], 0.012, 0.06, '#ef4444'), sphere([-0.1, 1.04, d / 2 - 0.1], 0.02, '#ef4444')];
    case 'decor-maquina-garra':
      return [box([0, 0.4, 0], [w, 0.8, d], '#ec4899'), box([0, 1.25, 0], [w - 0.04, 0.9, d - 0.04], '#a5f3fc', { rough: 0.1, metal: 0.1 }), box([0, h - 0.07, 0], [w, 0.14, d], '#ec4899', { emissive: true }), cyl([0, 1.5, 0], 0.01, 0.4, METAL), cone([0, 1.28, 0], 0.05, 0.08, METAL), sphere([0.15, 0.95, 0.1], 0.08, '#fde047'), sphere([-0.12, 0.92, -0.1], 0.08, '#86efac')];
    case 'decor-tv-crt':
      return [box([0, h / 2, -0.03], [w, h, d - 0.06], '#57534e'), box([0, h * 0.55, d / 2 - 0.04], [w * 0.75, h * 0.62, 0.02], '#0e7490', { emissive: true }), box([w * 0.38, h * 0.3, d / 2 - 0.03], [0.05, 0.05, 0.02], DARK)];
    case 'decor-console-retro':
      return [box([0, h / 2, 0], [w, h, d], '#d1d5db'), box([-w * 0.25, h + 0.002, 0], [w * 0.35, 0.004, d * 0.6], '#9ca3af'), box([w * 0.3, h * 0.6, d / 2], [0.03, 0.01, 0.005], '#16a34a', { emissive: true })];
    case 'decor-atari':
      return [box([0, h / 2, 0], [w, h, d], BLACK), box([0, h / 2, d / 2 - 0.04], [w, h * 0.5, 0.08], '#92400e'), ...[0, 1, 2, 3].map((i) => box([-w / 2 + 0.06 + i * 0.05, h + 0.005, -0.02], [0.02, 0.01, 0.04], METAL))];
    case 'decor-arcade-stick':
      return [box([0, h * 0.3, 0], [w, h * 0.6, d], BLACK), cyl([-w * 0.25, h * 0.75, 0], 0.008, 0.06, METAL, { anim: 'wave' }), sphere([-w * 0.25, h * 0.95, 0], 0.022, '#ef4444', { anim: 'wave' }), ...[0, 1, 2, 3, 4, 5].map((i) => cyl([0.02 + (i % 3) * 0.05, h * 0.62, (Math.floor(i / 3) - 0.5) * 0.06], 0.014, 0.01, ['#3b82f6', '#22c55e', '#facc15'][i % 3]))];
    case 'decor-portatil-retro':
      return [box([0, h / 2, 0], [w, h, d], '#cbd5e1'), box([0, h * 0.7, d / 2 + 0.001], [w * 0.7, h * 0.35, 0.002], '#84cc16', { emissive: true }), cyl([-0.02, h * 0.3, d / 2], 0.01, 0.005, DARK, { rot: [Math.PI / 2, 0, 0] })];
    case 'decor-oculos-vr':
      return [box([0, h * 0.5, 0.03], [w, h * 0.7, 0.1], WHITE, { rough: 0.4 }), box([0, h * 0.5, 0.085], [w * 0.9, h * 0.6, 0.01], BLACK, { rough: 0.1 }), torus([0, h * 0.5, -0.02], w * 0.42, 0.012, DARK, { rot: [Math.PI / 2, 0, 0] })];
    case 'decor-cadeira-gamer':
      return [cyl([0, 0.05, 0], 0.3, 0.04, BLACK), cyl([0, 0.27, 0], 0.03, 0.42, METAL), box([0, 0.5, 0.05], [0.55, 0.1, 0.52], BLACK), box([0, 0.92, -0.22], [0.52, 0.78, 0.1], '#dc2626'), box([0, 1.22, -0.22], [0.3, 0.16, 0.12], BLACK), box([-0.3, 0.68, 0.05], [0.06, 0.04, 0.32], DARK), box([0.3, 0.68, 0.05], [0.06, 0.04, 0.32], DARK)];
    case 'decor-neon-controle':
      return [box([0, h / 2, -d / 2 + 0.005], [w, h, 0.01], '#0f172a', { rough: 0.2 }), torus([-w * 0.22, h / 2, 0], 0.09, 0.012, '#d946ef', { emissive: true }), torus([w * 0.22, h / 2, 0], 0.09, 0.012, '#d946ef', { emissive: true }), box([0, h / 2 + 0.06, 0], [w * 0.44, 0.024, 0.024], '#d946ef', { emissive: true }), box([0, h / 2 - 0.06, 0], [w * 0.3, 0.024, 0.024], '#22d3ee', { emissive: true })];
    case 'decor-neon-cyberpunk':
      return [box([0, h / 2, -d / 2 + 0.005], [w, h, 0.01], BLACK), ...[0, 1, 2, 3].map((i) => box([0, h * 0.15 + i * h * 0.22, 0], [w * 0.7, 0.03, 0.02], i % 2 ? '#22d3ee' : '#f43f5e', { emissive: true, anim: 'blink' })), box([0, h / 2, 0.005], [0.03, h * 0.8, 0.02], '#f43f5e', { emissive: true })];
    case 'decor-espuma-acustica':
      return [box([0, h / 2, -d / 2 + 0.01], [w, h, 0.02], '#1e293b', { rough: 1 }), ...[0, 1, 2, 3].map((i) => box([0, h * 0.12 + i * h * 0.25, 0.005], [w - 0.02, h * 0.12, d - 0.02], '#334155', { rough: 1 }))];
    case 'decor-suporte-headset':
      return [cyl([0, 0.01, 0], 0.06, 0.02, BLACK), cyl([0, h / 2, 0], 0.012, h, DARK), box([0, h - 0.01, 0], [0.13, 0.02, 0.04], DARK)];
    case 'decor-frigobar':
      return [box([0, h / 2, 0], [w, h, d], '#e2e8f0'), box([w / 2 - 0.05, h * 0.6, d / 2 + 0.015], [0.02, 0.25, 0.03], METAL), box([0, h * 0.1, d / 2 + 0.001], [w * 0.8, 0.04, 0.002], '#94a3b8')];
    case 'decor-pelucias-garra':
      return [sphere([-0.08, 0.08, 0], 0.075, '#fbbf24', { anim: 'bob' }), sphere([-0.08, 0.16, 0], 0.05, '#fbbf24', { anim: 'bob' }), sphere([0.08, 0.08, 0], 0.075, '#f9a8d4'), sphere([0.08, 0.16, 0], 0.05, '#f9a8d4')];
    case 'decor-pelucia-tubarao':
      return [sphere([0, 0.07, 0], 0.07, '#60a5fa', { rot: [0, 0, 0] }), box([0, 0.07, 0], [w * 0.8, 0.1, 0.1], '#60a5fa'), cone([0, 0.15, 0], 0.03, 0.08, '#3b82f6'), cone([w * 0.42, 0.07, 0], 0.05, 0.08, '#3b82f6', { rot: [0, 0, -Math.PI / 2] })];
    case 'decor-vitrine':
      return [box([0, h / 2, -d / 2 + 0.01], [w, h, 0.02], DARK), box([-w / 2 + 0.01, h / 2, 0], [0.02, h, d], DARK), box([w / 2 - 0.01, h / 2, 0], [0.02, h, d], DARK), ...[0.09, 0.49, 0.89, 1.29, 1.79].map((y) => box([0, y, 0], [w, 0.02, d], '#cbd5e1', { metal: 0.3 })), box([0, h / 2, d / 2 - 0.005], [w, h, 0.01], '#bae6fd', { rough: 0.05 })];
    case 'decor-trofeu':
      return [box([0, 0.025, 0], [0.09, 0.05, 0.09], BLACK), cyl([0, 0.09, 0], 0.012, 0.08, '#eab308', { metal: 0.9, rough: 0.2 }), cyl([0, 0.18, 0], 0.055, 0.1, '#eab308', { metal: 0.9, rough: 0.2 }, 0.025)];
    case 'decor-cubo-magico':
      return [box([0, w / 2, 0], [w, w, w], BLACK), box([0, w + 0.001, 0], [w * 0.9, 0.002, w * 0.9], '#facc15'), box([0, w / 2, w / 2 + 0.001], [w * 0.9, w * 0.9, 0.002], '#ef4444'), box([w / 2 + 0.001, w / 2, 0], [0.002, w * 0.9, w * 0.9], '#22c55e')];

    /* --------------------------------- Nerd & Ciência ------------------------------- */
    case 'decor-d20':
      return [sphere([0, w / 2, 0], w / 2, '#7c3aed', { rough: 0.3 })];
    case 'decor-dados-rpg':
      return [sphere([-0.06, 0.02, 0], 0.02, '#7c3aed'), box([-0.015, 0.016, 0], [0.032, 0.032, 0.032], '#ef4444'), cone([0.03, 0.02, 0], 0.02, 0.04, '#22c55e'), sphere([0.07, 0.02, 0], 0.02, '#facc15')];
    case 'decor-xadrez':
      return [box([0, 0.01, 0], [w, 0.02, d], WOOD_LIGHT), ...Array.from({ length: 8 }, (_, i) => cyl([-w / 2 + 0.03 + i * (w - 0.06) / 7, 0.05, -d / 2 + 0.05], 0.012, 0.05, BLACK)), ...Array.from({ length: 8 }, (_, i) => cyl([-w / 2 + 0.03 + i * (w - 0.06) / 7, 0.05, d / 2 - 0.05], 0.012, 0.05, WHITE)), cone([0, 0.07, d / 2 - 0.1], 0.02, 0.09, WHITE)];
    case 'decor-telescopio':
      return [cyl([-0.15, 0.4, -0.1], 0.015, 0.85, DARK, { rot: [0.3, 0, 0.3] }), cyl([0.15, 0.4, -0.1], 0.015, 0.85, DARK, { rot: [0.3, 0, -0.3] }), cyl([0, 0.4, 0.15], 0.015, 0.85, DARK, { rot: [-0.35, 0, 0] }), cyl([0, 1.05, 0], 0.07, 0.8, WHITE, { rot: [0.9, 0, 0] }, 0.05)];
    case 'decor-capacete-astronauta':
      return [sphere([0, 0.13, 0], 0.13, WHITE), box([0, 0.14, 0.08], [0.16, 0.1, 0.06], '#f59e0b', { rough: 0.05, metal: 0.6 }), cyl([0, 0.02, 0], 0.12, 0.04, METAL, { anim: 'bob' })];
    case 'decor-terra':
      return [cyl([0, h - 0.15, 0], 0.003, 0.3, METAL), sphere([0, 0.15, 0], 0.13, '#2563eb', { anim: 'spin' }), sphere([0.05, 0.2, 0.05], 0.07, '#16a34a', { anim: 'spin' })];
    case 'decor-sol':
      return [cyl([0, h - 0.15, 0], 0.003, 0.3, METAL), sphere([0, 0.2, 0], 0.18, '#f59e0b', { emissive: true })];
    case 'decor-jupiter':
      return [cyl([0, h - 0.15, 0], 0.003, 0.3, METAL), sphere([0, 0.17, 0], 0.15, '#d97706', { anim: 'spin' }), torus([0, 0.17, 0], 0.152, 0.02, '#fcd34d', { rot: [Math.PI / 2, 0, 0], anim: 'spin' })];
    case 'decor-robo':
      return [box([0, 0.07, 0], [0.12, 0.1, 0.08], METAL), box([0, 0.17, 0], [0.09, 0.08, 0.08], '#cbd5e1'), sphere([-0.02, 0.18, 0.04], 0.01, '#22d3ee', { emissive: true }), sphere([0.02, 0.18, 0.04], 0.01, '#22d3ee', { emissive: true }), cyl([0, 0.23, 0], 0.004, 0.04, DARK), box([0, 0.01, 0], [0.14, 0.02, 0.1], DARK)];
    case 'decor-robo-fofo':
      return [sphere([0, 0.05, 0], 0.05, WHITE), sphere([0, 0.11, 0], 0.04, WHITE, { anim: 'bob' }), sphere([-0.015, 0.115, 0.035], 0.008, '#0ea5e9', { emissive: true, anim: 'bob' }), sphere([0.015, 0.115, 0.035], 0.008, '#0ea5e9', { emissive: true, anim: 'bob' }), box([0.06, 0.07, 0], [0.04, 0.012, 0.012], WHITE, { anim: 'wave' })];
    case 'decor-microscopio':
      return [box([0, 0.02, 0.02], [0.18, 0.04, 0.2], DARK), box([0, 0.18, -0.07], [0.04, 0.3, 0.05], DARK), cyl([0, 0.28, 0], 0.02, 0.16, METAL, { rot: [0.4, 0, 0] }), box([0, 0.12, 0.02], [0.12, 0.01, 0.1], '#cbd5e1')];
    case 'decor-raspberry-pi':
      return [box([0, 0.004, 0], [w, 0.008, d], '#15803d'), box([-0.02, 0.012, 0], [0.015, 0.01, 0.015], '#94a3b8'), box([w / 2 - 0.01, 0.012, 0], [0.02, 0.012, 0.04], METAL), box([0, 0.012, 0.015], [0.03, 0.006, 0.01], DARK)];
    case 'decor-arduino':
      return [box([0, 0.003, 0], [w, 0.006, d], '#0e7490'), box([0, 0.009, 0], [0.035, 0.006, 0.01], DARK), box([-w / 2 + 0.01, 0.01, 0.01], [0.012, 0.01, 0.012], METAL)];
    case 'decor-drone':
      return [box([0, 0.04, 0], [0.1, 0.04, 0.1], DARK), ...[-1, 1].flatMap((sx) => [-1, 1].map((sz) => cyl([sx * 0.11, 0.07, sz * 0.11], 0.05, 0.004, '#64748b', { anim: 'spin' }))), box([0, 0.04, 0], [0.3, 0.012, 0.012], DARK, { rot: [0, Math.PI / 4, 0] }), box([0, 0.04, 0], [0.3, 0.012, 0.012], DARK, { rot: [0, -Math.PI / 4, 0] })];
    case 'decor-toca-discos':
      return [box([0, 0.05, 0], [w, 0.1, d], WOOD), cyl([-0.04, 0.105, 0], 0.15, 0.01, BLACK, { anim: 'spin' }), cyl([0.18, 0.12, -0.1], 0.004, 0.18, METAL, { rot: [0, 0, Math.PI / 2] })];
    case 'decor-globo':
      return [cyl([0, 0.02, 0], 0.08, 0.04, WOOD), cyl([0, 0.1, 0], 0.008, 0.12, WOOD), sphere([0, 0.28, 0], 0.14, '#1d4ed8'), sphere([0.06, 0.32, 0.07], 0.07, '#16a34a'), torus([0, 0.28, 0], 0.15, 0.006, '#eab308', { rot: [0, 0, 0.4] })];

    /* ------------------------------------ Museu ------------------------------------ */
    case 'decor-pc-anos-90':
      return [box([0, 0.06, 0], [w, 0.12, d], '#e7e5e4'), box([0, 0.28, -0.04], [0.36, 0.3, 0.32], '#e7e5e4'), box([0, 0.29, 0.125], [0.27, 0.21, 0.01], '#0f766e', { emissive: true }), box([0, 0.01, d / 2 - 0.02], [0.35, 0.02, 0.12], '#d6d3d1')];
    case 'decor-terminal-ibm':
      return [box([0, h * 0.55, -0.02], [w, h * 0.8, d - 0.08], '#d6d3d1'), box([0, h * 0.6, d / 2 - 0.06], [w * 0.75, h * 0.5, 0.01], '#16a34a', { emissive: true }), box([0, 0.02, d / 2 - 0.04], [w, 0.04, 0.12], '#a8a29e')];
    case 'decor-pc-retro-psx':
      return [box([0, 0.03, 0], [w, 0.06, d], '#d4d4d8'), box([0, 0.12, -0.02], [w * 0.8, 0.12, d * 0.7], '#e4e4e7'), box([0, 0.12, d * 0.33], [w * 0.55, 0.08, 0.005], '#0891b2', { emissive: true })];
    case 'decor-computadores-antigos':
      return [box([-0.35, 0.45, 0], [0.45, 0.9, 0.45], '#a8a29e'), box([-0.35, 0.6, 0.23], [0.3, 0.25, 0.01], '#15803d', { emissive: true }), box([0.25, 0.15, 0], [0.6, 0.3, 0.45], '#d6d3d1'), box([0.25, 0.5, 0], [0.42, 0.38, 0.38], '#e7e5e4'), box([0.25, 0.5, 0.195], [0.32, 0.26, 0.01], '#0e7490', { emissive: true }), ...[0, 1].map((i) => cyl([-0.35, 0.8, 0.23], 0.04 - i * 0.015, 0.005, DARK, { rot: [Math.PI / 2, 0, 0] }))];

    /* ----------------------------- Móveis feitos por código ---------------------------- */
    case 'proc-aparador':
      return [box([0, h - 0.015, 0], [w, 0.03, d], WOOD_LIGHT), box([0, h / 2 - 0.02, -d / 2 + 0.02], [w, h - 0.04, 0.02], WOOD), ...[-1, 1].map((sx) => box([sx * (w / 2 - 0.015), h / 2 - 0.02, 0], [0.03, h - 0.04, d], WOOD)), box([0, 0.1, 0], [w, 0.02, d], WOOD)];
    case 'proc-linha-do-tempo':
      return [box([0, 0.025, 0], [w, 0.05, d], WOOD), box([0, 0.635, 0], [w, 0.03, d], WOOD_LIGHT), box([0, h - 0.02, 0], [w, 0.04, d], WOOD), box([0, h / 2, -d / 2 + 0.01], [w, h, 0.02], WOOD), ...[-1, 0, 1].map((i) => box([i * (w / 2 - 0.015), h / 2, 0], [0.03, h, d], WOOD))];
    default:
      return [box([0, h / 2, 0], [w, h, d], METAL)];
  }
}
