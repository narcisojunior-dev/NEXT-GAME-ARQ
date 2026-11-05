import { describe, it, expect } from 'vitest';
import { DECOR_ITEMS } from '../../../engine/roomDecor';
import { Prim, shapeFor } from '../decorShapes';

/** Itens desenhados por componentes próprios (fita LED, hexágonos, neon e pôster) */
const OWN_COMPONENT = new Set(['proc-fita-led', 'proc-hexagonos', 'proc-neon-texto', 'proc-poster']);

/** Meia-extensão aproximada de uma primitiva (ignora rotação: limite folgado) */
function halfExtent(p: Prim): [number, number, number] {
  const [a, b = a, c = a] = p.size;
  switch (p.kind) {
    case 'box':
      return [a / 2, b / 2, c / 2];
    case 'cyl':
      return [Math.max(a, c), b / 2, Math.max(a, c)];
    case 'cone':
      return [a, b / 2, a];
    case 'torus':
      return [a + b, a + b, a + b];
    default:
      return [a, a, a];
  }
}

describe('Versões por código da decoração (usadas até o download dos modelos)', () => {
  const drawn = DECOR_ITEMS.filter((i) => !OWN_COMPONENT.has(i.id));

  it('todo item tem uma receita própria (nenhum cai na caixa genérica)', () => {
    drawn.forEach((item) => {
      const prims = shapeFor(item);
      const generic = prims.length === 1 && prims[0].kind === 'box' && prims[0].color === '#94a3b8';
      expect(generic, item.id).toBe(false);
    });
  });

  it('cada receita cabe na pegada do item (com folga para rotações)', () => {
    drawn.forEach((item) => {
      const { w, d, h } = item.footprint;
      shapeFor(item).forEach((p, i) => {
        const [ex, ey, ez] = halfExtent(p);
        const slack = 0.12;
        expect(Math.abs(p.pos[0]) - ex, `${item.id}[${i}] x`).toBeLessThanOrEqual(w / 2 + slack);
        expect(Math.abs(p.pos[2]) - ez, `${item.id}[${i}] z`).toBeLessThanOrEqual(d / 2 + slack);
        expect(p.pos[1] - ey, `${item.id}[${i}] y`).toBeLessThanOrEqual(h + slack);
      });
    });
  });

  it('peças leves: no máximo 30 primitivas por item', () => {
    drawn.forEach((item) => expect(shapeFor(item).length, item.id).toBeLessThanOrEqual(30));
  });
});
