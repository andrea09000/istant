import type { ReactNode } from 'react';
import { Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

type Props = {
  title: string;
  back?: boolean;
  right?: ReactNode;
  style?: ViewStyle;
  titleStyle?: TextStyle;
};

export function Header({ title, back, right, style, titleStyle }: Props) {
  const router = useRouter();
  return (
    <View
      style={[
        {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          flexDirection: 'row',
          alignItems: 'center',
        },
        style,
      ]}
    >
      {back ? (
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Text style={{ fontSize: 20, color: colors.fg }}>←</Text>
        </Pressable>
      ) : null}
      <Text
        style={[
          {
            flex: 1,
            fontSize: 18,
            fontWeight: '600',
            color: colors.fg,
          },
          titleStyle,
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {right}
    </View>
  );
}
