import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { View } from 'react-native';

import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';

function TabIcon({
  name,
  focused,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  focused: boolean;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons
        name={name}
        size={24}
        color={colors.fg}
        style={{ opacity: focused ? 1 : 0.55 }}
      />
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          left: 0,
          right: 0,
          marginHorizontal: spacing.lg,
          bottom: 12,
          height: 66,
          paddingTop: 12,
          paddingBottom: 12,
          borderTopWidth: 0,
          borderWidth: 0,
          borderRadius: 22,
          backgroundColor: 'transparent',
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            tint="dark"
            intensity={40}
            style={{
              flex: 1,
              borderRadius: 22,
              overflow: 'hidden',
              backgroundColor: 'rgba(0,0,0,0.35)',
            }}
          >
            <View
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: 22,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            />
          </BlurView>
        ),
        tabBarActiveTintColor: colors.fg,
        tabBarInactiveTintColor: colors.fg,
        tabBarShowLabel: false,
        tabBarItemStyle: { paddingTop: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => <TabIcon name="home-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: 'Istant',
          tabBarIcon: ({ focused }) => <TabIcon name="camera-outline" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profilo',
          tabBarIcon: ({ focused }) => <TabIcon name="person-outline" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
