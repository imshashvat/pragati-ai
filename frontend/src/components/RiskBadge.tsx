// src/components/RiskBadge.tsx
// IBM Carbon semantic risk badge — restrained, precise

import React from 'react'

export type Severity = 'low' | 'med' | 'high' | 'crit'

export function riskToSeverity(risk: number): Severity {
  if (risk >= 0.80) return 'crit'
  if (risk >= 0.65) return 'high'
  if (risk >= 0.50) return 'med'
  return 'low'
}

const LABELS: Record<Severity, string> = {
  low:  'Low Risk',
  med:  'Moderate',
  high: 'High Risk',
  crit: 'Critical',
}

interface Props {
  risk?: number | null
  severity?: Severity
  size?: 'sm' | 'md'
  showValue?: boolean
  label?: string
}

export default function RiskBadge({ risk, severity: sev, size = 'md', showValue = false, label }: Props) {
  const severity = sev ?? (risk != null ? riskToSeverity(risk) : 'low')
  const displayLabel = label ?? LABELS[severity]

  const sizeClass = size === 'sm'
    ? 'text-[10px] px-1.5 py-0.5'
    : 'text-[11px] px-2 py-1'

  return (
    <span
      className={`badge badge-${severity} ${sizeClass}`}
      aria-label={displayLabel}
    >
      {displayLabel}
      {showValue && risk != null && (
        <span className="ml-1 opacity-60">
          {(risk * 100).toFixed(0)}%
        </span>
      )}
    </span>
  )
}

// Severity indicator bar — for table rows (not a badge)
export function SeverityBar({ severity }: { severity: Severity }) {
  return <span className={`sev-bar sev-bar-${severity}`} aria-hidden="true" />
}
