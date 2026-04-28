import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function TextField({
  label,
  ...props
}: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text
        style={{
          color: colors.muted,
          fontSize: 12,
          fontWeight: '500',
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {label}
      </Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          padding: spacing.md,
          fontSize: 16,
          color: colors.fg,
          backgroundColor: colors.surface,
          fontWeight: '700',
        }}
        placeholderTextColor={colors.muted}
        {...props}
      />
    </View>
  );
}
