'use client';

import React from 'react';
import { m } from 'framer-motion';
import { useShallow } from 'zustand/react/shallow';
import { HardwareComponent } from '@/engine/types';
import { getCompatibilityHint, getPriceTier, HintStatus, PriceTier } from '@/engine/cardInsights';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { HardwareImage } from '@/components/common/HardwareImage';
import { CATEGORY_LABELS, TIER_LABELS, getSpecLine } from './componentLabels';
import { Info, Hand, Plus, Zap, CheckCircle2, CheckCheck, AlertTriangle, Ban, MapPin } from 'lucide-react';

interface ComponentCardProps {
  component: HardwareComponent;
}

const TIER_STYLES: Record<PriceTier, string> = {
  ENTRADA: 'bg-slate-800 text-slate-300',
  INTERMEDIARIO: 'bg-cyan-950 text-cyan-300',
  TOPO: 'bg-violet-950 text-violet-300',
};

const HINT_STYLES: Record<HintStatus, { className: string; icon: React.ReactNode }> = {
  INSTALLED: { className: 'bg-emerald-950/70 text-emerald-300', icon: <CheckCheck className="w-3.5 h-3.5 shrink-0" /> },
  OK: { className: 'bg-emerald-950/50 text-emerald-300', icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> },
  INFO: { className: 'bg-sky-950/60 text-sky-300', icon: <MapPin className="w-3.5 h-3.5 shrink-0" /> },
  WARNING: { className: 'bg-amber-950/60 text-amber-300', icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> },
  DANGER: { className: 'bg-rose-950/70 text-rose-300', icon: <Ban className="w-3.5 h-3.5 shrink-0" /> },
};

export const ComponentCard: React.FC<ComponentCardProps> = ({ component }) => {
  // Seletor raso: o card só re-renderiza quando a montagem ou a peça em mãos mudam (não a cada tique do relógio)
  const { assembly, selectedMotherboard, isSelected, setSelectedComponentForPlacement, setInspectedComponent } =
    useAssemblyStore(
      useShallow((s) => ({
        assembly: s.assembly,
        selectedMotherboard: s.selectedMotherboard,
        isSelected: s.selectedComponentForPlacement?.id === component.id,
        setSelectedComponentForPlacement: s.setSelectedComponentForPlacement,
        setInspectedComponent: s.setInspectedComponent,
      }))
    );

  const hint = getCompatibilityHint(component, assembly, selectedMotherboard);
  const tier = getPriceTier(component);
  const spec = getSpecLine(component);

  const borderClass = isSelected
    ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-xl shadow-cyan-500/15'
    : hint?.status === 'DANGER'
    ? 'border-rose-500/40 hover:border-rose-400/60'
    : hint?.status === 'WARNING'
    ? 'border-amber-500/30 hover:border-amber-400/50'
    : 'border-slate-800 hover:border-slate-600';

  return (
    <m.article
      animate={{ y: isSelected ? -4 : 0 }}
      whileHover={{ y: isSelected ? -4 : -2 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      className={`group relative flex flex-col gap-2 p-3 rounded-2xl border bg-slate-900/90 transition-colors select-none ${borderClass}`}
    >
      {/* Categoria, faixa de preço e ficha didática */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 truncate">
            {CATEGORY_LABELS[component.category]}
          </span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap ${TIER_STYLES[tier]}`}>
            {TIER_LABELS[tier]}
          </span>
        </div>
        <button
          onClick={() => setInspectedComponent(component)}
          aria-label={`Ver ficha didática de ${component.name}`}
          title="Para que serve e curiosidades"
          className="-m-1 p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-cyan-400 transition-colors cursor-pointer"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* Ilustração sobre um pedaço do tapete antiestático */}
      <div
        className="relative w-full h-28 flex items-center justify-center p-2 rounded-xl border border-slate-800/80 bg-slate-950 overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.10) 1px, transparent 1px)', backgroundSize: '12px 12px' }}
      >
        <HardwareImage
          component={component}
          className="w-full h-full drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)] transition-transform duration-300 group-hover:scale-[1.04]"
        />
      </div>

      {/* Nome e especificações */}
      <div>
        <h3 className="text-[13px] font-semibold leading-snug text-white line-clamp-2 min-h-[2.4em]" title={component.name}>
          {component.name}
        </h3>
        <p className="mt-0.5 text-[11px] font-mono text-slate-400 truncate" title={spec}>
          {spec}
        </p>
      </div>

      {/* Selo de compatibilidade com a montagem atual */}
      <div className="min-h-[26px]">
        {hint && (
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold ${HINT_STYLES[hint.status].className}`}>
            {HINT_STYLES[hint.status].icon}
            <span className="truncate" title={hint.label}>
              {hint.label}
            </span>
          </div>
        )}
      </div>

      {/* Preço, consumo e ação */}
      <div className="flex items-end justify-between pt-2 mt-auto border-t border-slate-800/80">
        <div className="flex flex-col">
          <span className="text-base font-mono font-bold text-emerald-300 leading-none">
            <span className="text-[11px] text-emerald-500/80 mr-0.5">R$</span>
            {component.price.toLocaleString('pt-BR')}
          </span>
          {component.tdpWatts > 0 && (
            <span className="mt-1 text-[11px] font-mono text-slate-500 flex items-center gap-0.5">
              <Zap className="w-3 h-3 text-amber-500" />
              {component.tdpWatts}W
            </span>
          )}
        </div>

        <button
          onClick={() => setSelectedComponentForPlacement(isSelected ? null : component)}
          aria-pressed={isSelected}
          className={`flex items-center gap-1.5 min-h-9 px-3 rounded-xl text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 cursor-pointer ${
            isSelected
              ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/25'
              : 'bg-slate-800 hover:bg-slate-700 text-slate-100'
          }`}
        >
          {isSelected ? <Hand className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          <span>{isSelected ? 'Na mão' : 'Usar'}</span>
        </button>
      </div>
    </m.article>
  );
};
