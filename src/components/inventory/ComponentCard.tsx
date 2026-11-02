'use client';

import React from 'react';
import { HardwareComponent } from '@/engine/types';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { Info, Check, Plus } from 'lucide-react';

interface ComponentCardProps {
  component: HardwareComponent;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({ component }) => {
  const {
    selectedComponentForPlacement,
    setSelectedComponentForPlacement,
    setInspectedComponent,
  } = useAssemblyStore();

  const isSelected = selectedComponentForPlacement?.id === component.id;

  const handleSelect = () => {
    if (isSelected) {
      setSelectedComponentForPlacement(null);
    } else {
      setSelectedComponentForPlacement(component);
    }
  };

  return (
    <div
      className={`group relative p-3.5 rounded-2xl border transition-all duration-200 select-none ${
        isSelected
          ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/30 shadow-lg shadow-cyan-500/10'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
          {component.category}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setInspectedComponent(component)}
            title="Inspecionar e ver para que serve"
            className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="text-xs font-bold text-white line-clamp-1 mb-1">
        {component.name}
      </div>

      <div className="text-[11px] text-slate-400 line-clamp-2 mb-3 h-8">
        {component.description}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <div>
          <span className="text-xs font-mono font-bold text-emerald-400">
            R$ {component.price.toLocaleString('pt-BR')}
          </span>
          {component.tdpWatts > 0 && (
            <span className="ml-2 text-[10px] font-mono text-slate-500">
              {component.tdpWatts}W
            </span>
          )}
        </div>

        <button
          onClick={handleSelect}
          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            isSelected
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="w-3 h-3" />
              <span>Pronto</span>
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              <span>Usar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

