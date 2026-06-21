import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// ============ 主题色 ============
const C = {
  primary: '#F26B3A',
  success: '#3C8D6E',
  warning: '#F59E0B',
  danger: '#EF4444',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  pink: '#EC4899',
  text: '#1E2933',
  muted: '#6B7280',
  light: '#9CA3AF',
  cream: '#F7F4ED',
  container: '#F0EDE6',
  border: '#E4DED2',
  cardBg: '#F8F6F2',
};

// ============ 类型 ============
interface WeightPlan {
  bmi: number;
  bodyFatRate: number;
  obesityLevel: string;
  bmr: number;
  tdee: number;
  bodyAge: number;
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
  dailyCalories: number;
  dailyDeficit: number;
  weeksToGoal: number;
  isGoalAchieved: boolean;
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
  weeklyGoal: number;
  activityLevel: string;
}

interface UserProfile {
  gender: 'male' | 'female';
  height: number;
  age: number;
  targetWeight: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  weightPlan: WeightPlan | null;
  profile: UserProfile | null;
}

// ============ 子组件：身体成分行（当前值 + 标准范围条）============
function CompBar({
  label,
  current,
  standard,
  unit,
  color,
}: {
  label: string;
  current: number;
  standard: number;
  unit: string;
  color: string;
}) {
  // 以标准值为中心，区间为标准的 70%~130%
  const lo = standard * 0.7;
  const hi = standard * 1.3;
  const range = hi - lo;
  const pct = Math.max(0, Math.min(100, ((current - lo) / range) * 100));
  const stdPct = ((standard - lo) / range) * 100;
  const isNormal = current >= standard * 0.85 && current <= standard * 1.15;

  return (
    <View style={styles.compRow}>
      <Text style={styles.compLabel}>{label}</Text>
      <View style={styles.compBarWrap}>
        <View style={styles.compBarBg}>
          {/* 标准区间 */}
          <View
            style={[styles.compBarStd, { left: `${stdPct - 8}%`, width: '16%' }]}
          />
          {/* 当前值指针 */}
          <View style={[styles.compBarFill, { width: `${pct}%`, backgroundColor: color }]} />
          <View style={[styles.compBarMark, { left: `${pct}%`, backgroundColor: color }]} />
        </View>
      </View>
      <View style={styles.compValues}>
        <Text style={[styles.compCurrent, { color }]}>{current.toFixed(1)}</Text>
        <Text style={styles.compStandard}>{standard.toFixed(1)}</Text>
      </View>
      <Text style={styles.compUnit}>{unit}</Text>
    </View>
  );
}

