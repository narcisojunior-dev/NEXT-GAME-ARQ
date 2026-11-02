'use client';

import React from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { MotherboardSvg } from './MotherboardSvg';
import {
  ShieldAlert,
  ShieldCheck,
  Power,
  RotateCcw,
  Layers,
  Wrench,
  CheckCircle2,
  ArrowDown,
  Maximize2,
} from 'lucide-react';

export const WorkbenchMat: React.FC = () => {
  const {
    currentPhase,
    assembly,
    dischargeEsd,
    installIoShield,
    installStandoffs,
    installPsu,
    screwMotherboard,
    togglePsuSwitch,
    triggerPostBoot,
    resetAssembly,
    openFrontPanelModal,
    selectedComponentForPlacement,
  } = useAssemblyStore();

  const handlePsuAreaClick = () => {
    if (selectedComponentForPlacement?.category === 'PSU') {
      installPsu(selectedComponentForPlacement as never);
    }
  };

  const isPsuTarget = selectedComponentForPlacement?.category === 'PSU';

  return (
    <div className="relative w-full rounded-3xl bg-slate-900 border-2 border-slate-800 p-6 shadow-2xl overflow-hidden">
      {/* Grade Milimetrada do Tapete Antiestático */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#38bdf8 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Barra de Ações Rápidas de Bancada */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          {/* Botão de Descarga Estática (Fase 1) */}
          <button
            onClick={dischargeEsd}
            disabled={assembly.esdDischarged}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
              assembly.esdDischarged
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 animate-bounce'
            }`}
          >
            {assembly.esdDischarged ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>1. ESD Protegido [OK]</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                <span>👉 1. Toque para Descarregar Estática (ESD)</span>
              </>
            )}
          </button>

          {/* Espaçadores (Standoffs) */}
          <button
            onClick={installStandoffs}
            disabled={assembly.standoffsInstalled}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              assembly.standoffsInstalled
                ? 'bg-slate-800 text-emerald-400 border border-emerald-800/60'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{assembly.standoffsInstalled ? 'Espaçadores Dourados [OK]' : 'Fixar Espaçadores de Latão'}</span>
          </button>

          {/* Espelho Traseiro */}
          <button
            onClick={installIoShield}
            disabled={assembly.ioShieldInstalled}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              assembly.ioShieldInstalled
                ? 'bg-slate-800 text-emerald-400 border border-emerald-800/60'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>{assembly.ioShieldInstalled ? 'Espelho I/O Traseiro [OK]' : 'Instalar Espelho Traseiro'}</span>
          </button>

          {/* Minigame Zoom F_PANEL (Painel Frontal) */}
          <button
            onClick={openFrontPanelModal}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              assembly.frontPanelPowerSwConnected
                ? 'bg-slate-800 text-emerald-400 border border-emerald-800/60'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-500/20 animate-pulse'
            }`}
          >
            <Maximize2 className="w-4 h-4" />
            <span>{assembly.frontPanelPowerSwConnected ? 'Painel Frontal F_PANEL [OK]' : 'Pinos F_PANEL (Zoom 300%)'}</span>
          </button>
        </div>

        {/* Controles de Ligar e Resetar */}
        <div className="flex items-center gap-3">
          {/* Chave I/O da Fonte */}
          {assembly.psuInstalled && (
            <button
              onClick={togglePsuSwitch}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                assembly.psuSwitchOn
                  ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-700 text-rose-300 animate-pulse'
              }`}
            >
              <span>Chave Fonte:</span>
              <span className="font-mono">{assembly.psuSwitchOn ? '[I] LIGADA [OK]' : '[O] DESLIGADA'}</span>
            </button>
          )}

          {/* Botão de Ligar o PC (Momento do Boot / POST) */}
          <button
            onClick={triggerPostBoot}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Power className="w-4 h-4" />
            <span>LIGAR O PC (TESTE DE BOOT)</span>
          </button>

          <button
            onClick={resetAssembly}
            title="Reiniciar Montagem da Bancada"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Área Central da Bancada com a Placa-Mãe */}
      <div className="relative z-10">
        <MotherboardSvg />
      </div>

      {/* Área Inferior do Gabinete: Compartimento da Fonte (PSU) e Fixações */}
      <div className="relative z-10 mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Slot da Fonte de Alimentação */}
        <div
          onClick={handlePsuAreaClick}
          className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
            assembly.psuInstalled
              ? 'bg-slate-950/90 border-emerald-500/50 text-emerald-300 shadow-md'
              : isPsuTarget
              ? 'bg-cyan-950 border-cyan-400 animate-pulse text-cyan-200 ring-4 ring-cyan-400/30'
              : 'bg-slate-950/40 border-slate-800 border-dashed text-slate-400 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-2xl">
              ⚡
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Compartimento da Fonte (PSU)
              </div>
              <div className="text-sm font-bold text-white">
                {assembly.psuInstalled
                  ? assembly.psuInstalled.name
                  : isPsuTarget
                  ? '👉 CLIQUE AQUI PARA ENCAIXAR A FONTE!'
                  : 'Clique para instalar Fonte de Alimentação'}
              </div>
            </div>
          </div>
          {assembly.psuInstalled && (
            <div className="text-xs font-mono font-bold bg-emerald-950 px-2.5 py-1 rounded-md text-emerald-400 border border-emerald-800">
              {assembly.psuInstalled.wattage}W [OK]
            </div>
          )}
        </div>

        {/* Parafusar Placa no Gabinete */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Fixação da Placa-Mãe no Gabinete
            </div>
            <div className="text-xs font-medium text-slate-300 mt-0.5">
              {assembly.motherboardScrewed
                ? 'Placa parafusada com segurança sobre os espaçadores'
                : 'Aperto em cruz com parafusos M3'}
            </div>
          </div>
          <button
            onClick={screwMotherboard}
            disabled={assembly.motherboardScrewed}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              assembly.motherboardScrewed
                ? 'bg-slate-800 text-emerald-400 border border-emerald-800/60'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md'
            }`}
          >
            {assembly.motherboardScrewed ? 'Fixada [OK]' : 'Apertar Parafusos M3'}
          </button>
        </div>
      </div>
    </div>
  );
};
