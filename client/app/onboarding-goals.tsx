import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function OnboardingGoalsPage() {
  const router = useSafeRouter();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    AsyncStorage.getItem('onboarding_data').then(data => {
      if (data) setProfile(JSON.parse(data));
    });
  }, []);

  const nickname = profile?.nickname || '用户';
  const gender = profile?.gender || 'male';
  const height = parseFloat(profile?.height || '170');
  const currentWeight = parseFloat(profile?.currentWeight || '70');
  const isMale = gender === 'male';

  // 自动计算理想腰围（男性：身高×0.45+5，女性：身高×0.42+5）
  const autoWaist = useMemo(() => {
    const base = isMale ? height * 0.45 : height * 0.42;
    return Math.round(base);
  }, [height, isMale]);

  const [targetWeight, setTargetWeight] = useState('');
  const [targetWaist, setTargetWaist] = useState(String(autoWaist));

  const handleFinish = async () => {
    const tw = parseFloat(targetWeight);
    const wi = parseFloat(targetWaist);

    if (!tw || tw < 30 || tw > 300) {
      Toast.show({ type: 'error', text1: '请输入有效目标体重（30-300kg）' });
      return;
    }
    if (!wi || wi < 40 || wi > 200) {
      Toast.show({ type: 'error', text1: '请输入有效腰围（40-200cm）' });
      return;
    }

    try {
      const API_BASE = 'http://localhost:9091';
      await fetch(`${API_BASE}/api/v1/user/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_weight: tw, target_waist: wi }),
      });

      // Mark onboarding as complete
      await AsyncStorage.setItem('onboarding_complete', 'true');

      Toast.show({ type: 'success', text1: '设置完成！', text2: '欢迎开启健康之旅' });
      setTimeout(() => router.replace('/(tabs)'), 500);
    } catch (e) {
      Toast.show({ type: 'error', text1: '网络错误，请重试' });
    }
  };

  const weightLoss = currentWeight - parseFloat(targetWeight || '0');

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FFFFFF' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.step}>2 / 2</Text>
          <Text style={styles.title}>设定健康目标</Text>
          <Text style={styles.subtitle}>
            欢迎 <Text style={{ color: '#F26B3A', fontWeight: '600' }}>{nickname}</Text>，
            根据你的身体状况设定合理目标
          </Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          {/* Current data summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>当前体重</Text>
              <Text style={styles.summaryValue}>{currentWeight} kg</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>身高</Text>
              <Text style={styles.summaryValue}>{height} cm</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>性别</Text>
              <Text style={styles.summaryValue}>{isMale ? '男' : '女'}</Text>
            </View>
          </View>

          {/* Target Weight */}
          <Text style={styles.label}>目标体重（kg）</Text>
          <View style={styles.inputRow}>
            <FontAwesome6 name="bullseye" size={18} color="#F26B3A" />
            <TextInput
              style={styles.textInput}
              placeholder="请输入目标体重"
              placeholderTextColor="#D1D5DB"
              keyboardType="decimal-pad"
              value={targetWeight}
              onChangeText={(v) => { setTargetWeight(v); }}
              maxLength={6}
            />
            <Text style={styles.unit}>kg</Text>
          </View>
          {targetWeight && !isNaN(weightLoss) && (
            <Text style={[styles.hint, { color: weightLoss > 0 ? '#3C8D6E' : '#F26B3A' }]}>
              {weightLoss > 0
                ? `目标达成后需减重 ${weightLoss.toFixed(1)} kg`
                : weightLoss < 0
                ? `目标达成后需增重 ${Math.abs(weightLoss).toFixed(1)} kg`
                : '当前体重已达目标'}
            </Text>
          )}

          {/* Target Waist */}
          <Text style={styles.label}>
            目标腰围（cm）
            <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: '400' }}>  系统推荐值，可自行修改</Text>
          </Text>
          <View style={styles.inputRow}>
            <FontAwesome6 name="ruler-vertical" size={18} color="#3C8D6E" />
            <TextInput
              style={styles.textInput}
              placeholder="请输入目标腰围"
              placeholderTextColor="#D1D5DB"
              keyboardType="decimal-pad"
              value={targetWaist}
              onChangeText={setTargetWaist}
              maxLength={5}
            />
            <Text style={styles.unit}>cm</Text>
          </View>
        </View>

        {/* Finish Button */}
        <View style={{ paddingHorizontal: 24, marginTop: 40, marginBottom: 40 }}>
          <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
            <Text style={styles.finishBtnText}>开始健康之旅</Text>
            <FontAwesome6 name="heart-pulse" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 30 },
  step: { fontSize: 13, color: '#F26B3A', fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '700', color: '#1E2933', marginTop: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 8, lineHeight: 22 },
  summaryCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FBF9F4', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#F0EDE6', marginBottom: 24,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, color: '#9CA3AF' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: '#1E2933', marginTop: 4 },
  summaryDivider: { width: 1, height: 30, backgroundColor: '#E4DED2' },
  label: { fontSize: 14, fontWeight: '500', color: '#1E2933', marginTop: 20, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FBF9F4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#F0EDE6',
  },
  textInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1E2933', padding: 0 },
  unit: { fontSize: 14, color: '#9CA3AF', marginLeft: 8 },
  hint: { fontSize: 13, fontWeight: '500', marginTop: 8 },
  finishBtn: {
    backgroundColor: '#F26B3A', borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  finishBtnText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
});
