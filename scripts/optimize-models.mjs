#!/usr/bin/env node
/**
 * Otimiza os modelos 3D baixados do Sketchfab para o jogo (ADR-011).
 *
 * Entrada:  assets-src/models/<id>.glb   (download original, fora do Git)
 * Saída:    public/models/<id>.glb       (geometria meshopt, texturas WebP de até 1024 px)
 *           src/engine/models3d.available.json (ids prontos, lidos pelo jogo)
 *
 * Uso: npm run models:optimize
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'assets-src', 'models');
const OUT_DIR = join(ROOT, 'public', 'models');
const MANIFEST = join(ROOT, 'src', 'engine', 'models3d.data.json');
const AVAILABLE = join(ROOT, 'src', 'engine', 'models3d.available.json');
const GLTF_CLI = join(ROOT, 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_FACES = 30000;

const models = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const known = new Set(models.map((m) => m.id));
mkdirSync(OUT_DIR, { recursive: true });

if (existsSync(SRC_DIR)) {
  for (const file of readdirSync(SRC_DIR).filter((f) => f.endsWith('.glb'))) {
    const id = file.replace(/\.glb$/, '');
    if (!known.has(id)) {
      console.warn(`⚠ ${file}: id fora do manifesto (src/engine/models3d.data.json), ignorado.`);
      continue;
    }
    const model = models.find((m) => m.id === id);
    // Modelos acima do orçamento são reduzidos proporcionalmente; os demais só perdem vértices redundantes
    const ratio = model.faces > MAX_FACES ? (MAX_FACES / model.faces).toFixed(3) : '1';
    const input = join(SRC_DIR, file);
    const output = join(OUT_DIR, file);
    console.log(`→ ${id} (${model.faces} faces, ${model.license})`);
    // Chama o CLI pelo próprio Node (sem shell): funciona com espaços no caminho em qualquer sistema
    execFileSync(
      process.execPath,
      [
        GLTF_CLI, 'optimize', input, output,
        '--compress', 'meshopt',
        '--texture-compress', 'webp',
        '--texture-size', '1024',
        '--simplify', 'true',
        '--simplify-ratio', ratio,
        '--simplify-error', '0.001',
      ],
      { stdio: 'inherit' }
    );
    const size = statSync(output).size;
    const mb = (size / 1024 / 1024).toFixed(2);
    console.log(size > MAX_BYTES ? `  ⚠ ${mb} MB: acima do orçamento de 2 MB (ADR-011)` : `  ✓ ${mb} MB`);
  }
} else {
  console.log(`Nenhum download em ${SRC_DIR}. Veja docs/modelos-3d.md para baixar os modelos.`);
}

// Índice leve lido na carga inicial do jogo (mesmo formato de buildAvailableIndex em models3dIndex.ts)
const downloaded = new Set(readdirSync(OUT_DIR).filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, '')));
const available = models.filter((m) => downloaded.has(m.id)).map((m) => ({ id: m.id, targets: m.targets }));
writeFileSync(AVAILABLE, JSON.stringify(available, null, 2) + '\n');
console.log(`\n${available.length} de ${models.length} modelos disponíveis no jogo.`);
