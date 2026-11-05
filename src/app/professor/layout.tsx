import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Painel do Professor — PC Builder Academy',
  description: 'Turmas, atividades, acompanhamento ao vivo e ranking do PC Builder Academy.',
};

/** Painel do professor (#76): rotas próprias, fora do bundle da bancada */
export default function ProfessorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/professor/turmas" className="font-black tracking-tight text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 rounded">
            PC Builder Academy <span className="text-cyan-300 font-mono text-xs uppercase tracking-widest ml-1">Professor</span>
          </Link>
          <Link href="/" className="text-xs font-mono text-slate-400 hover:text-white">Abrir o jogo</Link>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
