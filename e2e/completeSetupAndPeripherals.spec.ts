import { test, expect } from '@playwright/test';

test.describe('E2E: Montagem Completa na Bancada 3D e Personalização de Periféricos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // Aguarda a hidratação completa da aplicação React/Next.js
    await page.waitForFunction(
      () => typeof (window as any).useAssemblyStore !== 'undefined',
      { timeout: 15000 }
    );
  });

  test('monta o computador completo na bancada 3D com GPU e valida boot POST e telemetria', async ({ page }) => {
    // 1. Executa a montagem completa via store no contexto da página
    const assemblyResult = await page.evaluate(async () => {
      const store = (window as unknown as { useAssemblyStore: { getState: () => any } }).useAssemblyStore.getState();
      store.resetAssembly();

      // Preparação física
      store.dischargeEsd();
      store.installStandoffs();
      store.installIoShield();

      // Placa-Mãe AM4
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
        image: '/images/components/motherboard-b550m.svg',
      });
      store.screwMotherboard();

      // CPU Ryzen AM4
      store.installCpu({
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
        image: '/images/components/cpu-ryzen.svg',
      });
      store.toggleSocketLever();

      // Pasta Térmica Obrigatória
      store.applyThermalPaste();

      // Cooler Torre
      store.installCooler({
        id: 'cooler_torre',
        name: 'DeepCool AK400 Torre',
        category: 'COOLER',
        coolerType: 'Air',
        supportedSockets: ['AM4', 'AM5', 'LGA1700'],
        maxTdpWatts: 220,
        hasRgb: false,
        price: 180,
        description: 'Cooler de torre.',
        levelRequired: 1,
        image: '/images/components/cooler-tower.svg',
      });

      // RAM Dual Channel
      store.installRam(2, {
        id: 'ram_crucial_8gb',
        name: 'Crucial Basics 8GB DDR4',
        category: 'RAM',
        ramType: 'DDR4',
        capacityGb: 8,
        moduleCount: 1,
        frequencyMhz: 3200,
        price: 130,
        description: 'Módulo DDR4.',
        levelRequired: 1,
        image: '/images/components/ram-ddr4.svg',
      });
      store.installRam(4, {
        id: 'ram_crucial_8gb_b',
        name: 'Crucial Basics 8GB DDR4',
        category: 'RAM',
        ramType: 'DDR4',
        capacityGb: 8,
        moduleCount: 1,
        frequencyMhz: 3200,
        price: 130,
        description: 'Módulo DDR4.',
        levelRequired: 1,
        image: '/images/components/ram-ddr4.svg',
      });

      // SSD M.2
      store.installStorage(
        {
          id: 'ssd_nvme_990pro',
          name: 'Samsung 990 PRO 1TB NVMe M.2',
          category: 'STORAGE',
          storageType: 'NVMe_M2',
          capacityGb: 1000,
          readSpeedMbs: 7450,
          writeSpeedMbs: 6900,
          price: 680,
          description: 'SSD NVMe PCIe 4.0.',
          levelRequired: 1,
          image: '/images/components/ssd-nvme.svg',
        },
        'M2'
      );

      // GPU Dedicada
      store.installGpu({
        id: 'gpu_rx6700xt',
        name: 'AMD Radeon RX 6700 XT 12GB',
        category: 'GPU',
        vramGb: 12,
        lengthMm: 267,
        requiredPsuWatts: 650,
        powerPins: '8pin',
        benchmarkScore: 11800,
        price: 2400,
        tdpWatts: 230,
        description: 'GPU dedicada 12GB.',
        levelRequired: 1,
        image: '/images/components/gpu-rx6700xt.svg',
      });
      store.screwGpu();

      // Gabinete e Fonte
      store.installCase({
        id: 'case_corsair_4000d',
        name: 'Corsair 4000D Airflow',
        category: 'CASE',
        formFactor: 'ATX',
        supportedFormFactors: ['ATX', 'Micro-ATX', 'Mini-ITX'],
        maxGpuLengthMm: 360,
        driveBays25: 2,
        driveBays35: 2,
        fansIncluded: 2,
        hasRgb: false,
        price: 490,
        description: 'Gabinete Mid-Tower.',
        levelRequired: 1,
        image: '/images/components/case-corsair.svg',
      });

      store.installPsu({
        id: 'psu_msi_650w',
        name: 'MSI MAG A650BN 650W 80 Plus Bronze',
        category: 'PSU',
        wattage: 650,
        efficiencyRating: '80 Plus Bronze',
        isModular: false,
        pcieConnectors: 2,
        sataConnectors: 5,
        price: 320,
        description: 'Fonte 650W.',
        levelRequired: 1,
        image: '/images/components/psu-bronze.svg',
      });

      // Cabeamento completo
      store.connectCableTo('ATX_24PIN', 'ATX_PWR');
      store.connectCableTo('EPS_8PIN', 'ATX12V');
      store.connectCableTo('CPU_FAN_CABLE', 'CPU_FAN');
      store.connectCableTo('PCIE_8PIN', 'GPU_POWER');
      store.connectFPanelJumper('POWER_SW', [6, 8]);
      store.togglePsuSwitch();

      // Dispara o Boot POST
      store.triggerPostBoot();

      // Aguarda os 700ms do ciclo POST
      await new Promise((r) => setTimeout(r, 1200));

      const current = (window as unknown as { useAssemblyStore: { getState: () => any } }).useAssemblyStore.getState();

      return {
        esd: current.assembly.esdDischarged,
        cpu: Boolean(current.assembly.cpuInstalled),
        thermalPaste: current.assembly.thermalPasteApplied,
        cooler: Boolean(current.assembly.coolerInstalled),
        gpu: Boolean(current.assembly.gpuInstalled),
        bootSuccess: current.postResult?.bootSuccess,
        debugLeds: current.postResult?.debugLed,
      };
    });

    expect(assemblyResult.cpu).toBe(true);
    expect(assemblyResult.cooler).toBe(true);
    expect(assemblyResult.gpu).toBe(true);
    expect(assemblyResult.thermalPaste).toBe(true);
    expect(assemblyResult.bootSuccess).toBe(true);
    expect(assemblyResult.debugLeds.cpu).toBe('GREEN');
    expect(assemblyResult.debugLeds.dram).toBe('GREEN');
    expect(assemblyResult.debugLeds.vga).toBe('GREEN');
    expect(assemblyResult.debugLeds.boot).toBe('GREEN');

    // Verifica que o container da Bancada 3D está visível
    const benchTitle = page.locator('text=Bancada 3D Interativa').first();
    await benchTitle.scrollIntoViewIfNeeded();
    await expect(benchTitle).toBeVisible();

    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible({ timeout: 15000 });
  });

  test('abre a Sala Virtual, seleciona periféricos (Monitor, Teclado, Mouse) e atualiza setup', async ({ page }) => {
    // Abre a Sala Virtual via store diretamente para máxima estabilidade
    await page.evaluate(() => {
      const store = (window as unknown as { useAssemblyStore: { getState: () => any } }).useAssemblyStore.getState();
      store.openVirtualRoomModal();
    });

    // Modal da Sala Virtual deve estar visível
    const modalHeader = page.locator('h2:has-text("Setup Completo")').first();
    await expect(modalHeader).toBeVisible({ timeout: 8000 });

    // Verifica que o Canvas 2D da Sala Virtual está montado e visível
    const canvas = page.locator('canvas').last();
    await expect(canvas).toBeVisible();

    // 1. Testa troca de Monitor
    const monTab = page.getByRole('button', { name: '🖥️ Monitor' });
    await monTab.click();
    const monOption = page.locator('text=Samsung Odyssey G5').first();
    await expect(monOption).toBeVisible();
    await monOption.click({ force: true });

    // 2. Testa troca de Teclado
    const kbTab = page.getByRole('button', { name: '⌨️ Teclado' });
    await kbTab.click();
    const kbOption = page.locator('text=Redragon Kumara').first();
    await expect(kbOption).toBeVisible();
    await kbOption.click({ force: true });

    // 3. Testa troca de Mouse
    const mouseTab = page.getByRole('button', { name: '🖱️ Mouse' });
    await mouseTab.click();
    const mouseOption = page.locator('text=Logitech G Pro X Superlight').first();
    await expect(mouseOption).toBeVisible();
    await mouseOption.click({ force: true });

    // 4. Testa troca de Gabinete
    const caseTab = page.getByRole('button', { name: '📦 Gabinete' });
    await caseTab.click();
    const caseOption = page.locator('text=Lian Li O11 Dynamic EVO').first();
    await expect(caseOption).toBeVisible();
    await caseOption.click({ force: true });

    // 5. Botão de Download do Setup em PNG deve estar presente
    const downloadBtn = page.locator('button:has-text("BAIXAR FOTO DO MEU SETUP")');
    await expect(downloadBtn).toBeVisible();

    // Valida que o setup foi atualizado na store
    const updatedSetup = await page.evaluate(() => {
      const store = (window as unknown as { useAssemblyStore: { getState: () => any } }).useAssemblyStore.getState();
      return {
        monitorId: store.studentSetup.monitor.id,
        keyboardId: store.studentSetup.keyboard.id,
        mouseId: store.studentSetup.mouse.id,
        caseId: store.studentSetup.caseTheme.id,
      };
    });

    expect(updatedSetup.monitorId).toBe('mon-34-ultrawide');
    expect(updatedSetup.keyboardId).toBe('kb-mech-tkl-red');
    expect(updatedSetup.mouseId).toBe('mouse-gamer-65g');
    expect(updatedSetup.caseId).toBe('case-aquarium-rgb');

    // Fecha o modal via store
    await page.evaluate(() => {
      const store = (window as unknown as { useAssemblyStore: { getState: () => any } }).useAssemblyStore.getState();
      store.closeVirtualRoomModal();
    });
    await expect(modalHeader).not.toBeVisible();
  });
});
