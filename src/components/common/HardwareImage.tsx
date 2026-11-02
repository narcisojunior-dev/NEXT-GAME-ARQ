import React from 'react';
import {
  HardwareComponent,
  CpuComponent,
  MotherboardComponent,
  RamComponent,
  CoolerComponent,
  ThermalPasteComponent,
  GpuComponent,
  StorageComponent,
  PsuComponent,
  CaseComponent,
} from '@/engine/types';

interface HardwareImageProps {
  component: HardwareComponent;
  className?: string;
  /** Atributos extras do <svg> raiz (ex: x/y/width/height ao aninhar dentro da placa-mãe) */
  svgProps?: React.SVGProps<SVGSVGElement>;
}

/**
 * Ilustração vetorial gerada a partir dos dados da peça: tamanho, quantidade de módulos,
 * certificação, número de ventoinhas etc. vêm do catálogo, não do nome comercial.
 * Os gradientes vêm de <HardwareMaterials />, montado uma vez na página.
 */
export const HardwareImage: React.FC<HardwareImageProps> = ({ component, className = 'w-full h-28', svgProps }) => {
  const frame = (viewBox: string, children: React.ReactNode) => (
    <svg
      viewBox={viewBox}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...svgProps}
    >
      {children}
    </svg>
  );

  switch (component.category) {
    case 'CPU':
      return frame('0 0 160 160', <CpuArt cpu={component} />);
    case 'RAM':
      return frame('0 0 200 96', <RamArt ram={component} />);
    case 'COOLER':
      return frame(component.coolerType === 'Water' ? '0 0 180 132' : '0 0 160 150', <CoolerArt cooler={component} />);
    case 'PASTE':
      return frame('0 0 160 70', <PasteArt paste={component} />);
    case 'GPU':
      return frame('0 0 340 130', <GpuArt gpu={component} />);
    case 'STORAGE':
      return frame(
        component.storageType === 'NVMe_M2' ? '0 0 200 64' : '0 0 160 112',
        <StorageArt storage={component} />
      );
    case 'PSU':
      return frame('0 0 180 132', <PsuArt psu={component} />);
    case 'MOTHERBOARD':
      return frame('0 0 160 176', <MotherboardArt mb={component} />);
    case 'CASE':
      return frame('0 0 140 170', <CaseArt pcCase={component} />);
    default:
      return null;
  }
};

const formatCapacity = (gb: number) => (gb >= 1000 ? `${gb / 1000}TB` : `${gb}GB`);

/** Ventoinha vista de frente: moldura, sete pás e cubo central */
const Fan: React.FC<{ cx: number; cy: number; r: number }> = ({ cx, cy, r }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill="url(#hw-fan)" stroke="#475569" strokeWidth="1.2" />
    {[0, 51, 103, 154, 206, 257, 309].map((angle) => (
      <ellipse
        key={angle}
        cx={cx}
        cy={cy - r * 0.52}
        rx={r * 0.2}
        ry={r * 0.4}
        fill="#4B5A70"
        opacity="0.85"
        transform={`rotate(${angle} ${cx} ${cy})`}
      />
    ))}
    <circle cx={cx} cy={cy} r={r * 0.28} fill="#0F172A" stroke="#64748B" strokeWidth="1" />
  </g>
);

