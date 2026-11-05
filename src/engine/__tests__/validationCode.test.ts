import { describe, it, expect } from 'vitest';
import { decodeValidationCode, encodeValidationCode, normalizeTeamName, sha256Hex } from '../validationCode';

describe('SHA-256 puro (vetores oficiais NIST)', () => {
  it('"abc", mensagem vazia e mensagem de dois blocos', () => {
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1'
    );
  });

  it('UTF-8: acentos geram o hash dos bytes codificados', () => {
    expect(sha256Hex('ação')).toHaveLength(64);
    expect(sha256Hex('ação')).not.toBe(sha256Hex('acao'));
  });
});

describe('Código de validação verificável (#29)', () => {
  const payload = { teamName: 'Equipe Ômega 3', totalScore: 7820, timeSpentSeconds: 412 };

  it('codifica equipe, pontuação e tempo num código legível e o decodifica de volta', () => {
    const code = encodeValidationCode(payload);
    expect(code).toMatch(/^PCA-EQUIPE_OMEGA_3-[0-9A-Z]+-[0-9A-Z]+-[0-9A-F]{6}$/);
    expect(decodeValidationCode(code)).toEqual({
      valid: true,
      payload: { teamName: 'EQUIPE OMEGA 3', totalScore: 7820, timeSpentSeconds: 412 },
    });
  });

  it('aceita o código digitado em minúsculas e com espaços nas pontas', () => {
    const code = encodeValidationCode(payload);
    expect(decodeValidationCode(`  ${code.toLowerCase()} `).valid).toBe(true);
  });

  it('recusa código com pontuação, tempo ou equipe alterados (selo não confere)', () => {
    const code = encodeValidationCode(payload);
    const [prefix, team, score, time, sealHex] = code.split('-');
    const tamperedScore = [prefix, team, (parseInt(score, 36) + 1000).toString(36).toUpperCase(), time, sealHex].join('-');
    const tamperedTime = [prefix, team, score, '1', sealHex].join('-');
    const tamperedTeam = [prefix, 'OUTRA', score, time, sealHex].join('-');
    for (const bad of [tamperedScore, tamperedTime, tamperedTeam]) {
      expect(decodeValidationCode(bad)).toEqual({ valid: false, reason: 'SEAL' });
    }
  });

  it('recusa formatos inválidos', () => {
    for (const bad of ['', 'PCA-9X8K2P', 'XYZ-A-1-1-ABCDEF', 'PCA-A-1-1-ZZZZZZ']) {
      expect(decodeValidationCode(bad)).toEqual({ valid: false, reason: 'FORMAT' });
    }
  });

  it('normaliza nomes de equipe vazios ou só com símbolos', () => {
    expect(normalizeTeamName('   ')).toBe('EQUIPE');
    expect(normalizeTeamName('!!!')).toBe('EQUIPE');
    expect(normalizeTeamName('Turma 1ºA — Manhã')).toBe('TURMA_1_A_MANHA');
  });
});
