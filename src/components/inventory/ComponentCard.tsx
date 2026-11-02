'use client';

import React from 'react';
import { HardwareComponent } from '@/engine/types';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { HardwareImage } from '@/components/common/HardwareImage';
import { Info, Check, Plus, Zap } from 'lucide-react';

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
      className={`group relative flex flex-col justify-between p-3 rounded-2xl border transition-all duration-200 select-none ${
        isSelected
          ? 'bg-cyan-950/90 border-cyan-400 ring-2 ring-cyan-400/40 shadow-xl shadow-cyan-500/20 scale-102'
          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
      }`}
    >
      {/* Topo do Card com Badge e Botão de Info */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 font-mono">
            {component.category}
          </span>
          {component.category === 'MOTHERBOARD' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800/60 font-mono">
              {(component as any).socket} | {(component as any).supportedRam}
            </span>
          )}
          {component.category === 'CPU' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800/60 font-mono">
              {(component as any).socket}
            </span>
          )}
          {component.category === 'STORAGE' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800/60 font-mono">
              {component.storageType === 'NVMe_M2' ? 'M.2 NVMe' : component.storageType === 'SATA_SSD' ? 'SATA SSD' : 'SATA HD'}
            </span>
          )}
          {component.category === 'COOLER' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800/60 font-mono">
              {component.supportedSockets.join('/')} | {component.maxTdpWatts}W
            </span>
          )}
          {component.category === 'CASE' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700 font-mono">
              {component.supportedFormFactors.join('/')} | GPU {component.maxGpuLengthMm}mm
            </span>
          )}
          {component.category === 'GPU' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800/60 font-mono">
              {component.lengthMm}mm | Fonte {component.requiredPsuWatts}W
            </span>
          )}
          {component.category === 'RAM' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800/60 font-mono">
              {(component as any).ramType}
            </span>
          )}
        </div>
        <button
          onClick={() => setInspectedComponent(component)}
          title="Ver para que serve e curiosidades"
          className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Ilustração Visual do Componente de Hardware */}
      <div className="w-full h-24 flex items-center justify-center p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 mb-2 overflow-hidden group-hover:border-slate-700 transition-colors">
        <HardwareImage category={component.category} name={component.name} className="w-full h-full object-contain drop-shadow-md" />
      </div>

      {/* Nome e Descrição Rápida */}
      <div className="mb-2">
        <div className="text-xs font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors" title={component.name}>
          {component.name}
        </div>
        <div className="text-[10px] text-slate-400 line-clamp-2 mt-0.5 h-7 leading-snug">
          {component.description}
        </div>
      </div>

      {/* Rodapé: Preço, Watts e Botão de Ação */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-auto">
        <div className="flex flex-col">
          <span className="text-xs font-mono font-bold text-emerald-400">
            R$ {component.price.toLocaleString('pt-BR')}
          </span>
          {component.tdpWatts > 0 && (
            <span className="text-[9px] font-mono text-slate-500 flex items-center gap-0.5">
              <Zap className="w-2.5 h-2.5 text-amber-500" />
              {component.tdpWatts}W
            </span>
          )}
        </div>

        <button
          onClick={handleSelect}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            isSelected
              ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
          }`}
        >
          {isSelected ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Pronto</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>Usar</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
