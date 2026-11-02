import {
  CpuComponent,
  MotherboardComponent,
  RamComponent,
  PsuComponent,
  AssemblyState,
  ValidationIssue,
} from './types';

export interface PostResult {
  canPowerOn: boolean;
  bootSuccess: boolean;
  debugLed: {
    cpu: 'OFF' | 'RED' | 'GREEN';
    dram: 'OFF' | 'RED' | 'GREEN';
    vga: 'OFF' | 'RED' | 'GREEN';
    boot: 'OFF' | 'RED' | 'GREEN';
  };
  totalTdpWatts: number;
  psuWatts: number;
  issues: ValidationIssue[];
}

/**
 * Validação rigorosa e determinística de compatibilidade física e lógica
 */
export function validateSocket(cpu: CpuComponent, mb: MotherboardComponent): ValidationIssue | null {
  if (cpu.socket !== mb.socket) {
    return {
      type: 'ERROR',
      title: 'Soquete Incompatível!',
      message: `O processador possui soquete ${cpu.socket}, mas a placa-mãe aceita apenas ${mb.socket}. Tentar forçar o encaixe vai entortar ou quebrar os pinos de contato!`,
      suggestedAction: `Escolha uma placa-mãe com soquete ${cpu.socket} ou troque o processador.`,
    };
  }
  return null;
}

export function validateRamType(ram: RamComponent, mb: MotherboardComponent): ValidationIssue | null {
  if (ram.ramType !== mb.supportedRam) {
    return {
      type: 'ERROR',
      title: 'Geração de Memória Incompatível!',
      message: `A memória é do tipo ${ram.ramType}, mas a placa-mãe suporta apenas ${mb.supportedRam}. O chanfro central do pente de memória física é diferente para impedir que entre no slot errado.`,
      suggestedAction: `Utilize memórias do padrão ${mb.supportedRam}.`,
    };
  }
  return null;
}

/**
 * Calcula o consumo total estimado de energia em Watts
 */
export function calculateTotalTdp(state: AssemblyState, mb: MotherboardComponent): number {
  let total = mb.tdpWatts;
  if (state.cpuInstalled) total += state.cpuInstalled.tdpWatts;
  if (state.coolerInstalled) total += state.coolerInstalled.tdpWatts;
  if (state.ramInstalledSlot2) total += state.ramInstalledSlot2.tdpWatts;
  if (state.ramInstalledSlot4) total += state.ramInstalledSlot4.tdpWatts;
  if (state.storageInstalled) total += state.storageInstalled.tdpWatts;
  if (state.gpuInstalled) total += state.gpuInstalled.tdpWatts;
  return total;
}

/**
 * Avalia o teste do POST (Power-On Self Test) quando o botão de ligar é acionado
 */
