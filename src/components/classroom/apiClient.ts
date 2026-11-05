'use client';

/**
 * Cliente da API /api/v1 (painel do professor e jogo do aluno). Toda resposta vira
 * `{ ok: true, data }` ou `{ ok: false, error }`, com a mensagem em português da API;
 * falha de rede vira o código SEM_CONEXAO, e o jogo continua funcionando sem turma.
 */
export interface ApiFailure {
  code: string;
  message: string;
  status: number;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiFailure };

export async function apiFetch<T>(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}): Promise<ApiResult<T>> {
  try {
    const response = await fetch(`/api/v1${path}`, {
      method: init.method ?? (init.body === undefined ? 'GET' : 'POST'),
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        ...(init.body === undefined ? {} : { 'content-type': 'application/json' }),
        ...(init.token ? { authorization: `Bearer ${init.token}` } : {}),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await response.text();
    const json: unknown = text ? JSON.parse(text) : {};
    if (!response.ok) {
      const err = (json as { error?: { code?: string; message?: string } }).error;
      return { ok: false, error: { code: err?.code ?? 'ERRO', message: err?.message ?? 'Algo deu errado.', status: response.status } };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, error: { code: 'SEM_CONEXAO', message: 'Sem conexão com o servidor. O jogo continua funcionando; tente de novo em instantes.', status: 0 } };
  }
}

export const formatBrl = (value: number) => `R$ ${Math.round(value).toLocaleString('pt-BR')}`;
export const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;
