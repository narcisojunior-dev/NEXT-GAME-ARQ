'use client';

import React, { useDeferredValue, useId, useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { BUDGET_PROFILES, BudgetProfileId, analyzeBudget } from '@/engine/budgetChallenge';

const PROFILES: BudgetProfileId[] = ['ESTUDOS', 'ESCRITORIO', 'JOGOS_1080P', 'JOGOS_1440P', 'CRIADOR'];
const fmt = (v: number) => `R$ ${v.toLocaleString('pt-BR')}`;

function requirementSummary(id: BudgetProfileId): string {
  const r = BUDGET_PROFILES[id].requirements;
  const disk = `${r.storageType === 'NVMe_M2' ? 'NVMe' : 'SSD'} ≥ ${r.minStorageGb >= 1000 ? `${r.minStorageGb / 1000} TB` : `${r.minStorageGb} GB`}`;
  return [
    `RAM ≥ ${r.minRamGb} GB`,
    disk,
    r.minFps ? `≥ ${r.minFps} FPS em ${BUDGET_PROFILES[id].resolution}` : null,
    r.maxCpuTempC ? `CPU ≤ ${r.maxCpuTempC} °C` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Entrada do Desafio de Orçamento sem turma (#70): perfil do cliente, valor e tempo-alvo, com a
 * prévia de analyzeBudget antes de começar (o mesmo cálculo que o professor verá no Modo Professor).
 */
export const BudgetChallengeSetup: React.FC = () => {
  const start = useAssemblyStore((s) => s.startBudgetChallenge);
  const [profile, setProfile] = useState<BudgetProfileId>('JOGOS_1080P');
  const [budget, setBudget] = useState(5000);
  const [minutes, setMinutes] = useState(10);
  const [refused, setRefused] = useState<number | null>(null);
  const budgetId = useId();
  const timeId = useId();

  // A busca leva alguns milissegundos: o valor adiado mantém a digitação fluida
  const deferredBudget = useDeferredValue(budget);
  const deferredProfile = useDeferredValue(profile);
  const analysis = useMemo(
    () => analyzeBudget(deferredBudget, BUDGET_PROFILES[deferredProfile].requirements, BUDGET_PROFILES[deferredProfile].resolution),
    [deferredBudget, deferredProfile]
  );
  const resolution = BUDGET_PROFILES[profile].resolution;

  return (
    <section aria-labelledby="desafio-orcamento" className="rounded-2xl border border-amber-700/50 bg-amber-950/10 p-4 flex flex-col gap-3">
      <h3 id="desafio-orcamento" className="text-sm font-black text-amber-200 flex items-center gap-2">
        <Wallet className="w-4 h-4" aria-hidden />
        Desafio de Orçamento
      </h3>
      <p className="text-xs text-slate-300">
        Monte o PC que o cliente pediu com o dinheiro dele. Gastar tudo não ganha: vale o desempenho por real, sem gargalo.
      </p>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-bold text-slate-200 mb-1">Cliente</legend>
        {PROFILES.map((id) => (
          <label
            key={id}
            className={`flex min-h-[44px] items-start gap-2 rounded-xl border p-2 text-xs cursor-pointer ${
              profile === id ? 'border-amber-400 bg-amber-950/40' : 'border-slate-800 bg-slate-900 hover:border-slate-600'
            }`}
          >
            <input type="radio" name="perfil-orcamento" value={id} checked={profile === id} onChange={() => setProfile(id)} className="mt-0.5 accent-amber-400" />
            <span>
              <span className="font-bold text-white">
                {BUDGET_PROFILES[id].client.avatar} {BUDGET_PROFILES[id].title}
              </span>
              <span className="block text-[11px] text-slate-400">{requirementSummary(id)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="grid grid-cols-2 gap-2">
        <label htmlFor={budgetId} className="flex flex-col gap-1 text-xs font-bold text-slate-200">
          Orçamento (R$)
          <input
            id={budgetId}
            type="number"
            min={500}
            step={100}
            value={budget}
            onChange={(e) => setBudget(Math.max(0, Math.round(Number(e.target.value) || 0)))}
            className="min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-3 font-mono text-white"
          />
        </label>
        <label htmlFor={timeId} className="flex flex-col gap-1 text-xs font-bold text-slate-200">
          Tempo-alvo
          <select id={timeId} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className="min-h-[44px] rounded-xl border border-slate-700 bg-slate-950 px-2 text-white">
            {[5, 10, 15, 20].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </select>
        </label>
      </div>

      <div role="status" className="rounded-xl bg-slate-900 border border-slate-800 p-2 text-xs">
        {!analysis.feasible ? (
          <p className="text-rose-300">
            ❌ Abaixo do PC mais barato que atende esse cliente
            {Number.isFinite(analysis.cheapestCost) ? ` (${fmt(analysis.cheapestCost)})` : ''}.
          </p>
        ) : (
          <>
            <p className="text-emerald-300">
              ✅ Melhor PC possível com {fmt(deferredBudget)}: ~{analysis.reference?.avgFps} FPS em {BUDGET_PROFILES[deferredProfile].resolution}.
            </p>
            {deferredBudget >= analysis.ceilingCost && (
              <p className="text-amber-300 mt-1">
                ⚠️ Acima de {fmt(analysis.ceilingCost)} o orçamento deixa de ser desafio: dá para comprar o melhor de tudo.
              </p>
            )}
          </>
        )}
        {refused !== null && <p className="text-rose-300 mt-1">Não dá para começar: o mínimo para esse cliente é {fmt(refused)}.</p>}
      </div>

      <button
        type="button"
        disabled={!analysis.feasible}
        onClick={() => {
          const result = start({ budget, profile, resolution, targetTimeSeconds: minutes * 60 });
          if (!result.ok) setRefused(result.cheapestCost);
        }}
        className="min-h-[44px] rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-sm font-black cursor-pointer"
      >
        Começar Desafio de Orçamento
      </button>
    </section>
  );
};
