import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  DeskSnapPointId,
  DESK_SNAP_POINTS,
  canPlaceOnDesk,
  canRemoveFromDesk,
  deriveDeskStage,
  PlacedDeskItem,
  DeskSetupState,
  createInitialDeskSetupState,
} from '../deskSetup';
import {
  DESKS,
  CHAIRS,
  MOUSEPADS,
  MONITORS,
  KEYBOARDS,
  MICE,
  MONITOR_STANDS,
  AUDIO_DEVICES,
  DEFAULT_STUDENT_SETUP,
} from '../peripheralsCatalog';
import {
  CPUS,
  MOTHERBOARDS,
  COOLERS,
  RAMS,
  STORAGES,
  GPUS,
  CASES,
  PSUS,
} from '../hardwareCatalog';
import { AssemblyState, MotherboardComponent } from '../types';
import { INITIAL_ASSEMBLY_STATE } from '../assemblyState';

describe('1. Especificação de Snap Points da Mesa (DESK_SNAP_POINTS)', () => {
  const REQUIRED_SNAP_POINTS: DeskSnapPointId[] = [
    'DESK_BASE',
    'PC_TOWER',
    'MONITOR_MAIN',
    'MONITOR_ARM',
    'MOUSEPAD',
    'KEYBOARD',
    'MOUSE',
    'HEADSET',
    'CHAIR',
  ];

  it('deve conter exatamente os 9 snap points canônicos', () => {
    REQUIRED_SNAP_POINTS.forEach((id) => {
      expect(DESK_SNAP_POINTS[id]).toBeDefined();
      expect(DESK_SNAP_POINTS[id].id).toBe(id);
      expect(DESK_SNAP_POINTS[id].nominalPosition).toHaveLength(3);
      expect(typeof DESK_SNAP_POINTS[id].label).toBe('string');
    });
  });

  it('deve definir corretamente os snap points obrigatórios para o boot', () => {
    expect(DESK_SNAP_POINTS.DESK_BASE.isRequiredForBoot).toBe(true);
    expect(DESK_SNAP_POINTS.PC_TOWER.isRequiredForBoot).toBe(true);
    expect(DESK_SNAP_POINTS.MONITOR_MAIN.isRequiredForBoot).toBe(true);
    expect(DESK_SNAP_POINTS.KEYBOARD.isRequiredForBoot).toBe(true);
    expect(DESK_SNAP_POINTS.MOUSE.isRequiredForBoot).toBe(true);

    expect(DESK_SNAP_POINTS.CHAIR.isRequiredForBoot).toBe(false);
    expect(DESK_SNAP_POINTS.MOUSEPAD.isRequiredForBoot).toBe(false);
    expect(DESK_SNAP_POINTS.HEADSET.isRequiredForBoot).toBe(false);
  });
});

