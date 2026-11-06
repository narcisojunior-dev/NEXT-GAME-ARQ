'use client';

import React from 'react';
import { ArrowRight, MonitorSmartphone } from 'lucide-react';
import { useAssemblyStore, selectDeskStage } from '@/store/useAssemblyStore';

/**
 * Próximo passo da jornada na bancada: PC aprovado no POST → montar a estação na mesa.
 * Fica fora das missões (lá o próximo passo é entregar ao cliente) e do diagnóstico.
 */
export const NextStepBanner: React.FC = () => {
  const bootSuccess = useAssemblyStore((s) => Boolean(s.postResult?.bootSuccess));
  const view = useAssemblyStore((s) => s.activeWorkbenchView);
  const inMission = useAssemblyStore((s) => Boolean(s.activeCampaignMissionId));
  const gameMode = useAssemblyStore((s) => s.gameMode);
  const biosOpen = useAssemblyStore((s) => s.isBiosOpen);
  const deskRunning = useAssemblyStore((s) => selectDeskStage(s) === 'RUNNING');
  const setView = useAssemblyStore((s) => s.setActiveWorkbenchView);

  if (!bootSuccess || view !== 'bench' || inMission || gameMode === 'DIAGNOSTICO' || biosOpen || deskRunning) return null;

  return (
    <section
      aria-label="Próxima etapa: montar a estação na mesa"
      className="rounded-2xl border border-emerald-500/60 bg-emerald-950/40 p-4 flex flex-wrap items-center justify-between gap-3"
    >
      <div className="flex items-start gap-3 min-w-0">
        <MonitorSmartphone className="w-6 h-6 text-emerald-300 shrink-0 mt-0.5" aria-hidden />
        <div>
          <p role="status" className="text-sm font-black text-emerald-100">
            PC aprovado no POST! Próxima etapa: montar a estação na mesa.
          </p>
          <p className="text-xs text-emerald-200/80 mt-0.5">
            Leve o PC para a Mesa 3D, posicione monitor, teclado, mouse e headset e ligue os cabos externos. Com a estação ligada, você decora o seu quarto.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          setView('desk');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-black flex items-center gap-2 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
      >
        Levar o PC para a Mesa 3D <ArrowRight className="w-4 h-4" aria-hidden />
      </button>
    </section>
  );
};
