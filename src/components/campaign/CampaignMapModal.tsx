'use client';

import React, { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CheckCircle2, Lock, Play, RotateCcw, Star, X } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useProgressStore } from '@/store/useProgressStore';
import { BudgetChallengeSetup } from './BudgetChallengeSetup';
import { CampaignMission, CampaignTrackId, MissionStatus, getMissionStatus } from '@/engine/campaign';
import { CAMPAIGN_TRACKS, missionsOfTrack } from '@/engine/campaignMissions';

const STATUS_LABEL: Record<MissionStatus, string> = {
  LOCKED: 'Bloqueada',
  AVAILABLE: 'Disponível',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
};

const formatTime = (s: number) => `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;

const Stars: React.FC<{ count: number }> = ({ count }) => (
  <span className="flex items-center gap-0.5" aria-label={`${count} de 3 estrelas`}>
    {[1, 2, 3].map((i) => (
      <Star key={i} className={`w-3.5 h-3.5 ${i <= count ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} aria-hidden />
    ))}
  </span>
);

/**
 * Mapa da campanha (#44): uma trilha por módulo de jogo, missões sequenciais com
 * desbloqueio (a N exige a N−1 concluída), estrelas e melhor tempo.
 */
export const CampaignMapModal: React.FC = () => {
  const { isOpen, close, activeId, startMission, startFromScratch } = useAssemblyStore(
    useShallow((s) => ({
      isOpen: s.isCampaignMapOpen,
      close: s.closeCampaignMap,
      activeId: s.activeCampaignMissionId,
      startMission: s.startCampaignMission,
      startFromScratch: s.startFromScratch,
    }))
  );
  const { missionResults, teacherUnlockAll } = useProgressStore(
    useShallow((s) => ({ missionResults: s.missionResults, teacherUnlockAll: s.teacherUnlockAll }))
  );
  const [trackId, setTrackId] = useState<CampaignTrackId>('OFICINA');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const completed = useMemo(() => new Set(Object.keys(missionResults)), [missionResults]);
  const missions = missionsOfTrack(trackId);
  const statusOf = (m: CampaignMission) => getMissionStatus(m, missions, completed, activeId, teacherUnlockAll);
  const selected = missions.find((m) => m.id === selectedId) ?? missions.find((m) => statusOf(m) !== 'COMPLETED' && statusOf(m) !== 'LOCKED') ?? missions[0];

  if (!isOpen) return null;

  const selectedStatus = statusOf(selected);
  const trackDone = (id: CampaignTrackId) => missionsOfTrack(id).filter((m) => completed.has(m.id)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-title"
        className="w-full max-w-6xl max-h-[94vh] overflow-hidden rounded-3xl border border-cyan-700/50 bg-slate-950 shadow-2xl flex flex-col"
      >
        <header className="flex items-center justify-between gap-3 p-4 border-b border-slate-800 bg-slate-900">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-widest text-cyan-400">Campanha</p>
            <h2 id="campaign-title" className="text-lg font-black text-white">Jornada do Técnico</h2>
          </div>
          <button type="button" onClick={close} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer" aria-label="Fechar campanha">
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Trilhas: uma por módulo de jogo */}
        <nav aria-label="Módulos da campanha" className="flex flex-wrap gap-2 p-3 border-b border-slate-800">
          {CAMPAIGN_TRACKS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={trackId === t.id}
              onClick={() => {
                setTrackId(t.id);
                setSelectedId(null);
              }}
              className={`min-h-[44px] px-3 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer border ${
                trackId === t.id ? 'bg-cyan-500 text-slate-950 border-cyan-300' : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-cyan-600'
              }`}
            >
              <span aria-hidden>{t.icon}</span>
              {t.title}
              <span className="font-mono text-[11px] opacity-80">
                {trackDone(t.id)}/{missionsOfTrack(t.id).length}
              </span>
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto grid md:grid-cols-[minmax(0,1fr)_380px] gap-4 p-4">
          {/* Missões da trilha, em ordem */}
          <div className="flex flex-col gap-4 min-w-0">
          <ol className="flex flex-col gap-2" aria-label={`Missões: ${CAMPAIGN_TRACKS.find((t) => t.id === trackId)?.title}`}>
            {missions.map((m) => {
              const status = statusOf(m);
              const result = missionResults[m.id];
              const locked = status === 'LOCKED';
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(m.id)}
                    aria-current={selected.id === m.id ? 'true' : undefined}
                    className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 cursor-pointer ${
                      selected.id === m.id ? 'border-cyan-400 bg-cyan-950/30' : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                    } ${locked ? 'opacity-60' : ''}`}
                  >
                    <span className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center font-mono font-bold text-sm bg-slate-950 border border-slate-700 text-slate-200">
                      {locked ? <Lock className="w-4 h-4" aria-hidden /> : status === 'COMPLETED' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden /> : m.order}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold text-white truncate">{m.title}</span>
                      <span className="block text-[11px] text-slate-400 truncate">{m.lesson}</span>
                    </span>
                    <span className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-[11px] font-mono ${status === 'COMPLETED' ? 'text-emerald-300' : status === 'LOCKED' ? 'text-slate-500' : 'text-cyan-300'}`}>
                        {STATUS_LABEL[status]}
                      </span>
                      {result && <Stars count={result.stars} />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          {/* Modo Orçamento sem turma (#70) */}
          {trackId === 'DESAFIO' && <BudgetChallengeSetup />}
          </div>

          {/* Briefing da missão selecionada */}
          <section aria-label="Briefing da missão" className="rounded-2xl border border-slate-800 bg-slate-900 p-4 flex flex-col gap-3 h-fit">
            <div className="flex items-center gap-3">
              <span className="text-3xl" aria-hidden>{selected.client.avatar}</span>
              <div>
                <p className="text-[11px] font-mono text-slate-400">
                  Missão {selected.order}{selected.act ? ` • Ato ${selected.act}` : ''} — {selected.client.name}, {selected.client.role}
                </p>
                <h3 className="text-base font-black text-white">{selected.title}</h3>
              </div>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{selected.briefing}</p>
            {selected.budgetMax && (
              <p className="text-xs font-mono text-amber-300">Orçamento: R$ {selected.budgetMax.toLocaleString('pt-BR')}</p>
            )}
            <div>
              <p className="text-[11px] font-mono uppercase text-slate-500 mb-1">Objetivos</p>
              <ul className="text-xs text-slate-300 list-disc pl-4 space-y-0.5">
                {selected.objectives.map((o, i) => (
                  <li key={i}>{objectiveHint(o.kind)}</li>
                ))}
              </ul>
            </div>
            {missionResults[selected.id] && (
              <p className="text-xs font-mono text-emerald-300">
                Melhor resultado: {missionResults[selected.id].stars}★ em {formatTime(missionResults[selected.id].bestTimeSeconds)}
              </p>
            )}
            <button
              type="button"
              disabled={selectedStatus === 'LOCKED'}
              onClick={() => startMission(selected.id)}
              className="min-h-[44px] rounded-xl font-bold text-sm flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {selectedStatus === 'LOCKED' ? <Lock className="w-4 h-4" aria-hidden /> : <Play className="w-4 h-4" aria-hidden />}
              {selectedStatus === 'LOCKED'
                ? 'Conclua a missão anterior para liberar'
                : selectedStatus === 'COMPLETED'
                ? 'Jogar de novo'
                : selectedStatus === 'IN_PROGRESS'
                ? 'Recomeçar missão'
                : 'Começar missão'}
            </button>
          </section>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 p-3 border-t border-slate-800 bg-slate-900 text-xs">
          <span className="text-slate-400">O progresso fica salvo neste computador.</span>
          {confirmReset ? (
            <span className="flex items-center gap-2" role="group" aria-label="Confirmar começar do zero">
              <span className="text-rose-300 font-bold">Apagar montagem, estrelas e placar?</span>
              <button
                type="button"
                onClick={() => {
                  startFromScratch();
                  setConfirmReset(false);
                }}
                className="min-h-[36px] px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                Sim, apagar
              </button>
              <button type="button" onClick={() => setConfirmReset(false)} className="min-h-[36px] px-3 rounded-lg bg-slate-800 text-slate-200 cursor-pointer">
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="min-h-[36px] px-3 rounded-lg flex items-center gap-1.5 text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden /> Começar do zero
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

/** Descrição curta do tipo de objetivo para o briefing (o detalhe vem no painel da missão) */
function objectiveHint(kind: CampaignMission['objectives'][number]['kind']): string {
  const hints: Record<CampaignMission['objectives'][number]['kind'], string> = {
    POST_OK: 'Passar no teste de POST',
    POST_FIRST_TRY: 'POST aprovado na primeira tentativa',
    PHASE_REACHED: 'Concluir a etapa de montagem',
    CABLES_COMPLETE: 'Ligar todos os cabos internos',
    NO_ERROR: 'Não cometer o erro da lição',
    BUDGET_MAX: 'Respeitar o orçamento',
    SOCKET: 'Placa-mãe com o soquete certo',
    RAM_TYPE: 'Memória da geração certa',
    RAM_MIN_GB: 'Memória suficiente',
    DUAL_CHANNEL: 'Dual channel',
    STORAGE_MIN: 'Disco com capacidade/velocidade pedidas',
    INTEGRATED_VIDEO: 'Imagem sem placa de vídeo dedicada',
    FPS_MIN: 'Atingir a meta de FPS',
    SCORE_MIN: 'Atingir a pontuação de benchmark',
    BOTTLENECK_MAX: 'PC equilibrado (pouco gargalo)',
    CPU_TEMP_MAX: 'CPU fria no benchmark',
    PSU_RECOMMENDED: 'Fonte recomendada pela placa de vídeo',
    COOLER_OK: 'Cooler à altura do processador',
    FITS_CASE: 'Tudo cabe no gabinete',
    NO_PENALTIES: 'Nenhuma penalidade',
    MAX_PENALTIES: 'Poucas penalidades',
    TIME_MAX: 'Dentro do tempo',
    DIAGNOSTIC_RESOLVED: 'Encontrar e corrigir o defeito',
    DESK_ITEMS: 'Posicionar itens na mesa',
    DESK_STAGE: 'Ligar a estação',
    EXTERNAL_CABLES: 'Conectar os cabos externos',
    MONITOR_SIGNAL: 'Imagem no monitor',
    MONITOR_REFRESH_COHERENT: 'Monitor coerente com o FPS do PC',
    HEADSET: 'Headset com microfone',
    PERIPHERAL_BUDGET_MAX: 'Periféricos dentro do orçamento',
  };
  return hints[kind];
}

export default CampaignMapModal;
