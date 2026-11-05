'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Registro do service worker versionado pelo build e aviso de "Nova versão disponível" (#24).
 * A versão nova fica em espera até o aluno tocar em "Atualizar": trocar a página sozinha no meio
 * da montagem quebrava o carregamento dos módulos sob demanda (chunks antigos já removidos).
 */
export const ServiceWorkerUpdater: React.FC = () => {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    // Em desenvolvimento o cache só atrapalha (e os testes E2E rodam no servidor de dev)
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator) || !window.location.protocol.startsWith('http')) return;

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    const version = process.env.NEXT_PUBLIC_BUILD_ID ?? 'dev';
    navigator.serviceWorker
      .register(`/sw.js?v=${encodeURIComponent(version)}`)
      .then((registration) => {
        // Uma versão já baixada esperando (aba aberta antes do deploy)
        if (registration.waiting && navigator.serviceWorker.controller) setWaiting(registration.waiting);
        registration.addEventListener('updatefound', () => {
          const incoming = registration.installing;
          incoming?.addEventListener('statechange', () => {
            // "installed" com um controlador ativo = atualização (não a primeira instalação)
            if (incoming.state === 'installed' && navigator.serviceWorker.controller) setWaiting(incoming);
          });
        });
      })
      .catch(() => {});

    return () => navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
  }, []);

  if (!waiting) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-[60] -translate-x-1/2 flex items-center gap-3 rounded-2xl border border-cyan-500/60 bg-slate-950/95 px-4 py-3 text-xs font-mono text-slate-200 shadow-2xl"
    >
      <span>
        <strong className="text-cyan-300">Nova versão disponível.</strong> Seu progresso fica salvo.
      </span>
      <button
        type="button"
        onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}
        className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-cyan-500 px-3 font-bold text-slate-950 hover:bg-cyan-400 cursor-pointer focus-visible:outline-2 focus-visible:outline-cyan-300"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Atualizar
      </button>
      <button
        type="button"
        onClick={() => setWaiting(null)}
        className="min-h-[44px] rounded-xl px-2 text-slate-400 hover:text-white cursor-pointer"
      >
        Depois
      </button>
    </div>
  );
};
