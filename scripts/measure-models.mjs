#!/usr/bin/env node
/**
 * Mede a bounding box de cada GLB de public/models e grava src/engine/modelDimensions.json.
 * O motor usa essas medidas para calcular, sem WebGL, onde cada peça fica na bancada e na mesa
 * (os testes de encaixe e sobreposição dependem delas).
 *
 * Uso: npm run models:measure   (rode de novo depois de npm run models:optimize)
 */
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { getBounds } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

const ROOT = process.cwd();
const MODELS_DIR = join(ROOT, 'public', 'models');
const OUT = join(ROOT, 'src', 'engine', 'modelDimensions.json');

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const result = {};
for (const file of readdirSync(MODELS_DIR).filter((f) => f.endsWith('.glb')).sort()) {
  const doc = await io.read(join(MODELS_DIR, file));
  const { min, max } = getBounds(doc.getRoot().listScenes()[0]);
  result[file.replace(/\.glb$/, '')] = max.map((v, i) => Number((v - min[i]).toPrecision(6)));
}

writeFileSync(OUT, `${JSON.stringify(result, null, 2)}\n`);
console.log(`${Object.keys(result).length} modelos medidos -> ${OUT}`);
