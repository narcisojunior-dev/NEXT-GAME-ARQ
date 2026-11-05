import 'server-only';
import { createHash, createHmac, randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

/**
 * Identidade sem e-mail (#72, ADR-014): senha do professor com scrypt e salt por usuário,
 * código de recuperação exibido uma vez, sessão em cookie assinado com HMAC e token aleatório
 * de 128 bits para o aluno (o banco guarda só o hash).
 */
const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH);
  return `${salt.toString('base64')}$${hash.toString('base64')}`;
}

/** Comparação em tempo constante; hash malformado nunca confere */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltB64, hashB64] = stored.split('$');
  if (!saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length || KEY_LENGTH);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Código de recuperação: 12 caracteres sem letras ambíguas, em blocos de 4 para anotar no papel */
const RECOVERY_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function generateRecoveryCode(): string {
  let code = '';
  for (let i = 0; i < 12; i++) code += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
  return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;
}

export const normalizeRecoveryCode = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

/* ------------------------------------------------------------------------------------
 * Sessão do professor: cookie "teacherId.expira.HMAC" (12 h)
 * ------------------------------------------------------------------------------------ */
export const SESSION_COOKIE = 'pcba_session';
export const SESSION_HOURS = 12;

let warnedDevSecret = false;
export function sessionSecret(): string {
  const secret = process.env.CLASSROOM_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production' && process.env.CLASSROOM_REPO !== 'memory') {
    throw new Error('CLASSROOM_SECRET ausente ou curto (mínimo 32 caracteres): cadastre-o nas variáveis do projeto na Vercel.');
  }
  if (!warnedDevSecret) {
    warnedDevSecret = true;
    console.warn('[classroom] CLASSROOM_SECRET ausente: usando um segredo de desenvolvimento.');
  }
  return 'segredo-de-desenvolvimento-nao-use-em-producao-0123456789';
}

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url');

export function createSessionToken(teacherId: string, now = Date.now(), secret = sessionSecret()): string {
  const expires = now + SESSION_HOURS * 3600 * 1000;
  const payload = `${teacherId}.${expires}`;
  return `${payload}.${sign(payload, secret)}`;
}

/** teacherId da sessão, ou null se adulterada ou expirada */
export function readSessionToken(token: string | undefined, now = Date.now(), secret = sessionSecret()): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [teacherId, expires, mac] = parts;
  const expected = sign(`${teacherId}.${expires}`, secret);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!/^\d+$/.test(expires) || Number(expires) <= now) return null;
  return teacherId;
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_HOURS * 3600}${secure ? '; Secure' : ''}`;
}

export function clearedSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? '; Secure' : ''}`;
}

/* ------------------------------------------------------------------------------------
 * Token do aluno: 128 bits no cabeçalho Authorization (sem cookie, logo sem CSRF)
 * ------------------------------------------------------------------------------------ */
export const generateParticipantToken = () => randomBytes(16).toString('base64url');
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('authorization') ?? '';
  const m = header.match(/^Bearer\s+([A-Za-z0-9_-]{16,64})$/);
  return m ? m[1] : null;
}

/** Mutações do painel exigem Origin igual ao host (defesa contra CSRF além do SameSite) */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
