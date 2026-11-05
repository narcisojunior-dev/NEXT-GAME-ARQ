'use client';

import React, { useEffect } from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { TopHUD } from '@/components/hud/TopHUD';
import { DidacticCompanion } from '@/components/hud/DidacticCompanion';
import { MissionHeader } from '@/components/missions/MissionHeader';
import { TeamChallengeBanner } from '@/components/challenges/TeamChallengeBanner';
import { DiagnosticBench } from '@/components/diagnostic/DiagnosticBench';
import { AssemblyChecklist } from '@/components/workbench/AssemblyChecklist';
import { WorkbenchMat } from '@/components/workbench/WorkbenchMat';
import { InspectModal } from '@/components/modals/InspectModal';
import { BIOSSimulatorModal } from '@/components/modals/BIOSSimulatorModal';
import { FrontPanelZoomModal } from '@/components/modals/FrontPanelZoomModal';
import { AcademyOSDesktop } from '@/components/os/AcademyOSDesktop';
import { VirtualRoomModal } from '@/components/room/VirtualRoomModal';
import { TeacherDashboardModal } from '@/components/teacher/TeacherDashboardModal';
import dynamic from 'next/dynamic';
import { useModel3DStore } from '@/components/three/model3dStore';
import { useProgressStore } from '@/store/useProgressStore';
import { CampaignMapModal } from '@/components/campaign/CampaignMapModal';
import { ActiveMissionPanel } from '@/components/campaign/ActiveMissionPanel';
import { MissionDebriefModal } from '@/components/campaign/MissionDebriefModal';
import { useClassroomStore } from '@/store/useClassroomStore';

// Manifesto 3D e modal só são baixados quando o aluno abre o 3D (RNF08)
const Model3DModal = dynamic(() => import('@/components/three/Model3DModal').then((m) => m.Model3DModal), { ssr: false });
// Turma (#78): o código de turma só é baixado quando o aluno entra numa turma ou abre a janela de entrada
const ClassroomBanner = dynamic(() => import('@/components/classroom/ClassroomBanner'), { ssr: false });
const ClassroomJoinModal = dynamic(() => import('@/components/classroom/ClassroomJoinModal'), { ssr: false });

export default function Home() {
  const is3DOpen = useModel3DStore((s) => Boolean(s.modelId) || s.isGalleryOpen);

  // Progresso salvo (#30): hidratado só no cliente, depois do primeiro render (mesmo HTML do servidor).
  // A store só é exposta aos testes E2E depois da hidratação: antes disso, o estado salvo ainda
  // pode substituir o que o teste acabou de montar (e interromper um POST em andamento).
  useEffect(() => {
    void Promise.all([useAssemblyStore.persist.rehydrate(), useProgressStore.persist.rehydrate(), useClassroomStore.persist.rehydrate()]).then(() => {
      Object.assign(window, { useAssemblyStore, useProgressStore, useClassroomStore });
      // Link da turma (/t/CODIGO → /?turma=CODIGO): abre a entrada com o código preenchido
      const code = new URLSearchParams(window.location.search).get('turma');
      if (code && !useClassroomStore.getState().session) useClassroomStore.getState().openJoin(code);
      if (code) window.history.replaceState(null, '', window.location.pathname);
    });
  }, []);
  const inClassroom = useClassroomStore((s) => Boolean(s.session));
  const joinOpen = useClassroomStore((s) => s.joinOpen);
  return (
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
    <main className="min-h-screen flex flex-col bg-slate-950 text-slate-100 pb-16 selection:bg-cyan-500 selection:text-slate-950">
      {/* Top HUD com Modos, Timer, Orçamento e Fases */}
      <TopHUD />

      <div className="max-w-7xl w-full mx-auto px-4 mt-6 space-y-6">
        {/* Missão da campanha em andamento: objetivos ao vivo e entrega ao cliente */}
        <ActiveMissionPanel />

        {/* Turma do professor (#78): atividade ativa, envio e posição */}
        {inClassroom && <ClassroomBanner />}

        {/* Banner de Missão com Cliente (se ativo) */}
        <MissionHeader />

        {/* Banner de Desafio Competitivo em Sala (se ativo) */}
        <TeamChallengeBanner />

        {/* Laboratório de Diagnóstico e Assistência Técnica ("O que está quebrado?") */}
        <DiagnosticBench />

        {/* Checklist Visual Interativo com Objetivo Atual & Barra de Progresso */}
        <AssemblyChecklist />

        {/* Mascote Didático (Byte) com Dicas Pedagógicas */}
        <DidacticCompanion />

        {/* A Bancada de Montagem com Menu Lateral de Escolha de Componentes e Cabeamento */}
        <WorkbenchMat />
      </div>

      {/* Modais Flutuantes */}
      <InspectModal />
      <BIOSSimulatorModal />
      <FrontPanelZoomModal />
      <AcademyOSDesktop />
      <VirtualRoomModal />
      <TeacherDashboardModal />
      <CampaignMapModal />
      <MissionDebriefModal />
      {is3DOpen && <Model3DModal />}
      {joinOpen && <ClassroomJoinModal />}
    </main>
    </MotionConfig>
    </LazyMotion>
  );
}
