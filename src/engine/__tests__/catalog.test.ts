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
