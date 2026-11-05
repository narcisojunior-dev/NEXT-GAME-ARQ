import { describe, it, expect } from 'vitest';
import {
  AUDIO_ZONE_WIDTH,
  DESK_DEPTH,
  DESK_TOP_HEIGHT,
  DESK_WIDTH_BY_ID,
  DeskSnapPointId,
  MONITOR_ZONE_WIDTH,
  MOUSEPAD_ZONE_WIDTH,
  PlacedDeskItem,
  TOWER_ZONE_WIDTH,
  buildDeskInventory,
  canPlaceOnDesk,
  canRemoveFromDesk,
  getSnapPointPosition,
  isTowerOnFloor,
} from '../deskSetup';
import { DeskItemPlacement, MOUSEPAD_THICKNESS, deskItemPlacements } from '../deskGeometry';
import { Aabb, fitsInsideXZ, overlapRatio } from '../geometry3d';
import { EXTERNAL_PORTS, ExternalPortId, getExternalPortWorldPosition } from '../externalCabling';
import {
  AUDIO_DEVICES,
  CASE_THEMES,
  CHAIRS,
  DESKS,
  GAMEPADS,
  KEYBOARDS,
  MICE,
  MONITORS,
  MONITOR_STANDS,
  MOUSEPADS,
  StudentSetupConfig,
} from '../peripheralsCatalog';
import { CASES } from '../hardwareCatalog';
import { CaseComponent } from '../types';

const EPS = 1e-6;
/** Sobreposição máxima tolerada entre dois itens (fração do volume do menor) */
const MAX_OVERLAP = 0.02;

type Placed = Partial<Record<DeskSnapPointId, PlacedDeskItem>>;

/** Todas as combinações de periféricos do catálogo (inclusive gamepad e tema, que não vão à mesa) */
function* allSetups(): Generator<StudentSetupConfig> {
  for (const desk of DESKS)
    for (const chair of CHAIRS)
      for (const monitor of MONITORS)
        for (const keyboard of KEYBOARDS)
          for (const mouse of MICE)
            for (const stand of MONITOR_STANDS)
              for (const audio of AUDIO_DEVICES)
                for (const mousepad of MOUSEPADS)
                  for (const gamepad of GAMEPADS)
                    for (const caseTheme of CASE_THEMES)
                      yield { desk, chair, monitor, keyboard, mouse, stand, audio, mousepad, gamepad, caseTheme };
}

const setupLabel = (s: StudentSetupConfig) =>
  [s.desk?.id, s.chair?.id, s.monitor.id, s.keyboard.id, s.mouse.id, s.stand.id, s.audio.id, s.mousepad?.id].join(' + ');

/** Posiciona o inventário na ordem física do jogo, exigindo que cada passo seja aceito */
function placeAll(setup: StudentSetupConfig): { placed: Placed; problems: string[] } {
  const placed: Placed = {};
  const problems: string[] = [];
  const context = { isPcAssembled: true, studentSetup: setup };
  buildDeskInventory(setup).forEach(({ targetSnapPoint, item }) => {
    const result = canPlaceOnDesk(targetSnapPoint, item, placed, context);
    if (!result.allowed) problems.push(`${targetSnapPoint} recusado: ${result.message}`);
    else placed[targetSnapPoint] = item;
  });
  return { placed, problems };
}

const size = (b: Aabb, axis: 0 | 1 | 2) => b.max[axis] - b.min[axis];

