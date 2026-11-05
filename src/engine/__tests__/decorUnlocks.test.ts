import { describe, it, expect } from 'vitest';
import { UnlockProgress, UnlockRule, describeUnlock, isUnlocked, showcaseTrophies, unlockProgress, FINAL_MISSION_ID } from '../decorUnlocks';
import { DECOR_ITEMS, findDecorItem } from '../roomDecor';
import { MissionResult, PROGRESS_VERSION, createEmptyProgress, sanitizeProgress } from '../progress';
import { missionsOfTrack } from '../campaignMissions';

const result = (stars: 1 | 2 | 3, answerCorrect?: boolean): MissionResult => ({
  stars,
  bestTimeSeconds: 100,
  completedAt: '2026-11-04T10:00:00.000Z',
  ...(answerCorrect === undefined ? {} : { answerCorrect }),
});

const emptyProgress = (): UnlockProgress => createEmptyProgress();
const withMissions = (ids: string[], stars: 1 | 2 | 3 = 3, answerCorrect?: boolean): UnlockProgress => ({
  ...emptyProgress(),
  missionResults: Object.fromEntries(ids.map((id) => [id, result(stars, answerCorrect)])),
});

const JORNADA = missionsOfTrack('JORNADA').map((m) => m.id);
const DIAG = missionsOfTrack('DIAGNOSTICO');

/** [regra, progresso parcial, progresso completo] */
const CASES: [string, UnlockRule, UnlockProgress, UnlockProgress][] = [
  ['DESK_RUNNING', { kind: 'DESK_RUNNING' }, emptyProgress(), { ...emptyProgress(), deskRunningAt: '2026-11-04T10:00:00.000Z' }],
  ['MISSIONS_COMPLETED', { kind: 'MISSIONS_COMPLETED', count: 3 }, withMissions(JORNADA.slice(0, 2)), withMissions(JORNADA.slice(0, 3))],
  ['THREE_STARS', { kind: 'THREE_STARS', count: 2 }, withMissions(JORNADA.slice(0, 2), 2), withMissions(JORNADA.slice(0, 2), 3)],
  ['TRACK_COMPLETED', { kind: 'TRACK_COMPLETED', track: 'MESA' }, withMissions(missionsOfTrack('MESA').slice(1).map((m) => m.id)), withMissions(missionsOfTrack('MESA').map((m) => m.id))],
  ['DIAGNOSTICS_RESOLVED', { kind: 'DIAGNOSTICS_RESOLVED', count: 3 }, { ...emptyProgress(), diagnosticsResolved: ['case-psu-switch', 'case-ram-dram-led'] }, { ...withMissions([DIAG[3].id]), diagnosticsResolved: ['case-psu-switch', 'case-ram-dram-led'] }],
  ['CORRECT_ANSWERS', { kind: 'CORRECT_ANSWERS', count: 3 }, withMissions(JORNADA.slice(0, 3), 3, false), withMissions(JORNADA.slice(0, 3), 1, true)],
  ['POST_FIRST_TRY', { kind: 'POST_FIRST_TRY', count: 3 }, { ...emptyProgress(), postFirstTryCount: 2 }, { ...emptyProgress(), postFirstTryCount: 3 }],
  ['BUDGET_CHALLENGE_DONE', { kind: 'BUDGET_CHALLENGE_DONE' }, withMissions(JORNADA.slice(0, 5)), withMissions(['orcamento-JOGOS_1080P-5000'])],
  ['CAMPAIGN_COMPLETED', { kind: 'CAMPAIGN_COMPLETED' }, withMissions(JORNADA.slice(0, 12)), withMissions([FINAL_MISSION_ID])],
  [
    'ALL',
    { kind: 'ALL', rules: [{ kind: 'BUDGET_CHALLENGE_DONE' }, { kind: 'POST_FIRST_TRY', count: 1 }] },
    withMissions(['orcamento-ESTUDOS-2000']),
    { ...withMissions(['orcamento-ESTUDOS-2000']), postFirstTryCount: 1 },
  ],
];

