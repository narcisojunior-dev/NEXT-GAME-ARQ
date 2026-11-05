import { describe, it, expect } from 'vitest';
import { CLASS_CODE_ALPHABET, generateClassCode, normalizeClassCode } from '../classroom/classCode';
import {
  CLASSROOM_MISSIONS,
  isClassroomMission,
  validateActivityInput,
  validateDisplayName,
  validateLiveState,
  validatePassword,
  validateSubmissionPayload,
  validateUsername,
} from '../classroom/validation';
import { MIN_BUILD_SECONDS, plausibilityFlags, rebuildAssembly, scoreClassroomSubmission } from '../classroom/submission';
import { ActivityConfig, BUILD_STEP_KEYS, SubmissionBuild, SubmissionMetrics } from '../classroom/types';
import { BUDGET_PROFILES, analyzeBudget, buildAssemblyFromIds } from '../budgetChallenge';
import { findMission } from '../campaignMissions';
import { buildReadyAssembly, READY_MB } from './fixtures/readyPc';
import { AssemblyState, MotherboardComponent } from '../types';

/** Envio a partir de uma montagem do motor (o que o jogo manda) */
function payloadOf(assembly: AssemblyState, mb: MotherboardComponent | null): SubmissionBuild {
  return {
    motherboardId: mb?.id ?? null,
    cpuId: assembly.cpuInstalled?.id ?? null,
    coolerId: assembly.coolerInstalled?.id ?? null,
    ramSlot2Id: assembly.ramInstalledSlot2?.id ?? null,
    ramSlot4Id: assembly.ramInstalledSlot4?.id ?? null,
    storageId: assembly.storageInstalled?.id ?? null,
    caseId: assembly.caseInstalled?.id ?? null,
    psuId: assembly.psuInstalled?.id ?? null,
    gpuId: assembly.gpuInstalled?.id ?? null,
    steps: Object.fromEntries(BUILD_STEP_KEYS.map((k) => [k, assembly[k]])) as SubmissionBuild['steps'],
  };
}

const metrics = (over: Partial<SubmissionMetrics> = {}): SubmissionMetrics => ({ elapsedSeconds: 400, penaltiesCount: 0, errorLog: [], postAttempts: 1, ...over });
const common = { maxAttempts: 3, attemptPolicy: 'MELHOR' as const, rankingVisibility: 'AO_VIVO' as const };

describe('Código da turma (#73)', () => {
  it('6 caracteres do alfabeto sem 0/O/1/I/L', () => {
    expect(CLASS_CODE_ALPHABET).not.toMatch(/[01OIL]/);
    let i = 0;
    const code = generateClassCode((n) => i++ % n);
    expect(code).toHaveLength(6);
    [...code].forEach((c) => expect(CLASS_CODE_ALPHABET).toContain(c));
  });

  it('normaliza o que o aluno digita e recusa letras ambíguas', () => {
    expect(normalizeClassCode(' k7p-2qx ')).toBe('K7P2QX');
    expect(normalizeClassCode('K7P2Q')).toBeNull();
    expect(normalizeClassCode('K0P2QX')).toBeNull();
    expect(normalizeClassCode('KIP2QX')).toBeNull();
  });
});

