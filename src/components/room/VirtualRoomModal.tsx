'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useAssemblyStore } from '@/store/useAssemblyStore';
import { useShallow } from 'zustand/react/shallow';
import {
  MONITORS,
  KEYBOARDS,
  MICE,
  MONITOR_STANDS,
  AUDIO_DEVICES,
  GAMEPADS,
  CASE_THEMES,
  StudentSetupConfig,
} from '@/engine/peripheralsCatalog';
import { ROOM_THEMES, RoomThemeId } from '@/engine/roomThemes';
import { View3DButton } from '@/components/three/View3DButton';
import {
  X,
  Camera,
  Download,
  Palette,
  Monitor,
  Keyboard as KeyboardIcon,
  MousePointer,
  Box,
  Headphones,
  Gamepad2,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export const VirtualRoomModal: React.FC = () => {
  const {
    isVirtualRoomModalOpen,
    closeVirtualRoomModal,
    studentSetup,
    setStudentPeripheral,
    selectedRoomTheme,
    setSelectedRoomTheme,
    teamName,
    assembly,
    selectedMotherboard,
    calculateFinalScore,
  } = useAssemblyStore(
    useShallow((s) => ({
      isVirtualRoomModalOpen: s.isVirtualRoomModalOpen,
      closeVirtualRoomModal: s.closeVirtualRoomModal,
      studentSetup: s.studentSetup,
      setStudentPeripheral: s.setStudentPeripheral,
      selectedRoomTheme: s.selectedRoomTheme,
      setSelectedRoomTheme: s.setSelectedRoomTheme,
      teamName: s.teamName,
      assembly: s.assembly,
      selectedMotherboard: s.selectedMotherboard,
      calculateFinalScore: s.calculateFinalScore,
    }))
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'THEME' | 'MONITOR' | 'KEYBOARD' | 'MOUSE' | 'CASE' | 'AUDIO' | 'STAND' | 'GAMEPAD'>('THEME');

  const currentTheme = ROOM_THEMES.find((t) => t.id === selectedRoomTheme) || ROOM_THEMES[0];
  const scoreData = calculateFinalScore();

  // Renderização 100% Client-Side no Canvas 2D em 1920x1080 (Full HD)
  useEffect(() => {
    if (!isVirtualRoomModalOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Resolução Full HD
    const W = 1920;
    const H = 1080;
    canvas.width = W;
    canvas.height = H;

    // 1. Fundo da Parede com Gradiente Temático
    const wallGrad = ctx.createLinearGradient(0, 0, 0, H * 0.75);
    wallGrad.addColorStop(0, currentTheme.wallBgGradient[0]);
    wallGrad.addColorStop(1, currentTheme.wallBgGradient[1]);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(0, 0, W, H);

    // Efeito de Iluminação de Ambiente / Neon
    if (selectedRoomTheme === 'ROOM_GAMER') {
      const neonGlow = ctx.createRadialGradient(W * 0.45, H * 0.4, 50, W * 0.45, H * 0.4, 600);
      neonGlow.addColorStop(0, 'rgba(6, 182, 212, 0.28)');
      neonGlow.addColorStop(0.7, 'rgba(236, 72, 153, 0.18)');
      neonGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = neonGlow;
      ctx.fillRect(0, 0, W, H * 0.8);
    } else if (selectedRoomTheme === 'ROOM_VAPORWAVE') {
      const vaporGlow = ctx.createRadialGradient(W * 0.5, H * 0.35, 80, W * 0.5, H * 0.35, 700);
      vaporGlow.addColorStop(0, 'rgba(217, 70, 239, 0.35)');
      vaporGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = vaporGlow;
      ctx.fillRect(0, 0, W, H * 0.8);

      // Sol Retro 80s no Fundo
      ctx.beginPath();
      ctx.arc(W * 0.5, H * 0.38, 140, 0, Math.PI * 2);
      const sunGrad = ctx.createLinearGradient(0, H * 0.2, 0, H * 0.55);
      sunGrad.addColorStop(0, '#F59E0B');
      sunGrad.addColorStop(1, '#EC4899');
      ctx.fillStyle = sunGrad;
      ctx.fill();
    } else if (selectedRoomTheme === 'ROOM_OFFICE') {
      // Luz natural de janela lateral
      const sunLight = ctx.createLinearGradient(W, 0, W * 0.3, H);
      sunLight.addColorStop(0, 'rgba(254, 243, 199, 0.22)');
      sunLight.addColorStop(1, 'transparent');
      ctx.fillStyle = sunLight;
      ctx.fillRect(0, 0, W, H);
    }

    // 2. Chão / Piso do Quarto
    const floorGrad = ctx.createLinearGradient(0, H * 0.72, 0, H);
    floorGrad.addColorStop(0, '#090D16');
    floorGrad.addColorStop(1, '#030712');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, H * 0.72, W, H * 0.28);

    // 3. A Mesa do Computador (Desk Surface)
    const deskY = H * 0.58;
    const deskH = H * 0.22;
    const deskW = W * 0.84;
    const deskX = (W - deskW) / 2;

    // Tampo da Mesa
    ctx.save();
    if (studentSetup.caseTheme.id === 'case-minimal-white' || selectedRoomTheme === 'ROOM_OFFICE') {
      // Madeira Carvalho Clara
      ctx.fillStyle = '#D4A373';
    } else {
      // Fibra de Carbono / Preto Fosco
      ctx.fillStyle = '#111827';
    }
    ctx.fillRect(deskX, deskY, deskW, 28);

    // Pés de Metal da Mesa
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(deskX + 60, deskY + 28, 30, H - deskY);
    ctx.fillRect(deskX + deskW - 90, deskY + 28, 30, H - deskY);
    ctx.restore();

    // 4. Mousepad Estendido (Deskmat XXL 900x400)
    const matX = W * 0.28;
    const matY = deskY + 6;
    const matW = 740;
    const matH = 20;
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(matX, matY, matW, matH);
    ctx.strokeStyle = currentTheme.primaryColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(matX, matY, matW, matH);

    // 5. Suporte do Monitor (Base de mesa ou braço pneumático a gás)
    if (studentSetup.stand.id === 'stand-gas-arm') {
      // Braço Articulado a Gás
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(W * 0.48, deskY);
      ctx.lineTo(W * 0.44, deskY - 140);
      ctx.lineTo(W * 0.48, deskY - 260);
      ctx.stroke();

      // Cilindro do pistão a gás com anel dourado
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(W * 0.435, deskY - 150, 10, 20);
    } else {
      // Base de Mesa Padrão
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(W * 0.44, deskY - 16, 120, 16);
      ctx.fillRect(W * 0.485, deskY - 220, 24, 210);
    }

    // 6. O Monitor (com Proporção Correta)
    let monW = 560;
    let monH = 340;
    let monY = deskY - 380;
    if (studentSetup.monitor.id === 'mon-34-ultrawide') {
      monW = 780;
      monH = 320;
      monY = deskY - 370;
    } else if (studentSetup.monitor.id === 'mon-24-75hz') {
      monW = 500;
      monH = 310;
      monY = deskY - 350;
    }
    const monX = (W - monW) / 2;

    // Moldura do Monitor
    ctx.fillStyle = '#0B0F19';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(monX, monY, monW, monH, 12);
    ctx.fill();
    ctx.stroke();

    // Tela do Monitor exibindo AcademyOS & CyberRacer
    const screenX = monX + 12;
    const screenY = monY + 12;
    const screenW = monW - 24;
    const screenH = monH - 24;

    const screenGrad = ctx.createLinearGradient(screenX, screenY, screenX + screenW, screenY + screenH);
    screenGrad.addColorStop(0, '#040814');
    screenGrad.addColorStop(1, '#0C1B33');
    ctx.fillStyle = screenGrad;
    ctx.fillRect(screenX, screenY, screenW, screenH);

    // Gráficos exibidos na tela do monitor
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('⚡ ACADEMY OS 2.4 — CYBERRACER BENCHMARK', screenX + 24, screenY + 45);

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 36px monospace';
    ctx.fillText(`${scoreData.precisionPoints ? '144 FPS [ESTÁVEL]' : '60 FPS'}`, screenX + 24, screenY + 95);

    // Linha de telemetria na tela
    ctx.strokeStyle = '#06B6D4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(screenX + 24, screenY + 180);
    ctx.lineTo(screenX + 140, screenY + 160);
    ctx.lineTo(screenX + 260, screenY + 175);
    ctx.lineTo(screenX + 380, screenY + 145);
    ctx.lineTo(screenX + screenW - 30, screenY + 160);
    ctx.stroke();

    // 7. O Teclado no Deskmat
    const kbW = studentSetup.keyboard.id === 'kb-mech-60-blue' ? 240 : studentSetup.keyboard.id === 'kb-mech-tkl-red' ? 300 : 360;
    const kbH = 48;
    const kbX = matX + 40;
    const kbY = deskY - 14;

    ctx.fillStyle = '#1E293B';
    ctx.strokeStyle = studentSetup.keyboard.id.includes('mech') ? currentTheme.primaryColor : '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(kbX, kbY, kbW, kbH, 6);
    ctx.fill();
    ctx.stroke();

    // Keycaps do Teclado
    ctx.fillStyle = studentSetup.keyboard.id === 'kb-mech-tkl-red' ? '#EF4444' : studentSetup.keyboard.id === 'kb-mech-60-blue' ? '#3B82F6' : '#94A3B8';
    for (let k = 0; k < 12; k++) {
      ctx.fillRect(kbX + 10 + k * (kbW / 13), kbY + 8, kbW / 18, 12);
      ctx.fillRect(kbX + 10 + k * (kbW / 13), kbY + 26, kbW / 18, 14);
    }

    // 8. O Mouse e Cabo Paracord
    const mouseX = matX + matW - 130;
    const mouseY = deskY - 12;
    ctx.fillStyle = studentSetup.mouse.id === 'mouse-vertical-office' ? '#475569' : '#0F172A';
    ctx.strokeStyle = currentTheme.primaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(mouseX, mouseY + 20, 22, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Scroll Wheel com LED
    ctx.fillStyle = currentTheme.primaryColor;
    ctx.fillRect(mouseX - 3, mouseY + 8, 6, 12);

    // 9. O Gabinete do Computador Montado (No Lado Direito da Mesa)
    const caseW = 220;
    const caseH = 420;
    const caseX = deskX + deskW - caseW - 30;
    const caseY = deskY - caseH + 20;

    // Chassi do Gabinete
    const isAquarium = studentSetup.caseTheme.id === 'case-aquarium-rgb';
    const isWhite = studentSetup.caseTheme.id === 'case-minimal-white';
    ctx.fillStyle = isWhite ? '#F8FAFC' : '#090D16';
    ctx.strokeStyle = isWhite ? '#CBD5E1' : '#334155';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(caseX, caseY, caseW, caseH, 12);
    ctx.fill();
    ctx.stroke();

    // Janela de Vidro Temperado
    const glassX = caseX + 16;
    const glassY = caseY + 24;
    const glassW = isAquarium ? caseW - 24 : caseW - 50;
    const glassH = caseH - 110;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(glassX, glassY, glassW, glassH);

    // Componentes Internos Visíveis (Cooler RGB girando, GPU com LEDs, RAM)
    // Cooler da CPU com LED RGB
    ctx.beginPath();
    ctx.arc(glassX + 90, glassY + 110, 42, 0, Math.PI * 2);
    ctx.fillStyle = currentTheme.primaryColor;
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    ctx.beginPath();
    ctx.arc(glassX + 90, glassY + 110, 18, 0, Math.PI * 2);
    ctx.fill();

    // Placa de Vídeo Instalada
    if (assembly.gpuInstalled) {
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(glassX + 20, glassY + 195, glassW - 35, 45);
      // Fita LED na lateral da GPU
      ctx.fillStyle = '#10B981';
      ctx.fillRect(glassX + 25, glassY + 215, glassW - 45, 6);
    }

    // Psu Shroud Inferior
    ctx.fillStyle = isWhite ? '#E2E8F0' : '#030712';
    ctx.fillRect(caseX + 10, caseY + caseH - 75, caseW - 20, 65);
    ctx.fillStyle = '#64748B';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`${assembly.psuInstalled?.wattage || 650}W GOLD`, caseX + 45, caseY + caseH - 35);

    // 10. Caixas de Som Estéreo ou Headset
    if (studentSetup.audio.id === 'audio-wood-speakers') {
      // Caixa Esquerda
      ctx.fillStyle = '#78350F'; // Madeira
      ctx.fillRect(monX - 90, deskY - 180, 65, 175);
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(monX - 58, deskY - 80, 22, 0, Math.PI * 2);
      ctx.fill();

      // Caixa Direita
      ctx.fillStyle = '#78350F';
      ctx.fillRect(caseX - 85, deskY - 180, 65, 175);
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(caseX - 53, deskY - 80, 22, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Suporte de Headset
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(monX - 60, deskY - 150, 26, Math.PI, 0);
      ctx.lineTo(monX - 34, deskY);
      ctx.stroke();

      // Conchas do Headset com LED
      ctx.fillStyle = currentTheme.primaryColor;
      ctx.beginPath();
      ctx.roundRect(monX - 92, deskY - 150, 18, 50, 8);
      ctx.roundRect(monX - 44, deskY - 150, 18, 50, 8);
      ctx.fill();
    }

    // 11. Gamepad Hall Effect (se ativado)
    if (studentSetup.gamepad.id !== 'gamepad-none') {
      const gpX = matX + matW + 30;
      const gpY = deskY + 6;
      ctx.fillStyle = '#1E293B';
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(gpX, gpY, 85, 50, 16);
      ctx.fill();
      ctx.stroke();

      // Analógicos Hall Effect
      ctx.fillStyle = '#06B6D4';
      ctx.beginPath();
      ctx.arc(gpX + 25, gpY + 22, 9, 0, Math.PI * 2);
      ctx.arc(gpX + 58, gpY + 34, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // 12. O SELO OFICIAL DE CERTIFICAÇÃO DO ALUNO (Canto Inferior Direito)
    const sealW = 600;
    const sealH = 200;
    const sealX = W - sealW - 40;
    const sealY = H - sealH - 30;

    // Placa Holográfica / Metalizada do Selo
    const sealGrad = ctx.createLinearGradient(sealX, sealY, sealX + sealW, sealY + sealH);
    sealGrad.addColorStop(0, 'rgba(15, 23, 42, 0.95)');
    sealGrad.addColorStop(1, 'rgba(2, 6, 23, 0.98)');
    ctx.fillStyle = sealGrad;
    ctx.strokeStyle = currentTheme.primaryColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(sealX, sealY, sealW, sealH, 18);
    ctx.fill();
    ctx.stroke();

    // Faixa Superior do Selo
    ctx.fillStyle = currentTheme.primaryColor;
    ctx.fillRect(sealX, sealY, sealW, 10);

    // Textos do Selo
    ctx.fillStyle = currentTheme.primaryColor;
    ctx.font = 'bold 15px monospace';
    ctx.fillText('★ PC BUILDER ACADEMY • CERTIFICADO DE HARDWARE ★', sealX + 24, sealY + 38);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(`PROJETISTA: ${teamName.toUpperCase()}`, sealX + 24, sealY + 76);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px monospace';
    const specSummary = `${assembly.cpuInstalled?.name || 'CPU'} | ${assembly.gpuInstalled?.name || 'iGPU'} | ${selectedMotherboard?.name || 'MB'}`;
    ctx.fillText(specSummary.substring(0, 48), sealX + 24, sealY + 110);

    // Pontuação e Hash Criptográfico
    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`PONTUAÇÃO: ${scoreData.totalScore.toLocaleString('pt-BR')} PTS`, sealX + 24, sealY + 148);

    ctx.fillStyle = '#64748B';
    ctx.font = '12px monospace';
    ctx.fillText(`AUTENTICAÇÃO: ${scoreData.hashValidation} • AMBIENTE: ${currentTheme.name.toUpperCase()}`, sealX + 24, sealY + 176);

  }, [isVirtualRoomModalOpen, studentSetup, selectedRoomTheme, teamName, assembly, selectedMotherboard, currentTheme, scoreData]);

  const handleDownloadSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `setup-${teamName.toLowerCase().replace(/\s+/g, '-')}-pc-academy.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!isVirtualRoomModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div className="relative w-full max-w-6xl h-[94vh] max-h-[880px] bg-slate-950 border-2 border-slate-700 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        {/* Cabeçalho do Modal */}
        <header className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-950 border border-cyan-500/50 flex items-center justify-center text-cyan-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                  Sala Virtual & Periféricos
                </span>
                <span className="text-xs text-slate-400">
                  Renderizador Canvas 2D Full HD (1920x1080)
                </span>
              </div>
              <h2 className="text-base font-black text-white mt-0.5">
                Setup Completo de {teamName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão de Download da Imagem do Setup */}
            <button
              onClick={handleDownloadSnapshot}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 text-xs font-black transition-all shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95 animate-bounce"
            >
              <Download className="w-4 h-4" />
              <span>BAIXAR FOTO DO MEU SETUP (PNG)</span>
            </button>

            <button
              onClick={closeVirtualRoomModal}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Corpo Principal: Canvas de Visualização + Gaveta de Customização */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 & 2: Preview Interativo do Canvas 2D da Sala Virtual */}
          <div className="lg:col-span-2 flex flex-col justify-center items-center">
            <div className="w-full aspect-video rounded-2xl border-2 border-slate-800 shadow-2xl overflow-hidden bg-slate-900 relative">
              <canvas ref={canvasRef} className="w-full h-full object-contain" />
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">
              A imagem Full HD exportada estampa o seu selo holográfico oficial com as especificações do PC montado e pontuação.
            </p>
          </div>

          {/* Coluna 3: Customizador de Ambiente e Periféricos */}
          <div className="flex flex-col space-y-4 bg-slate-900/90 rounded-2xl border border-slate-800 p-4 overflow-y-auto">
            {/* Seletor de Categoria de Customização */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 scrollbar-thin scrollbar-thumb-slate-800">
              <button
                onClick={() => setActiveTab('THEME')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'THEME' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                🏠 Ambiente
              </button>
              <button
                onClick={() => setActiveTab('MONITOR')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'MONITOR' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                🖥️ Monitor
              </button>
              <button
                onClick={() => setActiveTab('KEYBOARD')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'KEYBOARD' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                ⌨️ Teclado
              </button>
              <button
                onClick={() => setActiveTab('MOUSE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'MOUSE' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                🖱️ Mouse
              </button>
              <button
                onClick={() => setActiveTab('CASE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'CASE' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                📦 Gabinete
              </button>
              <button
                onClick={() => setActiveTab('STAND')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  activeTab === 'STAND' ? 'bg-cyan-500 text-slate-950' : 'bg-slate-950 text-slate-400 hover:text-white'
                }`}
              >
                🦾 Braço a Gás
              </button>
            </div>

            {/* Lista de Opções da Aba Selecionada */}
            <div className="space-y-2.5 flex-1 overflow-y-auto pr-1">
              {activeTab === 'THEME' && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold mb-2">
                    Escolha a Sala Virtual do Aluno:
                  </div>
                  {ROOM_THEMES.map((theme) => {
                    const isSelected = selectedRoomTheme === theme.id;
                    return (
                      <div
                        key={theme.id}
                        onClick={() => setSelectedRoomTheme(theme.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/30'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{theme.avatar}</span>
                            <span className="text-xs font-bold text-white">{theme.name}</span>
                          </div>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                          {theme.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'MONITOR' && (
                <div className="space-y-2">
                  {MONITORS.map((item) => {
                    const isSelected = studentSetup.monitor.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setStudentPeripheral('monitor', item)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{item.name}</span>
                          <span className="flex items-center gap-1.5">
                            <View3DButton catalogId={item.id} name={item.name} />
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                          </span>
                        </div>
                        <span className="inline-block text-[10px] font-mono text-cyan-300 bg-slate-900 px-2 py-0.5 rounded mt-1">
                          {item.featureBadge}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'KEYBOARD' && (
                <div className="space-y-2">
                  {KEYBOARDS.map((item) => {
                    const isSelected = studentSetup.keyboard.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setStudentPeripheral('keyboard', item)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{item.name}</span>
                          <span className="flex items-center gap-1.5">
                            <View3DButton catalogId={item.id} name={item.name} />
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                          </span>
                        </div>
                        <span className="inline-block text-[10px] font-mono text-purple-300 bg-slate-900 px-2 py-0.5 rounded mt-1">
                          {item.featureBadge}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'MOUSE' && (
                <div className="space-y-2">
                  {MICE.map((item) => {
                    const isSelected = studentSetup.mouse.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setStudentPeripheral('mouse', item)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{item.name}</span>
                          <span className="flex items-center gap-1.5">
                            <View3DButton catalogId={item.id} name={item.name} />
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                          </span>
                        </div>
                        <span className="inline-block text-[10px] font-mono text-emerald-300 bg-slate-900 px-2 py-0.5 rounded mt-1">
                          {item.featureBadge}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'CASE' && (
                <div className="space-y-2">
                  {CASE_THEMES.map((item) => {
                    const isSelected = studentSetup.caseTheme.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setStudentPeripheral('caseTheme', item)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{item.name}</span>
                          <span className="flex items-center gap-1.5">
                            <View3DButton catalogId={item.id} name={item.name} />
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                          </span>
                        </div>
                        <span className="inline-block text-[10px] font-mono text-blue-300 bg-slate-900 px-2 py-0.5 rounded mt-1">
                          {item.featureBadge}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {activeTab === 'STAND' && (
                <div className="space-y-2">
                  {MONITOR_STANDS.map((item) => {
                    const isSelected = studentSetup.stand.id === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setStudentPeripheral('stand', item)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected ? 'bg-cyan-950/80 border-cyan-400 ring-2 ring-cyan-400/30' : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{item.name}</span>
                          <span className="flex items-center gap-1.5">
                            <View3DButton catalogId={item.id} name={item.name} />
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                          </span>
                        </div>
                        <span className="inline-block text-[10px] font-mono text-amber-300 bg-slate-900 px-2 py-0.5 rounded mt-1">
                          {item.featureBadge}
                        </span>
                        <p className="text-[11px] text-slate-400 mt-1">{item.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

