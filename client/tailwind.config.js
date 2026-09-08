/** @type {import('tailwindcss').Config} */
// IronPilot "Bento Sport" design system: graphite + off-white surfaces, volt-lime accent, bordered cards, bold type.
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary "volt" green. 500 passes AA on white; 400 is the bright lime used on dark surfaces.
        brand: { 50: '#f3fbe6', 100: '#e5f7c6', 200: '#cdef95', 300: '#b2e45f', 400: '#9ad82f', 500: '#5a9e0c', 600: '#4c8709', 700: '#3d6b0a', 800: '#33560d', 900: '#2b4810' },
        accent: { 300: '#a7f3d0', 400: '#6ee7b7', 500: '#10b981', 600: '#059669' },
        // Neutral aliases kept for existing markup (ink = text greys, clay = light surfaces, lilac = violet)
        ink: { 900: '#18181b', 700: '#3f3f46', 500: '#71717a', 300: '#a1a1aa' },
        clay: { 50: '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7', 300: '#d4d4d8', 400: '#a1a1aa' },
        lilac: { 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed' },
        // Dark-mode graphite surfaces
        surface: { DEFAULT: '#0c0e12', 800: '#13161c', 700: '#1b1f27', 600: '#262b35' },
      },
      fontFamily: { sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        'card-lg': '0 10px 30px -12px rgba(16, 24, 40, 0.18)',
        glow: '0 8px 24px -6px rgba(90, 158, 12, 0.55)',
        // legacy names (no-ops now) so stray classes never break the build
        clay: 'none', 'clay-sm': 'none', 'clay-btn': 'none', 'clay-inset': 'none', 'clay-dark': 'none', 'clay-mint': 'none', 'clay-inset-dark': 'none',
      },
      spacing: { safe: 'env(safe-area-inset-bottom)' },
      keyframes: {
        pulseRing: { '0%': { transform: 'scale(.9)', opacity: '1' }, '100%': { transform: 'scale(1.6)', opacity: '0' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: { pulseRing: 'pulseRing 1.2s ease-out infinite', float: 'float 6s ease-in-out infinite' },
    },
  },
  plugins: [],
};
