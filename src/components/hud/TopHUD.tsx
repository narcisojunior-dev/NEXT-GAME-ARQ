'use client';

import React, { useEffect } from 'react';
import { useAssemblyStore, GameMode } from '@/store/useAssemblyStore';
import { AssemblyPhase } from '@/engine/types';
import {
  GraduationCap,
  Briefcase,
  Trophy,
  Clock,
  Coins,
  AlertCircle,
  Stethoscope,
} from 'lucide-react';

const PHASES: { id: AssemblyPhase; label: string; number: number }[] = [
  { id: 'PHASE_1_PREPARATION', label: '1. Bancada & ESD', number: 1 },
  { id: 'PHASE_2_BENCH_ASSEMBLY', label: '2. Pré-Gabinete', number: 2 },
  { id: 'PHASE_3_CASE_PREPARATION', label: '3. Gabinete & Fonte', number: 3 },
  { id: 'PHASE_4_MOTHERBOARD_INSTALL', label: '4. Fixar Placa', number: 4 },
  { id: 'PHASE_5_GPU_EXPANSION', label: '5. Placa de Vídeo', number: 5 },
  { id: 'PHASE_6_CABLING', label: '6. Cabeamento', number: 6 },
  { id: 'PHASE_7_BOOT_POST', label: '7. Teste de Boot', number: 7 },
];

export const TopHUD: React.FC = () => {
  const {
    gameMode,
    setGameMode,
    currentPhase,
    setCurrentPhase,
    elapsedSeconds,
    tickTimer,
    activeMission,
    assembly,
    penaltiesCount,
  } = useAssemblyStore();

  useEffect(() => {
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [tickTimer]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cálculo de Custo Gasto
  let totalSpent = 0;
  if (assembly.cpuInstalled) totalSpent += assembly.cpuInstalled.price;
  if (assembly.coolerInstalled) totalSpent += assembly.coolerInstalled.price;
  if (assembly.ramInstalledSlot2) totalSpent += assembly.ramInstalledSlot2.price;
  if (assembly.ramInstalledSlot4) totalSpent += assembly.ramInstalledSlot4.price;
  if (assembly.storageInstalled) totalSpent += assembly.storageInstalled.price;
  if (assembly.gpuInstalled) totalSpent += assembly.gpuInstalled.price;
  if (assembly.psuInstalled) totalSpent += assembly.psuInstalled.price;

  const budgetRemaining = activeMission ? activeMission.budgetMax - totalSpent : null;

  return (
    <header className="w-full bg-slate-950/90 border-b border-slate-800 p-4 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Título e Seletor de Modo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
              ⚡
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-white tracking-wider uppercase font-mono">
                PC Builder Academy
              </h1>
              <p className="text-[10px] text-slate-400 font-medium">1º Ano do Ensino Médio</p>
            </div>
          </div>

          <div className="flex items-center bg-slate-900 rounded-xl p-1 border border-slate-800">
            <button
              onClick={() => setGameMode('OFICINA')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                gameMode === 'OFICINA'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Oficina</span>
            </button>

            <button
              onClick={() => setGameMode('MISSAO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                gameMode === 'MISSAO'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Missões</span>
            </button>

            <button
              onClick={() => setGameMode('DESAFIO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                gameMode === 'DESAFIO'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Desafio Grupos</span>
            </button>

            <button
              onClick={() => setGameMode('DIAGNOSTICO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                gameMode === 'DIAGNOSTICO'
                  ? 'bg-rose-500 text-slate-950 font-bold shadow-sm shadow-rose-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Diagnóstico</span>
            </button>
          </div>
        </div>

        {/* Métricas: Orçamento e Cronômetro */}
        <div className="flex items-center gap-4">
          {budgetRemaining !== null && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              budgetRemaining >= 0
                ? 'bg-slate-900 border-slate-700 text-emerald-400'
                : 'bg-rose-950 border-rose-500 text-rose-300 animate-pulse'
            }`}>
              <Coins className="w-4 h-4" />
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Orçamento Restante</div>
                <div className="text-xs font-mono font-bold">
                  R$ {budgetRemaining.toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200">
            <Clock className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Tempo</div>
              <div className="text-xs font-mono font-bold">{formatTime(elapsedSeconds)}</div>
            </div>
          </div>

          {penaltiesCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-300 text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>{penaltiesCount} Erros</span>
            </div>
          )}
        </div>
      </div>

      {/* Régua de Fases da Montagem (Breadcrumb Didático) */}
      <div className="max-w-7xl mx-auto mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-1 overflow-x-auto pb-1">
        {PHASES.map((p) => {
          const isActive = currentPhase === p.id;
          return (
            <button
              key={p.id}
              onClick={() => setCurrentPhase(p.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};