describe('2. Validação de Posicionamento (canPlaceOnDesk)', () => {
  const dummyContext = {
    isPcAssembled: true,
    studentSetup: DEFAULT_STUDENT_SETUP,
  };

  it('permite posicionar a mesa DESK_BASE em mesa vazia', () => {
    const res = canPlaceOnDesk('DESK_BASE', DESKS[0], {}, dummyContext);
    expect(res.allowed).toBe(true);
  });

  it('permite posicionar a cadeira CHAIR independente da mesa estar colocada', () => {
    const res = canPlaceOnDesk('CHAIR', CHAIRS[0], {}, dummyContext);
    expect(res.allowed).toBe(true);
  });

  it('rejeita posicionar periféricos na mesa se DESK_BASE não estiver posicionada', () => {
    const res = canPlaceOnDesk('KEYBOARD', KEYBOARDS[0], {}, dummyContext);
    expect(res.allowed).toBe(false);
    expect(res.isErrorPenalty).toBe(false);
    expect(res.message).toMatch(/mesa/i);
  });

  it('rejeita colocar item com categoria incompatível no snap point e aplica penalidade', () => {
    const deskPlaced: Partial<Record<DeskSnapPointId, PlacedDeskItem>> = {
      DESK_BASE: { snapPointId: 'DESK_BASE', itemId: DESKS[0].id, name: DESKS[0].name, category: 'DESK', price: DESKS[0].price },
    };
    // Tenta colocar monitor no snap point de teclado
    const res = canPlaceOnDesk('KEYBOARD', MONITORS[0], deskPlaced, dummyContext);
    expect(res.allowed).toBe(false);
    expect(res.isErrorPenalty).toBe(true);
    expect(res.message).toMatch(/aceita apenas/i);
  });

  it('rejeita posicionar PC_TOWER se o PC ainda não estiver com a montagem finalizada', () => {
    const deskPlaced: Partial<Record<DeskSnapPointId, PlacedDeskItem>> = {
      DESK_BASE: { snapPointId: 'DESK_BASE', itemId: DESKS[0].id, name: DESKS[0].name, category: 'DESK', price: DESKS[0].price },
    };
    const res = canPlaceOnDesk('PC_TOWER', 'PC_TOWER', deskPlaced, {
      ...dummyContext,
      isPcAssembled: false,
    });
    expect(res.allowed).toBe(false);
    expect(res.message).toMatch(/montagem do computador/i);
  });

  it('rejeita posicionar MONITOR_MAIN se o setup exigir braço articulado e MONITOR_ARM não estiver colocado', () => {
    const deskPlaced: Partial<Record<DeskSnapPointId, PlacedDeskItem>> = {
      DESK_BASE: { snapPointId: 'DESK_BASE', itemId: DESKS[0].id, name: DESKS[0].name, category: 'DESK', price: DESKS[0].price },
    };
    const armSetup = {
      ...DEFAULT_STUDENT_SETUP,
      stand: MONITOR_STANDS.find((s) => s.id === 'stand-gas-arm')!,
    };
    const res = canPlaceOnDesk('MONITOR_MAIN', MONITORS[0], deskPlaced, {
      ...dummyContext,
      studentSetup: armSetup,
    });
    expect(res.allowed).toBe(false);
    expect(res.message).toMatch(/suporte articulado a gás/i);
  });
});

describe('3. Validação de Remoção Segura (canRemoveFromDesk)', () => {
  it('permite remover item folha (como teclado ou cadeira) sem dependentes', () => {
    const items: Partial<Record<DeskSnapPointId, PlacedDeskItem>> = {
      DESK_BASE: { snapPointId: 'DESK_BASE', itemId: DESKS[0].id, name: DESKS[0].name, category: 'DESK', price: DESKS[0].price },
      KEYBOARD: { snapPointId: 'KEYBOARD', itemId: KEYBOARDS[0].id, name: KEYBOARDS[0].name, category: 'KEYBOARD', price: KEYBOARDS[0].price },
    };
    const res = canRemoveFromDesk('KEYBOARD', items);
    expect(res.allowed).toBe(true);
  });

  it('rejeita remover DESK_BASE se ainda houver itens apoiados sobre ela', () => {
    const items: Partial<Record<DeskSnapPointId, PlacedDeskItem>> = {
      DESK_BASE: { snapPointId: 'DESK_BASE', itemId: DESKS[0].id, name: DESKS[0].name, category: 'DESK', price: DESKS[0].price },
      KEYBOARD: { snapPointId: 'KEYBOARD', itemId: KEYBOARDS[0].id, name: KEYBOARDS[0].name, category: 'KEYBOARD', price: KEYBOARDS[0].price },
    };
    const res = canRemoveFromDesk('DESK_BASE', items);
    expect(res.allowed).toBe(false);
    expect(res.message).toMatch(/remova os periféricos/i);
  });

  it('rejeita remover MOUSEPAD se teclado ou mouse estiverem sobre ele', () => {
    const items: Partial<Record<DeskSnapPointId, PlacedDeskItem>> = {
      DESK_BASE: { snapPointId: 'DESK_BASE', itemId: DESKS[0].id, name: DESKS[0].name, category: 'DESK', price: DESKS[0].price },
      MOUSEPAD: { snapPointId: 'MOUSEPAD', itemId: MOUSEPADS[0].id, name: MOUSEPADS[0].name, category: 'MOUSEPAD', price: MOUSEPADS[0].price },
      MOUSE: { snapPointId: 'MOUSE', itemId: MICE[0].id, name: MICE[0].name, category: 'MOUSE', price: MICE[0].price },
    };
    const res = canRemoveFromDesk('MOUSEPAD', items);
    expect(res.allowed).toBe(false);
    expect(res.message).toMatch(/remova o teclado e o mouse/i);
  });
});

