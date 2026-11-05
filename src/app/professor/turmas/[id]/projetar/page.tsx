'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiFetch, formatBrl, formatTime } from '@/components/classroom/apiClient';
import type { RankingRow } from '@/components/professor/LivePanel';
import type { Activity, Classroom } from '@/engine/classroom/types';

interface LiveResponse {
  classroom: Classroom;
  activity: (Activity & { open: boolean }) | null;
  participants: { id: string }[];
  ranking: RankingRow[];
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** Telão (#77): tela cheia para o projetor de 1366 × 768, atualiza a cada 5 s */
export default function ProjetarPage() {
  const { id } = useParams<{ id: string }>();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const leader = useRef<string | null>(null);
  const [joinUrl, setJoinUrl] = useState('');

  const refresh = useCallback(async () => {
    const r = await apiFetch<LiveResponse>(`/classrooms/${id}/live`);
    if (!r.ok) return;
    setLive(r.data);
    // Só os envios válidos aparecem no telão; mudança na liderança é anunciada
    const top = r.data.ranking.find((x) => !x.flagged);
    if (top && top.displayName !== leader.current) {
      if (leader.current !== null) setAnnouncement(`${top.displayName} assumiu o 1º lugar com ${top.score.toLocaleString('pt-BR')} pontos.`);
      leader.current = top.displayName;
    }
  }, [id]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => !document.hidden && void refresh(), 5000);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (live) setJoinUrl(`${window.location.host}/t/${live.classroom.code}`);
  }, [live]);

  if (!live) return <p role="status" className="text-xl text-slate-400">Carregando o telão…</p>;
  const ranking = live.ranking.filter((r) => !r.flagged);
  const budget = live.activity?.kind === 'ORCAMENTO';
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-slate-950 text-white p-6 lg:p-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p className="text-lg text-slate-400">{live.classroom.name}</p>
          <h1 className="text-4xl lg:text-5xl font-black">{live.activity ? live.activity.title : 'Aguardando a próxima atividade'}</h1>
        </div>
        <div className="text-right">
          <p className="text-sm uppercase tracking-widest text-slate-400">Entre com o código</p>
          <p className="font-mono text-6xl font-black tracking-[0.2em] text-cyan-300">{live.classroom.code}</p>
          <p className="text-lg text-slate-300">{joinUrl}</p>
        </div>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {ranking.length === 0 ? (
        <p className="mt-16 text-3xl text-slate-400 text-center">{live.participants.length} bancada(s) na turma. O ranking aparece com os primeiros envios.</p>
      ) : (
        <>
          <ol className="mt-10 grid gap-4 md:grid-cols-3" aria-label="Pódio">
            {ranking.slice(0, 3).map((r, i) => (
              <li key={r.participantId} className={`rounded-3xl border-2 p-6 text-center motion-safe:animate-[pulse_3s_ease-in-out_1] ${i === 0 ? 'border-amber-300 bg-amber-500/10' : 'border-slate-700 bg-slate-900'}`}>
                <p className="text-6xl" aria-hidden>
                  {MEDALS[r.position - 1] ?? '🏅'}
                </p>
                <p className="text-sm text-slate-400 mt-1">{r.position}º lugar</p>
                <p className="text-3xl font-black mt-2 break-words">{r.displayName}</p>
                <p className="text-4xl font-mono font-black text-cyan-300 mt-2">{r.score.toLocaleString('pt-BR')}</p>
                <p className="text-base text-slate-400">
                  {formatTime(r.timeSeconds)} · {r.penalties} penalidade(s){budget ? ` · ${formatBrl(r.spent)}` : ''}
                </p>
              </li>
            ))}
          </ol>
          {ranking.length > 3 && (
            <table className="mt-8 w-full text-2xl">
              <caption className="sr-only">Do 4º ao 10º lugar</caption>
              <tbody>
                {ranking.slice(3, 10).map((r) => (
                  <tr key={r.participantId} className="border-t border-slate-800">
                    <td className="py-3 w-24 font-mono font-bold text-slate-400">{r.position}º</td>
                    <th scope="row" className="py-3 text-left font-bold">
                      {r.displayName}
                    </th>
                    <td className="py-3 text-right font-mono">{r.score.toLocaleString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      <Link href={`/professor/turmas/${id}`} className="fixed bottom-4 right-4 min-h-[44px] inline-flex items-center px-4 rounded-xl bg-slate-800 text-sm text-slate-200 hover:bg-slate-700">
        Sair do telão
      </Link>
    </div>
  );
}
