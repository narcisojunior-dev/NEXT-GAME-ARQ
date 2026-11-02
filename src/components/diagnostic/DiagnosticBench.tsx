'use client';

import React, { useState } from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useShallow } from 'zustand/react/shallow';
import { DIAGNOSTIC_SCENARIOS, DiagnosticScenario } from '@/engine/diagnosticCases';
import {
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  ChevronRight,
  ShieldAlert,
  Award,
  Sparkles,
} from 'lucide-react';

export const DiagnosticBench: React.FC = () => {
  const {
    gameMode,
    activeDiagnosticScenario,
    selectDiagnosticScenario,
    resolvedScenarioIds,
  } = useAssemblyStore(
    useShallow((s) => ({
      gameMode: s.gameMode,
      activeDiagnosticScenario: s.activeDiagnosticScenario,
      selectDiagnosticScenario: s.selectDiagnosticScenario,
      resolvedScenarioIds: s.resolvedScenarioIds,
    }))
  );

  const [showHint, setShowHint] = useState(false);

  if (gameMode !== 'DIAGNOSTICO') return null;

  const current = activeDiagnosticScenario || DIAGNOSTIC_SCENARIOS[0];
  const isCurrentResolved = resolvedScenarioIds.includes(current.id);

  const currentIndex = DIAGNOSTIC_SCENARIOS.findIndex((s) => s.id === current.id);
  const nextScenario = DIAGNOSTIC_SCENARIOS[currentIndex + 1] || null;

  const handleNext = () => {
    if (nextScenario) {
      setShowHint(false);
      selectDiagnosticScenario(nextScenario.id);
    }
  };

  const handleReset = () => {
    selectDiagnosticScenario(current.id);
  };

  return (
    <div className="w-full bg-slate-900 border-2 border-rose-900/60 rounded-3xl p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute -right-12 -top-12 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Cabeçalho do Modo Diagnóstico */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 mb-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold shadow-md">
            <Stethoscope className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800/60">
                Assistência Técnica de Hardware
              </span>
              <span className="text-xs text-slate-400">
                {resolvedScenarioIds.length}/{DIAGNOSTIC_SCENARIOS.length} Casos Resolvidos
              </span>
            </div>
            <h2 className="text-lg font-black text-white mt-0.5">
              Laboratório de Diagnóstico: &quot;O Que Está Quebrado?&quot;
            </h2>
          </div>
        </div>

        {/* Botão de Próximo / Reiniciar Caso */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            title="Reiniciar o estado defeituoso original"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reiniciar Caso</span>
          </button>

          {isCurrentResolved && nextScenario && (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/30 transition-all cursor-pointer animate-bounce"
            >
              <span>Próximo Chamado</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Carrossel / Grade de Casos Disponíveis */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-thin scrollbar-thumb-slate-800">
        {DIAGNOSTIC_SCENARIOS.map((scenario, index) => {
          const isResolved = resolvedScenarioIds.includes(scenario.id);
          const isSelected = scenario.id === current.id;

          return (
            <button
              key={scenario.id}
              onClick={() => {
                setShowHint(false);
                selectDiagnosticScenario(scenario.id);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-rose-950/80 border-rose-500 text-white shadow-lg shadow-rose-950 ring-2 ring-rose-500/30'
                  : isResolved
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300 hover:bg-emerald-900/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
            >
              <span>{scenario.clientAvatar}</span>
              <span>Caso #{index + 1}</span>
              {isResolved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          );
        })}
      </div>

      {/* Cartão de Dossiê do Chamado do Cliente */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna 1 e 2: História do Cliente e Sintomas */}
        <div className="md:col-span-2 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{current.clientAvatar}</span>
                <div>
                  <h3 className="text-sm font-bold text-white">{current.clientName}</h3>
                  <p className="text-[11px] text-slate-400">{current.clientRole}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                  current.difficulty === 'FÁCIL'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : current.difficulty === 'MÉDIO'
                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}>
                  Dificuldade: {current.difficulty}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-yellow-950/80 text-yellow-300 border border-yellow-800/60 flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  +{current.rewardPoints} XP
                </span>
              </div>
            </div>

            {/* Relato em Citação */}
            <blockquote className="p-3 rounded-xl bg-slate-900 border-l-4 border-rose-500 text-xs italic text-slate-300 leading-relaxed">
              &quot;{current.clientStory}&quot;
            </blockquote>

            {/* Sintoma Técnico e Inspeção */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>Sintoma Observado</span>
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  {current.symptomSummary}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-rose-400" />
                  <span>Leitura do Multímetro / Telemetria</span>
                </div>
                <div className="text-xs font-mono text-rose-300/90">
                  {current.symptomTechnical}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Coluna 3: Status da Resolução e Dica Pedagógica */}
        <div className="flex flex-col justify-between p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2">
              Status do Diagnóstico
            </div>

            {isCurrentResolved ? (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>DEFEITO ELIMINADO!</span>
                </div>
                <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                  {current.defectExplanation}
                </p>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-700/50 text-rose-200 space-y-1">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 animate-bounce" />
                  <span>Falha Ativa na Bancada</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Inspecione a bancada abaixo, descubra o defeito e execute a manutenção técnica correta.
                </p>
              </div>
            )}
          </div>

          {/* Dica Pedagógica Retrátil */}
          <div className="pt-3 border-t border-slate-800/80 mt-4">
            {showHint ? (
              <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-600/50 text-amber-200 text-xs leading-relaxed animate-in fade-in">
                <div className="font-bold flex items-center gap-1.5 text-amber-400 mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Dica do Professor Byte:</span>
                </div>
                {current.solutionHint}
              </div>
            ) : (
              <button
                onClick={() => setShowHint(true)}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 transition-colors cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Pedir Dica Pedagógica</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

