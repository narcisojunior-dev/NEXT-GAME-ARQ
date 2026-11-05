'use client';

import React, { useState } from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useShallow } from 'zustand/react/shallow';
import { buildAssemblyChecklist } from '@/engine/assemblyChecklist';
import {
  CheckCircle2,
  Circle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Layers,
  ThermometerSnowflake,
  Zap,
  Power,
} from 'lucide-react';

export const AssemblyChecklist: React.FC = () => {
  const {
    assembly,
    selectedMotherboard,
    selectedComponentForPlacement,
    cableConnections,
    postResult,
  } = useAssemblyStore(
    useShallow((s) => ({
      assembly: s.assembly,
      selectedMotherboard: s.selectedMotherboard,
      selectedComponentForPlacement: s.selectedComponentForPlacement,
      cableConnections: s.cableConnections,
      postResult: s.postResult,
    }))
  );
  const [isOpen, setIsOpen] = useState(true);
  // Prova final da campanha: checklist desligado
  const hideHelpers = useAssemblyStore((s) => s.campaignHideHelpers);

  // Etapas e status vêm do motor: as mesmas regras que liberam o PC para a mesa (derivePhase)
  const steps = buildAssemblyChecklist(assembly, selectedMotherboard, {
    cableConnections,
    bootSuccess: Boolean(postResult?.bootSuccess),
  });

  const completedCount = steps.filter((s) => s.isDone).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  // Determinar o próximo passo que falta fazer
  const nextStep = steps.find((s) => !s.isDone) || steps[steps.length - 1];

  if (hideHelpers) return null;

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl backdrop-blur-md mb-6">
      {/* Banner Principal com Próximo Passo */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-bold">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider font-bold text-cyan-400">
              Objetivo Atual da Bancada
            </div>
            <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
              <span>👉 {nextStep.title}</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {nextStep.desc}
            </div>
          </div>
        </div>

        {/* Barra de Progresso e Botão de Expandir */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <div className="text-[11px] uppercase font-bold text-slate-400">Progresso</div>
              <div className="text-xs font-mono font-bold text-cyan-400">{progressPercent}% Concluído</div>
            </div>
            <div className="w-24 h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>Checklist</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Lista Recolhível de Passos com Checkboxes */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                step.isDone
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : step.id === nextStep.id
                  ? 'bg-cyan-950/60 border-cyan-400/80 text-cyan-100 ring-2 ring-cyan-400/20 animate-pulse'
                  : 'bg-slate-950/50 border-slate-800/80 text-slate-400'
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold mb-1">
                {step.isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                )}
                <span className="line-clamp-1">{step.title}</span>
              </div>
              <div className="text-[11px] opacity-80 line-clamp-1 leading-normal">
                {step.desc}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

