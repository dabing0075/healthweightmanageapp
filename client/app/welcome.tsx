import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function WelcomePage() {
  const router = useSafeRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const textFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Check if onboarding already completed
    AsyncStorage.getItem('onboarding_complete').then(value => {
      if (value === 'true') {
        // Already onboarded, go directly to main app
        router.replace('/(tabs)');
        return;
      }

      // Icon fade in + scale
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]).start();

      // Text fade in after icon
      setTimeout(() => {
        Animated.timing(textFade, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      }, 600);

      // Navigate to login after 3 seconds
      setTimeout(() => {
        router.replace('/login');
      }, 3000);
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Heart icon */}
        <Animated.View style={[styles.iconWrap, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconBg}>
            <FontAwesome6 name="heart-pulse" size={64} color="#FFFFFF" />
          </View>
        </Animated.View>

        {/* Brand name */}
        <Animated.Text style={[styles.brand, { opacity: textFade }]}>
          有靓又健
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[styles.tagline, { opacity: textFade }]}>
          遇见更好的自己！
        </Animated.Text>
      </View>

      {/* Bottom decoration */}
      <View style={styles.bottom}>
        <FontAwesome6 name="dumbbell" size={20} color="rgba(242,107,58,0.3)" />
        <Text style={styles.version}>v1.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 30,
  },
  iconBg: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#F26B3A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F26B3A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  brand: {
    fontSize: 36,
    fontWeight: '700',
    color: '#1E2933',
    letterSpacing: 4,
  },
  tagline: {
    fontSize: 18,
    color: '#F26B3A',
    marginTop: 16,
    letterSpacing: 2,
    fontWeight: '500',
  },
  bottom: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },
  version: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 8,
  },
});
