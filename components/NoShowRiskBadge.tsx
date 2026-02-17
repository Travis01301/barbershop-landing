'use client';

import React from 'react';

export interface NoShowRiskBadgeProps {
  riskScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showScore?: boolean;
}

/**
 * NoShowRiskBadge Component
 *
 * Displays the no-show risk level for an appointment with color coding and optional score.
 *
 * Example:
 * <NoShowRiskBadge riskScore={75} riskLevel="high" showScore />
 */
export const NoShowRiskBadge: React.FC<NoShowRiskBadgeProps> = ({
  riskScore,
  riskLevel,
  size = 'md',
  showLabel = true,
  showScore = true,
}) => {
  // Color mapping based on risk level
  const colorMap = {
    low: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      badge: 'bg-green-100',
      icon: '✓',
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      badge: 'bg-yellow-100',
      icon: '⚠',
    },
    high: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-100',
      icon: '⚠',
    },
  };

  const sizeMap = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base',
  };

  const colors = colorMap[riskLevel];
  const sizeClass = sizeMap[size];

  const label = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk - Alert!',
  }[riskLevel];

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg border ${colors.border} ${colors.bg} ${sizeClass} ${colors.text}`}
    >
      <span className={`${colors.badge} rounded px-2 py-0.5 font-medium`}>
        {colors.icon}
      </span>

      <div className="flex flex-col gap-0">
        {showLabel && <span className="font-semibold">{label}</span>}
        {showScore && <span className="text-xs opacity-75">{riskScore}% risk</span>}
      </div>
    </div>
  );
};

export default NoShowRiskBadge;
