import { Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type Variant = 'primary' | 'secondary' | 'ghost';

export function Button({
  title,
  variant = 'primary',
  style,
  textStyle,
  ...rest
}: PressableProps & {
  title: string;
  variant?: Variant;
  textStyle?: object;
}) {
  const base: StyleProp<ViewStyle> = {
    borderRadius: 999,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  };
  const v =
    variant === 'primary'
      ? { backgroundColor: colors.accent }
      : variant === 'secondary'
        ? { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }
        : { backgroundColor: 'transparent' };
  const t =
    variant === 'primary'
      ? { color: '#000000', fontSize: 16, fontWeight: '800' as const }
      : variant === 'secondary'
        ? { color: colors.fg, fontSize: 16, fontWeight: '700' as const }
        : { color: colors.muted, fontSize: 16, fontWeight: '500' as const };
  return (
    <Pressable
      style={({ pressed }) => [base, v, pressed && { opacity: 0.8 }, style] as never}
      {...rest}
    >
      <Text style={[t, textStyle]}>{title}</Text>
    </Pressable>
  );
}
