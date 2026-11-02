'use client';

import React from 'react';
import { ComponentCategory } from '@/engine/types';

interface HardwareImageProps {
  category: ComponentCategory;
  name?: string;
  className?: string;
  subType?: string;
}

export const HardwareImage: React.FC<HardwareImageProps> = ({
  category,
  name = '',
  className = 'w-full h-28',
  subType = '',
}) => {
  const isIntel = name.toLowerCase().includes('intel') || name.toLowerCase().includes('core');
  const isAmd = name.toLowerCase().includes('amd') || name.toLowerCase().includes('ryzen');
  const isRtx = name.toLowerCase().includes('rtx') || name.toLowerCase().includes('geforce') || name.toLowerCase().includes('nvidia');
  const isDdr5 = name.toLowerCase().includes('ddr5');

  switch (category) {
    case 'CPU':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Substrato Verde/Preto da PCB */}
          <rect x="15" y="15" width="130" height="130" rx="8" fill={isIntel ? '#064E3B' : '#1E293B'} stroke={isIntel ? '#10B981' : '#E2E8F0'} strokeWidth="3" />
          {/* Contatos Dourados nos cantos */}
          <circle cx="28" cy="28" r="4" fill="#F59E0B" />
          <circle cx="132" cy="28" r="4" fill="#F59E0B" />
          <circle cx="28" cy="132" r="4" fill="#F59E0B" />
          <circle cx="132" cy="132" r="4" fill="#F59E0B" />
          {/* Triângulo Dourado de Orientação */}
          <polygon points="20,20 36,20 20,36" fill="#F59E0B" />
          {/* IHS Metálico Prateado com chanfros */}
          <rect x="35" y="35" width="90" height="90" rx="10" fill="url(#metalIhs)" stroke="#CBD5E1" strokeWidth="2.5" />
          {/* Gravação a Laser */}
          <text x="80" y="68" fill="#1E293B" fontSize="12" fontWeight="900" textAnchor="middle" letterSpacing="0.5">
            {isAmd ? 'AMD RYZEN' : 'intel CORE'}
          </text>
          <text x="80" y="85" fill="#475569" fontSize="10" fontWeight="bold" textAnchor="middle">
            {isIntel ? (name.includes('i3') ? 'i3-12100' : name.includes('i7') ? 'i7-13700K' : 'i5-13400F') : isAmd && name.includes('7700') ? 'R7 7700X' : 'R5 7600'}
          </text>
          <text x="80" y="105" fill="#64748B" fontSize="8" textAnchor="middle">
            MALAYSIA • 3.8GHz
          </text>
          <defs>
            <linearGradient id="metalIhs" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#F1F5F9" />
              <stop offset="0.5" stopColor="#CBD5E1" />
              <stop offset="1" stopColor="#94A3B8" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'RAM':
      return (
        <svg viewBox="0 0 200 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Dissipador de Calor Metálico da RAM */}
          <rect x="10" y="10" width="180" height="50" rx="4" fill="#0F172A" stroke={isDdr5 ? '#06B6D4' : '#64748B'} strokeWidth="2" />
          {/* Linha de LED RGB Superior */}
          <rect x="15" y="12" width="170" height="6" rx="3" fill="url(#rgbGlow)" opacity="0.9" />
          {/* Textura do dissipador */}
          <path d="M 30 24 L 50 48 M 60 24 L 80 48 M 90 24 L 110 48 M 120 24 L 140 48" stroke="#1E293B" strokeWidth="3" />
          {/* Nome da Memória */}
          <text x="100" y="42" fill="#F8FAFC" fontSize="11" fontWeight="extrabold" textAnchor="middle" letterSpacing="1">
            FURY {isDdr5 ? 'DDR5' : 'DDR4'}
          </text>
          {/* Pinos Dourados na parte inferior */}
          <rect x="15" y="60" width="170" height="12" fill="#0F172A" />
          {[...Array(24)].map((_, i) => (
            <rect key={i} x={18 + i * 7} y="62" width="4" height="8" fill="#F59E0B" rx="1" />
          ))}
          {/* Chanfro (Notch) da Memória no meio para não encaixar invertida */}
          <rect x={isDdr5 ? "102" : "90"} y="59" width="8" height="14" fill="#020617" />
          <defs>
            <linearGradient id="rgbGlow" x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="#EC4899" />
              <stop offset="0.33" stopColor="#8B5CF6" />
              <stop offset="0.66" stopColor="#06B6D4" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
      );

    case 'COOLER':
      const isWater = name.toLowerCase().includes('water') || name.toLowerCase().includes('aio');
      if (isWater) {
        return (
          <svg viewBox="0 0 180 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Radiador 240mm */}
            <rect x="10" y="15" width="160" height="50" rx="4" fill="#0F172A" stroke="#38BDF8" strokeWidth="2" />
            <circle cx="50" cy="40" r="18" fill="#1E293B" stroke="#0284C7" strokeWidth="2" />
            <circle cx="130" cy="40" r="18" fill="#1E293B" stroke="#0284C7" strokeWidth="2" />
            {/* Mangueiras Flexíveis */}
            <path d="M 155 55 C 155 90, 80 80, 75 95" stroke="#334155" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M 145 55 C 145 100, 95 85, 90 95" stroke="#1E293B" strokeWidth="6" fill="none" strokeLinecap="round" />
            {/* Bomba do Bloco da CPU com LED Infinito */}
            <circle cx="82" cy="100" r="16" fill="#0284C7" stroke="#38BDF8" strokeWidth="2" />
            <circle cx="82" cy="100" r="7" fill="#0F172A" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 160 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Base de Cobre com 4 Heatpipes */}
          <rect x="45" y="115" width="70" height="15" rx="3" fill="#B45309" stroke="#D97706" strokeWidth="1.5" />
          {/* Tubos de Cobre subindo pelas aletas */}
          <path d="M 55 115 L 55 25 M 70 115 L 70 25 M 90 115 L 90 25 M 105 115 L 105 25" stroke="#D97706" strokeWidth="4" />
          {/* Torre de Aletas de Alumínio */}
          <rect x="30" y="25" width="100" height="85" rx="6" fill="#64748B" stroke="#94A3B8" strokeWidth="2" />
          {[...Array(9)].map((_, i) => (
            <line key={i} x1="32" y1={35 + i * 8} x2="128" y2={35 + i * 8} stroke="#475569" strokeWidth="1.5" />
          ))}
          {/* Ventoinha Frontal de 120mm */}
          <rect x="25" y="20" width="110" height="95" rx="10" fill="#0F172A" stroke="#06B6D4" strokeWidth="2" opacity="0.9" />
          <circle cx="80" cy="67" r="32" fill="#1E293B" stroke="#0284C7" strokeWidth="2" />
          <circle cx="80" cy="67" r="10" fill="#38BDF8" />
        </svg>
      );

    case 'PASTE':
      return (
        <svg viewBox="0 0 160 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Seringa de Pasta Térmica */}
          <rect x="20" y="32" width="25" height="16" rx="2" fill="#64748B" />
          <line x1="10" y1="40" x2="20" y2="40" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
          {/* Corpo Translúcido da Seringa */}
          <rect x="45" y="28" width="80" height="24" rx="4" fill="#334155" stroke="#94A3B8" strokeWidth="2" />
          {/* Pasta Cinza dentro da seringa */}
          <rect x="55" y="31" width="55" height="18" rx="2" fill="#94A3B8" />
          <text x="82" y="44" fill="#0F172A" fontSize="9" fontWeight="bold" textAnchor="middle">MX-4 8.5W</text>
          {/* Bico da Seringa */}
          <polygon points="125,36 145,39 145,41 125,44" fill="#475569" />
          {/* Gota de Pasta Térmica saindo do bico */}
          <circle cx="149" cy="40" r="3.5" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />
        </svg>
      );

    case 'GPU':
      const isTripleFan = name.toLowerCase().includes('4070') || name.toLowerCase().includes('6700');
      return (
        <svg viewBox="0 0 220 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Espelho Metálico Traseiro PCIe */}
          <rect x="10" y="15" width="12" height="85" rx="2" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
          <circle cx="16" cy="25" r="3" fill="#64748B" />
          <rect x="13" y="45" width="6" height="14" fill="#475569" />
          {/* Chassi e Carenagem da Placa de Vídeo */}
          <rect x="22" y="20" width="190" height="70" rx="8" fill="#0B132B" stroke="#38BDF8" strokeWidth="2" />
          {/* Ventoinhas da GPU */}
          {isTripleFan ? (
            <>
              <circle cx="65" cy="55" r="22" fill="#1E293B" stroke="#0284C7" strokeWidth="2" />
              <circle cx="65" cy="55" r="7" fill="#38BDF8" />
              <circle cx="118" cy="55" r="22" fill="#1E293B" stroke="#0284C7" strokeWidth="2" />
              <circle cx="118" cy="55" r="7" fill="#38BDF8" />
              <circle cx="170" cy="55" r="22" fill="#1E293B" stroke="#0284C7" strokeWidth="2" />
              <circle cx="170" cy="55" r="7" fill="#38BDF8" />
            </>
          ) : (
            <>
              <circle cx="75" cy="55" r="26" fill="#1E293B" stroke="#0284C7" strokeWidth="2" />
              <circle cx="75" cy="55" r="8" fill="#38BDF8" />
              <circle cx="150" cy="55" r="26" fill="#1E293B" stroke="#0284C7" strokeWidth="2" />
              <circle cx="150" cy="55" r="8" fill="#38BDF8" />
            </>
          )}
          {/* Conector Dourado PCIe x16 Inferior */}
          <rect x="40" y="90" width="120" height="8" rx="1" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />
          {/* Logo Superior */}
          <text x="110" y="32" fill="#E2E8F0" fontSize="9" fontWeight="900" textAnchor="middle" letterSpacing="1">
            {isRtx ? 'GEFORCE RTX' : 'RADEON RX'}
          </text>
        </svg>
      );

    case 'STORAGE':
      const isSata = name.toLowerCase().includes('sata') || name.toLowerCase().includes('a400') || name.toLowerCase().includes('hdd');
      if (isSata) {
        return (
          <svg viewBox="0 0 160 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Caixa SSD 2.5 polegadas */}
            <rect x="25" y="10" width="110" height="80" rx="6" fill="#1E293B" stroke="#475569" strokeWidth="2" />
            <rect x="40" y="25" width="80" height="40" rx="3" fill="#0F172A" />
            <text x="80" y="44" fill="#E2E8F0" fontSize="10" fontWeight="bold" textAnchor="middle">SSD SATA 2.5&quot;</text>
            <text x="80" y="56" fill="#06B6D4" fontSize="8" textAnchor="middle">500 MB/s Solid State</text>
            {/* Conectores SATA na lateral */}
            <rect x="25" y="75" width="20" height="10" fill="#F59E0B" />
            <rect x="50" y="75" width="30" height="10" fill="#F59E0B" />
          </svg>
        );
      }
      return (
        <svg viewBox="0 0 180 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Bastão M.2 2280 NVMe */}
          <rect x="10" y="10" width="160" height="40" rx="4" fill="#064E3B" stroke="#10B981" strokeWidth="1.5" />
          {/* Encaixe com entalhe de parafuso no lado esquerdo */}
          <path d="M 10 25 C 16 25, 16 35, 10 35" fill="#020617" />
          {/* Chips de Memória NAND Flash */}
          <rect x="35" y="15" width="35" height="30" rx="3" fill="#0F172A" stroke="#334155" strokeWidth="1" />
          <rect x="80" y="15" width="35" height="30" rx="3" fill="#0F172A" stroke="#334155" strokeWidth="1" />
          {/* Chip Controlador */}
          <rect x="125" y="18" width="20" height="24" rx="2" fill="#94A3B8" />
          <text x="97" y="32" fill="#E2E8F0" fontSize="8" fontWeight="bold" textAnchor="middle">NVMe PCIe 4.0</text>
          {/* Pinos de Ouro M.2 à direita */}
          <rect x="162" y="14" width="8" height="32" fill="#F59E0B" />
        </svg>
      );

    case 'PSU':
      return (
        <svg viewBox="0 0 180 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Chassi Metálico da Fonte */}
          <rect x="15" y="15" width="150" height="90" rx="8" fill="#0F172A" stroke="#334155" strokeWidth="2.5" />
          {/* Grelha de Ventilação da Ventoinha de 120mm */}
          <circle cx="75" cy="60" r="32" fill="#1E293B" stroke="#475569" strokeWidth="2" />
          <circle cx="75" cy="60" r="12" fill="#0284C7" />
          {/* Chave I/O e Entrada de Força AC */}
          <rect x="125" y="30" width="30" height="22" rx="3" fill="#020617" stroke="#64748B" strokeWidth="1" />
          <rect x="130" y="60" width="20" height="14" rx="2" fill="#E11D48" />
          <text x="140" y="70" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">I/O</text>
          {/* Selo 80 Plus */}
          <rect x="122" y="82" width="36" height="15" rx="3" fill="#F59E0B" />
          <text x="140" y="93" fill="#0F172A" fontSize="7" fontWeight="black" textAnchor="middle">80 PLUS</text>
        </svg>
      );

    case 'MOTHERBOARD':
      return (
        <svg viewBox="0 0 160 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* PCB da Placa-Mãe */}
          <rect x="10" y="10" width="140" height="140" rx="8" fill="#0A192F" stroke="#0284C7" strokeWidth="2" />
          {/* Dissipador VRM Superior/Lateral */}
          <rect x="16" y="16" width="30" height="60" rx="3" fill="#334155" />
          <rect x="50" y="16" width="50" height="20" rx="3" fill="#334155" />
          {/* Soquete da CPU */}
          <rect x="52" y="42" width="46" height="46" rx="4" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
          {/* 4 Slots de RAM */}
          <rect x="106" y="24" width="6" height="68" rx="1" fill="#0284C7" />
          <rect x="114" y="24" width="6" height="68" rx="1" fill="#38BDF8" />
          <rect x="122" y="24" width="6" height="68" rx="1" fill="#0284C7" />
          <rect x="130" y="24" width="6" height="68" rx="1" fill="#38BDF8" />
          {/* Slot PCIe x16 */}
          <rect x="20" y="102" width="110" height="12" rx="2" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
          {/* Dissipador do Chipset */}
          <rect x="96" y="106" width="34" height="34" rx="4" fill="#334155" stroke="#64748B" strokeWidth="1" />
          <text x="113" y="126" fill="#94A3B8" fontSize="7" fontWeight="bold" textAnchor="middle">CHIPSET</text>
        </svg>
      );

    case 'CASE':
      return (
        <svg viewBox="0 0 140 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Chassi do Gabinete */}
          <rect x="20" y="10" width="100" height="140" rx="8" fill="#0F172A" stroke="#475569" strokeWidth="2" />
          {/* Janela de Vidro Temperado Lateral */}
          <rect x="25" y="20" width="75" height="95" rx="4" fill="#1E293B" opacity="0.6" stroke="#38BDF8" strokeWidth="1" />
          {/* Compartimento Inferior da Fonte (PSU Shroud) */}
          <rect x="25" y="120" width="90" height="25" rx="3" fill="#020617" />
          <text x="70" y="136" fill="#64748B" fontSize="8" fontWeight="bold" textAnchor="middle">PSU SHROUD</text>
          {/* 3 Fans Frontais com LED RGB */}
          <circle cx="112" cy="35" r="7" fill="#06B6D4" />
          <circle cx="112" cy="65" r="7" fill="#8B5CF6" />
          <circle cx="112" cy="95" r="7" fill="#EC4899" />
          {/* Botão Power no topo */}
          <circle cx="95" cy="14" r="2.5" fill="#10B981" />
        </svg>
      );

    default:
      return null;
  }
};

