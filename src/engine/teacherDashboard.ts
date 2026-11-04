import { decodeValidationCode } from './validationCode';

/**
 * Painel do professor (#29). O placar vive no progresso salvo (useProgressStore) e só aceita
 * códigos verificáveis: não há mais entradas fictícias pré-carregadas.
 */

/**
 * Confere o selo SHA-256 do código do certificado. Antes só o formato era checado,
 * e qualquer "PCA-XXXXXX" inventado passava como autêntico.
 */
export function verifyCertificateHash(code: string): boolean {
  return decodeValidationCode(code).valid;
}

export type CertificateBadge = 'OURO' | 'PRATA' | 'BRONZE' | 'PARTICIPANTE';

export function certificateBadge(totalScore: number): CertificateBadge {
  if (totalScore >= 9500) return 'OURO';
  if (totalScore >= 8500) return 'PRATA';
  if (totalScore >= 6000) return 'BRONZE';
  return 'PARTICIPANTE';
}
