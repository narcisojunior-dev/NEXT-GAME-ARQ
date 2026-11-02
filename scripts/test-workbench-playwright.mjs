import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=gl-egl', '--ignore-gpu-blocklist']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await context.newPage();

  console.log('Navegando para http://localhost:3001...');
  await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Executa a montagem no contexto da aplicação
  const res = await page.evaluate(() => {
    const store = window.useAssemblyStore.getState();
    store.resetAssembly();

    // 1. Descarga ESD
    store.dischargeEsd();

    // 2. Placa AM4
    store.installMotherboard({
      id: 'mb_b550m_asrock',
      name: 'ASRock B550M-HDV',
      category: 'MOTHERBOARD',
      formFactor: 'Micro-ATX',
      socket: 'AM4',
      chipset: 'AMD B550',
      supportedRam: 'DDR4',
      ramSlotsCount: 2,
      maxMemoryGb: 64,
      pciSlots16x: 1,
      m2SlotsCount: 1,
      sataPortsCount: 4,
      hasIntegratedIoShield: false,
      price: 520,
      description: 'Placa AM4 Micro-ATX.',
      levelRequired: 1,
      image: '/images/components/motherboard-b550m.svg'
    });

    // 3. CPU AM4
    const cpuOk = store.installCpu({
      id: 'cpu_ryzen_5600',
      name: 'AMD Ryzen 5 5600',
      category: 'CPU',
      socket: 'AM4',
      cores: 6,
      threads: 12,
      baseClockGhz: 3.5,
      boostClockGhz: 4.4,
      tdpWatts: 65,
      hasIntegratedGpu: false,
      recommendedCoolerTdpWatts: 65,
      benchmarkScore: 21500,
      price: 780,
      description: 'Ryzen 5 5600 AM4.',
      levelRequired: 1,
      image: '/images/components/cpu-ryzen.svg'
    });
    store.toggleSocketLever();

    // 4. Pasta Térmica
    store.applyThermalPaste();

    // 5. RAM DDR4
    const ramOk2 = store.installRam(2, {
      id: 'ram_crucial_8gb',
      name: 'Crucial Basics 8GB DDR4 3200MHz',
      category: 'RAM',
      ramType: 'DDR4',
      capacityGb: 8,
      moduleCount: 1,
      frequencyMhz: 3200,
      price: 130,
      description: 'Módulo DDR4.',
      levelRequired: 1,
      image: '/images/components/ram-ddr4.svg'
    });

    const ramOk4 = store.installRam(4, {
      id: 'ram_crucial_8gb_b',
      name: 'Crucial Basics 8GB DDR4 3200MHz',
      category: 'RAM',
      ramType: 'DDR4',
      capacityGb: 8,
      moduleCount: 1,
      frequencyMhz: 3200,
      price: 130,
      description: 'Módulo DDR4.',
      levelRequired: 1,
      image: '/images/components/ram-ddr4.svg'
    });

    return {
      cpuInstalled: Boolean(store.assembly.cpuInstalled),
      thermalPasteApplied: store.assembly.thermalPasteApplied,
      ramSlot2: Boolean(store.assembly.ramInstalledSlot2),
      ramSlot4: Boolean(store.assembly.ramInstalledSlot4),
      leverLocked: store.assembly.socketLeverLocked
    };
  });

  console.log('Status da montagem:', res);

  // Clica no botão Topo
  const topBtn = page.locator('button:has-text("Topo")').first();
  if (await topBtn.count() > 0) {
    await topBtn.click();
    console.log('Clicou no botão Topo.');
  }

  // Rola até o container 3D
  const container = page.locator('text=Bancada 3D Interativa').first();
  await container.scrollIntoViewIfNeeded();
  await page.waitForTimeout(3000);

  // Captura o elemento exato do Workbench3D
  const benchElement = page.locator('div:has-text("Bancada 3D Interativa")').locator('xpath=ancestor::div[contains(@class, "rounded-2xl")]').first();
  const topShot = await benchElement.screenshot();
  writeFileSync('C:/Users/Narciso Junior/.gemini/antigravity/brain/c0073171-2f40-46a4-a42e-27f3f172988e/bench-view-top-clean.png', topShot);
  console.log('Screenshot Topo da Bancada salvo.');

  // Alterna para Isométrica
  const isoBtn = page.locator('button:has-text("Isométrica")').first();
  if (await isoBtn.count() > 0) {
    await isoBtn.click();
    await page.waitForTimeout(2000);
    const isoShot = await benchElement.screenshot();
    writeFileSync('C:/Users/Narciso Junior/.gemini/antigravity/brain/c0073171-2f40-46a4-a42e-27f3f172988e/bench-view-iso-clean.png', isoShot);
    console.log('Screenshot Isométrica da Bancada salvo.');
  }

  // Agora instala o cooler e captura
  await page.evaluate(() => {
    const store = window.useAssemblyStore.getState();
    store.installCooler({
      id: 'cooler_torre',
      name: 'DeepCool AK400 Torre',
      category: 'COOLER',
      coolerType: 'Air_Tower',
      supportedSockets: ['AM4', 'AM5', 'LGA1700'],
      maxTdpWatts: 220,
      hasRgb: false,
      price: 180,
      description: 'Cooler de torre.',
      levelRequired: 1,
      image: '/images/components/cooler-tower.svg'
    });
  });

  await page.waitForTimeout(2000);
  const coolerShot = await benchElement.screenshot();
  writeFileSync('C:/Users/Narciso Junior/.gemini/antigravity/brain/c0073171-2f40-46a4-a42e-27f3f172988e/bench-view-cooler-clean.png', coolerShot);
  console.log('Screenshot com Cooler salvo.');

  await browser.close();
}

main().catch(console.error);
