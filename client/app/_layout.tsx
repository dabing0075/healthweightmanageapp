import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LogBox, View, ActivityIndicator } from 'react-native';
import Toast from 'react-native-toast-message';
import { Provider } from '@/components/Provider';
import { useAuth } from '@/contexts/AuthContext';

import '../global.css';

LogBox.ignoreLogs([
  "TurboModuleRegistry.getEnforcing(...): 'RNMapsAirModule' could not be found",
  'Non-serializable values were found in the navigation state',
]);

function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8F5' }}>
        <ActivityIndicator size="large" color="#F26B3A" />
      </View>
    );
  }

  return (
    <Stack
      initialRouteName="welcome"
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

      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(tabs)" options={{ title: "" }} />
        <Stack.Screen name="edit-profile" options={{ title: "编辑资料", animation: 'slide_from_bottom', headerShown: false }} />
        <Stack.Screen name="edit-target" options={{ title: "设置目标", animation: 'slide_from_bottom', headerShown: false }} />
        <Stack.Screen name="feedback" options={{ title: "意见反馈", animation: 'slide_from_right', headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: "设置", animation: 'slide_from_right', headerShown: true, headerBackTitle: '返回', headerStyle: { backgroundColor: '#FFFFFF' }, headerTintColor: '#1E2933' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <Provider>
      <StatusBar style="dark" />
      <RootNavigator />
      <Toast />
    </Provider>
  );
}
