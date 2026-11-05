import { StateStorage } from 'zustand/middleware';

/**
 * localStorage à prova de falhas (#30): modo anônimo, cota cheia, bloqueio de cookies ou SSR
 * não podem quebrar o jogo. Em qualquer falha, cai para uma memória volátil da sessão.
 */
const memory = new Map<string, string>();

function getLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const storage = window.localStorage;
    const probe = '__pcba_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export const safeStateStorage: StateStorage = {
  getItem: (name) => {
    try {
      return getLocalStorage()?.getItem(name) ?? memory.get(name) ?? null;
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: (name, value) => {
    memory.set(name, value);
    try {
      getLocalStorage()?.setItem(name, value);
    } catch {
      // Cota cheia ou bloqueio: o jogo segue com a cópia em memória
    }
  },
  removeItem: (name) => {
    memory.delete(name);
    try {
      getLocalStorage()?.removeItem(name);
    } catch {
      // ignorado de propósito
    }
  },
};

/** Chaves usadas pelo jogo (o botão "Começar do zero" limpa todas) */
export const STORAGE_KEYS = {
  assembly: 'pcba-montagem-v1',
  progress: 'pcba-progresso-v1',
  room: 'pcba-quarto-v1',
  classroom: 'pcba-turma-v1',
} as const;
