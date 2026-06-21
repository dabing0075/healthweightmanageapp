import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import WeightPlanModal from './WeightPlanModal';

const activityOptions = [
  { value: 'sedentary', label: '久坐办公室工作，几乎不运动', desc: '', factor: 1.2 },
  { value: 'light', label: '轻度活动', desc: '每周轻度运动1-3天', factor: 1.375 },
  { value: 'moderate', label: '中度活动', desc: '每周中度运动3-5天', factor: 1.55 },
  { value: 'active', label: '高度活动', desc: '每周高强度运动6-7天', factor: 1.725 },
  { value: 'veryActive', label: '极高活动', desc: '每日高强度运动+体力工作', factor: 1.9 },
];

const weeklyGoalOptions = [
  { value: 0.5, label: '温和减重', desc: '每周减重0.5公斤' },
  { value: 1, label: '激进减重', desc: '每周减重1公斤' },
];

interface UserProfile {
  birthDate: string;
  gender: 'male' | 'female';
  currentWeight: number;
  targetWeight: number;
  height: number;
  age: number;
  currentWaist: number;
  bodyAge: number;
}

interface WeightPlan {
  bmi: number;
  bodyFatRate: number;
  obesityLevel: string;
  bmr: number;
  tdee: number;
  bodyAge: number;
  dailyCalories: number;
  dailyDeficit: number;
  weeksToGoal: number;
  isGoalAchieved: boolean;
  weeklyGoal: number;
  activityLevel: string;
  currentWeight: number;
  targetWeight: number;
  // 页面展示用的扁平字段（从 macros 映射）
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
  // 嵌套结构（供 WeightPlanModal 使用）
  bodyComposition: {
    weight: number;
    fatMass: number;
    leanBodyMass: number;
    bodyWater: number;
    muscleMass: number;
    skeletalMuscle: number;
    boneMass: number;
    protein: number;
    visceralFat: number;
    visceralFatLevel: number;
  };
  healthAssessment: {
    visceralFatIndex: number;
    visceralFatLevel: number;
    bodyAge: number;
    healthScore: {
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
  };
  controlTargets: {
    idealWeight: number;
    idealFatMass: number;
    idealMuscleMass: number;
    weightControl: number;
    fatControl: number;
    muscleControl: number;
  };
  macros: {
    protein: number;
    proteinPercent: number;
    carbs: number;
    carbsPercent: number;
    fat: number;
    fatPercent: number;
    fiber: number;
    water: number;
  };
}

export default function WeightPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(0.5);
  const [activityLevel, setActivityLevel] = useState<string>('sedentary');
  const [weightPlan, setWeightPlan] = useState<WeightPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const API_BASE = 'http://localhost:9091';