/** Problemas de encaixe da mesa montada (vazia = tudo no lugar, apoiado e sem sobreposição) */
function fitProblems(placed: Placed, caseInstalled: CaseComponent): string[] {
  const deskWidth = (placed.DESK_BASE && DESK_WIDTH_BY_ID[placed.DESK_BASE.itemId]) || 1.4;
  const placements = deskItemPlacements(placed, caseInstalled);
  const box = (id: DeskSnapPointId) => placements.find((p) => p.snapPointId === id)?.box;
  const top: Aabb = { min: [-deskWidth / 2, DESK_TOP_HEIGHT, -DESK_DEPTH / 2], max: [deskWidth / 2, DESK_TOP_HEIGHT, DESK_DEPTH / 2] };
  const problems: string[] = [];
  const near = (a: number, b: number) => Math.abs(a - b) < EPS;

  placements.forEach(({ snapPointId: id, box: b }: DeskItemPlacement) => {
    if (id === 'DESK_BASE' || id === 'CHAIR') {
      if (!near(b.min[1], 0)) problems.push(`${id} não está no chão`);
      return;
    }
    if (id === 'PC_TOWER' && isTowerOnFloor(deskWidth)) {
      // No chão, ao lado direito da mesa: nem embaixo do tampo nem fora da profundidade da mesa
      if (!near(b.min[1], 0)) problems.push('torre (mesa compacta) não está no chão');
      if (b.min[0] < top.max[0] + EPS) problems.push('torre no chão invade a projeção do tampo');
      if (b.min[2] < top.min[2] - EPS || b.max[2] > top.max[2] + EPS) problems.push('torre no chão fora da profundidade da mesa');
      return;
    }
    // Itens de tampo: inteiros dentro do tampo
    if (!fitsInsideXZ(top, b)) problems.push(`${id} fora do tampo`);
    // Apoio: teclado e mouse sobre o mousepad; o resto direto no tampo
    const expectedBase = id === 'KEYBOARD' || id === 'MOUSE' ? DESK_TOP_HEIGHT + MOUSEPAD_THICKNESS : DESK_TOP_HEIGHT;
    if (!near(b.min[1], expectedBase)) problems.push(`${id} não apoiado (base ${b.min[1].toFixed(4)} ≠ ${expectedBase.toFixed(4)})`);
  });

  // Teclado e mouse inteiros sobre o mousepad (coerente com a regra de ordem)
  const pad = box('MOUSEPAD');
  (['KEYBOARD', 'MOUSE'] as DeskSnapPointId[]).forEach((id) => {
    const b = box(id);
    if (pad && b && !fitsInsideXZ(pad, b)) problems.push(`${id} fora do mousepad`);
  });

  // O braço articulado segura o monitor: fica atrás do centro do painel e dentro da largura dele
  const arm = box('MONITOR_ARM');
  const monitor = box('MONITOR_MAIN');
  if (arm && monitor) {
    const armX = (arm.min[0] + arm.max[0]) / 2;
    if (armX < monitor.min[0] || armX > monitor.max[0]) problems.push('braço fora da largura do monitor');
    if ((arm.min[2] + arm.max[2]) / 2 >= (monitor.min[2] + monitor.max[2]) / 2) problems.push('braço na frente do monitor');
  }

  // Sem sobreposição exagerada (o par monitor+braço é um conjunto fixado de propósito)
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const pair = [placements[i].snapPointId, placements[j].snapPointId];
      if (pair.includes('MONITOR_MAIN') && pair.includes('MONITOR_ARM')) continue;
      const ratio = overlapRatio(placements[i].box, placements[j].box);
      if (ratio > MAX_OVERLAP) problems.push(`${pair.join(' × ')} sobrepostos em ${(ratio * 100).toFixed(1)}%`);
    }
  }

  // Portas externas no próprio dispositivo (até 6 cm da caixa: conectores ficam na face traseira)
  (Object.keys(EXTERNAL_PORTS) as ExternalPortId[]).forEach((portId) => {
    const host = EXTERNAL_PORTS[portId].hostSnapPoint;
    if (host === 'WALL') return;
    const b = box(host);
    if (!b) return;
    const p = getExternalPortWorldPosition(portId, deskWidth);
    const outside = [0, 1, 2].some((k) => p[k] < b.min[k] - 0.06 || p[k] > b.max[k] + 0.06);
    if (outside) problems.push(`porta ${portId} longe de ${host}`);
  });
  return problems;
}

