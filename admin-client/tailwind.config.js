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
        // ── Primary brand: Indigo (#4F46E5) ──
        primary: {
          DEFAULT: '#4F46E5',
          deep:    '#3730A3',
          hover:   '#3730A3',
          pale:    '#E0E7FF',
          50:      '#EEF2FF',
          100:     '#E0E7FF',
          200:     '#C7D2FE',
          300:     '#A5B4FC',
          400:     '#818CF8',
          500:     '#6366F1',
          600:     '#4F46E5',
          700:     '#4338CA',
          800:     '#3730A3',
          900:     '#312E81',
        },
        'on-primary': '#FFFFFF',
        'primary-deep': '#3730A3',
        'primary-pale': '#E0E7FF',
        'primary-container': '#3730A3',
        'on-primary-container': '#E0E7FF',

        // ── Accent / secondary brand: Rose (#E11D48) ──
        accent: {
          DEFAULT: '#E11D48',
          hover:   '#BE123C',
          dark:    '#BE123C',
          pale:    '#FFE4E6',
          50:      '#FFF1F2',
          100:     '#FFE4E6',
          200:     '#FECDD3',
          300:     '#FDA4AF',
          400:     '#FB7185',
          500:     '#F43F5E',
          600:     '#E11D48',
          700:     '#BE123C',
          800:     '#9F1239',
          900:     '#881337',
        },
        'accent-hover': '#BE123C',
        secondary: '#E11D48',
        'on-secondary': '#FFFFFF',

        // ── Canvas, surfaces & borders ──
        'surface-canvas': '#F7F8FC',
        'surface-card':   '#FFFFFF',
        'border-subtle':  '#E4E7F2',
        'border-strong':  '#CBD5E1',

        // ── Typography scale colors ──
        'text-primary':   '#0F172A',
        'text-secondary': '#475569',
        'text-muted':     '#94A3B8',

        // ── Semantic status tokens (untouched) ──
        'status-draft':    '#64748B',
        'status-pending':  '#D97706',
        'status-review':   '#7C3AED',
        'status-approved': '#059669',
        'status-rejected': '#E11D48',
        'status-changes':  '#EA580C',

        // ── Semantic aliases & backwards compatibility ──
        elite: {
          white:     '#FFFFFF',
          offwhite:  '#F7F8FC',
          red:       '#E11D48',   // Rose accent
          darkred:   '#BE123C',   // Rose hover
          black:     '#0F172A',
          darkgray:  '#475569',
          lightgray: '#E4E7F2',
          border:    '#E4E7F2',
          muted:     '#94A3B8',
          navy:      '#312E81',
          crimson:   '#E11D48',
          indigo:    '#4F46E5',
          rose:      '#E11D48',
        },
      },

      // ── Typography: Sora (Headings) + Plus Jakarta Sans (Body/UI) ──
      fontFamily: {
        sans:           ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        heading:        ['Sora', 'system-ui', 'sans-serif'],
        display:        ['Sora', 'system-ui', 'sans-serif'],
        'label-lg':     ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        'label-md':     ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        'label-sm':     ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        'headline-xl':  ['Sora', 'system-ui', 'sans-serif'],
        'headline-lg':  ['Sora', 'system-ui', 'sans-serif'],
        'headline-md':  ['Sora', 'system-ui', 'sans-serif'],
        'headline-sm':  ['Sora', 'system-ui', 'sans-serif'],
        'body-lg':      ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        'body-md':      ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        'body-sm':      ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        'data-mono':    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
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

      // ── Border radius — rounded-but-not-bubbly (6–12px range, cards 8px) ──
      borderRadius: {
        DEFAULT: '6px',
        sm:      '4px',
        md:      '6px',
        lg:      '8px',     // Standard card radius
        xl:      '12px',    // Larger containers / modals
        '2xl':   '14px',
        full:    '9999px',  // Pills and avatars
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
