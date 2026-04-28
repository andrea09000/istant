import { Pressable, Text, View } from 'react-native';

import { EMOJIS, type EmojiReaction } from '../types';
import { colors } from '../theme/colors';

type Props = {
  selected: EmojiReaction | null;
  onSelect: (e: EmojiReaction) => void;
  counts?: Partial<Record<EmojiReaction, number>>;
  showCounts?: boolean;
  disabled?: boolean;
  tone?: 'dark' | 'light';
};

export function EmojiBar({
  selected,
  onSelect,
  counts,
  showCounts = true,
  disabled,
  tone = 'dark',
}: Props) {
  const isLight = tone === 'light';
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 8,
        borderRadius: 18,
        backgroundColor: isLight ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
      }}
    >
      {EMOJIS.map((e) => {
        const active = selected === e;
        const c = counts?.[e] ?? 0;
        return (
          <Pressable
            key={e}
            disabled={disabled}
            onPress={() => onSelect(e)}
            style={({ pressed }) => [
              {
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active
                  ? isLight
                    ? 'rgba(0,0,0,0.06)'
                    : 'rgba(255,255,255,0.10)'
                  : isLight
                    ? 'rgba(0,0,0,0.02)'
                    : 'rgba(255,255,255,0.02)',
                borderWidth: 1,
                borderColor: active
                  ? isLight
                    ? 'rgba(0,0,0,0.16)'
                    : 'rgba(255,255,255,0.22)'
                  : isLight
                    ? 'rgba(0,0,0,0.06)'
                    : 'rgba(255,255,255,0.06)',
                opacity: disabled ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={{ fontSize: 18, marginTop: showCounts && c > 0 ? -2 : 0 }}>{e}</Text>
            {showCounts && c > 0 ? (
              <Text
                style={{
                  marginTop: 2,
                  fontSize: 11,
                  fontWeight: '900',
                  color: active
                    ? isLight
                      ? '#000000'
                      : colors.fg
                    : isLight
                      ? 'rgba(0,0,0,0.45)'
                      : colors.muted,
                }}
              >
                {c}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