const CpuArt: React.FC<{ cpu: CpuComponent }> = ({ cpu }) => {
  const isIntel = cpu.socket === 'LGA1700';
  const model = cpu.name.replace(/^(Intel Core|AMD Ryzen)\s*/i, '');
  const amdParts = model.match(/^(\d)\s+(\S+)/);
  const brandLine = isIntel ? 'intel CORE' : `AMD RYZEN ${amdParts?.[1] ?? ''}`;
  const modelLine = isIntel ? model : amdParts?.[2] ?? model;
  // LGA1700 é retangular (45 x 37,5 mm); AM4/AM5 são quadrados (40 x 40 mm)
  const sub = isIntel ? { x: 12, y: 24, w: 136, h: 112 } : { x: 18, y: 18, w: 124, h: 124 };
  const ihs = isIntel ? { x: 30, y: 38, w: 100, h: 84 } : { x: 32, y: 32, w: 96, h: 96 };

  return (
    <>
      <rect x={sub.x} y={sub.y} width={sub.w} height={sub.h} rx="6" fill="url(#hw-pcb-green)" stroke="#166534" strokeWidth="1.5" />
      {/* Capacitores SMD nas bordas do substrato */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <rect x={sub.x + 22 + i * ((sub.w - 44) / 5)} y={sub.y + 5} width="5" height="3" fill="#B45309" />
          <rect x={sub.x + 22 + i * ((sub.w - 44) / 5)} y={sub.y + sub.h - 8} width="5" height="3" fill="#B45309" />
        </g>
      ))}
      {/* Triângulo dourado de orientação */}
      <polygon points={`${sub.x + 4},${sub.y + 4} ${sub.x + 16},${sub.y + 4} ${sub.x + 4},${sub.y + 16}`} fill="url(#hw-gold)" />
      {/* IHS (tampa metálica) */}
      <rect x={ihs.x} y={ihs.y} width={ihs.w} height={ihs.h} rx={isIntel ? 5 : 8} fill="url(#hw-ihs)" stroke="#E2E8F0" strokeWidth="1.5" />
      {/* AM5: recortes laterais característicos do IHS */}
      {cpu.socket === 'AM5' &&
        [ihs.y + 16, ihs.y + ihs.h - 26].flatMap((y) => [
          <rect key={`l${y}`} x={ihs.x - 1} y={y} width="8" height="10" rx="2" fill="#0B3D27" />,
          <rect key={`r${y}`} x={ihs.x + ihs.w - 7} y={y} width="8" height="10" rx="2" fill="#0B3D27" />,
        ])}
      <path d={`M ${ihs.x + 6} ${ihs.y + 3} H ${ihs.x + ihs.w - 10}`} stroke="#FFFFFF" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" />
      <text x="80" y={ihs.y + ihs.h / 2 - 12} fill="#1E293B" fontSize="9" fontWeight="800" textAnchor="middle" letterSpacing="1.2">
        {brandLine}
      </text>
      <text x="80" y={ihs.y + ihs.h / 2 + 6} fill="#0F172A" fontSize="15" fontWeight="800" textAnchor="middle">
        {modelLine}
      </text>
      <text x="80" y={ihs.y + ihs.h / 2 + 22} fill="#475569" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">
        {cpu.cores}C/{cpu.threads}T · {cpu.boostClockGhz.toFixed(1)}GHz
      </text>
    </>
  );
};

const RamArt: React.FC<{ ram: RamComponent }> = ({ ram }) => {
  const isDdr5 = ram.ramType === 'DDR5';
  const hasRgb = /rgb/i.test(ram.name);
  const accent = isDdr5 ? '#22D3EE' : '#F59E0B';
  const perStick = ram.capacityGb / ram.moduleCount;

  const stick = (dx: number, dy: number, key: string) => (
    <g key={key} transform={`translate(${dx} ${dy})`}>
      <rect x="10" y="40" width="172" height="20" rx="2" fill="url(#hw-pcb-green)" />
      {[...Array(26)].map((_, i) => (
        <rect key={i} x={14 + i * 6.4} y="52" width="4" height="7" rx="0.5" fill="url(#hw-gold)" />
      ))}
      {/* Chanfro: posição diferente em DDR4 e DDR5 impede encaixe na geração errada */}
      <rect x={isDdr5 ? 98 : 84} y="51" width="6" height="10" fill="#0A0F1C" />
      <rect x="8" y="4" width="176" height="44" rx="4" fill="url(#hw-alu-dark)" stroke="#4B5563" strokeWidth="1" />
      {hasRgb && <rect x="12" y="1" width="168" height="5" rx="2.5" fill="url(#hw-rgb)" />}
      <rect x="8" y="36" width="176" height="2" fill={accent} opacity="0.9" />
      <text x="20" y="27" fill="#F8FAFC" fontSize="14" fontWeight="800">
        {perStick}GB
      </text>
      <text x="172" y="27" fill={accent} fontSize="11" fontWeight="800" textAnchor="end" letterSpacing="1">
        {ram.ramType}
      </text>
      <text x="172" y="46" fill="#94A3B8" fontSize="6.5" textAnchor="end" fontFamily="var(--font-mono)">
        {ram.frequencyMhz} MHz
      </text>
    </g>
  );

  return ram.moduleCount > 1 ? (
    <>
      {stick(8, 4, 'back')}
      {stick(0, 30, 'front')}
    </>
  ) : (
    stick(4, 18, 'single')
  );
};

