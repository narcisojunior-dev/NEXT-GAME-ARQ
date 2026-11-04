import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { HardwareMaterials } from '@/components/common/HardwareMaterials';
import { ServiceWorkerUpdater } from '@/components/pwa/ServiceWorkerUpdater';

// Fontes embutidas no build (sem requisição externa em runtime: o PWA continua funcionando offline)
const displayFont = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', display: 'swap' });
const codeFont = JetBrains_Mono({ subsets: ['latin'], variable: '--font-code', display: 'swap' });

export const metadata: Metadata = {
  title: 'PC Builder Academy — Jogo Educativo de Montagem de Computadores',
  description: 'Plataforma interativa e gamificada de montagem e diagnóstico de hardware para alunos do 1º Ano do Ensino Médio.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PC Academy',
  },
};

export const viewport: Viewport = {
  themeColor: '#0284c7',
  width: 'device-width',
  initialScale: 1,
  // Zoom liberado (#28, WCAG 1.4.4): alunos com baixa visão precisam ampliar a tela
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`${displayFont.variable} ${codeFont.variable}`}>
      <head>
        <link rel="icon" href="/icons/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950">
        <HardwareMaterials />
        {children}
        <ServiceWorkerUpdater />
      </body>
    </html>
  );
}

