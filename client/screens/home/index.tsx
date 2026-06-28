import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import Toast from 'react-native-toast-message';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { safeToFixed } from '@/utils/api';

const { width } = Dimensions.get('window');

// Types
interface UserInfo {
  id: string;
  nickname: string;
  gender: string;
  birth_date: string;
  height: number;
  target_weight: number;
  target_waist: number;
  current_weight?: number;
  current_waist?: number;
  bmi?: number;
  bmi_level?: string;
  body_fat_rate?: number;
  body_fat_level?: string;
  waist_level?: string;
  last_checkin_date?: string;
}

interface HealthMetrics {
  currentWeight: number;
  currentWaist: number;
  bmi: number;
  bmiLevel: string;
  bodyFatRate: number;
  bodyFatLevel: string;
  waistLevel: string;
  weightDiff: number;
  todayCheckedIn: boolean;
  healthScore?: {
    total: number;
    level: string;
    breakdown: {
      bmi: number;
      waist: number;
      bodyFat: number;
      muscle: number;
      bodyAge: number;
    };
  };
  bodyAge?: number;
  realAge?: number;
  bmr?: number;
  bodyType?: string;
}

interface TrendPoint {
  date: string;
  weight: number;
}

interface TrendResponse {
  weightTrend: TrendPoint[];
  weightStats: {
    start: number;
    end: number;
    change: number;
    changePercent: number;
  };
}

