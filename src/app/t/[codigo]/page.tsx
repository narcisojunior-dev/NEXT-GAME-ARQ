import { redirect } from 'next/navigation';

/** Atalho do link da turma (QR code ou quadro): abre o jogo com o código preenchido (#78) */
export default async function TurmaShortcut({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  redirect(`/?turma=${encodeURIComponent(codigo.toUpperCase().slice(0, 12))}`);
}
