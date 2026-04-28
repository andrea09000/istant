import { Image } from 'expo-image';
import { View, type ViewStyle } from 'react-native';

import { colors } from '../theme/colors';

type Props = {
  uri?: string | null;
  size?: number;
  style?: ViewStyle;
};

export function Avatar({ uri, size = 40, style }: Props) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      ) : null}
    </View>
  );
}
