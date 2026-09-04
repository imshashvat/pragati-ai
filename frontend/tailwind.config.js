/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Canvas surfaces ───────────────────────────────────────────────
        canvas:   '#FFFFFF',
        surface:  '#F7F8FA',
        'surface-alt': '#F3F5F7',

        // ── Structural borders ────────────────────────────────────────────
        border:     '#E0E4E8',
        'border-strong': '#C1C7CD',

        // ── Brand: IBM institutional blue — interactions only ─────────────
        blue: {
          DEFAULT:  '#0F62FE',
          hover:    '#0050E6',
          light:    '#EDF5FF',
          'light-hover': '#D0E2FF',
        },

        // ── Deep institutional navy — logo, headings, authority ───────────
        navy: {
          DEFAULT:  '#102A43',
          dark:     '#0B1F33',
          mid:      '#1C3D5A',
        },

        // ── Text hierarchy ─────────────────────────────────────────────────
        ink: {
          DEFAULT:   '#161616',   // primary
          secondary: '#525252',   // secondary
          muted:     '#697077',   // muted
          subtle:    '#8D8D8D',   // metadata
          disabled:  '#A8A8A8',
        },

        // ── Semantic risk — IBM palette ─────────────────────────────────
        risk: {
          // Low / Healthy
          'low-bg':     '#DEFBE6',
          'low-text':   '#198038',
          'low-border': '#A7F0BA',
          // Watch / Moderate
          'med-bg':     '#FEF9E5',
          'med-text':   '#8E6A00',
          'med-border': '#F1C21B',
          // High
          'high-bg':    '#FFF1E8',
          'high-text':  '#B45309',
          'high-border':'#FF832B',
          // Critical
          'crit-bg':    '#FFF0F1',
          'crit-text':  '#DA1E28',
          'crit-border':'#FF8389',
          // Info
          'info-bg':    '#EDF5FF',
          'info-text':  '#0F62FE',
          'info-border':'#A6C8FF',
        },

        // ── Provenance / data source ──────────────────────────────────────
        teal: {
          DEFAULT:   '#007D79',
          light:     '#E5F6F6',
          border:    '#9EF0F0',
        },
      },

      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
        mono: ['"IBM Plex Mono"', '"Fira Code"', 'monospace'],
      },

      fontSize: {
        // Precision type scale
        '2xs':  ['11px', { lineHeight: '16px' }],
        xs:     ['12px', { lineHeight: '16px' }],
        sm:     ['13px', { lineHeight: '20px' }],
        base:   ['14px', { lineHeight: '20px' }],
        md:     ['15px', { lineHeight: '24px' }],
        lg:     ['16px', { lineHeight: '24px' }],
        xl:     ['18px', { lineHeight: '28px' }],
        '2xl':  ['20px', { lineHeight: '28px', letterSpacing: '-0.01em' }],
        '3xl':  ['24px', { lineHeight: '32px', letterSpacing: '-0.015em' }],
        '4xl':  ['28px', { lineHeight: '36px', letterSpacing: '-0.015em' }],
        '5xl':  ['32px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
        'hero': ['40px', { lineHeight: '48px', letterSpacing: '-0.025em' }],
      },

      spacing: {
        '0':  '0px',
        '1':  '4px',
        '2':  '8px',
        '3':  '12px',
        '4':  '16px',
        '5':  '20px',
        '6':  '24px',
        '7':  '28px',
        '8':  '32px',
        '9':  '36px',
        '10': '40px',
        '11': '44px',
        '12': '48px',
        '14': '56px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
        // Sidebar
        'sidebar': '256px',
        'topbar':  '64px',
      },

      borderRadius: {
        'none': '0',
        'sm':   '4px',
        DEFAULT:'6px',
        'md':   '8px',
        'lg':   '12px',
        'pill': '999px',
      },

      boxShadow: {
        // Only used for overlays — no decorative shadows
        'overlay': '0 4px 16px rgba(0,0,0,0.06)',
        'dropdown': '0 2px 8px rgba(0,0,0,0.08)',
        'none': 'none',
      },

      transitionDuration: {
        'fast':  '150ms',
        'base':  '200ms',
        'slow':  '300ms',
      },

      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      maxWidth: {
        'content': '1400px',
      },

      zIndex: {
        'sidebar':   '40',
        'topbar':    '30',
        'overlay':   '50',
        'dropdown':  '60',
        'modal':     '70',
        'toast':     '80',
      },
    },
  },
  plugins: [],
}