const CoolerArt: React.FC<{ cooler: CoolerComponent }> = ({ cooler }) => {
  if (cooler.coolerType === 'Water') {
    const hasArgb = /argb|rgb/i.test(cooler.name);
    return (
      <>
        <path d="M 150 64 C 152 100, 110 96, 92 104" stroke="#1F2937" strokeWidth="7" strokeLinecap="round" />
        <path d="M 138 64 C 140 112, 104 110, 88 116" stroke="#273244" strokeWidth="7" strokeLinecap="round" />
        <rect x="8" y="8" width="164" height="58" rx="5" fill="url(#hw-alu-dark)" stroke="#475569" strokeWidth="1.2" />
        {[...Array(30)].map((_, i) => (
          <line key={i} x1={14 + i * 5.2} y1="12" x2={14 + i * 5.2} y2="62" stroke="#334155" strokeWidth="1" />
        ))}
        <Fan cx={50} cy={37} r={23} />
        <Fan cx={130} cy={37} r={23} />
        <circle cx="76" cy="108" r="20" fill="url(#hw-plastic)" stroke="#475569" strokeWidth="1.5" />
        {hasArgb && <circle cx="76" cy="108" r="14" stroke="url(#hw-rgb)" strokeWidth="3" />}
        <circle cx="76" cy="108" r="7" fill="#0F172A" />
      </>
    );
  }

  if (cooler.maxTdpWatts <= 65) {
    // Cooler box visto de cima: aletas radiais de alumínio sob a ventoinha
    const isPushPin = cooler.supportedSockets.length === 1 && cooler.supportedSockets[0] === 'LGA1700';
    return (
      <>
        <circle cx="80" cy="66" r="56" fill="url(#hw-alu)" stroke="#CBD5E1" strokeWidth="1" />
        {[...Array(28)].map((_, i) => {
          const a = (i / 28) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={80 + Math.cos(a) * 38}
              y1={66 + Math.sin(a) * 38}
              x2={80 + Math.cos(a) * 55}
              y2={66 + Math.sin(a) * 55}
              stroke="#64748B"
              strokeWidth="1.5"
            />
          );
        })}
        <Fan cx={80} cy={66} r={36} />
        {/* Presilhas push-pin do padrão Intel */}
        {isPushPin &&
          [
            [34, 20],
            [126, 20],
            [34, 112],
            [126, 112],
          ].map(([x, y]) => <circle key={`${x}${y}`} cx={x} cy={y} r="6" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.5" />)}
      </>
    );
  }

  // Air cooler em torre: base de cobre, heatpipes e pilha de aletas
  const heatpipes = cooler.maxTdpWatts >= 150 ? 4 : 2;
  return (
    <>
      <rect x="46" y="124" width="68" height="14" rx="3" fill="url(#hw-copper)" />
      <rect x="28" y="12" width="104" height="110" rx="4" fill="url(#hw-alu)" stroke="#CBD5E1" strokeWidth="1" />
      {[...Array(14)].map((_, i) => (
        <line key={i} x1="28" y1={18 + i * 7.5} x2="132" y2={18 + i * 7.5} stroke="#64748B" strokeWidth="1" />
      ))}
      {[...Array(heatpipes)].map((_, i) => {
        const x = 52 + i * (56 / Math.max(1, heatpipes - 1));
        return (
          <g key={i}>
            <line x1={x} y1="124" x2={x} y2="10" stroke="url(#hw-copper)" strokeWidth="5" strokeLinecap="round" />
          </g>
        );
      })}
      <rect x="36" y="26" width="88" height="88" rx="10" fill="url(#hw-plastic)" stroke="#334155" strokeWidth="1.5" />
      <Fan cx={80} cy={70} r={39} />
    </>
  );
};

const PasteArt: React.FC<{ paste: ThermalPasteComponent }> = ({ paste }) => {
  const isPremium = parseFloat(paste.thermalConductivity) >= 5;
  return (
    <>
      <circle cx="10" cy="35" r="5" fill="#94A3B8" />
      <path d="M 14 35 L 30 30 L 30 40 Z" fill="#CBD5E1" />
      <rect x="30" y="23" width="88" height="24" rx="5" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1" />
      <rect x="46" y="25" width="56" height="20" rx="2" fill={isPremium ? '#1D4ED8' : '#64748B'} />
      <text x="74" y="38.5" fill="#F8FAFC" fontSize="8" fontWeight="800" textAnchor="middle" fontFamily="var(--font-mono)">
        {paste.thermalConductivity}
      </text>
      <rect x="118" y="30" width="22" height="10" fill="#CBD5E1" />
      <rect x="140" y="20" width="6" height="30" rx="2" fill="#94A3B8" />
    </>
  );
};

const GpuArt: React.FC<{ gpu: GpuComponent }> = ({ gpu }) => {
  // Escala fixa (1 unidade = 1 mm) para o comprimento ser comparável entre placas
  const length = gpu.lengthMm;
  const x0 = 22;
  const x1 = x0 + length;
  const isNvidia = /nvidia|geforce|rtx|gtx/i.test(gpu.name);
  const accent = isNvidia ? '#76B900' : '#E11D48';
  const fanCount = length >= 260 ? 3 : length >= 190 ? 2 : 1;
  const fanSlot = (length - 24) / fanCount;
  const fanR = Math.min(27, fanSlot / 2 - 4);
  const model = gpu.name.replace(/^(NVIDIA GeForce|AMD Radeon)\s*/i, '').replace(/\s*\d+GB.*$/i, '');

  return (
    <>
      {/* Espelho PCIe com saídas de vídeo */}
      <rect x="8" y="10" width="14" height="92" rx="2" fill="url(#hw-alu)" />
      {[24, 40, 56].map((y) => (
        <rect key={y} x="11" y={y} width="8" height="10" rx="1" fill="#1E293B" />
      ))}
      <rect x={x0} y="80" width={length} height="10" fill="url(#hw-pcb-dark)" />
      <rect x={x0 + 18} y="90" width={Math.min(110, length - 40)} height="7" fill="url(#hw-gold)" />
      <rect x={x0} y="10" width={length} height="74" rx="8" fill="url(#hw-plastic)" stroke="#334155" strokeWidth="1.2" />
      <rect x={x0 + 8} y="14" width={length - 16} height="2" rx="1" fill={accent} opacity="0.9" />
      {[...Array(fanCount)].map((_, i) => (
        <Fan key={i} cx={x0 + 12 + fanSlot * (i + 0.5)} cy={48} r={fanR} />
      ))}
      {gpu.powerPins !== 'none' && (
        <g>
          <rect x={x1 - 46} y="3" width="30" height="9" rx="1.5" fill="#0F172A" stroke="#64748B" strokeWidth="1" />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={x1 - 43 + i * 6.5} y="5.5" width="4" height="4" fill="#475569" />
          ))}
        </g>
      )}
      <text x={x0 + 10} y="80" fill="#CBD5E1" fontSize="7.5" fontWeight="800" letterSpacing="0.6">
        {model} · {gpu.vramGb}GB
      </text>
      {/* Régua de comprimento */}
      <line x1={x0} y1="114" x2={x1} y2="114" stroke="#64748B" strokeWidth="1" />
      <line x1={x0} y1="109" x2={x0} y2="119" stroke="#64748B" strokeWidth="1" />
      <line x1={x1} y1="109" x2={x1} y2="119" stroke="#64748B" strokeWidth="1" />
      <text x={(x0 + x1) / 2} y="127" fill="#94A3B8" fontSize="10" textAnchor="middle" fontFamily="var(--font-mono)">
        {length} mm
      </text>
    </>
  );
};