describe('4. Máquina de Estados da Mesa (deriveDeskStage)', () => {
  const baseAssembly: AssemblyState = {
    ...INITIAL_ASSEMBLY_STATE,
    esdDischarged: true,
  };

  const dummyMb: MotherboardComponent = MOTHERBOARDS[0];

  const readyAssembly: AssemblyState = {
    ...baseAssembly,
    cpuInstalled: CPUS[0],
    socketLeverLocked: true,
    thermalPasteApplied: true,
    coolerInstalled: COOLERS[0],
    ramInstalledSlot2: RAMS[0],
    storageInstalled: STORAGES[0],
    gpuInstalled: GPUS[0],
    gpuScrewed: true,
    caseInstalled: CASES[0],
    psuInstalled: PSUS[0],
    motherboardScrewed: true,
  };

  it('retorna LOCKED se o PC ainda não estiver em PHASE_7_BOOT_POST', () => {
    const stage = deriveDeskStage({
      assembly: baseAssembly,
      selectedMotherboard: dummyMb,
      deskSetup: createInitialDeskSetupState(),
      isDeskPoweredOn: false,
    });
    expect(stage).toBe('LOCKED');
  });

  it('retorna FURNISHING se PC está montado mas faltam itens obrigatórios na mesa', () => {
    const stage = deriveDeskStage({
      assembly: readyAssembly,
      selectedMotherboard: dummyMb,
      deskSetup: createInitialDeskSetupState(),
      isDeskPoweredOn: false,
    });
    expect(stage).toBe('FURNISHING');
  });

  it('retorna CABLING quando todos os itens obrigatórios estão na mesa mas cabos faltam', () => {
    const deskSetup: DeskSetupState = {
      ...createInitialDeskSetupState(),
      placedDeskItems: {
        DESK_BASE: { snapPointId: 'DESK_BASE', itemId: 'desk', name: 'Mesa', category: 'DESK', price: 400 },
        PC_TOWER: { snapPointId: 'PC_TOWER', itemId: 'pc', name: 'PC', category: 'PC_TOWER', price: 0 },
        MONITOR_MAIN: { snapPointId: 'MONITOR_MAIN', itemId: 'mon', name: 'Monitor', category: 'MONITOR', price: 1000 },
        KEYBOARD: { snapPointId: 'KEYBOARD', itemId: 'kb', name: 'Teclado', category: 'KEYBOARD', price: 200 },
        MOUSE: { snapPointId: 'MOUSE', itemId: 'mouse', name: 'Mouse', category: 'MOUSE', price: 150 },
      },
    };

    const stage = deriveDeskStage({
      assembly: readyAssembly,
      selectedMotherboard: dummyMb,
      deskSetup,
      isDeskPoweredOn: false,
      externalCablesStatus: {
        allRequiredConnected: false,
        hasPowerAc: false,
        hasDisplayCorrect: false,
      },
    });
    expect(stage).toBe('CABLING');
  });

  it('retorna READY_TO_BOOT quando todos os itens e cabos estão corretos mas PC desligado', () => {
    const deskSetup: DeskSetupState = {
      ...createInitialDeskSetupState(),
      placedDeskItems: {
        DESK_BASE: { snapPointId: 'DESK_BASE', itemId: 'desk', name: 'Mesa', category: 'DESK', price: 400 },
        PC_TOWER: { snapPointId: 'PC_TOWER', itemId: 'pc', name: 'PC', category: 'PC_TOWER', price: 0 },
        MONITOR_MAIN: { snapPointId: 'MONITOR_MAIN', itemId: 'mon', name: 'Monitor', category: 'MONITOR', price: 1000 },
        KEYBOARD: { snapPointId: 'KEYBOARD', itemId: 'kb', name: 'Teclado', category: 'KEYBOARD', price: 200 },
        MOUSE: { snapPointId: 'MOUSE', itemId: 'mouse', name: 'Mouse', category: 'MOUSE', price: 150 },
      },
    };

    const stage = deriveDeskStage({
      assembly: readyAssembly,
      selectedMotherboard: dummyMb,
      deskSetup,
      isDeskPoweredOn: false,
      externalCablesStatus: {
        allRequiredConnected: true,
        hasPowerAc: true,
        hasDisplayCorrect: true,
      },
    });
    expect(stage).toBe('READY_TO_BOOT');
  });

  it('retorna RUNNING quando PC está ligado, POST aprovado e cabos corretos', () => {
    const deskSetup: DeskSetupState = {
      ...createInitialDeskSetupState(),
      placedDeskItems: {
        DESK_BASE: { snapPointId: 'DESK_BASE', itemId: 'desk', name: 'Mesa', category: 'DESK', price: 400 },
        PC_TOWER: { snapPointId: 'PC_TOWER', itemId: 'pc', name: 'PC', category: 'PC_TOWER', price: 0 },
        MONITOR_MAIN: { snapPointId: 'MONITOR_MAIN', itemId: 'mon', name: 'Monitor', category: 'MONITOR', price: 1000 },
        KEYBOARD: { snapPointId: 'KEYBOARD', itemId: 'kb', name: 'Teclado', category: 'KEYBOARD', price: 200 },
        MOUSE: { snapPointId: 'MOUSE', itemId: 'mouse', name: 'Mouse', category: 'MOUSE', price: 150 },
      },
    };

    const stage = deriveDeskStage({
      assembly: readyAssembly,
      selectedMotherboard: dummyMb,
      deskSetup,
      isDeskPoweredOn: true,
      externalCablesStatus: {
        allRequiredConnected: true,
        hasPowerAc: true,
        hasDisplayCorrect: true,
      },
    });
    expect(stage).toBe('RUNNING');
  });

  it('retorna CABLING se ligado mas o cabo de vídeo estiver incorreto ou desconectado', () => {
    const deskSetup: DeskSetupState = {
      ...createInitialDeskSetupState(),
      placedDeskItems: {
        DESK_BASE: { snapPointId: 'DESK_BASE', itemId: 'desk', name: 'Mesa', category: 'DESK', price: 400 },
        PC_TOWER: { snapPointId: 'PC_TOWER', itemId: 'pc', name: 'PC', category: 'PC_TOWER', price: 0 },
        MONITOR_MAIN: { snapPointId: 'MONITOR_MAIN', itemId: 'mon', name: 'Monitor', category: 'MONITOR', price: 1000 },
        KEYBOARD: { snapPointId: 'KEYBOARD', itemId: 'kb', name: 'Teclado', category: 'KEYBOARD', price: 200 },
        MOUSE: { snapPointId: 'MOUSE', itemId: 'mouse', name: 'Mouse', category: 'MOUSE', price: 150 },
      },
    };

    const stage = deriveDeskStage({
      assembly: readyAssembly,
      selectedMotherboard: dummyMb,
      deskSetup,
      isDeskPoweredOn: true,
      externalCablesStatus: {
        allRequiredConnected: false,
        hasPowerAc: true,
        hasDisplayCorrect: false,
      },
    });
    expect(stage).toBe('CABLING');
  });
});

describe('5. Pureza do Motor de Regras (src/engine/)', () => {
  it('src/engine/deskSetup.ts não deve importar bibliotecas de UI ou DOM', () => {
    const filePath = path.resolve(__dirname, '../deskSetup.ts');
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf-8');
    const FORBIDDEN = [
      'react',
      'three',
      '@react-three',
      'zustand',
      'next',
      'window',
      'document',
    ];
    FORBIDDEN.forEach((pkg) => {
      const importRegex = new RegExp(`from ['"]${pkg}['"]|require\\(['"]${pkg}['"]\\)`, 'g');
      expect(content).not.toMatch(importRegex);
    });
  });
});