export function evaluatePostTest(
  state: AssemblyState,
  mb: MotherboardComponent
): PostResult {
  const issues: ValidationIssue[] = [];
  const totalTdp = calculateTotalTdp(state, mb);
  const psuCapacity = state.psuInstalled ? state.psuInstalled.wattage : 0;

  const debugLed = {
    cpu: 'OFF' as 'OFF' | 'RED' | 'GREEN',
    dram: 'OFF' as 'RED' | 'RED' | 'GREEN',
    vga: 'OFF' as 'OFF' | 'RED' | 'GREEN',
    boot: 'OFF' as 'OFF' | 'RED' | 'GREEN',
  };

  // 1. Verificação da Fonte e Chave de Energia
  if (!state.psuInstalled) {
    issues.push({
      type: 'ERROR',
      title: 'Sem Fonte de Alimentação!',
      message: 'O computador não possui fonte instalada. Nenhum componente recebe energia elétrica.',
    });
    return { canPowerOn: false, bootSuccess: false, debugLed, totalTdpWatts: totalTdp, psuWatts: 0, issues };
  }

  if (!state.psuSwitchOn) {
    issues.push({
      type: 'ERROR',
      title: 'Chave da Fonte Desligada (I/O)',
      message: 'A fonte está instalada, mas a chave traseira (I/O) está na posição "O" (Desligado). Coloque na posição "I"!',
      suggestedAction: 'Ligue a chave I/O atrás da fonte.',
    });
    return { canPowerOn: false, bootSuccess: false, debugLed, totalTdpWatts: totalTdp, psuWatts: psuCapacity, issues };
  }

  // 2. Verificação do Cabo do Painel Frontal (Power Switch)
  if (!state.frontPanelPowerSwConnected) {
    issues.push({
      type: 'ERROR',
      title: 'Botão Power Desconectado!',
      message: 'Pressionar o botão do gabinete não tem efeito porque o conector "POWER SW" não está conectado nos pinos do painel frontal (F_PANEL).',
      suggestedAction: 'Conecte o cabo POWER SW no cabeçalho do painel frontal da placa-mãe.',
    });
    return { canPowerOn: false, bootSuccess: false, debugLed, totalTdpWatts: totalTdp, psuWatts: psuCapacity, issues };
  }

  // 3. Verificação de Curto-Circuito por falta de Espaçadores
  if (!state.standoffsInstalled) {
    issues.push({
      type: 'ERROR',
      title: 'CURTO-CIRCUITO DETECTADO!',
      message: 'A placa-mãe foi parafusada diretamente no chassi de metal sem os espaçadores de latão (Standoffs). Os pontos de solda tocaram na lata e causaram curto-circuito.',
      suggestedAction: 'Remova a placa, instale os espaçadores dourados e reinstale a placa-mãe.',
    });
    return { canPowerOn: true, bootSuccess: false, debugLed, totalTdpWatts: totalTdp, psuWatts: psuCapacity, issues };
  }

  // 4. Verificação de Cabo de Alimentação Principal (24 Pinos ATX)
  if (!state.cableAtx24PinConnected) {
    issues.push({
      type: 'ERROR',
      title: 'Cabo ATX 24 Pinos Ausente',
      message: 'O conector principal de 24 pinos da placa-mãe não está plugado. A placa não consegue energizar seus circuitos.',
    });
    return { canPowerOn: true, bootSuccess: false, debugLed, totalTdpWatts: totalTdp, psuWatts: psuCapacity, issues };
  }

  // 5. Teste da CPU (Debug LED: CPU)
  if (!state.cpuInstalled) {
    debugLed.cpu = 'RED';
    issues.push({
      type: 'ERROR',
      title: 'Processador Ausente!',
      message: 'Nenhum processador instalado no soquete. A placa-mãe para na primeira etapa do POST.',
    });
  } else if (!state.socketLeverLocked) {
    debugLed.cpu = 'RED';
    issues.push({
      type: 'ERROR',
      title: 'Alavanca do Soquete Aberta!',
      message: 'A CPU está no soquete, mas a alavanca de retenção não foi abaixada e travada. Os pinos não estão fazendo pressão de contato adequada.',
    });
  } else if (!state.cableCpu8PinConnected) {
    debugLed.cpu = 'RED';
    issues.push({
      type: 'ERROR',
      title: 'Cabo EPS 12V da CPU Desconectado',
      message: 'O processador moderno precisa de energia auxiliar do cabo de 8 pinos (EPS) no canto superior da placa-mãe.',
    });
  } else {
    debugLed.cpu = 'GREEN';
  }

  // Verificação Térmica (Pasta e Cooler)
  if (!state.thermalPasteApplied) {
    issues.push({
      type: 'ERROR',
      title: 'Superaquecimento Imediato (Thermal Shutdown)',
      message: 'O computador ligou, mas você NÃO aplicou pasta térmica! A temperatura da CPU atingiu 105°C em 3 segundos e a proteção térmica da placa desligou o sistema.',
      suggestedAction: 'Aplique a pasta térmica sobre a CPU antes de fixar o cooler.',
    });
  }

  if (!state.coolerInstalled) {
    issues.push({
      type: 'ERROR',
      title: 'Sem Cooler Instalado!',
      message: 'Nunca ligue um computador sem o dissipador de calor e ventoinha sobre o processador.',
    });
  } else if (!state.coolerFanConnected) {
    issues.push({
      type: 'WARNING',
      title: 'Cabo da Ventoinha CPU_FAN Desconectado',
      message: 'O cooler está parafusado, mas a ventoinha não vai girar porque o cabo de 4 pinos não foi ligado no conector CPU_FAN da placa.',
    });
  }

  // 6. Teste da Memória RAM (Debug LED: DRAM)
  if (!state.ramInstalledSlot2 && !state.ramInstalledSlot4) {
    debugLed.dram = 'RED';
    issues.push({
      type: 'ERROR',
      title: 'Memória RAM Ausente!',
      message: 'Nenhum pente de memória RAM instalado. O computador emite 3 bips de alerta sonoro e não dá vídeo.',
    });
  } else {
    debugLed.dram = 'GREEN';
    // Dica didática sobre Dual Channel
    if (state.ramInstalledSlot2 && !state.ramInstalledSlot4 && mb.ramSlotsCount >= 4) {
      issues.push({
        type: 'TIP',
        title: 'Dica de Otimização: Dual Channel',
        message: 'Você instalou apenas 1 pente de memória (Single Channel). Em jogos, 2 pentes (slots 2 e 4) aumentam a taxa de quadros e estabilidade em até 20%.',
      });
    }
  }

  // 7. Teste de Vídeo (Debug LED: VGA)
  const hasDisplayCapability = (state.cpuInstalled?.hasIntegratedGpu) || (state.gpuInstalled !== null);
  if (!hasDisplayCapability) {
    debugLed.vga = 'RED';
    issues.push({
      type: 'ERROR',
      title: 'Sem Saída de Vídeo (Sem GPU)',
      message: `O processador ${state.cpuInstalled?.name} não tem chip gráfico integrado e você não instalou uma placa de vídeo dedicada. O PC liga, mas a tela fica preta!`,
      suggestedAction: 'Instale uma placa de vídeo dedicada no slot PCIe x16.',
    });
  } else if (state.gpuInstalled && state.gpuInstalled.powerPins !== 'none' && !state.cableGpuPcieConnected) {
    debugLed.vga = 'RED';
    issues.push({
      type: 'ERROR',
      title: 'Cabo PCIe de 8 Pinos da GPU Desconectado',
      message: 'A placa de vídeo foi encaixada no slot PCIe, mas o cabo de energia auxiliar da fonte não foi plugado nela.',
    });
  } else {
    debugLed.vga = 'GREEN';
  }

  // 8. Teste de Armazenamento e Boot (Debug LED: BOOT)
  if (!state.storageInstalled) {
    debugLed.boot = 'RED';
    issues.push({
      type: 'WARNING',
      title: 'Sem Disco de Armazenamento (SSD/HD)',
      message: 'Nenhum SSD foi instalado. O computador dá vídeo e entra direto na BIOS, mas não tem sistema operacional para carregar.',
    });
  } else {
    debugLed.boot = 'GREEN';
  }

  // 9. Verificação de Potência da Fonte
  const minRequiredWatts = totalTdp * 1.25; // 25% de margem de segurança contra picos
  if (psuCapacity < minRequiredWatts) {
    issues.push({
      type: 'ERROR',
      title: 'Fonte Subdimensionada (Sobrecarga)',
      message: `O consumo total das peças é de ${totalTdp}W, exigindo uma fonte de pelo menos ${Math.round(minRequiredWatts)}W. A fonte de ${psuCapacity}W vai desarmar e desligar o PC ao rodar jogos.`,
      suggestedAction: 'Troque por uma fonte de maior potência (ex: 500W ou 650W).',
    });
  }

  // 10. Avisos menores / Recomendações
  if (!state.ioShieldInstalled && !mb.hasIntegratedIoShield) {
    issues.push({
      type: 'TIP',
      title: 'Esqueceu o Espelho Traseiro (I/O Shield)',
      message: 'O computador funciona, mas o buraco metálico atrás do gabinete ficou aberto para entrada de poeira e insetos. Teria que desmontar tudo para colocar!',
    });
  }

  const hasCriticalErrors = issues.some((i) => i.type === 'ERROR');

  return {
    canPowerOn: true,
    bootSuccess: !hasCriticalErrors,
    debugLed,
    totalTdpWatts: totalTdp,
    psuWatts: psuCapacity,
    issues,
  };
}

