'use client';

import React, { useState, useEffect } from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { calculateBenchmark, BenchmarkResult } from '@/engine/benchmark';
import { soundEngine } from '@/engine/audio/soundEngine';
import {
  Monitor,
  Activity,
  Cpu,
  Tv,
  Zap,
  Gauge,
  Thermometer,
  Layers,
  X,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Sparkles,
  Info,
} from 'lucide-react';

export const AcademyOSDesktop: React.FC = () => {
  const {
    isAcademyOSOpen,
    closeAcademyOS,
    assembly,
    selectedMotherboard,
  } = useAssemblyStore();

  const [activeTab, setActiveTab] = useState<'BENCHMARK' | 'SENSORS' | 'SPECS'>('BENCHMARK');
  const [resolution, setResolution] = useState<'1080p' | '1440p' | '4K'>('1080p');
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testProgress, setTestProgress] = useState(0);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);

  // Calcula resultado padrão inicial
  useEffect(() => {
    if (isAcademyOSOpen) {
      const res = calculateBenchmark(assembly, selectedMotherboard, resolution);
      setBenchmarkResult(res);
      setTestProgress(100);
    }
  }, [isAcademyOSOpen, resolution, assembly, selectedMotherboard]);

  const handleStartBenchmark = () => {
    setIsRunningTest(true);
    setTestProgress(0);
    soundEngine.playFanSpinUp();

    let current = 0;
    const interval = setInterval(() => {
      current += 5;
      setTestProgress(current);

      if (current >= 100) {
        clearInterval(interval);
        setIsRunningTest(false);
        soundEngine.playSuccessChime();
        const res = calculateBenchmark(assembly, selectedMotherboard, resolution);
        setBenchmarkResult(res);
      }
    }, 150);
  };

  if (!isAcademyOSOpen) return null;

  const res = benchmarkResult || calculateBenchmark(assembly, selectedMotherboard, resolution);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 select-none">
      <div className="relative w-full max-w-5xl h-[92vh] max-h-[820px] bg-slate-950 border-2 border-cyan-500/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden font-sans">
        {/* Barra Superior do Sistema Operacional (OS Taskbar) */}
        <header className="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 font-bold text-xs">
              ⚡
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white font-mono tracking-wider">
                AcademyOS
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                v2.4 LTS Desktop
              </span>
            </div>
          </div>

          {/* Abas dos Aplicativos do OS */}
          <div className="hidden sm:flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('BENCHMARK')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'BENCHMARK'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Gauge className="w-3.5 h-3.5" />
              <span>CyberRacer Benchmark</span>
            </button>

            <button
              onClick={() => setActiveTab('SENSORS')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'SENSORS'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Telemetria & Gargalo</span>
            </button>

            <button
              onClick={() => setActiveTab('SPECS')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'SPECS'
                  ? 'bg-cyan-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Especificações</span>
            </button>
          </div>

          {/* Botão de Fechar / Desligar OS */}
          <div className="flex items-center gap-2">
            <button
              onClick={closeAcademyOS}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Encerrar OS</span>
            </button>
          </div>
        </header>

        {/* Corpo da Janela Ativa do Sistema Operacional */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-radial from-slate-900 via-slate-950 to-slate-950">
          {activeTab === 'BENCHMARK' && (
            <div className="space-y-6">
              {/* Painel de Controle de Resolução e Botão de Ação */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-300">Resolução do Teste:</span>
                  {(['1080p', '1440p', '4K'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setResolution(r)}
                      disabled={isRunningTest}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                        resolution === r
                          ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {r} {r === '1080p' ? '(Full HD)' : r === '1440p' ? '(Quad HD)' : '(Ultra HD)'}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleStartBenchmark}
                  disabled={isRunningTest}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isRunningTest ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Executando Teste ({testProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>INICIAR BENCHMARK (5s)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Barra de Progresso quando o teste estiver rodando */}
              {isRunningTest && (
                <div className="w-full bg-slate-950 rounded-full h-3 border border-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-150"
                    style={{ width: `${testProgress}%` }}
                  />
                </div>
              )}

              {/* Grid de Resultados de Performance */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Cartão de FPS Médio */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Taxa Média de Quadros
                  </div>
                  <div className="my-2">
                    <span className="text-4xl font-black text-emerald-400 font-mono">
                      {res.avgFps}
                    </span>
                    <span className="text-xs text-slate-400 font-bold ml-1">FPS</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {res.avgFps >= 120
                      ? 'Desempenho Competitivo (Ultra Fluido)'
                      : res.avgFps >= 60
                      ? 'Jogabilidade Fluida e Estável'
                      : 'Abaixo do ideal para 60 FPS'}
                  </div>
                </div>

                {/* Cartão de 1% Low FPS (Estabilidade de Frametime) */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>1% Low (Estabilidade)</span>
                    {res.singleChannelPenalty && (
                      <span className="text-amber-400 text-[10px] font-bold">⚠️ Stutter</span>
                    )}
                  </div>
                  <div className="my-2">
                    <span
                      className={`text-4xl font-black font-mono ${
                        res.singleChannelPenalty ? 'text-amber-400' : 'text-cyan-400'
                      }`}
                    >
                      {res.onePercentLowFps}
                    </span>
                    <span className="text-xs text-slate-400 font-bold ml-1">FPS</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {res.singleChannelPenalty
                      ? 'Micro-travamentos por Single Channel de RAM'
                      : 'Frametime consistente em Dual Channel [OK]'}
                  </div>
                </div>

                {/* Cartão de Medidor de Gargalo (Bottleneck Gauge) */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Índice de Gargalo (Bottleneck)
                  </div>
                  <div className="my-2 flex items-baseline gap-2">
                    <span
                      className={`text-4xl font-black font-mono ${
                        res.bottleneckPercent > 20
                          ? 'text-rose-400'
                          : res.bottleneckPercent > 10
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {res.bottleneckPercent}%
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {res.bottleneckType === 'CPU_BOUND'
                        ? 'CPU Limitando'
                        : res.bottleneckType === 'GPU_BOUND'
                        ? 'GPU Carga Máxima'
                        : 'Balanceado'}
                    </span>
                  </div>
                  {/* Barra Visual de Gargalo */}
                  <div className="w-full bg-slate-950 rounded-full h-2 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        res.bottleneckPercent > 20
                          ? 'bg-rose-500'
                          : res.bottleneckPercent > 10
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, res.bottleneckPercent * 2)}%` }}
                    />
                  </div>
                </div>

                {/* Cartão de Pontuação Geral */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Pontuação CyberRacer
                  </div>
                  <div className="my-2">
                    <span className="text-4xl font-black text-purple-400 font-mono">
                      {res.score.toLocaleString('pt-BR')}
                    </span>
                    <span className="text-xs text-slate-400 font-bold ml-1">pts</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Baseado em taxa de quadros e estabilidade térmica
                  </div>
                </div>
              </div>

              {/* Gráfico de Frametime em Tempo Real (Curva de Milissegundos) */}
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                      Gráfico de Frametime (Milissegundos por Quadro)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Ideal: Linha plana e uniforme sem picos
                  </span>
                </div>

                {/* SVG da Curva de Frametime */}
                <div className="w-full h-32 bg-slate-950 rounded-xl p-3 border border-slate-800/80 flex items-center justify-center">
                  <svg viewBox="0 0 600 100" className="w-full h-full" preserveAspectRatio="none">
                    {/* Linhas de Grade de Fundo */}
                    <line x1="0" y1="25" x2="600" y2="25" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="0" y1="50" x2="600" y2="50" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />
                    <line x1="0" y1="75" x2="600" y2="75" stroke="#1E293B" strokeWidth="1" strokeDasharray="4 4" />

                    {/* Linha de Frametime Conectada */}
                    <polyline
                      fill="none"
                      stroke={res.singleChannelPenalty ? '#F59E0B' : '#06B6D4'}
                      strokeWidth="2.5"
                      points={res.frametimeHistory
                        .map((ms, index) => {
                          const x = (index / (res.frametimeHistory.length - 1)) * 600;
                          const y = Math.max(10, Math.min(90, 100 - ms * 3.5));
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                  </svg>
                </div>
              </div>

              {/* Veredito Didático e Explicação do Engenheiro */}
              <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Análise Pedagógica do Setup:</span>
                </div>
                <div className="text-sm font-bold text-white">{res.verdictMessage}</div>
                <p className="text-xs text-slate-300 leading-relaxed">{res.didacticTip}</p>
              </div>
            </div>
          )}

          {activeTab === 'SENSORS' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Temperatura da CPU */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Temperatura da CPU</span>
                    <Thermometer
                      className={`w-5 h-5 ${
                        res.cpuTempC > 85
                          ? 'text-rose-500 animate-pulse'
                          : res.cpuTempC > 70
                          ? 'text-amber-500'
                          : 'text-emerald-400'
                      }`}
                    />
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-5xl font-black font-mono ${
                        res.cpuTempC > 85
                          ? 'text-rose-500'
                          : res.cpuTempC > 70
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {res.cpuTempC}°C
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      {res.cpuTempC > 85 ? 'Crítico (Throttling)' : res.cpuTempC > 70 ? 'Carga Alta' : 'Excelente'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Dissipador atual: {assembly.coolerInstalled?.name || 'Cooler Padrão'}.
                    Pasta térmica: {assembly.thermalPasteApplied ? 'Aplicada [OK]' : '⚠️ AUSENTE (RISCO DE QUEIMA)'}.
                  </p>
                </div>

                {/* Temperatura da GPU */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Temperatura da GPU</span>
                    <Tv className="w-5 h-5 text-cyan-400" />
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black font-mono text-cyan-400">
                      {res.gpuTempC}°C
                    </span>
                    <span className="text-xs text-slate-400 font-bold">Operação Normal</span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Placa de vídeo: {assembly.gpuInstalled?.name || 'Gráfico Integrado'}.
                    Consumo térmico proporcional à carga gráfica.
                  </p>
                </div>

                {/* Consumo Total de Energia */}
                <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300">Consumo em Watts</span>
                    <Zap className="w-5 h-5 text-amber-400" />
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black font-mono text-amber-400">
                      {res.totalPowerWatts}W
                    </span>
                    <span className="text-xs text-slate-400 font-bold">
                      / {assembly.psuInstalled?.wattage || 0}W Fonte
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed">
                    Margem de segurança da fonte: {assembly.psuInstalled ? Math.round(((assembly.psuInstalled.wattage - res.totalPowerWatts) / assembly.psuInstalled.wattage) * 100) : 0}% de folga.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'SPECS' && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase font-mono tracking-wider border-b border-slate-800 pb-2">
                Ficha Técnica do Computador Montado
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Placa-Mãe:</span>
                  <span className="font-bold text-white">{selectedMotherboard?.name || 'N/A'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Soquete & Chipset:</span>
                  <span className="font-bold text-white">{selectedMotherboard?.socket} ({selectedMotherboard?.chipset})</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Processador (CPU):</span>
                  <span className="font-bold text-white">{assembly.cpuInstalled?.name || 'N/A'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Placa de Vídeo (GPU):</span>
                  <span className="font-bold text-white">{assembly.gpuInstalled?.name || 'Gráfico Integrado'}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Configuração de RAM:</span>
                  <span className="font-bold text-white">
                    {assembly.ramInstalledSlot2 && assembly.ramInstalledSlot4
                      ? 'Dual Channel Ativo (Slots 2 & 4) [Ideal]'
                      : 'Single Channel (Apenas 1 Pente)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex justify-between">
                  <span className="text-slate-400">Fonte de Alimentação:</span>
                  <span className="font-bold text-white">{assembly.psuInstalled?.name || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

