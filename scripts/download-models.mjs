#!/usr/bin/env node
/**
 * Baixa os modelos glTF Binary (.glb) do Sketchfab usando a API v3 oficial.
 *
 * Uso: SKETCHFAB_API_TOKEN=... node scripts/download-models.mjs
 *   ou node scripts/download-models.mjs <token>
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const token = process.argv[2] || process.env.SKETCHFAB_API_TOKEN;
if (!token) {
  console.error('Erro: informe o token do Sketchfab: node scripts/download-models.mjs <token>');
  process.exit(1);
}

const ROOT = process.cwd();
const SRC_DIR = join(ROOT, 'assets-src', 'models');
const MANIFEST = join(ROOT, 'src', 'engine', 'models3d.data.json');

mkdirSync(SRC_DIR, { recursive: true });

const models = JSON.parse(readFileSync(MANIFEST, 'utf8'));

// Prioridade 1: modelos com targets (ligados ao catálogo)
// Prioridade 2: modelos de vitrine
const catalogModels = models.filter((m) => m.targets && m.targets.length > 0);
const showcaseModels = models.filter((m) => !m.targets || m.targets.length === 0);
const orderedModels = [...catalogModels, ...showcaseModels];

console.log(`Iniciando download de ${orderedModels.length} modelos (${catalogModels.length} catálogo, ${showcaseModels.length} vitrine)...`);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let downloadedCount = 0;
let skippedCount = 0;
let failedCount = 0;
const results = [];

for (let i = 0; i < orderedModels.length; i++) {
  const model = orderedModels[i];
  const destPath = join(SRC_DIR, `${model.id}.glb`);
  const label = `[${i + 1}/${orderedModels.length}] ${model.id}`;

  if (existsSync(destPath) && statSync(destPath).size > 1000) {
    console.log(`${label}: já existe (${(statSync(destPath).size / 1024 / 1024).toFixed(2)} MB), ignorando.`);
    skippedCount++;
    results.push({ id: model.id, status: 'EXISTING', size: statSync(destPath).size });
    continue;
  }

  console.log(`${label}: solicitando URL de download para UID ${model.uid} (${model.name})...`);

  try {
    const res = await fetch(`https://api.sketchfab.com/v3/models/${model.uid}/download`, {
      headers: { Authorization: `Token ${token}` },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`  ❌ Erro HTTP ${res.status}: ${errText}`);
      failedCount++;
      results.push({ id: model.id, status: 'ERROR', error: `HTTP ${res.status}: ${errText}` });
      await sleep(1000);
      continue;
    }

    const data = await res.json();
    const downloadUrl = data.glb?.url;

    if (!downloadUrl) {
      console.warn(`  ⚠ Formato .glb não disponível na resposta (disponível: ${Object.keys(data).join(', ')}).`);
      failedCount++;
      results.push({ id: model.id, status: 'NO_GLB', availableFormats: Object.keys(data) });
      await sleep(1000);
      continue;
    }

    console.log(`  → Baixando arquivo (${(data.glb.size / 1024 / 1024).toFixed(2)} MB)...`);
    const fileRes = await fetch(downloadUrl);
    if (!fileRes.ok) {
      console.error(`  ❌ Erro ao baixar o arquivo .glb: HTTP ${fileRes.status}`);
      failedCount++;
      results.push({ id: model.id, status: 'ERROR_DOWNLOAD', error: `HTTP ${fileRes.status}` });
      await sleep(1000);
      continue;
    }

    const buffer = await fileRes.arrayBuffer();
    writeFileSync(destPath, Buffer.from(buffer));
    const finalSize = statSync(destPath).size;
    console.log(`  ✓ Salvo em assets-src/models/${model.id}.glb (${(finalSize / 1024 / 1024).toFixed(2)} MB)`);
    downloadedCount++;
    results.push({ id: model.id, status: 'OK', size: finalSize });

    // Espera 800ms entre requisições para evitar rate limit
    await sleep(800);
  } catch (err) {
    console.error(`  ❌ Exceção:`, err.message);
    failedCount++;
    results.push({ id: model.id, status: 'EXCEPTION', error: err.message });
    await sleep(1000);
  }
}

console.log('\n--- RESUMO DO DOWNLOAD ---');
console.log(`Novos baixados: ${downloadedCount}`);
console.log(`Já existentes: ${skippedCount}`);
console.log(`Falhas: ${failedCount}`);
console.log(`Total em assets-src/models/: ${downloadedCount + skippedCount} de ${orderedModels.length}`);
