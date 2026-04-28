export const colors = {
  bg: '#000000',
  fg: '#FFFFFF',
  accent: '#FFFFFF',
  muted: '#B3B3B3',
  border: '#222222',
  surface: '#141414',
  danger: '#FF3B30',
} as const;

export type ColorKey = keyof typeof colors;
