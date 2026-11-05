'use client';

import React, { useMemo } from 'react';
import { Download, BarChart3, BookOpen } from 'lucide-react';
import { useProgressStore } from '@/store/useProgressStore';
import { CERTIFICATE_SKILLS, ERROR_TYPES, TeamErrors, buildClassReport, classReportCsv, countsToTally } from '@/engine/classReport';

/**
 * Relatório da turma (#34): erros mais comuns (a partir dos códigos verificáveis digitados no
 * placar), tabela por equipe, exportação CSV e o mapa das habilidades do certificado na BNCC.
 */
export const ClassReportPanel: React.FC = () => {
  const leaderboard = useProgressStore((s) => s.leaderboard);
  const entries: TeamErrors[] = useMemo(
    () =>
      leaderboard.map((e) => ({
        teamName: e.teamName,
        totalScore: e.totalScore,
        timeSpentSeconds: e.timeSpentSeconds,
        code: e.code,
        tally: e.errorCounts ? countsToTally(e.errorCounts) : null,
      })),
    [leaderboard]
  );
  const report = useMemo(() => buildClassReport(entries), [entries]);
  const maxTotal = report.mostCommon[0]?.total ?? 1;

  const downloadCsv = () => {
    const blob = new Blob([classReportCsv(entries)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-turma-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <section aria-labelledby="erros-comuns" className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="erros-comuns" className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            Erros mais comuns da turma
          </h3>
          <button
            type="button"
            onClick={downloadCsv}
            disabled={entries.length === 0}
            className="flex min-h-[44px] items-center gap-1.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        </div>
        <p className="text-[11px] text-slate-400">
          {report.teams} equipe{report.teams === 1 ? '' : 's'} no placar · {report.teamsWithErrorData} com contagem de erros no código
          {report.teams > report.teamsWithErrorData && ' (códigos antigos não trazem a contagem)'}.
        </p>
        {report.mostCommon.length === 0 ? (
          <p className="text-xs text-slate-400">Nenhum erro registrado ainda. Digite os códigos das bancadas no Projetor de Sala.</p>
        ) : (
          <ol className="space-y-2">
            {report.mostCommon.map((row) => (
              <li key={row.id} className="text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-200 font-semibold">{row.label}</span>
                  <span className="font-mono text-slate-300">
                    {row.total} erro{row.total === 1 ? '' : 's'} · {row.teamsAffected} equipe{row.teamsAffected === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-slate-800" aria-hidden>
                  <div className="h-2 rounded-full bg-rose-500" style={{ width: `${(row.total / maxTotal) * 100}%` }} />
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Reforçar: {row.skill.label} ({row.skill.bnccComputacao.map((b) => b.code).join(', ')})
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {entries.length > 0 && (
        <section aria-labelledby="erros-por-equipe" className="p-4 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
          <h3 id="erros-por-equipe" className="text-sm font-bold text-white mb-3">
            Erros por equipe
          </h3>
          <table className="w-full text-[11px] text-left">
            <thead className="text-slate-400">
              <tr>
                <th scope="col" className="py-1 pr-3">Equipe</th>
                <th scope="col" className="py-1 pr-3">Pontos</th>
                {ERROR_TYPES.map((t) => (
                  <th key={t.id} scope="col" className="py-1 pr-2 font-mono" title={t.label}>
                    {t.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {entries.map((e) => (
                <tr key={e.code} className="border-t border-slate-800">
                  <th scope="row" className="py-1 pr-3 font-semibold">{e.teamName}</th>
                  <td className="py-1 pr-3 font-mono">{e.totalScore.toLocaleString('pt-BR')}</td>
                  {ERROR_TYPES.map((t) => (
                    <td key={t.id} className="py-1 pr-2 font-mono">
                      {e.tally ? e.tally[t.id] ?? 0 : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section aria-labelledby="mapa-bncc" className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <h3 id="mapa-bncc" className="text-sm font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-400" />
          Habilidades do certificado × BNCC
        </h3>
        <p className="text-[11px] text-slate-400">
          Proposta de alinhamento com a BNCC Computação do Ensino Médio (complemento à BNCC, Parecer CNE/CEB nº 2/2022) e com as
          competências gerais da BNCC. Revise com a coordenação antes de usar em documentos oficiais.
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {CERTIFICATE_SKILLS.map((skill) => (
            <li key={skill.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
              <div className="font-semibold text-slate-100">{skill.label}</div>
              {[...skill.bnccComputacao, ...skill.bnccGeral].map((b) => (
                <div key={b.code} className="mt-1 text-[11px] text-slate-400">
                  <span className="font-mono text-emerald-300">{b.code}</span> — {b.summary}
                </div>
              ))}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};
