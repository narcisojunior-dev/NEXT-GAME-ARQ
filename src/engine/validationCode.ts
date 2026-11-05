/**
 * Código de validação verificável (#29), sem servidor.
 *
 * Formato legível e digitável pelo professor:  PCA-<EQUIPE>-<PONTOS>-<TEMPO>[-E<ERROS>]-<SELO>
 *   EQUIPE  nome normalizado (A–Z, 0–9 e _; até 16 caracteres)
 *   PONTOS  pontuação em base 36
 *   TEMPO   segundos em base 36
 *   ERROS   (opcional, #34) um dígito base 36 por tipo de erro, na ordem de ERROR_TYPES
 *           (máx. 35 por tipo; zeros do fim omitidos). Códigos antigos, sem ERROS, continuam válidos.
 *   SELO    6 primeiros dígitos hex do SHA-256 do conteúdo + sal da aplicação
 *
 * Protege contra fraude casual (alterar pontuação/tempo à mão invalida o selo). Como o sal
 * está no cliente, não é criptografia forte — e não precisa ser numa sala de aula.
 */

/* ------------------------------------------------------------------------------------
 * SHA-256 (FIPS 180-4) puro e síncrono: a Web Crypto é assíncrona e não existe em todo ambiente
 * ------------------------------------------------------------------------------------ */
const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

export function sha256Hex(message: string): string {
  const bytes = new TextEncoder().encode(message);
  const bitLength = bytes.length * 8;
  const padded = new Uint8Array(Math.ceil((bytes.length + 9) / 64) * 64);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(padded.length - 4, bitLength >>> 0);

  const h = new Uint32Array([0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]);
  const w = new Uint32Array(64);
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }
  return Array.from(h, (x) => x.toString(16).padStart(8, '0')).join('');
}

/* ------------------------------------------------------------------------------------
 * Código de validação
 * ------------------------------------------------------------------------------------ */
const APP_SALT = 'pc-builder-academy/v1';
const SEAL_LENGTH = 6;

export interface ValidationPayload {
  teamName: string;
  totalScore: number;
  timeSpentSeconds: number;
  /** Erros por tipo (ordem de ERROR_TYPES em classReport.ts); ausente em códigos antigos */
  errorCounts?: number[];
}

/** Contagens → dígitos base 36 (máx. 35 cada), sem os zeros do fim */
function encodeCounts(counts: readonly number[]): string {
  const digits = counts.map((c) => Math.min(35, Math.max(0, Math.round(c))).toString(36).toUpperCase()).join('');
  return digits.replace(/0+$/, '') || '0';
}

const decodeCounts = (digits: string): number[] => [...digits].map((d) => parseInt(d, 36));

/** Nome de equipe no alfabeto do código (sem acentos, maiúsculas, espaços como _) */
export function normalizeTeamName(name: string): string {
  const folded = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 16);
  return folded || 'EQUIPE';
}

const seal = (team: string, score: number, time: number, errors?: string) =>
  sha256Hex(`${APP_SALT}|${team}|${score}|${time}${errors === undefined ? '' : `|E${errors}`}`).slice(0, SEAL_LENGTH).toUpperCase();

export function encodeValidationCode(payload: ValidationPayload): string {
  const team = normalizeTeamName(payload.teamName);
  const score = Math.max(0, Math.round(payload.totalScore));
  const time = Math.max(0, Math.round(payload.timeSpentSeconds));
  const errors = payload.errorCounts ? encodeCounts(payload.errorCounts) : undefined;
  const errorsSegment = errors === undefined ? '' : `-E${errors}`;
  return `PCA-${team}-${score.toString(36).toUpperCase()}-${time.toString(36).toUpperCase()}${errorsSegment}-${seal(team, score, time, errors)}`;
}

export type DecodeResult =
  | { valid: true; payload: ValidationPayload }
  | { valid: false; reason: 'FORMAT' | 'SEAL' };

export function decodeValidationCode(code: string): DecodeResult {
  const match = /^PCA-([A-Z0-9_]{1,16})-([0-9A-Z]{1,8})-([0-9A-Z]{1,7})(?:-E([0-9A-Z]{1,24}))?-([0-9A-F]{6})$/.exec(
    code.trim().toUpperCase()
  );
  if (!match) return { valid: false, reason: 'FORMAT' };
  const [, team, scoreB36, timeB36, errors, givenSeal] = match;
  const score = parseInt(scoreB36, 36);
  const time = parseInt(timeB36, 36);
  if (!Number.isFinite(score) || !Number.isFinite(time)) return { valid: false, reason: 'FORMAT' };
  if (seal(team, score, time, errors) !== givenSeal) return { valid: false, reason: 'SEAL' };
  return {
    valid: true,
    payload: {
      teamName: team.replace(/_/g, ' '),
      totalScore: score,
      timeSpentSeconds: time,
      ...(errors === undefined ? {} : { errorCounts: decodeCounts(errors) }),
    },
  };
}
