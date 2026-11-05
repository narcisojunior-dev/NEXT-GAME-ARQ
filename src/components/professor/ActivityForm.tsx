'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch, formatBrl } from '@/components/classroom/apiClient';
import { ACTIVITY_KIND_LABELS, CLASSROOM_MISSIONS } from '@/engine/classroom/validation';
import { BUDGET_PROFILES, BudgetProfileId } from '@/engine/budgetChallenge';
import { DIAGNOSTIC_SCENARIOS } from '@/engine/diagnosticCases';
import type { Activity, ActivityKind } from '@/engine/classroom/types';
import { Button, Field, INPUT, Notice } from './ui';

interface Preview {
  feasible: boolean;
  cheapestCost: number | null;
  ceilingCost: number;
  reference: { cost: number; avgFps: number } | null;
}

/** Criação de atividade (#76): missão, desafio, diagnóstico, Modo Orçamento ou oficina livre */
export function ActivityForm({ classroomId, onCreated }: { classroomId: string; onCreated: (a: Activity) => void }) {
  const [kind, setKind] = useState<ActivityKind>('ORCAMENTO');
  const [missionId, setMissionId] = useState(CLASSROOM_MISSIONS[0]?.id ?? '');
  const [scenarioId, setScenarioId] = useState('SORTEADO');
  const [profile, setProfile] = useState<BudgetProfileId>('JOGOS_1080P');
  const [budget, setBudget] = useState(4000);
  const [resolution, setResolution] = useState<'1080p' | '1440p'>('1080p');
  const [targetMinutes, setTargetMinutes] = useState(10);
  const [custom, setCustom] = useState({ minRamGb: 16, minStorageGb: 500, minFps: 60, requireDedicatedGpu: true });
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [timeLimit, setTimeLimit] = useState(0);
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [attemptPolicy, setAttemptPolicy] = useState<'MELHOR' | 'ULTIMO'>('MELHOR');
  const [visibility, setVisibility] = useState<'AO_VIVO' | 'AO_ENCERRAR' | 'SO_PROFESSOR'>('AO_ENCERRAR');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const budgetConfig = {
    budget,
    profile,
    resolution,
    targetTimeSeconds: targetMinutes * 60,
    ...(profile === 'PERSONALIZADO' ? { requirements: { ...custom } } : {}),
  };

  // Prévia de viabilidade (seção 6.3) enquanto o professor ajusta o valor
  useEffect(() => {
    if (kind !== 'ORCAMENTO') return;
    const t = setTimeout(() => {
      void apiFetch<Preview>('/budget/analyze', { body: budgetConfig }).then((r) => setPreview(r.ok ? r.data : null));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recalcula quando os campos do orçamento mudam
  }, [kind, budget, profile, resolution, targetMinutes, custom]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = {
      kind,
      ...(title.trim() ? { title } : {}),
      ...(instructions.trim() ? { instructions } : {}),
      ...(timeLimit > 0 ? { timeLimitSeconds: timeLimit * 60 } : {}),
      maxAttempts,
      attemptPolicy,
      rankingVisibility: visibility,
      ...(kind === 'MISSAO_CAMPANHA' || kind === 'DESAFIO_EQUIPE' ? { missionId } : {}),
      ...(kind === 'DIAGNOSTICO' ? { scenarioId } : {}),
      ...(kind === 'ORCAMENTO' ? { budget: budgetConfig } : {}),
    };
    const r = await apiFetch<{ activity: Activity }>(`/classrooms/${classroomId}/activities`, { body });
    setBusy(false);
    if (!r.ok) {
      setError(r.error.message);
      return;
    }
    onCreated(r.data.activity);
    setTitle('');
    setInstructions('');
  };

  const missions = CLASSROOM_MISSIONS.filter((m) => (kind === 'DESAFIO_EQUIPE' ? m.track === 'DESAFIO' : m.track !== 'DESAFIO'));
  useEffect(() => {
    if (!missions.some((m) => m.id === missionId) && missions[0]) setMissionId(missions[0].id);
  }, [kind, missions, missionId]);

  const blocked = kind === 'ORCAMENTO' && preview !== null && !preview.feasible;
  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4" noValidate aria-label="Nova atividade">
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-slate-200">Tipo de atividade</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(ACTIVITY_KIND_LABELS) as ActivityKind[]).map((k) => (
            <label key={k} className={`flex items-center gap-2 min-h-[44px] px-3 rounded-xl border text-sm cursor-pointer ${kind === k ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-700'}`}>
              <input type="radio" name="activity-kind" checked={kind === k} onChange={() => setKind(k)} className="accent-cyan-500" />
              {ACTIVITY_KIND_LABELS[k]}
            </label>
          ))}
        </div>
      </fieldset>

      {(kind === 'MISSAO_CAMPANHA' || kind === 'DESAFIO_EQUIPE') && (
        <Field label="Missão" hint="Só as missões que a bancada consegue avaliar (as da mesa ficam para depois).">
          {(p) => (
            <select {...p} className={INPUT} value={missionId} onChange={(e) => setMissionId(e.target.value)}>
              {missions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title} — {m.lesson}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      {kind === 'DIAGNOSTICO' && (
        <Field label="Caso de diagnóstico" hint='"Sorteado": cada bancada recebe um caso diferente.'>
          {(p) => (
            <select {...p} className={INPUT} value={scenarioId} onChange={(e) => setScenarioId(e.target.value)}>
              <option value="SORTEADO">Sorteado para cada bancada</option>
              {DIAGNOSTIC_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}

      {kind === 'ORCAMENTO' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cliente (perfil)">
            {(p) => (
              <select {...p} className={INPUT} value={profile} onChange={(e) => setProfile(e.target.value as BudgetProfileId)}>
                {(Object.keys(BUDGET_PROFILES) as BudgetProfileId[]).map((id) => (
                  <option key={id} value={id}>
                    {BUDGET_PROFILES[id].title}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Orçamento (R$)">
            {(p) => <input {...p} type="number" min={500} max={50000} step={100} className={INPUT} value={budget} onChange={(e) => setBudget(Number(e.target.value))} />}
          </Field>
          <Field label="Resolução">
            {(p) => (
              <select {...p} className={INPUT} value={resolution} onChange={(e) => setResolution(e.target.value as '1080p' | '1440p')}>
                <option value="1080p">1080p</option>
                <option value="1440p">1440p</option>
              </select>
            )}
          </Field>
          <Field label="Tempo-alvo (min)" hint="Até ele a velocidade vale pontos cheios.">
            {(p) => <input {...p} type="number" min={2} max={60} className={INPUT} value={targetMinutes} onChange={(e) => setTargetMinutes(Number(e.target.value))} />}
          </Field>
          {profile === 'PERSONALIZADO' && (
            <>
              <Field label="RAM mínima (GB)">
                {(p) => <input {...p} type="number" min={4} max={128} className={INPUT} value={custom.minRamGb} onChange={(e) => setCustom({ ...custom, minRamGb: Number(e.target.value) })} />}
              </Field>
              <Field label="Armazenamento mínimo (GB)">
                {(p) => <input {...p} type="number" min={64} max={8000} className={INPUT} value={custom.minStorageGb} onChange={(e) => setCustom({ ...custom, minStorageGb: Number(e.target.value) })} />}
              </Field>
              <Field label="FPS mínimo">
                {(p) => <input {...p} type="number" min={1} max={360} className={INPUT} value={custom.minFps} onChange={(e) => setCustom({ ...custom, minFps: Number(e.target.value) })} />}
              </Field>
              <label className="flex items-center gap-2 text-sm min-h-[44px]">
                <input type="checkbox" checked={custom.requireDedicatedGpu} onChange={(e) => setCustom({ ...custom, requireDedicatedGpu: e.target.checked })} className="w-5 h-5 accent-cyan-500" />
                Exige placa de vídeo dedicada
              </label>
            </>
          )}
          <div className="sm:col-span-2" role="status" aria-live="polite">
            {preview &&
              (preview.feasible && preview.reference ? (
                <Notice tone="ok">
                  ✅ Melhor PC possível com {formatBrl(budget)}: ~{preview.reference.avgFps} FPS em {resolution} (custa {formatBrl(preview.reference.cost)}).
                  {budget >= preview.ceilingCost && ` ⚠️ Acima de ${formatBrl(preview.ceilingCost)} o orçamento deixa de ser desafio.`}
                </Notice>
              ) : (
                <Notice tone="error">❌ Abaixo do PC mais barato que atende esse cliente{preview.cheapestCost ? ` (${formatBrl(preview.cheapestCost)})` : ''}.</Notice>
              ))}
          </div>
        </div>
      )}

      <details className="rounded-xl border border-slate-800 p-3">
        <summary className="cursor-pointer text-sm font-semibold min-h-[32px]">Mais opções (título, instruções, tempo, tentativas e ranking)</summary>
        <div className="grid gap-3 sm:grid-cols-2 mt-3">
          <Field label="Título (opcional)">{(p) => <input {...p} className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />}</Field>
          <Field label="Tempo limite (min, 0 = sem limite)">
            {(p) => <input {...p} type="number" min={0} max={240} className={INPUT} value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} />}
          </Field>
          <div className="sm:col-span-2">
            <Field label="Instruções para a turma (opcional)" hint="Aparece no banner dos alunos. Até 280 caracteres.">
              {(p) => <textarea {...p} className={`${INPUT} py-2`} rows={2} maxLength={280} value={instructions} onChange={(e) => setInstructions(e.target.value)} />}
            </Field>
          </div>
          <Field label="Tentativas por aluno">
            {(p) => <input {...p} type="number" min={1} max={10} className={INPUT} value={maxAttempts} onChange={(e) => setMaxAttempts(Number(e.target.value))} />}
          </Field>
          <Field label="Conta no ranking">
            {(p) => (
              <select {...p} className={INPUT} value={attemptPolicy} onChange={(e) => setAttemptPolicy(e.target.value as 'MELHOR' | 'ULTIMO')}>
                <option value="MELHOR">O melhor envio</option>
                <option value="ULTIMO">O último envio</option>
              </select>
            )}
          </Field>
          <Field label="Quem vê o ranking">
            {(p) => (
              <select {...p} className={INPUT} value={visibility} onChange={(e) => setVisibility(e.target.value as typeof visibility)}>
                <option value="AO_VIVO">Alunos veem o top 10 ao vivo</option>
                <option value="AO_ENCERRAR">Alunos veem ao encerrar</option>
                <option value="SO_PROFESSOR">Só o professor</option>
              </select>
            )}
          </Field>
        </div>
      </details>

      {error && <Notice tone="error">{error}</Notice>}
      <Button type="submit" disabled={busy || blocked}>
        Criar atividade (rascunho)
      </Button>
    </form>
  );
}
