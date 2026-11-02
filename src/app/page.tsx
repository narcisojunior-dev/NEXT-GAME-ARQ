'use client';

import React from 'react';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { TopHUD } from '@/components/hud/TopHUD';
import { DidacticCompanion } from '@/components/hud/DidacticCompanion';
import { MissionHeader } from '@/components/missions/MissionHeader';
import { TeamChallengeBanner } from '@/components/challenges/TeamChallengeBanner';
import { DiagnosticBench } from '@/components/diagnostic/DiagnosticBench';
import { AssemblyChecklist } from '@/components/workbench/AssemblyChecklist';
import { WorkbenchMat } from '@/components/workbench/WorkbenchMat';
import { InventoryDrawer } from '@/components/inventory/InventoryDrawer';
import { InspectModal } from '@/components/modals/InspectModal';
import { BIOSSimulatorModal } from '@/components/modals/BIOSSimulatorModal';
import { FrontPanelZoomModal } from '@/components/modals/FrontPanelZoomModal';
import { AcademyOSDesktop } from '@/components/os/AcademyOSDesktop';
import { VirtualRoomModal } from '@/components/room/VirtualRoomModal';
import { TeacherDashboardModal } from '@/components/teacher/TeacherDashboardModal';

export default function Home() {
  return (
    <LazyMotion features={domAnimation} strict>
    <MotionConfig reducedMotion="user">
    <main className="min-h-screen flex flex-col bg-slate-950 text-slate-100 pb-16 selection:bg-cyan-500 selection:text-slate-950">
      {/* Top HUD com Modos, Timer, Orçamento e Fases */}
      <TopHUD />

      <div className="max-w-7xl w-full mx-auto px-4 mt-6 space-y-6">
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

        {/* A Bancada de Montagem (Tapete Antiestático + Placa-Mãe SVG + Fonte) */}
        <WorkbenchMat />

        {/* Gaveta de Inventário com Componentes e Ilustrações Visuais de Hardware */}
        <InventoryDrawer />
      </div>

      {/* Modais Flutuantes */}
      <InspectModal />
      <BIOSSimulatorModal />
      <FrontPanelZoomModal />
      <AcademyOSDesktop />
      <VirtualRoomModal />
      <TeacherDashboardModal />
    </main>
    </MotionConfig>
    </LazyMotion>
  );
}