const StorageArt: React.FC<{ storage: StorageComponent }> = ({ storage }) => {
  const capacity = formatCapacity(storage.capacityGb);

  if (storage.storageType === 'NVMe_M2') {
    const hasHeatsink = storage.readSpeedMbps >= 7000;
    return (
      <>
        <rect x="10" y="14" width="176" height="36" rx="3" fill="url(#hw-pcb-dark)" stroke="#334155" strokeWidth="1" />
        <path d="M 10 26 A 6 6 0 0 1 10 38" fill="#0A0F1C" />
        <rect x="186" y="18" width="8" height="28" fill="url(#hw-gold)" />
        <rect x="186" y="36" width="8" height="3" fill="#0A0F1C" />
        {hasHeatsink ? (
          <>
            <rect x="24" y="10" width="156" height="44" rx="4" fill="url(#hw-alu-dark)" stroke="#4B5563" strokeWidth="1" />
            {[...Array(12)].map((_, i) => (
              <line key={i} x1={30 + i * 12} y1="14" x2={30 + i * 12} y2="50" stroke="#374151" strokeWidth="2" />
            ))}
          </>
        ) : (
          <>
            <rect x="34" y="19" width="38" height="26" rx="2" fill="#0F172A" stroke="#334155" />
            <rect x="80" y="19" width="38" height="26" rx="2" fill="#0F172A" stroke="#334155" />
            <rect x="128" y="22" width="22" height="20" rx="2" fill="url(#hw-alu)" />
          </>
        )}
        <text x="100" y="34" fill="#F8FAFC" fontSize="11" fontWeight="800" textAnchor="middle">
          {capacity} NVMe
        </text>
        <text x="100" y="45" fill="#94A3B8" fontSize="7" textAnchor="middle" fontFamily="var(--font-mono)">
          {storage.readSpeedMbps.toLocaleString('pt-BR')} MB/s
        </text>
      </>
    );
  }

  if (storage.storageType === 'SATA_HDD') {
    return (
      <>
        <rect x="18" y="6" width="124" height="94" rx="6" fill="url(#hw-alu)" stroke="#CBD5E1" strokeWidth="1.2" />
        <circle cx="68" cy="50" r="34" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="1.5" />
        <circle cx="68" cy="50" r="22" stroke="#CBD5E1" strokeWidth="1" />
        <circle cx="68" cy="50" r="7" fill="#64748B" />
        <path d="M 122 22 L 88 60" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
        <circle cx="122" cy="22" r="7" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
        <text x="122" y="88" fill="#1E293B" fontSize="10" fontWeight="800" textAnchor="middle">
          {capacity}
        </text>
        <rect x="26" y="100" width="18" height="6" fill="url(#hw-gold)" />
        <rect x="50" y="100" width="30" height="6" fill="url(#hw-gold)" />
      </>
    );
  }

  return (
    <>
      <rect x="22" y="8" width="116" height="88" rx="6" fill="url(#hw-alu-dark)" stroke="#4B5563" strokeWidth="1.2" />
      <rect x="34" y="22" width="92" height="46" rx="3" fill="#0F172A" />
      <text x="80" y="44" fill="#F8FAFC" fontSize="13" fontWeight="800" textAnchor="middle">
        {capacity}
      </text>
      <text x="80" y="58" fill="#22D3EE" fontSize="7.5" textAnchor="middle" fontFamily="var(--font-mono)">
        SSD SATA 2.5&quot;
      </text>
      <rect x="30" y="96" width="18" height="6" fill="url(#hw-gold)" />
      <rect x="54" y="96" width="30" height="6" fill="url(#hw-gold)" />
    </>
  );
};

