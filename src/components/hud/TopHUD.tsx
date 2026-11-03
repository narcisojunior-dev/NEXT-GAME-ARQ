'use client';

import React, { useEffect } from 'react';
import { useAssemblyStore, GameMode, selectCurrentPhase } from '@/store/useAssemblyStore';
import { AssemblyPhase } from '@/engine/types';
import { calculateTotalSpent } from '@/engine/compatibility';
import {
  GraduationCap,
  Briefcase,
  Trophy,
  Clock,
  Coins,
  AlertCircle,
  Stethoscope,
  Camera,
  School,
  Cpu,
  Box,
  Monitor,
} from 'lucide-react';
import { hasAvailableModels } from '@/engine/models3dIndex';
import { useModel3DStore } from '@/components/three/model3dStore';

const HAS_3D_MODELS = hasAvailableModels();

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
    elapsedSeconds,
    tickTimer,
    activeMission,
    assembly,
    selectedMotherboard,
    penaltiesCount,
    openVirtualRoomModal,
    openTeacherDashboard,
    activeWorkbenchView,
    setActiveWorkbenchView,
  } = useAssemblyStore();
  const currentPhase = useAssemblyStore(selectCurrentPhase);
  const openGallery = useModel3DStore((s) => s.openGallery);
  const currentPhaseNumber = PHASES.find((p) => p.id === currentPhase)?.number ?? 1;

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

  const totalSpent = calculateTotalSpent(assembly, selectedMotherboard);
  const budgetRemaining = activeMission ? activeMission.budgetMax - totalSpent : null;

  return (
    <header className="w-full bg-slate-950/90 border-b border-slate-800 p-4 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Título e Seletor de Modo */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-lg">
              <Cpu className="w-5 h-5" aria-hidden="true" />
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
        <div className="flex items-center gap-3">
          {/* Botão de Abrir Painel do Professor */}
          <button
            onClick={openTeacherDashboard}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-indigo-700/60 text-indigo-300 text-xs font-bold transition-all cursor-pointer"
            title="Painel do Professor, Leaderboard e Certificados"
          >
            <School className="w-3.5 h-3.5" />
            <span>Professor</span>
          </button>

          {/* Vitrine 3D: aparece quando há modelos baixados (docs/modelos-3d.md) */}
          {HAS_3D_MODELS && (
            <button
              onClick={openGallery}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-700/60 text-cyan-300 text-xs font-bold transition-all cursor-pointer"
              title="Ver peças e periféricos em 3D"
            >
              <Box className="w-3.5 h-3.5" />
              <span>Vitrine 3D</span>
            </button>
          )}

          {/* Botão de Alternância: Bancada vs Mesa Battlestation 3D (Fase 4) */}
          <button
            onClick={() => setActiveWorkbenchView(activeWorkbenchView === 'desk' ? 'bench' : 'desk')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              activeWorkbenchView === 'desk'
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
                : 'bg-slate-900 hover:bg-slate-800 border-purple-700/60 text-purple-300'
            }`}
            title="Alternar para a Mesa Battlestation 3D"
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{activeWorkbenchView === 'desk' ? 'Bancada' : 'Mesa 3D'}</span>
          </button>
          {/* Botão de Abrir Sala Virtual & Setup */}
          <button
            onClick={openVirtualRoomModal}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer active:scale-95"
            title="Ver meu computador na Sala Virtual e exportar foto PNG"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Meu Setup & Sala</span>
          </button>

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
          const isDone = p.number < currentPhaseNumber;
          return (
            <div
              key={p.id}
              aria-current={isActive ? 'step' : undefined}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : isDone
                  ? 'text-emerald-400'
                  : 'text-slate-500'
              }`}
            >
              <span>{isDone ? `✓ ${p.label}` : p.label}</span>
            </div>
          );
        })}
      </div>
    </header>
  );
};

