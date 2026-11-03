'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BOOT_TIMELINE_MS, BootPhase, MonitorScreenInfo, getBootPhase } from '@/engine/monitorScreen';
import { soundEngine } from '@/engine/audio/soundEngine';

/**
 * Tela viva do monitor 3D (Fase 4 · Issue 05): uma CanvasTexture redesenhada a 4 quadros/s
 * apenas quando há algo animando (SEM SINAL flutuante, POST, carregamento, relógio).
 */
export interface MonitorScreenContent {
  info: MonitorScreenInfo;
  /** Instante (performance.now) em que o PC foi ligado; null = desligado */
  poweredAt: number | null;
  cpuName: string;
  gpuName: string | null;
  ramGb: number;
  ramType: string;
  storageName: string | null;
  motherboardName: string;
}

const FPS_INTERVAL_MS = 250;
const MONO = '"SF Mono", Menlo, Consolas, monospace';
const SANS = '-apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function drawNoSignal(ctx: CanvasRenderingContext2D, w: number, h: number, info: MonitorScreenInfo, t: number) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  // Caixa flutuante, como nos monitores reais (evita marcar o painel)
  const bw = w * 0.46;
  const bh = h * 0.34;
  const x = (w - bw) / 2 + Math.sin(t / 2300) * w * 0.18;
  const y = (h - bh) / 2 + Math.cos(t / 1700) * h * 0.18;
  roundRect(ctx, x, y, bw, bh, 10);
  ctx.fillStyle = '#0b1220';
  ctx.fill();
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.font = `bold ${Math.round(h * 0.075)}px ${SANS}`;
  ctx.textAlign = 'center';
  ctx.fillText('SEM SINAL', x + bw / 2, y + bh * 0.3);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `${Math.round(h * 0.038)}px ${SANS}`;
  ctx.fillText(`Entrada: ${info.input ?? 'HDMI / DisplayPort'}`, x + bw / 2, y + bh * 0.48);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `${Math.round(h * 0.032)}px ${SANS}`;
  wrapText(ctx, info.message, bw * 0.88)
    .slice(0, 3)
    .forEach((line, i) => ctx.fillText(line, x + bw / 2, y + bh * 0.64 + i * h * 0.042));
  ctx.textAlign = 'left';
}

function drawPost(ctx: CanvasRenderingContext2D, w: number, h: number, c: MonitorScreenContent, elapsed: number) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
  const size = Math.round(h * 0.042);
  ctx.font = `${size}px ${MONO}`;
  const lines: [string, string][] = [
    ['#22d3ee', 'PC Builder Academy BIOS v4.0  —  Teste de Inicialização (POST)'],
    ['#e2e8f0', `Placa-mãe : ${c.motherboardName}`],
    ['#e2e8f0', `CPU       : ${c.cpuName}`],
    ['#e2e8f0', `Memória   : ${c.ramGb} GB ${c.ramType} ............ OK`],
    ['#e2e8f0', `Vídeo     : ${c.gpuName ?? 'Gráfico integrado da CPU'}`],
    ['#e2e8f0', `Disco     : ${c.storageName ?? 'Nenhum dispositivo de boot'}`],
    [c.info.keyboardDetected ? '#e2e8f0' : '#fbbf24', `Teclado   : ${c.info.keyboardDetected ? 'USB detectado' : 'NÃO DETECTADO'}`],
    [c.info.mouseDetected ? '#e2e8f0' : '#fbbf24', `Mouse     : ${c.info.mouseDetected ? 'USB detectado' : 'NÃO DETECTADO'}`],
  ];
  // As linhas aparecem uma a uma, como num POST real
  const visible = Math.min(lines.length, 1 + Math.floor(elapsed / 180));
  lines.slice(0, visible).forEach(([color, text], i) => {
    ctx.fillStyle = color;
    ctx.fillText(text, w * 0.05, h * 0.12 + i * size * 1.5);
  });
  if (c.info.postFailure) {
    ctx.fillStyle = '#f87171';
    ctx.font = `bold ${size}px ${MONO}`;
    ctx.fillText(`ERRO NO POST: ${c.info.postFailure.title}`, w * 0.05, h * 0.82);
    ctx.font = `${Math.round(size * 0.85)}px ${MONO}`;
    ctx.fillStyle = '#fca5a5';
    wrapText(ctx, c.info.postFailure.message, w * 0.9)
      .slice(0, 2)
      .forEach((line, i) => ctx.fillText(line, w * 0.05, h * 0.88 + i * size * 1.3));
  } else if (visible === lines.length) {
    ctx.fillStyle = '#64748b';
    ctx.fillText('Pressione DEL para entrar no Setup', w * 0.05, h * 0.9);
  }
}

