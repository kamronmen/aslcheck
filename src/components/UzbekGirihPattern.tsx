import React from 'react';

interface UzbekGirihPatternProps {
  className?: string;
}

/**
 * Authentic 8-pointed Uzbek Girih (Sharqona me'moriy geometrik naqsh)
 * Seamlessly tiled SVG pattern with subtle oq-moviy architectural glow.
 * Opacity kept at ~0.04 - 0.06 to remain whisper-quiet yet deeply premium.
 */
export const UzbekGirihPattern: React.FC<UzbekGirihPatternProps> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none ${className}`}
    >
      {/* 1. Ambient Ethereal White-Cyan Glow Aura */}
      <div
        className="absolute left-1/2 top-0 -translate-x-1/2 w-full max-w-5xl h-[650px] opacity-70"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 15%, rgba(186, 230, 253, 0.045) 0%, rgba(255, 255, 255, 0.02) 40%, transparent 80%)',
        }}
      />

      {/* 2. Geometric Girih SVG Canvas */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.055]"
        style={{
          maskImage:
            'radial-gradient(ellipse 85% 65% at 50% 25%, black 40%, transparent 95%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 85% 65% at 50% 25%, black 40%, transparent 95%)',
        }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="uzbek-girih-pattern"
            width="160"
            height="160"
            patternUnits="userSpaceOnUse"
          >
            {/* Seamless Tiling Grid with 8-fold Uzbek Symmetry */}
            <g
              fill="none"
              stroke="#E0F2FE"
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Central 8-pointed Star (Rub el Hizb Girih Motif) */}
              {/* Outer Points (r=36) & Inner Points (r=18) */}
              <polygon
                points="
                  80,44 87,67 116,67 92,84 101,111 80,94 59,111 68,84 44,67 73,67
                "
              />
              {/* Concentric Octagonal Ring */}
              <polygon
                points="
                  80,52 100,60 108,80 100,100 80,108 60,100 52,80 60,60
                "
                strokeWidth="0.6"
                strokeDasharray="1.5 2"
              />

              {/* Radiating 45-degree & 90-degree Girih Interlace Lines */}
              <line x1="80" y1="0" x2="80" y2="44" />
              <line x1="80" y1="116" x2="80" y2="160" />
              <line x1="0" y1="80" x2="44" y2="80" />
              <line x1="116" y1="80" x2="160" y2="80" />

              <line x1="0" y1="0" x2="60" y2="60" />
              <line x1="160" y1="0" x2="100" y2="60" />
              <line x1="0" y1="160" x2="60" y2="100" />
              <line x1="160" y1="160" x2="100" y2="100" />

              {/* Outer Intersecting Rhombus Diamonds */}
              <polygon points="80,0 120,40 80,80 40,40" strokeWidth="0.5" />
              <polygon points="80,80 120,120 80,160 40,120" strokeWidth="0.5" />
              <polygon points="0,80 40,40 80,80 40,120" strokeWidth="0.5" />
              <polygon points="80,80 120,40 160,80 120,120" strokeWidth="0.5" />

              {/* Corner Star Quartiles for seamless 160x160 tiling */}
              {/* Top-Left (0,0) */}
              <path d="M 0,36 L 14,14 L 36,0 M 0,0 L 25,25" />
              {/* Top-Right (160,0) */}
              <path d="M 160,36 L 146,14 L 124,0 M 160,0 L 135,25" />
              {/* Bottom-Left (0,160) */}
              <path d="M 0,124 L 14,146 L 36,160 M 0,160 L 25,135" />
              {/* Bottom-Right (160,160) */}
              <path d="M 160,124 L 146,146 L 124,160 M 160,160 L 135,135" />

              {/* Micro Centroid Dot */}
              <circle cx="80" cy="80" r="1.5" fill="#E0F2FE" />
              <circle cx="0" cy="0" r="1.5" fill="#E0F2FE" />
              <circle cx="160" cy="0" r="1.5" fill="#E0F2FE" />
              <circle cx="0" cy="160" r="1.5" fill="#E0F2FE" />
              <circle cx="160" cy="160" r="1.5" fill="#E0F2FE" />
            </g>
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#uzbek-girih-pattern)" />
      </svg>
    </div>
  );
};
