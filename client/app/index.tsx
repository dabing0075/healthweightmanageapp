import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function IndexEntry() {
  const router = useSafeRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_complete').then(value => {
      if (value === 'true') {
        router.replace('/(tabs)');
      } else {
        router.replace('/welcome');
      }
      setChecked(true);
    });
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8F5' }}>
      <ActivityIndicator size="large" color="#F26B3A" />
    </View>
  );
}
