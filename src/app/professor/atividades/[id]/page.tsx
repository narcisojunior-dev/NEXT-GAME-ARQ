'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch } from '@/components/classroom/apiClient';
import { RankingRow, RankingTable } from '@/components/professor/LivePanel';
import { Button, Card, Notice } from '@/components/professor/ui';
import type { Activity } from '@/engine/classroom/types';

interface Report {
  activity: { id: string; classroomId: string; title: string; kind: Activity['kind']; status: Activity['status']; closed: boolean; config: Activity['config'] };
  ranking: RankingRow[];
  highlights: { podium: RankingRow[]; fastest: string[]; bestValue: string[]; cleanBuild: string[]; mostBalanced: string[] } | null;
  distribution: { from: number; to: number; count: number }[];
  commonErrors: { id: string; label: string; total: number; participants: number; skill: string }[];
  flagged: { submissionId: string; displayName: string; attemptNo: number; score: number; reasons: string[] }[];
  submissions: number;
}

/** Relatório da atividade (#79): ranking, destaques, distribuição, erros da turma, sinalizados e CSV */
export default function AtividadePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<Report | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await apiFetch<Report>(`/activities/${id}/results`);
    if (r.ok) setReport(r.data);
    else if (r.error.status === 401) router.replace('/professor');
    else setMessage({ tone: 'error', text: r.error.message });
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (submissionId: string, status: 'VALIDO' | 'INVALIDO') => {
    const r = await apiFetch(`/submissions/${submissionId}`, { method: 'PATCH', body: { status } });
    setMessage(r.ok ? { tone: 'ok', text: status === 'VALIDO' ? 'Envio validado: entra no ranking dos alunos.' : 'Envio invalidado: fica fora do ranking.' } : { tone: 'error', text: r.error.message });
    void load();
  };

  if (!report) return message ? <Notice tone="error">{message.text}</Notice> : <p role="status" className="text-sm text-slate-400">Carregando o relatório…</p>;
  const max = Math.max(1, ...report.distribution.map((d) => d.count));
  const h = report.highlights;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href={`/professor/turmas/${report.activity.classroomId}`} className="text-xs text-slate-400 hover:text-white">
            ← Voltar à turma
          </Link>
          <h1 className="text-2xl font-black mt-1">{report.activity.title}</h1>
          <p className="text-sm text-slate-400">
            {report.activity.closed ? 'Encerrada' : 'Em andamento'} · {report.submissions} envio(s)
          </p>
        </div>
        <a href={`/api/v1/activities/${id}/results.csv`} className="inline-flex items-center min-h-[44px] px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-sm font-bold" download>
          Baixar planilha (CSV)
        </a>
      </div>
      {message && <Notice tone={message.tone}>{message.text}</Notice>}

      <Card title="Ranking">
        <RankingTable rows={report.ranking} caption="Envio escolhido de cada aluno; ⚠ sinalizados ficam fora do ranking dos alunos até você validar" budget={report.activity.kind === 'ORCAMENTO'} />
      </Card>

      {h && (
        <Card title="Destaques">
          <dl className="grid gap-3 sm:grid-cols-2 text-sm">
            {[
              ['🏆 Pódio', h.podium.map((p) => `${p.position}º ${p.displayName}`)],
              ['⚡ Mais rápido', h.fastest],
              ...(report.activity.kind === 'ORCAMENTO' ? [['💰 Melhor custo-benefício', h.bestValue] as [string, string[]]] : []),
              ['🎯 Montagem limpa (zero penalidades)', h.cleanBuild],
              ['⚖️ Mais equilibrado', h.mostBalanced],
            ].map(([label, names]) => (
              <div key={label as string} className="rounded-xl border border-slate-800 p-3">
                <dt className="font-semibold text-slate-200">{label}</dt>
                <dd className="text-slate-300 mt-1">{(names as string[]).length ? (names as string[]).join(', ') : '—'}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <Card title="Distribuição das notas">
        <ul className="space-y-1.5" aria-label="Quantidade de alunos por faixa de pontos">
          {report.distribution.map((d) => (
            <li key={d.from} className="grid grid-cols-[110px_1fr_40px] items-center gap-2 text-sm">
              <span className="font-mono text-slate-400">
                {d.from.toLocaleString('pt-BR')}–{d.to.toLocaleString('pt-BR')}
              </span>
              <span className="h-4 rounded bg-slate-800 overflow-hidden" aria-hidden>
                <span className="block h-full bg-cyan-500" style={{ width: `${(d.count / max) * 100}%` }} />
              </span>
              <span className="font-mono text-right">{d.count}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Erros mais comuns da turma">
        {report.commonErrors.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum erro registrado nos envios.</p>
        ) : (
          <table className="w-full text-sm">
            <caption className="text-left text-xs text-slate-400 pb-2">Do mais frequente para o menos frequente, com a habilidade a reforçar</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                <th scope="col" className="py-2">Erro</th>
                <th scope="col" className="py-2 text-right">Vezes</th>
                <th scope="col" className="py-2 text-right">Alunos</th>
                <th scope="col" className="py-2">Habilidade</th>
              </tr>
            </thead>
            <tbody>
              {report.commonErrors.map((e) => (
                <tr key={e.id} className="border-t border-slate-800">
                  <th scope="row" className="py-2 text-left">{e.label}</th>
                  <td className="py-2 text-right font-mono">{e.total}</td>
                  <td className="py-2 text-right font-mono">{e.participants}</td>
                  <td className="py-2">{e.skill}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title={`Envios sinalizados (${report.flagged.length})`}>
        {report.flagged.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum envio com tempo incoerente.</p>
        ) : (
          <ul className="space-y-2">
            {report.flagged.map((f) => (
              <li key={f.submissionId} className="rounded-xl border border-amber-600/60 bg-amber-950/20 p-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-bold">
                    ⚠ {f.displayName} · tentativa {f.attemptNo} · {f.score.toLocaleString('pt-BR')} pontos
                  </p>
                  <p className="text-xs text-amber-200">{f.reasons.join('; ')}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => void review(f.submissionId, 'VALIDO')} aria-label={`Validar o envio de ${f.displayName}`}>
                    Validar
                  </Button>
                  <Button variant="secondary" onClick={() => void review(f.submissionId, 'INVALIDO')} aria-label={`Invalidar o envio de ${f.displayName}`}>
                    Invalidar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
