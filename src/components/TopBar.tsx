import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function TopBar({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top + 8 }}>
      <View
        style={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <View>
          <Text style={{ color: colors.fg, fontSize: 30, fontWeight: '900', letterSpacing: -0.8 }}>
            {title}
          </Text>
          <LinearGradient
            colors={[colors.accent, 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 3, width: 62, borderRadius: 999, marginTop: 8 }}
          />
        </View>
        <View style={{ flex: 1 }} />
        {right}
      </View>
    </View>
  );
}

