'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { X, Play, SkipForward, AlertTriangle } from 'lucide-react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { calculateBenchmark } from '@/engine/benchmark';
import { CutawayPartId, CutawaySubsystem, SUBSYSTEM_LABELS, poseCutaway } from '@/engine/cutaway';
import { TOUR_IDLE_MS, buildTourScript, tourStepAt } from '@/engine/cutawayTour';
import { useCutawayStore } from '@/components/three/cutawayStore';
import { AssemblyState } from '@/engine/types';

const partName = (assembly: AssemblyState, part: CutawayPartId): string => {
  switch (part) {
    case 'CPU':
      return assembly.cpuInstalled?.name ?? 'Processador';
    case 'COOLER':
      return assembly.coolerInstalled?.name ?? 'Cooler';
    case 'RAM_2':
      return `${assembly.ramInstalledSlot2?.name ?? 'Memória'} (slot 2)`;
    case 'RAM_4':
      return `${assembly.ramInstalledSlot4?.name ?? 'Memória'} (slot 4)`;
    case 'GPU':
      return assembly.gpuInstalled?.name ?? 'Placa de vídeo';
    case 'M2_SSD':
    case 'SATA_DRIVE':
      return assembly.storageInstalled?.name ?? 'Disco';
    case 'PSU':
      return assembly.psuInstalled?.name ?? 'Fonte';
  }
};

/**
 * Painel do modo "Abrir o PC" (#61) com o tour (#62). As leituras vêm de poseCutaway — a mesma
 * função que posiciona as peças na bancada 3D. No modo 2D é a vista esquemática (sem WebGL).
 */
export const CutawayPanel: React.FC<{ variant: '3d' | '2d' }> = ({ variant }) => {
  const { assembly, motherboard } = useAssemblyStore(useShallow((s) => ({ assembly: s.assembly, motherboard: s.selectedMotherboard })));
  const { selection, touring, tourSkipped, select, setMode, setTouring, markInput, skipTour, replayTour } = useCutawayStore(
    useShallow((s) => ({
      selection: s.selection,
      touring: s.touring,
      tourSkipped: s.tourSkipped,
      select: s.select,
      setMode: s.setMode,
      setTouring: s.setTouring,
      markInput: s.markInput,
      skipTour: s.skipTour,
      replayTour: s.replayTour,
    }))
  );

  const benchmark = useMemo(() => calculateBenchmark(assembly, motherboard), [assembly, motherboard]);
  const pose = useMemo(() => poseCutaway(assembly, motherboard, benchmark, selection, 1), [assembly, motherboard, benchmark, selection]);
  const script = useMemo(() => buildTourScript(pose.subsystems), [pose.subsystems]);
  // Legenda do passo atual do tour (estado local: o relógio não entra em seletores da store)
  const [caption, setCaption] = useState<string | null>(null);

  // Tour por ociosidade: qualquer clique, tecla, roda ou arraste devolve o controle ao aluno
  useEffect(() => {
    const onInput = () => markInput();
    const events = ['pointerdown', 'keydown', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, onInput, { passive: true }));
    const timer = window.setInterval(() => {
      const { lastInputAt, tourSkipped: skipped, selection: current } = useCutawayStore.getState();
      const step = skipped ? null : tourStepAt(script, performance.now() - lastInputAt);
      if (step) {
        if (!useCutawayStore.getState().touring) setTouring(true);
        if (current !== step.step.subsystem) select(step.step.subsystem);
        setCaption((prev) => (prev === step.step.caption ? prev : step.step.caption));
      } else {
        if (useCutawayStore.getState().touring) setTouring(false);
        setCaption(null);
      }
    }, 250);
    return () => {
      events.forEach((e) => window.removeEventListener(e, onInput));
      window.clearInterval(timer);
    };
  }, [script, markInput, select, setTouring]);

  const choose = (s: CutawaySubsystem | null) => select(s);
  const shown = selection ? [selection] : pose.subsystems;

  return (
    <section
      aria-label="Abrir o PC"
      className={`rounded-2xl border border-cyan-700/60 bg-slate-950/95 p-3 text-xs text-slate-200 shadow-2xl ${
        variant === '3d' ? 'w-[300px] max-h-[440px] overflow-y-auto' : 'w-full'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-black text-cyan-300 uppercase tracking-wider text-[11px]">Abrir o PC — o que tem dentro</h3>
        <button
          type="button"
          onClick={() => setMode('OFF')}
          aria-label="Fechar o modo Abrir o PC"
          className="grid h-11 w-11 place-items-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div role="group" aria-label="Subsistemas" className="flex flex-wrap gap-1.5 mb-2">
        <button
          type="button"
          aria-pressed={selection === null}
          onClick={() => choose(null)}
          className={`min-h-[44px] px-3 rounded-xl font-bold cursor-pointer ${selection === null ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'}`}
        >
          Conjunto
        </button>
        {pose.subsystems.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={selection === s}
            onClick={() => choose(s)}
            className={`min-h-[44px] px-3 rounded-xl font-bold cursor-pointer ${selection === s ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 hover:bg-slate-700'}`}
          >
            {SUBSYSTEM_LABELS[s]}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="sr-only">
        {selection ? `Subsistema isolado: ${SUBSYSTEM_LABELS[selection]}` : 'Vista explodida do conjunto'}
      </p>

      {touring && caption && (
        <div role="status" className="mb-2 rounded-xl border border-amber-600/50 bg-amber-950/40 p-2 text-amber-100">
          <strong className="block text-[11px] uppercase tracking-wider text-amber-300">Tour</strong>
          {caption}
        </div>
      )}

      <div className="space-y-2">
        {shown.map((s) => (
          <div key={s} className="rounded-xl bg-slate-900 border border-slate-800 p-2">
            <div className="font-bold text-white">{SUBSYSTEM_LABELS[s]}</div>
            <ul className="mt-1 text-[11px] text-slate-400">
              {pose.parts
                .filter((p) => p.subsystem === s)
                .map((p) => (
                  <li key={p.part}>{partName(assembly, p.part)}</li>
                ))}
            </ul>
            <dl className="mt-1 grid grid-cols-2 gap-x-2 gap-y-0.5">
              {(pose.readings[s] ?? []).map((r) => (
                <React.Fragment key={r.key}>
                  <dt className="text-slate-400">{r.label}</dt>
                  <dd className="font-mono text-cyan-200 text-right">
                    {r.key === 'dualChannel' ? (r.value ? 'Sim' : 'Não') : `${r.value.toLocaleString('pt-BR')} ${r.unit}`}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
            {(pose.warnings[s] ?? []).map((w) => (
              <p key={w} className="mt-1 flex items-start gap-1 text-[11px] text-amber-300">
                <AlertTriangle className="w-3 h-3 mt-px shrink-0" />
                {w}
              </p>
            ))}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={skipTour}
          disabled={tourSkipped}
          className="flex min-h-[44px] items-center gap-1 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
        >
          <SkipForward className="w-3.5 h-3.5" /> Pular tour
        </button>
        <button
          type="button"
          onClick={() => replayTour(TOUR_IDLE_MS)}
          className="flex min-h-[44px] items-center gap-1 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 cursor-pointer"
        >
          <Play className="w-3.5 h-3.5" /> Ver de novo
        </button>
      </div>
      <p className="mt-1 text-[11px] text-slate-500">Sem mexer por 25 s, o tour mostra cada subsistema. Qualquer clique ou tecla devolve o controle.</p>
    </section>
  );
};
