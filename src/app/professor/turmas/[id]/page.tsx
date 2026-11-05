'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/components/classroom/apiClient';
import { ActivityForm } from '@/components/professor/ActivityForm';
import { LiveParticipant, ParticipantGrid, RankingRow, RankingTable } from '@/components/professor/LivePanel';
import { Button, Card, Notice } from '@/components/professor/ui';
import { ACTIVITY_KIND_LABELS } from '@/engine/classroom/validation';
import type { Activity, Classroom } from '@/engine/classroom/types';

interface LiveResponse {
  classroom: Classroom;
  activity: (Activity & { open: boolean }) | null;
  participants: LiveParticipant[];
  ranking: RankingRow[];
  serverTime: string;
}

const STATUS_LABEL: Record<Activity['status'], string> = { RASCUNHO: 'Rascunho', ATIVA: 'Ativa', ENCERRADA: 'Encerrada' };
const POLL_MS = 5000;

/** Painel da turma (#76, #77): código, atividades, acompanhamento ao vivo e moderação */
export default function TurmaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [live, setLive] = useState<LiveResponse | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [classRanking, setClassRanking] = useState<{ ranking: { position: number; participantId: string; nickname: string; total: number; activitiesDone: number }[]; closedActivities: number } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshLive = useCallback(async () => {
    const r = await apiFetch<LiveResponse>(`/classrooms/${id}/live`);
    if (r.ok) setLive(r.data);
    else if (r.error.status === 401) router.replace('/professor');
    else if (r.error.status === 404) router.replace('/professor/turmas');
  }, [id, router]);

  const refreshActivities = useCallback(async () => {
    const r = await apiFetch<{ activities: Activity[] }>(`/classrooms/${id}/activities`);
    if (r.ok) setActivities(r.data.activities);
  }, [id]);

  // Consulta a cada 5 s; pausa com a aba oculta (economia do plano Hobby)
  useEffect(() => {
    void refreshLive();
    void refreshActivities();
    const start = () => {
      if (!timer.current) timer.current = setInterval(() => void refreshLive(), POLL_MS);
    };
    const stop = () => {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
    };
    const onVisibility = () => (document.hidden ? stop() : (void refreshLive(), start()));
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshLive, refreshActivities]);

  useEffect(() => {
    if (live) setJoinUrl(`${window.location.origin}/t/${live.classroom.code}`);
  }, [live]);

  const patchClassroom = async (patch: Record<string, unknown>, ok: string) => {
    const r = await apiFetch(`/classrooms/${id}`, { method: 'PATCH', body: patch });
    setMessage(r.ok ? { tone: 'ok', text: ok } : { tone: 'error', text: r.error.message });
    void refreshLive();
  };

  const patchActivity = async (activityId: string, body: Record<string, unknown>, ok: string) => {
    const r = await apiFetch(`/activities/${activityId}`, { method: 'PATCH', body });
    setMessage(r.ok ? { tone: 'ok', text: ok } : { tone: 'error', text: r.error.message });
    void refreshActivities();
    void refreshLive();
  };

  const removeParticipant = async (p: LiveParticipant) => {
    if (!window.confirm(`Remover ${p.displayName} da turma? Os envios dessa bancada também serão apagados.`)) return;
    const r = await apiFetch(`/participants/${p.id}`, { method: 'DELETE' });
    setMessage(r.ok ? { tone: 'ok', text: `${p.displayName} foi removido(a).` } : { tone: 'error', text: r.error.message });
    void refreshLive();
  };

  const deleteClassroom = async () => {
    const r = await apiFetch(`/classrooms/${id}`, { method: 'DELETE' });
    if (r.ok) router.replace('/professor/turmas');
    else setMessage({ tone: 'error', text: r.error.message });
  };

  const loadClassRanking = async () => {
    const r = await apiFetch<NonNullable<typeof classRanking>>(`/classrooms/${id}/ranking`);
    if (r.ok) setClassRanking(r.data);
  };

  if (!live) return <p role="status" className="text-sm text-slate-400">Carregando a turma…</p>;
  const { classroom } = live;
  const stalled = live.participants.filter((p) => p.live && new Date(live.serverTime).getTime() - new Date(p.live.updatedAt).getTime() > 3 * 60 * 1000).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/professor/turmas" className="text-xs text-slate-400 hover:text-white">
            ← Minhas turmas
          </Link>
          <h1 className="text-2xl font-black mt-1">{classroom.name}</h1>
          <p className="text-sm text-slate-400">
            {live.participants.length} bancada(s) · {classroom.joinsOpen ? 'entradas abertas' : 'entradas fechadas'}
            {classroom.archivedAt ? ' · arquivada' : ''}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-slate-400">Código da turma</p>
          <p className="font-mono text-4xl font-black tracking-[0.2em] text-cyan-300" aria-label={`Código ${classroom.code.split('').join(' ')}`}>
            {classroom.code}
          </p>
          <p className="text-xs text-slate-400 break-all">{joinUrl}</p>
        </div>
      </div>

      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <div className="flex flex-wrap gap-2">
        <Link href={`/professor/turmas/${id}/projetar`} className="inline-flex items-center min-h-[44px] px-4 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-sm font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-fuchsia-300">
          Projetar no telão
        </Link>
        <Button variant="secondary" onClick={() => void patchClassroom({ joinsOpen: !classroom.joinsOpen }, classroom.joinsOpen ? 'Entradas fechadas: ninguém novo entra.' : 'Entradas abertas.')}>
          {classroom.joinsOpen ? 'Fechar entradas' : 'Abrir entradas'}
        </Button>
        <Button variant="secondary" onClick={() => void patchClassroom({ archived: !classroom.archivedAt }, classroom.archivedAt ? 'Turma restaurada.' : 'Turma arquivada: será apagada 12 meses depois.')}>
          {classroom.archivedAt ? 'Desarquivar' : 'Arquivar turma'}
        </Button>
        {confirmDelete ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-rose-200">Apagar a turma, as atividades e todos os envios?</span>
            <Button variant="danger" onClick={() => void deleteClassroom()}>
              Sim, excluir
            </Button>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
          </span>
        ) : (
          <Button variant="ghost" onClick={() => setConfirmDelete(true)}>
            Excluir turma
          </Button>
        )}
      </div>

      <Card title="Atividades">
        {activities.length === 0 && <p className="text-sm text-slate-400">Crie a primeira atividade abaixo. Ela começa como rascunho; ative quando a turma estiver pronta.</p>}
        <ul className="space-y-2">
          {activities.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <div>
                <p className="font-bold text-white">{a.title}</p>
                <p className="text-xs text-slate-400">
                  {ACTIVITY_KIND_LABELS[a.kind]} · <span className={a.status === 'ATIVA' ? 'text-emerald-300 font-bold' : ''}>{STATUS_LABEL[a.status]}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {a.status === 'RASCUNHO' && <Button onClick={() => void patchActivity(a.id, { status: 'ATIVA' }, `"${a.title}" ativa: os alunos recebem em até 30 s.`)}>Ativar</Button>}
                {a.status === 'ATIVA' && (
                  <Button variant="secondary" onClick={() => void patchActivity(a.id, { status: 'ENCERRADA' }, `"${a.title}" encerrada.`)}>
                    Encerrar
                  </Button>
                )}
                {a.config.kind === 'ORCAMENTO' && !a.config.referenceRevealed && a.status !== 'RASCUNHO' && (
                  <Button variant="secondary" onClick={() => void patchActivity(a.id, { revealReference: true }, 'Build de referência revelada para os alunos.')}>
                    Revelar referência
                  </Button>
                )}
                {a.status !== 'RASCUNHO' && (
                  <Link href={`/professor/atividades/${a.id}`} className="inline-flex items-center min-h-[44px] px-4 rounded-xl border border-slate-700 text-sm font-bold text-cyan-300 hover:bg-slate-800">
                    Resultados
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
        <details className="rounded-xl border border-slate-800 p-3">
          <summary className="cursor-pointer font-semibold min-h-[32px]">Nova atividade</summary>
          <div className="mt-3">
            <ActivityForm
              classroomId={id}
              onCreated={(a) => {
                setMessage({ tone: 'ok', text: `Atividade "${a.title}" criada como rascunho.` });
                void refreshActivities();
              }}
            />
          </div>
        </details>
      </Card>

      <Card title={live.activity ? `Ao vivo: ${live.activity.title}` : 'Ao vivo'} actions={stalled > 0 ? <span className="text-xs font-bold text-amber-300">⚠ {stalled} bancada(s) parada(s)</span> : null}>
        {!live.activity && <p className="text-sm text-slate-400">Nenhuma atividade ativa. Os alunos que entrarem aparecem aqui.</p>}
        <ParticipantGrid participants={live.participants} serverTime={live.serverTime} onRemove={(p) => void removeParticipant(p)} />
        {live.activity && <RankingTable rows={live.ranking} caption="Ranking da atividade ativa (inclui envios sinalizados, marcados com ⚠)" budget={live.activity.kind === 'ORCAMENTO'} />}
      </Card>

      <Card title="Ranking da turma" actions={<Button variant="secondary" onClick={() => void loadClassRanking()}>Calcular</Button>}>
        {classRanking ? (
          classRanking.ranking.length ? (
            <table className="w-full text-sm">
              <caption className="text-left text-xs text-slate-400 pb-2">Soma das {classRanking.closedActivities} atividade(s) encerrada(s)</caption>
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  <th scope="col" className="py-2">Pos.</th>
                  <th scope="col" className="py-2">Apelido</th>
                  <th scope="col" className="py-2 text-right">Total</th>
                  <th scope="col" className="py-2 text-right">Atividades feitas</th>
                </tr>
              </thead>
              <tbody>
                {classRanking.ranking.map((r) => (
                  <tr key={r.participantId} className="border-t border-slate-800">
                    <td className="py-2 font-mono font-bold">{r.position}º</td>
                    <th scope="row" className="py-2 text-left">{r.nickname}</th>
                    <td className="py-2 text-right font-mono">{r.total.toLocaleString('pt-BR')}</td>
                    <td className="py-2 text-right font-mono">
                      {r.activitiesDone}/{classRanking.closedActivities}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-400">Ainda não há atividades encerradas com envios.</p>
          )
        ) : (
          <p className="text-sm text-slate-400">Soma o resultado de cada aluno nas atividades encerradas e mostra quem faltou.</p>
        )}
      </Card>
    </div>
  );
}
