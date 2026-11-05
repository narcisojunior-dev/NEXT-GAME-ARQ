/**
 * Código da turma (#73): 6 caracteres de um alfabeto sem 0/O/1/I/L, fáceis de ditar e de
 * digitar no quadro. ~887 milhões de combinações.
 */
export const CLASS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const CLASS_CODE_LENGTH = 6;

/** `randomInt(n)` devolve um inteiro uniforme em [0, n) (crypto.randomInt no servidor) */
export function generateClassCode(randomInt: (n: number) => number): string {
  let code = '';
  for (let i = 0; i < CLASS_CODE_LENGTH; i++) code += CLASS_CODE_ALPHABET[randomInt(CLASS_CODE_ALPHABET.length)];
  return code;
}

/**
 * Normaliza o que o aluno digitou (maiúsculas, sem espaços e hífens). Devolve null quando não
 * pode ser um código: tamanho errado ou letra fora do alfabeto (0, O, 1, I, L).
 */
export function normalizeClassCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  if (code.length !== CLASS_CODE_LENGTH) return null;
  return [...code].every((c) => CLASS_CODE_ALPHABET.includes(c)) ? code : null;
}
