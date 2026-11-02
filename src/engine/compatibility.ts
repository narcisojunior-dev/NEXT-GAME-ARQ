import {
  CpuComponent,
  MotherboardComponent,
  RamComponent,
  CoolerComponent,
  StorageComponent,
  StorageSlot,
  GpuComponent,
  CaseComponent,
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

export function validateStorageSlot(storage: StorageComponent, slot: StorageSlot): ValidationIssue | null {
  const isNvme = storage.storageType === 'NVMe_M2';
  if (slot === 'M2' && !isNvme) {
    return {
      type: 'ERROR',
      title: 'Este Disco Não Encaixa no Slot M.2!',
      message: `${storage.name} é um disco SATA em formato de caixa. O slot M.2 aceita apenas SSDs NVMe em formato de bastão.`,
      suggestedAction: 'Instale este disco na baia SATA do gabinete e conecte os cabos de dados e energia SATA.',
    };
  }
  if (slot === 'SATA' && isNvme) {
    return {
      type: 'ERROR',
      title: 'SSD NVMe Não Vai na Baia SATA!',
      message: `${storage.name} é um SSD M.2 NVMe: ele encaixa direto na placa-mãe, sem cabos, e não tem conector SATA.`,
      suggestedAction: 'Encaixe o SSD no slot M.2 da placa-mãe, abaixo do soquete da CPU.',
    };
  }
  return null;
}

export function validateCoolerSocket(cooler: CoolerComponent, cpu: CpuComponent): ValidationIssue | null {
  if (!cooler.supportedSockets.includes(cpu.socket)) {
    return {
      type: 'ERROR',
      title: 'Cooler Incompatível com o Soquete!',
      message: `${cooler.name} só tem suporte de fixação para ${cooler.supportedSockets.join(', ')}, mas o processador usa soquete ${cpu.socket}. Os furos da placa-mãe não se alinham com o suporte do cooler.`,
      suggestedAction: `Escolha um cooler compatível com ${cpu.socket}.`,
    };
  }
  return null;
}

export function validateCoolerCapacity(cooler: CoolerComponent, cpu: CpuComponent): ValidationIssue | null {
  if (cpu.tdpWatts > cooler.maxTdpWatts) {
    return {
      type: 'WARNING',
      title: 'Cooler Subdimensionado para a CPU',
      message: `O processador gera até ${cpu.tdpWatts}W de calor, mas o cooler dissipa no máximo ${cooler.maxTdpWatts}W. A CPU vai esquentar e reduzir a velocidade (thermal throttling) em jogos e tarefas pesadas.`,
      suggestedAction: `Use um cooler com capacidade de pelo menos ${cpu.tdpWatts}W (ex: air cooler em torre ou water cooler).`,
    };
  }
  return null;
}

export function validateThermalPasteApplication(state: AssemblyState): ValidationIssue | null {
  if (!state.cpuInstalled) {
    return {
      type: 'ERROR',
      title: 'Onde aplicar?',
      message: 'Instale o processador no soquete antes de aplicar a pasta térmica!',
    };
  }
  if (state.coolerInstalled) {
    return {
      type: 'ERROR',
      title: 'O Cooler Está no Caminho!',
      message: 'A pasta térmica fica ENTRE o processador e a base do cooler. Com o cooler parafusado por cima, não há como aplicá-la.',
      suggestedAction: 'Remova o cooler, aplique a pasta sobre a CPU e reinstale o cooler.',
    };
  }
  return null;
}

/** O cooler só é fixado sobre uma CPU já coberta de pasta térmica (regra única para o 2D e o 3D) */
export function validateCoolerPrerequisites(state: AssemblyState): ValidationIssue | null {
  if (!state.cpuInstalled) {
    return {
      type: 'ERROR',
      title: 'Soquete Vazio!',
      message: 'Instale o processador no soquete antes de fixar o cooler.',
    };
  }
  if (!state.thermalPasteApplied) {
    return {
      type: 'ERROR',
      title: 'Pasta Térmica Obrigatória!',
      message: 'Você não pode instalar o cooler sem antes aplicar a pasta térmica sobre o processador!',
      suggestedAction: 'Selecione a pasta térmica no catálogo e aplique uma gota do tamanho de uma ervilha no centro da CPU.',
    };
  }
  return null;
}

export function validateEsdDischarged(state: AssemblyState): ValidationIssue | null {
  if (!state.esdDischarged) {
    return {
      type: 'ERROR',
      title: 'Risco de Descarga Eletrostática (ESD)!',
      message: 'Você ia tocar em um componente sem descarregar a eletricidade estática do corpo. Um choque invisível pode queimar os circuitos da peça.',
      suggestedAction: 'Toque no ponto de aterramento (botão ESD) antes de manusear as peças.',
    };
  }
  return null;
}

export function validateCaseFormFactor(pcCase: CaseComponent, mb: MotherboardComponent): ValidationIssue | null {
  if (!pcCase.supportedFormFactors.includes(mb.formFactor)) {
    return {
      type: 'ERROR',
      title: 'Placa-Mãe Não Cabe no Gabinete!',
      message: `A placa-mãe é ${mb.formFactor}, mas o gabinete ${pcCase.name} só tem furação para ${pcCase.supportedFormFactors.join(', ')}.`,
      suggestedAction: 'Escolha um gabinete maior (Mid-Tower) ou uma placa-mãe de formato menor.',
    };
  }
  return null;
}

export function validateGpuLength(gpu: GpuComponent, pcCase: CaseComponent): ValidationIssue | null {
  if (gpu.lengthMm > pcCase.maxGpuLengthMm) {
    return {
      type: 'ERROR',
      title: 'Placa de Vídeo Grande Demais!',
      message: `${gpu.name} tem ${gpu.lengthMm}mm de comprimento, mas o gabinete ${pcCase.name} só comporta placas de até ${pcCase.maxGpuLengthMm}mm. Ela vai bater na frente do gabinete.`,
      suggestedAction: 'Escolha um gabinete com mais espaço interno ou uma placa de vídeo mais curta.',
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
 * Soma o preço de todas as peças instaladas (inclusive placa-mãe e gabinete)
 */
export function calculateTotalSpent(state: AssemblyState, mb: MotherboardComponent | null): number {
  const ramParts: (RamComponent | null)[] = [];
  if (state.ramInstalledSlot2 && state.ramInstalledSlot4) {
    if (
      state.ramInstalledSlot2.id === state.ramInstalledSlot4.id &&
      state.ramInstalledSlot2.moduleCount === 2
    ) {
      // Kit de 2 pentes: cobrar o kit apenas uma vez (Issue #25)
      ramParts.push(state.ramInstalledSlot2);
    } else {
      ramParts.push(state.ramInstalledSlot2, state.ramInstalledSlot4);
    }
  } else if (state.ramInstalledSlot2) {
    ramParts.push(state.ramInstalledSlot2);
  } else if (state.ramInstalledSlot4) {
    ramParts.push(state.ramInstalledSlot4);
  }

  const parts = [
    mb,
    state.cpuInstalled,
    state.coolerInstalled,
    ...ramParts,
    state.storageInstalled,
    state.gpuInstalled,
    state.psuInstalled,
    state.caseInstalled,
  ];
  return parts.reduce((total, part) => total + (part ? part.price : 0), 0);
}

/**
 * Avalia o teste do POST (Power-On Self Test) quando o botão de ligar é acionado
 */
export function evaluatePostTest(
  state: AssemblyState,
  mb: MotherboardComponent | null
): PostResult {
  const issues: ValidationIssue[] = [];

  const debugLed = {
    cpu: 'OFF' as 'OFF' | 'RED' | 'GREEN',
    dram: 'OFF' as 'OFF' | 'RED' | 'GREEN',
    vga: 'OFF' as 'OFF' | 'RED' | 'GREEN',
    boot: 'OFF' as 'OFF' | 'RED' | 'GREEN',
  };

  // 0. Verificação da Placa-Mãe
  if (!mb) {
    issues.push({
      type: 'ERROR',
      title: 'Nenhuma Placa-Mãe Instalada!',
      message: 'O computador precisa de uma placa-mãe instalada na bancada para conectar os componentes e conduzir os sinais elétricos.',
      suggestedAction: 'Escolha e posicione uma placa-mãe na bancada a partir do inventário.',
    });
    return { canPowerOn: false, bootSuccess: false, debugLed, totalTdpWatts: 0, psuWatts: 0, issues };
  }

  const totalTdp = calculateTotalTdp(state, mb);
  const psuCapacity = state.psuInstalled ? state.psuInstalled.wattage : 0;

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

  // 3b. Verificação de Encaixe no Gabinete (sem gabinete = teste em bancada, permitido)
  if (state.caseInstalled) {
    const caseIssues = [
      validateCaseFormFactor(state.caseInstalled, mb),
      state.gpuInstalled ? validateGpuLength(state.gpuInstalled, state.caseInstalled) : null,
    ].filter((i): i is ValidationIssue => i !== null);
    if (caseIssues.length > 0) {
      issues.push(...caseIssues);
      return { canPowerOn: false, bootSuccess: false, debugLed, totalTdpWatts: totalTdp, psuWatts: psuCapacity, issues };
    }
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

  if (state.coolerInstalled && state.cpuInstalled) {
    const capacityIssue = validateCoolerCapacity(state.coolerInstalled, state.cpuInstalled);
    if (capacityIssue) issues.push(capacityIssue);
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
  } else if (state.storageInstalled.storageType !== 'NVMe_M2' && !state.cableSataConnected) {
    debugLed.boot = 'RED';
    issues.push({
      type: 'WARNING',
      title: 'Cabos SATA do Disco Desconectados',
      message: `${state.storageInstalled.name} está na baia, mas sem o cabo de dados SATA (até a placa-mãe) e o cabo de energia SATA (da fonte) ele não é detectado. O PC entra direto na BIOS.`,
      suggestedAction: 'Conecte os cabos de dados e de energia SATA no disco.',
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

  if (state.gpuInstalled && psuCapacity < state.gpuInstalled.requiredPsuWatts) {
    issues.push({
      type: 'WARNING',
      title: 'Fonte Abaixo do Recomendado pela GPU',
      message: `O fabricante da ${state.gpuInstalled.name} recomenda uma fonte de pelo menos ${state.gpuInstalled.requiredPsuWatts}W, e a sua tem ${psuCapacity}W. Em picos de consumo nos jogos, o PC pode desligar sozinho.`,
      suggestedAction: `Use uma fonte de ${state.gpuInstalled.requiredPsuWatts}W ou mais, de preferência com selo 80 Plus.`,
    });
  }

  if (state.caseInstalled) {
    if (state.caseInstalled.fansIncluded > 0 && !state.caseFansConnected) {
      issues.push({
        type: 'WARNING',
        title: 'Ventoinhas do Gabinete Desligadas',
        message: `As ${state.caseInstalled.fansIncluded} ventoinhas do gabinete estão paradas porque o cabo não foi ligado no SYS_FAN. Sem fluxo de ar, o calor fica preso e as temperaturas sobem em jogos.`,
        suggestedAction: 'Ligue o cabo das ventoinhas no conector SYS_FAN (ou CHA_FAN) da placa-mãe.',
      });
    }
    if (!state.frontUsbConnected) {
      issues.push({
        type: 'TIP',
        title: 'Portas USB Frontais Sem Função',
        message: 'O cabo USB 3.0 do gabinete não foi ligado no cabeçalho de 19 pinos: o pendrive na frente do gabinete não será reconhecido.',
      });
    }
    if (!state.frontAudioConnected) {
      issues.push({
        type: 'TIP',
        title: 'Áudio Frontal Sem Função',
        message: 'O cabo HD Audio do gabinete não foi ligado no HD_AUDIO: o fone na frente do gabinete ficará mudo.',
      });
    }
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

