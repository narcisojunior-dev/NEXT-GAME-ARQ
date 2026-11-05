#!/usr/bin/env node
/**
 * Migrações do banco do Modo Professor (#71). Idempotente: cada arquivo de db/migrations roda
 * uma única vez, registrado na tabela schema_migrations, dentro de uma transação.
 *
 * Uso: npm run db:migrate   (lê DATABASE_URL do ambiente ou do .env.local)
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';

const ROOT = process.cwd();

function loadEnvLocal() {
  const file = join(ROOT, '.env.local');
  if (process.env.DATABASE_URL || !existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

/** Separa os comandos do arquivo (as migrações não usam funções com $$, então ";" no fim de linha basta) */
function statements(sqlText) {
  return sqlText
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n')
    .split(/;\s*(?:\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);
}

loadEnvLocal();
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL ausente: rode `npx vercel env pull .env.local` ou exporte a variável.');
  process.exit(1);
}

const sql = neon(url);
await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
const applied = new Set((await sql`SELECT name FROM schema_migrations`).map((r) => r.name));
const dir = join(ROOT, 'db', 'migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

let count = 0;
for (const file of files) {
  if (applied.has(file)) {
    console.log(`= ${file} (já aplicada)`);
    continue;
  }
  const queries = statements(readFileSync(join(dir, file), 'utf8')).map((st) => sql.query(st));
  await sql.transaction([...queries, sql.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])]);
  console.log(`+ ${file} (${queries.length} comandos)`);
  count++;
}
console.log(count ? `${count} migração(ões) aplicada(s).` : 'Banco já está atualizado.');
