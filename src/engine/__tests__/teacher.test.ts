import { describe, it, expect } from 'vitest';
import {
  INITIAL_LEADERBOARD_ENTRIES,
  verifyCertificateHash,
  sortLeaderboard,
  StudentLeaderboardEntry,
} from '../teacherDashboard';

describe('Painel do Professor e Sistema de Certificados Escolares', () => {
  it('deve validar hashes com formato canônico PCA-XXXXXX', () => {
    expect(verifyCertificateHash('PCA-9X8K2P')).toBe(true);
    expect(verifyCertificateHash('pca-8x9k2p')).toBe(true); // Case-insensitive
    expect(verifyCertificateHash('PCA-ABC123')).toBe(true);

    expect(verifyCertificateHash('INVALIDO')).toBe(false);
    expect(verifyCertificateHash('PCA-123')).toBe(false); // Curto demais
    expect(verifyCertificateHash('XYZ-123456')).toBe(false); // Prefixo errado
  });

  it('deve ordenar o leaderboard por pontuação decrescente', () => {
    const unsorted: StudentLeaderboardEntry[] = [
      { ...INITIAL_LEADERBOARD_ENTRIES[0], id: 'a', totalScore: 5000 },
      { ...INITIAL_LEADERBOARD_ENTRIES[0], id: 'b', totalScore: 9000 },
      { ...INITIAL_LEADERBOARD_ENTRIES[0], id: 'c', totalScore: 7000 },
    ];

    const sorted = sortLeaderboard(unsorted);
    expect(sorted[0].id).toBe('b');
    expect(sorted[1].id).toBe('c');
    expect(sorted[2].id).toBe('a');
  });

  it('deve conter dados iniciais pré-carregados para turmas escolares', () => {
    expect(INITIAL_LEADERBOARD_ENTRIES.length).toBeGreaterThanOrEqual(4);
    expect(INITIAL_LEADERBOARD_ENTRIES.every((e) => e.classRoom.includes('Ano'))).toBe(true);
  });
});

