import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { safeToFixed } from '@/utils/api';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

// 安全获取通知模块（Android 可能不可用）
let Notifications: any = null;
try { Notifications = require('expo-notifications'); } catch (_e) { /* not available */ }

export default function EditTargetPage() {
  const router = useSafeRouter();
  const [targetWeight, setTargetWeight] = useState('');
  const [targetWaist, setTargetWaist] = useState('');
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [currentWaist, setCurrentWaist] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  // 默认早上7点
  const getDefaultReminder = () => { const d = new Date(); d.setHours(7, 0, 0, 0); return d; };
  const [reminderTime, setReminderTime] = useState(getDefaultReminder());
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

  // 请求通知权限
  const requestNotificationPermission = async () => {
    if (!Notifications) return false;
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (_e) { return false; }
  };

  // 设置每日提醒
  const scheduleReminder = async (hour: number, minute: number) => {
    if (!Notifications) return;
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '打卡提醒',
          body: '坚持打卡，记录今天的体重和腰围数据吧！',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
        },
      });
    } catch (_e) { /* ignore */ }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const [userRes, metricsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/user/info`),
        fetch(`${API_BASE}/api/v1/health/metrics`),
      ]);

      const userData = await userRes.json();
      const metricsData = await metricsRes.json();

      if (userData.code === 200 && userData.data) {
        setTargetWeight(userData.data.target_weight?.toString() || '70');
        setTargetWaist(userData.data.target_waist?.toString() || '80');
        // 加载提醒时间
        if (userData.data.reminder_time) {
          const [h, m] = userData.data.reminder_time.split(':').map(Number);
          const d = new Date();
          d.setHours(h || 8, m || 0, 0, 0);
          setReminderTime(d);
          setReminderEnabled(true);
        }
      }
      if (metricsData.code === 200 && metricsData.data) {
        setCurrentWeight(metricsData.data.currentWeight || 0);
        setCurrentWaist(metricsData.data.currentWaist || 0);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    }
  };

  const handleSave = async () => {
    const target = parseFloat(targetWeight);
    const waist = parseFloat(targetWaist);

    if (isNaN(target) || target < 30 || target > 300) {
      Toast.show({ type: 'error', text1: '请输入有效的目标体重（30-300kg）' });
      return;
    }

    if (isNaN(waist) || waist < 40 || waist > 200) {
      Toast.show({ type: 'error', text1: '请输入有效的目标腰围（40-200cm）' });
      return;
    }

    setLoading(true);
    try {
      // 准备提醒时间字符串
      const timeStr = reminderEnabled
        ? `${String(reminderTime.getHours()).padStart(2, '0')}:${String(reminderTime.getMinutes()).padStart(2, '0')}`
        : null;

      const res = await fetch(`${API_BASE}/api/v1/user/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_weight: target,
          target_waist: waist,
          reminder_time: timeStr,
        }),
      });
      const data = await res.json();

      if (data.code === 200) {
        // 设置通知（Web 端可能不支持，单独捕获异常）
        try {
          if (reminderEnabled) {
            const granted = await requestNotificationPermission();
            if (granted) {
              await scheduleReminder(reminderTime.getHours(), reminderTime.getMinutes());
            }
          } else if (Notifications) {
            try { await Notifications.cancelAllScheduledNotificationsAsync(); } catch (_e) {}
          }
        } catch (notifErr) {
          console.log('Notification setup skipped (may not be supported on this platform):', notifErr);
        }
        setSaved(true);
        Toast.show({ type: 'success', text1: '保存成功' });
      } else {
        Toast.show({ type: 'error', text1: '保存失败', text2: data.msg });
      }
    } catch (error) {
      console.error('Save error:', error);
      Toast.show({ type: 'error', text1: '网络错误', text2: '请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  const weightDiff = currentWeight - parseFloat(targetWeight || '0');
  const waistDiff = currentWaist - parseFloat(targetWaist || '0');

  return (
    <Screen backgroundColor="#F7F4ED">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <FontAwesome6 name="arrow-left" size={20} color="#1E2933" />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#1E2933', flex: 1, textAlign: 'center', marginRight: 24 }}>
            设置健康目标
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Current Data Card */}
          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              }}
            >
              <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>当前数据</Text>
              <View style={{ flexDirection: 'row' }}>
                {/* Current Weight */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FBF9F4',
                    borderRadius: 12,
                    padding: 16,
                    marginRight: 12,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#9CA3AF' }}>当前体重</Text>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: '#1E2933', marginTop: 8 }}>
                    {currentWeight} kg
                  </Text>
                </View>
                {/* Current Waist */}
                <View
                  style={{
                    flex: 1,
                    backgroundColor: '#FBF9F4',
                    borderRadius: 12,
                    padding: 16,
                  }}
                >
                  <Text style={{ fontSize: 13, color: '#9CA3AF' }}>当前腰围</Text>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: '#1E2933', marginTop: 8 }}>
                    {currentWaist} cm
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Target Settings Card */}
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              }}
            >
              <Text style={{ fontSize: 13, color: '#1E2933', fontWeight: '500', marginBottom: 16 }}>设置目标</Text>

              {/* Target Weight */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>目标体重(kg)</Text>
                <View
                  style={{
                    backgroundColor: '#FBF9F4',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <TextInput
                    style={{ flex: 1, fontSize: 22, fontWeight: '700', color: '#1E2933' }}
                    placeholder="70"
                    placeholderTextColor="#D1D5DB"
                    keyboardType="decimal-pad"
                    value={targetWeight}
                    onChangeText={(v) => { setTargetWeight(v); setSaved(false); }}
                    maxLength={5}
                  />
                  <Text style={{ fontSize: 14, color: '#6B7280' }}>kg</Text>
                </View>
                {targetWeight && !isNaN(weightDiff) && weightDiff !== 0 && (
                  <Text
                    style={{
                      fontSize: 13,
                      color: '#3C8D6E',
                      marginTop: 8,
                    }}
                  >
                    {weightDiff > 0 ? `需减重 ${safeToFixed(weightDiff)} kg` : `需增重 ${safeToFixed(Math.abs(weightDiff))} kg`}
                  </Text>
                )}
              </View>

              {/* Target Waist */}
              <View>
                <Text style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 8 }}>目标腰围(cm)</Text>
                <View
                  style={{
                    backgroundColor: '#FBF9F4',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                  }}
                >
                  <TextInput
                    style={{ flex: 1, fontSize: 22, fontWeight: '700', color: '#1E2933' }}
                    placeholder="80"
                    placeholderTextColor="#D1D5DB"
                    keyboardType="decimal-pad"
                    value={targetWaist}
                    onChangeText={(v) => { setTargetWaist(v); setSaved(false); }}
                    maxLength={5}
                  />
                  <Text style={{ fontSize: 14, color: '#6B7280' }}>cm</Text>
                </View>
                {targetWaist && !isNaN(waistDiff) && waistDiff !== 0 && (
                  <Text
                    style={{
                      fontSize: 13,
                      color: '#3C8D6E',
                      marginTop: 8,
                    }}
                  >
                    {waistDiff > 0 ? `需减 ${safeToFixed(waistDiff)} cm` : `需增 ${safeToFixed(Math.abs(waistDiff))} cm`}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Reminder Time */}
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <View style={{
              backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20,
              shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FontAwesome6 name="clock" size={16} color="#F26B3A" />
                  <Text style={{ fontSize: 14, fontWeight: '500', color: '#1E2933', marginLeft: 10 }}>打卡提醒</Text>
                </View>
                <TouchableOpacity
                  onPress={() => { setReminderEnabled(!reminderEnabled); setSaved(false); }}
                  style={{
                    width: 48, height: 28, borderRadius: 14,
                    backgroundColor: reminderEnabled ? '#F26B3A' : '#D1D5DB',
                    justifyContent: 'center', paddingHorizontal: 3,
                  }}
                >
                  <View style={{
                    width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF',
                    alignSelf: reminderEnabled ? 'flex-end' : 'flex-start',
                  }} />
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: reminderEnabled ? 12 : 0 }}>
                开启后每天定时提醒打卡
              </Text>
              {reminderEnabled && (
                <View>
                  <TouchableOpacity
                    onPress={() => setShowTimePicker(!showTimePicker)}
                    style={{
                      backgroundColor: '#FBF9F4', borderRadius: 12,
                      paddingHorizontal: 16, paddingVertical: 12,
                      flexDirection: 'row', alignItems: 'center',
                    }}
                  >
                    <FontAwesome6 name="bell" size={16} color="#F26B3A" />
                    <Text style={{ flex: 1, marginLeft: 10, fontSize: 16, fontWeight: '600', color: '#1E2933' }}>
                      {`${String(reminderTime.getHours()).padStart(2, '0')}:00`}
                    </Text>
                    <FontAwesome6 name="chevron-right" size={12} color="#9CA3AF" />
                  </TouchableOpacity>
                  {showTimePicker && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 8 }}>选择提醒时间（整点）</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map(h => (
                          <TouchableOpacity
                            key={h}
                            onPress={() => { setReminderTime(new Date(2026, 0, 1, h, 0)); setShowTimePicker(false); setSaved(false); }}
                            style={{
                              width: 48, height: 36, borderRadius: 8,
                              backgroundColor: reminderTime.getHours() === h ? '#F26B3A' : '#F0EDE6',
                              alignItems: 'center', justifyContent: 'center',
                            }}
                          >
                            <Text style={{
                              fontSize: 13, fontWeight: '600',
                              color: reminderTime.getHours() === h ? '#FFFFFF' : '#1E2933',
                            }}>
                              {h}:00
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Tips */}
          <View style={{ paddingHorizontal: 20, marginTop: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 18 }}>
              温馨提示：合理的目标有助于健康减重。建议每周减重0.5-1公斤为宜。
            </Text>
          </View>

          {/* Save Button */}
          <View style={{ padding: 20, paddingBottom: 40 }}>
            <TouchableOpacity
              style={{
                backgroundColor: saved ? '#D1D5DB' : '#F26B3A',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
              onPress={handleSave}
              disabled={loading || saved}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                {loading ? '保存中...' : saved ? '已保存' : '保存设置'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