// ============ 子组件：肌肉脂肪分析条（低/标准/高 三段）============
function MuscleFatBar({
  label,
  value,
  lo,
  hi,
  unit,
  color,
}: {
  label: string;
  value: number;
  lo: number;
  hi: number;
  unit: string;
  color: string;
}) {
  const pct = Math.max(2, Math.min(98, ((value - lo) / (hi - lo)) * 100));
  return (
    <View style={styles.mfRow}>
      <Text style={styles.mfLabel}>{label}</Text>
      <View style={styles.mfBarWrap}>
        <View style={styles.mfBarBg}>
          <View style={[styles.mfSeg, { flex: 35, backgroundColor: '#BFDBFE' }]} />
          <View style={[styles.mfSeg, { flex: 30, backgroundColor: '#86EFAC' }]} />
          <View style={[styles.mfSeg, { flex: 35, backgroundColor: '#FCA5A5' }]} />
          <View style={[styles.mfMark, { left: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.mfValue}>{value.toFixed(1)}{unit}</Text>
      </View>
    </View>
  );
}

// ============ 子组件：肥胖等级条（多色段 + 指针）============
function ObesityLevelBar({
  label,
  value,
  segments,
  pointer,
  unit,
}: {
  label: string;
  value: number;
  segments: { label: string; flex: number; color: string }[];
  pointer: number; // 0-100
  unit: string;
}) {
  return (
    <View style={styles.obRow}>
      <View style={styles.obHeader}>
        <Text style={styles.obLabel}>{label}</Text>
        <Text style={styles.obValue}>
          {value.toFixed(1)}
          <Text style={styles.obUnit}>{unit}</Text>
        </Text>
      </View>
      <View style={styles.obBarBg}>
        {segments.map((seg, i) => (
          <View
            key={i}
            style={[styles.obSeg, { flex: seg.flex, backgroundColor: seg.color }]}
          >
            <Text style={styles.obSegText}>{seg.label}</Text>
          </View>
        ))}
        <View style={[styles.obMark, { left: `${Math.max(1, Math.min(99, pointer))}%` }]} />
      </View>
    </View>
  );
}

// ============ 子组件：健康评分进度条 ============
function ScoreProgress({ label, score, color }: { label: string; score: number; color: string }) {
  const pct = (score / 20) * 100;
  return (
    <View style={styles.spRow}>
      <Text style={styles.spLabel}>{label}</Text>
      <View style={styles.spBar}>
        <View style={[styles.spFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.spScore, { color }]}>{score}</Text>
    </View>
  );
}

// ============ 主组件 ============
export default function WeightPlanModal({ visible, onClose, weightPlan, profile }: Props) {
  if (!weightPlan || !profile) return null;

  const { gender, height, age } = profile;
  const isMale = gender === 'male';
  const bc = weightPlan.bodyComposition;
  const ct = weightPlan.controlTargets;
  const ha = weightPlan.healthAssessment;
  const macros = weightPlan.macros;

  // 使用用户设定的目标体重（优先）或公式计算的理想体重
  const targetWeight = profile.targetWeight || ct.idealWeight;
  // 按目标体重比例调整脂肪和肌肉控制量
  const weightRatio = targetWeight / ct.idealWeight;
  const targetFatMass = ct.idealFatMass * weightRatio;
  const targetMuscleMass = ct.idealMuscleMass * weightRatio;

  const weightControl = bc.weight - targetWeight;
  const fatControl = bc.fatMass - targetFatMass;
  const muscleControl = Math.max(0, targetMuscleMass - bc.skeletalMuscle);

  // 标准值（基于目标体重反推）
  const idealWeight = targetWeight;
  const idealLean = targetWeight - targetFatMass;
  const stdWater = idealLean * 0.735;
  const stdProtein = idealLean * 0.19;
  const stdBone = idealLean * (isMale ? 0.17 : 0.16);
  const stdSkeletalMuscle = targetMuscleMass;
  const stdLeanMass = idealLean;

  const weightToLose = (bc.weight - targetWeight).toFixed(1);

  // 评分色
  const scoreColor = (s: number) =>
    s >= 16 ? C.success : s >= 10 ? C.warning : C.danger;

  // 肥胖等级段（BMI）
  const bmiSegments = [
    { label: '偏瘦', flex: 25, color: '#60A5FA' },
    { label: '正常', flex: 30, color: '#4ADE80' },
    { label: '超重', flex: 20, color: '#FBBF24' },
    { label: '肥胖', flex: 25, color: '#F87171' },
  ];
  // BMI 指针位置（10~35 映射到 0~100）
  const bmiPointer = Math.max(0, Math.min(100, ((weightPlan.bmi - 10) / 25) * 100));

  // 体脂率段（按性别）
  const fatLo = isMale ? 5 : 10;
  const fatHi = isMale ? 35 : 40;
  const fatSegments = [
    { label: '偏低', flex: 30, color: '#60A5FA' },
    { label: '正常', flex: 30, color: '#4ADE80' },
    { label: '偏高', flex: 20, color: '#FBBF24' },
    { label: '高', flex: 20, color: '#F87171' },
  ];
  const fatPointer = Math.max(0, Math.min(100, ((weightPlan.bodyFatRate - fatLo) / (fatHi - fatLo)) * 100));

  // 内脏脂肪等级段（1~20）
  const vfaSegments = [
    { label: '正常', flex: 50, color: '#4ADE80' },
    { label: '偏高', flex: 25, color: '#FBBF24' },
    { label: '高', flex: 25, color: '#F87171' },
  ];
  const vfaPointer = Math.max(0, Math.min(100, ((ha.visceralFatLevel - 1) / 19) * 100));

  const scoreTotal = ha.healthScore.total;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <FontAwesome6 name="file-medical" size={20} color="#FFFFFF" />
              <Text style={styles.headerTitle}>减重方案 · 身体成分报告</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <FontAwesome6 name="xmark" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* ===== 方案概览 ===== */}
            <View style={styles.section}>
              <SectionTitle icon="clipboard-list" text="方案概览" />
              <View style={styles.overviewCard}>
                <View style={styles.overviewBadge}>
                  <FontAwesome6 name="calendar-week" size={12} color="#FFFFFF" />
                  <Text style={styles.overviewBadgeText}>
                    预计 {weightPlan.weeksToGoal || 0} 周达成
                  </Text>
                </View>
                <View style={styles.overviewStats}>
                  <View style={styles.overviewStat}>
                    <Text style={styles.overviewStatValue}>{bc.weight}</Text>
                    <Text style={styles.overviewStatLabel}>起始(kg)</Text>
                  </View>
                  <FontAwesome6 name="arrow-right" size={16} color={C.light} />
                  <View style={styles.overviewStat}>
                    <Text style={[styles.overviewStatValue, { color: C.success }]}>
                      {idealWeight}
                    </Text>
                    <Text style={styles.overviewStatLabel}>目标(kg)</Text>
                  </View>
                  <View style={styles.overviewDivider} />
                  <View style={styles.overviewStat}>
                    <Text style={[styles.overviewStatValue, { color: C.danger }]}>
                      {weightToLose}
                    </Text>
                    <Text style={styles.overviewStatLabel}>需减(kg)</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ===== 健康总评 ===== */}
            <View style={styles.section}>
              <SectionTitle icon="heart-pulse" text="健康总评" />
              <View style={styles.scoreHeroCard}>
                <View style={styles.scoreHeroLeft}>
                  <Text style={[styles.scoreHeroValue, { color: scoreColor(Math.round(scoreTotal / 5)) }]}>
                    {scoreTotal}
                  </Text>
                  <Text style={styles.scoreHeroUnit}>分 / 100</Text>
                </View>
                <View style={styles.scoreHeroRight}>
                  <View style={[styles.levelTag, { backgroundColor: `${scoreColor(Math.round(scoreTotal / 5))}20` }]}>
                    <Text style={[styles.levelTagText, { color: scoreColor(Math.round(scoreTotal / 5)) }]}>
                      {ha.healthScore.level}
                    </Text>
                  </View>
                  <View style={styles.bodyAgeBox}>
                    <Text style={styles.bodyAgeTitle}>身体年龄</Text>
                    <View style={styles.bodyAgeRow}>
                      <Text style={[styles.bodyAgeValue, { color: ha.bodyAge <= age ? C.success : C.warning }]}>
                        {ha.bodyAge}
                      </Text>
                      <Text style={styles.bodyAgeReal}>实际 {age} 岁</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ===== 人体成分分析 ===== */}
            <View style={styles.section}>
              <SectionTitle icon="chart-pie" text="人体成分分析" />
              <View style={styles.card}>
                <View style={styles.compHeader}>
                  <Text style={[styles.compHeadText, { flex: 1 }]}>指标</Text>
                  <Text style={[styles.compHeadText, { width: 100 }]}>当前 / 标准</Text>
                  <Text style={[styles.compHeadText, { width: 30 }]}>单位</Text>
                </View>
                <CompBar label="体重" current={bc.weight} standard={idealWeight} unit="kg" color={C.primary} />
                <CompBar label="水分" current={bc.bodyWater} standard={stdWater} unit="kg" color={C.blue} />
                <CompBar label="蛋白质" current={bc.protein} standard={stdProtein} unit="kg" color={C.purple} />
                <CompBar label="骨矿物质" current={bc.boneMass} standard={stdBone} unit="kg" color={C.pink} />
                <CompBar label="体脂肪" current={bc.fatMass} standard={ct.idealFatMass} unit="kg" color={C.warning} />
                <CompBar label="去脂体重" current={bc.leanBodyMass} standard={stdLeanMass} unit="kg" color={C.success} />
                <CompBar label="骨骼肌" current={bc.skeletalMuscle} standard={stdSkeletalMuscle} unit="kg" color={C.danger} />
              </View>
            </View>

            {/* ===== 肌肉脂肪分析 ===== */}
            <View style={styles.section}>
              <SectionTitle icon="dumbbell" text="肌肉脂肪分析" />
              <View style={styles.card}>
                <MuscleFatBar label="体重" value={bc.weight} lo={idealWeight * 0.8} hi={idealWeight * 1.3} unit="kg" color={C.primary} />
                <MuscleFatBar label="骨骼肌" value={bc.skeletalMuscle} lo={stdSkeletalMuscle * 0.7} hi={stdSkeletalMuscle * 1.3} unit="kg" color={C.success} />
                <MuscleFatBar label="体脂肪" value={bc.fatMass} lo={ct.idealFatMass * 0.5} hi={ct.idealFatMass * 2.5} unit="kg" color={C.warning} />
                <View style={styles.mfLegend}>
                  <View style={styles.mfLegendItem}>
                    <View style={[styles.mfLegendDot, { backgroundColor: '#BFDBFE' }]} />
                    <Text style={styles.mfLegendText}>偏低</Text>
                  </View>
                  <View style={styles.mfLegendItem}>
                    <View style={[styles.mfLegendDot, { backgroundColor: '#86EFAC' }]} />
                    <Text style={styles.mfLegendText}>标准</Text>
                  </View>
                  <View style={styles.mfLegendItem}>
                    <View style={[styles.mfLegendDot, { backgroundColor: '#FCA5A5' }]} />
                    <Text style={styles.mfLegendText}>偏高</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ===== 肥胖分析 ===== */}
            <View style={styles.section}>
              <SectionTitle icon="weight-scale" text="肥胖分析" />
              <View style={styles.card}>
                <ObesityLevelBar
                  label="BMI"
                  value={weightPlan.bmi}
                  segments={bmiSegments}
                  pointer={bmiPointer}
                  unit=" kg/m²"
                />
                <ObesityLevelBar
                  label="体脂率"
                  value={weightPlan.bodyFatRate}
                  segments={fatSegments}
                  pointer={fatPointer}
                  unit="%"
                />
                <ObesityLevelBar
                  label="内脏脂肪等级"
                  value={ha.visceralFatLevel}
                  segments={vfaSegments}
                  pointer={vfaPointer}
                  unit=" 级"
                />
              </View>
            </View>

            {/* ===== 健康评分明细 ===== */}
            <View style={styles.section}>
              <SectionTitle icon="star" text="健康评分明细" />
              <View style={styles.card}>
                <ScoreProgress label="BMI指数" score={ha.healthScore.breakdown.bmi} color={scoreColor(ha.healthScore.breakdown.bmi)} />
                <ScoreProgress label="腰围" score={ha.healthScore.breakdown.waist} color={scoreColor(ha.healthScore.breakdown.waist)} />
                <ScoreProgress label="体脂率" score={ha.healthScore.breakdown.bodyFat} color={scoreColor(ha.healthScore.breakdown.bodyFat)} />
                <ScoreProgress label="骨骼肌肉率" score={ha.healthScore.breakdown.muscle} color={scoreColor(ha.healthScore.breakdown.muscle)} />
                <ScoreProgress label="身体年龄差" score={ha.healthScore.breakdown.bodyAge} color={scoreColor(ha.healthScore.breakdown.bodyAge)} />
                <View style={styles.scoreTotalRow}>
                  <Text style={styles.scoreTotalLabel}>健康总分</Text>
                  <Text style={[styles.scoreTotalValue, { color: scoreColor(Math.round(scoreTotal / 5)) }]}>
                    {scoreTotal} 分
                  </Text>
                </View>
              </View>
            </View>

            {/* ===== 体重控制目标 ===== */}
            <View style={styles.section}>
              <SectionTitle icon="bullseye" text="体重控制目标" />
              <View style={styles.controlGrid}>
                <View style={[styles.controlBox, { backgroundColor: `${C.success}15` }]}>
                  <View style={styles.controlBoxInner}>
                    <Text style={styles.controlLabel}>理想体重</Text>
                    <Text style={[styles.controlValue, { color: C.success }]}>{idealWeight} kg</Text>
                  </View>
                </View>
                <View style={[styles.controlBox, { backgroundColor: `${C.primary}15` }]}>
                  <View style={styles.controlBoxInner}>
                    <Text style={styles.controlLabel}>体重控制</Text>
                    <Text style={[styles.controlValue, { color: C.primary }]}>
                      {weightControl > 0 ? `需减 ${Math.abs(weightControl).toFixed(1)} kg` : weightControl < 0 ? `需增 ${Math.abs(weightControl).toFixed(1)} kg` : '维持'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.controlBox, { backgroundColor: `${C.warning}15` }]}>
                  <View style={styles.controlBoxInner}>
                    <Text style={styles.controlLabel}>脂肪控制</Text>
                    <Text style={[styles.controlValue, { color: C.warning }]}>
                      {fatControl > 0 ? `需减 ${Math.abs(fatControl).toFixed(1)} kg` : fatControl < 0 ? `需增 ${Math.abs(fatControl).toFixed(1)} kg` : '维持'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.controlBox, { backgroundColor: `${C.purple}15` }]}>
                  <View style={styles.controlBoxInner}>
                    <Text style={styles.controlLabel}>肌肉控制</Text>
                    <Text style={[styles.controlValue, { color: C.purple }]}>
                      {muscleControl > 0 ? `需增 ${Math.abs(muscleControl).toFixed(1)} kg` : muscleControl < 0 ? `需减 ${Math.abs(muscleControl).toFixed(1)} kg` : '维持'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ===== 每日热量目标 ===== */}
            <View style={styles.section}>
              <SectionTitle icon="fire-flame-curved" text="每日热量目标" />
              <View style={styles.calorieCard}>
                <View style={styles.calorieMain}>
                  <Text style={styles.calorieValue}>{weightPlan.dailyCalories}</Text>
                  <Text style={styles.calorieUnit}>千卡 / 天</Text>
                </View>
                <View style={styles.calorieBreakdown}>
                  <View style={styles.calorieItem}>
                    <View style={[styles.calorieIcon, { backgroundColor: `${C.blue}20` }]}>
                      <FontAwesome6 name="fire" size={14} color={C.blue} />
                    </View>
                    <Text style={styles.calorieItemValue}>{weightPlan.tdee}</Text>
                    <Text style={styles.calorieItemLabel}>日消耗TDEE</Text>
                  </View>
                  <View style={styles.calorieItem}>
                    <View style={[styles.calorieIcon, { backgroundColor: `${C.danger}20` }]}>
                      <FontAwesome6 name="minus" size={14} color={C.danger} />
                    </View>
                    <Text style={[styles.calorieItemValue, { color: C.danger }]}>
                      -{weightPlan.dailyDeficit}
                    </Text>
                    <Text style={styles.calorieItemLabel}>热量缺口</Text>
                  </View>
                  <View style={styles.calorieItem}>
                    <View style={[styles.calorieIcon, { backgroundColor: `${C.success}20` }]}>
                      <FontAwesome6 name="utensils" size={14} color={C.success} />
                    </View>
                    <Text style={[styles.calorieItemValue, { color: C.success }]}>
                      {weightPlan.dailyCalories}
                    </Text>
                    <Text style={styles.calorieItemLabel}>建议摄入</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ===== 每日营养配比 ===== */}
            <View style={styles.section}>
              <SectionTitle icon="chart-pie" text="每日营养配比" />
              <View style={styles.card}>
                <MacroRow icon="drumstick-bite" color={C.warning} label="蛋白质" grams={`${macros.protein}g`} percent={macros.proteinPercent}
                  foods="鸡胸肉、鸡蛋、鱼虾、瘦牛肉、豆腐、牛奶、蛋白粉" />
                <MacroRow icon="bread-slice" color={C.blue} label="碳水化合物" grams={`${macros.carbs}g`} percent={macros.carbsPercent}
                  foods="糙米、燕麦、红薯、全麦面包、荞麦面、玉米、藜麦" />
                <MacroRow icon="oil-can" color={C.primary} label="健康脂肪" grams={`${macros.fat}g`} percent={macros.fatPercent}
                  foods="坚果、牛油果、橄榄油、亚麻籽油、深海鱼、奇亚籽" />
                <MacroRow icon="leaf" color={C.success} label="膳食纤维" grams="25-30g" suffix="/天"
                  foods="绿叶蔬菜、西兰花、胡萝卜、苹果、燕麦麸、豆类、菌菇" />
                <View style={styles.waterRow}>
                  <View style={[styles.macroIcon, { backgroundColor: `${C.blue}20` }]}>
                    <FontAwesome6 name="glass-water" size={16} color={C.blue} />
                  </View>
                  <View style={[styles.macroInfo, { width: 180 }]}>
                    <Text style={styles.macroValue}>{macros.water} ml</Text>
                    <Text style={styles.macroLabel} numberOfLines={1}>每日饮水量（体重×30ml）</Text>
                  </View>
                  <View style={{ flex: 1 }} />
                </View>
                <Text style={styles.macroFoods}>
                  <Text style={styles.macroFoodsLabel}>推荐：</Text>白开水、淡茶水、柠檬水，少量多次，饭前1杯有助控制食量
                </Text>
              </View>
            </View>

            {/* ===== 减重周期 ===== */}
            <View style={styles.section}>
              <SectionTitle icon="calendar-check" text="减重周期" />
              <View style={styles.periodCard}>
                <View style={styles.periodItem}>
                  <FontAwesome6 name="flag-checkered" size={20} color={C.primary} />
                  <Text style={styles.periodValue}>{weightPlan.weeksToGoal || 0}</Text>
                  <Text style={styles.periodLabel}>周</Text>
                </View>
                <View style={styles.periodDivider} />
                <View style={styles.periodItem}>
                  <FontAwesome6 name="calendar-day" size={20} color={C.success} />
                  <Text style={styles.periodValue}>{((weightPlan.weeksToGoal || 0) * 7)}</Text>
                  <Text style={styles.periodLabel}>天</Text>
                </View>
                <View style={styles.periodDivider} />
                <View style={styles.periodItem}>
                  <FontAwesome6 name="bucket" size={20} color={C.warning} />
                  <Text style={styles.periodValue}>{weightPlan.weeklyGoal}</Text>
                  <Text style={styles.periodLabel}>kg/周</Text>
                </View>
              </View>
            </View>

            {/* ===== 健康提示 ===== */}
            <View style={styles.section}>
              <SectionTitle icon="lightbulb" text="健康提示" />
              <View style={styles.card}>
                <AdviceItem icon="glass-water" color={C.blue} title="足量饮水"
                  text={`每日饮水 ${macros.water}ml（约${Math.round(macros.water / 250)}杯），少量多次饮用，饭前1杯水有助于控制食量。`} />
                <AdviceItem icon="fire-flame-curved" color={C.warning} title="热量控制"
                  text={`维持当前体重每日需摄入约 ${weightPlan.tdee} 千卡；减重期间建议每日热量缺口 300-500 千卡，避免过度节食。`} />
                <AdviceItem icon="oil-can" color={C.purple} title="优质脂肪摄入"
                  text="选择不饱和脂肪酸来源：坚果、牛油果、橄榄油、亚麻籽油、深海鱼。避免反式脂肪（油炸食品、人造奶油）。" />
                <AdviceItem icon="person-walking" color={C.success} title="规律运动"
                  text={`每周进行 ${weightPlan.weeklyGoal >= 1 ? '5-6' : '3-4'} 次有氧运动（快走、慢跑、游泳、骑行），每次 30-60 分钟；结合力量训练增加肌肉量，提高基础代谢。`} />
                <AdviceItem icon="clock" color={C.pink} title="充足睡眠"
                  text="每天保证 7-8 小时优质睡眠。睡眠不足会导致瘦素下降、饥饿素上升，增加肥胖风险。" />
                <AdviceItem icon="bowl-food" color={C.primary} title="均衡饮食"
                  text="三餐定时定量，早餐吃好、午餐吃饱、晚餐吃少。细嚼慢咽，每餐进食时间不少于 20 分钟。" />
              </View>
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ============ 区块标题 ============
function SectionTitle({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <FontAwesome6 name={icon as any} size={14} color={C.primary} />
      <Text style={styles.sectionTitle}>{text}</Text>
    </View>
  );
}

