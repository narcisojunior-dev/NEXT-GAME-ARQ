'use client';

import React from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { CLIENT_MISSIONS } from '@/engine/hardwareCatalog';
import { Briefcase, Coins, Target, Users } from 'lucide-react';

export const MissionHeader: React.FC = () => {
  const { gameMode, activeMission, selectMission } = useAssemblyStore();

  if (gameMode !== 'MISSAO' || !activeMission) return null;

  return (
    <div className="w-full bg-slate-900 border border-amber-500/30 rounded-3xl p-5 mb-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="text-3xl p-2 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            {activeMission.clientAvatar}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">
                Chamado de Cliente
              </span>
              <span className="text-xs text-slate-400 font-medium">({activeMission.clientRole})</span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">
              {activeMission.clientName} — {activeMission.title}
            </h2>
          </div>
        </div>

        {/* Seletor de Clientes */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          {CLIENT_MISSIONS.map((m) => (
            <button
              key={m.id}
              onClick={() => selectMission(m.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeMission.id === m.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {m.clientAvatar} {m.clientName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 md:col-span-2">
          <div className="font-bold text-slate-400 mb-1">Pedido do Cliente:</div>
          <p className="text-slate-200 leading-relaxed italic">
            &ldquo;{activeMission.description}&rdquo;
          </p>
        </div>

        <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400">Teto Orçamentário:</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              R$ {activeMission.budgetMax.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-400">RAM Mínima:</span>
            <span className="font-mono font-bold text-white">{activeMission.requiredRamGb} GB</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Placa Dedicada:</span>
            <span className="font-mono font-bold text-white">
              {activeMission.needsDedicatedGpu ? 'Obrigatória' : 'Opcional (Vídeo Integrado OK)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

