import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { colors } from '../theme/colors';

export function IconButton({
  children,
  onPress,
  size = 44,
  variant = 'glass',
}: {
  children: ReactNode;
  onPress: () => void;
  size?: number;
  variant?: 'glass' | 'ghost';
}) {
  return (
    <Pressable onPress={onPress} hitSlop={10}>
      {({ pressed }) => (
        <View
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.8 : 1,
            },
            variant === 'glass'
              ? {
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.10)',
                }
              : null,
          ]}
        >
          {children}
        </View>
      )}
    </Pressable>
  );
}

