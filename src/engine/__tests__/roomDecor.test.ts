import { describe, it, expect } from 'vitest';
import { ALLOWED_3D_LICENSES, DECOR_MODELS, MAX_DECOR_MODEL_FACES, MODELS_3D, CATEGORY_3D_LABELS } from '../models3d';
import { DECOR_ITEMS, DECOR_PACKS, findDecorItem, isFlat, isProcedural, validateNeonText, DecorItem } from '../roomDecor';
import {
  DOOR_SWING,
  OUTLETS,
  ROOM_HEIGHT,
  ROOM_LIMITS,
  ROOM_MIN_X,
  ROOM_MIN_Z,
  RoomContext,
  WINDOW,
  buildRoomContext,
} from '../roomLayout';
import {
  DecorPlacement,
  RoomDecorState,
  SHELF_LAYOUTS,
  boxAt,
  canPlace,
  nudgePlacement,
  rotatePlacement,
  shelfPlacement,
  shelfSlots,
  snapToZone,
  suggestPlacements,
  wallPosition,
  WALL_ROTATION,
} from '../roomPlacement';
import { STARTER_SETS, addDecor, createRoomDecor, moveDecor, removeDecor, sanitizeRoomDecor } from '../roomDecorState';
import { ROOM_THEMES, RoomThemeId } from '../roomThemes';
import { DEFAULT_STUDENT_SETUP, DESKS } from '../peripheralsCatalog';
import { DeskSnapPointId, PlacedDeskItem, buildDeskInventory, getSnapPointPosition } from '../deskSetup';
import { CASES } from '../hardwareCatalog';

const decor = (id: string): DecorItem => {
  const item = findDecorItem(id);
  if (!item) throw new Error(`item ${id} fora do catálogo`);
  return item;
};

/** Mesa montada como o aluno monta: inventário padrão posicionado nos snap points */
function placedDesk(deskId = DESKS[0].id): Partial<Record<DeskSnapPointId, PlacedDeskItem>> {
  const setup = { ...DEFAULT_STUDENT_SETUP, desk: DESKS.find((d) => d.id === deskId) };
  return Object.fromEntries(buildDeskInventory(setup).map((e) => [e.targetSnapPoint, e.item]));
}

const CTX: RoomContext = buildRoomContext(placedDesk(), CASES[0]);
const CTX_COMPACT: RoomContext = buildRoomContext(placedDesk(DESKS[1].id), CASES[0]);
const empty = (): RoomDecorState => ({ version: 1, theme: 'ROOM_GAMER', items: [] });

const floor = (id: string, x: number, z: number, rotationY: 0 | 90 | 180 | 270 = 0): DecorPlacement => snapToZone(decor(id), 'FLOOR', [x, 0, z], rotationY, CTX);
const wall = (id: string, w: 'BACK' | 'LEFT', u: number, centerY: number): DecorPlacement =>
  snapToZone(decor(id), 'WALL', w === 'BACK' ? [u, centerY, ROOM_MIN_Z] : [ROOM_MIN_X, centerY, u], 0, CTX, w);

const place = (state: RoomDecorState, id: string, p: DecorPlacement, ctx = CTX) => {
  const r = addDecor(state, id, p, ctx);
  expect(r.check, `${id} deveria caber`).toEqual({ ok: true });
  return r;
};

