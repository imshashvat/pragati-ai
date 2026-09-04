// src/theme/tokens.ts
// ───────────────────
// Design tokens from Section 22 of the guide.
// Import these constants everywhere — never hardcode colors in components.

export const colors = {
  // Base surfaces
  surface: '#F7F7F5',       // warm off-white page background
  card: '#FFFFFF',          // card background
  border: '#D9D7CE',        // hairline border (warm gray)

  // Institutional accent — navigation, primary actions, headers
  navy: {
    DEFAULT: '#0C447C',
    dark: '#042C53',
    light: '#1A5C9E',
  },

  // Risk semantics — ONLY used for risk state, never decoratively
  risk: {
    low: {
      bg: '#EEF5E7',
      text: '#3B6D11',
      border: '#BDDBA0',
    },
    medium: {
      bg: '#FDF3E3',
      text: '#854F0B',
      border: '#F5C987',
    },
    high: {
      bg: '#F9E9E9',
      text: '#791F1F',
      border: '#E9AAAA',
    },
    critical: {
      bg: '#F2DADA',
      text: '#A32D2D',
      border: '#D97878',
    },
  },

  // Provenance accent — ONLY for live/demo/sync badges
  teal: {
    DEFAULT: '#0F6E56',
    bg: '#E2F3EF',
    border: '#8DD1C0',
  },

  // Text
  text: {
    primary: '#2C2C2A',   // near-black, not pure black
    secondary: '#5F5E5A', // warm gray
    disabled: '#A09E99',
    inverse: '#FFFFFF',
  },
} as const;

export const spacing = {
  '0': '0px',
  '1': '4px',
  '2': '8px',
  '3': '12px',
  '4': '16px',
  '6': '24px',
  '8': '32px',
  '10': '40px',
  '12': '48px',
  '16': '64px',
} as const;

export const radius = {
  card: '12px',
  badge: '4px',
  button: '6px',
  input: '6px',
} as const;

export const typography = {
  // Section 22: Inter or IBM Plex Sans, two weights only
  fontFamily: "'Inter', 'IBM Plex Sans', system-ui, sans-serif",
  fontWeightRegular: '400',
  fontWeightMedium: '500',
  // Tabular figures for numeric columns (aligns digits vertically)
  fontVariantNumeric: 'tabular-nums',
} as const;

export const animation = {
  // Panel transitions: 180ms max per Section 22
  panel: '180ms ease-in-out',
  // Alert badge pulse: single, non-looping
  pulse: 'pulse-once 600ms ease-out forwards',
} as const;

// Severity → risk color token map (for RiskBadge and similar)
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export function severityColors(sev: Severity) {
  return colors.risk[sev];
}

// overall_risk float → severity string
export function riskToSeverity(risk: number): Severity {
  if (risk >= 0.80) return 'critical';
  if (risk >= 0.65) return 'high';
  if (risk >= 0.50) return 'medium';
  return 'low';
}

// Severity → human label
export const severityLabel: Record<Severity, string> = {
  low: 'Low',
  medium: 'Watch',
  high: 'High',
  critical: 'Critical',
};