describe('Mesa 3D: todas as combinações de periféricos encaixam no lugar certo', () => {
  it('cada combinação é aceita na ordem física e fica dentro do tampo, apoiada e sem sobreposição', () => {
    const failures: string[] = [];
    let total = 0;
    for (const setup of allSetups()) {
      const { placed, problems } = placeAll(setup);
      CASES.forEach((caseInstalled) => {
        total++;
        const all = [...problems, ...fitProblems(placed, caseInstalled)];
        if (all.length > 0 && failures.length < 15) failures.push(`${setupLabel(setup)} + ${caseInstalled.id}: ${all.join('; ')}`);
      });
    }
    console.info(`[mesa] ${total.toLocaleString('pt-BR')} combinações de periféricos × gabinetes verificadas`);
    expect(total).toBeGreaterThan(1000);
    expect(failures).toEqual([]);
  });

  it('as larguras reservadas do arranjo cobrem o maior item de cada categoria', () => {
    const widest = (id: DeskSnapPointId) => {
      let max = 0;
      for (const setup of allSetups()) {
        const { placed } = placeAll(setup);
        CASES.forEach((c) => {
          const b = deskItemPlacements(placed, c).find((p) => p.snapPointId === id)?.box;
          if (b) max = Math.max(max, size(b, 0));
        });
      }
      return max;
    };
    expect(widest('PC_TOWER')).toBeLessThanOrEqual(TOWER_ZONE_WIDTH);
    expect(widest('HEADSET')).toBeLessThanOrEqual(AUDIO_ZONE_WIDTH);
    expect(widest('MONITOR_MAIN')).toBeLessThanOrEqual(MONITOR_ZONE_WIDTH);
    expect(widest('MOUSEPAD')).toBeLessThanOrEqual(MOUSEPAD_ZONE_WIDTH);
  });

  it('na mesa de 140 cm a torre fica sobre o tampo; na de 120 cm vai para o chão ao lado', () => {
    expect(isTowerOnFloor(1.4)).toBe(false);
    expect(isTowerOnFloor(1.2)).toBe(true);
    expect(getSnapPointPosition('PC_TOWER', 1.4)[1]).toBe(DESK_TOP_HEIGHT);
    expect(getSnapPointPosition('PC_TOWER', 1.2)[1]).toBe(0);
  });

  it('nenhum item muda de lugar quando outro é posicionado (posição depende só da mesa)', () => {
    const setup = allSetups().next().value as StudentSetupConfig;
    const { placed } = placeAll(setup);
    const full = deskItemPlacements(placed, CASES[0]);
    const partial: Placed = { DESK_BASE: placed.DESK_BASE, KEYBOARD: placed.KEYBOARD };
    const kbAlone = deskItemPlacements(partial, CASES[0]).find((p) => p.snapPointId === 'KEYBOARD');
    expect(kbAlone?.box).toEqual(full.find((p) => p.snapPointId === 'KEYBOARD')?.box);
  });
});

describe('Mesa 3D: a ordem física de montagem é obrigatória em todas as combinações', () => {
  it('fora de ordem é recusado; desmontar na ordem inversa é sempre permitido', () => {
    const failures: string[] = [];
    for (const setup of allSetups()) {
      const context = { isPcAssembled: true, studentSetup: setup };
      const inventory = buildDeskInventory(setup);
      const item = (id: DeskSnapPointId) => inventory.find((e) => e.targetSnapPoint === id)?.item;
      const label = setupLabel(setup);
      const expectRefused = (why: string, snap: DeskSnapPointId, placed: Placed, ctx = context) => {
        const it = item(snap);
        if (it && canPlaceOnDesk(snap, it, placed, ctx).allowed) failures.push(`${label}: ${why}`);
      };

      // Periféricos sem a mesa
      (['PC_TOWER', 'MONITOR_MAIN', 'MOUSEPAD', 'KEYBOARD', 'MOUSE', 'HEADSET'] as DeskSnapPointId[]).forEach((snap) =>
        expectRefused(`${snap} aceito sem mesa`, snap, {})
      );
      const desk: Placed = { DESK_BASE: item('DESK_BASE') };
      // PC sem a montagem interna finalizada
      expectRefused('PC aceito sem montagem concluída', 'PC_TOWER', desk, { ...context, isPcAssembled: false });
      // Mousepad por cima de teclado/mouse já posicionados
      expectRefused('mousepad aceito por cima do teclado', 'MOUSEPAD', { ...desk, KEYBOARD: item('KEYBOARD') });
      if (setup.stand.id === 'stand-gas-arm') {
        expectRefused('monitor aceito antes do braço articulado', 'MONITOR_MAIN', desk);
        expectRefused('braço aceito com o monitor já na mesa', 'MONITOR_ARM', { ...desk, MONITOR_MAIN: item('MONITOR_MAIN') });
      }
      // Cada item em qualquer outro snap point é recusado (categoria errada)
      inventory.forEach(({ targetSnapPoint, item: it }) => {
        inventory.forEach(({ targetSnapPoint: other }) => {
          if (other !== targetSnapPoint && canPlaceOnDesk(other, it, desk, context).allowed && other !== 'DESK_BASE') {
            failures.push(`${label}: ${it.itemId} aceito em ${other}`);
          }
        });
      });

      // Desmontagem na ordem inversa
      const { placed } = placeAll(setup);
      [...inventory].reverse().forEach(({ targetSnapPoint }) => {
        const result = canRemoveFromDesk(targetSnapPoint, placed);
        if (!result.allowed) failures.push(`${label}: remoção de ${targetSnapPoint} recusada (${result.message})`);
        else delete placed[targetSnapPoint];
      });
      if (failures.length > 15) break;
    }
    expect(failures).toEqual([]);
  });
});
