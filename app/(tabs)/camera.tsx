import {
  CameraView,
  useCameraPermissions,
  type CameraType,
} from 'expo-camera';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';

import { Button } from '../../src/components/Button';
import { IconButton } from '../../src/components/IconButton';
import { TopBar } from '../../src/components/TopBar';
import { useAuth } from '../../src/hooks/useAuth';
import { createPost } from '../../src/lib/posts';
import type { PostAudience } from '../../src/types';
import { uploadImage } from '../../src/lib/storage';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { body, title, titleSm } from '../../src/theme/typography';

export default function CameraTab() {
  const insets = useSafeAreaInsets();
  const { user, profile } = useAuth();
  const router = useRouter();
  const ref = useRef<CameraView | null>(null);
  const [perm, request] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [torch, setTorch] = useState(false);
  const [ready, setReady] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [audience, setAudience] = useState<PostAudience>('all');
  const [adLink, setAdLink] = useState('');
  const tabBarSpace = 96; // keep controls above floating tab bar
  const [lenses, setLenses] = useState<string[]>([]);
  const [selectedLens, setSelectedLens] = useState<string | undefined>(undefined);
  const isAdvertiser = Boolean(profile?.isAdvertiser);

  const pickFromLibrary = useCallback(async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Galleria', 'Consenti l’accesso alla galleria per caricare una foto.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (res.canceled) {
        return;
      }
      const uri = res.assets?.[0]?.uri;
      if (uri) {
        setPreview(uri);
      }
    } catch (e) {
      Alert.alert('Galleria', e instanceof Error ? e.message : 'Errore');
    }
  }, []);

  const flip = useCallback(() => {
    setFacing((f) => (f === 'back' ? 'front' : 'back'));
  }, []);

  const toggleTorch = useCallback(() => {
    setTorch((t) => !t);
  }, []);

  // If user switches to front camera, force torch off
  const flipSafe = useCallback(() => {
    setFacing((f) => {
      const next = f === 'back' ? 'front' : 'back';
      if (next === 'front') {
        setTorch(false);
        setSelectedLens(undefined);
      }
      return next;
    });
  }, []);

  const refreshLenses = useCallback(async () => {
    try {
      // iOS only
      if (Platform.OS !== 'ios' || facing !== 'back') {
        setLenses([]);
        setSelectedLens(undefined);
        return;
      }
      const r = ref.current as unknown as { getAvailableLensesAsync?: () => Promise<string[]> } | null;
      if (!r || typeof r.getAvailableLensesAsync !== 'function') {
        return;
      }
      const list = await r.getAvailableLensesAsync();
      if (Array.isArray(list) && list.length > 0) {
        setLenses(list);
        setSelectedLens((prev) => (prev && list.includes(prev) ? prev : list[0]));
      } else {
        setLenses([]);
        setSelectedLens(undefined);
      }
    } catch {
      setLenses([]);
      setSelectedLens(undefined);
    }
  }, [facing]);

  useEffect(() => {
    if (!ready) return;
    // wait one tick after switching cameras so native updates lenses
    const t = setTimeout(() => {
      void refreshLenses();
    }, 50);
    return () => clearTimeout(t);
  }, [ready, refreshLenses, facing]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (facing !== 'back') return;
    if (lenses.length === 0) return;
    if (!selectedLens || !lenses.includes(selectedLens)) {
      setSelectedLens(lenses[0]);
    }
  }, [lenses, selectedLens, facing]);

  const lensLabel = useMemo(() => {
    const v = selectedLens ?? lenses[0];
    if (!v) return null;
    const s = v.toLowerCase();
    if (s.includes('ultra')) return 'Ultra';
    if (s.includes('tele')) return 'Tele';
    if (s.includes('wide')) return 'Wide';
    if (s.includes('dual')) return 'Dual';
    if (s.includes('triple')) return 'Triple';
    return 'Lens';
  }, [selectedLens, lenses]);

  const cycleLens = useCallback(() => {
    if (lenses.length <= 1) {
      return;
    }
    setSelectedLens((cur) => {
      const idx = cur ? lenses.indexOf(cur) : 0;
      const next = lenses[(idx + 1) % lenses.length];
      return next;
    });
  }, [lenses]);

  const take = useCallback(async () => {
    if (!ref.current) {
      return;
    }
    try {
      const p = await ref.current.takePictureAsync({ quality: 0.9 });
      if (p?.uri) {
        setPreview(p.uri);
      }
    } catch (e) {
      Alert.alert('Fotocamera', e instanceof Error ? e.message : 'Errore');
    }
  }, []);

  const share = useCallback(
    async (audienceToShare: PostAudience) => {
      if (!user?.uid || !preview) {
        return;
      }
      setSaving(true);
      try {
        const path = `posts/${user.uid}/${Date.now()}.webp`;
        const url = await uploadImage(path, preview);
        const raw = adLink.trim();
        const link =
          isAdvertiser && raw.length > 0
            ? (raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`)
            : undefined;
        await createPost(user.uid, {
          photoUrl: url,
          audience: audienceToShare,
          ...(isAdvertiser ? { isAd: true } : {}),
          ...(link ? { link } : {}),
        });
        setPreview(null);
        setAdLink('');
        router.replace('/(tabs)/' as any);
      } catch (e) {
        Alert.alert('Pubblica', e instanceof Error ? e.message : 'Errore');
      } finally {
        setSaving(false);
      }
    },
    [user?.uid, preview, router, adLink, isAdvertiser],
  );

  if (!perm?.granted) {
    return (
      <View
        style={[styles.center, { paddingTop: insets.top, backgroundColor: colors.bg }]}
      >
        <Text style={title}>Permesso camera</Text>
        <Text
          style={[body, { color: colors.muted, marginTop: spacing.md, textAlign: 'center' }]}
        >
          Concedi l’accesso per scattare un ISTANT.
        </Text>
        <View style={{ marginTop: spacing.lg }} />
        <Button title="Consenti" onPress={() => request()} />
      </View>
    );
  }

  if (preview) {
    return (
      <View style={styles.screen}>
        <TopBar
          title="ISTANT"
          right={
            <IconButton onPress={() => setPreview(null)}>
              <Ionicons name="close" size={20} color={colors.fg} />
            </IconButton>
          }
        />

        <View style={styles.previewFrame}>
          <Image
            source={{ uri: preview }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
          />
        </View>

        <View
          style={[
            styles.bottomArea,
            { paddingBottom: Math.max(insets.bottom, 14) + tabBarSpace },
          ]}
        >
          {isAdvertiser ? (
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1,
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 10,
              }}
            >
              <Text style={{ ...titleSm, fontSize: 13, marginBottom: 6 }}>
                Link inserzione (opzionale)
              </Text>
              <TextInput
                value={adLink}
                onChangeText={setAdLink}
                placeholder="es. https://tuosito.com"
                placeholderTextColor="rgba(255,255,255,0.45)"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                textContentType="URL"
                editable={!saving}
                style={{
                  color: colors.fg,
                  fontSize: 14,
                  fontWeight: '700',
                  paddingVertical: 8,
                }}
              />
              <Text style={{ ...body, fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                Questo ISTANT verrà mostrato come “inserzione” e senza reazioni emoji.
              </Text>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
            <Pressable
              onPress={() => setAudience((a) => (a === 'all' ? 'close' : 'all'))}
              style={styles.audiencePill}
              hitSlop={8}
              disabled={saving}
            >
              <Ionicons name="people-outline" size={16} color={colors.accent} />
              <Text style={styles.audienceText}>{audience === 'all' ? 'Amici' : 'Amici stretti'}</Text>
            </Pressable>
          </View>

          <View style={styles.previewActions}>
            <Button
              title="Indietro"
              variant="ghost"
              onPress={() => setPreview(null)}
              disabled={saving}
            />
            <Button
              title={saving ? '…' : 'Avanti'}
              onPress={() => share(audience)}
              disabled={saving}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar
        title="ISTANT"
        right={
          <View style={{ width: 44, height: 44 }} />
        }
      />

      <View style={styles.cameraFrame}>
        <CameraView
          ref={ref}
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={torch}
          selectedLens={selectedLens}
          onAvailableLensesChanged={(e: any) => {
            const list = e?.nativeEvent?.lenses ?? e?.lenses;
            if (Array.isArray(list)) {
              setLenses(list);
            }
          }}
          onCameraReady={() => setReady(true)}
        />
      </View>

      <View
        style={[
          styles.bottomArea,
          { paddingBottom: Math.max(insets.bottom, 14) + tabBarSpace },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
          <Pressable
            onPress={() => setAudience((a) => (a === 'all' ? 'close' : 'all'))}
            style={styles.audiencePill}
            hitSlop={8}
          >
            <Ionicons name="people-outline" size={16} color={colors.accent} />
            <Text style={styles.audienceText}>{audience === 'all' ? 'Amici' : 'Amici stretti'}</Text>
          </Pressable>

          {Platform.OS === 'ios' && facing === 'back' && lenses.length > 1 ? (
            <Pressable onPress={cycleLens} style={styles.audiencePill} hitSlop={8}>
              <Ionicons name="camera-outline" size={16} color={colors.accent} />
              <Text style={styles.audienceText}>{lensLabel ?? 'Lens'}</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            onPress={() => {
              if (facing === 'front') {
                return;
              }
              toggleTorch();
            }}
            disabled={facing === 'front'}
            style={styles.controlIconBtn}
            hitSlop={10}
          >
            <Ionicons
              name={torch ? 'flash' : 'flash-outline'}
              size={22}
              color={facing === 'front' ? 'rgba(255,255,255,0.25)' : torch ? colors.accent : 'rgba(255,255,255,0.9)'}
            />
          </Pressable>

          <Pressable
            onPress={take}
            disabled={!ready}
            style={[styles.shutter, !ready ? { opacity: 0.45 } : undefined]}
          >
            <View style={styles.shutterInner} />
          </Pressable>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isAdvertiser ? (
              <Pressable onPress={pickFromLibrary} style={styles.controlIconBtn} hitSlop={10}>
                <Ionicons name="image-outline" size={22} color="rgba(255,255,255,0.9)" />
              </Pressable>
            ) : null}
            <Pressable onPress={flipSafe} style={styles.controlIconBtn} hitSlop={10}>
              <Ionicons name="camera-reverse-outline" size={22} color="rgba(255,255,255,0.9)" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: spacing.lg, justifyContent: 'center' },

  screen: { flex: 1, backgroundColor: colors.bg },

  cameraFrame: {
    flex: 1,
    marginHorizontal: spacing.lg,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  previewFrame: {
    flex: 1,
    marginHorizontal: spacing.lg,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  bottomArea: {
    paddingTop: 12,
    paddingHorizontal: spacing.lg,
    gap: 12,
  },

  audiencePill: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
  },
  audienceText: { ...body, color: colors.fg },

  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlIconBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },

  shutter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent,
  },

  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md as any,
  },
});
