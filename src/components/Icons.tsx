import React from 'react';
import {
  ShieldCheck,
  BrainCircuit,
  ScanLine,
  BadgeCheck,
  AlertTriangle,
  LayoutGrid,
  ShieldAlert,
} from 'lucide-react';

export interface ExecutiveIconProps {
  className?: string;
  strokeWidth?: number;
}

export const AslBrandMark: React.FC<ExecutiveIconProps> = ({
  className = 'w-5 h-5',
  strokeWidth = 1.75,
}) => <ShieldCheck className={className} strokeWidth={strokeWidth} aria-hidden="true" />;

export const AiCoreIcon: React.FC<ExecutiveIconProps> = ({
  className = 'w-4 h-4',
  strokeWidth = 1.75,
}) => <BrainCircuit className={className} strokeWidth={strokeWidth} aria-hidden="true" />;

export const VisionLensIcon: React.FC<ExecutiveIconProps> = ({
  className = 'w-4 h-4',
  strokeWidth = 1.75,
}) => <ScanLine className={className} strokeWidth={strokeWidth} aria-hidden="true" />;

export const VerifiedSealIcon: React.FC<ExecutiveIconProps> = ({
  className = 'w-4 h-4',
  strokeWidth = 1.75,
}) => <BadgeCheck className={className} strokeWidth={strokeWidth} aria-hidden="true" />;

export const CloneAlertIcon: React.FC<ExecutiveIconProps> = ({
  className = 'w-4 h-4',
  strokeWidth = 1.75,
}) => <AlertTriangle className={className} strokeWidth={strokeWidth} aria-hidden="true" />;

export const BatchGridIcon: React.FC<ExecutiveIconProps> = ({
  className = 'w-4 h-4',
  strokeWidth = 1.75,
}) => <LayoutGrid className={className} strokeWidth={strokeWidth} aria-hidden="true" />;

export const ShieldRadarIcon: React.FC<ExecutiveIconProps> = ({
  className = 'w-4 h-4',
  strokeWidth = 1.75,
}) => <ShieldAlert className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
