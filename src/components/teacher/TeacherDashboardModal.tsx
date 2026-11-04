'use client';

import React, { useState } from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useShallow } from 'zustand/react/shallow';
import { certificateBadge } from '@/engine/teacherDashboard';
import { DecodeResult, decodeValidationCode } from '@/engine/validationCode';
import { useProgressStore } from '@/store/useProgressStore';
import {
  GraduationCap,
  Trophy,
  FileCheck2,
  Printer,
  X,
  Search,
  CheckCircle2,
  XCircle,
  Award,
  Sparkles,
  School,
  Clock,
  Coins,
  ShieldCheck,
} from 'lucide-react';

export const TeacherDashboardModal: React.FC = () => {
  const {
    isTeacherDashboardOpen,
    closeTeacherDashboard,
    teamName,
    calculateFinalScore,
    assembly,
    selectedMotherboard,
  } = useAssemblyStore(
    useShallow((s) => ({
      isTeacherDashboardOpen: s.isTeacherDashboardOpen,
      closeTeacherDashboard: s.closeTeacherDashboard,
      teamName: s.teamName,
      calculateFinalScore: s.calculateFinalScore,
      assembly: s.assembly,
      selectedMotherboard: s.selectedMotherboard,
    }))
  );

  const [activeTab, setActiveTab] = useState<'LEADERBOARD' | 'CERTIFICATE' | 'VALIDATOR'>('LEADERBOARD');
  const [searchHash, setSearchHash] = useState<string>('');
  const [decoded, setDecoded] = useState<DecodeResult | null>(null);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);

  // Placar persistente (#29): só entra quem tem código com selo válido
  const { leaderboard, addLeaderboardCode, removeLeaderboardEntry, recordTeamResult, teacherUnlockAll, setTeacherUnlockAll } =
    useProgressStore(
      useShallow((s) => ({
        leaderboard: s.leaderboard,
        addLeaderboardCode: s.addLeaderboardCode,
        removeLeaderboardEntry: s.removeLeaderboardEntry,
        recordTeamResult: s.recordTeamResult,
        teacherUnlockAll: s.teacherUnlockAll,
        setTeacherUnlockAll: s.setTeacherUnlockAll,
      }))
    );

  const scoreData = calculateFinalScore();

  if (!isTeacherDashboardOpen) return null;

  // Registrar a pontuação atual da equipe no placar (pelo próprio código verificável)
  const handleRegisterCurrentScore = () => {
    const result = addLeaderboardCode(scoreData.hashValidation);
    recordTeamResult(teamName || 'Equipe', scoreData.totalScore, scoreData.timeSpentSeconds);
    setRegisterMessage(result.ok ? 'Nota lançada no placar.' : 'Esta nota já está no placar.');
  };

  const handleValidateHash = (e: React.FormEvent) => {
    e.preventDefault();
    setDecoded(decodeValidationCode(searchHash));
  };

  const handleAddDecoded = () => {
    const result = addLeaderboardCode(searchHash);
    setRegisterMessage(result.ok ? `${result.entry.teamName} entrou no placar.` : 'Este código já está no placar.');
    setActiveTab('LEADERBOARD');
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-5xl h-[94vh] max-h-[880px] bg-slate-950 border-2 border-indigo-500/50 rounded-3xl shadow-2xl flex flex-col overflow-hidden font-sans">
        {/* Cabeçalho do Painel do Professor */}
        <header className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-950 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <School className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  Gestão Escolar
                </span>
                <span className="text-xs text-slate-400">
                  Ensino Médio • Informática & Hardware
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                Painel do Professor & Leaderboard da Turma
              </h2>
            </div>
          </div>

          {/* Abas do Painel */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('LEADERBOARD')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'LEADERBOARD' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Projetor de Sala</span>
            </button>

            <button
              onClick={() => setActiveTab('CERTIFICATE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'CERTIFICATE' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCheck2 className="w-3.5 h-3.5" />
              <span>Certificado A4</span>
            </button>

            <button
              onClick={() => setActiveTab('VALIDATOR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'VALIDATOR' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Validar Hash</span>
            </button>
          </div>

          <button
            onClick={closeTeacherDashboard}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {/* Corpo do Painel */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950">
          {/* ABA 1: PROJETOR DE SALA (LEADERBOARD) */}
          {activeTab === 'LEADERBOARD' && (
            <div className="space-y-6">
              {/* Barra de Filtro e Registro Rápido */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={teacherUnlockAll}
                    onChange={(e) => setTeacherUnlockAll(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500"
                  />
                  Modo professor: liberar todas as missões da campanha
                </label>

                <button
                  onClick={handleRegisterCurrentScore}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-md transition-all cursor-pointer hover:from-emerald-400"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Lançar Nota Atual de &quot;{teamName || 'Equipe'}&quot; ({scoreData.totalScore} pts)</span>
                </button>
              </div>
              {registerMessage && (
                <p role="status" className="text-xs text-emerald-300 font-mono">
                  {registerMessage}
                </p>
              )}
              {leaderboard.length === 0 && (
                <p className="text-sm text-slate-400 p-4 rounded-2xl border border-dashed border-slate-700">
                  O placar está vazio. Lance a nota atual ou valide o código que cada equipe apresentar na aba de validação.
                </p>
              )}

              {/* Tabela de Alto Contraste para Projetores de Sala */}
              <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/90 shadow-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 text-[11px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800">
                      <th className="py-3 px-4">Posição</th>
                      <th className="py-3 px-4">Equipe / Aluno</th>
                      <th className="py-3 px-4">Certificado</th>
                      <th className="py-3 px-4">Pontuação Total</th>
                      <th className="py-3 px-4">Tempo</th>
                      <th className="py-3 px-4">Código de Autenticação</th>
                      <th className="py-3 px-4"><span className="sr-only">Ações</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {leaderboard.map((entry, index) => {
                      const isTop3 = index < 3;
                      const podiumColors = [
                        'text-yellow-400 font-black',
                        'text-slate-300 font-bold',
                        'text-amber-500 font-bold',
                      ];

                      return (
                        <tr
                          key={entry.code}
                          className={`hover:bg-slate-800/50 transition-colors ${
                            index === 0 ? 'bg-yellow-500/5' : ''
                          }`}
                        >
                          <td className="py-3.5 px-4 font-mono font-bold">
                            <span className={isTop3 ? podiumColors[index] : 'text-slate-400'}>
                              {index === 0 ? '🥇 1º' : index === 1 ? '🥈 2º' : index === 2 ? '🥉 3º' : `${index + 1}º`}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-white">
                            {entry.teamName}
                          </td>
                          <td className="py-3.5 px-4 text-slate-300 font-medium">
                            {certificateBadge(entry.totalScore)}
                          </td>
                          <td className="py-3.5 px-4 font-mono font-black text-emerald-400 text-sm">
                            {entry.totalScore.toLocaleString('pt-BR')} pts
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">
                            {Math.floor(entry.timeSpentSeconds / 60)}m {entry.timeSpentSeconds % 60}s
                          </td>
                          <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300">
                              {entry.code}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => removeLeaderboardEntry(entry.code)}
                              className="min-h-[32px] px-2 rounded-lg text-[11px] font-mono text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                              aria-label={`Remover ${entry.teamName} do placar`}
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 2: CERTIFICADO ESCOLAR EM PDF / IMPRESSÃO A4 */}
          {activeTab === 'CERTIFICATE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between print:hidden p-3 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-300">
                  O certificado abaixo está formatado para impressão ou exportação direta em PDF no tamanho A4 Paisagem.
                </span>
                <button
                  onClick={handlePrintCertificate}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir / Salvar em PDF</span>
                </button>
              </div>

              {/* O Certificado A4 Paisagem */}
              <div className="bg-[#FAF8F5] text-slate-900 p-8 md:p-12 rounded-2xl border-8 border-indigo-900 shadow-2xl relative overflow-hidden font-serif">
                {/* Moldura Dourada Interna */}
                <div className="border-2 border-amber-600/60 p-6 md:p-8 rounded-xl flex flex-col items-center text-center space-y-4 relative">
                  {/* Marca D'água de Fundo */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                    <GraduationCap className="w-96 h-96 text-indigo-950" />
                  </div>

                  {/* Cabeçalho Oficial */}
                  <div className="space-y-1">
                    <p className="text-[11px] font-sans font-bold tracking-widest uppercase text-indigo-950">
                      REPÚBLICA FEDERATIVA DO BRASIL • MINISTÉRIO DA EDUCAÇÃO
                    </p>
                    <p className="text-xs font-sans text-slate-600">
                      PROGRAMA NACIONAL DE TECNOLOGIA NA EDUCAÇÃO — ENSINO MÉDIO
                    </p>
                    <h1 className="text-2xl md:text-3xl font-black text-indigo-950 tracking-wide pt-2">
                      CERTIFICADO DE PROFICIÊNCIA EM HARDWARE
                    </h1>
                  </div>

                  {/* Texto Principal do Certificado */}
                  <div className="max-w-2xl text-sm leading-relaxed text-slate-800 py-3">
                    Certificamos com louvor que a equipe / estudante{' '}
                    <strong className="text-indigo-900 text-base font-sans underline decoration-amber-500 underline-offset-4">
                      {teamName.toUpperCase()}
                    </strong>{' '}
                    concluiu com êxito todas as etapas teórico-práticas da bancada de montagem física de computadores da{' '}
                    <strong>PC Builder Academy</strong>.
                  </div>

                  {/* Habilidades Práticas Validadas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px] font-sans text-left w-full max-w-2xl py-2">
                    <div className="p-2 rounded bg-indigo-50/80 border border-indigo-200">
                      ✓ Proteção Eletrostática (ESD)
                    </div>
                    <div className="p-2 rounded bg-indigo-50/80 border border-indigo-200">
                      ✓ Soquetes LGA1700 / AM5
                    </div>
                    <div className="p-2 rounded bg-indigo-50/80 border border-indigo-200">
                      ✓ Pinos Frontais F_PANEL
                    </div>
                    <div className="p-2 rounded bg-indigo-50/80 border border-indigo-200">
                      ✓ Diagnóstico de Falhas Técnicas
                    </div>
                  </div>

                  {/* Especificações e Nota Final */}
                  <div className="pt-2 text-xs font-sans text-slate-700">
                    <div>
                      Computador Projetado: <strong>{selectedMotherboard?.name || 'Motherboard'}</strong> com{' '}
                      <strong>{assembly.cpuInstalled?.name || 'CPU'}</strong> e{' '}
                      <strong>{assembly.gpuInstalled?.name || 'GPU Integrada'}</strong>.
                    </div>
                    <div className="font-bold text-indigo-950 text-sm mt-1">
                      Desempenho Geral Avaliado: {scoreData.totalScore.toLocaleString('pt-BR')} Pontos (Conceito A)
                    </div>
                  </div>

                  {/* Linhas de Assinatura e Autenticidade */}
                  <div className="grid grid-cols-2 w-full max-w-xl pt-6 text-[11px] font-sans">
                    <div className="flex flex-col items-center">
                      <div className="w-48 border-b border-slate-700 mb-1" />
                      <span className="font-bold text-slate-800">Professor de Informática & TI</span>
                      <span className="text-slate-500 text-[11px]">Coordenação Pedagógica</span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="w-48 border-b border-slate-700 mb-1" />
                      <span className="font-mono font-bold text-indigo-950">HASH: {scoreData.hashValidation}</span>
                      <span className="text-slate-500 text-[11px]">Autenticação Digital Verificada</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA 3: VALIDADOR DE HASH CRIPTOGRÁFICO */}
          {activeTab === 'VALIDATOR' && (
            <div className="max-w-xl mx-auto space-y-6 py-6">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5" />
                  <span>Verificador de Autenticidade de Certificados</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Digite o código que a equipe apresentou (ex: <code className="text-indigo-300 font-bold">PCA-EQUIPE_AZUL-6BK-8C-1F3A9B</code>). O selo SHA-256 no fim do código confere equipe, pontuação e tempo: qualquer alteração invalida o código.
                </p>

                <form onSubmit={handleValidateHash} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={searchHash}
                      onChange={(e) => setSearchHash(e.target.value.toUpperCase())}
                      placeholder="PCA-EQUIPE-PONTOS-TEMPO-SELO"
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500 uppercase tracking-wider"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
                    >
                      Verificar
                    </button>
                  </div>
                </form>

                {decoded && (
                  <div
                    role="status"
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      decoded.valid ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200' : 'bg-rose-950/80 border-rose-500/60 text-rose-200'
                    }`}
                  >
                    {decoded.valid ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="flex-1">
                          <div className="text-xs font-bold text-white">CÓDIGO AUTÊNTICO</div>
                          <div className="text-[11px] text-emerald-300/90 mt-0.5 font-mono">
                            Equipe {decoded.payload.teamName} • {decoded.payload.totalScore.toLocaleString('pt-BR')} pts •{' '}
                            {Math.floor(decoded.payload.timeSpentSeconds / 60)}m {decoded.payload.timeSpentSeconds % 60}s
                          </div>
                          <button
                            type="button"
                            onClick={handleAddDecoded}
                            className="mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer"
                          >
                            Adicionar ao placar
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-white">CÓDIGO INVÁLIDO</div>
                          <div className="text-[11px] text-rose-300/80 mt-0.5">
                            {decoded.reason === 'SEAL'
                              ? 'O selo não confere: a equipe, a pontuação ou o tempo foram alterados.'
                              : 'O formato não corresponde a um código emitido pela plataforma.'}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

