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
}) => {
  const lowerName = name.toLowerCase();

  // Helper flags
  const isIntel = lowerName.includes('intel') || lowerName.includes('core');
  const isAmd = lowerName.includes('amd') || lowerName.includes('ryzen') || lowerName.includes('radeon');
  const isRtx = lowerName.includes('rtx') || lowerName.includes('geforce') || lowerName.includes('nvidia') || lowerName.includes('gtx');
  const isDdr5 = lowerName.includes('ddr5');

  switch (category) {
    case 'CPU': {
      // Identificar modelo curto para gravar a laser no IHS
      let shortModel = 'CPU';
      if (lowerName.includes('i9-14900k')) shortModel = 'i9-14900K (6.0GHz)';
      else if (lowerName.includes('i7-14700k')) shortModel = 'i7-14700K (20C)';
      else if (lowerName.includes('i7-13700k')) shortModel = 'i7-13700K (16C)';
      else if (lowerName.includes('i5-13600k')) shortModel = 'i5-13600K (14C)';
      else if (lowerName.includes('i5-13400f')) shortModel = 'i5-13400F (10C)';
      else if (lowerName.includes('i5-12400f')) shortModel = 'i5-12400F (6C)';
      else if (lowerName.includes('i3-12100f')) shortModel = 'i3-12100F (4C)';
      else if (lowerName.includes('i3-12100')) shortModel = 'i3-12100 (UHD 730)';
      else if (lowerName.includes('7950x')) shortModel = 'R9 7950X (16C/32T)';
      else if (lowerName.includes('7800x3d')) shortModel = 'R7 7800X3D (3D V-CACHE)';
      else if (lowerName.includes('7700x')) shortModel = 'R7 7700X (8C/16T)';
      else if (lowerName.includes('8600g')) shortModel = 'R5 8600G (RADEON 760M)';
      else if (lowerName.includes('7600')) shortModel = 'R5 7600 (ZEN 4)';
      else if (lowerName.includes('5900x')) shortModel = 'R9 5900X (12C/24T)';
      else if (lowerName.includes('5700x3d')) shortModel = 'R7 5700X3D (3D CACHE)';
      else if (lowerName.includes('5600')) shortModel = 'R5 5600 (ZEN 3)';
      else if (lowerName.includes('4600g')) shortModel = 'R5 4600G (VEGA 7)';
      else if (lowerName.includes('3600')) shortModel = 'R5 3600 (ZEN 2)';

      const isAm5OrLga = lowerName.includes('am5') || lowerName.includes('7000') || lowerName.includes('8000') || isIntel;

      return (
        <svg viewBox="0 0 160 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Substrato da PCB */}
          <rect
            x="14"
            y="14"
            width="132"
            height="132"
            rx="8"
            fill={isIntel ? '#042F2E' : '#18181B'}
            stroke={isIntel ? '#0D9488' : isAmd ? '#EA580C' : '#3B82F6'}
            strokeWidth="3"
          />
          {/* Pinos de Contato Dourados nos Cantos */}
          <circle cx="24" cy="24" r="3.5" fill="#F59E0B" />
          <circle cx="136" cy="24" r="3.5" fill="#F59E0B" />
          <circle cx="24" cy="136" r="3.5" fill="#F59E0B" />
          <circle cx="136" cy="136" r="3.5" fill="#F59E0B" />
          {/* Triângulo Dourado de Orientação (Pin 1) */}
          <polygon points="17,17 32,17 17,32" fill="#F59E0B" />

          {/* IHS Metálico Prateado / Cobre Niquelado */}
          <rect x="32" y="32" width="96" height="96" rx="8" fill="url(#metalIhs)" stroke="#CBD5E1" strokeWidth="2.5" />

          {/* Entalhes característicos do IHS da AMD AM5 estilo Polvo ou Intel LGA1700 */}
          {isAmd && (lowerName.includes('am5') || lowerName.includes('7') || lowerName.includes('8')) && (
            <>
              <circle cx="32" cy="56" r="5" fill="#18181B" />
              <circle cx="32" cy="104" r="5" fill="#18181B" />
              <circle cx="128" cy="56" r="5" fill="#18181B" />
              <circle cx="128" cy="104" r="5" fill="#18181B" />
              <circle cx="56" cy="32" r="5" fill="#18181B" />
              <circle cx="104" cy="32" r="5" fill="#18181B" />
              <circle cx="56" cy="128" r="5" fill="#18181B" />
              <circle cx="104" cy="128" r="5" fill="#18181B" />
            </>
          )}

          {/* Gravação a Laser no IHS */}
          <text
            x="80"
            y="65"
            fill={isAmd ? '#C2410C' : '#0369A1'}
            fontSize="11"
            fontWeight="900"
            textAnchor="middle"
            letterSpacing="0.8"
          >
            {isAmd ? 'AMD RYZEN™' : 'intel® CORE™'}
          </text>
          <text x="80" y="83" fill="#0F172A" fontSize="9" fontWeight="800" textAnchor="middle">
            {shortModel}
          </text>
          <text x="80" y="100" fill="#475569" fontSize="7.5" textAnchor="middle" fontFamily="monospace">
            {isIntel ? 'LGA1700 • UNLOCKED' : isAm5OrLga ? 'SOCKET AM5 • 5nm' : 'SOCKET AM4 • PGA'}
          </text>
          <text x="80" y="112" fill="#64748B" fontSize="6.5" textAnchor="middle">
            DIFFUSED IN USA • MALAYSIA
          </text>
          <defs>
            <linearGradient id="metalIhs" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#F8FAFC" />
              <stop offset="0.5" stopColor="#E2E8F0" />
              <stop offset="1" stopColor="#94A3B8" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    case 'MOTHERBOARD': {
      const isAsus = lowerName.includes('asus');
      const isMsi = lowerName.includes('msi');
      const isGigabyte = lowerName.includes('gigabyte') || lowerName.includes('aorus');
      const isAsrock = lowerName.includes('asrock');

      let brandLabel = 'MOTHERBOARD';
      let themeColor = '#0284C7'; // Cyan default
      if (isAsus && lowerName.includes('rog')) {
        brandLabel = 'ROG STRIX';
        themeColor = '#E11D48'; // Red ROG
      } else if (isAsus && lowerName.includes('tuf')) {
        brandLabel = 'TUF GAMING';
        themeColor = '#EAB308'; // Yellow TUF
      } else if (isAsus) {
        brandLabel = 'ASUS PRIME';
        themeColor = '#94A3B8'; // Silver Prime
      } else if (isMsi && lowerName.includes('tomahawk')) {
        brandLabel = 'MAG TOMAHAWK';
        themeColor = '#10B981'; // Arsenal Green
      } else if (isMsi && lowerName.includes('mortar')) {
        brandLabel = 'MAG MORTAR';
        themeColor = '#38BDF8';
      } else if (isMsi) {
        brandLabel = 'MSI PRO';
        themeColor = '#64748B';
      } else if (isGigabyte) {
        brandLabel = 'AORUS ELITE';
        themeColor = '#F97316'; // Orange Aorus
      } else if (isAsrock) {
        brandLabel = 'STEEL LEGEND';
        themeColor = '#E2E8F0'; // Steel Camo
      }

      const chipsetLabel = lowerName.includes('z790')
        ? 'Z790'
        : lowerName.includes('b760')
        ? 'B760'
        : lowerName.includes('h610')
        ? 'H610'
        : lowerName.includes('b650')
        ? 'B650'
        : 'B550';

      return (
        <svg viewBox="0 0 160 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* PCB da Placa-Mãe */}
          <rect x="10" y="10" width="140" height="140" rx="8" fill="#090E17" stroke={themeColor} strokeWidth="2" />
          {/* Dissipador VRM Superior e Lateral */}
          <rect x="15" y="15" width="30" height="65" rx="3" fill="#1E293B" stroke="#334155" strokeWidth="1" />
          <rect x="48" y="15" width="55" height="18" rx="3" fill="#1E293B" stroke="#334155" strokeWidth="1" />
          <text x="30" y="52" fill={themeColor} fontSize="6" fontWeight="bold" transform="rotate(-90 30 52)" textAnchor="middle">
            {brandLabel}
          </text>

          {/* Soquete da CPU com Alavanca */}
          <rect x="52" y="38" width="48" height="48" rx="4" fill="#0F172A" stroke="#F59E0B" strokeWidth="1.5" />
          <rect x="58" y="44" width="36" height="36" fill="#1E293B" />
          <line x1="102" y1="40" x2="102" y2="84" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />

          {/* Slots de RAM (4 slots) */}
          <rect x="108" y="22" width="5" height="72" rx="1" fill="#0F172A" stroke={isDdr5 ? '#06B6D4' : '#64748B'} strokeWidth="1" />
          <rect x="115" y="22" width="5" height="72" rx="1" fill="#0F172A" stroke={isDdr5 ? '#06B6D4' : '#64748B'} strokeWidth="1" />
          <rect x="122" y="22" width="5" height="72" rx="1" fill="#0F172A" stroke={isDdr5 ? '#06B6D4' : '#64748B'} strokeWidth="1" />
          <rect x="129" y="22" width="5" height="72" rx="1" fill="#0F172A" stroke={isDdr5 ? '#06B6D4' : '#64748B'} strokeWidth="1" />

          {/* Slot PCIe x16 Blindado */}
          <rect x="18" y="98" width="115" height="12" rx="2" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.5" />
          <rect x="22" y="100" width="105" height="8" rx="1" fill="#334155" />
          <circle cx="128" cy="104" r="2.5" fill="#F59E0B" />

          {/* Slot M.2 com Dissipador Térmico */}
          <rect x="50" y="116" width="55" height="12" rx="2" fill="#1E293B" stroke="#475569" strokeWidth="1" />
          <text x="77" y="125" fill="#E2E8F0" fontSize="6" fontWeight="bold" textAnchor="middle">M.2 NVMe</text>

          {/* Dissipador do Chipset */}
          <rect x="110" y="112" width="35" height="32" rx="4" fill="#1E293B" stroke={themeColor} strokeWidth="1.5" />
          <text x="127" y="128" fill="#F8FAFC" fontSize="8" fontWeight="extrabold" textAnchor="middle">
            {chipsetLabel}
          </text>
          <text x="127" y="137" fill={themeColor} fontSize="5" fontWeight="black" textAnchor="middle">
            CHIPSET
          </text>
        </svg>
      );
    }

    case 'RAM': {
      const isCorsair = lowerName.includes('corsair');
      const isKingston = lowerName.includes('kingston') || lowerName.includes('fury');
      const isGskill = lowerName.includes('g.skill') || lowerName.includes('trident');
      const isXpg = lowerName.includes('xpg');

      let brandText = isCorsair ? 'CORSAIR' : isKingston ? 'KINGSTON FURY' : isGskill ? 'G.SKILL' : isXpg ? 'XPG LANCER' : 'FURY';
      let seriesText = isDdr5 ? 'DDR5 6000MHz' : 'DDR4 3200MHz';

      return (
        <svg viewBox="0 0 200 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Dissipador Metálico da RAM */}
          <rect x="8" y="10" width="184" height="50" rx="4" fill="#090D16" stroke={isDdr5 ? '#06B6D4' : '#64748B'} strokeWidth="2" />
          {/* Barra Superior Difusora RGB */}
          <rect x="12" y="12" width="176" height="6" rx="3" fill="url(#rgbGlow)" opacity="0.95" />
          {/* Linhas de texturas de alumínio anodizado */}
          <path d="M 25 24 L 45 48 M 55 24 L 75 48 M 125 24 L 145 48 M 155 24 L 175 48" stroke="#1E293B" strokeWidth="2.5" />
          {/* Nome da Marca e Modelo */}
          <text x="100" y="36" fill="#F8FAFC" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="1">
            {brandText}
          </text>
          <text x="100" y="49" fill={isDdr5 ? '#38BDF8' : '#94A3B8'} fontSize="8" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
            {seriesText}
          </text>
          {/* Pinos Dourados de Conexão */}
          <rect x="14" y="60" width="172" height="12" fill="#0B101D" />
          {[...Array(24)].map((_, i) => (
            <rect key={i} x={16 + i * 7} y="62" width="4" height="8" fill="#F59E0B" rx="1" />
          ))}
          {/* Chanfro (Notch) Físico: centralizado diferente para DDR4 vs DDR5 */}
          <rect x={isDdr5 ? '104' : '92'} y="59" width="8" height="14" fill="#020617" />
          <defs>
            <linearGradient id="rgbGlow" x1="0" y1="0" x2="1" y2="0">
              <stop stopColor="#EC4899" />
              <stop offset="0.3" stopColor="#8B5CF6" />
              <stop offset="0.6" stopColor="#06B6D4" />
              <stop offset="1" stopColor="#10B981" />
            </linearGradient>
          </defs>
        </svg>
      );
    }

    case 'COOLER': {
      const isWater = lowerName.includes('water') || lowerName.includes('aio') || lowerName.includes('kraken') || lowerName.includes('h100i');
      const isNoctua = lowerName.includes('noctua');
      const isDualTower = lowerName.includes('peerless') || lowerName.includes('d15') || lowerName.includes('ak620');

      if (isWater) {
        return (
          <svg viewBox="0 0 180 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Radiador de Alumínio 240/360mm */}
            <rect x="10" y="15" width="160" height="48" rx="4" fill="#090D16" stroke="#38BDF8" strokeWidth="2" />
            <circle cx="50" cy="39" r="17" fill="#1E293B" stroke="#0284C7" strokeWidth="2" />
            <circle cx="130" cy="39" r="17" fill="#1E293B" stroke="#0284C7" strokeWidth="2" />
            {/* Mangueiras Flexíveis com Malha */}
            <path d="M 150 52 C 150 90, 80 80, 75 95" stroke="#334155" strokeWidth="6" fill="none" strokeLinecap="round" />
            <path d="M 140 52 C 140 100, 95 85, 90 95" stroke="#1E293B" strokeWidth="6" fill="none" strokeLinecap="round" />
            {/* Bloco da Bomba na CPU */}
            <circle cx="82" cy="100" r="17" fill="#0284C7" stroke="#38BDF8" strokeWidth="2" />
            <circle cx="82" cy="100" r="10" fill="#0B132B" />
            {lowerName.includes('kraken') || lowerName.includes('lcd') ? (
              <text x="82" y="103" fill="#38BDF8" fontSize="7" fontWeight="bold" textAnchor="middle">32°C</text>
            ) : (
              <circle cx="82" cy="100" r="5" fill="#38BDF8" />
            )}
          </svg>
        );
      }

      // Air Cooler Torre
      return (
        <svg viewBox="0 0 160 140" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Base de Cobre */}
          <rect x="45" y="115" width="70" height="15" rx="3" fill="#B45309" stroke="#D97706" strokeWidth="1.5" />
          {/* Heatpipes de Cobre */}
          <path d="M 52 115 L 52 25 M 68 115 L 68 25 M 92 115 L 92 25 M 108 115 L 108 25" stroke="#D97706" strokeWidth="4" />
          {/* Torre(s) de Aletas de Alumínio */}
          <rect x="30" y="25" width="100" height="85" rx="6" fill={isNoctua ? '#18181B' : '#64748B'} stroke="#94A3B8" strokeWidth="2" />
          {[...Array(8)].map((_, i) => (
            <line key={i} x1="32" y1={35 + i * 9} x2="128" y2={35 + i * 9} stroke="#475569" strokeWidth="1.5" />
          ))}
          {/* Ventoinha 120mm */}
          <rect x="25" y="20" width="110" height="95" rx="10" fill="#090D16" stroke={isNoctua ? '#854D0E' : '#06B6D4'} strokeWidth="2" opacity="0.9" />
          <circle cx="80" cy="67" r="30" fill="#1E293B" stroke={isNoctua ? '#A16207' : '#0284C7'} strokeWidth="2" />
          <circle cx="80" cy="67" r="10" fill={isNoctua ? '#CA8A04' : '#38BDF8'} />
          <text x="80" y="70" fill="#F8FAFC" fontSize="6" fontWeight="bold" textAnchor="middle">
            {isNoctua ? 'NOCTUA' : isDualTower ? 'DUAL TOWER' : '120MM'}
          </text>
        </svg>
      );
    }

    case 'PASTE': {
      const isKryonaut = lowerName.includes('kryonaut');
      const isNoctua = lowerName.includes('noctua');
      const isMx = lowerName.includes('mx-4') || lowerName.includes('mx-6');

      return (
        <svg viewBox="0 0 160 80" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Seringa de Pasta Térmica */}
          <rect x="20" y="32" width="25" height="16" rx="2" fill="#475569" />
          <line x1="10" y1="40" x2="20" y2="40" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
          {/* Corpo da Seringa */}
          <rect x="45" y="28" width="80" height="24" rx="4" fill="#0F172A" stroke="#64748B" strokeWidth="2" />
          {/* Etiqueta da Marca */}
          <rect x="52" y="31" width="66" height="18" rx="2" fill={isKryonaut ? '#BE185D' : isNoctua ? '#854D0E' : isMx ? '#0369A1' : '#475569'} />
          <text x="85" y="43" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">
            {isKryonaut ? 'KRYONAUT' : isNoctua ? 'NT-H1' : isMx ? 'ARCTIC MX' : 'SILICONE'}
          </text>
          {/* Bico da Seringa */}
          <polygon points="125,36 145,39 145,41 125,44" fill="#475569" />
          {/* Gota saindo do bico */}
          <circle cx="149" cy="40" r="3.5" fill={isKryonaut ? '#EC4899' : '#CBD5E1'} stroke="#94A3B8" strokeWidth="1" />
        </svg>
      );
    }

    case 'GPU': {
      const isTripleFan = lowerName.includes('4090') || lowerName.includes('4070') || lowerName.includes('7900') || lowerName.includes('7800') || lowerName.includes('6700');
      const isAsusRog = lowerName.includes('rog');
      const isTuf = lowerName.includes('tuf');

      return (
        <svg viewBox="0 0 220 110" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Espelho Traseiro PCIe */}
          <rect x="10" y="15" width="12" height="85" rx="2" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1.5" />
          <circle cx="16" cy="25" r="3" fill="#64748B" />
          <rect x="13" y="45" width="6" height="14" fill="#475569" />

          {/* Carenagem da GPU */}
          <rect
            x="22"
            y="20"
            width="190"
            height="70"
            rx="8"
            fill="#090D16"
            stroke={isAsusRog ? '#E11D48' : isTuf ? '#EAB308' : isRtx ? '#10B981' : '#EF4444'}
            strokeWidth="2"
          />

          {/* Ventoinhas (3 vs 2) */}
          {isTripleFan ? (
            <>
              <circle cx="65" cy="55" r="21" fill="#1E293B" stroke="#334155" strokeWidth="2" />
              <circle cx="65" cy="55" r="7" fill={isRtx ? '#10B981' : '#EF4444'} />
              <circle cx="118" cy="55" r="21" fill="#1E293B" stroke="#334155" strokeWidth="2" />
              <circle cx="118" cy="55" r="7" fill={isRtx ? '#10B981' : '#EF4444'} />
              <circle cx="170" cy="55" r="21" fill="#1E293B" stroke="#334155" strokeWidth="2" />
              <circle cx="170" cy="55" r="7" fill={isRtx ? '#10B981' : '#EF4444'} />
            </>
          ) : (
            <>
              <circle cx="75" cy="55" r="25" fill="#1E293B" stroke="#334155" strokeWidth="2" />
              <circle cx="75" cy="55" r="8" fill={isRtx ? '#10B981' : '#EF4444'} />
              <circle cx="150" cy="55" r="25" fill="#1E293B" stroke="#334155" strokeWidth="2" />
              <circle cx="150" cy="55" r="8" fill={isRtx ? '#10B981' : '#EF4444'} />
            </>
          )}

          {/* Conector Dourado PCIe x16 Inferior */}
          <rect x="40" y="90" width="120" height="8" rx="1" fill="#F59E0B" stroke="#B45309" strokeWidth="1" />

          {/* Logo Superior */}
          <text x="110" y="32" fill="#F8FAFC" fontSize="9" fontWeight="900" textAnchor="middle" letterSpacing="1">
            {isRtx ? 'GEFORCE RTX™' : 'RADEON™ RX'}
          </text>
        </svg>
      );
    }

    case 'STORAGE': {
      const isSata = lowerName.includes('sata') || lowerName.includes('a400') || lowerName.includes('bx500') || lowerName.includes('hdd') || lowerName.includes('barracuda');
      const isHdd = lowerName.includes('hdd') || lowerName.includes('barracuda') || lowerName.includes('seagate');

      if (isHdd) {
        return (
          <svg viewBox="0 0 160 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="10" width="110" height="80" rx="6" fill="#1E293B" stroke="#475569" strokeWidth="2" />
            <circle cx="75" cy="45" r="26" fill="#94A3B8" stroke="#CBD5E1" strokeWidth="2" />
            <circle cx="75" cy="45" r="8" fill="#475569" />
            <line x1="75" y1="45" x2="105" y2="30" stroke="#06B6D4" strokeWidth="2" />
            <text x="80" y="82" fill="#E2E8F0" fontSize="8" fontWeight="bold" textAnchor="middle">HDD 7200RPM SATA</text>
          </svg>
        );
      }

      if (isSata) {
        return (
          <svg viewBox="0 0 160 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="25" y="10" width="110" height="80" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="2" />
            <rect x="40" y="25" width="80" height="40" rx="3" fill="#1E293B" />
            <text x="80" y="44" fill="#E2E8F0" fontSize="9" fontWeight="bold" textAnchor="middle">SSD SATA 2.5&quot;</text>
            <text x="80" y="56" fill="#06B6D4" fontSize="7" textAnchor="middle">500 MB/s Kingston/Crucial</text>
            <rect x="25" y="75" width="20" height="10" fill="#F59E0B" />
            <rect x="50" y="75" width="30" height="10" fill="#F59E0B" />
          </svg>
        );
      }

      // NVMe M.2 2280
      const isSamsung = lowerName.includes('samsung');
      const isWd = lowerName.includes('wd') || lowerName.includes('black');

      return (
        <svg viewBox="0 0 180 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* PCB M.2 */}
          <rect x="10" y="10" width="160" height="40" rx="4" fill={isWd ? '#0B0F19' : isSamsung ? '#18181B' : '#064E3B'} stroke={isSamsung ? '#EF4444' : isWd ? '#F97316' : '#10B981'} strokeWidth="1.5" />
          <path d="M 10 25 C 16 25, 16 35, 10 35" fill="#020617" />
          {/* NAND Flash Chips */}
          <rect x="35" y="15" width="35" height="30" rx="3" fill="#0F172A" stroke="#334155" strokeWidth="1" />
          <rect x="80" y="15" width="35" height="30" rx="3" fill="#0F172A" stroke="#334155" strokeWidth="1" />
          {/* Controlador */}
          <rect x="125" y="18" width="20" height="24" rx="2" fill="#94A3B8" />
          <text x="97" y="32" fill="#E2E8F0" fontSize="8" fontWeight="bold" textAnchor="middle">
            {isSamsung ? 'SAMSUNG 990 PRO' : isWd ? 'WD_BLACK SN770' : 'M.2 NVMe PCIe'}
          </text>
          {/* Pinos M.2 */}
          <rect x="162" y="14" width="8" height="32" fill="#F59E0B" />
        </svg>
      );
    }

    case 'PSU': {
      const isCorsair = lowerName.includes('corsair');
      const isAsusThor = lowerName.includes('thor');
      const isMsi = lowerName.includes('msi');

      return (
        <svg viewBox="0 0 180 120" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Chassi da Fonte */}
          <rect x="15" y="15" width="150" height="90" rx="8" fill="#090D16" stroke={isCorsair ? '#EAB308' : isAsusThor ? '#E11D48' : '#334155'} strokeWidth="2.5" />
          {/* Grelha de Ventilação */}
          <circle cx="75" cy="60" r="32" fill="#1E293B" stroke="#475569" strokeWidth="2" />
          <circle cx="75" cy="60" r="12" fill={isCorsair ? '#EAB308' : '#0284C7'} />

          {/* Chave I/O e Entrada AC */}
          <rect x="125" y="30" width="30" height="22" rx="3" fill="#020617" stroke="#64748B" strokeWidth="1" />
          <rect x="130" y="60" width="20" height="14" rx="2" fill="#E11D48" />

          {/* Selo 80 Plus / OLED Display */}
          {isAsusThor ? (
            <rect x="120" y="80" width="40" height="18" rx="2" fill="#0284C7" />
          ) : (
            <rect x="122" y="82" width="36" height="15" rx="3" fill="#F59E0B" />
          )}
          <text x="140" y="93" fill="#0F172A" fontSize="7" fontWeight="black" textAnchor="middle">
            {isAsusThor ? 'OLED 450W' : '80 PLUS'}
          </text>
        </svg>
      );
    }

    case 'CASE': {
      const isLianLi = lowerName.includes('lian li') || lowerName.includes('aquario');
      const isCorsair = lowerName.includes('corsair');

      return (
        <svg viewBox="0 0 140 160" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="10" width="100" height="140" rx="8" fill="#090D16" stroke={isLianLi ? '#06B6D4' : isCorsair ? '#F59E0B' : '#475569'} strokeWidth="2" />
          <rect x="25" y="20" width="75" height="95" rx="4" fill="#1E293B" opacity="0.6" stroke="#38BDF8" strokeWidth="1" />
          <rect x="25" y="120" width="90" height="25" rx="3" fill="#020617" />
          <text x="70" y="136" fill="#64748B" fontSize="8" fontWeight="bold" textAnchor="middle">
            {isLianLi ? 'DUAL CHAMBER' : 'PSU SHROUD'}
          </text>
          <circle cx="112" cy="35" r="7" fill="#06B6D4" />
          <circle cx="112" cy="65" r="7" fill="#8B5CF6" />
          <circle cx="112" cy="95" r="7" fill="#EC4899" />
          <circle cx="95" cy="14" r="2.5" fill="#10B981" />
        </svg>
      );
    }

    default:
      return null;
  }
};
