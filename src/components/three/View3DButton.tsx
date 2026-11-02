'use client';

import React from 'react';
import { Box } from 'lucide-react';
import { findAvailableModelId } from '@/engine/models3dIndex';
import { useModel3DStore } from './model3dStore';

/**
 * Abre a peça do catálogo no visualizador 3D. Não aparece quando a peça não tem modelo fiel
 * ao formato real ou quando o modelo ainda não foi baixado.
 */
export const View3DButton: React.FC<{ catalogId: string; name: string; variant?: 'compact' | 'full' }> = ({
  catalogId,
  name,
  variant = 'compact',
}) => {
  const openModel = useModel3DStore((s) => s.openModel);
  const modelId = findAvailableModelId(catalogId);
  if (!modelId) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        openModel(modelId);
      }}
      aria-label={`Ver ${name} em 3D`}
      title="Ver em 3D"
      className={
        variant === 'full'
          ? 'flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-cyan-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400 cursor-pointer'
          : 'flex items-center gap-1 rounded-md bg-slate-800 px-1.5 py-0.5 text-[11px] font-bold text-cyan-300 hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-cyan-400 cursor-pointer'
      }
    >
      <Box className={variant === 'full' ? 'h-4 w-4' : 'h-3 w-3'} />
      {variant === 'full' ? 'Ver em 3D' : '3D'}
    </button>
  );
};
