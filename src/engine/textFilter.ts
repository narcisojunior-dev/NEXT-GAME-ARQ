/**
 * Filtro de texto livre do aluno (neon do quarto, apelido na turma): sem endereços e sem
 * palavrões. Comparação sem acentos, sem maiúsculas e sem pontuação. Puro.
 */
const BLOCKED_WORDS = ['porra', 'caralho', 'merda', 'puta', 'buceta', 'cacete', 'foda', 'fdp', 'vsf', 'pqp', 'bosta', 'viado', 'arrombad', 'otario', 'idiota', 'burro', 'retardad'];

export const flattenText = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

export const containsBlockedWord = (text: string) => {
  const flat = flattenText(text);
  return BLOCKED_WORDS.some((w) => flat.includes(w));
};

export const looksLikeLink = (text: string) => /https?:|www|\.(com|net|org|br|gg|io|tv)\b|\/|@/i.test(text);