function drawLoading(ctx: CanvasRenderingContext2D, w: number, h: number, progress: number) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#020617');
  g.addColorStop(1, '#0b1730');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#22d3ee';
  ctx.font = `bold ${Math.round(h * 0.1)}px ${SANS}`;
  ctx.fillText('AcademyOS', w / 2, h * 0.47);
  const bw = w * 0.3;
  ctx.fillStyle = '#1e293b';
  roundRect(ctx, (w - bw) / 2, h * 0.58, bw, h * 0.02, 4);
  ctx.fill();
  ctx.fillStyle = '#22d3ee';
  roundRect(ctx, (w - bw) / 2, h * 0.58, Math.max(8, bw * progress), h * 0.02, 4);
  ctx.fill();
  ctx.textAlign = 'left';
}

function drawDesktop(ctx: CanvasRenderingContext2D, w: number, h: number, c: MonitorScreenContent, t: number) {
  // Papel de parede: laboratório cyber-industrial
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#04131f');
  g.addColorStop(1, '#0c2a3a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.07)';
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += w / 24) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += h / 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Ícones
  const iconSize = h * 0.08;
  ['Meu PC', 'Benchmark', 'Lixeira'].forEach((label, i) => {
    const x = w * 0.03;
    const y = h * 0.06 + i * iconSize * 1.9;
    ctx.fillStyle = 'rgba(34, 211, 238, 0.85)';
    roundRect(ctx, x, y, iconSize, iconSize, 6);
    ctx.fill();
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `${Math.round(h * 0.03)}px ${SANS}`;
    ctx.fillText(label, x, y + iconSize + h * 0.035);
  });

  // Janela "Meu Computador" com as peças que o aluno montou
  const wx = w * 0.22;
  const wy = h * 0.1;
  const ww = w * 0.56;
  const wh = h * 0.62;
  roundRect(ctx, wx, wy, ww, wh, 8);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.5)';
  ctx.stroke();
  ctx.fillStyle = '#22d3ee';
  ctx.font = `bold ${Math.round(h * 0.042)}px ${SANS}`;
  ctx.fillText('Meu Computador — montado por você', wx + ww * 0.05, wy + wh * 0.14);
  ctx.font = `${Math.round(h * 0.034)}px ${MONO}`;
  const specs = [
    `CPU     ${c.cpuName}`,
    `Vídeo   ${c.gpuName ?? 'Integrado'}`,
    `RAM     ${c.ramGb} GB ${c.ramType}`,
    `Disco   ${c.storageName ?? '—'}`,
    `Placa   ${c.motherboardName}`,
    `Saída   ${c.info.input ?? '—'}`,
  ];
  ctx.fillStyle = '#cbd5e1';
  specs.forEach((line, i) => ctx.fillText(line.slice(0, 46), wx + ww * 0.05, wy + wh * 0.28 + i * h * 0.062));

  // Avisos de periféricos não detectados
  const warnings = [!c.info.keyboardDetected && 'Teclado não detectado', !c.info.mouseDetected && 'Mouse não detectado'].filter(
    (x): x is string => Boolean(x)
  );
  warnings.forEach((text, i) => {
    const tw = w * 0.3;
    const tx = w - tw - w * 0.02;
    const ty = h * 0.62 - i * h * 0.1;
    roundRect(ctx, tx, ty, tw, h * 0.075, 6);
    ctx.fillStyle = 'rgba(120, 53, 15, 0.95)';
    ctx.fill();
    ctx.fillStyle = '#fde68a';
    ctx.font = `bold ${Math.round(h * 0.032)}px ${SANS}`;
    ctx.fillText(`⚠ ${text}`, tx + tw * 0.06, ty + h * 0.048);
  });

  // Barra de tarefas com relógio
  const bar = h * 0.085;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
  ctx.fillRect(0, h - bar, w, bar);
  ctx.fillStyle = '#22d3ee';
  roundRect(ctx, w * 0.012, h - bar * 0.82, bar * 0.64, bar * 0.64, 6);
  ctx.fill();
  const now = new Date(t);
  const clock = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `${Math.round(bar * 0.4)}px ${SANS}`;
  ctx.textAlign = 'right';
  ctx.fillText(clock, w * 0.98, h - bar * 0.35);
  ctx.textAlign = 'left';
}