  const fetchProfile = async () => {
    try {
      const [userRes, metricsRes, recordsRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/user/info`),
        fetch(`${API_BASE}/api/v1/health/metrics`),
        fetch(`${API_BASE}/api/v1/records/stats`),
      ]);

      const userData = await userRes.json();
      const metricsData = await metricsRes.json();
      const recordsData = await recordsRes.json();

      if (userData.code === 200 && userData.data) {
        const user = userData.data;
        const metrics = metricsData.data;
        const latestRecord = recordsData.data?.latest;

        let age = 25;
        if (user.birth_date) {
          const today = new Date();
          const birth = new Date(user.birth_date);
          age = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
        }

        const newProfile: UserProfile = {
          birthDate: user.birth_date || '1990-01-01',
          gender: user.gender as 'male' | 'female',
          height: user.height || 170,
          age,
          currentWeight: latestRecord?.weight || metrics?.currentWeight || 70,
          targetWeight: user.target_weight || 65,
          currentWaist: latestRecord?.waist || metrics?.currentWaist || 80,
          bodyAge: metrics?.bodyAge || age,
        };
        setProfile(newProfile);
        return newProfile;
      }
    } catch (error) {
      console.error('Fetch profile error:', error);
    }
    return null;
  };

  const calculatePlan = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/health/weight-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeklyGoal, activityLevel }),
      });
      const data = await res.json();

      if (data.code === 200 && data.data) {
        const serverData = data.data;
        const planWithWeights = {
          ...serverData,
          currentWeight: profile?.currentWeight || 70,
          targetWeight: profile?.targetWeight || 65,
          // 将 macros 扁平化供页面展示
          protein: serverData.macros?.protein || 0,
          carbs: serverData.macros?.carbs || 0,
          fat: serverData.macros?.fat || 0,
          fiber: serverData.macros?.fiber || 0,
          water: serverData.macros?.water || 0,
        };
        setWeightPlan(planWithWeights);
      }
    } catch (error) {
      console.error('Calculate plan error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    await calculatePlan();
    setShowPlanModal(true);
  };

  useFocusEffect(
    useCallback(() => {
      fetchProfile().then(() => {
        calculatePlan();
      });
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    await calculatePlan();
    setRefreshing(false);
  };

  const handleWeeklyGoalChange = (value: number) => {
    setWeeklyGoal(value);
    setTimeout(calculatePlan, 100);
  };

  const handleActivityChange = (value: string) => {
    setActivityLevel(value);
    setTimeout(calculatePlan, 100);
  };

  const weightDiff = profile ? (profile.currentWeight - profile.targetWeight).toFixed(1) : '0';

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
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#1E2933' }}>体重管理</Text>
        </View>

        {/* 我的基本信息卡片 */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBg, { backgroundColor: 'rgba(242, 107, 58, 0.1)' }]}>
                <FontAwesome6 name="bullseye" size={20} color="#F26B3A" />
              </View>
              <Text style={styles.cardTitle}>我的基本信息</Text>
            </View>

            {/* 体重信息区域 - 两列布局 */}
            <View style={styles.weightRow}>
              <View style={[styles.weightBox, { backgroundColor: '#F5F0E8' }]}>
                <Text style={styles.weightLabel}>当前体重</Text>
                <Text style={styles.weightValue}>{profile?.currentWeight || 0} kg</Text>
              </View>
              <View style={[styles.weightBox, { backgroundColor: 'rgba(60, 141, 110, 0.1)' }]}>
                <Text style={styles.weightLabel}>目标体重</Text>
                <Text style={[styles.weightValue, { color: '#3C8D6E' }]}>{profile?.targetWeight || 0} kg</Text>
              </View>
            </View>

            {/* 基本信息三列 */}
            <View style={styles.infoRow}>
              <View style={[styles.infoBox, { backgroundColor: '#F5F0E8' }]}>
                <Text style={styles.infoLabel}>身高</Text>
                <Text style={styles.infoValue}>{profile?.height || 0} cm</Text>
              </View>
              <View style={[styles.infoBox, { backgroundColor: '#F5F0E8' }]}>
                <Text style={styles.infoLabel}>年龄</Text>
                <Text style={styles.infoValue}>{profile?.age || 0} 岁</Text>
              </View>
              <View style={[styles.infoBox, { backgroundColor: '#F5F0E8' }]}>
                <Text style={styles.infoLabel}>性别</Text>
                <Text style={styles.infoValue}>{profile?.gender === 'male' ? '男' : '女'}</Text>
              </View>
            </View>

            {/* 需减重区域 */}
            <View style={[styles.weightDiffBox, { backgroundColor: 'rgba(244, 63, 94, 0.08)' }]}>
              <Text style={styles.weightDiffLabel}>需减重</Text>
              <Text style={styles.weightDiffValue}>{weightDiff} kg</Text>
            </View>
          </View>
        </View>

        {/* 每周减重目标卡片 */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBg, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
                <FontAwesome6 name="table-list" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.cardTitle}>每周减重目标</Text>
            </View>

            {weeklyGoalOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.radioOption,
                  weeklyGoal === option.value && styles.radioOptionSelected
                ]}
                onPress={() => handleWeeklyGoalChange(option.value)}
              >
                <View style={[
                  styles.radioCircle,
                  weeklyGoal === option.value && styles.radioCircleSelected
                ]}>
                  {weeklyGoal === option.value && <View style={styles.radioCircleInner} />}
                </View>
                <View style={styles.radioContent}>
                  <Text style={[
                    styles.radioLabel,
                    weeklyGoal === option.value && styles.radioLabelSelected
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={styles.radioDesc}>{option.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 活动水平卡片 */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconBg, { backgroundColor: 'rgba(60, 141, 110, 0.1)' }]}>
                <FontAwesome6 name="fire-flame-curved" size={20} color="#3C8D6E" />
              </View>
              <Text style={styles.cardTitle}>活动水平</Text>
            </View>

            {activityOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.radioOption,
                  activityLevel === option.value && styles.radioOptionGreen
                ]}
                onPress={() => handleActivityChange(option.value)}
              >
                <View style={[
                  styles.radioCircle,
                  activityLevel === option.value ? styles.radioCircleGreen : styles.radioCircleGray
                ]}>
                  {activityLevel === option.value && <View style={[styles.radioCircleInner, styles.radioCircleInnerGreen]} />}
                </View>
                <View style={styles.radioContent}>
                  <Text style={[
                    styles.radioLabel,
                    activityLevel === option.value ? styles.radioLabelGreen : styles.radioLabelDefault
                  ]}>
                    {option.label}
                  </Text>
                  {option.desc ? (
                    <Text style={styles.radioDesc}>{option.desc}</Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 计算结果 */}
        {weightPlan && (
          <View style={{ paddingHorizontal: 20, marginBottom: 100 }}>
            {/* Summary Card */}
            <View
              style={{
                backgroundColor: '#F26B3A',
                borderRadius: 20,
                padding: 20,
                marginBottom: 20,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <FontAwesome6 name="fire-flame-curved" size={24} color="#FFFFFF" />
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginLeft: 8 }}>
                  每日摄入目标
                </Text>
              </View>

              {weightPlan.isGoalAchieved ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <FontAwesome6 name="trophy" size={48} color="#FFFFFF" />
                  <Text style={{ fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginTop: 12 }}>
                    恭喜！目标已达成
                  </Text>
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 }}>
                    保持当前生活方式即可
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={{ fontSize: 48, fontWeight: '700', color: '#FFFFFF', textAlign: 'center' }}>
                    {weightPlan.dailyCalories}
                  </Text>
                  <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>
                    千卡/天
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      borderRadius: 12,
                      padding: 16,
                      marginTop: 16,
                    }}
                  >
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                        {weightPlan.weeksToGoal}
                      </Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>周后达标</Text>
                    </View>
                    <View
                      style={{
                        width: 1,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        marginVertical: 4,
                      }}
                    />
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                        {weightPlan.dailyDeficit}
                      </Text>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>每日缺口</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            {/* Macros Card */}
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 8,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginBottom: 16 }}>
                营养素建议
              </Text>

              <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(242, 107, 58, 0.1)',
                      borderRadius: 12,
                      padding: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#F26B3A' }}>
                      {weightPlan.protein}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>蛋白质(g)</Text>
                  </View>
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(60, 141, 110, 0.1)',
                      borderRadius: 12,
                      padding: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#3C8D6E' }}>
                      {weightPlan.carbs}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>碳水(g)</Text>
                  </View>
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      borderRadius: 12,
                      padding: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 24, fontWeight: '700', color: '#F59E0B' }}>
                      {weightPlan.fat}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 4 }}>脂肪(g)</Text>
                  </View>
                </View>
              </View>

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      borderRadius: 12,
                      padding: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#8B5CF6' }}>
                      {weightPlan.fiber}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>膳食纤维(g)</Text>
                  </View>
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      borderRadius: 12,
                      padding: 12,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 20, fontWeight: '700', color: '#3B82F6' }}>
                      {weightPlan.water}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>饮水量(ml)</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Metabolism Card */}
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
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginBottom: 16 }}>
                代谢指标
              </Text>

              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>BMI</Text>
                  <Text style={{ fontSize: 20, fontWeight: '600', color: '#1E2933', marginTop: 4 }}>
                    {weightPlan.bmi}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>体脂率</Text>
                  <Text style={{ fontSize: 20, fontWeight: '600', color: '#1E2933', marginTop: 4 }}>
                    {weightPlan.bodyFatRate}%
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>BMR</Text>
                  <Text style={{ fontSize: 20, fontWeight: '600', color: '#1E2933', marginTop: 4 }}>
                    {weightPlan.bmr}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>TDEE</Text>
                  <Text style={{ fontSize: 20, fontWeight: '600', color: '#1E2933', marginTop: 4 }}>
                    {weightPlan.tdee}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 生成减重方案按钮 */}
        <View style={{ paddingHorizontal: 20, marginBottom: 100 }}>
          <TouchableOpacity
            style={[styles.generateButton, loading && styles.generateButtonDisabled]}
            onPress={handleGeneratePlan}
            disabled={loading}
          >
            <Text style={styles.generateButtonText}>
              {loading ? '计算中...' : '生成减重方案'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <WeightPlanModal
        visible={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        weightPlan={weightPlan}
        profile={profile ? { gender: profile.gender, height: profile.height, age: profile.age, targetWeight: profile.targetWeight } : null}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E2933',
    marginLeft: 10,
  },
  weightRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  weightBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  weightLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  weightValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E2933',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoBox: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E2933',
  },
  weightDiffBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    padding: 12,
  },
  weightDiffLabel: {
    fontSize: 14,
    color: '#1E2933',
  },
  weightDiffValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F26B3A',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  radioOptionSelected: {
    borderColor: '#F26B3A',
    backgroundColor: 'rgba(242, 107, 58, 0.08)',
  },
  radioOptionGreen: {
    borderColor: '#3C8D6E',
    backgroundColor: 'rgba(60, 141, 110, 0.08)',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleSelected: {
    borderColor: '#F26B3A',
  },
  radioCircleGreen: {
    borderColor: '#3C8D6E',
  },
  radioCircleGray: {
    borderColor: '#D1D5DB',
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F26B3A',
  },
  radioCircleInnerGreen: {
    backgroundColor: '#3C8D6E',
  },
  radioContent: {
    marginLeft: 12,
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E2933',
  },
  radioLabelSelected: {
    color: '#F26B3A',
  },
  radioLabelGreen: {
    color: '#3C8D6E',
  },
  radioLabelDefault: {
    color: '#1E2933',
  },
  radioDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  generateButton: {
    backgroundColor: '#F26B3A',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

