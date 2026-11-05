/**
 * Stores que a página expõe para os testes E2E depois da hidratação (src/app/page.tsx e, com o
 * Modo Decorar aberto, src/components/room3d/DecorScene.tsx). Tipados, sem casts.
 */
import type { useAssemblyStore } from '../../src/store/useAssemblyStore';
import type { useProgressStore } from '../../src/store/useProgressStore';
import type { useRoomDecorStore } from '../../src/store/useRoomDecorStore';
import type { useDecorModeStore } from '../../src/components/room3d/decorModeStore';

declare global {
  interface Window {
    useAssemblyStore: typeof useAssemblyStore;
    useProgressStore: typeof useProgressStore;
    useRoomDecorStore: typeof useRoomDecorStore;
    useDecorModeStore: typeof useDecorModeStore;
  }
}

export {};