/** Desenha o quadro atual. Retorna true se o conteúdo é animado (precisa de novos quadros). */
export function drawMonitorFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  content: MonitorScreenContent,
  nowPerf: number,
  nowWall: number
): { animated: boolean; phase: BootPhase | null } {
  const { info, poweredAt } = content;
  if (info.state !== 'NO_SIGNAL' && info.state !== 'SIGNAL') {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    return { animated: false, phase: null };
  }
  if (info.state === 'NO_SIGNAL') {
    drawNoSignal(ctx, w, h, info, nowPerf);
    return { animated: true, phase: null };
  }
  const elapsed = poweredAt === null ? Number.POSITIVE_INFINITY : nowPerf - poweredAt;
  const phase = info.postFailure ? 'POST' : getBootPhase(elapsed);
  if (phase === 'POST') drawPost(ctx, w, h, content, info.postFailure ? Number.POSITIVE_INFINITY : elapsed);
  else if (phase === 'LOADING') drawLoading(ctx, w, h, Math.min(1, (elapsed - BOOT_TIMELINE_MS.POST) / BOOT_TIMELINE_MS.LOADING));
  else drawDesktop(ctx, w, h, content, nowWall);
  return { animated: true, phase };
}

/**
 * Hook: mantém uma CanvasTexture sincronizada com o estado da tela.
 * O bip de 800 Hz do POST toca uma vez quando a imagem passa do POST para o carregamento.
 */
export function useMonitorTexture(content: MonitorScreenContent, aspect: number): THREE.CanvasTexture | null {
  const contentRef = useRef(content);
  useEffect(() => {
    contentRef.current = content;
  });

  const surface = useMemo(() => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.height = 360;
    canvas.width = Math.round(360 * aspect);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return { canvas, texture };
  }, [aspect]);

  useEffect(() => () => surface?.texture.dispose(), [surface]);

  const { state, keyboardDetected, mouseDetected, input } = content.info;
  const postFailureTitle = content.info.postFailure?.title;
  useEffect(() => {
    if (!surface) return;
    const { canvas, texture } = surface;
    contentRef.current = content;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let lastPhase: BootPhase | null = null;
    const draw = () => {
      const result = drawMonitorFrame(ctx, canvas.width, canvas.height, contentRef.current, performance.now(), Date.now());
      if (lastPhase === 'POST' && result.phase === 'LOADING') soundEngine.playBiosBeep(true);
      if (result.phase === 'POST' && contentRef.current.info.postFailure && lastPhase !== 'POST') soundEngine.playBiosBeep(false);
      lastPhase = result.phase;
      texture.needsUpdate = true;
      return result.animated;
    };
    const animated = draw();
    if (!animated) return;
    const id = window.setInterval(draw, FPS_INTERVAL_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- redesenha apenas quando o que aparece na tela muda
  }, [surface, state, postFailureTitle, keyboardDetected, mouseDetected, input, content.poweredAt]);

  return surface?.texture ?? null;
}