describe('Validação de entradas (#72–#75)', () => {
  it('usuário e senha do professor', () => {
    expect(validateUsername(' Prof.Ana ')).toEqual({ ok: true, value: 'prof.ana' });
    expect(validateUsername('ab')).toMatchObject({ ok: false, code: 'USUARIO_INVALIDO' });
    expect(validateUsername('ana maria')).toMatchObject({ ok: false });
    expect(validatePassword('1234567')).toMatchObject({ ok: false, code: 'SENHA_CURTA' });
    expect(validatePassword('12345678')).toMatchObject({ ok: true });
  });

  it('apelido do aluno: 2 a 32 caracteres, sem links e sem palavrões', () => {
    expect(validateDisplayName('  Ana   –  Bancada 3 ')).toEqual({ ok: true, value: 'Ana – Bancada 3' });
    expect(validateDisplayName('A')).toMatchObject({ ok: false, code: 'APELIDO_INVALIDO' });
    expect(validateDisplayName('meu.site.com')).toMatchObject({ ok: false });
    expect(validateDisplayName('@ana')).toMatchObject({ ok: false });
    expect(validateDisplayName('Merda')).toMatchObject({ ok: false });
  });

  it('atividade: padrões, missão inexistente, missão da mesa e desafio fora da trilha', () => {
    const draft = validateActivityInput({ kind: 'MISSAO_CAMPANHA', missionId: 'jornada-02' });
    expect(draft).toMatchObject({ ok: true, value: { kind: 'MISSAO_CAMPANHA', maxAttempts: 3, attemptPolicy: 'MELHOR', rankingVisibility: 'AO_ENCERRAR' } });
    expect(validateActivityInput({ kind: 'MISSAO_CAMPANHA', missionId: 'nao-existe' })).toMatchObject({ ok: false, code: 'MISSAO_INVALIDA' });
    expect(validateActivityInput({ kind: 'MISSAO_CAMPANHA', missionId: 'mesa-01' })).toMatchObject({ ok: false, code: 'MISSAO_INVALIDA' });
    expect(validateActivityInput({ kind: 'DESAFIO_EQUIPE', missionId: 'jornada-02' })).toMatchObject({ ok: false });
    expect(validateActivityInput({ kind: 'DESAFIO_EQUIPE', missionId: 'desafio-01' })).toMatchObject({ ok: true });
    expect(validateActivityInput({ kind: 'OFICINA_LIVRE', maxAttempts: 0 })).toMatchObject({ ok: false });
    expect(validateActivityInput({ kind: 'X' })).toMatchObject({ ok: false });
  });

  it('missões da turma: só as que a bancada consegue avaliar', () => {
    expect(CLASSROOM_MISSIONS.length).toBeGreaterThan(10);
    CLASSROOM_MISSIONS.forEach((m) => expect(isClassroomMission(m)).toBe(true));
    expect(CLASSROOM_MISSIONS.some((m) => m.track === 'MESA')).toBe(false);
  });

  it('Modo Orçamento: limites do valor e requisitos do perfil personalizado', () => {
    expect(validateActivityInput({ kind: 'ORCAMENTO', budget: { budget: 4000, profile: 'JOGOS_1080P', resolution: '1080p' } })).toMatchObject({
      ok: true,
      value: { budget: { budget: 4000, targetTimeSeconds: 600 } },
    });
    expect(validateActivityInput({ kind: 'ORCAMENTO', budget: { budget: 100, profile: 'ESTUDOS', resolution: '1080p' } })).toMatchObject({ ok: false });
    expect(validateActivityInput({ kind: 'ORCAMENTO', budget: { budget: 4000, profile: 'PERSONALIZADO', resolution: '1080p' } })).toMatchObject({ ok: false, code: 'REQUISITOS_INVALIDOS' });
    expect(
      validateActivityInput({
        kind: 'ORCAMENTO',
        budget: { budget: 4000, profile: 'PERSONALIZADO', resolution: '1440p', requirements: { minRamGb: 16, minStorageGb: 500, requireDedicatedGpu: true, minFps: 60 } },
      })
    ).toMatchObject({ ok: true });
  });

  it('progresso ao vivo e envio: só números e ids dentro dos limites', () => {
    const now = new Date('2026-11-05T10:00:00Z');
    expect(validateLiveState({ activityId: 'a', phase: 3, percent: 42.4, spent: 1200, penalties: 1 }, now)).toEqual({
      ok: true,
      value: { activityId: 'a', phase: 3, percent: 42, spent: 1200, penalties: 1, updatedAt: now.toISOString() },
    });
    expect(validateLiveState({ activityId: 'a', phase: 3, percent: 150, spent: 0, penalties: 0 }, now)).toMatchObject({ ok: false });
    const build = payloadOf(buildReadyAssembly({ withGpu: true }), READY_MB);
    expect(validateSubmissionPayload({ activityId: 'a', build, metrics: metrics() })).toMatchObject({ ok: true });
    expect(validateSubmissionPayload({ activityId: 'a', build, metrics: { ...metrics(), elapsedSeconds: -1 } })).toMatchObject({ ok: false });
    expect(validateSubmissionPayload({ activityId: 'a', build: { ...build, cpuId: 42 }, metrics: metrics() })).toMatchObject({ ok: false });
  });
});

