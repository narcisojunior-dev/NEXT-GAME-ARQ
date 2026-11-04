'use client';

import React, { useState } from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useShallow } from 'zustand/react/shallow';
import { Trophy, Users, Award, ShieldAlert } from 'lucide-react';

export const TeamChallengeBanner: React.FC = () => {
  const {
    gameMode,
    teamName,
    setTeamName,
    calculateFinalScore,
    penaltiesCount,
  } = useAssemblyStore(
    useShallow((s) => ({
      gameMode: s.gameMode,
      teamName: s.teamName,
      setTeamName: s.setTeamName,
      calculateFinalScore: s.calculateFinalScore,
      penaltiesCount: s.penaltiesCount,
    }))
  );
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(teamName);
  const [generatedScore, setGeneratedScore] = useState<ReturnType<typeof calculateFinalScore> | null>(null);

  if (gameMode !== 'DESAFIO') return null;

  const handleSaveName = () => {
    setTeamName(nameInput.trim() || 'Equipe');
    setIsEditing(false);
  };

  const handleGenerateReport = () => {
    const score = calculateFinalScore();
    setGeneratedScore(score);
  };

  return (
    <div className="w-full bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 mb-6 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Arena de Desafios — Sala de Aula</span>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Nome da Equipe / Alunos"
                  className="bg-slate-950 border border-slate-700 px-3 py-1 rounded-lg text-sm text-white focus:outline-cyan-400 font-bold"
                />
                <button
                  onClick={handleSaveName}
                  className="px-3 py-1 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-0.5">
                <h2 className="text-base font-bold text-white">{teamName}</h2>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-slate-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  (Alterar nomes)
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateReport}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Award className="w-4 h-4" />
            <span>Emitir Certificado / Placar da Equipe</span>
          </button>
        </div>
      </div>

      {generatedScore && (
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400">Pontuação Total:</div>
            <div className="text-lg font-bold text-emerald-400 font-mono">
              {generatedScore.totalScore.toLocaleString('pt-BR')} pts
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400">Precisão da Montagem:</div>
            <div className="text-base font-bold text-cyan-400 font-mono">
              {generatedScore.precisionPoints} pts
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400">Bônus de Agilidade:</div>
            <div className="text-base font-bold text-amber-400 font-mono">
              +{generatedScore.speedPoints} pts
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div className="text-slate-400">Código de Validação:</div>
            <div className="text-base font-bold text-white font-mono tracking-wider">
              {generatedScore.hashValidation}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

