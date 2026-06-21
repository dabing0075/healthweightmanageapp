import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';

const MOCK_PHONE = '138****8888';
const MOCK_WECHAT = '微信用户****';

export default function LoginPage() {
  const router = useSafeRouter();
  const [detecting, setDetecting] = useState(true);
  const [detectedAccount, setDetectedAccount] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [logging, setLogging] = useState(false);

  useEffect(() => {
    // 模拟自动检测手机号/微信号
    const timer = setTimeout(() => {
      setDetecting(false);
      setDetectedAccount(MOCK_PHONE);
      setAgreed(true); // 自动勾选同意
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async () => {
    setLogging(true);
    // 模拟登录过程
    await new Promise(r => setTimeout(r, 800));
    setLogging(false);
    router.replace('/onboarding-profile');
  };

  return (
    <View style={styles.container}>
      {/* Top branding */}
      <View style={styles.topArea}>
        <View style={styles.logoSmall}>
          <FontAwesome6 name="heart-pulse" size={32} color="#F26B3A" />
        </View>
        <Text style={styles.brand}>有靓又健</Text>
        <Text style={styles.subtitle}>登录后开启健康之旅</Text>
      </View>

      {/* Account detection */}
      <View style={styles.card}>
        {detecting ? (
          <View style={styles.detectingArea}>
            <ActivityIndicator size="small" color="#F26B3A" />
            <Text style={styles.detectingText}>正在检测本机账号...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.detectedLabel}>检测到以下账号</Text>

            {/* Phone option */}
            <TouchableOpacity
              style={[styles.accountOption, detectedAccount === MOCK_PHONE && styles.accountOptionActive]}
              onPress={() => setDetectedAccount(MOCK_PHONE)}
            >
              <FontAwesome6 name="mobile-screen" size={20} color={detectedAccount === MOCK_PHONE ? '#F26B3A' : '#9CA3AF'} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.accountText, detectedAccount === MOCK_PHONE && styles.accountTextActive]}>
                  {MOCK_PHONE}
                </Text>
                <Text style={styles.accountHint}>手机号一键登录</Text>
              </View>
              {detectedAccount === MOCK_PHONE && (
                <FontAwesome6 name="check-circle" size={20} color="#F26B3A" solid />
              )}
            </TouchableOpacity>

            {/* WeChat option */}
            <TouchableOpacity
              style={[styles.accountOption, detectedAccount === MOCK_WECHAT && styles.accountOptionActive]}
              onPress={() => setDetectedAccount(MOCK_WECHAT)}
            >
              <FontAwesome6 name="weixin" size={20} color={detectedAccount === MOCK_WECHAT ? '#07C160' : '#9CA3AF'} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.accountText, detectedAccount === MOCK_WECHAT && styles.accountTextActive]}>
                  {MOCK_WECHAT}
                </Text>
                <Text style={styles.accountHint}>微信授权登录</Text>
              </View>
              {detectedAccount === MOCK_WECHAT && (
                <FontAwesome6 name="check-circle" size={20} color="#07C160" solid />
              )}
            </TouchableOpacity>

            {/* Agreement */}
            <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreed(!agreed)}>
              <FontAwesome6 name={agreed ? 'check-square' : 'square'} size={16} color={agreed ? '#F26B3A' : '#D1D5DB'} solid={agreed} />
              <Text style={styles.agreeText}>
                已阅读并同意 <Text style={{ color: '#F26B3A' }}>《用户协议》</Text> 和 <Text style={{ color: '#F26B3A' }}>《隐私政策》</Text>
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Login button */}
      {!detecting && (
        <TouchableOpacity
          style={[styles.loginBtn, (!agreed || logging) && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={!agreed || logging}
        >
          {logging ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.loginBtnText}>
              {detectedAccount === MOCK_PHONE ? '手机号一键登录' : '微信授权登录'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.autoText}>自动生成昵称，无需手动注册</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: 24 },
  topArea: { alignItems: 'center', marginTop: 80, marginBottom: 40 },
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
  detectingArea: { alignItems: 'center', paddingVertical: 30 },
  detectingText: { fontSize: 14, color: '#9CA3AF', marginTop: 12 },
  detectedLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 16 },
  accountOption: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, borderRadius: 12, marginBottom: 10,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#F0EDE6',
  },
  accountOptionActive: { borderColor: '#F26B3A', backgroundColor: '#FFF8F5' },
  accountText: { fontSize: 16, fontWeight: '500', color: '#333333' },
  accountTextActive: { color: '#F26B3A' },
  accountHint: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  agreeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 4 },
  agreeText: { fontSize: 12, color: '#9CA3AF', marginLeft: 8, flex: 1 },
  loginBtn: {
    backgroundColor: '#F26B3A', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 30,
  },
  loginBtnDisabled: { backgroundColor: '#F5C6B5' },
  loginBtnText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
  autoText: { textAlign: 'center', fontSize: 12, color: '#D1D5DB', marginTop: 16 },
});
