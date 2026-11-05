import { describe, it, expect } from 'vitest';
import {
  CPUS,
  MOTHERBOARDS,
  RAMS,
  COOLERS,
  GPUS,
  STORAGES,
  PSUS,
  CASES,
  THERMAL_PASTES,
} from '../hardwareCatalog';

describe('Catálogo de Hardware: integridade e validações (Issue #41)', () => {
  it('garante que todos os componentes de cada categoria possuem IDs únicos', () => {
    const categories = [
      { name: 'CPUS', items: CPUS },
      { name: 'MOTHERBOARDS', items: MOTHERBOARDS },
      { name: 'RAMS', items: RAMS },
      { name: 'COOLERS', items: COOLERS },
      { name: 'GPUS', items: GPUS },
      { name: 'STORAGES', items: STORAGES },
      { name: 'PSUS', items: PSUS },
      { name: 'CASES', items: CASES },
      { name: 'THERMAL_PASTES', items: THERMAL_PASTES },
    ];

    categories.forEach(({ name, items }) => {
      const ids = items.map((i) => i.id);
      const uniqueIds = new Set(ids);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      expect(
        uniqueIds.size,
        `Categoria ${name} possui IDs duplicados: ${duplicates.join(', ')}`
      ).toBe(items.length);
    });
  });

  it('garante apenas uma entrada para o Cooler Intel Laminar', () => {
    const laminarCoolers = COOLERS.filter((c) => c.id === 'cooler-intel-laminar');
    expect(laminarCoolers.length).toBe(1);
  });

  it('armazenamento com taxa de leitura abaixo de 300 MB/s não pode ser classificado como SSD', () => {
    STORAGES.forEach((storage) => {
      if (storage.readSpeedMbps < 300) {
        expect(
          storage.storageType,
          `${storage.id} tem velocidade ${storage.readSpeedMbps} MB/s e não pode ser SSD`
        ).not.toMatch(/SSD/);
      }
    });

    const wdBlue = STORAGES.find((s) => s.id === 'hdd-wd-blue-1tb');
    expect(wdBlue).toBeDefined();
    expect(wdBlue?.storageType).toBe('SATA_HDD');
  });
});

describe('Catálogo: campos usados pelas regras e ilustrações preenchidos em toda peça (#23)', () => {
  const positive = (v: number) => Number.isFinite(v) && v > 0;
  const SOCKETS = ['AM4', 'AM5', 'LGA1700'];

  it('todas as peças têm nome, descrição, analogia, curiosidade e preço', () => {
    [...CPUS, ...MOTHERBOARDS, ...RAMS, ...COOLERS, ...GPUS, ...STORAGES, ...PSUS, ...CASES, ...THERMAL_PASTES].forEach((p) => {
      expect(p.name.trim(), p.id).not.toBe('');
      expect(p.description.trim(), `${p.id} descrição`).not.toBe('');
      expect(p.analogy.trim(), `${p.id} analogia`).not.toBe('');
      expect(p.trivia.trim(), `${p.id} curiosidade`).not.toBe('');
      expect(p.price, `${p.id} preço`).toBeGreaterThanOrEqual(0);
    });
  });

  it('coolers: soquetes conhecidos e TDP suportado', () => {
    COOLERS.forEach((c) => {
      expect(c.supportedSockets.length, c.id).toBeGreaterThan(0);
      c.supportedSockets.forEach((s) => expect(SOCKETS, c.id).toContain(s));
      expect(positive(c.maxTdpWatts), `${c.id} maxTdpWatts`).toBe(true);
    });
  });

  it('GPUs: comprimento real, fonte recomendada e conector de energia', () => {
    GPUS.forEach((g) => {
      expect(g.lengthMm, g.id).toBeGreaterThanOrEqual(140);
      expect(g.lengthMm, g.id).toBeLessThanOrEqual(400);
      expect(positive(g.requiredPsuWatts), `${g.id} requiredPsuWatts`).toBe(true);
      expect(['8pin', '6+2pin', 'none'], g.id).toContain(g.powerPins);
    });
  });

  it('armazenamento, fontes e gabinetes com os campos das regras', () => {
    STORAGES.forEach((s) => expect(['NVMe_M2', 'SATA_SSD', 'SATA_HDD'], s.id).toContain(s.storageType));
    PSUS.forEach((p) => {
      expect(positive(p.wattage), p.id).toBe(true);
      expect(['Sem Selo', '80 Plus White', '80 Plus Bronze', '80 Plus Gold'], p.id).toContain(p.efficiencyRating);
      expect(typeof p.isModular, p.id).toBe('boolean');
    });
    CASES.forEach((c) => {
      expect(c.supportedFormFactors.length, c.id).toBeGreaterThan(0);
      expect(Number.isInteger(c.fansIncluded) && c.fansIncluded >= 0, `${c.id} fansIncluded`).toBe(true);
      expect(positive(c.maxGpuLengthMm), c.id).toBe(true);
    });
  });

  it('placas e CPUs: soquete conhecido e memória coerente', () => {
    MOTHERBOARDS.forEach((m) => {
      expect(SOCKETS, m.id).toContain(m.socket);
      expect(['DDR4', 'DDR5'], m.id).toContain(m.supportedRam);
    });
    CPUS.forEach((c) => {
      expect(SOCKETS, c.id).toContain(c.socket);
      expect(c.supportedRam.length, c.id).toBeGreaterThan(0);
    });
  });
});
