'use client';

import React, { useState } from 'react';
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
import { ComponentCard } from './ComponentCard';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import {
  Cpu,
  Layers,
  ThermometerSnowflake,
  Fan,
  Droplet,
  Tv,
  HardDrive,
  Zap,
  Box,
  CircuitBoard,
  Server,
  Package,
} from 'lucide-react';

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

export const InventoryDrawer: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const { selectedComponentForPlacement } = useAssemblyStore();

  const categories: { id: FilterCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'ALL', label: 'Todos', icon: <Box className="w-3.5 h-3.5" /> },
    { id: 'MOTHERBOARD', label: 'Placa-Mãe', icon: <CircuitBoard className="w-3.5 h-3.5" /> },
    { id: 'CPU', label: 'Processador', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'RAM', label: 'Memória RAM', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'COOLER', label: 'Cooler', icon: <Fan className="w-3.5 h-3.5" /> },
    { id: 'PASTE', label: 'Pasta Térmica', icon: <Droplet className="w-3.5 h-3.5" /> },
    { id: 'GPU', label: 'Placa de Vídeo', icon: <Tv className="w-3.5 h-3.5" /> },
    { id: 'STORAGE', label: 'Armazenamento', icon: <HardDrive className="w-3.5 h-3.5" /> },
    { id: 'PSU', label: 'Fonte (PSU)', icon: <Zap className="w-3.5 h-3.5" /> },
    { id: 'CASE', label: 'Gabinete', icon: <Server className="w-3.5 h-3.5" /> },
  ];

  const filtered = ALL_COMPONENTS.filter((comp) => {
    if (activeCategory === 'ALL') return true;
    return comp.category === activeCategory;
  });

  return (
    <div className="w-full bg-slate-950/80 rounded-3xl border border-slate-800 p-5 shadow-2xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-cyan-400" />
            <span>Inventário de Hardware</span>
          </h2>
          <p className="text-xs text-slate-400">
            Selecione uma peça e clique no slot da bancada para instalar.
          </p>
        </div>

        {selectedComponentForPlacement && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950 border border-cyan-500/50 text-cyan-300 text-xs font-semibold animate-pulse">
            <span>Peça em mãos:</span>
            <span className="font-bold text-white">{selectedComponentForPlacement.name}</span>
          </div>
        )}
      </div>

      {/* Abas de Categorias */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 scrollbar-thin scrollbar-thumb-slate-800">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
          >
            {cat.icon}
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Grid de Cards de Peças */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-80 overflow-y-auto pr-1">
        {filtered.map((component) => (
          <ComponentCard key={component.id} component={component} />
        ))}
      </div>
    </div>
  );
};

