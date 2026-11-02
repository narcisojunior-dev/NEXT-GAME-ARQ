import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PC Builder Academy — Jogo Educativo de Montagem de Computadores',
  description: 'Plataforma interativa e gamificada de montagem e diagnóstico de hardware para alunos do 1º Ano do Ensino Médio.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-cyan-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}