const SEAL_COLORS: Record<PsuComponent['efficiencyRating'], { fill: string; text: string; label: string } | null> = {
  'Sem Selo': null,
  '80 Plus White': { fill: '#E5E7EB', text: '#111827', label: 'WHITE' },
  '80 Plus Bronze': { fill: '#B7793E', text: '#1C0F05', label: 'BRONZE' },
  '80 Plus Gold': { fill: '#EAB308', text: '#1C1402', label: 'GOLD' },
};

const PsuArt: React.FC<{ psu: PsuComponent }> = ({ psu }) => {
  const seal = SEAL_COLORS[psu.efficiencyRating];
  return (
    <>
      {!psu.isModular &&
        [0, 1, 2].map((i) => (
          <path key={i} d={`M ${22 + i * 8} 112 C ${22 + i * 8} 124, ${12 + i * 10} 126, ${6 + i * 12} 132`} stroke="#1F2937" strokeWidth="4" />
        ))}
      <rect x="12" y="12" width="156" height="100" rx="6" fill="url(#hw-plastic)" stroke="#334155" strokeWidth="1.5" />
      {[38, 30, 22].map((r) => (
        <circle key={r} cx="66" cy="62" r={r} stroke="#475569" strokeOpacity="0.55" strokeWidth="1" />
      ))}
      <Fan cx={66} cy={62} r={34} />
      <text x="158" y="40" fill="#F8FAFC" fontSize="19" fontWeight="800" textAnchor="end">
        {psu.wattage}W
      </text>
      {psu.isModular && (
        <g>
          {[0, 1, 2].flatMap((col) =>
            [0, 1].map((row) => (
              <rect key={`${col}${row}`} x={120 + col * 13} y={50 + row * 13} width="10" height="9" rx="1.5" fill="#0F172A" stroke="#64748B" strokeWidth="0.8" />
            ))
          )}
        </g>
      )}
      {seal ? (
        <g>
          <rect x="116" y="84" width="44" height="22" rx="3" fill={seal.fill} />
          <text x="138" y="94" fill={seal.text} fontSize="7" fontWeight="800" textAnchor="middle">
            80 PLUS
          </text>
          <text x="138" y="102.5" fill={seal.text} fontSize="6" fontWeight="800" textAnchor="middle" letterSpacing="0.8">
            {seal.label}
          </text>
        </g>
      ) : (
        <g>
          <rect x="116" y="84" width="44" height="22" rx="3" stroke="#F43F5E" strokeWidth="1.2" strokeDasharray="3 2" />
          <text x="138" y="98" fill="#FDA4AF" fontSize="7" fontWeight="800" textAnchor="middle">
            SEM SELO
          </text>
        </g>
      )}
    </>
  );
};

