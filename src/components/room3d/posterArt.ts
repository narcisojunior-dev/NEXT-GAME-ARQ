/**
 * Arte original dos pôsteres e quadros (#88), desenhada em <canvas> pelo próprio jogo:
 * nenhum personagem, logotipo ou arte de terceiros. Os dados vêm do PC e do progresso do aluno.
 */
export interface PosterData {
  teamName: string;
  cpu: string;
  gpu: string;
  ramGb: number;
  avgFps: number | null;
  /** Barras do gráfico de FPS (1080p, 1440p, 4K) */
  fpsByResolution: { label: string; fps: number }[];
  threeStarMissions: number;
  setupLines: string[];
  date: string;
}

const MONO = '"JetBrains Mono", "Fira Code", ui-monospace, monospace';

function background(ctx: CanvasRenderingContext2D, w: number, h: number, top: string, bottom: string) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function title(ctx: CanvasRenderingContext2D, text: string, w: number, y: number, size: number, color: string) {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(text, w / 2, y);
  ctx.textAlign = 'left';
}

/** Processador em arte pixel: grade de 16 × 16 com pinos, núcleo e um brilho */
function pixelCpu(ctx: CanvasRenderingContext2D, w: number, h: number, d: PosterData) {
  background(ctx, w, h, '#0b1020', '#1e1b4b');
  const cell = Math.floor(Math.min(w, h * 0.7) / 18);
  const ox = (w - cell * 16) / 2;
  const oy = h * 0.14;
  const px = (x: number, y: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + x * cell, oy + y * cell, cell - 1, cell - 1);
  };
  for (let i = 2; i < 14; i += 2) {
    px(i, 0, '#facc15');
    px(i, 15, '#facc15');
    px(0, i, '#facc15');
    px(15, i, '#facc15');
  }
  for (let y = 1; y < 15; y++) for (let x = 1; x < 15; x++) px(x, y, (x + y) % 7 === 0 ? '#334155' : '#1f2937');
  for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) px(x, y, (x * y) % 5 === 0 ? '#22d3ee' : '#0e7490');
  px(5, 5, '#ffffff');
  px(6, 5, '#a5f3fc');
  title(ctx, 'NÚCLEO', w, oy + cell * 18.2, Math.round(cell * 1.1), '#22d3ee');
  title(ctx, d.cpu.slice(0, 26), w, h - h * 0.08, Math.round(h * 0.035), '#e2e8f0');
}

/** Mapa de soquetes: qual processador vai em qual placa */
function socketMap(ctx: CanvasRenderingContext2D, w: number, h: number) {
  background(ctx, w, h, '#f8fafc', '#e2e8f0');
  title(ctx, 'MAPA DE SOQUETES', w, h * 0.09, Math.round(h * 0.05), '#0f172a');
  const rows: [string, string, string, string][] = [
    ['AM4', 'Ryzen 3000/5000', 'DDR4', '#ef4444'],
    ['AM5', 'Ryzen 7000/9000', 'DDR5', '#f97316'],
    ['LGA1700', 'Intel 12ª-14ª', 'DDR4/DDR5', '#2563eb'],
    ['LGA1851', 'Intel Core Ultra', 'DDR5', '#7c3aed'],
  ];
  const rowH = h * 0.18;
  rows.forEach(([socket, cpus, ram, color], i) => {
    const y = h * 0.16 + i * (rowH + h * 0.02);
    ctx.fillStyle = color;
    ctx.fillRect(w * 0.06, y, w * 0.26, rowH);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(rowH * 0.28)}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(socket, w * 0.19, y + rowH * 0.6);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = `bold ${Math.round(rowH * 0.22)}px ${MONO}`;
    ctx.fillText(cpus, w * 0.36, y + rowH * 0.42);
    ctx.fillStyle = '#475569';
    ctx.font = `${Math.round(rowH * 0.2)}px ${MONO}`;
    ctx.fillText(`Memória ${ram}`, w * 0.36, y + rowH * 0.78);
  });
  ctx.fillStyle = '#64748b';
  ctx.font = `${Math.round(h * 0.028)}px ${MONO}`;
  ctx.fillText('Soquete da CPU = soquete da placa-mãe', w * 0.06, h * 0.96);
}

