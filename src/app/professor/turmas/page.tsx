'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/components/classroom/apiClient';
import { Button, Card, Field, INPUT, Notice } from '@/components/professor/ui';
import type { Classroom, Teacher } from '@/engine/classroom/types';

/** Turmas do professor (#76): criar, abrir e sair */
export default function TurmasPage() {
  const router = useRouter();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[] | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const me = await apiFetch<{ teacher: Teacher }>('/auth/me');
    if (!me.ok) {
      router.replace('/professor');
      return;
    }
    setTeacher(me.data.teacher);
    const list = await apiFetch<{ classrooms: Classroom[] }>('/classrooms');
    if (list.ok) setClassrooms(list.data.classrooms);
    else setError(list.error.message);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await apiFetch<{ classroom: Classroom }>('/classrooms', { body: { name } });
    setBusy(false);
    if (!r.ok) {
      setError(r.error.message);
      return;
    }
    router.push(`/professor/turmas/${r.data.classroom.id}`);
  };

  const logout = async () => {
    await apiFetch('/auth/logout', { body: {} });
    router.replace('/professor');
  };

  if (!teacher) return <p className="text-sm text-slate-400" role="status">Carregando…</p>;

  const active = (classrooms ?? []).filter((c) => !c.archivedAt);
  const archived = (classrooms ?? []).filter((c) => c.archivedAt);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Minhas turmas</h1>
          <p className="text-sm text-slate-400">Olá, {teacher.displayName}.</p>
        </div>
        <Button variant="secondary" onClick={() => void logout()}>
          Sair
        </Button>
      </div>

      <Card title="Nova turma">
        <form onSubmit={(e) => void create(e)} className="flex flex-wrap items-end gap-3" noValidate>
          <div className="flex-1 min-w-[240px]">
            <Field label="Nome da turma" hint='Ex.: "1º Ano B — Informática". Os alunos entram com o código que aparece depois de criar.'>
              {(p) => <input {...p} className={INPUT} value={name} onChange={(e) => setName(e.target.value)} required />}
            </Field>
          </div>
          <Button type="submit" disabled={busy || name.trim().length < 2}>
            Criar turma
          </Button>
        </form>
        {error && <Notice tone="error">{error}</Notice>}
      </Card>

      <section aria-label="Turmas ativas" className="space-y-2">
        {active.length === 0 && <p className="text-sm text-slate-400">Nenhuma turma ainda.</p>}
        <ul className="grid gap-2 sm:grid-cols-2">
          {active.map((c) => (
            <li key={c.id}>
              <Link
                href={`/professor/turmas/${c.id}`}
                className="flex items-center justify-between gap-3 min-h-[64px] rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 hover:border-cyan-500/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400"
              >
                <span>
                  <span className="block font-bold text-white">{c.name}</span>
                  <span className="block text-xs text-slate-400">{c.joinsOpen ? 'Entradas abertas' : 'Entradas fechadas'}</span>
                </span>
                <span className="font-mono text-lg font-black tracking-widest text-cyan-300" aria-label={`Código ${c.code.split('').join(' ')}`}>
                  {c.code}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {archived.length > 0 && (
        <details className="text-sm text-slate-300">
          <summary className="cursor-pointer min-h-[44px] flex items-center">Turmas arquivadas ({archived.length}) — apagadas automaticamente 12 meses depois de arquivadas</summary>
          <ul className="mt-2 space-y-1">
            {archived.map((c) => (
              <li key={c.id}>
                <Link href={`/professor/turmas/${c.id}`} className="text-cyan-300 hover:underline">
                  {c.name} ({c.code})
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