// ============ 营养行 ============
function MacroRow({
  icon,
  color,
  label,
  grams,
  percent,
  suffix,
  foods,
}: {
  icon: string;
  color: string;
  label: string;
  grams: string;
  percent?: number;
  suffix?: string;
  foods?: string;
}) {
  return (
    <View style={styles.macroRowWrap}>
      <View style={styles.macroRow}>
        <View style={[styles.macroIcon, { backgroundColor: `${color}20` }]}>
          <FontAwesome6 name={icon as any} size={16} color={color} />
        </View>
        <View style={styles.macroInfo}>
          <Text style={styles.macroValue}>{grams}{suffix || ''}</Text>
          <Text style={styles.macroLabel}>{label}</Text>
        </View>
        {percent != null && (
          <>
            <View style={styles.macroBar}>
              <View style={[styles.macroBarFill, { width: `${Math.max(4, Math.min(100, percent))}%`, backgroundColor: color }]} />
            </View>
            <Text style={[styles.macroPercent, { color }]}>{percent}%</Text>
          </>
        )}
      </View>
      {foods && (
        <Text style={styles.macroFoods}>
          <Text style={styles.macroFoodsLabel}>推荐食物：</Text>{foods}
        </Text>
      )}
    </View>
  );
}

// ============ 建议项 ============
function AdviceItem({
  icon,
  color,
  title,
  text,
}: {
  icon: string;
  color: string;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.adviceItem}>
      <View style={[styles.adviceIcon, { backgroundColor: `${color}20` }]}>
        <FontAwesome6 name={icon as any} size={16} color={color} />
      </View>
      <View style={styles.adviceContent}>
        <Text style={styles.adviceTitle}>{title}</Text>
        <Text style={styles.adviceText}>{text}</Text>
      </View>
    </View>
  );
}

