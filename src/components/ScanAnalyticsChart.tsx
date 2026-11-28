import React, { useState, useMemo, useId } from 'react';
import { BarChart3 } from 'lucide-react';
import type { ScanTrendPoint } from '../types';

interface ScanAnalyticsChartProps {
  data: ScanTrendPoint[];
}

interface Point2D {
  x: number;
  y: number;
}

function buildMonotoneSplinePath(points: Point2D[], topY: number, bottomY: number): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;

  const dx: number[] = [];
  const slopes: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    const deltaX = points[i + 1].x - points[i].x || 1;
    const deltaY = points[i + 1].y - points[i].y;
    dx.push(deltaX);
    slopes.push(deltaY / deltaX);
  }

  const m: number[] = new Array(n).fill(0);
  m[0] = slopes[0];
  m[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i++) {
    const sPrev = slopes[i - 1];
    const sNext = slopes[i];
    if (sPrev * sNext <= 0) {
      m[i] = 0;
    } else {
      const avg = (sPrev + sNext) / 2;
      const limit = 2.5 * Math.min(Math.abs(sPrev), Math.abs(sNext));
      m[i] = Math.sign(avg) * Math.min(Math.abs(avg), limit);
    }
  }

  const clampY = (y: number) => Math.max(topY, Math.min(bottomY, y));

  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const segDx = dx[i] / 3;
    const cp1x = points[i].x + segDx;
    const cp1y = clampY(points[i].y + m[i] * segDx);
    const cp2x = points[i + 1].x - segDx;
    const cp2y = clampY(points[i + 1].y - m[i + 1] * segDx);
    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${points[i + 1].x.toFixed(1)} ${points[i + 1].y.toFixed(1)}`;
  }

  return path;
}

export const ScanAnalyticsChart: React.FC<ScanAnalyticsChartProps> = ({ data }) => {
  const uid = useId().replace(/:/g, '');
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const width = 560;
  const height = 200;
  const padLeft = 36;
  const padRight = 20;
  const topY = 26;
  const bottomY = 166;
  const plotW = width - padLeft - padRight;
  const plotH = bottomY - topY;

  const {
    niceMax,
    midTick,
    scanPoints,
    reportPoints,
    scanLinePath,
    scanAreaPath,
    reportLinePath,
    reportAreaPath,
    hasReports,
    totalScans,
    totalReports,
  } = useMemo(() => {
    const safeData = data.length > 0 ? data : [];
    const rawMax = Math.max(1, ...safeData.map((d) => Math.max(d.scans, d.reports)));
    const computedNiceMax = rawMax <= 2 ? 2 : Math.ceil(rawMax / 2) * 2;
    const computedMid = computedNiceMax / 2;

    const n = safeData.length;
    const mapY = (val: number) => bottomY - (val / computedNiceMax) * plotH;

    const sPts: Point2D[] = safeData.map((d, idx) => ({
      x: n > 1 ? padLeft + (idx / (n - 1)) * plotW : padLeft + plotW / 2,
      y: mapY(d.scans),
    }));

    const rPts: Point2D[] = safeData.map((d, idx) => ({
      x: n > 1 ? padLeft + (idx / (n - 1)) * plotW : padLeft + plotW / 2,
      y: mapY(d.reports),
    }));

    const sLine = buildMonotoneSplinePath(sPts, topY, bottomY);
    const sArea =
      sPts.length > 0
        ? `${sLine} L ${sPts[sPts.length - 1].x.toFixed(1)} ${bottomY} L ${sPts[0].x.toFixed(1)} ${bottomY} Z`
        : '';

    const rLine = buildMonotoneSplinePath(rPts, topY, bottomY);
    const rArea =
      rPts.length > 0
        ? `${rLine} L ${rPts[rPts.length - 1].x.toFixed(1)} ${bottomY} L ${rPts[0].x.toFixed(1)} ${bottomY} Z`
        : '';

    return {
      niceMax: computedNiceMax,
      midTick: computedMid,
      scanPoints: sPts,
      reportPoints: rPts,
      scanLinePath: sLine,
      scanAreaPath: sArea,
      reportLinePath: rLine,
      reportAreaPath: rArea,
      hasReports: safeData.some((d) => d.reports > 0),
      totalScans: safeData.reduce((acc, d) => acc + d.scans, 0),
      totalReports: safeData.reduce((acc, d) => acc + d.reports, 0),
    };
  }, [data, plotH, plotW]);

  const totalActivity = totalScans + totalReports;
  const activePoint = activeIndex !== null ? data[activeIndex] : null;
  const activeX = activeIndex !== null ? scanPoints[activeIndex]?.x ?? null : null;

  // Percentage horizontal position for floating pill tooltip (clamped so it stays inside card)
  const tooltipLeftPct =
    activeX !== null ? Math.max(18, Math.min(82, (activeX / width) * 100)) : 50;

  return (
    <div className="relative rounded-2xl border border-[#1F1F23] border-t-white/[0.08] bg-[#0A0A0C] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.7)] overflow-hidden">
      {/* Subtle Header Accent */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md border border-[#1F1F23] bg-black">
            <BarChart3 className="h-3.5 w-3.5 text-zinc-300" strokeWidth={1.75} />
          </div>
          <h2 className="text-xs font-semibold tracking-tight text-white">
            7-Kunlik Skanerlash Faolligi
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#71717A]">
          <span className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            <span>Tekshiruv</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-[#EF4444]" />
            <span>Shikoyat</span>
          </span>
          <span className="rounded-md border border-[#1F1F23] bg-black px-2 py-0.5 text-zinc-300 tabular-nums">
            Jami: {totalActivity}
          </span>
        </div>
      </div>

      {/* Interactive SVG Area Spline Chart */}
      <div
        className="relative w-full"
        onMouseLeave={() => setActiveIndex(null)}
      >
        {/* Floating Pill Tooltip */}
        {activePoint && activeIndex !== null && (
          <div
            style={{ left: `${tooltipLeftPct}%` }}
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-full border border-white/15 bg-[#0F0F0F]/95 px-3 py-1 text-[11px] font-mono text-[#FAFAFA] shadow-xl backdrop-blur-md whitespace-nowrap animate-in fade-in duration-150"
          >
            <span className="text-[#A0A0A0]">{activePoint.label}:</span>{' '}
            <span className="font-semibold text-[#10B981] tabular-nums">
              {activePoint.scans} tekshiruv
            </span>
            <span className="mx-1.5 text-[#525252]">•</span>
            <span
              className={`font-semibold tabular-nums ${
                activePoint.reports > 0 ? 'text-[#EF4444]' : 'text-[#737373]'
              }`}
            >
              {activePoint.reports} shikoyat
            </span>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto select-none overflow-visible"
          role="img"
          aria-label="7-kunlik skanerlash faolligi grafigi"
        >
          <defs>
            {/* Emerald Vertical Area Gradient */}
            <linearGradient id={`emeraldGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.28" />
              <stop offset="75%" stopColor="#10B981" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>

            {/* Crimson Vertical Area Gradient */}
            <linearGradient id={`crimsonGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.24" />
              <stop offset="85%" stopColor="#EF4444" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
            </linearGradient>

            {/* Subtle Emerald Glow Filter for Active Node */}
            <filter id={`nodeGlow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 3 Horizontal Dashed Precision Gridlines & Y-Axis Ticks */}
          {[
            { y: topY, label: niceMax },
            { y: topY + plotH / 2, label: midTick },
            { y: bottomY, label: 0 },
          ].map((grid, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={grid.y}
                x2={width - padRight}
                y2={grid.y}
                stroke="#222222"
                strokeWidth="1"
                strokeDasharray={i === 2 ? undefined : '3 3'}
              />
              <text
                x={padLeft - 8}
                y={grid.y + 3.5}
                textAnchor="end"
                fill="#525252"
                fontSize="10"
                fontFamily="'JetBrains Mono', monospace"
              >
                {grid.label}
              </text>
            </g>
          ))}

          {/* Crimson Area + Spline (Shikoyatlar) */}
          {hasReports && reportAreaPath && (
            <path d={reportAreaPath} fill={`url(#crimsonGrad-${uid})`} />
          )}
          {reportLinePath && (
            <path
              d={reportLinePath}
              fill="none"
              stroke="#EF4444"
              strokeWidth="1.75"
              strokeOpacity={hasReports ? 0.95 : 0.22}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Emerald Area + Spline (Tekshiruvlar) */}
          {scanAreaPath && (
            <path d={scanAreaPath} fill={`url(#emeraldGrad-${uid})`} />
          )}
          {scanLinePath && (
            <path
              d={scanLinePath}
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Vertical Crosshair Line for Active Node */}
          {activeX !== null && (
            <line
              x1={activeX}
              y1={topY - 4}
              x2={activeX}
              y2={bottomY}
              stroke="#383838"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
          )}

          {/* Data Nodes & X-Axis Labels */}
          {data.map((point, idx) => {
            const sPt = scanPoints[idx];
            const rPt = reportPoints[idx];
            if (!sPt) return null;
            const isActive = activeIndex === idx;
            const colWidth = data.length > 1 ? plotW / (data.length - 1) : plotW;

            return (
              <g key={point.date}>
                {/* Report Node (shown when > 0 or active with reports) */}
                {rPt && (point.reports > 0 || (isActive && hasReports)) && (
                  <circle
                    cx={rPt.x}
                    cy={rPt.y}
                    r={isActive ? 4.5 : 3}
                    fill="#000000"
                    stroke="#EF4444"
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                )}

                {/* Active Halo */}
                {isActive && (
                  <circle
                    cx={sPt.x}
                    cy={sPt.y}
                    r={7}
                    fill="#10B981"
                    fillOpacity="0.18"
                  />
                )}

                {/* Scan Data Node */}
                <circle
                  cx={sPt.x}
                  cy={sPt.y}
                  r={isActive ? 4.5 : 3.5}
                  fill="#000000"
                  stroke="#10B981"
                  strokeWidth={2}
                  filter={isActive || point.scans > 0 ? `url(#nodeGlow-${uid})` : undefined}
                />

                {/* X-Axis Date Label */}
                <text
                  x={sPt.x}
                  y={bottomY + 20}
                  textAnchor="middle"
                  fill={isActive ? '#FAFAFA' : '#525252'}
                  fontSize="10"
                  fontWeight={isActive ? '600' : '400'}
                  fontFamily="'JetBrains Mono', monospace"
                >
                  {point.label}
                </text>

                {/* Invisible Interactive Hit Column (Desktop Hover + Mobile Tap) */}
                <rect
                  x={sPt.x - colWidth / 2}
                  y={topY - 8}
                  width={colWidth}
                  height={plotH + 34}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => setActiveIndex((prev) => (prev === idx ? null : idx))}
                />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
