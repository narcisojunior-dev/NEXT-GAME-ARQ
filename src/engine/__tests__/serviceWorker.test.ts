import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

/** Executa o sw.js num contexto falso e captura o handler de fetch (#24, #66) */
function loadWorker(version = 'build123') {
  const listeners: Record<string, (event: unknown) => void> = {};
  const opened: string[] = [];
  const context = {
    self: {
      location: { href: `https://pca.test/sw.js?v=${version}`, origin: 'https://pca.test' },
      registration: { active: null },
      addEventListener: (type: string, fn: (event: unknown) => void) => (listeners[type] = fn),
      skipWaiting: () => Promise.resolve(),
      clients: { claim: () => Promise.resolve() },
    },
    caches: {
      open: (name: string) => {
        opened.push(name);
        return Promise.resolve({ addAll: () => Promise.resolve(), put: () => Promise.resolve() });
      },
      match: () => Promise.resolve(undefined),
      keys: () => Promise.resolve([]),
    },
    fetch: () => Promise.resolve({ status: 200, type: 'basic', clone: () => ({}) }),
    URL,
    Promise,
  };
  runInNewContext(readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf-8'), context);
  return { listeners, opened };
}

const fetchEvent = (url: string, mode = 'cors') => {
  let responded = false;
  return { event: { request: { url, method: 'GET', mode }, respondWith: () => (responded = true), waitUntil: () => {} }, responded: () => responded };
};

describe('Service worker', () => {
  it('requisições de /api/ vão direto para a rede (nunca passam pelo cache) — #66', () => {
    const { listeners } = loadWorker();
    const api = fetchEvent('https://pca.test/api/v1/turmas/ABC/estado');
    listeners.fetch(api.event);
    expect(api.responded()).toBe(false);
    const page = fetchEvent('https://pca.test/', 'navigate');
    listeners.fetch(page.event);
    expect(page.responded()).toBe(true);
  });

  it('o nome do cache vem do id do build — #24', async () => {
    const { listeners, opened } = loadWorker('abc123');
    listeners.install({ waitUntil: () => {} });
    await Promise.resolve();
    expect(opened).toContain('pc-builder-academy-abc123');
  });
});
