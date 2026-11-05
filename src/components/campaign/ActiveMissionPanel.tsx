'use client';

import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CheckCircle2, Circle, Flag, Map, Star } from 'lucide-react';
import { useAssemblyStore, selectMissionSession } from '@/store/useAssemblyStore';
import { evaluateMission } from '@/engine/campaign';
import { findMission } from '@/engine/campaignMissions';

/**
 * Missão ativa: objetivos atualizados ao vivo (atende / não atende), orçamento gasto e
 * o botão de entrega ao cliente (#27). Os objetivos são anunciados a leitores de tela.
 */
export const ActiveMissionPanel: React.FC = () => {
  const { activeId, finish, abandon, openMap } = useAssemblyStore(
    useShallow((s) => ({
      activeId: s.activeCampaignMissionId,
      finish: s.finishCampaignMission,
      abandon: s.abandonCampaignMission,
      openMap: s.openCampaignMap,
    }))
  );
  // A sessão depende do cronômetro: o objeto muda a cada segundo, mas a avaliação é barata
  const session = useAssemblyStore(useShallow(selectMissionSession));
  const mission = activeId ? findMission(activeId) : null;
  const evaluation = useMemo(() => (mission ? evaluateMission(mission, session) : null), [mission, session]);

  if (!mission || !evaluation) return null;
  const done = evaluation.required.filter((r) => r.met).length;

  return (
    <section aria-label={`Missão em andamento: ${mission.title}`} className="rounded-2xl border border-cyan-700/60 bg-slate-950/90 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl" aria-hidden>{mission.client.avatar}</span>
          <div className="min-w-0">
            <p className="text-[11px] font-mono text-cyan-400 uppercase tracking-wider">
              Missão {mission.order} • {mission.lesson}
            </p>
            <h2 className="text-sm font-black text-white truncate">{mission.title}</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mission.budgetMax && (
            <span className={`text-xs font-mono ${evaluation.totalSpent <= mission.budgetMax ? 'text-emerald-300' : 'text-rose-300'}`}>
              Gasto R$ {evaluation.totalSpent.toLocaleString('pt-BR')} / {mission.budgetMax.toLocaleString('pt-BR')}
            </span>
          )}
          <button type="button" onClick={openMap} className="min-h-[40px] px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer">
            <Map className="w-3.5 h-3.5" aria-hidden /> Mapa
          </button>
          <button type="button" onClick={abandon} className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer">
            Abandonar
          </button>
          <button
            type="button"
            onClick={() => finish()}
            className="min-h-[40px] px-4 rounded-xl text-xs font-black flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
          >
            <Flag className="w-3.5 h-3.5" aria-hidden /> Entregar ao cliente
          </button>
        </div>
      </div>

      <div role="status" aria-live="polite" className="mt-3 grid gap-1.5 sm:grid-cols-2">
        <p className="sm:col-span-2 text-[11px] font-mono text-slate-400">
          Objetivos: {done}/{evaluation.required.length} cumpridos
        </p>
        {evaluation.required.map((r, i) => (
          <p key={i} className={`flex items-start gap-1.5 text-xs ${r.met ? 'text-emerald-300' : 'text-slate-300'}`}>
            {r.met ? <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden /> : <Circle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />}
            <span>
              {r.label}
              <span className="sr-only">{r.met ? ': cumprido' : ': pendente'}</span>
            </span>
          </p>
        ))}
        {evaluation.bonus.map((r, i) => (
          <p key={`b${i}`} className={`flex items-start gap-1.5 text-xs ${r.met ? 'text-amber-300' : 'text-slate-500'}`}>
            <Star className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
            <span>
              Bônus: {r.label}
              <span className="sr-only">{r.met ? ': cumprido' : ': pendente'}</span>
            </span>
          </p>
        ))}
      </div>
    </section>
  );
};

export default ActiveMissionPanel;
