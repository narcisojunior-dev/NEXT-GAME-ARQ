import { describe, it, expect } from 'vitest';
import { certificateBadge, verifyCertificateHash } from '../teacherDashboard';
import { encodeValidationCode } from '../validationCode';

describe('Painel do Professor (#29)', () => {
  it('aceita só códigos com selo válido (inclusive digitados em minúsculas)', () => {
    const code = encodeValidationCode({ teamName: 'Turma A', totalScore: 9100, timeSpentSeconds: 380 });
    expect(verifyCertificateHash(code)).toBe(true);
    expect(verifyCertificateHash(code.toLowerCase())).toBe(true);
  });

  it('recusa os códigos antigos de formato livre e códigos adulterados', () => {
    expect(verifyCertificateHash('PCA-9X8K2P')).toBe(false);
    expect(verifyCertificateHash('INVALIDO')).toBe(false);
    const code = encodeValidationCode({ teamName: 'Turma A', totalScore: 9100, timeSpentSeconds: 380 });
    expect(verifyCertificateHash(code.replace('TURMA_A', 'TURMA_B'))).toBe(false);
  });

  it('classifica o certificado pela pontuação', () => {
    expect(certificateBadge(9600)).toBe('OURO');
    expect(certificateBadge(8600)).toBe('PRATA');
    expect(certificateBadge(6500)).toBe('BRONZE');
    expect(certificateBadge(1000)).toBe('PARTICIPANTE');
  });
});
