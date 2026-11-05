/**
 * Relatório da turma para o professor (#34), puro:
 * - classifica cada erro do jogo num tipo pedagógico (soquete, geração de RAM, polaridade...);
 * - liga cada habilidade do certificado a habilidades da BNCC Computação (Ensino Médio) e a
 *   competências gerais da BNCC — proposta de alinhamento, para o professor validar;
 * - agrega os erros das equipes e exporta CSV.
 *
 * A contagem de erros viaja no código verificável da equipe (validationCode), então o
 * relatório funciona sem servidor: o professor digita os códigos das bancadas.
 */

export type SkillId = 'SEGURANCA' | 'COMPATIBILIDADE' | 'ENERGIA_TERMICA' | 'CABEAMENTO' | 'DIAGNOSTICO' | 'MESA_REDE' | 'PROJETO';

export interface CertificateSkill {
  id: SkillId;
  label: string;
  /** Habilidades da BNCC Computação — Ensino Médio (Parecer CNE/CEB nº 2/2022) */
  bnccComputacao: { code: string; summary: string }[];
  /** Competências gerais da BNCC */
  bnccGeral: { code: string; summary: string }[];
}

export const CERTIFICATE_SKILLS: CertificateSkill[] = [
  {
    id: 'SEGURANCA',
    label: 'Proteção eletrostática (ESD) e segurança do equipamento',
    bnccComputacao: [{ code: 'EM13CO09', summary: 'Identificar o uso de tecnologias digitais no mundo do trabalho' }],
    bnccGeral: [{ code: 'CG6', summary: 'Trabalho e projeto de vida' }],
  },
  {
    id: 'COMPATIBILIDADE',
    label: 'Compatibilidade de peças (soquete, memória, formato)',
    bnccComputacao: [
      { code: 'EM13CO02', summary: 'Construir soluções por refinamentos sucessivos, em vários níveis de abstração' },
    ],
    bnccGeral: [{ code: 'CG5', summary: 'Cultura digital: compreender e utilizar tecnologias digitais de forma crítica' }],
  },
  {
    id: 'ENERGIA_TERMICA',
    label: 'Energia e temperatura (fonte, TDP e pasta térmica)',
    bnccComputacao: [{ code: 'EM13CO03', summary: 'Analisar o consumo de recursos computacionais, como tempo, memória e energia' }],
    bnccGeral: [{ code: 'CG2', summary: 'Pensamento científico, crítico e criativo' }],
  },
  {
    id: 'CABEAMENTO',
    label: 'Cabeamento interno e painel frontal (F_PANEL)',
    bnccComputacao: [{ code: 'EM13CO16', summary: 'Desenvolver projetos com artefatos computacionais físicos ou simulados' }],
    bnccGeral: [{ code: 'CG5', summary: 'Cultura digital: compreender e utilizar tecnologias digitais de forma crítica' }],
  },
  {
    id: 'DIAGNOSTICO',
    label: 'Diagnóstico de falhas por hipóteses',
    bnccComputacao: [{ code: 'EM13CO01', summary: 'Resolver problemas reaproveitando partes de soluções existentes' }],
    bnccGeral: [{ code: 'CG2', summary: 'Pensamento científico: investigar causas, elaborar e testar hipóteses' }],
  },
  {
    id: 'MESA_REDE',
    label: 'Periféricos, cabos externos e rede',
    bnccComputacao: [{ code: 'EM13CO07', summary: 'Compreender tecnologias, equipamentos, protocolos e serviços de redes' }],
    bnccGeral: [{ code: 'CG5', summary: 'Cultura digital: compreender e utilizar tecnologias digitais de forma crítica' }],
  },
  {
    id: 'PROJETO',
    label: 'Projeto para o cliente em equipe (orçamento e desempenho)',
    bnccComputacao: [{ code: 'EM13CO18', summary: 'Planejar e gerenciar projetos colaborativos' }],
    bnccGeral: [{ code: 'CG9', summary: 'Empatia e cooperação' }],
  },
];

/**
 * Tipos de erro. A ORDEM faz parte do formato do código verificável: só acrescente no fim.
 */
export const ERROR_TYPES = [
  { id: 'SOQUETE', label: 'Soquete incompatível (CPU ou cooler)', skill: 'COMPATIBILIDADE' },
  { id: 'GERACAO_RAM', label: 'Geração de memória errada (DDR4 × DDR5)', skill: 'COMPATIBILIDADE' },
  { id: 'POLARIDADE', label: 'Polaridade / pinos errados no F_PANEL', skill: 'CABEAMENTO' },
  { id: 'EPS_PCIE', label: 'EPS da CPU × PCIe da GPU (encaixe perigoso)', skill: 'CABEAMENTO' },
  { id: 'ESD', label: 'Manuseio sem descarga eletrostática (ESD)', skill: 'SEGURANCA' },
  { id: 'PASTA', label: 'Pasta térmica / superaquecimento', skill: 'ENERGIA_TERMICA' },
  { id: 'CABO_ERRADO', label: 'Cabo no conector errado', skill: 'CABEAMENTO' },
  { id: 'GABINETE', label: 'Peça que não cabe no gabinete', skill: 'COMPATIBILIDADE' },
  { id: 'FONTE', label: 'Fonte subdimensionada', skill: 'ENERGIA_TERMICA' },
  { id: 'ESPACADORES', label: 'Curto-circuito (sem espaçadores)', skill: 'SEGURANCA' },
  { id: 'ORDEM', label: 'Ordem de montagem (pré-requisito pulado)', skill: 'COMPATIBILIDADE' },
  { id: 'POST', label: 'Tentou ligar com cabo ou peça faltando', skill: 'DIAGNOSTICO' },
] as const satisfies readonly { id: string; label: string; skill: SkillId }[];

