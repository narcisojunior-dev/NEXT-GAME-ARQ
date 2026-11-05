'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Send, Users, LogOut, Play } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useClassroomStore, SubmissionReceipt } from '@/store/useClassroomStore';
import { BUILD_STEP_KEYS, PublicClassroomState, SubmissionBuild } from '@/engine/classroom/types';
import { ACTIVITY_KIND_LABELS } from '@/engine/classroom/validation';
import { buildAssemblyChecklist } from '@/engine/assemblyChecklist';
import { calculateTotalSpent } from '@/engine/compatibility';
import { derivePhase, PHASE_LABELS } from '@/engine/phases';
import { apiFetch, formatBrl } from './apiClient';

const POLL_MS = 10_000;
const PROGRESS_MIN_MS = 15_000;

/** Envio: só ids do catálogo, etapas da montagem e métricas (o servidor recalcula o resto) */
function buildPayload(): { build: SubmissionBuild; metrics: { elapsedSeconds: number; penaltiesCount: number; errorLog: string[]; postAttempts: number } } {
  const s = useAssemblyStore.getState();
  const a = s.assembly;
  return {
    build: {
      motherboardId: s.selectedMotherboard?.id ?? null,
      cpuId: a.cpuInstalled?.id ?? null,
      coolerId: a.coolerInstalled?.id ?? null,
      ramSlot2Id: a.ramInstalledSlot2?.id ?? null,
      ramSlot4Id: a.ramInstalledSlot4?.id ?? null,
      storageId: a.storageInstalled?.id ?? null,
      caseId: a.caseInstalled?.id ?? null,
      psuId: a.psuInstalled?.id ?? null,
      gpuId: a.gpuInstalled?.id ?? null,
      steps: Object.fromEntries(BUILD_STEP_KEYS.map((k) => [k, a[k]])) as SubmissionBuild['steps'],
      ...(s.activeDiagnosticScenario ? { scenarioId: s.activeDiagnosticScenario.id } : {}),
    },
    metrics: { elapsedSeconds: Math.round(s.elapsedSeconds), penaltiesCount: s.penaltiesCount, errorLog: s.missionErrorLog.slice(-200), postAttempts: s.postAttempts },
  };
}

function liveSnapshot() {
  const s = useAssemblyStore.getState();
  const steps = buildAssemblyChecklist(s.assembly, s.selectedMotherboard, { cableConnections: s.cableConnections, bootSuccess: Boolean(s.postResult?.bootSuccess) });
  const phase = PHASE_LABELS.find((p) => p.id === derivePhase(s.assembly, s.selectedMotherboard))?.number ?? 1;
  return {
    phase,
    percent: Math.round((steps.filter((x) => x.isDone).length / steps.length) * 100),
    spent: Math.round(calculateTotalSpent(s.assembly, s.selectedMotherboard)),
    penalties: s.penaltiesCount,
  };
}

