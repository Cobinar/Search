/**
 * Ported 1:1 from webmail/index.html's :root custom properties, so the
 * mobile app reads as the same product rather than a re-skin. React
 * Native has no box-shadow, so the neobrutalist "hard offset shadow" is
 * rebuilt from a solid-color View positioned behind each surface — see
 * <HardShadow> in components/Surface.tsx.
 */
export const colors = {
  paper: '#EFEDE6',
  bg: '#FFFFFF',
  unread: '#FFF6EC',

  ink: '#16171C',
  text: '#16171C',
  muted: '#565A63',
  faint: '#93969E',

  orange: '#F97316',
  orangeDark: '#EA6C09',
  orangeTint: '#FFF1E3',

  green: '#16A34A',
  red: '#DC2626',
  blue: '#2563EB',
  purple: '#7C3AED',

  white: '#FFFFFF',
} as const;

export const avatarPalette: Record<string, string> = {
  '': colors.orange,
  'bg-blue': colors.blue,
  'bg-green': colors.green,
  'bg-purple': colors.purple,
  'bg-red': colors.red,
};

export const borderWidth = { standard: 2, structural: 3 } as const;

// Offsets used by <HardShadow>. Native has no blur — these are flat,
// solid-color offsets exactly like the web version's `Npx Npx 0 var(--ink)`.
export const shadow = { sm: 3, md: 6, lg: 10 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = 0; // squared corners, everywhere, deliberately — see the web redesign notes

export const fontSizes = {
  xs: 11, sm: 12.5, base: 14, md: 15, lg: 17, xl: 20, xxl: 25,
} as const;