export type ErrorTypeId = (typeof ERROR_TYPES)[number]['id'];
export type ErrorTally = Partial<Record<ErrorTypeId, number>>;

const RULES: [RegExp, ErrorTypeId][] = [
  [/encaixe perigoso/i, 'EPS_PCIE'],
  [/polaridade|pinos incorretos/i, 'POLARIDADE'],
  [/soquete incompat|cooler incompat/i, 'SOQUETE'],
  [/gera[cç][aã]o de mem/i, 'GERACAO_RAM'],
  [/eletrost|esd/i, 'ESD'],
  [/pasta t[eé]rmica|superaquec|thermal/i, 'PASTA'],
  [/n[aã]o encaixa aqui/i, 'CABO_ERRADO'],
  [/n[aã]o cabe no gabinete|grande demais/i, 'GABINETE'],
  [/fonte subdimensionada/i, 'FONTE'],
  [/curto/i, 'ESPACADORES'],
  [/n[aã]o d[aá] para ligar ainda|soquete vazio|onde aplicar|cooler est[aá] no caminho|sem placa-m[aã]e|onde encaixar/i, 'ORDEM'],
  [/ausente|desconectad|sem sa[ií]da de v[ií]deo|alavanca do soquete aberta|chave da fonte|sem fonte|sem cooler/i, 'POST'],
];

/** Tipo pedagógico de um erro do jogo (pelo título da mensagem), ou null se não for um erro de montagem */
export function classifyError(title: string): ErrorTypeId | null {
  return RULES.find(([pattern]) => pattern.test(title))?.[1] ?? null;
}

export function addToTally(tally: ErrorTally, title: string): ErrorTally {
  const type = classifyError(title);
  return type ? { ...tally, [type]: (tally[type] ?? 0) + 1 } : tally;
}

/** Contagens na ordem fixa de ERROR_TYPES (formato do código verificável) */
export const tallyToCounts = (tally: ErrorTally): number[] => ERROR_TYPES.map((t) => tally[t.id] ?? 0);

export function countsToTally(counts: readonly number[]): ErrorTally {
  const tally: ErrorTally = {};
  ERROR_TYPES.forEach((t, i) => {
    const n = counts[i] ?? 0;
    if (n > 0) tally[t.id] = n;
  });
  return tally;
}

export interface TeamErrors {
  teamName: string;
  totalScore: number;
  timeSpentSeconds: number;
  code: string;
  tally: ErrorTally | null;
}

export interface ClassReport {
  teams: number;
  /** Equipes cujo código traz a contagem de erros (códigos antigos não trazem) */
  teamsWithErrorData: number;
  /** Tipos de erro do mais comum para o menos comum (só os que ocorreram) */
  mostCommon: { id: ErrorTypeId; label: string; skill: CertificateSkill; total: number; teamsAffected: number }[];
}

export function buildClassReport(entries: TeamErrors[]): ClassReport {
  const withData = entries.filter((e) => e.tally !== null);
  const mostCommon = ERROR_TYPES.map((t) => {
    const total = withData.reduce((sum, e) => sum + (e.tally?.[t.id] ?? 0), 0);
    const teamsAffected = withData.filter((e) => (e.tally?.[t.id] ?? 0) > 0).length;
    const skill = CERTIFICATE_SKILLS.find((s) => s.id === t.skill) ?? CERTIFICATE_SKILLS[0];
    return { id: t.id, label: t.label, skill, total, teamsAffected };
  })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total || b.teamsAffected - a.teamsAffected);
  return { teams: entries.length, teamsWithErrorData: withData.length, mostCommon };
}

/* ------------------------------------------------------------------------------------
 * CSV (Excel/Planilhas pt-BR: separador ";", BOM UTF-8 para os acentos)
 * ------------------------------------------------------------------------------------ */
const csvCell = (value: string | number) => {
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(rows: (string | number)[][]): string {
  return `﻿${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
}

/** Planilha da turma: uma linha por equipe com pontos, tempo, código e erros por tipo */
export function classReportCsv(entries: TeamErrors[]): string {
  const header = ['Equipe', 'Pontuação', 'Tempo (s)', 'Código', ...ERROR_TYPES.map((t) => t.label), 'Habilidades BNCC a reforçar'];
  const rows = entries.map((e) => {
    const weakSkills = new Set(
      ERROR_TYPES.filter((t) => (e.tally?.[t.id] ?? 0) > 0).flatMap((t) =>
        (CERTIFICATE_SKILLS.find((s) => s.id === t.skill)?.bnccComputacao ?? []).map((b) => b.code)
      )
    );
    return [
      e.teamName,
      e.totalScore,
      e.timeSpentSeconds,
      e.code,
      ...ERROR_TYPES.map((t) => (e.tally ? e.tally[t.id] ?? 0 : '')),
      [...weakSkills].join(', '),
    ];
  });
  return toCsv([header, ...rows]);
}