const timeLeft = (endsAt: string | null, now: number) => {
  if (!endsAt) return null;
  const s = Math.max(0, Math.round((new Date(endsAt).getTime() - now) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Banner da turma (#78): atividade ativa, começar, progresso ao vivo, envio e minha posição */
export default function ClassroomBanner() {
  const { session, startedActivityId, lastReceipt, markStarted, setReceipt, leave } = useClassroomStore();
  const [state, setState] = useState<PublicClassroomState | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error' | 'info'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const lastPoll = useRef(0);
  const lastProgress = useRef({ at: 0, phase: -1 });

  const kick = useCallback(
    (text: string) => {
      leave();
      setMessage({ tone: 'error', text });
    },
    [leave]
  );

  const poll = useCallback(
    async (manual = false) => {
      if (!session) return;
      if (manual && Date.now() - lastPoll.current < 5000) return;
      lastPoll.current = Date.now();
      const r = await apiFetch<PublicClassroomState>(`/state/${session.code}`);
      if (r.ok) setState(r.data);
      else if (r.error.status === 404) kick('A turma não existe mais. Entre em outra com o código do professor.');
      else if (manual) setMessage({ tone: 'error', text: r.error.message });
    },
    [session, kick]
  );

  // Consulta a cada 10 s (resposta em cache na CDN); pausa com a aba oculta
  useEffect(() => {
    void poll();
    const timer = setInterval(() => {
      setNow(Date.now());
      if (!document.hidden && Date.now() - lastPoll.current >= POLL_MS) void poll();
    }, 1000);
    const onVisibility = () => !document.hidden && void poll();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [poll]);

  const activity = state?.activity ?? null;
  const started = Boolean(activity && startedActivityId === activity.id);

  // Progresso ao vivo: só quando a fase muda, no máximo 1 a cada 15 s
  useEffect(() => {
    if (!session || !activity || !started) return;
    const report = async () => {
      const snap = liveSnapshot();
      const t = Date.now();
      if (snap.phase === lastProgress.current.phase || t - lastProgress.current.at < PROGRESS_MIN_MS) return;
      lastProgress.current = { at: t, phase: snap.phase };
      const r = await apiFetch('/progress', { token: session.token, body: { activityId: activity.id, ...snap } });
      if (!r.ok && r.error.status === 401) kick(r.error.message);
    };
    void report();
    const unsub = useAssemblyStore.subscribe(() => void report());
    const timer = setInterval(() => void report(), PROGRESS_MIN_MS);
    return () => {
      unsub();
      clearInterval(timer);
    };
  }, [session, activity, started, kick]);

  if (!session) return message ? <p role="alert" className="rounded-2xl border border-rose-700/60 bg-rose-950/40 p-3 text-sm text-rose-100">{message.text}</p> : null;

  const start = () => {
    if (!activity) return;
    const game = useAssemblyStore.getState();
    const c = activity.config;
    if (c.kind === 'ORCAMENTO') {
      const { budget, profile, requirements, resolution, targetTimeSeconds } = c.budget;
      const r = game.startBudgetChallenge({ budget, profile, resolution, targetTimeSeconds, ...(requirements ? { requirements } : {}) });
      if (!r.ok) {
        setMessage({ tone: 'error', text: 'Não foi possível abrir o Desafio de Orçamento nesta versão do jogo.' });
        return;
      }
    } else if (c.kind === 'MISSAO_CAMPANHA' || c.kind === 'DESAFIO_EQUIPE') {
      game.startCampaignMission(c.missionId);
    } else if (c.kind === 'DIAGNOSTICO') {
      game.setGameMode('DIAGNOSTICO');
      if (c.scenarioId !== 'SORTEADO') game.selectDiagnosticScenario(c.scenarioId);
    } else {
      game.setGameMode('OFICINA');
    }
    game.closeCampaignMap?.();
    markStarted(activity.id);
    setReceipt(null);
    lastProgress.current = { at: 0, phase: -1 };
    setMessage({ tone: 'info', text: `Atividade "${activity.title}" aberta na bancada. Boa montagem!` });
  };

  const submit = async () => {
    if (!activity) return;
    setBusy(true);
    const r = await apiFetch<Omit<SubmissionReceipt, 'activityId'>>('/submissions', { token: session.token, body: { activityId: activity.id, ...buildPayload() } });
    setBusy(false);
    if (!r.ok) {
      if (r.error.status === 401) kick(r.error.message);
      else setMessage({ tone: 'error', text: r.error.message });
      return;
    }
    setReceipt({ ...r.data, activityId: activity.id });
    setMessage(null);
  };

  const receipt = lastReceipt && activity && lastReceipt.activityId === activity.id ? lastReceipt : null;
  const left = activity ? timeLeft(activity.endsAt, now) : null;
  const own = receipt?.ranking.own;
  return (
    <section aria-label={`Turma ${session.classroomName}`} className="rounded-2xl border border-fuchsia-700/60 bg-slate-950/90 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Users className="w-5 h-5 text-fuchsia-300 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-[11px] font-mono uppercase tracking-wider text-fuchsia-300">
              Turma {session.code} · {session.displayName}
            </p>
            <h2 className="text-sm font-black text-white truncate">{activity ? activity.title : `${session.classroomName}: aguardando o professor ativar uma atividade`}</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {left && (
            <span className="text-xs font-mono text-amber-200" aria-label={`Tempo restante ${left}`}>
              ⏱ {left}
            </span>
          )}
          <button type="button" onClick={() => void poll(true)} className="min-h-[40px] px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 cursor-pointer" aria-label="Atualizar a atividade da turma">
            <RefreshCw className="w-3.5 h-3.5" aria-hidden /> Atualizar
          </button>
          {activity && !started && (
            <button type="button" onClick={start} className="min-h-[40px] px-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
              <Play className="w-3.5 h-3.5" aria-hidden /> Começar atividade
            </button>
          )}
          {activity && started && activity.kind !== 'OFICINA_LIVRE' && (
            <button type="button" onClick={() => void submit()} disabled={busy} className="min-h-[40px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
              <Send className="w-3.5 h-3.5" aria-hidden /> {busy ? 'Enviando…' : 'Enviar resultado'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Sair da turma? Para voltar, entre de novo com o código (um apelido novo).')) leave();
            }}
            className="min-h-[40px] px-3 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden /> Sair da turma
          </button>
        </div>
      </div>

      {activity && (
        <p className="text-xs text-slate-300">
          {ACTIVITY_KIND_LABELS[activity.kind]}
          {activity.config.kind === 'ORCAMENTO' && ` · orçamento ${formatBrl(activity.config.budget.budget)}`}
          {activity.config.instructions && ` · ${activity.config.instructions}`}
        </p>
      )}

      <div role="status" aria-live="polite">
        {message && <p className={`text-xs ${message.tone === 'error' ? 'text-rose-300' : message.tone === 'ok' ? 'text-emerald-300' : 'text-slate-300'}`}>{message.text}</p>}
        {receipt && (
          <div className="rounded-xl border border-emerald-700/60 bg-emerald-950/30 p-3 space-y-1 text-sm">
            <p className="font-bold text-emerald-100">
              Pontuação oficial: {receipt.score.total.toLocaleString('pt-BR')} / 10.000 {receipt.score.completed ? '· concluído' : '· não concluído'}
            </p>
            <p className="text-xs text-slate-300">
              {own && own.position > 0 ? `Você está em ${own.position}º de ${receipt.ranking.participants}. ` : 'O ranking aparece quando o professor liberar. '}
              Tentativa {receipt.attemptNo}; {receipt.attemptsLeft > 0 ? `restam ${receipt.attemptsLeft}.` : 'não restam tentativas.'}
            </p>
            {receipt.status === 'SINALIZADO' && <p className="text-xs text-amber-200">⚠ Envio em revisão pelo professor: {receipt.flags.join('; ')}.</p>}
            {receipt.ranking.top.length > 0 && (
              <ol className="text-xs text-slate-300 grid gap-0.5 sm:grid-cols-2" aria-label="Top 10 da atividade">
                {receipt.ranking.top.map((t) => (
                  <li key={t.participantId} className={t.participantId === session.participantId ? 'font-bold text-white' : ''}>
                    {t.position}º {t.displayName} — {t.score.toLocaleString('pt-BR')}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