/** Gráfico de FPS do PC que o aluno montou */
function fpsChart(ctx: CanvasRenderingContext2D, w: number, h: number, d: PosterData) {
  background(ctx, w, h, '#020617', '#0f172a');
  title(ctx, 'MEU BENCHMARK', w, h * 0.09, Math.round(h * 0.05), '#22d3ee');
  const bars = d.fpsByResolution;
  const max = Math.max(60, ...bars.map((b) => b.fps));
  const baseY = h * 0.82;
  const chartH = h * 0.6;
  const barW = (w * 0.7) / Math.max(1, bars.length);
  // Linha de 60 FPS
  const y60 = baseY - (60 / max) * chartH;
  ctx.strokeStyle = '#f59e0b';
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.08, y60);
  ctx.lineTo(w * 0.92, y60);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = '#f59e0b';
  ctx.font = `${Math.round(h * 0.03)}px ${MONO}`;
  ctx.fillText('60 FPS', w * 0.08, y60 - 8);
  bars.forEach((b, i) => {
    const x = w * 0.15 + i * barW;
    const bh = (b.fps / max) * chartH;
    ctx.fillStyle = b.fps >= 60 ? '#10b981' : '#ef4444';
    ctx.fillRect(x, baseY - bh, barW * 0.6, bh);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `bold ${Math.round(h * 0.035)}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(b.fps), x + barW * 0.3, baseY - bh - 10);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(b.label, x + barW * 0.3, baseY + h * 0.06);
    ctx.textAlign = 'left';
  });
  if (bars.length === 0) title(ctx, 'Monte o PC para medir', w, h / 2, Math.round(h * 0.04), '#94a3b8');
  title(ctx, d.gpu.slice(0, 28), w, h * 0.97, Math.round(h * 0.03), '#64748b');
}

/** Certificado da equipe */
function certificate(ctx: CanvasRenderingContext2D, w: number, h: number, d: PosterData) {
  background(ctx, w, h, '#fffbeb', '#fef3c7');
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = Math.max(4, w * 0.012);
  ctx.strokeRect(w * 0.05, h * 0.04, w * 0.9, h * 0.92);
  title(ctx, 'CERTIFICADO', w, h * 0.16, Math.round(h * 0.06), '#92400e');
  title(ctx, 'PC Builder Academy', w, h * 0.23, Math.round(h * 0.032), '#b45309');
  title(ctx, 'Técnico(a) de montagem', w, h * 0.36, Math.round(h * 0.034), '#44403c');
  title(ctx, (d.teamName || 'Equipe').toUpperCase().slice(0, 18), w, h * 0.47, Math.round(h * 0.05), '#1c1917');
  title(ctx, `${d.threeStarMissions} missões com ★★★`, w, h * 0.6, Math.round(h * 0.034), '#44403c');
  // Selo
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.arc(w / 2, h * 0.76, h * 0.08, 0, Math.PI * 2);
  ctx.fill();
  title(ctx, '★', w, h * 0.785, Math.round(h * 0.08), '#fffbeb');
  title(ctx, d.date, w, h * 0.92, Math.round(h * 0.026), '#78716c');
}

/** Ficha do setup (foto do setup do ADR-006 em versão de pôster) */
function setupCard(ctx: CanvasRenderingContext2D, w: number, h: number, d: PosterData) {
  background(ctx, w, h, '#0f172a', '#111827');
  title(ctx, 'MEU SETUP', w, h * 0.1, Math.round(h * 0.055), '#a78bfa');
  const lines = [`CPU  ${d.cpu}`, `GPU  ${d.gpu}`, `RAM  ${d.ramGb} GB`, ...(d.avgFps !== null ? [`FPS  ${d.avgFps} em 1080p`] : []), ...d.setupLines];
  ctx.font = `${Math.round(h * 0.03)}px ${MONO}`;
  lines.slice(0, 9).forEach((line, i) => {
    ctx.fillStyle = i < 4 ? '#e2e8f0' : '#94a3b8';
    ctx.fillText(line.slice(0, 30), w * 0.07, h * 0.22 + i * h * 0.075);
  });
  ctx.fillStyle = '#a78bfa';
  ctx.fillRect(w * 0.07, h * 0.9, w * 0.86, 4);
  ctx.fillStyle = '#64748b';
  ctx.fillText(d.teamName || 'Equipe', w * 0.07, h * 0.95);
}

export function drawPoster(ctx: CanvasRenderingContext2D, variant: string, w: number, h: number, data: PosterData) {
  switch (variant) {
    case 'mapa-soquetes':
      return socketMap(ctx, w, h);
    case 'grafico-fps':
      return fpsChart(ctx, w, h, data);
    case 'certificado':
      return certificate(ctx, w, h, data);
    case 'ficha-setup':
      return setupCard(ctx, w, h, data);
    default:
      return pixelCpu(ctx, w, h, data);
  }
}

/** Letreiro de neon: texto com brilho em várias passadas */
export function drawNeon(ctx: CanvasRenderingContext2D, text: string, color: string, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
  ctx.font = `bold ${Math.round(h * 0.6)}px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [blur, alpha] of [
    [h * 0.25, 0.5],
    [h * 0.12, 0.8],
    [h * 0.04, 1],
  ] as const) {
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillText(text, w / 2, h / 2);
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(h * 0.56)}px ${MONO}`;
  ctx.fillText(text, w / 2, h / 2);
}

/** Placa de ano da estante "Linha do tempo" */
export function drawPlaque(ctx: CanvasRenderingContext2D, year: string, label: string, w: number, h: number) {
  background(ctx, w, h, '#78350f', '#451a03');
  ctx.font = `bold ${Math.round(h * 0.5)}px ${MONO}`;
  ctx.fillStyle = '#fde68a';
  ctx.fillText(year, w * 0.04, h * 0.68);
  const yearW = ctx.measureText(year).width;
  ctx.font = `${Math.round(h * 0.4)}px ${MONO}`;
  ctx.fillStyle = '#fef3c7';
  ctx.fillText(label, w * 0.06 + yearW, h * 0.66);
}
