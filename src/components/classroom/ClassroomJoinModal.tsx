'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useClassroomStore } from '@/store/useClassroomStore';
import { apiFetch } from './apiClient';

interface JoinResponse {
  participantToken: string;
  participantId: string;
  displayName: string;
  classroom: { code: string; name: string };
}

/** Entrar na turma (#78): código do quadro + apelido; nenhum dado pessoal além disso (LGPD) */
export default function ClassroomJoinModal() {
  const { joinOpen, prefillCode, closeJoin, setSession } = useClassroomStore();
  const [code, setCode] = useState(prefillCode);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const first = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!joinOpen) return;
    setCode(prefillCode);
    setError(null);
    setTimeout(() => (prefillCode ? document.getElementById('turma-apelido') : first.current)?.focus(), 0);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closeJoin();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [joinOpen, prefillCode, closeJoin]);

  if (!joinOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await apiFetch<JoinResponse>('/join', { body: { code, displayName: name } });
    setBusy(false);
    if (!r.ok) {
      setError(r.error.message);
      return;
    }
    setSession({ code: r.data.classroom.code, classroomName: r.data.classroom.name, participantId: r.data.participantId, displayName: r.data.displayName, token: r.data.participantToken });
    closeJoin();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4" onClick={closeJoin}>
      <div role="dialog" aria-modal="true" aria-labelledby="turma-titulo" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border border-cyan-700/60 bg-slate-900 p-5 space-y-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="turma-titulo" className="text-lg font-black text-white">
              Entrar na turma
            </h2>
            <p className="text-xs text-slate-400 mt-1">Use o código que o professor mostrou. Sem e-mail e sem senha.</p>
          </div>
          <button type="button" onClick={closeJoin} aria-label="Fechar" className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={(e) => void submit(e)} className="space-y-3" noValidate>
          <div className="space-y-1">
            <label htmlFor="turma-codigo" className="block text-sm font-semibold text-slate-200">
              Código da turma
            </label>
            <input
              ref={first}
              id="turma-codigo"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={8}
              autoComplete="off"
              autoCapitalize="characters"
              className="w-full min-h-[48px] rounded-xl bg-slate-950 border border-slate-700 px-3 font-mono text-2xl tracking-[0.3em] text-cyan-200 uppercase focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
              aria-describedby="turma-codigo-dica"
            />
            <p id="turma-codigo-dica" className="text-xs text-slate-400">
              6 letras e números, ex.: K7P2QX.
            </p>
          </div>
          <div className="space-y-1">
            <label htmlFor="turma-apelido" className="block text-sm font-semibold text-slate-200">
              Apelido da bancada
            </label>
            <input
              id="turma-apelido"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
              autoComplete="off"
              className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-700 px-3 text-sm text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
              aria-describedby="turma-apelido-dica"
            />
            <p id="turma-apelido-dica" className="text-xs text-slate-400">
              Só o primeiro nome e a bancada, ex.: &quot;Ana e Léo – Bancada 3&quot;. Não use sobrenome nem dados pessoais.
            </p>
          </div>
          {error && (
            <p role="alert" className="rounded-xl border border-rose-700/70 bg-rose-950/50 px-3 py-2 text-sm text-rose-100">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || code.trim().length < 6 || name.trim().length < 2}
            className="w-full min-h-[44px] rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            {busy ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
