import 'server-only';
import { ClassroomRepository, RepositoryError } from './repository';
import { MemoryRepository } from './memoryRepository';
import { NeonRepository } from './neonRepository';
import { SESSION_COOKIE, readSessionToken, sameOrigin } from './auth';
import type { Teacher } from '../engine/classroom/types';

/**
 * Respostas, erros e contexto das rotas /api/v1 (#72–#75). Erros sempre no formato
 * `{ error: { code, message } }`, com mensagens em português que o jogo e o painel mostram direto.
 */
export const NO_STORE = 'no-store';
export const PUBLIC_STATE_CACHE = 'public, s-maxage=10, stale-while-revalidate=20';
export const PUBLIC_RANKING_CACHE = 'public, s-maxage=15';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export function json(data: unknown, init: { status?: number; cache?: string; headers?: Record<string, string> } = {}): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': init.cache ?? NO_STORE, ...init.headers },
  });
}

export const errorResponse = (status: number, code: string, message: string) => json({ error: { code, message } }, { status });

const STATUS_BY_CODE: Record<string, number> = {
  USUARIO_EM_USO: 409,
  CODIGO_EM_USO: 409,
  APELIDO_EM_USO: 409,
  ENVIO_SIMULTANEO: 409,
  TURMA_NAO_ENCONTRADA: 404,
  ATIVIDADE_NAO_ENCONTRADA: 404,
  ENVIO_NAO_ENCONTRADO: 404,
};

/** Envolve o handler: erros conhecidos viram JSON; o resto vira 500 sem vazar detalhes */
export async function handle(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ApiError) return errorResponse(error.status, error.code, error.message);
    if (error instanceof RepositoryError) return errorResponse(STATUS_BY_CODE[error.code] ?? 400, error.code, error.message);
    console.error('[classroom] erro inesperado', error);
    return errorResponse(500, 'ERRO_INTERNO', 'Algo deu errado no servidor. Tente de novo em instantes.');
  }
}

const MAX_BODY_BYTES = 64 * 1024;

export async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new ApiError(413, 'CORPO_GRANDE', 'Requisição grande demais.');
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, 'JSON_INVALIDO', 'Corpo da requisição inválido.');
  }
}

export function cookieValue(request: Request, name: string): string | undefined {
  const header = request.headers.get('cookie') ?? '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return v.join('=');
  }
  return undefined;
}

export const isSecureRequest = (request: Request) => new URL(request.url).protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https';

export function clientIp(request: Request): string {
  return request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
}

/* ------------------------------------------------------------------------------------
 * Repositório e relógio (trocáveis nos testes)
 * ------------------------------------------------------------------------------------ */
let repository: ClassroomRepository | null = null;
let clock: () => Date = () => new Date();

export function getRepository(): ClassroomRepository {
  if (repository) return repository;
  const url = process.env.DATABASE_URL;
  if (process.env.CLASSROOM_REPO !== 'memory' && url) repository = new NeonRepository(url);
  else {
    if (process.env.NODE_ENV === 'production' && process.env.CLASSROOM_REPO !== 'memory') throw new Error('DATABASE_URL ausente em produção.');
    repository = new MemoryRepository(() => clock());
  }
  return repository;
}

export const now = () => clock();

export function setTestContext(repo: ClassroomRepository | null, testClock?: () => Date) {
  repository = repo;
  clock = testClock ?? (() => new Date());
}

/* ------------------------------------------------------------------------------------
 * Professor autenticado
 * ------------------------------------------------------------------------------------ */
export async function requireTeacher(request: Request, opts: { mutation?: boolean } = {}): Promise<Teacher> {
  if (opts.mutation && !sameOrigin(request)) throw new ApiError(403, 'ORIGEM_INVALIDA', 'Requisição de outra origem recusada.');
  const id = readSessionToken(cookieValue(request, SESSION_COOKIE), now().getTime());
  const teacher = id ? await getRepository().getTeacher(id) : null;
  if (!teacher) throw new ApiError(401, 'NAO_AUTENTICADO', 'Entre com seu usuário e senha de professor.');
  return teacher;
}

export async function requireRateLimit(key: string, windowSeconds: number, max: number, message: string) {
  if (!(await getRepository().hitRateLimit(key, windowSeconds, max))) throw new ApiError(429, 'LIMITE_DE_TENTATIVAS', message);
}