export default function HomePage() {
  const router = useSafeRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [trendData, setTrendData] = useState<TrendResponse | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<any>(null);

  const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

  const loadData = async () => {
    try {
      const ts = Date.now(); // cache-busting
      // Get user info
      const userRes = await fetch(`${API_BASE}/api/v1/user/info?_=${ts}`);
      const userData = await userRes.json();
      if (userData.code === 200 && userData.data) {
        setUserInfo(userData.data);
      }

      // Get health metrics
      const metricsRes = await fetch(`${API_BASE}/api/v1/health/metrics?_=${ts}`);
      const metricsData = await metricsRes.json();
      if (metricsData.code === 200 && metricsData.data) {
        setMetrics(metricsData.data);
      }

      // Get trend data
      const trendRes = await fetch(`${API_BASE}/api/v1/health/trend?days=7&_=${ts}`);
      const trendData = await trendRes.json();
      if (trendData.code === 200 && trendData.data) {
        setTrendData(trendData.data);
      }

      // Get notifications
      try {
        const notifRes = await fetch(`${API_BASE}/api/v1/notifications?_=${ts}`);
        const notifData = await notifRes.json();
        if (notifData.code === 200) setNotifications(notifData.data || []);
        const countRes = await fetch(`${API_BASE}/api/v1/notifications/unread-count?_=${ts}`);
        const countData = await countRes.json();
        if (countData.code === 200) setUnreadCount(countData.data?.count || 0);
      } catch (_e) { /* ignore */ }
    } catch (error) {
      console.warn('Load data error (network may be unavailable):', (error as Error)?.message);
      // 不弹出 Toast，避免在没有网络的情况下反复提示用户
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Get color based on health level
  const getBmiColor = (level: string) => {
    switch (level) {
      case '体重过低':
      case '偏瘦':
        return '#3B82F6';
      case '正常':
        return '#3C8D6E';
      case '超重':
        return '#F59E0B';
      case '肥胖':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case '正常':
        return '#3C8D6E';
      case '偏高':
      case '中心型肥胖前期':
        return '#F59E0B';
      case '肥胖':
      case '中心型肥胖':
        return '#EF4444';
      case '偏低':
        return '#3B82F6';
      case '优秀':
        return '#3C8D6E';
      case '良好':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#3C8D6E';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  };

  // Get week day
  const getWeekDay = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[date.getDay()];
  };

  // Get today's date string
  const getTodayString = () => {
    const today = new Date();
    return `${today.getMonth() + 1}/${today.getDate()}`;
  };

  return (
    <Screen backgroundColor="#F7F4ED">
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#1E2933' }}>
            有靓又健体重日志
          </Text>
          <TouchableOpacity
            onPress={() => setShowNotifications(true)}
            style={{ padding: 8, position: 'relative' }}
          >
            <FontAwesome6 name="bell" size={22} color="#6B7280" />
            {unreadCount > 0 && (
              <View style={{
                position: 'absolute', top: 2, right: 2,
                backgroundColor: '#EF4444', borderRadius: 10,
                minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center',
                paddingHorizontal: 4,
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Notifications Modal */}
        {showNotifications && (
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100,
          }}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => { setShowNotifications(false); setSelectedNotif(null); }} />
            <View style={{
              position: 'absolute', top: 60, right: 20, left: 20, maxHeight: '70%',
              backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
            }}>
              {selectedNotif ? (
                <View style={{ padding: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                    <TouchableOpacity onPress={() => setSelectedNotif(null)} style={{ marginRight: 12 }}>
                      <FontAwesome6 name="arrow-left" size={16} color="#6B7280" />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 17, fontWeight: '600', color: '#1E2933', flex: 1 }}>{selectedNotif.title}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>{selectedNotif.created_at}</Text>
                  <Text style={{ fontSize: 15, color: '#333333', lineHeight: 22 }}>{selectedNotif.content}</Text>
                </View>
              ) : (
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                    <Text style={{ fontSize: 17, fontWeight: '600', color: '#1E2933' }}>消息通知</Text>
                    {unreadCount > 0 && (
                      <TouchableOpacity onPress={async () => {
                        try { await fetch(`${API_BASE}/api/v1/notifications/read-all`, { method: 'PUT' }); } catch {}
                        setUnreadCount(0);
                        setNotifications(notifications.map((n: any) => ({ ...n, is_read: 1 })));
                      }}>
                        <Text style={{ fontSize: 13, color: '#F26B3A' }}>全部已读</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView style={{ maxHeight: 400 }}>
                    {notifications.length === 0 ? (
                      <View style={{ padding: 40, alignItems: 'center' }}>
                        <FontAwesome6 name="bell-slash" size={32} color="#D1D5DB" />
                        <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 12 }}>暂无通知</Text>
                      </View>
                    ) : (
                      notifications.map((n: any) => (
                        <TouchableOpacity
                          key={n.id}
                          style={{
                            padding: 16, borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
                            backgroundColor: n.is_read ? '#FFFFFF' : '#FEF7F0',
                          }}
                          onPress={async () => {
                            if (!n.is_read) {
                              try { await fetch(`${API_BASE}/api/v1/notifications/${n.id}/read`, { method: 'PUT' }); } catch {}
                              setUnreadCount(Math.max(0, unreadCount - 1));
                              setNotifications(notifications.map((x: any) => x.id === n.id ? { ...x, is_read: 1 } : x));
                            }
                            setSelectedNotif(n);
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{
                              width: 8, height: 8, borderRadius: 4,
                              backgroundColor: n.is_read ? 'transparent' : '#F26B3A',
                              marginRight: 10,
                            }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E2933' }} numberOfLines={1}>{n.title}</Text>
                              <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{n.created_at}</Text>
                            </View>
                            <FontAwesome6 name="chevron-right" size={12} color="#D1D5DB" />
                          </View>
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Welcome Message */}
        <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
          <Text style={{ fontSize: 14, color: '#3C8D6E', fontWeight: '500' }}>
            欢迎回来，健康生活每一天！加油！
          </Text>
        </View>

        {/* Check-in Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: metrics?.todayCheckedIn ? '#3C8D6E' : '#E5E7EB',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                }}
              >
                <FontAwesome6
                  name={metrics?.todayCheckedIn ? 'check' : 'clock'}
                  size={20}
                  color={metrics?.todayCheckedIn ? '#FFFFFF' : '#9CA3AF'}
                />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933' }}>
                  {metrics?.todayCheckedIn ? '今日已打卡' : '今日未打卡'}
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  {metrics?.todayCheckedIn ? '继续保持！' : '快去记录今天的体重吧'}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={{
                backgroundColor: '#F26B3A',
                borderRadius: 20,
                paddingHorizontal: 20,
                paddingVertical: 10,
              }}
              onPress={() => router.push('/(tabs)/checkin')}
            >
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 14 }}>
                {metrics?.todayCheckedIn ? '再次打卡' : '打卡'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Health Metrics Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1E2933' }}>
              健康指标
            </Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/data')}>
              <Text style={{ fontSize: 14, color: '#F26B3A' }}>查看全部</Text>
            </TouchableOpacity>
          </View>

          {/* Row 1: Weight and Waist */}
          <View style={{ flexDirection: 'row', marginHorizontal: -6, marginBottom: 12 }}>
            {/* Weight Card */}
            <View style={{ width: '50%', paddingHorizontal: 6 }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(242, 107, 58, 0.12)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <FontAwesome6 name="weight-scale" size={18} color="#F26B3A" />
                  </View>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 10 }}>体重</Text>
                </View>
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#1E2933' }}>
                  {safeToFixed(metrics?.currentWeight)}
                  <Text style={{ fontSize: 14, fontWeight: '400' }}> kg</Text>
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>目标{userInfo?.target_weight || 0}kg</Text>
                  <Text style={{ fontSize: 12, color: '#F26B3A', marginLeft: 6 }}>
                    差{safeToFixed(metrics?.weightDiff)}kg
                  </Text>
                </View>
              </View>
            </View>

            {/* Waist Card */}
            <View style={{ width: '50%', paddingHorizontal: 6 }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(60, 141, 110, 0.12)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <FontAwesome6 name="ruler-vertical" size={18} color="#3C8D6E" />
                  </View>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 10 }}>腰围</Text>
                </View>
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#1E2933' }}>
                  {safeToFixed(metrics?.currentWaist)}
                  <Text style={{ fontSize: 14, fontWeight: '400' }}> cm</Text>
                </Text>
                <View
                  style={{
                    backgroundColor: `${getLevelColor(metrics?.waistLevel || '')}15`,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    alignSelf: 'flex-start',
                    marginTop: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, color: getLevelColor(metrics?.waistLevel || ''), fontWeight: '500' }}>
                    {metrics?.waistLevel || '未知'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Row 2: BMI and Body Fat */}
          <View style={{ flexDirection: 'row', marginHorizontal: -6, marginBottom: 12 }}>
            {/* BMI Card */}
            <View style={{ width: '50%', paddingHorizontal: 6 }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: `${getBmiColor(metrics?.bmiLevel || '')}15`,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <FontAwesome6 name="chart-line" size={18} color={getBmiColor(metrics?.bmiLevel || '')} />
                  </View>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 10 }}>BMI</Text>
                </View>
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#1E2933' }}>
                  {safeToFixed(metrics?.bmi)}
                </Text>
                <View
                  style={{
                    backgroundColor: `${getBmiColor(metrics?.bmiLevel || '')}15`,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    alignSelf: 'flex-start',
                    marginTop: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, color: getBmiColor(metrics?.bmiLevel || ''), fontWeight: '500' }}>
                    {metrics?.bmiLevel || '未知'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Body Fat Rate Card */}
            <View style={{ width: '50%', paddingHorizontal: 6 }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <FontAwesome6 name="percent" size={18} color="#F59E0B" />
                  </View>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 10 }}>体脂率</Text>
                </View>
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#1E2933' }}>
                  {safeToFixed(metrics?.bodyFatRate)}
                  <Text style={{ fontSize: 14, fontWeight: '400' }}>%</Text>
                </Text>
                <View
                  style={{
                    backgroundColor: `${getLevelColor(metrics?.bodyFatLevel || '')}15`,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    alignSelf: 'flex-start',
                    marginTop: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, color: getLevelColor(metrics?.bodyFatLevel || ''), fontWeight: '500' }}>
                    {metrics?.bodyFatLevel || '未知'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Row 3: Health Score and Body Age */}
          <View style={{ flexDirection: 'row', marginHorizontal: -6, marginBottom: 12 }}>
            {/* Health Score Card */}
            <View style={{ width: '50%', paddingHorizontal: 6 }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(236, 72, 153, 0.12)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <FontAwesome6 name="heart" size={18} color="#EC4899" />
                  </View>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 10 }}>健康评分</Text>
                </View>
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#1E2933' }}>
                  {metrics?.healthScore?.total || 0}
                  <Text style={{ fontSize: 14, fontWeight: '400' }}> 分</Text>
                </Text>
                <View
                  style={{
                    backgroundColor: `${getScoreColor(metrics?.healthScore?.total || 0)}15`,
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    alignSelf: 'flex-start',
                    marginTop: 8,
                  }}
                >
                  <Text style={{ fontSize: 11, color: getScoreColor(metrics?.healthScore?.total || 0), fontWeight: '500' }}>
                    {metrics?.healthScore?.level || '一般'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Body Age Card */}
            <View style={{ width: '50%', paddingHorizontal: 6 }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(139, 92, 246, 0.12)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <FontAwesome6 name="clock" size={18} color="#8B5CF6" />
                  </View>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 10 }}>身体年龄</Text>
                </View>
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#1E2933' }}>
                  {metrics?.bodyAge || '--'}
                  <Text style={{ fontSize: 14, fontWeight: '400' }}> 岁</Text>
                </Text>
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 8 }}>
                  实际年龄{metrics?.realAge || '--'}岁
                </Text>
              </View>
            </View>
          </View>

          {/* Row 4: BMR and Body Type */}
          <View style={{ flexDirection: 'row', marginHorizontal: -6 }}>
            {/* BMR Card */}
            <View style={{ width: '50%', paddingHorizontal: 6 }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(60, 141, 110, 0.12)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <FontAwesome6 name="fire" size={18} color="#3C8D6E" />
                  </View>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 10 }}>基础代谢率</Text>
                </View>
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#1E2933' }}>
                  {metrics?.bmr || 1500}
                  <Text style={{ fontSize: 14, fontWeight: '400' }}> kcal</Text>
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                  Mifflin-St Jeor 公式
                </Text>
              </View>
            </View>

            {/* Body Type Card */}
            <View style={{ width: '50%', paddingHorizontal: 6 }}>
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 16,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: 'rgba(139, 92, 246, 0.12)',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <FontAwesome6 name="child" size={18} color="#8B5CF6" />
                  </View>
                  <Text style={{ fontSize: 14, color: '#6B7280', marginLeft: 10 }}>体型</Text>
                </View>
                <Text style={{ fontSize: 26, fontWeight: '700', color: '#1E2933' }}>
                  {metrics?.bodyType || '偏胖型'}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
                  根据腰围健康等级确定
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Weight Trend Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '600', color: '#1E2933' }}>
              体重趋势
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280' }}>近7天</Text>
          </View>

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            }}
          >
            {/* Current weight tag */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 12 }}>
              <View
                style={{
                  backgroundColor: '#F26B3A',
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '600' }}>
                  {safeToFixed(metrics?.currentWeight)}kg
                </Text>
              </View>
            </View>

            {/* Chart area */}
            <View style={{ minHeight: 180 }}>
              {trendData?.weightTrend && trendData.weightTrend.length > 0 ? (
                <LineChart
                  data={{
                    labels: trendData.weightTrend.map(p => formatDate(p.date)),
                    datasets: [{
                      data: trendData.weightTrend.map(p => p.weight),
                      color: (opacity = 1) => `rgba(242,107,58,${opacity})`,
                      strokeWidth: 2,
                    }],
                  }}
                  width={width - 72}
                  height={160}
                  yAxisSuffix="kg"
                  chartConfig={{
                    backgroundColor: '#FFFFFF',
                    backgroundGradientFrom: '#FFFFFF',
                    backgroundGradientTo: '#FFFFFF',
                    decimalCount: 1,
                    color: (opacity = 1) => `rgba(242,107,58,${opacity})`,
                    labelColor: () => '#9CA3AF',
                    style: { borderRadius: 12 },
                    propsForDots: { r: '4', strokeWidth: '2', stroke: '#F26B3A' },
                  }}
                  bezier
                  style={{ borderRadius: 12 }}
                />
              ) : (
                <View style={{ height: 160, justifyContent: 'center', alignItems: 'center' }}>
                  <FontAwesome6 name="chart-line" size={32} color="#CCCCCC" />
                  <Text style={{ color: '#9CA3AF', fontSize: 14, marginTop: 8 }}>暂无数据</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={{ paddingHorizontal: 20, marginBottom: 100 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1E2933', marginBottom: 12 }}>
            快速操作
          </Text>
          <View style={{ flexDirection: 'row', marginHorizontal: -6 }}>
            {/* Quick Check-in */}
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                marginHorizontal: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => router.push('/(tabs)/checkin')}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#F26B3A',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <FontAwesome6 name="check" size={22} color="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E2933' }}>一键打卡</Text>
            </TouchableOpacity>

            {/* View Data */}
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                marginHorizontal: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => router.push('/(tabs)/data')}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#3C8D6E',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <FontAwesome6 name="chart-bar" size={22} color="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E2933' }}>详细数据</Text>
            </TouchableOpacity>

            {/* Set Target */}
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                marginHorizontal: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
                alignItems: 'center',
              }}
              onPress={() => router.push('/edit-target')}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  backgroundColor: '#F59E0B',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 10,
                }}
              >
                <FontAwesome6 name="bullseye" size={22} color="#FFFFFF" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1E2933' }}>设置目标</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