// ============ 样式 ============
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    width: '100%',
    height: '94%',
    backgroundColor: C.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: C.primary,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 10,
  },
  closeBtn: {
    padding: 6,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
    marginLeft: 6,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
  },

  // 方案概览
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  overviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: C.success,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  overviewBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  overviewStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  overviewStat: {
    alignItems: 'center',
  },
  overviewStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: C.text,
  },
  overviewStatLabel: {
    fontSize: 11,
    color: C.light,
    marginTop: 4,
  },
  overviewDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.border,
  },

  // 健康总评
  scoreHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreHeroLeft: {
    alignItems: 'center',
    paddingRight: 18,
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  scoreHeroValue: {
    fontSize: 44,
    fontWeight: '800',
  },
  scoreHeroUnit: {
    fontSize: 11,
    color: C.light,
    marginTop: 2,
  },
  scoreHeroRight: {
    flex: 1,
    paddingLeft: 18,
  },
  levelTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginBottom: 12,
  },
  levelTagText: {
    fontSize: 13,
    fontWeight: '700',
  },
  bodyAgeBox: {},
  bodyAgeTitle: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 4,
  },
  bodyAgeRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bodyAgeValue: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 8,
  },
  bodyAgeReal: {
    fontSize: 12,
    color: C.light,
  },

  // 人体成分
  compHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  compHeadText: {
    fontSize: 11,
    color: C.light,
    fontWeight: '600',
  },
  compRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },
  compLabel: {
    flex: 1,
    fontSize: 13,
    color: C.text,
  },
  compBarWrap: {
    width: 100,
    marginRight: 8,
  },
  compBarBg: {
    height: 8,
    backgroundColor: C.container,
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  compBarStd: {
    position: 'absolute',
    top: 0,
    height: '100%',
    backgroundColor: `${C.success}40`,
    borderRadius: 4,
  },
  compBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    borderRadius: 4,
    opacity: 0.25,
  },
  compBarMark: {
    position: 'absolute',
    top: -2,
    width: 3,
    height: 12,
    borderRadius: 2,
    transform: [{ translateX: -1.5 }],
  },
  compValues: {
    width: 100,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  compCurrent: {
    fontSize: 13,
    fontWeight: '700',
  },
  compStandard: {
    fontSize: 11,
    color: C.light,
    marginLeft: 4,
  },
  compUnit: {
    width: 30,
    fontSize: 11,
    color: C.light,
    textAlign: 'right',
  },

  // 肌肉脂肪
  mfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  mfLabel: {
    width: 56,
    fontSize: 13,
    color: C.text,
  },
  mfBarWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mfBarBg: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
    marginRight: 10,
    position: 'relative',
  },
  mfSeg: {
    height: '100%',
  },
  mfMark: {
    position: 'absolute',
    top: -3,
    width: 3,
    height: 16,
    borderRadius: 2,
    transform: [{ translateX: -1.5 }],
  },
  mfValue: {
    fontSize: 12,
    fontWeight: '600',
    color: C.text,
    width: 56,
    textAlign: 'right',
  },
  mfLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
    gap: 16,
  },
  mfLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mfLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  mfLegendText: {
    fontSize: 11,
    color: C.muted,
  },

  // 肥胖分析
  obRow: {
    paddingVertical: 10,
  },
  obHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  obLabel: {
    fontSize: 13,
    color: C.text,
  },
  obValue: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  obUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: C.light,
  },
  obBarBg: {
    height: 16,
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    position: 'relative',
  },
  obSeg: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  obSegText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  obMark: {
    position: 'absolute',
    top: -3,
    width: 3,
    height: 22,
    backgroundColor: C.text,
    borderRadius: 2,
    transform: [{ translateX: -1.5 }],
  },

  // 健康评分明细
  spRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  spLabel: {
    width: 90,
    fontSize: 13,
    color: C.muted,
  },
  spBar: {
    flex: 1,
    height: 8,
    backgroundColor: C.container,
    borderRadius: 4,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  spFill: {
    height: '100%',
    borderRadius: 4,
  },
  spScore: {
    width: 28,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  scoreTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  scoreTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  scoreTotalValue: {
    fontSize: 18,
    fontWeight: '800',
  },

  // 体重控制
  controlGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  controlBox: {
    width: '50%',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  controlBoxInner: {
    borderRadius: 12,
    padding: 14,
  },
  controlLabel: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 4,
  },
  controlValue: {
    fontSize: 20,
    fontWeight: '700',
  },

  // 热量
  calorieCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: `${C.warning}30`,
  },
  calorieMain: {
    alignItems: 'center',
    marginBottom: 16,
  },
  calorieValue: {
    fontSize: 40,
    fontWeight: '800',
    color: C.warning,
  },
  calorieUnit: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
  },
  calorieBreakdown: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  calorieItem: {
    alignItems: 'center',
  },
  calorieIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  calorieItemValue: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  calorieItemLabel: {
    fontSize: 10,
    color: C.light,
    marginTop: 2,
  },

  // 营养
  macroRowWrap: {
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroFoods: {
    fontSize: 11,
    color: C.muted,
    marginTop: 6,
    marginLeft: 46,
    lineHeight: 17,
  },
  macroFoodsLabel: {
    fontWeight: '600',
    color: C.text,
  },
  macroIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  macroInfo: {
    width: 90,
  },
  macroValue: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text,
  },
  macroLabel: {
    fontSize: 11,
    color: C.light,
    marginTop: 1,
  },
  macroBar: {
    flex: 1,
    height: 7,
    backgroundColor: C.container,
    borderRadius: 4,
    overflow: 'hidden',
    marginHorizontal: 10,
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  macroPercent: {
    width: 38,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  waterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    marginTop: 4,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  // 减重周期
  periodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  periodItem: {
    alignItems: 'center',
  },
  periodValue: {
    fontSize: 22,
    fontWeight: '800',
    color: C.text,
    marginTop: 6,
  },
  periodLabel: {
    fontSize: 11,
    color: C.light,
    marginTop: 2,
  },
  periodDivider: {
    width: 1,
    height: 40,
    backgroundColor: C.border,
  },

  // 建议
  adviceItem: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  adviceIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  adviceContent: {
    flex: 1,
  },
  adviceTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.text,
  },
  adviceText: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3,
    lineHeight: 18,
  },
});