const MotherboardArt: React.FC<{ mb: MotherboardComponent }> = ({ mb }) => {
  // ATX (305 x 244 mm) é mais alta que Micro-ATX (244 x 244 mm)
  const isAtx = mb.formFactor === 'ATX';
  const bx = 20;
  const by = isAtx ? 8 : 26;
  const bw = 120;
  const bh = isAtx ? 152 : 120;
  const isLga = mb.socket === 'LGA1700';

  return (
    <>
      <rect x={bx} y={by} width={bw} height={bh} rx="5" fill="url(#hw-pcb-dark)" stroke="#1E3A5F" strokeWidth="1.5" />
      {mb.hasIntegratedIoShield && <rect x={bx - 4} y={by + 6} width="6" height="52" rx="1.5" fill="url(#hw-alu)" />}
      <rect x={bx + 6} y={by + 8} width="22" height="50" rx="3" fill="url(#hw-alu-dark)" stroke="#4B5563" strokeWidth="0.8" />
      <rect x={bx + 30} y={by + 6} width="44" height="12" rx="3" fill="url(#hw-alu-dark)" stroke="#4B5563" strokeWidth="0.8" />
      {/* Soquete */}
      <rect x={bx + 36} y={by + 24} width="34" height="34" rx="3" fill="#1E293B" stroke="url(#hw-gold)" strokeWidth="1.5" />
      {isLga ? (
        <rect x={bx + 42} y={by + 30} width="22" height="22" fill="#0F172A" stroke="#EAB308" strokeOpacity="0.5" strokeDasharray="1 1.5" />
      ) : (
        <rect x={bx + 42} y={by + 30} width="22" height="22" fill="#F1F5F9" fillOpacity="0.85" />
      )}
      <text x={bx + 53} y={by + 66} fill="#94A3B8" fontSize="6.5" fontWeight="800" textAnchor="middle" fontFamily="var(--font-mono)">
        {mb.socket}
      </text>
      {/* Slots de memória */}
      {[...Array(mb.ramSlotsCount)].map((_, i) => (
        <rect key={i} x={bx + 82 + i * 7} y={by + 10} width="4.5" height="54" rx="1" fill={i % 2 === 1 ? '#0E7490' : '#1E293B'} stroke="#334155" strokeWidth="0.6" />
      ))}
      <text x={bx + 82 + (mb.ramSlotsCount * 7) / 2} y={by + 72} fill="#22D3EE" fontSize="6" fontWeight="800" textAnchor="middle">
        {mb.supportedRam}
      </text>
      {/* Conector ATX 24 pinos */}
      <rect x={bx + 112} y={by + 14} width="5" height="30" rx="1" fill="#0F172A" stroke="#475569" strokeWidth="0.8" />
      {/* M.2 principal com dissipador */}
      <rect x={bx + 26} y={by + 74} width="48" height="7" rx="1.5" fill="url(#hw-alu-dark)" stroke="#4B5563" strokeWidth="0.6" />
      {/* Slots PCIe: o primeiro x16 é reforçado com metal */}
      {[...Array(mb.pcieSlotsCount)].map((_, i) => (
        <rect
          key={i}
          x={bx + 8}
          y={by + 88 + i * 16}
          width={i === 0 ? 86 : 64}
          height="5"
          rx="1"
          fill="#0F172A"
          stroke={i === 0 ? '#CBD5E1' : '#475569'}
          strokeWidth="0.9"
        />
      ))}
      {[...Array(Math.max(0, mb.m2SlotsCount - 1))].map((_, i) => (
        <rect key={i} x={bx + 14} y={by + 96 + i * 16} width="40" height="4" rx="1" fill="#1E293B" stroke="#334155" strokeWidth="0.6" />
      ))}
      {/* Dissipador do chipset */}
      <rect x={bx + 88} y={by + bh - 36} width="26" height="26" rx="3" fill="url(#hw-alu-dark)" stroke="#4B5563" strokeWidth="0.8" />
      <text x={bx + 101} y={by + bh - 20} fill="#CBD5E1" fontSize="6.5" fontWeight="800" textAnchor="middle">
        {mb.chipset}
      </text>
      {[
        [bx + 5, by + 5],
        [bx + bw - 5, by + 5],
        [bx + 5, by + bh - 5],
        [bx + bw - 5, by + bh - 5],
      ].map(([cx, cy]) => (
        <circle key={`${cx}${cy}`} cx={cx} cy={cy} r="2.2" fill="#0A0F1C" stroke="#CA8A04" strokeWidth="0.8" />
      ))}
      <text x={bx + 8} y={by + bh - 8} fill="#64748B" fontSize="6.5" fontWeight="800" fontFamily="var(--font-mono)">
        {mb.formFactor}
      </text>
    </>
  );
};