describe('Envio: reconstrução pelo catálogo e pontuação oficial (#75)', () => {
  const ready = buildReadyAssembly({ withGpu: true });

  it('reconstrói a mesma montagem a partir dos ids (preço e desempenho vêm do catálogo)', () => {
    const r = rebuildAssembly(payloadOf(ready, READY_MB));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.assembly.cpuInstalled).toEqual(ready.cpuInstalled);
    expect(r.value.assembly.gpuInstalled).toEqual(ready.gpuInstalled);
    expect(r.value.motherboard?.id).toBe(READY_MB.id);
  });

  it('recusa peça desconhecida, peça na categoria errada e montagem impossível', () => {
    const base = payloadOf(ready, READY_MB);
    expect(rebuildAssembly({ ...base, gpuId: 'gpu-falsa-9999' })).toMatchObject({ ok: false, code: 'PECA_DESCONHECIDA' });
    expect(rebuildAssembly({ ...base, gpuId: base.cpuId })).toMatchObject({ ok: false, code: 'PECA_INVALIDA' });
    expect(rebuildAssembly({ ...base, cpuId: 'cpu-r5-5600' })).toMatchObject({ ok: false, code: 'MONTAGEM_IMPOSSIVEL' });
    expect(rebuildAssembly({ ...base, motherboardId: null })).toMatchObject({ ok: false, code: 'MONTAGEM_IMPOSSIVEL' });
  });

  it('plausibilidade: tempo maior que a janela do servidor e montagem rápida demais', () => {
    expect(plausibilityFlags(metrics({ elapsedSeconds: 400 }), { serverWindowSeconds: 600, buildBoots: true })).toEqual([]);
    expect(plausibilityFlags(metrics({ elapsedSeconds: 900 }), { serverWindowSeconds: 600, buildBoots: true })).toEqual(['TEMPO_INCOERENTE']);
    expect(plausibilityFlags(metrics({ elapsedSeconds: MIN_BUILD_SECONDS - 1 }), { serverWindowSeconds: 600, buildBoots: true })).toEqual(['TEMPO_IMPOSSIVEL']);
    expect(plausibilityFlags(metrics({ elapsedSeconds: 10 }), { serverWindowSeconds: 600, buildBoots: false })).toEqual([]);
  });

  it('Modo Orçamento: a referência montada no tempo-alvo e sem penalidades vale 10.000', () => {
    const profile = BUDGET_PROFILES.JOGOS_1080P;
    const analysis = analyzeBudget(5000, profile.requirements, profile.resolution);
    const ref = analysis.reference!;
    const config: ActivityConfig = {
      kind: 'ORCAMENTO',
      budget: { budget: 5000, profile: 'JOGOS_1080P', resolution: '1080p', targetTimeSeconds: 600, reference: ref, cheapestCost: analysis.cheapestCost, ceilingCost: analysis.ceilingCost },
      ...common,
    };
    const { assembly, motherboard } = buildAssemblyFromIds(ref.build);
    const build = payloadOf(assembly, motherboard);
    const rebuilt = rebuildAssembly(build);
    expect(rebuilt.ok).toBe(true);
    if (!rebuilt.ok) return;
    const result = scoreClassroomSubmission(config, rebuilt.value, build, metrics({ elapsedSeconds: 500 }));
    expect(result).toMatchObject({ ok: true, value: { buildBoots: true, score: { total: 10000, completed: true, totalSpent: ref.cost } } });
  });

  it('missão da campanha: concluída com estrelas; montagem incompleta não conclui', () => {
    const mission = findMission('jornada-02')!;
    const config: ActivityConfig = { kind: 'MISSAO_CAMPANHA', missionId: mission.id, ...common };
    const empty = rebuildAssembly(payloadOf(buildReadyAssembly({ withGpu: false }), null));
    expect(empty.ok).toBe(false);
    const build = payloadOf(ready, READY_MB);
    const rebuilt = rebuildAssembly(build);
    if (!rebuilt.ok) throw new Error('montagem pronta deveria reconstruir');
    const result = scoreClassroomSubmission(config, rebuilt.value, build, metrics());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.score.total).toBeGreaterThan(0);
    expect(result.value.score.total).toBeLessThanOrEqual(10000);
    expect(result.value.score.parts.map((p) => p.key)).toEqual(['precisao', 'orcamento', 'desempenho', 'velocidade']);
  });

  it('diagnóstico sorteado: precisa dizer o caso; oficina livre não tem envio', () => {
    const build = payloadOf(ready, READY_MB);
    const rebuilt = rebuildAssembly(build);
    if (!rebuilt.ok) throw new Error('montagem pronta deveria reconstruir');
    expect(scoreClassroomSubmission({ kind: 'DIAGNOSTICO', scenarioId: 'SORTEADO', ...common }, rebuilt.value, build, metrics())).toMatchObject({ ok: false, code: 'CASO_INVALIDO' });
    // O aluno ligou a chave da fonte: o caso "Não dá sinal de vida" está resolvido
    const switched = { ...build, steps: { ...build.steps, psuSwitchOn: true }, scenarioId: 'case-psu-switch' };
    const rebuiltOn = rebuildAssembly(switched);
    if (!rebuiltOn.ok) throw new Error('montagem pronta deveria reconstruir');
    const resolved = scoreClassroomSubmission({ kind: 'DIAGNOSTICO', scenarioId: 'SORTEADO', ...common }, rebuiltOn.value, switched, metrics());
    expect(resolved).toMatchObject({ ok: true, value: { score: { completed: true, stars: 3 } } });
    expect(scoreClassroomSubmission({ kind: 'OFICINA_LIVRE', ...common }, rebuilt.value, build, metrics())).toMatchObject({ ok: false, code: 'ATIVIDADE_SEM_RANKING' });
  });
});
