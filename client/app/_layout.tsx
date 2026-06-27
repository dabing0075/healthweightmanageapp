import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
  'Non-serializable values were found in the navigation state',
]);

export default function RootLayout() {
  return (
    <Provider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          animation: 'slide_from_right',
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          headerShown: false
        }}
      >
        <Stack.Screen name="welcome" options={{ title: "", animation: 'fade' }} />
        <Stack.Screen name="login" options={{ title: "", animation: 'fade' }} />
        <Stack.Screen name="onboarding-profile" options={{ title: "", animation: 'slide_from_right' }} />
        <Stack.Screen name="onboarding-goals" options={{ title: "", animation: 'slide_from_right' }} />
        <Stack.Screen name="(tabs)" options={{ title: "" }} />
        <Stack.Screen name="edit-profile" options={{ title: "编辑资料", animation: 'slide_from_bottom', headerShown: false }} />
        <Stack.Screen name="edit-target" options={{ title: "设置目标", animation: 'slide_from_bottom', headerShown: false }} />
        <Stack.Screen name="feedback" options={{ title: "意见反馈", animation: 'slide_from_right', headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: "设置", animation: 'slide_from_right', headerShown: true, headerBackTitle: '返回', headerStyle: { backgroundColor: '#FFFFFF' }, headerTintColor: '#1E2933' }} />
      </Stack>
      <Toast />
    </Provider>
  );
}