describe('Catálogo de decoração (#84, #89)', () => {
  it('todo item tem modelo DECOR no manifesto ou é feito por código (proc-*)', () => {
    const decorIds = new Set(DECOR_MODELS.map((m) => m.id));
    DECOR_ITEMS.forEach((item) => expect(isProcedural(item.id) || decorIds.has(item.id), item.id).toBe(true));
    // E todo modelo DECOR do manifesto está no catálogo
    DECOR_MODELS.forEach((m) => expect(findDecorItem(m.id), m.id).not.toBeNull());
  });

  it('manifesto: 68 modelos DECOR com licença permitida, até 20 mil faces e categoria com rótulo', () => {
    expect(DECOR_MODELS).toHaveLength(68);
    DECOR_MODELS.forEach((m) => {
      expect(ALLOWED_3D_LICENSES).toContain(m.license);
      expect(m.faces).toBeLessThanOrEqual(MAX_DECOR_MODEL_FACES);
      expect(CATEGORY_3D_LABELS[m.category]).toBeTruthy();
      expect(m.targets).toEqual([]);
    });
    expect(new Set(MODELS_3D.map((m) => m.id)).size).toBe(MODELS_3D.length);
  });

  it('as faces do catálogo são as do manifesto (orçamento de desempenho)', () => {
    DECOR_MODELS.forEach((m) => expect(decor(m.id).faces, m.id).toBe(m.faces));
  });

  it('pacotes: 29 Clássico, 19 Gamer, 16 Nerd e 4 Museu baixáveis, mais os itens por código', () => {
    const count = (pack: string) => DECOR_ITEMS.filter((i) => i.pack === pack && !isProcedural(i.id)).length;
    expect([count('CLASSICO'), count('GAMER'), count('NERD'), count('MUSEU')]).toEqual([29, 19, 16, 4]);
    expect(DECOR_PACKS.map((p) => p.id)).toEqual(['CLASSICO', 'GAMER', 'NERD', 'MUSEU']);
    ['proc-fita-led', 'proc-hexagonos', 'proc-neon-texto', 'proc-poster', 'proc-aparador', 'proc-linha-do-tempo'].forEach((id) => expect(findDecorItem(id)).not.toBeNull());
  });

  it('cada item tem zona, pegada positiva, curiosidade didática e limite por quarto', () => {
    DECOR_ITEMS.forEach((item) => {
      expect(item.zones.length, item.id).toBeGreaterThan(0);
      expect(item.footprint.w * item.footprint.d * item.footprint.h, item.id).toBeGreaterThan(0);
      expect(item.description.length, item.id).toBeGreaterThan(15);
      expect(item.maxPerRoom, item.id).toBeGreaterThanOrEqual(1);
    });
  });

  it('a zona principal de cada modelo é a da curadoria (docs/modelos-3d-decoracao.json)', () => {
    expect(decor('decor-cama').zones[0]).toBe('FLOOR');
    expect(decor('decor-livros').zones[0]).toBe('SHELF');
    expect(decor('decor-terra').zones[0]).toBe('CEILING');
    expect(decor('decor-neon-controle').zones[0]).toBe('WALL');
    expect(decor('decor-raspberry-pi').zones[0]).toBe('DESK');
  });

  it('estantes: o número de nichos do layout é o anunciado no catálogo', () => {
    DECOR_ITEMS.filter((i) => i.providesShelfSlots).forEach((i) => {
      const layout = SHELF_LAYOUTS[i.id];
      expect(layout, i.id).toBeDefined();
      expect(layout.cols * layout.levels.length).toBe(i.providesShelfSlots);
    });
  });

  it('todo item de prateleira cabe em ao menos um nicho de alguma estante', () => {
    const hosts = DECOR_ITEMS.filter((i) => i.providesShelfSlots);
    DECOR_ITEMS.filter((i) => i.zones.includes('SHELF')).forEach((item) => {
      const fits = hosts.some((h) => {
        const l = SHELF_LAYOUTS[h.id];
        return item.footprint.w <= h.footprint.w / l.cols && item.footprint.h <= l.clearance && item.footprint.d <= h.footprint.d + 0.02;
      });
      expect(fits, item.id).toBe(true);
    });
  });

  it('neon com texto: até 12 caracteres, sem links e sem palavrões', () => {
    expect(validateNeonText('  Equipe Alfa ')).toEqual({ ok: true, text: 'Equipe Alfa' });
    expect(validateNeonText('')).toMatchObject({ ok: false });
    expect(validateNeonText('Texto grande demais')).toMatchObject({ ok: false });
    expect(validateNeonText('site.com')).toMatchObject({ ok: false });
    expect(validateNeonText('www')).toMatchObject({ ok: false });
    expect(validateNeonText('P0rra')).toMatchObject({ ok: true }); // variação com número passa no filtro simples
    expect(validateNeonText('PORRA')).toMatchObject({ ok: false });
    expect(validateNeonText('Merdão')).toMatchObject({ ok: false });
    expect(validateNeonText('GG #1!')).toMatchObject({ ok: true });
  });
});

