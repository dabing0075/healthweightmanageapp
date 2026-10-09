import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '@/contexts/AuthContext';

const PHONE_RE = /^1[3-9]\d{9}$/;

export default function LoginPage() {
  const router = useSafeRouter();
  const { sendCode, login } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const [logging, setLogging] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const handleSendCode = async () => {
    if (!PHONE_RE.test(phone)) {
      Toast.show({ type: 'error', text1: '请输入正确的手机号' });
      return;
    }
    setSending(true);
    try {
      const data = await sendCode(phone);
      startCountdown();
      if (data?.devCode) {
        Toast.show({ type: 'success', text1: '验证码已发送', text2: `开发验证码：${data.devCode}` });
      } else {
        Toast.show({ type: 'success', text1: '验证码已发送', text2: '请注意查收短信' });
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.message || '发送失败，请重试' });
    } finally {
      setSending(false);
    }
  };

  const handleLogin = async () => {
    if (!PHONE_RE.test(phone)) {
      Toast.show({ type: 'error', text1: '请输入正确的手机号' });
      return;
    }
    if (!code) {
      Toast.show({ type: 'error', text1: '请输入验证码' });
      return;
    }
    if (!agreed) {
      Toast.show({ type: 'error', text1: '请先阅读并同意用户协议与隐私政策' });
      return;
    }
    setLogging(true);
    try {
      const { onboarded } = await login(phone, code);
      if (onboarded) {
        router.replace('/(tabs)');
      } else {
        router.replace('/onboarding-profile');
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: e.message || '登录失败，请重试' });
    } finally {
      setLogging(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top branding */}
      <View style={styles.topArea}>
        <View style={styles.logoSmall}>
          <FontAwesome6 name="heart-pulse" size={32} color="#F26B3A" />
        </View>
        <Text style={styles.brand}>有靓又健</Text>
        <Text style={styles.subtitle}>登录后开启健康之旅</Text>
      </View>

      {/* Form */}
      <View style={styles.card}>
        <Text style={styles.label}>手机号</Text>
        <View style={styles.inputRow}>
          <FontAwesome6 name="mobile-screen" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="请输入手机号"
            placeholderTextColor="#D1D5DB"
            keyboardType="number-pad"
            maxLength={11}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <Text style={[styles.label, { marginTop: 16 }]}>验证码</Text>
        <View style={styles.inputRow}>
          <FontAwesome6 name="shield-halved" size={18} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="请输入验证码"
            placeholderTextColor="#D1D5DB"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity
            style={[styles.codeBtn, (countdown > 0 || sending) && styles.codeBtnDisabled]}
            onPress={handleSendCode}
            disabled={countdown > 0 || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#F26B3A" />
            ) : (
              <Text style={[styles.codeBtnText, countdown > 0 && styles.codeBtnTextDisabled]}>
                {countdown > 0 ? `${countdown}s` : '获取验证码'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Agreement */}
        <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(!agreed)}>
          <FontAwesome6
            name={agreed ? 'check-square' : 'square'}
            size={16}
            color={agreed ? '#F26B3A' : '#D1D5DB'}
            solid={agreed}
          />
          <Text style={styles.agreeText}>
            已阅读并同意 <Text style={{ color: '#F26B3A' }}>《用户协议》</Text> 和{' '}
            <Text style={{ color: '#F26B3A' }}>《隐私政策》</Text>
          </Text>
        </TouchableOpacity>
      </View>

      {/* Login button */}
      <TouchableOpacity
        style={[styles.loginBtn, (!agreed || logging) && styles.loginBtnDisabled]}
        onPress={handleLogin}
        disabled={!agreed || logging}
      >
        {logging ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.loginBtnText}>登录</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.autoText}>新用户将自动注册，无需密码</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
  topArea: { alignItems: 'center', marginTop: 70, marginBottom: 32 },
  logoSmall: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#FFF0EB',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  brand: { fontSize: 28, fontWeight: '700', color: '#1E2933', letterSpacing: 2 },
  subtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 8 },
  card: {
    backgroundColor: '#FBF9F4', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#F0EDE6',
  },
  label: { fontSize: 13, color: '#6B7280', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#F0EDE6',
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1E2933', padding: 0 },
  codeBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1, borderColor: '#F26B3A',
  },
  codeBtnDisabled: { borderColor: '#E5E7EB' },
  codeBtnText: { fontSize: 13, color: '#F26B3A', fontWeight: '500' },
  codeBtnTextDisabled: { color: '#9CA3AF' },
  agreeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 4 },
  agreeText: { fontSize: 12, color: '#9CA3AF', marginLeft: 8, flex: 1 },
  loginBtn: {
    backgroundColor: '#F26B3A', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 28,
  },
  loginBtnDisabled: { backgroundColor: '#F5C6B5' },
  loginBtnText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  autoText: { textAlign: 'center', fontSize: 12, color: '#D1D5DB', marginTop: 16 },
});
