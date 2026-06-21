import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { FontAwesome6 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GENERATED_NICKNAMES = [
  '健康达人', '追风少年', '阳光跑者', '活力满满', '减重勇士',
  '轻盈人生', '健身新星', '蜕变之旅', '自律先锋', '元气满满',
];

export default function OnboardingProfilePage() {
  const router = useSafeRouter();
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [birthYear, setBirthYear] = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthDay, setBirthDay] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const nickname = GENERATED_NICKNAMES[Math.floor(Math.random() * GENERATED_NICKNAMES.length)];

  const handleNext = async () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const by = parseInt(birthYear);
    const bm = parseInt(birthMonth);
    const bd = parseInt(birthDay);

    if (!w || w < 20 || w > 300) {
      Toast.show({ type: 'error', text1: '请输入有效体重（20-300kg）' });
      return;
    }
    if (!h || h < 100 || h > 250) {
      Toast.show({ type: 'error', text1: '请输入有效身高（100-250cm）' });
      return;
    }
    if (!by || by < 1900 || by > 2020 || !bm || bm < 1 || bm > 12 || !bd || bd < 1 || bd > 31) {
      Toast.show({ type: 'error', text1: '请输入有效出生日期' });
      return;
    }

    const birthStr = `${by}-${String(bm).padStart(2, '0')}-${String(bd).padStart(2, '0')}`;

    // Save profile to server
    try {
      const API_BASE = 'http://localhost:9091';
      const res = await fetch(`${API_BASE}/api/v1/user/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, gender, birth_date: birthStr, height: h }),
      });
      if (!res.ok) throw new Error(`服务器错误: ${res.status}`);

      // Also save this weight as first check-in
      const today = new Date().toISOString().split('T')[0];
      await fetch(`${API_BASE}/api/v1/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record_date: today, weight: w, waist: 0, note: '' }),
      });

      // Store onboarding data for next page via AsyncStorage
      await AsyncStorage.setItem('onboarding_data', JSON.stringify({
        nickname, gender, birthDate: birthStr, height: h, currentWeight: w,
      }));

      router.replace('/onboarding-goals');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: '保存失败', text2: e.message || '请稍后重试' });
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FFFFFF' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.step}>1 / 2</Text>
          <Text style={styles.title}>完善个人资料</Text>
          <Text style={styles.subtitle}>系统已为你生成昵称：<Text style={{ color: '#F26B3A', fontWeight: '600' }}>{nickname}</Text></Text>
        </View>

        <View style={{ paddingHorizontal: 24 }}>
          {/* Gender */}
          <Text style={styles.label}>性别</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'male' && styles.genderBtnActive]}
              onPress={() => setGender('male')}
            >
              <FontAwesome6 name="mars" size={20} color={gender === 'male' ? '#FFFFFF' : '#9CA3AF'} />
              <Text style={[styles.genderText, gender === 'male' && styles.genderTextActive]}>男</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.genderBtn, gender === 'female' && styles.genderBtnActiveFemale]}
              onPress={() => setGender('female')}
            >
              <FontAwesome6 name="venus" size={20} color={gender === 'female' ? '#FFFFFF' : '#9CA3AF'} />
              <Text style={[styles.genderText, gender === 'female' && styles.genderTextActive]}>女</Text>
            </TouchableOpacity>
          </View>

          {/* Birth Date */}
          <Text style={styles.label}>出生日期</Text>
          <View style={styles.inputRow}>
            <FontAwesome6 name="calendar" size={18} color="#9CA3AF" />
            <TextInput style={[styles.textInput, { maxWidth: 60 }]} placeholder="1990" placeholderTextColor="#D1D5DB" keyboardType="number-pad" value={birthYear} onChangeText={setBirthYear} maxLength={4} />
            <Text style={{ color: '#9CA3AF', fontSize: 16 }}>年</Text>
            <TextInput style={[styles.textInput, { maxWidth: 44 }]} placeholder="01" placeholderTextColor="#D1D5DB" keyboardType="number-pad" value={birthMonth} onChangeText={setBirthMonth} maxLength={2} />
            <Text style={{ color: '#9CA3AF', fontSize: 16 }}>月</Text>
            <TextInput style={[styles.textInput, { maxWidth: 44 }]} placeholder="01" placeholderTextColor="#D1D5DB" keyboardType="number-pad" value={birthDay} onChangeText={setBirthDay} maxLength={2} />
            <Text style={{ color: '#9CA3AF', fontSize: 16 }}>日</Text>
          </View>

          {/* Current Weight */}
          <Text style={styles.label}>当前体重（kg）</Text>
          <View style={styles.inputRow}>
            <FontAwesome6 name="weight-scale" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.textInput}
              placeholder="请输入当前体重"
              placeholderTextColor="#D1D5DB"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              maxLength={6}
            />
            <Text style={styles.unit}>kg</Text>
          </View>

          {/* Height */}
          <Text style={styles.label}>身高（cm）</Text>
          <View style={styles.inputRow}>
            <FontAwesome6 name="ruler-vertical" size={18} color="#9CA3AF" />
            <TextInput
              style={styles.textInput}
              placeholder="请输入身高"
              placeholderTextColor="#D1D5DB"
              keyboardType="decimal-pad"
              value={height}
              onChangeText={setHeight}
              maxLength={5}
            />
            <Text style={styles.unit}>cm</Text>
          </View>
        </View>

        {/* Next Button */}
        <View style={{ paddingHorizontal: 24, marginTop: 40, marginBottom: 40 }}>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>下一步</Text>
            <FontAwesome6 name="arrow-right" size={16} color="#FFFFFF" />
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
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 8 },
  label: { fontSize: 14, fontWeight: '500', color: '#1E2933', marginTop: 20, marginBottom: 8 },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, backgroundColor: '#F5F5F5', gap: 8,
    borderWidth: 2, borderColor: 'transparent',
  },
  genderBtnActive: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  genderBtnActiveFemale: { backgroundColor: '#EC4899', borderColor: '#EC4899' },
  genderText: { fontSize: 16, fontWeight: '500', color: '#9CA3AF' },
  genderTextActive: { color: '#FFFFFF' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FBF9F4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#F0EDE6',
  },
  inputText: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1E2933' },
  textInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#1E2933', padding: 0 },
  unit: { fontSize: 14, color: '#9CA3AF', marginLeft: 8 },
  nextBtn: {
    backgroundColor: '#F26B3A', borderRadius: 14, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  nextBtnText: { fontSize: 17, fontWeight: '600', color: '#FFFFFF' },
});
