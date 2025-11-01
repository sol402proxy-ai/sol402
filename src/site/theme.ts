export const colors = {
  background: '#0B1224',
  backgroundAlt: '#060A13',
  surface: '#101B30',
  surfaceMuted: 'rgba(16, 27, 48, 0.72)',
  border: 'rgba(244, 247, 255, 0.08)',
  textPrimary: 'rgba(244, 247, 255, 0.88)',
  textStrong: '#F4F7FF',
  textMuted: 'rgba(244, 247, 255, 0.64)',
  accentPrimary: '#0CE5FF',
  accentSecondary: '#5F6AFF',
  success: '#3BCF90',
  warning: '#F5A524',
  danger: '#FF4D67',
} as const;

export const gradients = {
  hero:
    'radial-gradient(142% 120% at 92% 12%, rgba(95,106,255,0.28), rgba(12,229,255,0.08) 46%, rgba(6,10,19,1) 100%), linear-gradient(160deg, #0B1224 0%, #060A13 55%, #030610 100%)',
  callout: 'linear-gradient(135deg, rgba(12,229,255,0.28), rgba(95,106,255,0.16))',
  divider: 'linear-gradient(90deg, rgba(12,229,255,0), rgba(12,229,255,0.32), rgba(12,229,255,0))',
} as const;

export const fonts = {
  heading: `'Space Grotesk', 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`,
  body: `'Space Grotesk', 'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif`,
  mono: `'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace`,
} as const;

export const spacing = {
  '3xs': '0.25rem',
  '2xs': '0.5rem',
  xs: '0.75rem',
  sm: '1rem',
  md: '1.5rem',
  lg: '2rem',
  xl: '3rem',
  '2xl': '4.5rem',
  '3xl': '6rem',
} as const;

export const radii = {
  sm: '12px',
  md: '18px',
  lg: '24px',
  pill: '999px',
} as const;

export const shadows = {
  soft: '0 28px 80px rgba(5, 15, 32, 0.55)',
  glowPrimary: '0 0 30px rgba(12, 229, 255, 0.45)',
  glowAccent: '0 0 34px rgba(95, 106, 255, 0.32)',
} as const;

export const breakpoints = {
  desktop: '1280px',
  tablet: '1024px',
  mobile: '768px',
} as const;

export const transitions = {
  standard: 'all 180ms cubic-bezier(0.4, 0.0, 0.2, 1)',
  elevate: 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

export const zIndex = {
  header: 20,
  modal: 40,
  overlay: 30,
} as const;

export const chart = {
  strokeWidth: 2.5,
  curve: 'catmullRom',
  gridColor: 'rgba(200, 213, 246, 0.08)',
} as const;
