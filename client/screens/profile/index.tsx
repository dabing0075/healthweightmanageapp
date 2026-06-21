import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';

interface UserProfile {
  id: string;
  nickname: string;
  avatar?: string;
  signature?: string;
  gender: 'male' | 'female';
  birthDate: string;
  age: number;
  height: number;
  targetWeight: number;
  targetWaist?: number;
  reminderTime?: string;
}

interface CheckInStats {
  totalDays: number;
  consecutiveDays: number;
  monthDays: number;
}

export default function ProfilePage() {
  const router = useSafeRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<CheckInStats>({ totalDays: 16, consecutiveDays: 0, monthDays: 6 });
  const [refreshing, setRefreshing] = useState(false);
  const [cacheSize] = useState('12.5 MB');

  const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

  const fetchProfile = async () => {
    try {
      // 使用 Promise.allSettled 确保即使一个请求失败，另一个也能正常工作
      const [profileRes, statsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/user/info`),
        fetch(`${API_BASE}/api/v1/records/stats`),
      ]);

      // 处理用户信息
      if (profileRes.status === 'fulfilled') {
        const profileData = await profileRes.value.json();
        if (profileData.code === 200 && profileData.data) {
          const user = profileData.data;
          
          // 计算年龄
          const calculateAgeFromBirth = (birthDate: string) => {
            if (!birthDate) return 36;
            const today = new Date();
            const birth = new Date(birthDate);
            let age = today.getFullYear() - birth.getFullYear();
            const monthDiff = today.getMonth() - birth.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
              age--;
            }
            return age;
          };
          
          setProfile({
            id: user.id,
            nickname: user.nickname || '逐浪大兵',
            avatar: user.avatar,
            signature: user.signature || '',
            gender: user.gender || 'male',
            birthDate: user.birth_date || '1990-01-01',
            age: calculateAgeFromBirth(user.birth_date),
            height: user.height || 175,
            targetWeight: user.target_weight || 70,
            targetWaist: user.target_waist || 80,
            reminderTime: user.reminder_time || '08:00',
          });
        }
      }

      // 处理统计数据
      if (statsRes.status === 'fulfilled') {
        const statsData = await statsRes.value.json();
        if (statsData.code === 200 && statsData.data) {
          setStats({
            totalDays: statsData.data.totalRecords || 0,
            consecutiveDays: statsData.data.consecutiveDays || 0,
            monthDays: statsData.data.monthRecords || 0,
          });
        }
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const getInitial = (name: string) => {
    return name ? name.charAt(0) : '逐';
  };

  const handleClearCache = () => {
    Alert.alert(
      '清除缓存',
      `确定要清除缓存吗？当前缓存大小：${cacheSize}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            Alert.alert('提示', '缓存已清除');
          },
        },
      ]
    );
  };

  const handleDataExport = () => {
    Alert.alert('数据导出', '正在准备导出您的健康数据...');
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
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#1E2933' }}>个人中心</Text>
            <TouchableOpacity
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: '#F5F5F5',
                justifyContent: 'center',
                alignItems: 'center',
              }}
              onPress={() => router.push('/settings')}
            >
              <FontAwesome6 name="gear" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* User Profile Header */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              padding: 20,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* Avatar with gradient */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#D4A574',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: '#8B7355',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 28, fontWeight: '700', color: '#FFFFFF' }}>
                    {getInitial(profile?.nickname || '逐')}
                  </Text>
                </View>
              </View>

              {/* User Info */}
              <View style={{ marginLeft: 16, flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: '600', color: '#1E2933' }}>
                  {profile?.nickname || '逐浪大兵'}
                </Text>
                <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 4 }}>
                  坚持打卡，健康生活
                </Text>
                {profile?.signature ? (
                  <Text style={{ fontSize: 13, color: '#6B7280', marginTop: 4, fontStyle: 'italic' }}>
                    "{profile.signature}"
                  </Text>
                ) : null}
              </View>

            </View>
          </View>
        </View>

        {/* Personal Info Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <FontAwesome6 name="user" size={16} color="#F26B3A" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E2933', marginLeft: 6 }}>
              个人信息
            </Text>
            <TouchableOpacity
              style={{ marginLeft: 'auto' }}
              onPress={() => router.push('/edit-profile', {})}
            >
              <Text style={{ fontSize: 13, color: '#F26B3A' }}>编辑</Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
            }}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {/* Name */}
              <TouchableOpacity style={{ width: '50%', paddingRight: 8, paddingBottom: 12 }} onPress={() => router.push('/edit-profile', { type: 'nickname', value: profile?.nickname || '' })}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>昵称</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginTop: 4 }}>
                    {profile?.nickname || '逐浪大兵'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Gender */}
              <TouchableOpacity style={{ width: '50%', paddingLeft: 8, paddingBottom: 12 }} onPress={() => router.push('/edit-profile', { type: 'gender', value: profile?.gender || 'male' })}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>性别</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginTop: 4 }}>
                    {profile?.gender === 'male' ? '男' : '女'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Age */}
              <TouchableOpacity style={{ width: '50%', paddingRight: 8 }} onPress={() => router.push('/edit-profile', { type: 'birthDate', value: profile?.birthDate || '1976-01-01' })}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>年龄</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginTop: 4 }}>
                    {profile?.age || 0} 岁
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Height */}
              <TouchableOpacity style={{ width: '50%', paddingLeft: 8 }} onPress={() => router.push('/edit-profile', { type: 'height', value: String(profile?.height || 179) })}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 8, padding: 12 }}>
                  <Text style={{ fontSize: 11, color: '#9CA3AF' }}>身高</Text>
                  <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginTop: 4 }}>
                    {profile?.height || 179} cm
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Check-in Records Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <FontAwesome6 name="calendar-check" size={16} color="#F26B3A" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E2933', marginLeft: 6 }}>
              打卡记录
            </Text>
          </View>

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
            }}
          >
            {/* Stats Row */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#F26B3A' }}>
                  {stats.totalDays}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>总打卡天数</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#3C8D6E' }}>
                  {stats.consecutiveDays}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>连续打卡</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 24, fontWeight: '700', color: '#3B82F6' }}>
                  {stats.monthDays}
                </Text>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>本月打卡</Text>
              </View>
            </View>

            {/* View All Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#F7F4ED',
                borderRadius: 8,
                paddingVertical: 12,
                alignItems: 'center',
              }}
              onPress={() => router.push('/data')}
            >
              <Text style={{ fontSize: 13, color: '#F26B3A' }}>
                查看全部记录 <FontAwesome6 name="chevron-right" size={10} color="#F26B3A" />
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Health Goals Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <FontAwesome6 name="bullseye" size={16} color="#F26B3A" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E2933', marginLeft: 6 }}>
              健康目标
            </Text>
            <TouchableOpacity
              style={{ marginLeft: 'auto' }}
              onPress={() => router.push('/edit-target')}
            >
              <Text style={{ fontSize: 13, color: '#F26B3A' }}>编辑</Text>
            </TouchableOpacity>
          </View>

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              padding: 16,
            }}
          >
            {[
              { label: '目标体重', value: `${profile?.targetWeight || 70} kg`, icon: 'weight-scale' },
              { label: '目标腰围', value: `${profile?.targetWaist || 80} cm`, icon: 'ruler-vertical' },
              { label: '提醒时间', value: `每日 ${profile?.reminderTime || '08:00'}`, icon: 'clock' },
            ].map((item, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: index < 2 ? 1 : 0,
                  borderBottomColor: '#F5F5F5',
                }}
              >
                <Text style={{ fontSize: 14, color: '#666666', flex: 1 }}>{item.label}</Text>
                <Text style={{ fontSize: 14, fontWeight: '500', color: '#1E2933' }}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tools & Settings Section */}
        <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <FontAwesome6 name="tools" size={16} color="#6B7280" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E2933', marginLeft: 6 }}>
              工具与设置
            </Text>
          </View>

          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {/* Data Export */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F5F5F5',
              }}
              onPress={handleDataExport}
            >
              <FontAwesome6 name="download" size={16} color="#9CA3AF" />
              <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, color: '#1E2933' }}>
                数据导出
              </Text>
              <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
            </TouchableOpacity>

            {/* About Us */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F5F5F5',
              }}
            >
              <FontAwesome6 name="info-circle" size={16} color="#9CA3AF" />
              <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, color: '#1E2933' }}>
                关于我们
              </Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginRight: 4 }}>v1.0.0</Text>
              <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Feedback */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F5F5F5',
              }}
              onPress={() => router.push('/feedback')}
            >
              <FontAwesome6 name="comment-dots" size={16} color="#9CA3AF" />
              <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, color: '#1E2933' }}>
                意见反馈
              </Text>
              <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Clear Cache */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 14,
                paddingHorizontal: 16,
              }}
              onPress={handleClearCache}
            >
              <FontAwesome6 name="trash-can" size={16} color="#9CA3AF" />
              <Text style={{ flex: 1, marginLeft: 12, fontSize: 14, color: '#1E2933' }}>
                清除缓存
              </Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF', marginRight: 4 }}>{cacheSize}</Text>
              <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Version Footer */}
        <View style={{ alignItems: 'center', paddingVertical: 20, marginBottom: 100 }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>体重管理助手 v1.0.0</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}
