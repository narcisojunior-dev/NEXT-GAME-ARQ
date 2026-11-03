'use client';

import React, { useState, useMemo } from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useShallow } from 'zustand/react/shallow';
import { ComponentCategory, HardwareComponent } from '@/engine/types';
import {
  CPUS,
  MOTHERBOARDS,
  RAMS,
  COOLERS,
  THERMAL_PASTES,
  GPUS,
  STORAGES,
  PSUS,
  CASES,
} from '@/engine/hardwareCatalog';
import { ComponentCard } from '@/components/inventory/ComponentCard';
import { CableTray } from './CableTray';
import {
  Package,
  Cable as CableIcon,
  Search,
  CheckCircle2,
  Hand,
  X,
  CircuitBoard,
  Cpu,
  Layers,
  ThermometerSnowflake,
  Tv,
  HardDrive,
  Zap,
  Server,
  Box,
  LayoutGrid,
  List,
  Sparkles,
  Info,
  CheckCheck,
  AlertTriangle,
  Ban,
  MapPin,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { getCompatibilityHint, getPriceTier, HintStatus, PriceTier } from '@/engine/cardInsights';
import { HardwareImage } from '@/components/common/HardwareImage';
import { CATEGORY_LABELS, TIER_LABELS, getSpecLine } from '@/components/inventory/componentLabels';
import { getRequiredCables, cableById } from '@/engine/cabling';

const ALL_COMPONENTS: HardwareComponent[] = [
  ...MOTHERBOARDS,
  ...CPUS,
  ...RAMS,
  ...COOLERS,
  ...THERMAL_PASTES,
  ...GPUS,
  ...STORAGES,
  ...PSUS,
  ...CASES,
];

type FilterCategory = 'ALL' | ComponentCategory;

interface CategoryItem {
  id: FilterCategory;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryItem[] = [
  { id: 'ALL', label: 'Todos', shortLabel: 'Todos', icon: <Box className="w-3.5 h-3.5" /> },
  { id: 'MOTHERBOARD', label: 'Placa-Mãe', shortLabel: 'Placa', icon: <CircuitBoard className="w-3.5 h-3.5" /> },
  { id: 'CPU', label: 'Processador', shortLabel: 'CPU', icon: <Cpu className="w-3.5 h-3.5" /> },
  { id: 'RAM', label: 'Memória RAM', shortLabel: 'RAM', icon: <Layers className="w-3.5 h-3.5" /> },
  { id: 'COOLER', label: 'Cooler & Pasta', shortLabel: 'Cooler', icon: <ThermometerSnowflake className="w-3.5 h-3.5" /> },
  { id: 'GPU', label: 'Placa de Vídeo', shortLabel: 'GPU', icon: <Tv className="w-3.5 h-3.5" /> },
  { id: 'STORAGE', label: 'Armazenamento', shortLabel: 'SSD/HD', icon: <HardDrive className="w-3.5 h-3.5" /> },
  { id: 'PSU', label: 'Fonte (PSU)', shortLabel: 'Fonte', icon: <Zap className="w-3.5 h-3.5" /> },
  { id: 'CASE', label: 'Gabinete', shortLabel: 'Gabinete', icon: <Server className="w-3.5 h-3.5" /> },
];

const TIER_STYLES: Record<PriceTier, string> = {
  ENTRADA: 'bg-slate-800 text-slate-300',
  INTERMEDIARIO: 'bg-cyan-950 text-cyan-300',
  TOPO: 'bg-violet-950 text-violet-300',
};

const HINT_STYLES: Record<HintStatus, { className: string; icon: React.ReactNode }> = {
  INSTALLED: { className: 'bg-emerald-950/70 text-emerald-300', icon: <CheckCheck className="w-3 h-3 shrink-0" /> },
  OK: { className: 'bg-emerald-950/50 text-emerald-300', icon: <CheckCircle2 className="w-3 h-3 shrink-0" /> },
  INFO: { className: 'bg-sky-950/60 text-sky-300', icon: <MapPin className="w-3 h-3 shrink-0" /> },
  WARNING: { className: 'bg-amber-950/60 text-amber-300', icon: <AlertTriangle className="w-3 h-3 shrink-0" /> },
  DANGER: { className: 'bg-rose-950/70 text-rose-300', icon: <Ban className="w-3 h-3 shrink-0" /> },
};

/** Card Compacto Otimizado para Barra Lateral */
const CompactLateralCard: React.FC<{ component: HardwareComponent }> = ({ component }) => {
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
    ? 'border-cyan-400 bg-cyan-950/40 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/20'
    : hint?.status === 'DANGER'
    ? 'border-rose-900/40 bg-slate-900/90 hover:border-rose-700/60'
    : hint?.status === 'WARNING'
    ? 'border-amber-900/40 bg-slate-900/90 hover:border-amber-700/60'
    : 'border-slate-800 bg-slate-900/90 hover:border-slate-700';

  return (
    <div
      className={`relative p-2.5 rounded-xl border transition-all duration-150 flex flex-col gap-2 select-none group ${borderClass}`}
    >
      <div className="flex items-center gap-2.5">
        {/* Thumbnail da Peça */}
        <div className="relative w-12 h-12 shrink-0 rounded-lg bg-slate-950 border border-slate-800 p-1 flex items-center justify-center overflow-hidden">
          <HardwareImage
            component={component}
            className="w-full h-full object-contain drop-shadow transition-transform duration-200 group-hover:scale-105"
          />
        </div>

        {/* Informações Principais */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] font-mono uppercase text-slate-400 font-bold truncate">
              {CATEGORY_LABELS[component.category]}
            </span>
            <span className={`text-[9px] font-mono px-1 py-0.2 rounded font-semibold ${TIER_STYLES[tier]}`}>
              {TIER_LABELS[tier]}
            </span>
          </div>

          <h4 className="text-xs font-bold text-white truncate leading-tight mt-0.5" title={component.name}>
            {component.name}
          </h4>

          <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5" title={spec}>
            {spec}
          </p>
        </div>
      </div>

      {/* Selo de Compatibilidade em Tempo Real */}
      {hint && (
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium ${HINT_STYLES[hint.status].className}`}>
          {HINT_STYLES[hint.status].icon}
          <span className="truncate">{hint.label}</span>
        </div>
      )}

      {/* Preço e Botões de Ação */}
      <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-mono font-bold text-emerald-400">
            R${component.price.toLocaleString('pt-BR')}
          </span>
          {component.tdpWatts > 0 && (
            <span className="text-[10px] font-mono text-slate-400">
              {component.tdpWatts}W
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setInspectedComponent(component)}
            aria-label={`Inspecionar ficha e ver 3D de ${component.name}`}
            title="Inspecionar ficha e ver em 3D"
            className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setSelectedComponentForPlacement(isSelected ? null : component)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              isSelected
                ? 'bg-cyan-400 text-slate-950 shadow-md shadow-cyan-400/30'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white'
            }`}
          >
            {isSelected ? <Hand className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            <span>{isSelected ? 'Em Mãos' : 'Usar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export interface WorkbenchSidebarProps {
  className?: string;
}

export const WorkbenchSidebar: React.FC<WorkbenchSidebarProps> = ({ className = '' }) => {
  const [activeTab, setActiveTab] = useState<'components' | 'cables'>('components');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyCompatible, setOnlyCompatible] = useState(false);
  const [viewStyle, setViewStyle] = useState<'compact' | 'expanded'>('compact');

  const {
    assembly,
    selectedMotherboard,
    selectedComponentForPlacement,
    setSelectedComponentForPlacement,
    cableConnections,
  } = useAssemblyStore(
    useShallow((s) => ({
      assembly: s.assembly,
      selectedMotherboard: s.selectedMotherboard,
      selectedComponentForPlacement: s.selectedComponentForPlacement,
      setSelectedComponentForPlacement: s.setSelectedComponentForPlacement,
      cableConnections: s.cableConnections,
    }))
  );

  // Calcula estatística de cabeamento para a aba
  const requiredCables = useMemo(() => getRequiredCables(assembly), [assembly]);
  const connectedCablesCount = useMemo(() => {
    let count = requiredCables.filter((id) => cableConnections[id] === cableById(id).target).length;
    if (assembly.frontPanelPowerSwConnected) count += 1;
    return count;
  }, [requiredCables, cableConnections, assembly.frontPanelPowerSwConnected]);
  const totalCablesCount = requiredCables.length + 1; // +1 pelo F_PANEL

  // Filtragem inteligente de componentes
  const filteredComponents = useMemo(() => {
    return ALL_COMPONENTS.filter((comp) => {
      // 1. Filtro por Categoria
      if (activeCategory !== 'ALL') {
        if (activeCategory === 'COOLER') {
          if (comp.category !== 'COOLER' && comp.category !== 'PASTE') return false;
        } else if (comp.category !== activeCategory) {
          return false;
        }
      }

      // 2. Filtro por Busca de Texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = comp.name.toLowerCase().includes(query);
        const matchCat = CATEGORY_LABELS[comp.category].toLowerCase().includes(query);
        const matchSpec = getSpecLine(comp).toLowerCase().includes(query);
        if (!matchName && !matchCat && !matchSpec) return false;
      }

      // 3. Filtro Opcional de Apenas Compatíveis
      if (onlyCompatible && selectedMotherboard) {
        const hint = getCompatibilityHint(comp, assembly, selectedMotherboard);
        if (hint && (hint.status === 'DANGER' || hint.status === 'WARNING')) {
          return false;
        }
      }

      return true;
    });
  }, [activeCategory, searchQuery, onlyCompatible, selectedMotherboard, assembly]);

  return (
    <aside
      aria-label="Menu Lateral de Escolha de Componentes e Cabeamento"
      className={`w-full flex flex-col h-[580px] rounded-2xl border border-slate-800 bg-[#070b14]/95 shadow-2xl backdrop-blur-md overflow-hidden select-none ${className}`}
    >
      {/* ==============================================================================
       * TOPO DO MENU LATERAL: ABAS (COMPONENTES x CABOS) & VISUALIZAÇÃO
       * ============================================================================== */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          {/* Alternador de Abas Principais */}
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('components')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'components'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Peças ({ALL_COMPONENTS.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('cables')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activeTab === 'cables'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <CableIcon className="w-3.5 h-3.5" />
              <span>Cabos ({connectedCablesCount}/{totalCablesCount})</span>
            </button>
          </div>

          {/* Alternador Compacto / Grade (na aba de componentes) */}
          {activeTab === 'components' && (
            <div className="flex items-center gap-0.5 bg-slate-950/80 p-0.5 rounded-lg border border-slate-800">
              <button
                onClick={() => setViewStyle('compact')}
                aria-label="Visualização em Lista Compacta"
                title="Modo Lista Compacta"
                className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  viewStyle === 'compact'
                    ? 'bg-slate-800 text-cyan-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewStyle('expanded')}
                aria-label="Visualização em Cards Expandidos"
                title="Modo Cards Expandidos"
                className={`p-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                  viewStyle === 'expanded'
                    ? 'bg-slate-800 text-cyan-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Banner de Feedback: Peça em mãos pronta para clique na bancada */}
        {selectedComponentForPlacement && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-cyan-950/90 border border-cyan-400 text-xs font-mono animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center gap-2 min-w-0">
              <Hand className="w-4 h-4 text-cyan-400 animate-bounce shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-cyan-400 font-bold block uppercase tracking-wider">
                  Na Mão: Encaixe na Bancada ao Lado
                </span>
                <span className="font-bold text-white truncate block">
                  {selectedComponentForPlacement.name}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedComponentForPlacement(null)}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-slate-300 hover:text-white shrink-0 cursor-pointer"
              title="Descartar seleção"
            >
              Soltar
            </button>
          </div>
        )}
      </div>

      {/* ==============================================================================
       * CONTEÚDO PRINCIPAL DA ABA SELECIONADA
       * ============================================================================== */}
      {activeTab === 'components' ? (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Barra de Busca e Categorias */}
          <div className="p-2.5 border-b border-slate-800/60 bg-slate-900/40 space-y-2 shrink-0">
            {/* Input de Busca */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar componente, soquete, DDR..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Chips de Categorias em Carrossel Horizontal Suave */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold shrink-0 transition-all cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.shortLabel}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Lista Rolável de Componentes */}
          <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredComponents.length === 0 ? (
              <div className="p-8 text-center text-xs font-mono text-slate-500 flex flex-col items-center gap-2">
                <Box className="w-8 h-8 text-slate-700" />
                <span>Nenhum componente encontrado com este filtro.</span>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('ALL');
                  }}
                  className="mt-1 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[10px]"
                >
                  Limpar Filtros
                </button>
              </div>
            ) : viewStyle === 'compact' ? (
              filteredComponents.map((comp) => (
                <CompactLateralCard key={comp.id} component={comp} />
              ))
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {filteredComponents.map((comp) => (
                  <ComponentCard key={comp.id} component={comp} />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Aba de Cabos: Renderiza a Bandeja de Cabeamento Integrada */
        <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-slate-800">
          <CableTray />
        </div>
      )}
    </aside>
  );
};
