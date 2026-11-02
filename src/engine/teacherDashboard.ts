export interface StudentLeaderboardEntry {
  id: string;
  teamName: string;
  classRoom: string; // Ex: '1º Ano A', '1º Ano B'
  totalScore: number;
  precisionScore: number;
  budgetRemaining: number;
  timeSpentSeconds: number;
  diagnosticsResolvedCount: number;
  hashValidation: string;
  completedAt: string;
  badge: 'OURO' | 'PRATA' | 'BRONZE' | 'PARTICIPANTE';
}

export const INITIAL_LEADERBOARD_ENTRIES: StudentLeaderboardEntry[] = [
  {
    id: 'entry-1',
    teamName: 'Equipe ByteStorm',
    classRoom: '1º Ano A',
    totalScore: 9850,
    precisionScore: 4000,
    budgetRemaining: 340,
    timeSpentSeconds: 195,
    diagnosticsResolvedCount: 6,
    hashValidation: 'PCA-9X8K2P',
    completedAt: 'Hoje às 10:45',
    badge: 'OURO',
  },
  {
    id: 'entry-2',
    teamName: 'Equipe Overclockers',
    classRoom: '1º Ano B',
    totalScore: 9420,
    precisionScore: 3500,
    budgetRemaining: 180,
    timeSpentSeconds: 230,
    diagnosticsResolvedCount: 5,
    hashValidation: 'PCA-7T4M9Q',
    completedAt: 'Hoje às 11:10',
    badge: 'PRATA',
  },
  {
    id: 'entry-3',
    teamName: 'Equipe NanoTech',
    classRoom: '1º Ano A',
    totalScore: 8960,
    precisionScore: 3500,
    budgetRemaining: 420,
    timeSpentSeconds: 275,
    diagnosticsResolvedCount: 4,
    hashValidation: 'PCA-5R2L8W',
    completedAt: 'Hoje às 09:30',
    badge: 'BRONZE',
  },
  {
    id: 'entry-4',
    teamName: 'Equipe Silício Puro',
    classRoom: '1º Ano B',
    totalScore: 8410,
    precisionScore: 3000,
    budgetRemaining: 90,
    timeSpentSeconds: 310,
    diagnosticsResolvedCount: 3,
    hashValidation: 'PCA-3P1N6Y',
    completedAt: 'Hoje às 11:40',
    badge: 'PARTICIPANTE',
  },
];

/**
 * Valida o formato e autenticidade do código criptográfico do certificado
 */
export function verifyCertificateHash(hash: string): boolean {
  if (!hash) return false;
  const clean = hash.trim().toUpperCase();
  // Formato canônico: PCA-XXXXXX (6 caracteres alfanuméricos)
  const regex = /^PCA-[A-Z0-9]{6}$/;
  return regex.test(clean);
}

/**
 * Ordena a tabela de líderes pela pontuação decrescente
 */
export function sortLeaderboard(entries: StudentLeaderboardEntry[]): StudentLeaderboardEntry[] {
  return [...entries].sort((a, b) => b.totalScore - a.totalScore);
}

