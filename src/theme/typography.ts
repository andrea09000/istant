import { TextStyle } from 'react-native';

import { colors } from './colors';

export const title: TextStyle = {
  color: colors.fg,
  fontSize: 28,
  fontWeight: '600',
  letterSpacing: -0.5,
};

export const titleSm: TextStyle = {
  color: colors.fg,
  fontSize: 20,
  fontWeight: '600',
  letterSpacing: -0.3,
};

export const body: TextStyle = {
  color: colors.fg,
  fontSize: 16,
  fontWeight: '400',
};

export const bodyMuted: TextStyle = {
  color: colors.muted,
  fontSize: 15,
  fontWeight: '400',
};

export const caption: TextStyle = {
  color: colors.muted,
  fontSize: 13,
  fontWeight: '500',
};
