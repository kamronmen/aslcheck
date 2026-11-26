import React from 'react';

export interface ExecutiveIconProps {
  className?: string;
  strokeWidth?: number;
}

/**
 * Precision geometric double-hex shield with internal cryptographic check-vector.
 */
export const AslBrandMark: React.FC<ExecutiveIconProps> = ({
  className = 'h-5 w-5',
  strokeWidth = 1.5,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 2L20.5 6.8V17.2L12 22L3.5 17.2V6.8L12 2Z" />
    <path d="M12 5.2L17.6 8.4V15.6L12 18.8L6.4 15.6V8.4L12 5.2Z" strokeOpacity="0.45" />
    <path d="M9 12.2L11.1 14.3L15.3 9.7" />
  </svg>
);

/**
 * Minimalist optical neural reticle: concentric broken precision ring + central telemetry diamond + 4 cardinal calibration ticks.
 */
export const AiCoreIcon: React.FC<ExecutiveIconProps> = ({
  className = 'h-4 w-4',
  strokeWidth = 1.5,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Concentric broken arcs */}
    <path d="M12 4.5A7.5 7.5 0 0 1 19.5 12" />
    <path d="M19.5 12A7.5 7.5 0 0 1 12 19.5" strokeOpacity="0.45" />
    <path d="M12 19.5A7.5 7.5 0 0 1 4.5 12" />
    <path d="M4.5 12A7.5 7.5 0 0 1 12 4.5" strokeOpacity="0.45" />
    {/* 4 cardinal calibration ticks */}
    <line x1="12" y1="2" x2="12" y2="4.5" />
    <line x1="12" y1="19.5" x2="12" y2="22" />
    <line x1="2" y1="12" x2="4.5" y2="12" />
    <line x1="19.5" y1="12" x2="22" y2="12" />
    {/* Central telemetry diamond */}
    <polygon points="12,8.5 15.5,12 12,15.5 8.5,12" />
    <circle cx="12" cy="12" r="0.75" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * Sleek optical forensic camera frame with corner viewfinders and crosshair aperture.
 */
export const VisionLensIcon: React.FC<ExecutiveIconProps> = ({
  className = 'h-4 w-4',
  strokeWidth = 1.5,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Precision corner brackets */}
    <path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8" />
    <path d="M16 4H18.5A1.5 1.5 0 0 1 20 5.5V8" />
    <path d="M20 16V18.5A1.5 1.5 0 0 1 18.5 20H16" />
    <path d="M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" />
    {/* Optical lens aperture & crosshair */}
    <circle cx="12" cy="12" r="4.25" />
    <line x1="12" y1="6.5" x2="12" y2="9" />
    <line x1="12" y1="15" x2="12" y2="17.5" />
    <line x1="6.5" y1="12" x2="9" y2="12" />
    <line x1="15" y1="12" x2="17.5" y2="12" />
    <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * Official multi-ring cryptographic authenticity stamp.
 */
export const VerifiedSealIcon: React.FC<ExecutiveIconProps> = ({
  className = 'h-4 w-4',
  strokeWidth = 1.5,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Faceted octagonal cryptographic perimeter */}
    <polygon points="12,2.2 16.5,3.7 20.3,7.5 21.8,12 20.3,16.5 16.5,20.3 12,21.8 7.5,20.3 3.7,16.5 2.2,12 3.7,7.5 7.5,3.7" />
    <circle cx="12" cy="12" r="6.5" strokeOpacity="0.45" />
    <path d="M9.2 12.2L11.1 14.1L15 9.9" />
  </svg>
);

/**
 * Sharp geometric split-layer warning icon symbolizing duplicated/cloned codes.
 */
export const CloneAlertIcon: React.FC<ExecutiveIconProps> = ({
  className = 'h-4 w-4',
  strokeWidth = 1.5,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {/* Offset duplicated layer behind */}
    <path d="M8 6.5V4.5A1.5 1.5 0 0 1 9.5 3H19.5A1.5 1.5 0 0 1 21 4.5V14.5A1.5 1.5 0 0 1 19.5 16H17.5" strokeOpacity="0.5" />
    {/* Foreground primary layer with alert vector */}
    <rect x="3" y="8" width="13" height="13" rx="1.5" />
    <line x1="9.5" y1="11.5" x2="9.5" y2="15" />
    <circle cx="9.5" cy="17.5" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * Precision 2x2 QR matrix emblem for batch generation.
 */
export const BatchGridIcon: React.FC<ExecutiveIconProps> = ({
  className = 'h-4 w-4',
  strokeWidth = 1.5,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
    <path d="M13.5 13.5H16.5V16.5H13.5V13.5Z" />
    <path d="M17.5 17.5H20.5V20.5" />
    <line x1="20.5" y1="13.5" x2="20.5" y2="15" />
    <line x1="13.5" y1="20.5" x2="15" y2="20.5" />
  </svg>
);

/**
 * Minimalist radar arc icon for counterfeit reports monitoring.
 */
export const ShieldRadarIcon: React.FC<ExecutiveIconProps> = ({
  className = 'h-4 w-4',
  strokeWidth = 1.5,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9.5" strokeOpacity="0.35" />
    <path d="M12 2.5A9.5 9.5 0 0 1 21.5 12" />
    <circle cx="12" cy="12" r="5.25" strokeOpacity="0.55" />
    <line x1="12" y1="12" x2="17.8" y2="6.2" />
    <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);