const CaseArt: React.FC<{ pcCase: CaseComponent }> = ({ pcCase }) => {
  const isMidTower = pcCase.supportedFormFactors.includes('ATX');
  const isPanoramic = /aqu[aá]rio|panor/i.test(pcCase.name);
  const hasGlass = isPanoramic || /vidro|mesh/i.test(`${pcCase.name} ${pcCase.description}`);
  const isMesh = /mesh/i.test(pcCase.name);
  const box = isMidTower ? { x: 16, y: 8, w: 108, h: 154 } : { x: 30, y: 42, w: 80, h: 120 };
  const front = { x: box.x + box.w - 16, y: box.y + 6, w: 12, h: box.h - 12 };
  const frontFans = Math.min(pcCase.fansIncluded, 3);
  const shroudH = isMidTower ? 26 : 20;

  return (
    <>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx="6" fill="url(#hw-plastic)" stroke="#334155" strokeWidth="1.5" />
      {/* Interior visto pelo vidro: placa-mãe e placa de vídeo */}
      <rect x={box.x + 10} y={box.y + 12} width={box.w * 0.5} height={box.h * 0.46} rx="2" fill="url(#hw-pcb-dark)" opacity="0.9" />
      <rect x={box.x + 10} y={box.y + 12 + box.h * 0.3} width={box.w * 0.62} height="7" rx="1.5" fill="#1E293B" stroke="#334155" strokeWidth="0.6" />
      <rect x={box.x + 6} y={box.y + box.h - shroudH - 6} width={box.w - 24} height={shroudH} rx="2" fill="#0B1220" />
      <text x={box.x + 6 + (box.w - 24) / 2} y={box.y + box.h - 6 - shroudH / 2 + 2.5} fill="#64748B" fontSize="6.5" fontWeight="800" textAnchor="middle" fontFamily="var(--font-mono)">
        GPU ≤ {pcCase.maxGpuLengthMm}mm
      </text>
      {hasGlass ? (
        <rect
          x={box.x + 4}
          y={box.y + 6}
          width={isPanoramic ? box.w - 8 : box.w - 22}
          height={box.h - shroudH - 16}
          rx="3"
          fill="url(#hw-glass)"
          stroke="#7DD3FC"
          strokeOpacity="0.45"
          strokeWidth="1"
        />
      ) : (
        [...Array(8)].map((_, i) => (
          <line key={i} x1={box.x + 14} y1={box.y + 70 + i * 5} x2={box.x + box.w - 30} y2={box.y + 70 + i * 5} stroke="#334155" strokeWidth="1.5" />
        ))
      )}
      {/* Frente: tela mesh ou painel liso, com as ventoinhas incluídas */}
      <rect x={front.x} y={front.y} width={front.w} height={front.h} rx="2" fill={isMesh ? '#111827' : '#1F2937'} />
      {isMesh &&
        [...Array(Math.floor(front.h / 5))].map((_, i) => (
          <line key={i} x1={front.x + 2} y1={front.y + 3 + i * 5} x2={front.x + front.w - 2} y2={front.y + 3 + i * 5} stroke="#334155" strokeWidth="1" strokeDasharray="1.5 1.5" />
        ))}
      {[...Array(frontFans)].map((_, i) => (
        <circle
          key={i}
          cx={front.x + front.w / 2}
          cy={front.y + 16 + i * ((front.h - 40) / Math.max(1, frontFans - 1 || 1))}
          r="5"
          fill="#0F172A"
          stroke="#22D3EE"
          strokeOpacity="0.8"
          strokeWidth="1.2"
        />
      ))}
      {pcCase.fansIncluded > 3 && <circle cx={box.x + 12} cy={box.y + 16} r="5" fill="#0F172A" stroke="#22D3EE" strokeOpacity="0.8" strokeWidth="1.2" />}
      <circle cx={front.x + front.w / 2} cy={box.y + 3.5} r="2" fill="#10B981" />
    </>
  );
};