describe('Geometria do quarto (#84)', () => {
  it('a parede do fundo é a das tomadas do cabeamento externo e o quarto tem 4 m × 4 m', () => {
    expect(ROOM_MIN_Z).toBe(-0.55);
    expect(OUTLETS.wall).toBe('BACK');
    expect(WINDOW.wall).toBe('LEFT');
    expect(DOOR_SWING.max[2] - DOOR_SWING.min[2]).toBeCloseTo(0.9);
  });

  it('a mesa, a cadeira e o PC são obstáculos fixos', () => {
    const labels = CTX.obstacles.map((o) => o.label);
    expect(labels).toEqual(expect.arrayContaining(['na mesa', 'na cadeira', 'no gabinete do PC', 'no monitor']));
    expect(CTX.deskTop).toMatchObject({ minX: -0.7, maxX: 0.7, y: 0.75 });
  });
});

describe('Posicionamento: encaixe, limites e colisão (#84)', () => {
  it('chão em grade de 10 cm, teto em grade de 25 cm, parede entre 30 cm e 2,40 m', () => {
    expect(floor('decor-lixeira', 1.234, 2.071).position).toEqual([1.2, 0, 2.1]);
    const ceiling = snapToZone(decor('decor-luminaria-teto'), 'CEILING', [0.13, 0, 1.12], 0, CTX);
    expect(ceiling.position[0]).toBe(0.25);
    expect(ceiling.position[2]).toBe(1);
    expect(ceiling.position[1] + decor('decor-luminaria-teto').footprint.h).toBeCloseTo(ROOM_HEIGHT);
    const low = wall('decor-relogio-parede', 'BACK', 1.3, 0.05);
    expect(low.position[1]).toBe(0.3);
    const high = wall('decor-relogio-parede', 'BACK', 1.3, 9);
    expect(high.position[1] + decor('decor-relogio-parede').footprint.h).toBeLessThanOrEqual(2.4 + 1e-9);
  });

  it('peça de parede encosta na parede e gira com ela', () => {
    const left = wall('decor-quadro', 'LEFT', 0.2, 1.5);
    expect(left.rotationY).toBe(WALL_ROTATION.LEFT);
    expect(left.position[0]).toBeCloseTo(ROOM_MIN_X + decor('decor-quadro').footprint.d / 2);
    expect(canPlace(empty(), decor('decor-quadro'), left, CTX)).toEqual({ ok: true });
    // Solta no meio do quarto: recusada
    const loose = { ...left, position: [0, 1.5, 1] as [number, number, number] };
    expect(canPlace(empty(), decor('decor-quadro'), loose, CTX)).toMatchObject({ ok: false, reason: 'FORA_DO_QUARTO' });
  });

  it('fora do quarto e fora do tampo da mesa são recusados', () => {
    const out: DecorPlacement = { zone: 'FLOOR', position: [1.9, 0, 1], rotationY: 0 };
    expect(canPlace(empty(), decor('decor-cama'), out, CTX)).toMatchObject({ ok: false, reason: 'FORA_DO_QUARTO' });
    const offDesk: DecorPlacement = { zone: 'DESK', position: [0.69, 0.75, 0], rotationY: 0 };
    expect(canPlace(empty(), decor('decor-xadrez'), offDesk, CTX)).toMatchObject({ ok: false, reason: 'FORA_DO_QUARTO' });
  });

  it('zona errada: a cama não vai para a parede', () => {
    const p = wall('decor-quadro', 'BACK', 1.2, 1.5);
    expect(canPlace(empty(), decor('decor-cama'), p, CTX)).toMatchObject({ ok: false, reason: 'ZONA_PROIBIDA' });
  });

  it('colisão com rotação: a cama girada 90° encosta onde a cama reta não encostava', () => {
    let state = empty();
    state = place(state, 'decor-guarda-roupa', floor('decor-guarda-roupa', 1.3, 0.5, 90)).state;
    // Cama reta (2,0 m em Z) à frente do guarda-roupa: livre
    const straight = floor('decor-cama', 1.25, 2.4, 0);
    expect(canPlace(state, decor('decor-cama'), straight, CTX)).toEqual({ ok: true });
    // Girada (2,0 m em X) no mesmo ponto passa para dentro da frente da mesa ou do guarda-roupa
    const turned = floor('decor-cama', 1.0, 1.4, 90);
    expect(canPlace(state, decor('decor-cama'), turned, CTX)).toMatchObject({ ok: false });
    const box = boxAt(decor('decor-cama'), turned.position, 90);
    expect(box.max[0] - box.min[0]).toBeCloseTo(2.0);
  });

  it('móveis não se atravessam, mas o tapete fica por baixo deles', () => {
    let state = place(empty(), 'decor-cama', floor('decor-cama', 1.25, 2.4)).state;
    expect(canPlace(state, decor('decor-puff'), floor('decor-puff', 1.2, 2.4), CTX)).toMatchObject({ ok: false, reason: 'COLISAO', message: expect.stringContaining('Cama') });
    state = place(state, 'decor-tapete-retangular', floor('decor-tapete-retangular', 1.2, 2.4)).state;
    // Tapete sobre tapete colide
    expect(canPlace(state, decor('decor-tapete-redondo'), floor('decor-tapete-redondo', 1.2, 2.4), CTX)).toMatchObject({ ok: false, reason: 'COLISAO' });
  });

  it('não atravessa a mesa, a cadeira nem o gabinete', () => {
    const underDesk = floor('decor-lixeira', 0, 0);
    expect(canPlace(empty(), decor('decor-lixeira'), underDesk, CTX)).toMatchObject({ ok: false, reason: 'COLISAO', message: expect.stringContaining('mesa') });
    // Na mesa compacta, a torre fica no chão ao lado da mesa
    const [tx, , tz] = getSnapPointPosition('PC_TOWER', 1.2);
    const atTower = snapToZone(decor('decor-lixeira'), 'FLOOR', [tx, 0, tz], 0, CTX_COMPACT);
    expect(canPlace(empty(), decor('decor-lixeira'), atTower, CTX_COMPACT)).toMatchObject({ ok: false });
  });

  it('zonas proibidas: porta, caminho da cadeira, frente da mesa e trajeto dos cabos', () => {
    const atDoor = floor('decor-lixeira', -1.7, (DOOR_SWING.min[2] + DOOR_SWING.max[2]) / 2);
    expect(canPlace(empty(), decor('decor-lixeira'), atDoor, CTX)).toMatchObject({ ok: false, reason: 'ZONA_PROIBIDA', message: expect.stringContaining('porta') });
    const [cx, , cz] = getSnapPointPosition('CHAIR', 1.4);
    const behindChair = floor('decor-lixeira', cx, cz + 0.6);
    expect(canPlace(empty(), decor('decor-lixeira'), behindChair, CTX)).toMatchObject({ ok: false, reason: 'ZONA_PROIBIDA', message: expect.stringContaining('cadeira') });
    const deskFront = floor('decor-lixeira', 0.6, 0.5);
    expect(canPlace(empty(), decor('decor-lixeira'), deskFront, CTX)).toMatchObject({ ok: false, reason: 'ZONA_PROIBIDA' });
    const cables = floor('decor-bola-futebol', 0.8, -0.42);
    expect(canPlace(empty(), decor('decor-bola-futebol'), cables, CTX)).toMatchObject({ ok: false, reason: 'ZONA_PROIBIDA', message: 'Esse lugar bloqueia o caminho dos cabos da tomada.' });
    // O tapete pode ficar sob a cadeira
    expect(canPlace(empty(), decor('decor-tapete-retangular'), floor('decor-tapete-retangular', -0.1, 1.1), CTX)).toEqual({ ok: true });
  });

  it('parede: não cobre janela, porta nem tomadas; a persiana só vai na janela', () => {
    const onWindow = wall('decor-quadro', 'LEFT', (WINDOW.u[0] + WINDOW.u[1]) / 2, 1.5);
    expect(canPlace(empty(), decor('decor-quadro'), onWindow, CTX)).toMatchObject({ ok: false, reason: 'ZONA_PROIBIDA', message: expect.stringContaining('janela') });
    const onOutlets = wall('decor-espuma-acustica', 'BACK', 0.45, 0.55);
    expect(canPlace(empty(), decor('decor-espuma-acustica'), onOutlets, CTX)).toMatchObject({ ok: false, reason: 'ZONA_PROIBIDA', message: expect.stringContaining('tomadas') });
    const blind = snapToZone(decor('decor-persiana'), 'WALL', [0, 0, 0], 0, CTX, 'BACK');
    expect(blind.wall).toBe('LEFT');
    expect(canPlace(empty(), decor('decor-persiana'), blind, CTX)).toEqual({ ok: true });
    const blindElsewhere: DecorPlacement = { zone: 'WALL', wall: 'BACK', rotationY: 0, position: wallPosition(decor('decor-persiana'), 'BACK', -1.2, 0.9) };
    expect(canPlace(empty(), decor('decor-persiana'), blindElsewhere, CTX)).toMatchObject({ ok: false, reason: 'ZONA_PROIBIDA' });
  });

  it('mesa: só nas áreas livres, fora do monitor, teclado, mouse e gabinete', () => {
    const suggestions = suggestPlacements(empty(), decor('decor-caneca'), CTX, { limit: 4 });
    expect(suggestions.length).toBeGreaterThan(0);
    suggestions.forEach((s) => expect(s.placement.zone).toBe('DESK'));
    const [mx, my, mz] = getSnapPointPosition('MONITOR_MAIN', 1.4);
    const onMonitor = snapToZone(decor('decor-caneca'), 'DESK', [mx, my, mz], 0, CTX);
    expect(canPlace(empty(), decor('decor-caneca'), onMonitor, CTX)).toMatchObject({ ok: false, reason: 'COLISAO' });
  });

  it('prateleiras: nichos da estante, ocupação e tamanho', () => {
    let state = place(empty(), 'decor-estante-parede', wall('decor-estante-parede', 'BACK', -1.3, 1.65)).state;
    const host = state.items[0];
    expect(shelfSlots(host)).toHaveLength(4);
    const slot0 = shelfPlacement(host, 0)!;
    state = place(state, 'decor-livros', slot0).state;
    expect(canPlace(state, decor('decor-trofeu'), slot0, CTX)).toMatchObject({ ok: false, reason: 'SEM_SLOT', message: expect.stringContaining('ocupado') });
    // O drone tem 30 cm de profundidade; a prateleira de parede, 22 cm
    expect(canPlace(state, decor('decor-drone'), shelfPlacement(host, 1)!, CTX)).toMatchObject({ ok: false, reason: 'SEM_SLOT', message: expect.stringContaining('não cabe') });
    expect(canPlace(state, decor('decor-caneca'), shelfPlacement(host, 1)!, CTX)).toEqual({ ok: true });
    const noHost: DecorPlacement = { zone: 'SHELF', position: [0, 0, 0], rotationY: 0, shelfRef: { instanceId: 'nada#1', slot: 0 } };
    expect(canPlace(state, decor('decor-caneca'), noHost, CTX)).toMatchObject({ ok: false, reason: 'SEM_SLOT' });
  });

  it('mover a estante leva junto o que está nas prateleiras; retirar a estante retira tudo', () => {
    let state = place(empty(), 'decor-estante-parede', wall('decor-estante-parede', 'BACK', -1.3, 1.65)).state;
    const hostId = state.items[0].instanceId;
    state = place(state, 'decor-livros', shelfPlacement(state.items[0], 0)!).state;
    const before = state.items[1].position;
    state = moveDecor(state, hostId, wall('decor-estante-parede', 'BACK', 1.3, 1.65), CTX).state;
    expect(state.items[1].position[0]).toBeCloseTo(before[0] + 2.6);
    state = removeDecor(state, hostId);
    expect(state.items).toEqual([]);
  });

  it('limite por item (maxPerRoom) e limites do quarto (itens, faces e animados por nível)', () => {
    let state = place(empty(), 'decor-ventilador-teto', snapToZone(decor('decor-ventilador-teto'), 'CEILING', [0, 0, 1], 0, CTX)).state;
    expect(canPlace(state, decor('decor-ventilador-teto'), snapToZone(decor('decor-ventilador-teto'), 'CEILING', [-1.2, 0, 2.5], 0, CTX), CTX)).toMatchObject({ ok: false, reason: 'LIMITE_DO_ITEM' });

    // Nível leve: no máximo 12 itens
    const light = { ...CTX, limits: ROOM_LIMITS.LEVE };
    state = empty();
    for (let i = 0; i < 12; i++) state = place(state, 'decor-espuma-acustica', wall('decor-espuma-acustica', 'BACK', -1.7 + (i % 6) * 0.5, 1.2 + Math.floor(i / 6) * 0.6), light).state;
    expect(canPlace(state, decor('decor-relogio-parede'), wall('decor-relogio-parede', 'LEFT', 0.1, 1.5), light)).toMatchObject({ ok: false, reason: 'LIMITE_DO_QUARTO' });

    // Faces: 75 mil no nível leve
    const heavy = { ...CTX, limits: { ...ROOM_LIMITS.LEVE, maxFaces: 20000 } };
    state = place(empty(), 'decor-telescopio', floor('decor-telescopio', 1.5, 1.5), heavy).state;
    expect(canPlace(state, decor('decor-maquina-garra'), floor('decor-maquina-garra', -1.5, 1.8), heavy)).toMatchObject({ ok: false, reason: 'LIMITE_DO_QUARTO', message: expect.stringContaining('faces') });

    // Animados: 4
    state = empty();
    ['decor-jupiter', 'decor-ventilador-teto'].forEach((id, i) => (state = place(state, id, snapToZone(decor(id), 'CEILING', [-1.2 + i * 1.5, 0, 1.5], 0, CTX)).state));
    state = place(state, 'decor-neon-cyberpunk', wall('decor-neon-cyberpunk', 'BACK', -1.6, 1.5)).state;
    state = addDecor(state, 'proc-fita-led', wall('proc-fita-led', 'BACK', 1.2, 1.0), CTX, { variant: 'onda' }).state;
    expect(state.items).toHaveLength(4);
    expect(canPlace(state, decor('decor-robo-fofo'), snapToZone(decor('decor-robo-fofo'), 'DESK', [-0.6, 0.75, -0.2], 0, CTX), CTX, {})).toMatchObject({ ok: false, reason: 'LIMITE_DO_QUARTO', message: expect.stringContaining('animados') });
    // Fita LED na cor fixa do tema não é animada
    expect(canPlace(state, decor('proc-fita-led'), wall('proc-fita-led', 'BACK', 0.5, 2.2), CTX, { variant: 'tema' })).toEqual({ ok: true });
  });

  it('setas movem 10 cm (ou trocam de nicho) e Q/E giram 90°', () => {
    const p = floor('decor-puff', 1.2, 2.0);
    expect(nudgePlacement(empty(), decor('decor-puff'), p, 'RIGHT', CTX).position[0]).toBeCloseTo(1.3);
    expect(nudgePlacement(empty(), decor('decor-puff'), p, 'UP', CTX).position[2]).toBeCloseTo(1.9);
    const w = wall('decor-quadro', 'BACK', 1.2, 1.5);
    expect(nudgePlacement(empty(), decor('decor-quadro'), w, 'UP', CTX).position[1]).toBeCloseTo(w.position[1] + 0.1);
    expect(rotatePlacement(decor('decor-puff'), p, 1, CTX).rotationY).toBe(90);
    expect(rotatePlacement(decor('decor-puff'), p, -1, CTX).rotationY).toBe(270);
    expect(rotatePlacement(decor('decor-quadro'), w, 1, CTX).rotationY).toBe(0);
  });

  it('itens grandes de mesa vão para o aparador quando o tampo está cheio de periféricos', () => {
    const state = createRoomDecor('ROOM_GAMER', CTX);
    expect(suggestPlacements(state, decor('decor-xadrez'), CTX)).toEqual([]);
    const withSideboard = place(state, 'proc-aparador', floor('proc-aparador', -1.3, 1.6, 90)).state;
    const list = suggestPlacements(withSideboard, decor('decor-tv-crt'), CTX);
    expect(list.map((s) => s.placement.zone)).toEqual(['SHELF', 'SHELF']);
  });

  it('pontos destacados para clicar são todos válidos e para cada zona do item', () => {
    const state = createRoomDecor('ROOM_GAMER', CTX);
    ['decor-puff', 'decor-quadro', 'decor-terra', 'decor-trofeu', 'decor-caneca'].forEach((id) => {
      const list = suggestPlacements(state, decor(id), CTX);
      expect(list.length, id).toBeGreaterThan(0);
      list.forEach((s) => {
        expect(canPlace(state, decor(id), s.placement, CTX), id).toEqual({ ok: true });
        expect(s.label.length).toBeGreaterThan(5);
      });
    });
  });
});

