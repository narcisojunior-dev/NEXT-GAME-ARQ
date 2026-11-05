'use client';

import React from 'react';
import { formatBrl, formatTime } from '@/components/classroom/apiClient';
import { PHASE_LABELS } from '@/engine/phases';
import type { LiveState } from '@/engine/classroom/types';
import { Button } from './ui';

export interface LiveParticipant {
  id: string;
  displayName: string;
  joinedAt: string;
  live: LiveState | null;
  submissions: number;
}

export interface RankingRow {
  position: number;
  participantId: string;
  displayName: string;
  score: number;
  completed: boolean;
  spent: number;
  penalties: number;
  timeSeconds: number;
  bottleneckPercent: number;
  attempts: number;
  flagged: boolean;
}

/** Sem novidade há 3 minutos: o professor passa na bancada */
export const STALLED_MS = 3 * 60 * 1000;

const phaseLabel = (n: number) => PHASE_LABELS.find((p) => p.number === n)?.label ?? `Fase ${n}`;

export function ParticipantGrid({ participants, serverTime, onRemove }: { participants: LiveParticipant[]; serverTime: string; onRemove: (p: LiveParticipant) => void }) {
  const now = new Date(serverTime).getTime();
  if (participants.length === 0) return <p className="text-sm text-slate-400">Ninguém entrou ainda. Mostre o código da turma no quadro.</p>;
  return (
    <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Bancadas">
      {participants.map((p) => {
        const stalled = p.live ? now - new Date(p.live.updatedAt).getTime() > STALLED_MS : false;
        return (
          <li key={p.id} className={`rounded-xl border p-3 space-y-1.5 ${stalled ? 'border-amber-500/70 bg-amber-950/20' : 'border-slate-800 bg-slate-950/50'}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-white break-words">{p.displayName}</p>
              <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">{p.submissions} envio(s)</span>
            </div>
            {p.live ? (
              <>
                <p className="text-xs text-slate-300">{phaseLabel(p.live.phase)}</p>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden" role="progressbar" aria-label={`Checklist de ${p.displayName}`} aria-valuenow={p.live.percent} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full bg-cyan-400" style={{ width: `${p.live.percent}%` }} />
                </div>
                <p className="text-xs font-mono text-slate-400">
                  {p.live.percent}% · {formatBrl(p.live.spent)} · {p.live.penalties} penalidade(s)
                </p>
                {stalled && <p className="text-xs font-bold text-amber-300">⚠ Parado há mais de 3 min</p>}
              </>
            ) : (
              <p className="text-xs text-slate-500">Ainda não começou a atividade.</p>
            )}
            <Button variant="ghost" className="!min-h-[36px] !px-2 text-xs" onClick={() => onRemove(p)} aria-label={`Remover ${p.displayName} da turma`}>
              Remover
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export function RankingTable({ rows, caption, budget }: { rows: RankingRow[]; caption: string; budget?: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">Nenhum envio ainda.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="text-left text-xs text-slate-400 pb-2">{caption}</caption>
        <thead>
          <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
            <th scope="col" className="py-2 pr-3">Pos.</th>
            <th scope="col" className="py-2 pr-3">Apelido</th>
            <th scope="col" className="py-2 pr-3 text-right">Pontos</th>
            <th scope="col" className="py-2 pr-3">Concluiu</th>
            {budget && <th scope="col" className="py-2 pr-3 text-right">Gasto</th>}
            <th scope="col" className="py-2 pr-3 text-right">Tempo</th>
            <th scope="col" className="py-2 pr-3 text-right">Penal.</th>
            <th scope="col" className="py-2 text-right">Tent.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.participantId} className="border-t border-slate-800">
              <td className="py-2 pr-3 font-mono font-bold">{r.position}º</td>
              <th scope="row" className="py-2 pr-3 text-left font-semibold">
                {r.displayName} {r.flagged && <span className="text-amber-300 text-xs">⚠ sinalizado</span>}
              </th>
              <td className="py-2 pr-3 text-right font-mono">{r.score.toLocaleString('pt-BR')}</td>
              <td className="py-2 pr-3">{r.completed ? 'Sim' : 'Não'}</td>
              {budget && <td className="py-2 pr-3 text-right font-mono">{formatBrl(r.spent)}</td>}
              <td className="py-2 pr-3 text-right font-mono">{formatTime(r.timeSeconds)}</td>
              <td className="py-2 pr-3 text-right font-mono">{r.penalties}</td>
              <td className="py-2 text-right font-mono">{r.attempts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
