import { describe, it, expect } from 'vitest';
import {
  CERTIFICATE_SKILLS,
  ERROR_TYPES,
  addToTally,
  buildClassReport,
  classReportCsv,
  classifyError,
  countsToTally,
  tallyToCounts,
} from '../classReport';
import { decodeValidationCode, encodeValidationCode } from '../validationCode';

describe('Relatório da turma (#34)', () => {
  it('classifica os erros reais do jogo nos tipos pedagógicos', () => {
    expect(classifyError('Soquete Incompatível!')).toBe('SOQUETE');
    expect(classifyError('Cooler Incompatível com o Soquete!')).toBe('SOQUETE');
    expect(classifyError('Geração de Memória Incompatível!')).toBe('GERACAO_RAM');
    expect(classifyError('Polaridade Invertida (+/-)')).toBe('POLARIDADE');
    expect(classifyError('Encaixe Perigoso!')).toBe('EPS_PCIE');
    expect(classifyError('Risco de Descarga Eletrostática (ESD)!')).toBe('ESD');
    expect(classifyError('Pasta Térmica Obrigatória!')).toBe('PASTA');
    expect(classifyError('Não Encaixa Aqui')).toBe('CABO_ERRADO');
    expect(classifyError('Placa de Vídeo Grande Demais!')).toBe('GABINETE');
    expect(classifyError('Fonte Subdimensionada (Sobrecarga)')).toBe('FONTE');
    expect(classifyError('CURTO-CIRCUITO DETECTADO!')).toBe('ESPACADORES');
    expect(classifyError('Cabo ATX 24 Pinos Ausente')).toBe('POST');
    expect(classifyError('Processador Assentado!')).toBeNull();
  });

  it('toda habilidade do certificado tem código da BNCC Computação (EM13CO) e competência geral', () => {
    CERTIFICATE_SKILLS.forEach((s) => {
      expect(s.bnccComputacao.length, s.id).toBeGreaterThan(0);
      s.bnccComputacao.forEach((b) => expect(b.code).toMatch(/^EM13CO(0[1-9]|1\d|2[0-6])$/));
      s.bnccGeral.forEach((b) => expect(b.code).toMatch(/^CG([1-9]|10)$/));
    });
    ERROR_TYPES.forEach((t) => expect(CERTIFICATE_SKILLS.some((s) => s.id === t.skill), t.id).toBe(true));
  });

  it('a contagem de erros viaja no código verificável e volta igual; códigos antigos seguem válidos', () => {
    const tally = ['Soquete Incompatível!', 'Soquete Incompatível!', 'Encaixe Perigoso!', 'Polaridade Invertida (+/-)'].reduce(addToTally, {});
    const code = encodeValidationCode({ teamName: 'Bancada 3', totalScore: 8200, timeSpentSeconds: 400, errorCounts: tallyToCounts(tally) });
    expect(code).toMatch(/^PCA-BANCADA_3-[0-9A-Z]+-[0-9A-Z]+-E[0-9A-Z]+-[0-9A-F]{6}$/);
    const decoded = decodeValidationCode(code);
    expect(decoded.valid).toBe(true);
    if (decoded.valid) expect(countsToTally(decoded.payload.errorCounts ?? [])).toEqual(tally);
    // Alterar a contagem invalida o selo
    expect(decodeValidationCode(code.replace(/-E(\w)/, (_, d) => `-E${d === '2' ? '3' : '2'}`)).valid).toBe(false);
    // Código antigo (sem erros)
    const old = encodeValidationCode({ teamName: 'Bancada 4', totalScore: 7000, timeSpentSeconds: 500 });
    const oldDecoded = decodeValidationCode(old);
    expect(oldDecoded.valid && oldDecoded.payload.errorCounts).toBeUndefined();
  });

  it('erros mais comuns da turma, do mais frequente ao menos, contando equipes afetadas', () => {
    const report = buildClassReport([
      { teamName: 'A', totalScore: 1, timeSpentSeconds: 1, code: 'a', tally: { SOQUETE: 2, POLARIDADE: 1 } },
      { teamName: 'B', totalScore: 1, timeSpentSeconds: 1, code: 'b', tally: { POLARIDADE: 3 } },
      { teamName: 'C', totalScore: 1, timeSpentSeconds: 1, code: 'c', tally: null },
    ]);
    expect(report.teams).toBe(3);
    expect(report.teamsWithErrorData).toBe(2);
    expect(report.mostCommon.map((r) => [r.id, r.total, r.teamsAffected])).toEqual([
      ['POLARIDADE', 4, 2],
      ['SOQUETE', 2, 1],
    ]);
  });

  it('CSV para Excel pt-BR: BOM, ";" e aspas escapadas', () => {
    const csv = classReportCsv([{ teamName: 'Equipe "Alfa"; 1', totalScore: 9000, timeSpentSeconds: 300, code: 'PCA-X', tally: { ESD: 1 } }]);
    expect(csv.startsWith('﻿')).toBe(true);
    const [header, row] = csv.slice(1).trim().split('\r\n');
    expect(header.split(';')).toHaveLength(4 + ERROR_TYPES.length + 1);
    expect(row.startsWith('"Equipe ""Alfa""; 1";9000;300;PCA-X;')).toBe(true);
    expect(row.endsWith('EM13CO09')).toBe(true);
  });
});
