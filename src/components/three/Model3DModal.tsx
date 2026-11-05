'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useShallow } from 'zustand/react/shallow';
import { useModel3DStore } from './model3dStore';
import {
  MODELS_3D,
  CATEGORY_3D_LABELS,
  LICENSE_LABELS,
  Model3D,
  getAvailableModels,
  modelAuthorUrl,
  DECOR_MODELS,
  isModelAvailable,
  modelFileUrl,
  modelSourceUrl,
} from '@/engine/models3d';
import { Box, X, Info, ExternalLink, AlertTriangle } from 'lucide-react';

// three.js + React Three Fiber só são baixados quando o aluno abre o 3D (RNF08)
const ModelViewer = dynamic(() => import('./ModelViewer'), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-[260px] flex-1 place-items-center rounded-2xl border border-slate-800 bg-slate-950 font-mono text-xs text-cyan-300">
      Preparando o visualizador 3D…
    </div>
  ),
});

const hasWebGL = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

/** Crédito obrigatório da licença CC BY: título, autor, fonte e licença */
const ModelCredit: React.FC<{ model: Model3D }> = ({ model }) => (
  <p className="text-[11px] leading-snug text-slate-400">
    Modelo{' '}
    <a href={modelSourceUrl(model)} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline-offset-2 hover:underline">
      &quot;{model.name}&quot;
    </a>{' '}
    por{' '}
    <a href={modelAuthorUrl(model)} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline-offset-2 hover:underline">
      {model.author}
    </a>
    , licença {LICENSE_LABELS[model.license]}, via Sketchfab. Otimizado para o jogo (geometria reduzida e texturas comprimidas).
  </p>
);

const ModelDetails: React.FC<{ model: Model3D; webgl: boolean }> = ({ model, webgl }) => {
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {model.illustrative && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-800/60 bg-amber-950/40 p-2.5 text-xs text-amber-200">
          <Info className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>Modelo ilustrativo:</strong> representa a categoria, mas não é exatamente o produto do catálogo. {model.note}
          </span>
        </p>
      )}
      {!webgl || failed ? (
        <div className="grid min-h-[260px] flex-1 place-items-center rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-sm text-slate-300">
          <span className="flex max-w-sm flex-col items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            {!webgl
              ? 'Este computador não suporta gráficos 3D (WebGL). A ilustração 2D da ficha continua disponível.'
              : 'Não foi possível carregar este modelo. Tente de novo mais tarde; a ilustração 2D continua disponível.'}
          </span>
        </div>
      ) : (
        <ModelViewer key={model.id} url={modelFileUrl(model)} label={model.name} onError={() => setFailed(true)} />
      )}
      <ModelCredit model={model} />
    </div>
  );
};

/**
 * Modal do visualizador 3D: uma peça (aberta pela ficha didática ou pelos periféricos)
 * ou a vitrine com todos os modelos já baixados.
 */
export const Model3DModal: React.FC = () => {
  const { modelId, isGalleryOpen, selectInGallery, close } = useModel3DStore(
    useShallow((s) => ({ modelId: s.modelId, isGalleryOpen: s.isGalleryOpen, selectInGallery: s.selectInGallery, close: s.close }))
  );
  const [webgl, setWebgl] = useState(true);
  const isOpen = Boolean(modelId) || isGalleryOpen;
  const available = useMemo(() => getAvailableModels(), []);

  useEffect(() => {
    if (!isOpen) return;
    setWebgl(hasWebGL());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  if (!isOpen) return null;

  const model = MODELS_3D.find((m) => m.id === modelId) ?? (isGalleryOpen ? available[0] : undefined);
  const grouped = available.reduce<Record<string, Model3D[]>>((acc, m) => {
    (acc[m.category] ??= []).push(m);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="model3d-title"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[calc(100vh-2rem)] w-full flex-col gap-4 overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl ${
          isGalleryOpen ? 'max-w-5xl' : 'max-w-2xl'
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-cyan-400">
              <Box className="h-3.5 w-3.5" />
              {isGalleryOpen ? 'Vitrine 3D' : `Peça em 3D · ${model ? CATEGORY_3D_LABELS[model.category] : ''}`}
            </p>
            <h2 id="model3d-title" className="mt-0.5 text-lg font-bold text-white">
              {model?.name ?? 'Vitrine 3D'}
            </h2>
          </div>
          <button
            onClick={close}
            aria-label="Fechar o visualizador 3D"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`flex min-h-0 flex-1 gap-4 ${isGalleryOpen ? 'flex-col md:flex-row' : 'flex-col'}`}>
          {isGalleryOpen && (
            <nav aria-label="Modelos da vitrine" className="max-h-48 shrink-0 overflow-y-auto md:max-h-none md:w-60">
              {available.length === 0 && (
                <p className="text-xs text-slate-400">Nenhum modelo 3D foi baixado ainda.</p>
              )}
              {Object.entries(grouped).map(([category, models]) => (
                <section key={category} className="mb-3">
                  <h3 className="mb-1 font-mono text-[11px] uppercase tracking-wider text-slate-500">
                    {CATEGORY_3D_LABELS[category as Model3D['category']]}
                  </h3>
                  <ul className="space-y-1">
                    {models.map((m) => (
                      <li key={m.id}>
                        <button
                          onClick={() => selectInGallery(m.id)}
                          aria-current={model?.id === m.id ? 'true' : undefined}
                          className={`w-full truncate rounded-lg px-2 py-1.5 text-left text-xs font-semibold cursor-pointer ${
                            model?.id === m.id ? 'bg-cyan-500 text-slate-950' : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          {m.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </nav>
          )}
          {model ? (
            <ModelDetails model={model} webgl={webgl} />
          ) : (
            <p className="text-sm text-slate-300">
              Peça ao professor para adicionar os modelos 3D (lista em <code>docs/modelos-3d.md</code>).
            </p>
          )}
        </div>

        {isGalleryOpen && (
          <details className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
            <summary className="cursor-pointer font-bold text-slate-200">Créditos da decoração do quarto ({DECOR_MODELS.length} modelos, CC BY 4.0)</summary>
            <p className="mt-2 text-[11px] text-slate-400">
              O Modo Decorar usa estes modelos do Sketchfab. Enquanto um modelo não é baixado, o jogo desenha uma versão simples feita por código.
            </p>
            <ul className="mt-2 grid max-h-48 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {DECOR_MODELS.map((m) => (
                <li key={m.id} className="truncate">
                  <a href={modelSourceUrl(m)} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">
                    {m.name}
                  </a>{' '}
                  de{' '}
                  <a href={modelAuthorUrl(m)} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">
                    {m.author}
                  </a>{' '}
                  · {LICENSE_LABELS[m.license]} · <span className="text-slate-500">{isModelAvailable(m.id) ? 'baixado' : 'versão por código'}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <a
          href="https://creativecommons.org/licenses/by/4.0/deed.pt-br"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 self-start text-[11px] text-slate-500 hover:text-slate-300"
        >
          O que a licença Creative Commons permite <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
};