describe('Conjunto inicial por tema e estado salvo (#86, #90)', () => {
  const ctxs: [string, RoomContext][] = [
    ['mesa de 140 cm', CTX],
    ['mesa de 120 cm (torre no chão)', CTX_COMPACT],
  ];
  ctxs.forEach(([label, ctx]) => {
    ROOM_THEMES.forEach((theme) => {
      it(`${theme.name}, ${label}: todo item do conjunto inicial cabe`, () => {
        const state = createRoomDecor(theme.id, ctx);
        expect(state.items.map((p) => p.decorId)).toEqual(STARTER_SETS[theme.id].map((s) => s.decorId));
        state.items.forEach((p) => expect(decor(p.decorId).pack).toBe('CLASSICO'));
      });
    });
  });

  it('sanitização: descarta desconhecido, bloqueado, posição inválida e lixo; mantém o resto', () => {
    const good = createRoomDecor('ROOM_LAB', CTX);
    const raw = {
      version: 1,
      theme: 'ROOM_LAB',
      items: [
        ...good.items,
        { instanceId: 'x#1', decorId: 'decor-inexistente', zone: 'FLOOR', position: [0, 0, 2], rotationY: 0 },
        { instanceId: 'f#1', decorId: 'decor-fliperama', zone: 'FLOOR', position: [-1.4, 0, 1.8], rotationY: 0 },
        { instanceId: 'c#1', decorId: 'decor-puff', zone: 'FLOOR', position: [0, 0, 0], rotationY: 0 },
        { instanceId: 'r#1', decorId: 'decor-puff', zone: 'FLOOR', position: [1.3, 0, 2.6], rotationY: 45 },
        'lixo',
        null,
      ],
    };
    const onlyClassic = (id: string) => decor(id).pack === 'CLASSICO';
    const clean = sanitizeRoomDecor(raw, CTX, onlyClassic);
    expect(clean.theme).toBe('ROOM_LAB');
    expect(clean.items.map((p) => p.instanceId)).toEqual(good.items.map((p) => p.instanceId));
    // Desbloqueado, o fliperama volta
    expect(sanitizeRoomDecor(raw, CTX, () => true).items.some((p) => p.decorId === 'decor-fliperama')).toBe(true);
  });

  it('sanitização: estado corrompido vira o conjunto inicial; neon com texto proibido é descartado', () => {
    expect(sanitizeRoomDecor('{', CTX, () => true, 'ROOM_OFFICE').items.length).toBe(STARTER_SETS.ROOM_OFFICE.length);
    expect(sanitizeRoomDecor({ theme: 'ROOM_X', items: [] }, CTX, () => true).theme).toBe('ROOM_GAMER');
    const neon = (text: string) => ({
      instanceId: 'proc-neon-texto#1',
      decorId: 'proc-neon-texto',
      zone: 'WALL',
      wall: 'BACK',
      rotationY: 0,
      position: wallPosition(decor('proc-neon-texto'), 'BACK', 1.2, 1.8),
      variant: 'ciano',
      text,
    });
    expect(sanitizeRoomDecor({ theme: 'ROOM_GAMER', items: [neon('Alfa')] }, CTX, () => true).items).toHaveLength(1);
    expect(sanitizeRoomDecor({ theme: 'ROOM_GAMER', items: [neon('merda')] }, CTX, () => true).items).toHaveLength(0);
  });

  it('item de prateleira volta para o nicho do móvel salvo; sem o móvel, é descartado', () => {
    const state = createRoomDecor('ROOM_GAMER', CTX);
    const books = state.items.find((p) => p.decorId === 'decor-livros')!;
    const moved = { ...state, items: state.items.map((p) => (p === books ? { ...p, position: [9, 9, 9] } : p)) };
    const clean = sanitizeRoomDecor(moved, CTX, () => true);
    expect(clean.items.find((p) => p.decorId === 'decor-livros')?.position).toEqual(books.position);
    const orphan = { ...state, items: state.items.filter((p) => p.decorId !== 'decor-estante-parede') };
    expect(sanitizeRoomDecor(orphan, CTX, () => true).items.some((p) => p.decorId === 'decor-livros')).toBe(false);
  });

  it('item que deixou de caber (aluno trocou a mesa) é descartado sem quebrar', () => {
    const themes: RoomThemeId[] = ['ROOM_GAMER', 'ROOM_OFFICE', 'ROOM_LAB', 'ROOM_VAPORWAVE'];
    themes.forEach((t) => {
      const state = createRoomDecor(t, CTX);
      const clean = sanitizeRoomDecor(state, CTX_COMPACT, () => true);
      clean.items.forEach((p) => expect(canPlace({ items: clean.items.filter((q) => q !== p) }, decor(p.decorId), p, CTX_COMPACT)).toEqual({ ok: true }));
    });
  });

  it('itens planos ficam por baixo; os demais não são planos', () => {
    expect(isFlat(decor('decor-tapete-redondo'))).toBe(true);
    expect(isFlat(decor('decor-puff'))).toBe(false);
  });
});
