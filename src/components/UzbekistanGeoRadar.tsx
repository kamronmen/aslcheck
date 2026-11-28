import React, { useMemo, useState } from 'react';
import { Radio, MapPin, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { ReportWithProduct } from '../types';

export interface GeoNode {
  id: string;
  city: string;
  region: string;
  x: number;
  y: number;
  time?: string;
  count: number;
  status: 'alert' | 'critical' | 'safe';
  detail: string;
}

const UZBEKISTAN_OUTLINE_PATH =
  'M 42,102 L 95,78 L 132,48 L 164,84 L 222,92 L 268,124 L 325,134 L 385,168 L 430,174 L 456,144 L 478,164 L 462,196 L 495,184 L 542,188 L 558,214 L 534,242 L 492,240 L 455,222 L 430,235 L 408,266 L 392,310 L 402,340 L 380,355 L 352,334 L 330,308 L 280,295 L 238,262 L 195,214 L 154,204 L 122,185 L 44,186 Z';

const IMPOSSIBLE_TRAVEL_NODES: GeoNode[] = [
  {
    id: 'tashkent',
    city: 'Toshkent',
    region: 'Chilonzor bozori',
    x: 440,
    y: 194,
    time: '14:10',
    count: 5,
    status: 'critical',
    detail: '14:10 — Toshkent (5 ta skaner • Redmi / Chrome)',
  },
  {
    id: 'samarkand',
    city: 'Samarqand',
    region: 'Siyob bozori',
    x: 371,
    y: 257,
    time: '14:25',
    count: 4,
    status: 'critical',
    detail: '14:25 — Samarqand (+280 km 15 daqiqada! • Galaxy S24)',
  },
  {
    id: 'andijan',
    city: 'Andijon',
    region: 'Yangi bozor',
    x: 534,
    y: 214,
    time: '14:42',
    count: 4,
    status: 'alert',
    detail: '14:42 — Andijon (Shubhali takroriy skaner • iPhone 14)',
  },
  {
    id: 'bukhara',
    city: 'Buxoro',
    region: 'Karvon bozori',
    x: 294,
    y: 252,
    time: '15:05',
    count: 2,
    status: 'alert',
    detail: '15:05 — Buxoro (Bir xil QR nusxasi aniqlandi • Honor X9b)',
  },
];

const REGION_CATALOG: Array<{
  id: string;
  city: string;
  keywords: string[];
  x: number;
  y: number;
}> = [
  { id: 'tashkent', city: 'Toshkent', keywords: ['toshkent', 'chilonzor', 'chorsu', 'yunusobod', 'mirzo'], x: 440, y: 194 },
  { id: 'samarkand', city: 'Samarqand', keywords: ['samarqand', 'siyob', 'registon'], x: 371, y: 257 },
  { id: 'andijan', city: 'Andijon', keywords: ['andijon', 'asaka'], x: 534, y: 214 },
  { id: 'fergana', city: 'Farg‘ona', keywords: ['fargona', 'farg‘ona', 'margilon', 'qo‘qon'], x: 517, y: 229 },
  { id: 'namangan', city: 'Namangan', keywords: ['namangan'], x: 514, y: 205 },
  { id: 'bukhara', city: 'Buxoro', keywords: ['buxoro', 'karvon'], x: 294, y: 252 },
  { id: 'qashqadaryo', city: 'Qashqadaryo', keywords: ['qashqadaryo', 'qarshi', 'chiroqchi'], x: 360, y: 281 },
  { id: 'surxondaryo', city: 'Termiz', keywords: ['surxondaryo', 'termiz'], x: 381, y: 342 },
  { id: 'navoiy', city: 'Navoiy', keywords: ['navoiy'], x: 323, y: 240 },
  { id: 'jizzax', city: 'Jizzax', keywords: ['jizzax'], x: 398, y: 239 },
  { id: 'xorazm', city: 'Urganch', keywords: ['xorazm', 'urganch', 'xiva'], x: 180, y: 184 },
  { id: 'nukus', city: 'Nukus', keywords: ['nukus', 'qoraqalpog'], x: 149, y: 149 },
];

interface UzbekistanGeoRadarProps {
  mode: 'impossible-travel' | 'hotspots';
  reports?: ReportWithProduct[];
  homeRegion?: string;
}

export const UzbekistanGeoRadar: React.FC<UzbekistanGeoRadarProps> = ({
  mode,
  reports = [],
  homeRegion = 'Qashqadaryo, Chiroqchi',
}) => {
  const nodes: GeoNode[] = useMemo(() => {
    if (mode === 'impossible-travel') {
      return IMPOSSIBLE_TRAVEL_NODES;
    }

    const counts = new Map<string, { region: typeof REGION_CATALOG[number]; count: number; latestMsg: string }>();

    reports.forEach((rep) => {
      const loc = (rep.location_note || '').toLowerCase();
      const matched =
        REGION_CATALOG.find((r) => r.keywords.some((kw) => loc.includes(kw))) ||
        REGION_CATALOG[0]; // Default to Tashkent if unspecified urban location
      const existing = counts.get(matched.id);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(matched.id, {
          region: matched,
          count: 1,
          latestMsg: rep.report_message || rep.location_note || 'Shubhali skaner signali',
        });
      }
    });

    const mappedNodes: GeoNode[] = Array.from(counts.values()).map((entry) => ({
      id: entry.region.id,
      city: entry.region.city,
      region: 'Aniqlangan signal hududi',
      x: entry.region.x,
      y: entry.region.y,
      count: entry.count,
      status: entry.count >= 2 ? 'critical' : 'alert',
      detail: `${entry.region.city}: ${entry.count} ta signal — "${entry.latestMsg}"`,
    }));

    // Include safe factory origin hub if not already marked with complaints
    const homeLower = homeRegion.toLowerCase();
    const homeMatch =
      REGION_CATALOG.find((r) => r.keywords.some((kw) => homeLower.includes(kw))) ||
      REGION_CATALOG[6]; // Chiroqchi/Qashqadaryo

    if (!counts.has(homeMatch.id)) {
      mappedNodes.push({
        id: `home-${homeMatch.id}`,
        city: homeMatch.city,
        region: 'Rasmiy ishlab chiqaruvchi markazi',
        x: homeMatch.x,
        y: homeMatch.y,
        count: 0,
        status: 'safe',
        detail: `${homeMatch.city}: Rasmiy zavod ombori (Toza)`,
      });
    }

    return mappedNodes;
  }, [mode, reports, homeRegion]);

  const [selectedId, setSelectedId] = useState<string>(nodes[0]?.id || 'tashkent');
  const activeNode = nodes.find((n) => n.id === selectedId) || nodes[0];

  const isVelocity = mode === 'impossible-travel';

  return (
    <div className="rounded-xl border border-[#1F1F23] bg-black overflow-hidden">
      {/* Top Radar Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#18181B] bg-[#050507] px-3.5 py-2.5">
        <div className="flex items-center space-x-2">
          <Radio
            className={`h-3.5 w-3.5 animate-pulse ${
              isVelocity ? 'text-[#F59E0B]' : 'text-[#EF4444]'
            }`}
            strokeWidth={2}
          />
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-white">
            {isVelocity
              ? 'Jonli Geo-Radar • O‘zbekiston Xaritasi'
              : 'Jonli Hududiy Kontrafakt Xaritasi'}
          </span>
        </div>

        <span className="inline-flex items-center space-x-1.5 rounded-md border border-[#1F1F23] bg-black px-2 py-0.5 text-[10px] font-mono text-[#A1A1AA]">
          <span
            className={`h-1.5 w-1.5 rounded-full animate-ping ${
              isVelocity ? 'bg-[#F59E0B]' : 'bg-[#EF4444]'
            }`}
          />
          <span>{nodes.length} ta nuqta faol</span>
        </span>
      </div>

      {/* Interactive SVG Uzbekistan Map */}
      <div className="relative bg-[#030305] px-2 py-3 sm:px-4">
        <svg
          viewBox="0 0 600 375"
          className="w-full h-auto max-h-[250px] sm:max-h-[280px] select-none"
          role="img"
          aria-label="O'zbekiston jonli geo-radar xaritasi"
        >
          <defs>
            <pattern id="radarGrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path
                d="M 30 0 L 0 0 0 30"
                fill="none"
                stroke="#18181B"
                strokeWidth="0.6"
              />
            </pattern>
            <radialGradient id="uzbGlow" cx="65%" cy="55%" r="55%">
              <stop offset="0%" stopColor={isVelocity ? '#F59E0B' : '#EF4444'} stopOpacity="0.1" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Subtle Tech Radar Grid */}
          <rect width="600" height="375" fill="url(#radarGrid)" />

          {/* Concentric Radar Circles centered near central Uzbekistan */}
          <circle cx="400" cy="220" r="75" fill="none" stroke="#18181B" strokeWidth="0.75" strokeDasharray="3 4" />
          <circle cx="400" cy="220" r="145" fill="none" stroke="#18181B" strokeWidth="0.75" strokeDasharray="3 4" />
          <circle cx="400" cy="220" r="220" fill="none" stroke="#141418" strokeWidth="0.75" />

          {/* Uzbekistan Country Vector Silhouette */}
          <path
            d={UZBEKISTAN_OUTLINE_PATH}
            fill="url(#uzbGlow)"
            stroke="#3F3F46"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Faint Background Regional Hub Dots */}
          {REGION_CATALOG.map((reg) => (
            <circle
              key={`bg-${reg.id}`}
              cx={reg.x}
              cy={reg.y}
              r="1.6"
              fill="#27272A"
            />
          ))}

          {/* Impossible Travel Jump Trajectories */}
          {isVelocity && (
            <g fill="none">
              {/* Tashkent -> Samarkand (15 min impossible travel) */}
              <path
                d="M 440,194 Q 395,210 371,257"
                stroke="#F59E0B"
                strokeWidth="1.8"
                strokeDasharray="5 4"
                strokeOpacity="0.85"
              />
              {/* Samarkand -> Andijan */}
              <path
                d="M 371,257 Q 455,195 534,214"
                stroke="#EF4444"
                strokeWidth="1.6"
                strokeDasharray="4 4"
                strokeOpacity="0.75"
              />
              {/* Samarkand -> Bukhara */}
              <path
                d="M 371,257 Q 332,238 294,252"
                stroke="#F59E0B"
                strokeWidth="1.4"
                strokeDasharray="3 4"
                strokeOpacity="0.65"
              />
            </g>
          )}

          {/* Active Hotspot Nodes */}
          {nodes.map((node) => {
            const isSelected = activeNode?.id === node.id;
            const color =
              node.status === 'safe'
                ? '#10B981'
                : node.status === 'critical'
                ? '#EF4444'
                : '#F59E0B';

            return (
              <g
                key={node.id}
                className="cursor-pointer"
                onClick={() => setSelectedId(node.id)}
              >
                {/* Pulsing outer radar wave */}
                {node.status !== 'safe' && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isSelected ? 17 : 13}
                    fill={color}
                    fillOpacity="0.16"
                  >
                    <animate
                      attributeName="r"
                      values="6;18;6"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="fill-opacity"
                      values="0.32;0.04;0.32"
                      dur="2.4s"
                      repeatCount="indefinite"
                    />
                  </circle>
                )}

                {/* Selection ring */}
                {isSelected && (
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r="9.5"
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                  />
                )}

                {/* Core pin */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="4.5"
                  fill="#000000"
                  stroke={color}
                  strokeWidth="2.2"
                />

                {/* City Name & Optional Timestamp Label */}
                <text
                  x={node.x}
                  y={node.y - 12}
                  textAnchor="middle"
                  fill={isSelected ? '#FFFFFF' : '#D4D4D8'}
                  fontSize="10.5"
                  fontWeight={isSelected ? '700' : '600'}
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {node.city}
                  {node.time ? ` (${node.time})` : ''}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Interactive Telemetry Footer */}
      {activeNode && (
        <div className="border-t border-[#18181B] bg-[#050507] px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center space-x-2 min-w-0">
            {activeNode.status === 'safe' ? (
              <ShieldCheck className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
            ) : activeNode.status === 'critical' ? (
              <AlertTriangle className="h-3.5 w-3.5 text-[#EF4444] shrink-0" />
            ) : (
              <MapPin className="h-3.5 w-3.5 text-[#F59E0B] shrink-0" />
            )}
            <span className="text-zinc-200 font-mono truncate">{activeNode.detail}</span>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {nodes.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setSelectedId(n.id)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-mono border transition-colors ${
                  activeNode.id === n.id
                    ? 'border-white/40 bg-white/10 text-white'
                    : 'border-[#1F1F23] bg-black text-[#71717A] hover:text-white'
                }`}
              >
                {n.city}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