describe('Regras de desbloqueio da decoração (#85)', () => {
  CASES.forEach(([name, rule, partial, complete]) => {
    it(`${name}: bloqueado vazio e parcial, liberado completo`, () => {
      expect(isUnlocked(rule, emptyProgress())).toBe(false);
      expect(isUnlocked(rule, partial)).toBe(false);
      expect(isUnlocked(rule, complete)).toBe(true);
      const p = unlockProgress(rule, partial);
      expect(p.current).toBeLessThan(p.target);
      expect(describeUnlock(rule).length).toBeGreaterThan(10);
    });
  });

  it('progresso legível para o card bloqueado ("Resolva 3 casos", 2/3)', () => {
    const rule: UnlockRule = { kind: 'DIAGNOSTICS_RESOLVED', count: 3 };
    expect(describeUnlock(rule)).toBe('Resolva 3 casos no modo diagnóstico');
    expect(unlockProgress(rule, { ...emptyProgress(), diagnosticsResolved: ['a', 'b'] })).toEqual({ current: 2, target: 3 });
    expect(describeUnlock({ kind: 'TRACK_COMPLETED', track: 'DESAFIO' })).toBe('Conclua a trilha "Desafio em Grupos"');
    expect(describeUnlock({ kind: 'POST_FIRST_TRY', count: 1 })).toBe('Passe no POST de primeira 1 vez');
  });

  it('diagnóstico da campanha e do modo livre não contam duas vezes o mesmo caso', () => {
    const scenarioId = DIAG[0].setup.diagnosticScenarioId!;
    const p = { ...withMissions([DIAG[0].id]), diagnosticsResolved: [scenarioId] };
    expect(unlockProgress({ kind: 'DIAGNOSTICS_RESOLVED', count: 5 }, p).current).toBe(1);
  });

  it('o Desafio de Orçamento não conta como missão da campanha', () => {
    expect(unlockProgress({ kind: 'MISSIONS_COMPLETED', count: 1 }, withMissions(['orcamento-ESTUDOS-2000'])).current).toBe(0);
  });

  it('o modo professor "liberar todas as missões" libera toda a decoração', () => {
    const teacher = { ...emptyProgress(), teacherUnlockAll: true };
    DECOR_ITEMS.forEach((item) => expect(isUnlocked(item.unlock, teacher), item.id).toBe(true));
  });

  it('pacote Clássico libera quando o PC liga na mesa; o resto continua bloqueado', () => {
    const p = { ...emptyProgress(), deskRunningAt: '2026-11-04T10:00:00.000Z' };
    DECOR_ITEMS.forEach((item) => expect(isUnlocked(item.unlock, p), item.id).toBe(item.pack === 'CLASSICO'));
  });

  it('regras da especificação: fliperama no Desafio, VR na Mesa, Raspberry no Orçamento, Museu na campanha', () => {
    expect(findDecorItem('decor-fliperama')?.unlock).toEqual({ kind: 'TRACK_COMPLETED', track: 'DESAFIO' });
    expect(findDecorItem('decor-oculos-vr')?.unlock).toEqual({ kind: 'TRACK_COMPLETED', track: 'MESA' });
    expect(findDecorItem('decor-arcade-stick')?.unlock).toEqual({ kind: 'POST_FIRST_TRY', count: 3 });
    expect(findDecorItem('decor-microscopio')?.unlock).toEqual({ kind: 'DIAGNOSTICS_RESOLVED', count: 3 });
    expect(findDecorItem('decor-telescopio')?.unlock).toEqual({ kind: 'CORRECT_ANSWERS', count: 8 });
    expect(findDecorItem('decor-raspberry-pi')?.unlock).toEqual({ kind: 'BUDGET_CHALLENGE_DONE' });
    expect(findDecorItem('decor-trofeu')?.unlock).toEqual({ kind: 'THREE_STARS', count: 1 });
    DECOR_ITEMS.filter((i) => i.pack === 'MUSEU').forEach((i) => expect(i.unlock).toEqual({ kind: 'CAMPAIGN_COMPLETED' }));
  });

  it('vitrine: um troféu por missão com 3 estrelas, na ordem da campanha', () => {
    const p = { missionResults: { [JORNADA[2]]: result(3), [JORNADA[0]]: result(3), [JORNADA[1]]: result(2), 'orcamento-X-1': result(3) } };
    expect(showcaseTrophies(p).map((t) => t.missionId)).toEqual([JORNADA[0], JORNADA[2]]);
  });
});

describe('Progresso v2: conquistas da decoração (#85)', () => {
  it('migra a v1 sem os campos novos', () => {
    const v1 = { version: 1, missionResults: {}, teamRecords: {}, leaderboard: [], soundMuted: false, teacherUnlockAll: false, qualityPreference: 'AUTO' };
    const clean = sanitizeProgress(v1);
    expect(clean.version).toBe(PROGRESS_VERSION);
    expect(clean).toMatchObject({ deskRunningAt: null, postFirstTryCount: 0, diagnosticsResolved: [] });
  });

  it('descarta valores corrompidos e repetidos', () => {
    const clean = sanitizeProgress({ deskRunningAt: 42, postFirstTryCount: -3, diagnosticsResolved: ['a', 'a', 7, 'b'] });
    expect(clean).toMatchObject({ deskRunningAt: null, postFirstTryCount: 0, diagnosticsResolved: ['a', 'b'] });
    expect(sanitizeProgress({ deskRunningAt: '2026-11-04T10:00:00.000Z', postFirstTryCount: 2.7 })).toMatchObject({ deskRunningAt: '2026-11-04T10:00:00.000Z', postFirstTryCount: 2 });
  });
});
