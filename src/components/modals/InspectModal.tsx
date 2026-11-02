'use client';

import React from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { Sparkles, X, Lightbulb } from 'lucide-react';
import { HardwareImage } from '@/components/common/HardwareImage';
import { CATEGORY_LABELS } from '@/components/inventory/componentLabels';

export const InspectModal: React.FC = () => {
  const { inspectedComponent, setInspectedComponent } = useAssemblyStore();

  if (!inspectedComponent) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 shadow-2xl overflow-hidden text-slate-100">
        {/* Efeito sutil de brilho superior */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-teal-400 to-indigo-500" />

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2.5 py-1 rounded-md">
              {CATEGORY_LABELS[inspectedComponent.category]}
            </span>
            <h3 className="text-xl font-bold text-white mt-2">
              {inspectedComponent.name}
            </h3>
          </div>
          <button
            onClick={() => setInspectedComponent(null)}
            aria-label="Fechar ficha"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ilustração da peça */}
        <div
          className="w-full h-40 flex items-center justify-center p-3 mb-4 rounded-2xl border border-slate-800 bg-slate-950"
          style={{ backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.10) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
        >
          <HardwareImage component={inspectedComponent} className="w-full h-full drop-shadow-[0_8px_14px_rgba(0,0,0,0.5)]" />
        </div>

        {/* Descrição Básica */}
        <p className="text-sm text-slate-300 leading-relaxed mb-4">
          {inspectedComponent.description}
        </p>

        {/* Bloco Pedagógico: Para que serve? (Analogia) */}
        <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800 mb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 mb-1">
            <Lightbulb className="w-4 h-4" />
            <span>Analogia do Mundo Real</span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {inspectedComponent.analogy}
          </p>
        </div>

        {/* Curiosidade Técnica */}
        <div className="bg-indigo-950/40 rounded-2xl p-4 border border-indigo-800/40 mb-5">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Curiosidade de Engenharia</span>
          </div>
          <p className="text-xs text-indigo-100/90 leading-relaxed">
            {inspectedComponent.trivia}
          </p>
        </div>

        {/* Especificações e Preço */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
          <div>
            <span className="text-slate-400">Consumo Energético: </span>
            <span className="font-mono font-bold text-slate-200">
              {inspectedComponent.tdpWatts > 0 ? `${inspectedComponent.tdpWatts} Watts` : 'Incluso no circuito'}
            </span>
          </div>
          <div className="text-base font-mono font-bold text-emerald-400">
            R$ {inspectedComponent.price.toLocaleString('pt-BR')}
          </div>
        </div>
      </div>
    </div>
  );
};

