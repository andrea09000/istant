import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';

import { Button } from '../src/components/Button';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/spacing';
import { title, body } from '../src/theme/typography';

export default function NotFound() {
  const r = useRouter();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg,
        padding: spacing.lg,
      }}
    >
      <Text style={title}>404</Text>
      <Text style={[body, { marginTop: spacing.md, textAlign: 'center', color: colors.muted }]}>
        La schermata non esiste
      </Text>
      <View style={{ marginTop: 24, width: '100%' } as any}>
        <Button title="Torna alla home" onPress={() => r.replace('/')} />
      </View>
    </View>
  );
}
