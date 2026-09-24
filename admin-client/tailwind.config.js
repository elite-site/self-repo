/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // ── ELITE Academic Portal Design System ────────────────────────────
      // Source: assests/stitch_multi_page_branded_website/elite_academic_portal_design_system/DESIGN.md
      colors: {
        // ── Material design surface scale ──
        surface:                    '#f8f9ff',
        'surface-dim':              '#cbdbf5',
        'surface-bright':           '#f8f9ff',
        'surface-container-lowest': '#ffffff',
        'surface-container-low':    '#eff4ff',
        'surface-container':        '#e5eeff',
        'surface-container-high':   '#dce9ff',
        'surface-container-highest':'#d3e4fe',
        'on-surface':               '#0b1c30',
        'on-surface-variant':       '#44474c',
        'inverse-surface':          '#213145',
        'inverse-on-surface':       '#eaf1ff',
        'surface-variant':          '#d3e4fe',

        // ── Primary (deep midnight navy) ──
        primary:              '#000000',
        'on-primary':         '#ffffff',
        'primary-container':  '#0e1c2f',
        'on-primary-container': '#77849c',
        'inverse-primary':    '#bac7e1',
        'primary-fixed':      '#d6e3fe',
        'primary-fixed-dim':  '#bac7e1',
        'on-primary-fixed':   '#0e1c2f',
        'on-primary-fixed-variant': '#3a475c',

        // ── Secondary (crimson red) ──
        secondary:              '#bb0112',
        'on-secondary':         '#ffffff',
        'secondary-container':  '#e02928',
        'on-secondary-container': '#fffbff',
        'secondary-fixed':      '#ffdad6',
        'secondary-fixed-dim':  '#ffb4ab',
        'on-secondary-fixed':   '#410002',
        'on-secondary-fixed-variant': '#93000b',

        // ── Tertiary ──
        tertiary:              '#000000',
        'on-tertiary':         '#ffffff',
        'tertiary-container':  '#00174b',
        'on-tertiary-container': '#497cff',
        'tertiary-fixed':      '#dbe1ff',
        'tertiary-fixed-dim':  '#b4c5ff',
        'on-tertiary-fixed':   '#00174b',
        'on-tertiary-fixed-variant': '#003ea8',

        // ── Error ──
        error:              '#ba1a1a',
        'on-error':         '#ffffff',
        'error-container':  '#ffdad6',
        'on-error-container': '#93000a',

        // ── Outline / border ──
        outline:          '#75777d',
        'outline-variant': '#c5c6cd',
        'surface-tint':   '#525f75',

        // ── Semantic canvas & text ──
        'surface-canvas': '#F8FAFC',
        'surface-card':   '#FFFFFF',
        'border-subtle':  '#E2E8F0',
        'border-strong':  '#CBD5E1',
        'text-primary':   '#0F172A',
        'text-secondary': '#475569',
        'text-muted':     '#94A3B8',

        // ── Semantic status tokens (icon + text, never color alone) ──
        'status-draft':    '#64748B',
        'status-pending':  '#D97706',
        'status-review':   '#7C3AED',
        'status-approved': '#059669',
        'status-rejected': '#DC2626',
        'status-changes':  '#EA580C',

        // ── Legacy `elite.*` aliases — keep so existing components don't break ──
        elite: {
          white:     '#FFFFFF',
          offwhite:  '#FAFAFA',
          red:       '#DC2626',
          darkred:   '#B5121B',
          black:     '#0B192C',
          darkgray:  '#475569',
          lightgray: '#E2E8F0',
          border:    '#E2E8F0',
          muted:     '#94A3B8',
          navy:      '#0B192C',
          crimson:   '#DC2626',
        },
      },

      // ── Typography — Inter scale from DESIGN.md ──
      fontFamily: {
        sans:           ['Inter', 'system-ui', 'sans-serif'],
        display:        ['Inter', 'system-ui', 'sans-serif'],
        'label-lg':     ['Inter', 'system-ui', 'sans-serif'],
        'label-md':     ['Inter', 'system-ui', 'sans-serif'],
        'label-sm':     ['Inter', 'system-ui', 'sans-serif'],
        'headline-xl':  ['Inter', 'system-ui', 'sans-serif'],
        'headline-lg':  ['Inter', 'system-ui', 'sans-serif'],
        'headline-md':  ['Inter', 'system-ui', 'sans-serif'],
        'headline-sm':  ['Inter', 'system-ui', 'sans-serif'],
        'body-lg':      ['Inter', 'system-ui', 'sans-serif'],
        'body-md':      ['Inter', 'system-ui', 'sans-serif'],
        'body-sm':      ['Inter', 'system-ui', 'sans-serif'],
        'data-mono':    ['Inter', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        'headline-xl': ['36px', { lineHeight: '44px', letterSpacing: '-0.025em', fontWeight: '700' }],
        'headline-xl-mobile': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '700' }],
        'headline-lg': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg-mobile': ['22px', { lineHeight: '30px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-md': ['20px', { lineHeight: '28px', letterSpacing: '-0.015em', fontWeight: '600' }],
        'headline-sm': ['16px', { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body-lg':     ['16px', { lineHeight: '26px', fontWeight: '400' }],
        'body-md':     ['14px', { lineHeight: '22px', fontWeight: '400' }],
        'body-sm':     ['13px', { lineHeight: '20px', fontWeight: '400' }],
        'label-lg':    ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'label-md':    ['12px', { lineHeight: '16px', letterSpacing: '0.01em', fontWeight: '500' }],
        'label-sm':    ['11px', { lineHeight: '14px', letterSpacing: '0.04em', fontWeight: '600' }],
        'data-mono':   ['13px', { lineHeight: '18px', fontWeight: '400' }],
      },

      borderRadius: {
        DEFAULT: '0.25rem',
        sm:      '0.125rem',
        md:      '0.375rem',
        lg:      '0.5rem',
        xl:      '0.75rem',
        full:    '9999px',
      },

      spacing: {
        'space-xs': '0.25rem',
        'space-sm': '0.5rem',
        'space-md': '1rem',
        'space-lg': '1.5rem',
        'space-xl': '2rem',
        'gutter':          '1.5rem',
        'gutter-mobile':   '1rem',
        'margin':          '2rem',
        'margin-mobile':   '1rem',
      },

      boxShadow: {
        card:    '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        'card-hover': '0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
        drawer:  '0 20px 25px -5px rgba(15, 23, 42, 0.1)',
        modal:   '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
      },

      maxWidth: {
        canvas: '1440px',
      },
    },
  },
  plugins: [],
}
