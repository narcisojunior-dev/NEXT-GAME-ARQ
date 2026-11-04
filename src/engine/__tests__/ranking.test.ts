import { describe, it, expect } from 'vitest';
import { Submission, highlightsOf, rankActivity, rankClass, visibleToStudent } from '../ranking';

let seq = 0;
const sub = (participantId: string, o: Partial<Submission> = {}): Submission => ({
  participantId,
  nickname: participantId.toUpperCase(),
  status: 'VALIDO',
  completed: true,
  score: 8000,
  spent: 5000,
  penalties: 0,
  timeSeconds: 500,
  bottleneckPercent: 12,
  submittedAt: `2026-11-04T10:${String(seq++ % 60).padStart(2, '0')}:00Z`,
  ...o,
});

describe('Ranking puro (#69)', () => {
  it('melhor ou último envio por participante, só entre os válidos (professor pode ver sinalizados)', () => {
    const list = [
      sub('ana', { score: 9000, submittedAt: '2026-11-04T10:00:00Z' }),
      sub('ana', { score: 7000, submittedAt: '2026-11-04T10:30:00Z' }),
      sub('bia', { score: 9500, status: 'SINALIZADO' }),
    ];
    const best = rankActivity(list, { mode: 'MISSAO', attemptPolicy: 'MELHOR' });
    expect(best.map((r) => [r.submission.participantId, r.submission.score, r.attempts])).toEqual([['ana', 9000, 2]]);
    const last = rankActivity(list, { mode: 'MISSAO', attemptPolicy: 'ULTIMO' });
    expect(last[0].submission.score).toBe(7000);
    const teacher = rankActivity(list, { mode: 'MISSAO', attemptPolicy: 'MELHOR', includeFlagged: true });
    expect(teacher.map((r) => r.submission.participantId)).toEqual(['bia', 'ana']);
  });

  it('concluídos antes; pontos ↓; desempate do modo; empate exato divide a posição (1º, 1º, 3º)', () => {
    const ranked = rankActivity(
      [
        sub('a', { score: 8000 }),
        sub('b', { score: 8000 }),
        sub('c', { score: 7000 }),
        sub('d', { score: 9900, completed: false }),
        sub('e', { score: 8000, spent: 4000 }),
      ],
      { mode: 'ORCAMENTO', attemptPolicy: 'MELHOR' }
    );
    expect(ranked.map((r) => [r.submission.participantId, r.position])).toEqual([
      ['e', 1],
      ['a', 2],
      ['b', 2],
      ['c', 4],
      ['d', 5],
    ]);
  });

  it('ranking da turma: soma só das atividades encerradas e conta as feitas', () => {
    const a1 = rankActivity([sub('ana', { score: 8000 }), sub('bia', { score: 9000 })], { mode: 'MISSAO', attemptPolicy: 'MELHOR' });
    const a2 = rankActivity([sub('ana', { score: 7000 })], { mode: 'MISSAO', attemptPolicy: 'MELHOR' });
    const open = rankActivity([sub('bia', { score: 9999 })], { mode: 'MISSAO', attemptPolicy: 'MELHOR' });
    const cls = rankClass([
      { activityId: '1', closed: true, entries: a1 },
      { activityId: '2', closed: true, entries: a2 },
      { activityId: '3', closed: false, entries: open },
    ]);
    expect(cls.map((c) => [c.participantId, c.total, c.activitiesDone, c.position])).toEqual([
      ['ana', 15000, 2, 1],
      ['bia', 9000, 1, 2],
    ]);
  });

  it('destaques: pódio, mais rápido, melhor custo-benefício, montagem limpa (vários) e mais equilibrado', () => {
    const ranked = rankActivity(
      [
        sub('a', { score: 9000, timeSeconds: 600, spent: 6000, penalties: 0, bottleneckPercent: 20 }),
        sub('b', { score: 8500, timeSeconds: 300, spent: 4000, penalties: 1, bottleneckPercent: 8 }),
        sub('c', { score: 8000, timeSeconds: 450, spent: 5000, penalties: 0, bottleneckPercent: 15 }),
        sub('d', { score: 7000, timeSeconds: 200, completed: false }),
      ],
      { mode: 'ORCAMENTO', attemptPolicy: 'MELHOR' }
    );
    const h = highlightsOf(ranked, 'ORCAMENTO');
    expect(h.podium.map((r) => r.submission.participantId)).toEqual(['a', 'b', 'c']);
    expect(h.fastest.map((s) => s.participantId)).toEqual(['b']);
    expect(h.bestValue.map((s) => s.participantId)).toEqual(['b']);
    expect(h.cleanBuild.map((s) => s.participantId).sort()).toEqual(['a', 'c']);
    expect(h.mostBalanced.map((s) => s.participantId)).toEqual(['b']);
  });

  it('visibilidade: o aluno vê no máximo o top 10 e a própria posição', () => {
    const many = rankActivity(
      Array.from({ length: 27 }, (_, i) => sub(`p${i}`, { score: 9000 - i * 10 })),
      { mode: 'MISSAO', attemptPolicy: 'MELHOR' }
    );
    const live = visibleToStudent(many, 'p20', 'AO_VIVO', false, 'MISSAO');
    expect(live.top).toHaveLength(10);
    expect(live.own?.position).toBe(21);
    expect(live.participants).toBe(27);
    expect(live.highlights).toBeNull();

    const hidden = visibleToStudent(many, 'p20', 'AO_ENCERRAR', false, 'MISSAO');
    expect(hidden.top).toEqual([]);
    expect(hidden.own?.position).toBe(0);
    expect(hidden.own?.submission.score).toBe(8800);

    const closed = visibleToStudent(many, 'p20', 'AO_ENCERRAR', true, 'MISSAO');
    expect(closed.top).toHaveLength(10);
    expect(closed.highlights).not.toBeNull();

    const teacherOnly = visibleToStudent(many, 'p20', 'SO_PROFESSOR', true, 'MISSAO');
    expect(teacherOnly.top).toEqual([]);
    expect(teacherOnly.own?.position).toBe(21);
  });
});
