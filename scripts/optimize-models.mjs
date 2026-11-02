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
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup,
  instance,
  palette,
  flatten,
  join as joinMeshes,
  weld,
  simplify,
  resample,
  prune,
  sparse,
  textureCompress,
  meshopt,
} from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'assets-src', 'models');
const OUT_DIR = join(ROOT, 'public', 'models');
const MANIFEST = join(ROOT, 'src', 'engine', 'models3d.data.json');
const AVAILABLE = join(ROOT, 'src', 'engine', 'models3d.available.json');
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_FACES = 30000;

const models = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const known = new Set(models.map((m) => m.id));
mkdirSync(OUT_DIR, { recursive: true });

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;

function createIO() {
  return new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'meshopt.encoder': MeshoptEncoder,
      'meshopt.decoder': MeshoptDecoder,
    });
}

async function optimizeModel(input, model, textureSize = 1024) {
  const io = createIO();
  const doc = await io.read(input);
  const ratio = model.faces > MAX_FACES ? MAX_FACES / model.faces : 1;

  await doc.transform(
    dedup(),
    instance({ min: 5 }),
    palette({ min: 5 }),
    flatten(),
    joinMeshes(),
    weld(),
    simplify({
      simplifier: MeshoptSimplifier,
      ratio,
      error: 0.001,
    }),
    resample(),
    prune(),
    sparse(),
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      resize: [textureSize, textureSize],
    }),
    meshopt({
      encoder: MeshoptEncoder,
      level: 'high',
    })
  );

  return await io.writeBinary(doc);
}

if (existsSync(SRC_DIR)) {
  const files = readdirSync(SRC_DIR).filter((f) => f.endsWith('.glb'));
  for (const file of files) {
    const id = file.replace(/\.glb$/, '');
    if (!known.has(id)) {
      console.warn(`⚠ ${file}: id fora do manifesto (src/engine/models3d.data.json), ignorado.`);
      continue;
    }
    const model = models.find((m) => m.id === id);
    const input = join(SRC_DIR, file);
    const output = join(OUT_DIR, file);
    console.log(`→ ${id} (${model.faces} faces, ${model.license})`);

    try {
      let binary = await optimizeModel(input, model, 1024);

      // Se passar de 2 MB, tenta com textura de 512 px conforme checklist do ADR-011
      if (binary.byteLength > MAX_BYTES) {
        console.log(`  ⚠ ${(binary.byteLength / 1024 / 1024).toFixed(2)} MB: acima de 2 MB. Reotimizando com texturas 512px...`);
        const smallerBinary = await optimizeModel(input, model, 512);
        if (smallerBinary.byteLength < binary.byteLength) {
          binary = smallerBinary;
        }
      }

      writeFileSync(output, Buffer.from(binary));
      const size = statSync(output).size;
      const mb = (size / 1024 / 1024).toFixed(2);
      console.log(size > MAX_BYTES ? `  ⚠ ${mb} MB: acima do orçamento de 2 MB (ADR-011)` : `  ✓ ${mb} MB`);
    } catch (err) {
      console.error(`  ❌ Falha ao otimizar ${id}:`, err.message);
    }
  }
} else {
  console.log(`Nenhum download em ${SRC_DIR}. Veja docs/modelos-3d.md para baixar os modelos.`);
}

// Índice leve lido na carga inicial do jogo (mesmo formato de buildAvailableIndex em models3dIndex.ts)
const downloaded = new Set(readdirSync(OUT_DIR).filter((f) => f.endsWith('.glb')).map((f) => f.replace(/\.glb$/, '')));
const available = models.filter((m) => downloaded.has(m.id)).map((m) => ({ id: m.id, targets: m.targets }));
writeFileSync(AVAILABLE, JSON.stringify(available, null, 2) + '\n');
console.log(`\n${available.length} de ${models.length} modelos disponíveis no jogo.`);
