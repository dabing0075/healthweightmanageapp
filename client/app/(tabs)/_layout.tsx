import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useCSSVariable } from 'uniwind';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const [background, muted, accent, border] = useCSSVariable([
    '--color-background',
    '--color-muted',
    '--color-accent',
    '--color-border',
  ]) as string[];

  let tabBarStyle = {
    backgroundColor: background,
    borderTopWidth: 1,
    borderTopColor: border,
    paddingTop: 8,
    height: Platform.OS === 'ios' ? 85 : 65,
  };

  if (Platform.OS === 'web') {
    tabBarStyle = {
      ...tabBarStyle,
      height: 'auto',
    };
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: '#F26B3A',
        tabBarInactiveTintColor: muted,
        tabBarLabelStyle: {
          fontSize: 11,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="house" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          title: '打卡',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="circle-plus" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="weight"
        options={{
          title: '减重',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="bullseye" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="data"
        options={{
          title: '数据',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="chart-line" size={20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '我的',
          tabBarIcon: ({ color }) => (
            <FontAwesome6 name="user" size={20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
