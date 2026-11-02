'use client';

import React, { useEffect } from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useShallow } from 'zustand/react/shallow';
import confetti from 'canvas-confetti';
import { Terminal, CheckCircle2, AlertTriangle, XCircle, ArrowRight, RotateCcw } from 'lucide-react';

export const BIOSSimulatorModal: React.FC = () => {
  const {
    isBiosOpen,
    closeBios,
    postResult,
    assembly,
    selectedMotherboard,
    resetAssembly,
    calculateFinalScore,
    openAcademyOS,
  } = useAssemblyStore(
    useShallow((s) => ({
      isBiosOpen: s.isBiosOpen,
      closeBios: s.closeBios,
      postResult: s.postResult,
      assembly: s.assembly,
      selectedMotherboard: s.selectedMotherboard,
      resetAssembly: s.resetAssembly,
      calculateFinalScore: s.calculateFinalScore,
      openAcademyOS: s.openAcademyOS,
    }))
  );

  useEffect(() => {
    if (isBiosOpen && postResult?.bootSuccess) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#10b981', '#f59e0b', '#38bdf8'],
      });
    }
  }, [isBiosOpen, postResult]);

  if (!isBiosOpen || !postResult) return null;

  const isSuccess = postResult.bootSuccess;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-3xl bg-slate-950 border-2 border-slate-700 rounded-3xl p-6 shadow-2xl font-mono text-xs overflow-hidden">
        {/* Cabeçalho do Monitor / BIOS */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2 text-cyan-400">
            <Terminal className="w-5 h-5" />
            <span className="font-bold tracking-widest uppercase">
              ACADEMY UEFI BIOS UTILITY — POWER-ON SELF-TEST (POST)
            </span>
          </div>
          <button
            onClick={closeBios}
            className="text-slate-400 hover:text-white px-2 py-1 rounded-md border border-slate-800 hover:bg-slate-900 cursor-pointer"
          >
            ESC / FECHAR
          </button>
        </div>

        {/* Status Geral */}
        <div className="mb-6">
          {isSuccess ? (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">
                  BOOT BEM-SUCEDIDO! O COMPUTADOR DEU VÍDEO COM SUCESSO! 🎉
                </div>
                <div className="text-xs text-emerald-300/80">
                  Todas as etapas críticas foram respeitadas e os parâmetros elétricos e térmicos estão normais.
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/60 text-rose-200 flex items-center gap-3">
              <XCircle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <div className="text-sm font-bold text-white">
                  FALHA NO DIAGNÓSTICO DO POST!
                </div>
                <div className="text-xs text-rose-300/80">
                  O computador não conseguiu completar a inicialização. Veja as mensagens de erro abaixo:
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Linhas de Diagnóstico da BIOS */}
        <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 space-y-2 text-slate-300 mb-6">
          <div className="text-cyan-400 font-bold border-b border-slate-800 pb-1 mb-2">
            DETECÇÃO DE HARDWARE:
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">PLACA-MÃE:</span>
            <span className="text-white font-bold">{selectedMotherboard ? `${selectedMotherboard.name} (${selectedMotherboard.chipset})` : 'NENHUMA PLACA'}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">PROCESSADOR (CPU):</span>
            <span className={assembly.cpuInstalled ? 'text-white' : 'text-rose-400'}>
              {assembly.cpuInstalled ? `${assembly.cpuInstalled.name} (${assembly.cpuInstalled.cores}C/${assembly.cpuInstalled.threads}T)` : 'NENHUM DETECTADO'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">MEMÓRIA RAM:</span>
            <span className={assembly.ramInstalledSlot2 || assembly.ramInstalledSlot4 ? 'text-white' : 'text-rose-400'}>
              {assembly.ramInstalledSlot2 && assembly.ramInstalledSlot4
                ? `${(assembly.ramInstalledSlot2.capacityGb + assembly.ramInstalledSlot4.capacityGb)} GB ${assembly.ramInstalledSlot2.ramType} [DUAL CHANNEL ATIVO]`
                : assembly.ramInstalledSlot2
                ? `${assembly.ramInstalledSlot2.capacityGb} GB [SINGLE CHANNEL - SLOT 2]`
                : 'NENHUMA MEMÓRIA DETECTADA'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">ARMAZENAMENTO PRIMÁRIO:</span>
            <span className={assembly.storageInstalled ? 'text-white' : 'text-amber-400'}>
              {assembly.storageInstalled ? `${assembly.storageInstalled.name} (${assembly.storageInstalled.capacityGb} GB)` : 'NENHUM DISCO (SEM BOOT)'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-slate-400">ADAPTADOR GRÁFICO (VGA):</span>
            <span className={assembly.gpuInstalled ? 'text-white' : assembly.cpuInstalled?.hasIntegratedGpu ? 'text-slate-300' : 'text-rose-400'}>
              {assembly.gpuInstalled ? `${assembly.gpuInstalled.name} (PCIe 4.0 x16)` : assembly.cpuInstalled?.hasIntegratedGpu ? 'Gráfico Integrado da CPU' : 'SEM VÍDEO DETECTADO'}
            </span>
          </div>

          <div className="flex justify-between pt-2 border-t border-slate-800">
            <span className="text-slate-400">BALANÇO ELÉTRICO:</span>
            <span className="text-emerald-400 font-bold">
              Consumo Estimado: {postResult.totalTdpWatts}W / Capacidade da Fonte: {postResult.psuWatts}W
            </span>
          </div>
        </div>

        {/* Lista de Alertas e Erros */}
        {postResult.issues.length > 0 && (
          <div className="space-y-2 mb-6">
            <div className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">
              Diagnósticos & Avisos Pedagógicos:
            </div>
            {postResult.issues.map((issue, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                  issue.type === 'ERROR'
                    ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                    : issue.type === 'WARNING'
                    ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                    : 'bg-cyan-950/40 border-cyan-800/80 text-cyan-200'
                }`}
              >
                {issue.type === 'ERROR' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold">{issue.title}</div>
                  <div className="opacity-90">{issue.message}</div>
                  {issue.suggestedAction && (
                    <div className="mt-1 text-[11px] font-bold text-amber-300">
                      Como resolver: {issue.suggestedAction}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={() => {
              closeBios();
              resetAssembly();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Desmontar e Tentar Novamente</span>
          </button>

          <div className="flex items-center gap-3">
            {isSuccess && (
              <button
                onClick={openAcademyOS}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-black transition-all shadow-lg shadow-cyan-500/25 cursor-pointer animate-bounce"
              >
                <span>🚀 INICIAR ACADEMY OS (BENCHMARKS)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={closeBios}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-all cursor-pointer"
            >
              <span>Voltar à Bancada</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

