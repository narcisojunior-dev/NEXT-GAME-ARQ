'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { CheckCircle2, Star, XCircle } from 'lucide-react';
import { missionById, useAssemblyStore } from '@/store/useAssemblyStore';
import { useProgressStore } from '@/store/useProgressStore';
import { getMissionStatus } from '@/engine/campaign';
import { missionsOfTrack } from '@/engine/campaignMissions';

/**
 * Debriefing da missão (#44, #27): reação do cliente, objetivos cumpridos e não cumpridos
 * com a explicação de cada um, a armadilha da lição e a pergunta de fixação.
 */
export const MissionDebriefModal: React.FC = () => {
  const { debrief, close, startMission, openMap } = useAssemblyStore(
    useShallow((s) => ({
      debrief: s.missionDebrief,
      close: s.closeMissionDebrief,
      startMission: s.startCampaignMission,
      openMap: s.openCampaignMap,
    }))
  );
  const { missionResults, recordAnswer, teacherUnlockAll } = useProgressStore(
    useShallow((s) => ({ missionResults: s.missionResults, recordAnswer: s.recordAnswer, teacherUnlockAll: s.teacherUnlockAll }))
  );
  const [answer, setAnswer] = useState<number | null>(null);
  // Cada entrega abre um debriefing novo: a pergunta volta a ficar sem resposta
  useEffect(() => setAnswer(null), [debrief]);

  const mission = useAssemblyStore((s) => (debrief ? missionById(s, debrief.missionId) : null));
  const budgetReference = useAssemblyStore((s) => s.budgetChallenge?.reference ?? null);
  const next = useMemo(() => {
    // Desafio de Orçamento é avulso: não abre a próxima missão da trilha
    if (!mission || debrief?.budgetScore) return null;
    const track = missionsOfTrack(mission.track);
    const candidate = track.find((m) => m.order === mission.order + 1) ?? null;
    if (!candidate) return null;
    const completed = new Set(Object.keys(missionResults));
    return getMissionStatus(candidate, track, completed, null, teacherUnlockAll) === 'LOCKED' ? null : candidate;
  }, [mission, missionResults, teacherUnlockAll, debrief]);

  if (!debrief || !mission) return null;
  const { evaluation } = debrief;
  const answered = answer !== null;

  const choose = (index: number) => {
    if (answered) return;
    setAnswer(index);
    // Registrada para o professor; não bloqueia a próxima missão
    if (evaluation.completed) recordAnswer(mission.id, index === mission.question.correctIndex);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm">
      <div role="dialog" aria-modal="true" aria-labelledby="debrief-title" className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 shadow-2xl p-5 flex flex-col gap-4">
        <header className="text-center">
          <span className="text-4xl" aria-hidden>{mission.client.avatar}</span>
          <h2 id="debrief-title" className="text-xl font-black text-white mt-1">
            {evaluation.completed ? `${mission.client.name} aprovou a entrega!` : 'Ainda não dá para entregar'}
          </h2>
          {evaluation.completed && (
            <p className="flex justify-center gap-1 mt-2" aria-label={`${evaluation.stars} de 3 estrelas`}>
              {[1, 2, 3].map((i) => (
                <Star key={i} className={`w-7 h-7 ${i <= evaluation.stars ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`} aria-hidden />
              ))}
            </p>
          )}
        </header>

        {debrief.budgetScore && (
          <section aria-labelledby="pontos-orcamento" className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-3 text-sm">
            <h3 id="pontos-orcamento" className="font-black text-amber-200">
              Pontuação do Desafio de Orçamento: {debrief.budgetScore.total.toLocaleString('pt-BR')} / 10.000
              {!debrief.budgetScore.completed && <span className="block text-xs font-normal text-rose-300">Não concluído: fica abaixo de todos os concluídos no ranking.</span>}
            </h3>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
              {debrief.budgetScore.parts.map((part) => (
                <React.Fragment key={part.key}>
                  <dt className="text-slate-200">
                    {part.label}
                    <span className="block text-xs text-slate-400">{part.explanation}</span>
                  </dt>
                  <dd className="font-mono text-amber-100 text-right">
                    {part.points.toLocaleString('pt-BR')} / {part.max.toLocaleString('pt-BR')}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
            {budgetReference && (
              <table className="mt-3 w-full text-xs text-slate-300">
                <caption className="text-left font-bold text-white mb-1">Sua montagem × melhor PC possível com esse orçamento</caption>
                <thead>
                  <tr className="text-slate-400">
                    <th scope="col" className="text-left font-normal" />
                    <th scope="col" className="text-right font-normal">Você</th>
                    <th scope="col" className="text-right font-normal">Referência</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr>
                    <th scope="row" className="text-left font-normal">Gasto</th>
                    <td className="text-right">R$ {debrief.budgetScore.totalSpent.toLocaleString('pt-BR')}</td>
                    <td className="text-right">R$ {budgetReference.cost.toLocaleString('pt-BR')}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="text-left font-normal">FPS médio</th>
                    <td className="text-right">{debrief.budgetScore.benchmark.avgFps}</td>
                    <td className="text-right">{budgetReference.avgFps}</td>
                  </tr>
                  <tr>
                    <th scope="row" className="text-left font-normal">Gargalo</th>
                    <td className="text-right">{debrief.budgetScore.benchmark.bottleneckPercent}%</td>
                    <td className="text-right">{budgetReference.bottleneckPercent}%</td>
                  </tr>
                </tbody>
              </table>
            )}
          </section>
        )}

        <section aria-label="Objetivos">
          <ul className="flex flex-col gap-1.5">
            {[...evaluation.required, ...evaluation.bonus].map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {r.met ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" aria-hidden /> : <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" aria-hidden />}
                <span>
                  <span className={r.met ? 'text-emerald-200' : 'text-rose-200'}>
                    {i >= evaluation.required.length ? 'Bônus: ' : ''}
                    {r.label}
                  </span>
                  {r.explanation && <span className="block text-xs text-slate-400">{r.explanation}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {evaluation.completed && (
          <>
            <section className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm text-slate-300">
              <p className="font-bold text-white mb-1">A lição: {mission.lesson}</p>
              <p>{mission.debriefing}</p>
              <p className="mt-2 text-amber-200">
                <b>Armadilha:</b> {mission.trap}
              </p>
            </section>

            <fieldset className="rounded-xl border border-cyan-800/60 bg-cyan-950/20 p-3">
              <legend className="px-1 text-xs font-mono text-cyan-300">Pergunta de fixação</legend>
              <p className="text-sm font-bold text-white mb-2">{mission.question.prompt}</p>
              <div className="flex flex-col gap-1.5">
                {mission.question.options.map((option, i) => {
                  const isCorrect = i === mission.question.correctIndex;
                  const tone = !answered ? 'border-slate-700 hover:border-cyan-500' : isCorrect ? 'border-emerald-500 bg-emerald-950/40' : i === answer ? 'border-rose-500 bg-rose-950/40' : 'border-slate-800 opacity-60';
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-pressed={answer === i}
                      disabled={answered}
                      onClick={() => choose(i)}
                      className={`min-h-[40px] text-left px-3 rounded-lg border text-sm text-slate-200 cursor-pointer disabled:cursor-default ${tone}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              {answered && (
                <p role="status" className="mt-2 text-xs text-slate-300">
                  {answer === mission.question.correctIndex ? 'Correto! ' : 'Quase. '}
                  {mission.question.explanation}
                </p>
              )}
            </fieldset>
          </>
        )}

        <footer className="flex flex-wrap justify-end gap-2">
          {!evaluation.completed ? (
            <button type="button" onClick={close} className="min-h-[44px] px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold cursor-pointer">
              Continuar a missão
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  close();
                  openMap();
                }}
                className="min-h-[44px] px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold cursor-pointer"
              >
                Voltar ao mapa
              </button>
              {next && (
                <button
                  type="button"
                  onClick={() => {
                    close();
                    startMission(next.id);
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black cursor-pointer"
                >
                  Próxima missão: {next.title}
                </button>
              )}
            </>
          )}
        </footer>
      </div>
    </div>
  );
};

export default MissionDebriefModal;
