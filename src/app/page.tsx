'use client';

import React from 'react';
import { TopHUD } from '@/components/hud/TopHUD';
import { DidacticCompanion } from '@/components/hud/DidacticCompanion';
import { MissionHeader } from '@/components/missions/MissionHeader';
import { TeamChallengeBanner } from '@/components/challenges/TeamChallengeBanner';
import { WorkbenchMat } from '@/components/workbench/WorkbenchMat';
import { InventoryDrawer } from '@/components/inventory/InventoryDrawer';
import { InspectModal } from '@/components/modals/InspectModal';
import { BIOSSimulatorModal } from '@/components/modals/BIOSSimulatorModal';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-slate-950 text-slate-100 pb-16">
      {/* Top HUD com Modos, Timer, Orçamento e Fases */}
      <TopHUD />

      <div className="max-w-7xl w-full mx-auto px-4 mt-6 space-y-6">
        {/* Banner de Missão com Cliente (se ativo) */}
        <MissionHeader />

        {/* Banner de Desafio Competitivo em Sala (se ativo) */}
        <TeamChallengeBanner />

        {/* Mascote Didático (Byte) com Dicas da Fase Atual */}
        <DidacticCompanion />

        {/* A Bancada de Montagem (Tapete Antiestático + Placa-Mãe SVG + Fonte) */}
        <WorkbenchMat />

        {/* Gaveta de Inventário com Componentes Categorizados */}
        <InventoryDrawer />
      </div>

      {/* Modais Flutuantes */}
      <InspectModal />
      <BIOSSimulatorModal />
    </main>
  );
}

