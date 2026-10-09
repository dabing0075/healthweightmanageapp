import { useState, useCallback, useMemo } from 'react';
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
import { safeToFixed, safeNumber, apiFetch } from '@/utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Record {
  id: string;
  record_date: string;
  weight: number;
  waist: number;
  note?: string;
}

interface HealthMetrics {
  currentWeight: number;
  targetWeight?: number;
  weightDiff?: number;
  currentWaist: number;
  targetWaist?: number;
  waistDiff?: number;
  bmi: number;
  bmiLevel: string;
  bodyFatRate: number;
  bodyFatLevel: string;
  healthScore: {
    total: number;
    level: string;
    breakdown: { bmi: number; waist: number; bodyFat: number; muscle: number; bodyAge: number };
  };
  bodyAge: number;
  realAge: number;
  bmr: number;
  bodyType: string;
  fatMass: number;
  leanBodyMass: number;
  waterWeight: number;
  muscleMass: number;
  skeletalMuscle: number;
  boneMass: number;
  proteinMass: number;
  vfa: number;
  vfiLevel: number;
  waistLevel: string;
}

interface UserProfile {
  height: number;
  birth_date: string;
  gender: string;
}

type TimeRange = 'week' | 'month' | 'quarter' | 'all';

const TIME_RANGE_DAYS: Record<TimeRange, number> = {
  week: 7, month: 30, quarter: 90, all: 36500,
};

export default function DataPage() {
  const [records, setRecords] = useState<Record[]>([]);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [recordsData, metricsData, userData] = await Promise.all([
        apiFetch('/api/v1/records/history?days=36500'),
        apiFetch('/api/v1/health/metrics'),
        apiFetch('/api/v1/user/info'),
      ]);
      if (recordsData.code === 200) setRecords(recordsData.data || []);
      if (metricsData.code === 200) setMetrics(metricsData.data || null);
      if (userData.code === 200) setUserProfile(userData.data || null);
    } catch (error) {
      console.warn('Fetch data error (network may be unavailable):', (error as Error)?.message);
    }
  };

  useFocusEffect(useCallback(() => { fetchData(); }, []));

  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  // ---------- user params ----------
  const userParams = useMemo(() => {
    const H = userProfile?.height || 170;
    const birthDate = userProfile?.birth_date;
    const AGE = birthDate
      ? (() => { const t=new Date(),b=new Date(birthDate); let a=t.getFullYear()-b.getFullYear(); const m=t.getMonth()-b.getMonth(); if(m<0||(m===0&&t.getDate()<b.getDate())) a--; return a; })()
      : 30;
    const isMale = userProfile?.gender !== 'female';
    return { H, AGE, isMale, H_M: H / 100 };
  }, [userProfile]);

  // ---------- filtered records ----------
  const filteredRecords = useMemo(() => {
    if (!records.length) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - TIME_RANGE_DAYS[timeRange]);
    return [...records]
      .filter(r => new Date(r.record_date) >= cutoff)
      .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
  }, [records, timeRange]);

  // ---------- stats ----------
  const stats = useMemo(() => {
    if (filteredRecords.length === 0) {
      return { avgWeight: 0, stdWeight: 0, maxWeight: 0, maxWeightDate: '', minWeight: 0, minWeightDate: '',
               avgWaist: 0, stdWaist: 0, maxWaist: 0, maxWaistDate: '', minWaist: 0, minWaistDate: '' };
    }
    const w = filteredRecords.map(r => r.weight);
    const wi = filteredRecords.map(r => r.waist);
    const aw = w.reduce((a, b) => a + b, 0) / w.length;
    const awi = wi.reduce((a, b) => a + b, 0) / wi.length;
    const sw = Math.sqrt(w.reduce((a, b) => a + Math.pow(b - aw, 2), 0) / w.length);
    const swi = Math.sqrt(wi.reduce((a, b) => a + Math.pow(b - awi, 2), 0) / wi.length);
    const maxW = Math.max(...w), minW = Math.min(...w);
    const maxWi = Math.max(...wi), minWi = Math.min(...wi);
    const fmt = (d: string) => { const dt = new Date(d); return `${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`; };
    const maxWr = filteredRecords.find(r => r.weight === maxW)!;
    const minWr = filteredRecords.find(r => r.weight === minW)!;
    const maxWir = filteredRecords.find(r => r.waist === maxWi)!;
    const minWir = filteredRecords.find(r => r.waist === minWi)!;
    return { avgWeight: aw, stdWeight: sw, maxWeight: maxW, maxWeightDate: fmt(maxWr.record_date),
             minWeight: minW, minWeightDate: fmt(minWr.record_date),
             avgWaist: awi, stdWaist: swi, maxWaist: maxWi, maxWaistDate: fmt(maxWir.record_date),
             minWaist: minWi, minWaistDate: fmt(minWir.record_date) };
  }, [filteredRecords]);

  // ---------- trend stats ----------
  const trendStats = useMemo(() => {
    if (filteredRecords.length === 0) return { wStart: 0, wEnd: 0, wChg: 0, wRate: 0, wiStart: 0, wiEnd: 0, wiChg: 0, wiRate: 0 };
    const f = filteredRecords[filteredRecords.length - 1];
    const l = filteredRecords[0];
    const wc = l.weight - f.weight, wic = l.waist - f.waist;
    return { wStart: f.weight, wEnd: l.weight, wChg: wc, wRate: f.weight > 0 ? (wc/f.weight)*100 : 0,
             wiStart: f.waist, wiEnd: l.waist, wiChg: wic, wiRate: f.waist > 0 ? (wic/f.waist)*100 : 0 };
  }, [filteredRecords]);

  // ---------- chart data ----------
  const chartData = useMemo(() => {
    if (filteredRecords.length === 0) return null;
    const sorted = [...filteredRecords].sort((a, b) =>
      new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
    );
    const labels = sorted.map(r => {
      const d = new Date(r.record_date);
      return `${d.getMonth()+1}/${d.getDate()}`;
    });
    return {
      labels,
      weightData: sorted.map(r => r.weight),
      waistData: sorted.map(r => r.waist),
    };
  }, [filteredRecords]);

  // ---------- body components ----------
  const bodyComponents = useMemo(() => {
    if (!metrics) return null;
    return {
      fatMass: safeToFixed(metrics.fatMass),
      leanMass: safeToFixed(metrics.leanBodyMass),
      waterMass: safeToFixed(metrics.waterWeight),
      proteinMass: safeToFixed(metrics.proteinMass),
      muscleMass: safeToFixed(metrics.skeletalMuscle),
      boneMass: safeToFixed(metrics.boneMass),
      visceralFatLevel: safeNumber(metrics.vfiLevel),
    };
  }, [metrics]);

  // ---------- body data comparison ----------
  const bodyDataComparison = useMemo(() => {
    if (filteredRecords.length < 2) return [];
    const { H, AGE, isMale, H_M } = userParams;
    const latest = filteredRecords[0];
    const earliest = filteredRecords[filteredRecords.length - 1];

    const estBodyFat = (w: number) => {
      const b = w / (H_M * H_M);
      return isMale ? 1.2 * b + 0.23 * AGE - 16.2 : 1.2 * b + 0.23 * AGE - 5.4;
    };
    const compFrom = (w: number, bfr: number) => {
      const fm = w * (bfr / 100), lm = w - fm, wm = lm * 0.735, bm = lm * 0.17, pm = lm * 0.19, mm = (lm - bm) * 0.713;
      return { fatMass: fm, leanMass: lm, waterMass: wm, proteinMass: pm, boneMass: bm, muscleMass: mm };
    };
    const estBmr = (w: number) => isMale ? 10 * w + 6.25 * H - 5 * AGE + 5 : 10 * w + 6.25 * H - 5 * AGE - 161;
    const estVfi = (w: number, wi: number) => {
      const b = w / (H_M * H_M);
      const vfa = 1.08 * wi + 0.13 * b + 0.16 * AGE - 10.5 * (isMale ? 1 : 0) - 94.2;
      return Math.max(1, Math.min(59, Math.round(vfa / 2 + 5)));
    };
    const calcBodyAge = (w: number, wi: number) => {
      const bmi = w / (H_M * H_M), bfr = estBodyFat(w);
      const comp = compFrom(w, bfr), skmRate = (comp.muscleMass / w) * 100;
      let bmiAge = AGE;
      if (bmi >= 24 && bmi < 28) bmiAge = AGE + 5; else if (bmi >= 28) bmiAge = AGE + 10; else if (bmi < 18.5) bmiAge = AGE + 3;
      let waistAge = AGE;
      if (isMale) { if (wi >= 85 && wi < 90) waistAge = AGE + 5; else if (wi >= 90) waistAge = AGE + 10; }
      else { if (wi >= 80 && wi < 85) waistAge = AGE + 5; else if (wi >= 85) waistAge = AGE + 10; }
      let muscleAge = AGE;
      if (isMale) { if (skmRate >= 35) muscleAge = AGE - 5; else if (skmRate < 30) muscleAge = AGE + 5; }
      else { if (skmRate >= 28) muscleAge = AGE - 5; else if (skmRate < 25) muscleAge = AGE + 5; }
      const basic = 0.6 * AGE + 0.4 * bmiAge + 0.3 * waistAge - 0.3 * muscleAge;
      const stdBf = isMale ? 17.5 : 22.5, stdMuscle = isMale ? 37.5 : 30.5;
      const adv = AGE + (estVfi(w, wi) - 9) * 2 + (bfr - stdBf) - (skmRate - stdMuscle);
      return Math.round(basic * 0.4 + adv * 0.6);
    };
    const calcHealthScore = (w: number, wi: number) => {
      const bmi = w / (H_M * H_M), bfr = estBodyFat(w);
      const c = compFrom(w, bfr), skmR = (c.muscleMass / w) * 100, ba = calcBodyAge(w, wi);
      let bS = 6; if (bmi >= 18.5 && bmi < 24) bS = 20; else if (bmi >= 24 && bmi < 28) bS = 14;
      let wS = 5;
      if (isMale) { if (wi < 85) wS = 20; else if (wi >= 85 && wi < 90) wS = 12; }
      else { if (wi < 80) wS = 20; else if (wi >= 80 && wi < 85) wS = 12; }
      let bfS = 6;
      if (isMale) { if (bfr >= 15 && bfr <= 22) bfS = 20; else if (bfr >= 23 && bfr <= 27) bfS = 13; }
      else { if (bfr >= 20 && bfr <= 28) bfS = 20; else if (bfr >= 29 && bfr <= 33) bfS = 13; }
      let mS = 7;
      if (isMale) { if (skmR >= 35) mS = 20; else if (skmR >= 32 && skmR < 35) mS = 14; }
      else { if (skmR >= 30) mS = 20; else if (skmR >= 27 && skmR < 30) mS = 14; }
      let aS = 4; const ad = ba - AGE;
      if (ba < AGE) aS = 20; else if (ad === 0) aS = 15; else if (ad > 0 && ad <= 3) aS = 10;
      return bS + wS + bfS + mS + aS;
    };
    const bfLevel = (bfr: number) => {
      if (isMale) { if (bfr < 15) return '偏低'; if (bfr > 27) return '偏高'; return '正常'; }
      if (bfr < 20) return '偏低'; if (bfr > 33) return '偏高'; return '正常';
    };
    const bmiLevel = (b: number) => b < 18.5 ? '体重过低' : b < 24 ? '正常' : b < 28 ? '超重' : '肥胖';

    const iBmi = earliest.weight / (H_M * H_M);
    const iBf = estBodyFat(earliest.weight);
    const iComp = compFrom(earliest.weight, iBf);
    const iBmr = Math.round(estBmr(earliest.weight));
    const iVfi = estVfi(earliest.weight, earliest.waist);
    const iBodyAge = calcBodyAge(earliest.weight, earliest.waist);
    const iScore = calcHealthScore(earliest.weight, earliest.waist);

    const cBmi = metrics?.bmi || (latest.weight / (H_M * H_M));
    const cBf = metrics?.bodyFatRate ?? estBodyFat(latest.weight);
    const cBmr = metrics?.bmr || Math.round(estBmr(latest.weight));
    const cVfi = metrics?.vfiLevel || estVfi(latest.weight, latest.waist);
    const cBodyAge = metrics?.bodyAge ?? calcBodyAge(latest.weight, latest.waist);
    const cScore = metrics?.healthScore?.total ?? calcHealthScore(latest.weight, latest.waist);
    const cComp = {
      fatMass: metrics?.fatMass ?? compFrom(latest.weight, cBf).fatMass,
      leanMass: metrics?.leanBodyMass ?? compFrom(latest.weight, cBf).leanMass,
      waterMass: metrics?.waterWeight ?? compFrom(latest.weight, cBf).waterMass,
      proteinMass: metrics?.proteinMass ?? compFrom(latest.weight, cBf).proteinMass,
      boneMass: metrics?.boneMass ?? compFrom(latest.weight, cBf).boneMass,
      muscleMass: metrics?.skeletalMuscle ?? compFrom(latest.weight, cBf).muscleMass,
    };

    // diff helper: goodDir='down' = 下降好(体重等), 'up' = 上升好(肌肉等), 'neutral' = 中性
    const fd = (c: number, i: number, u: string, goodDir: 'down' | 'up' | 'neutral' = 'down') => {
      const d = c - i;
      if (Math.abs(d) < 0.05) return { change: '-', color: '#666666' };
      const arrow = d > 0 ? '↑' : '↓';
      const absD = safeToFixed(Math.abs(d), 1);
      let color = '#666666';
      if (goodDir === 'down') color = d > 0 ? '#EF4444' : '#22C55E';  // 下降好: 增=红, 减=绿
      else if (goodDir === 'up') color = d > 0 ? '#22C55E' : '#EF4444'; // 上升好: 增=绿, 减=红
      return { change: `${absD}${u} ${arrow}`, color };
    };

    // Ideal weight for control calculations
    const idealW = 22.2 * (H_M * H_M);
    const idealFat = idealW * 0.19;
    const idealMuscle = idealW * (isMale ? 0.375 : 0.305);

    return [
      { label: '体重',     initial: safeToFixed(earliest.weight)+' kg', current: safeToFixed(latest.weight)+' kg', change: fd(latest.weight, earliest.weight, 'kg').change, color: fd(latest.weight, earliest.weight, 'kg').color },
      { label: '腰围',     initial: safeToFixed(earliest.waist)+' cm', current: safeToFixed(latest.waist)+' cm', change: fd(latest.waist, earliest.waist, 'cm').change, color: fd(latest.waist, earliest.waist, 'cm').color },
      { label: 'BMI',      initial: safeToFixed(iBmi), current: safeToFixed(cBmi), change: fd(cBmi, iBmi, '').change, color: fd(cBmi, iBmi, '').color },
      { label: 'BMI等级',  initial: bmiLevel(iBmi), current: metrics?.bmiLevel || bmiLevel(cBmi), change: '-', color: '#666666' },
      { label: '体脂率',   initial: safeToFixed(iBf)+'%', current: safeToFixed(cBf)+'%', change: fd(cBf, iBf, '%').change, color: fd(cBf, iBf, '%').color },
      { label: '体脂等级', initial: bfLevel(iBf), current: metrics?.bodyFatLevel || bfLevel(cBf), change: '-', color: '#666666' },
      { label: '脂肪量',   initial: safeToFixed(iComp.fatMass)+' kg', current: safeToFixed(cComp.fatMass)+' kg', change: fd(cComp.fatMass, iComp.fatMass, 'kg').change, color: fd(cComp.fatMass, iComp.fatMass, 'kg').color },
      { label: '去脂体重', initial: safeToFixed(iComp.leanMass)+' kg', current: safeToFixed(cComp.leanMass)+' kg', change: fd(cComp.leanMass, iComp.leanMass, ' kg', 'down').change, color: fd(cComp.leanMass, iComp.leanMass, ' kg', 'down').color },
      { label: '水分',     initial: safeToFixed(iComp.waterMass)+' kg', current: safeToFixed(cComp.waterMass)+' kg', change: fd(cComp.waterMass, iComp.waterMass, 'kg', 'neutral').change, color: fd(cComp.waterMass, iComp.waterMass, 'kg', 'neutral').color },
      { label: '蛋白质',   initial: safeToFixed(iComp.proteinMass)+' kg', current: safeToFixed(cComp.proteinMass)+' kg', change: fd(cComp.proteinMass, iComp.proteinMass, 'kg', 'neutral').change, color: fd(cComp.proteinMass, iComp.proteinMass, 'kg', 'neutral').color },
      { label: '骨量',     initial: safeToFixed(iComp.boneMass)+' kg', current: safeToFixed(cComp.boneMass)+' kg', change: fd(cComp.boneMass, iComp.boneMass, ' kg', 'up').change, color: fd(cComp.boneMass, iComp.boneMass, ' kg', 'up').color },
      { label: '软瘦组织', initial: safeToFixed(iComp.leanMass - iComp.boneMass)+' kg', current: safeToFixed(cComp.leanMass - cComp.boneMass)+' kg', change: fd(cComp.leanMass - cComp.boneMass, iComp.leanMass - iComp.boneMass, 'kg', 'neutral').change, color: fd(cComp.leanMass - cComp.boneMass, iComp.leanMass - iComp.boneMass, 'kg', 'neutral').color },
      { label: '骨骼肌',   initial: safeToFixed(iComp.muscleMass)+' kg', current: safeToFixed(cComp.muscleMass)+' kg', change: fd(cComp.muscleMass, iComp.muscleMass, 'kg', 'up').change, color: fd(cComp.muscleMass, iComp.muscleMass, 'kg', 'up').color },
      { label: '内脏脂肪', initial: iVfi+' 级', current: cVfi+' 级', change: fd(cVfi, iVfi, ' 级', 'down').change, color: fd(cVfi, iVfi, ' 级', 'down').color },
      { label: '基础代谢率', initial: iBmr+' kcal', current: cBmr+' kcal', change: fd(cBmr, iBmr, ' kcal', 'up').change, color: fd(cBmr, iBmr, ' kcal', 'up').color },
      { label: '肥胖等级',   initial: bmiLevel(iBmi), current: metrics?.bmiLevel || bmiLevel(cBmi), change: '-', color: '#666666' },
      { label: '身体年龄',   initial: iBodyAge+' 岁', current: cBodyAge+' 岁', change: fd(cBodyAge, iBodyAge, ' 岁', 'down').change, color: fd(cBodyAge, iBodyAge, ' 岁', 'down').color },
      { label: '健康评分',   initial: iScore+' 分', current: cScore+' 分', change: fd(cScore, iScore, ' 分', 'up').change, color: fd(cScore, iScore, ' 分', 'up').color },
      { label: '体重控制',   initial: safeToFixed(idealW - earliest.weight)+' kg', current: safeToFixed(idealW - latest.weight)+' kg', change: '-', color: '#666666' },
      { label: '脂肪控制',   initial: safeToFixed(idealFat - iComp.fatMass)+' kg', current: safeToFixed(idealFat - cComp.fatMass)+' kg', change: '-', color: '#666666' },
      { label: '肌肉控制',   initial: safeToFixed(Math.max(0, idealMuscle - iComp.muscleMass))+' kg', current: safeToFixed(Math.max(0, idealMuscle - cComp.muscleMass))+' kg', change: '-', color: '#666666' },
      { label: '体型',       initial: bmiLevel(iBmi), current: metrics?.bodyType || bmiLevel(cBmi), change: '-', color: '#666666' },
    ];
  }, [filteredRecords, metrics, userParams]);

  // BMI position helper
  const getBMIPosition = (bmi: number) => {
    if (bmi <= 18.5) return (bmi / 18.5) * 25;
    if (bmi <= 24) return 25 + ((bmi - 18.5) / 5.5) * 25;
    if (bmi <= 28) return 50 + ((bmi - 24) / 4) * 25;
    return 75 + Math.min(((bmi - 28) / 10) * 25, 25);
  };
  const getBodyFatPosition = (rate: number) => {
    if (rate <= 10) return (rate / 10) * 25;
    if (rate <= 20) return 25 + ((rate - 10) / 10) * 25;
    if (rate <= 25) return 50 + ((rate - 20) / 5) * 25;
    return 75 + Math.min(((rate - 25) / 15) * 25, 25);
  };
  const getWaistPosition = (waist: number) => {
    if (waist <= 85) return (waist / 85) * 40;
    if (waist <= 90) return 40 + ((waist - 85) / 5) * 30;
    return 70 + Math.min(((waist - 90) / 20) * 30, 30);
  };

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: 'week', label: '近7天' }, { key: 'month', label: '近30天' },
    { key: 'quarter', label: '近90天' }, { key: 'all', label: '全部' },
  ];

  return (
    <Screen backgroundColor="#F7F4ED">
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

        {/* Header */}
        <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 4, height: 20, backgroundColor: '#F26B3A', borderRadius: 2, marginRight: 10 }} />
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#1E2933' }}>统计分析</Text>
          </View>
        </View>

        {/* Health Standard Notice */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesome6 name="user" size={15} color="#3B82F6" />
            <Text style={{ fontSize: 13, color: '#333333', marginLeft: 10 }}>
              当前健康标准基于 <Text style={{ fontWeight: '700' }}>{userParams.isMale ? '男性' : '女性'}</Text> 体型评价
            </Text>
          </View>
        </View>

        {/* Time Range Selector */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 10, padding: 4 }}>
            {timeRanges.map(range => (
              <TouchableOpacity key={range.key} onPress={() => setTimeRange(range.key)}
                style={{ flex: 1, paddingVertical: 8, borderRadius: 8,
                  backgroundColor: timeRange === range.key ? '#F26B3A' : 'transparent' }}>
                <Text style={{ fontSize: 13, fontWeight: '500', textAlign: 'center',
                  color: timeRange === range.key ? '#FFFFFF' : '#666666' }}>{range.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weight Trend Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(242,107,58,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                  <FontAwesome6 name="weight-scale" size={16} color="#F26B3A" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginLeft: 10 }}>体重趋势</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#999999' }}>单位: kg</Text>
            </View>
            {chartData && chartData.labels.length > 0 ? (
              <LineChart
                data={{
                  labels: chartData.labels.length > 6
                    ? chartData.labels.filter((_:string,i:number) => i % Math.ceil(chartData.labels.length/6) === 0 || i === chartData.labels.length-1)
                    : chartData.labels,
                  datasets: [{ data: chartData.weightData, color: (opacity = 1) => `rgba(242,107,58,${opacity})`, strokeWidth: 2 }],
                }}
                width={SCREEN_WIDTH - 72}
                height={140}
                yAxisSuffix=" kg"
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalCount: 1,
                  color: (opacity = 1) => `rgba(242,107,58,${opacity})`,
                  labelColor: () => '#999999',
                  style: { borderRadius: 12 },
                  propsForDots: { r: '4', strokeWidth: '2', stroke: '#F26B3A' },
                }}
                bezier
                style={{ marginBottom: 12, borderRadius: 12 }}
              />
            ) : (
              <View style={{ height: 120, backgroundColor: '#F7F4ED', borderRadius: 12, marginBottom: 12, justifyContent: 'center', alignItems: 'center' }}>
                <FontAwesome6 name="chart-line" size={32} color="#CCCCCC" />
                <Text style={{ fontSize: 12, color: '#999999', marginTop: 8 }}>趋势图表</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#999999' }}>起始值</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#333333', marginTop: 2 }}>
                  {trendStats.wStart > 0 ? safeToFixed(trendStats.wStart)+' kg' : '--'}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#999999' }}>结束值</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#333333', marginTop: 2 }}>
                  {trendStats.wEnd > 0 ? safeToFixed(trendStats.wEnd)+' kg' : '--'}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#999999' }}>变化量</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 2,
                  color: trendStats.wChg > 0 ? '#EF4444' : trendStats.wChg < 0 ? '#22C55E' : '#666666' }}>
                  {trendStats.wChg !== 0 ? `${trendStats.wChg > 0 ? '↗' : '↘'} ${safeToFixed(Math.abs(trendStats.wChg), 1)} kg` : '- kg'}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#999999' }}>变化率</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 2,
                  color: trendStats.wChg > 0 ? '#EF4444' : trendStats.wChg < 0 ? '#22C55E' : '#666666' }}>
                  {trendStats.wChg !== 0 ? `${safeToFixed(trendStats.wRate)}%` : '-%'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Waist Trend Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(60,141,110,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                  <FontAwesome6 name="ruler-vertical" size={16} color="#3C8D6E" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginLeft: 10 }}>腰围趋势</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#999999' }}>单位: cm</Text>
            </View>
            {chartData && chartData.labels.length > 0 ? (
              <LineChart
                data={{
                  labels: chartData.labels.length > 6
                    ? chartData.labels.filter((_:string,i:number) => i % Math.ceil(chartData.labels.length/6) === 0 || i === chartData.labels.length-1)
                    : chartData.labels,
                  datasets: [{ data: chartData.waistData, color: (opacity = 1) => `rgba(60,141,110,${opacity})`, strokeWidth: 2 }],
                }}
                width={SCREEN_WIDTH - 72}
                height={140}
                yAxisSuffix=" cm"
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalCount: 1,
                  color: (opacity = 1) => `rgba(60,141,110,${opacity})`,
                  labelColor: () => '#999999',
                  style: { borderRadius: 12 },
                  propsForDots: { r: '4', strokeWidth: '2', stroke: '#3C8D6E' },
                }}
                bezier
                style={{ marginBottom: 12, borderRadius: 12 }}
              />
            ) : (
              <View style={{ height: 120, backgroundColor: '#F7F4ED', borderRadius: 12, marginBottom: 12, justifyContent: 'center', alignItems: 'center' }}>
                <FontAwesome6 name="chart-line" size={32} color="#CCCCCC" />
                <Text style={{ fontSize: 12, color: '#999999', marginTop: 8 }}>趋势图表</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#999999' }}>起始值</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#333333', marginTop: 2 }}>
                  {trendStats.wiStart > 0 ? safeToFixed(trendStats.wiStart)+' cm' : '--'}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#999999' }}>结束值</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', color: '#333333', marginTop: 2 }}>
                  {trendStats.wiEnd > 0 ? safeToFixed(trendStats.wiEnd)+' cm' : '--'}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#999999' }}>变化量</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 2,
                  color: trendStats.wiChg > 0 ? '#EF4444' : trendStats.wiChg < 0 ? '#22C55E' : '#666666' }}>
                  {trendStats.wiChg !== 0 ? `${trendStats.wiChg > 0 ? '↗' : '↘'} ${safeToFixed(Math.abs(trendStats.wiChg), 1)} cm` : '- cm'}
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#999999' }}>变化率</Text>
                <Text style={{ fontSize: 15, fontWeight: '600', marginTop: 2,
                  color: trendStats.wiChg > 0 ? '#EF4444' : trendStats.wiChg < 0 ? '#22C55E' : '#666666' }}>
                  {trendStats.wiChg !== 0 ? `${safeToFixed(trendStats.wiRate)}%` : '-%'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Weight Statistics */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(242,107,58,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                <FontAwesome6 name="weight-scale" size={16} color="#F26B3A" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginLeft: 10 }}>体重统计</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 12, padding: 14 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>平均值</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#333333', marginTop: 4 }}>
                    {stats.avgWeight > 0 ? safeToFixed(stats.avgWeight)+' kg' : '--'}
                  </Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 12, padding: 14 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>标准差</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#333333', marginTop: 4 }}>
                    {stats.stdWeight > 0 ? safeToFixed(stats.stdWeight)+' kg' : '--'}
                  </Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#FFF5F5', borderRadius: 12, padding: 14 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>最大值</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#E53E3E', marginTop: 4 }}>
                    {stats.maxWeight > 0 ? safeToFixed(stats.maxWeight)+' kg' : '--'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#333333', marginTop: 2 }}>{stats.maxWeightDate || '--'}</Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F0FFFC', borderRadius: 12, padding: 14 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>最小值</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#333333', marginTop: 4 }}>
                    {stats.minWeight > 0 ? safeToFixed(stats.minWeight)+' kg' : '--'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#333333', marginTop: 2 }}>{stats.minWeightDate || '--'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Waist Statistics */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
              <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(60,141,110,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                <FontAwesome6 name="ruler-vertical" size={16} color="#3C8D6E" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginLeft: 10 }}>腰围统计</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 12, padding: 14 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>平均值</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#333333', marginTop: 4 }}>
                    {stats.avgWaist > 0 ? safeToFixed(stats.avgWaist)+' cm' : '--'}
                  </Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 12, padding: 14 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>标准差</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#333333', marginTop: 4 }}>
                    {stats.stdWaist > 0 ? safeToFixed(stats.stdWaist)+' cm' : '--'}
                  </Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#FFF5F5', borderRadius: 12, padding: 14 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>最大值</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#E53E3E', marginTop: 4 }}>
                    {stats.maxWaist > 0 ? safeToFixed(stats.maxWaist)+' cm' : '--'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#333333', marginTop: 2 }}>{stats.maxWaistDate || '--'}</Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F0FFFC', borderRadius: 12, padding: 14 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>最小值</Text>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: '#333333', marginTop: 4 }}>
                    {stats.minWaist > 0 ? safeToFixed(stats.minWaist)+' cm' : '--'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#333333', marginTop: 2 }}>{stats.minWaistDate || '--'}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* BMI Health Level */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                  <FontAwesome6 name="calculator" size={16} color="#3B82F6" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginLeft: 10 }}>BMI 健康等级</Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
                backgroundColor: !metrics ? '#F3F4F6' : metrics.bmi < 18.5 ? '#DBEAFE' : metrics.bmi < 24 ? '#DCFCE7' : metrics.bmi < 28 ? '#FEF3C7' : '#FEE2E2' }}>
                <Text style={{ fontSize: 12, fontWeight: '500',
                  color: !metrics ? '#999999' : metrics.bmi < 18.5 ? '#3B82F6' : metrics.bmi < 24 ? '#22C55E' : metrics.bmi < 28 ? '#F59E0B' : '#EF4444' }}>
                  {metrics?.bmiLevel || '--'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
              当前 BMI：<Text style={{ fontSize: 18, fontWeight: '700', color: '#333333' }}>{safeToFixed(metrics?.bmi) || '--'}</Text>
            </Text>
            <View style={{ marginBottom: 0 }}>
              <View style={{ height: 24, borderRadius: 12, flexDirection: 'row', overflow: 'hidden' }}>
                <View style={{ flex: 25, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '500' }}>体重过低</Text></View>
                <View style={{ flex: 25, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '500' }}>正常</Text></View>
                <View style={{ flex: 25, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '500' }}>超重</Text></View>
                <View style={{ flex: 25, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '500' }}>肥胖</Text></View>
              </View>
              <View style={{ height: 20, flexDirection: 'row', position: 'relative', marginTop: 4 }}>
                <View style={{ position: 'absolute', left: '25%', top: 0, transform: [{ translateX: -8 }] }}>
                  <Text style={{ fontSize: 10, color: '#666666' }}>18</Text></View>
                <View style={{ position: 'absolute', left: '50%', top: 0, transform: [{ translateX: -8 }] }}>
                  <Text style={{ fontSize: 10, color: '#666666' }}>24</Text></View>
                <View style={{ position: 'absolute', left: '75%', top: 0, transform: [{ translateX: -8 }] }}>
                  <Text style={{ fontSize: 10, color: '#666666' }}>28</Text></View>
              </View>
            </View>
            <View style={{ height: 20, position: 'relative' }}>
              <View style={{ position: 'absolute', left: `${getBMIPosition(metrics?.bmi || 22)}%`, top: -53, transform: [{ translateX: -1 }] }}>
                <View style={{ width: 2, height: 49, backgroundColor: '#333333', borderRadius: 1 }} />
                <Text style={{ fontSize: 10, color: '#333333', textAlign: 'center', marginTop: 2 }}>{safeToFixed(metrics?.bmi) || '--'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Body Fat Rate Health Level */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(236,72,153,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                  <FontAwesome6 name="percent" size={16} color="#EC4899" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginLeft: 10 }}>体脂率健康等级</Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
                backgroundColor: !metrics?.bodyFatLevel ? '#F3F4F6' : metrics.bodyFatLevel === '正常' ? '#DCFCE7' : metrics.bodyFatLevel === '偏低' ? '#DBEAFE' : '#FEF3C7' }}>
                <Text style={{ fontSize: 12, fontWeight: '500',
                  color: !metrics?.bodyFatLevel ? '#999999' : metrics.bodyFatLevel === '正常' ? '#22C55E' : metrics.bodyFatLevel === '偏低' ? '#3B82F6' : '#F59E0B' }}>
                  {metrics?.bodyFatLevel || '--'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
              当前体脂率：<Text style={{ fontSize: 18, fontWeight: '700', color: '#333333' }}>{safeToFixed(metrics?.bodyFatRate) || '--'}%</Text>
            </Text>
            <View style={{ marginBottom: 0 }}>
              <View style={{ height: 24, borderRadius: 12, flexDirection: 'row', overflow: 'hidden' }}>
                <View style={{ flex: 25, backgroundColor: '#3B82F6', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '500' }}>偏低</Text></View>
                <View style={{ flex: 25, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '500' }}>正常</Text></View>
                <View style={{ flex: 25, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '500' }}>偏高</Text></View>
                <View style={{ flex: 25, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '500' }}>肥胖</Text></View>
              </View>
              <View style={{ height: 16, flexDirection: 'row', position: 'relative', marginTop: 4 }}>
                <View style={{ position: 'absolute', left: '25%', top: 0, transform: [{ translateX: -8 }] }}>
                  <Text style={{ fontSize: 10, color: '#666666' }}>10</Text></View>
                <View style={{ position: 'absolute', left: '50%', top: 0, transform: [{ translateX: -8 }] }}>
                  <Text style={{ fontSize: 10, color: '#666666' }}>20</Text></View>
                <View style={{ position: 'absolute', left: '75%', top: 0, transform: [{ translateX: -8 }] }}>
                  <Text style={{ fontSize: 10, color: '#666666' }}>25</Text></View>
              </View>
            </View>
            <View style={{ height: 20, position: 'relative' }}>
              <View style={{ position: 'absolute', left: `${getBodyFatPosition(metrics?.bodyFatRate || 20)}%`, top: -53, transform: [{ translateX: -1 }] }}>
                <View style={{ width: 2, height: 49, backgroundColor: '#333333', borderRadius: 1 }} />
                <Text style={{ fontSize: 10, color: '#333333', textAlign: 'center', marginTop: 2 }}>{safeToFixed(metrics?.bodyFatRate) || '--'}%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Waist Health Level */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(60,141,110,0.15)', justifyContent: 'center', alignItems: 'center' }}>
                  <FontAwesome6 name="ruler-vertical" size={16} color="#3C8D6E" />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginLeft: 10 }}>腰围健康等级</Text>
              </View>
              <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
                backgroundColor: !metrics?.waistLevel ? '#F3F4F6' : metrics.waistLevel === '正常' ? '#DCFCE7' : metrics.waistLevel.includes('前期') ? '#FEF3C7' : '#FEE2E2' }}>
                <Text style={{ fontSize: 12, fontWeight: '500',
                  color: !metrics?.waistLevel ? '#999999' : metrics.waistLevel === '正常' ? '#22C55E' : metrics.waistLevel.includes('前期') ? '#F59E0B' : '#EF4444' }}>
                  {metrics?.waistLevel || '--'}
                </Text>
              </View>
            </View>
            <Text style={{ fontSize: 13, color: '#666666', marginBottom: 12 }}>
              当前腰围：<Text style={{ fontSize: 18, fontWeight: '700', color: '#333333' }}>{safeToFixed(metrics?.currentWaist) || '--'} cm</Text>
            </Text>
            <View style={{ height: 24, borderRadius: 12, flexDirection: 'row', overflow: 'hidden', marginBottom: 4 }}>
              <View style={{ flex: 40, backgroundColor: '#22C55E', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '500' }}>正常</Text></View>
              <View style={{ flex: 30, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '500' }}>中心型肥胖前期</Text></View>
              <View style={{ flex: 30, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '500' }}>中心型肥胖</Text></View>
            </View>
            <View style={{ height: 16, position: 'relative' }}>
              <Text style={{ position: 'absolute', left: '38%', top: 0, fontSize: 10, color: '#666666' }}>85</Text>
              <Text style={{ position: 'absolute', left: '68%', top: 0, fontSize: 10, color: '#666666' }}>90</Text>
            </View>
            <View style={{ height: 20, position: 'relative' }}>
              <View style={{ position: 'absolute', left: `${getWaistPosition(metrics?.currentWaist || 86)}%`, top: -53, transform: [{ translateX: -1 }] }}>
                <View style={{ width: 2, height: 49, backgroundColor: '#333333', borderRadius: 1 }} />
                <Text style={{ fontSize: 10, color: '#333333', textAlign: 'center', marginTop: 2 }}>{safeToFixed(metrics?.currentWaist) || '--'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Body Components */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginBottom: 14 }}>身体成分指标</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>脂肪量</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#F26B3A', marginTop: 4 }}>{bodyComponents?.fatMass || '--'} kg</Text>
                  <Text style={{ fontSize: 10, color: '#999999', marginTop: 2 }}>kg = 体重 × 体脂率</Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>去脂体重</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#3B82F6', marginTop: 4 }}>{bodyComponents?.leanMass || '--'} kg</Text>
                  <Text style={{ fontSize: 10, color: '#999999', marginTop: 2 }}>kg = 体重 - 脂肪量</Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>水分</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#3B82F6', marginTop: 4 }}>{bodyComponents?.waterMass || '--'} kg</Text>
                  <Text style={{ fontSize: 10, color: '#999999', marginTop: 2 }}>kg = 去脂体重 × 73.5%</Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>蛋白质</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#8B5CF6', marginTop: 4 }}>{bodyComponents?.proteinMass || '--'} kg</Text>
                  <Text style={{ fontSize: 10, color: '#999999', marginTop: 2 }}>kg = 去脂体重 × 19%</Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>软瘦组织重量</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#22C55E', marginTop: 4 }}>
                    {safeToFixed(safeNumber(bodyComponents?.leanMass) - safeNumber(bodyComponents?.boneMass))} kg
                  </Text>
                  <Text style={{ fontSize: 10, color: '#999999', marginTop: 2 }}>kg = 去脂体重 - 骨量</Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>骨骼肌</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#EC4899', marginTop: 4 }}>{bodyComponents?.muscleMass || '--'} kg</Text>
                  <Text style={{ fontSize: 10, color: '#999999', marginTop: 2 }}>kg = 软瘦组织重量 × 71.3%</Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>骨质</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#3B82F6', marginTop: 4 }}>{bodyComponents?.boneMass || '--'} kg</Text>
                  <Text style={{ fontSize: 10, color: '#999999', marginTop: 2 }}>kg = 去脂体重 × 17%</Text>
                </View>
              </View>
              <View style={{ width: '50%', paddingHorizontal: 4, paddingBottom: 8 }}>
                <View style={{ backgroundColor: '#F7F4ED', borderRadius: 12, padding: 12 }}>
                  <Text style={{ fontSize: 12, color: '#999999' }}>内脏脂肪等级</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#22C55E', marginTop: 4 }}>
                    {bodyComponents?.visceralFatLevel != null ? `${bodyComponents.visceralFatLevel} 级` : '--'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#999999', marginTop: 2 }}>(正常)</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* BMR Card */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ backgroundColor: '#DCFCE7', borderRadius: 16, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 13, color: '#166534' }}>基础代谢率(BMR)</Text>
              <Text style={{ fontSize: 11, color: '#166534', opacity: 0.8, marginTop: 2 }}>Mifflin-St Jeor公式计算</Text>
            </View>
            <Text style={{ fontSize: 24, fontWeight: '700', color: '#166534' }}>{metrics?.bmr ? `${metrics.bmr} kcal/天` : '--'}</Text>
          </View>
        </View>

        {/* Body Data Comparison */}
        <View style={{ paddingHorizontal: 20, marginBottom: 100 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933', marginBottom: 12 }}>身体数据对比</Text>

          {/* Summary Row */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#22C55E' }}>
                  {filteredRecords.length >= 2
                    ? Math.round((new Date(filteredRecords[0].record_date).getTime() - new Date(filteredRecords[filteredRecords.length - 1].record_date).getTime()) / 86400000)
                    : 0} 天
                </Text>
                <Text style={{ fontSize: 11, color: '#999999', marginTop: 2 }}>天数</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: trendStats.wChg <= 0 ? '#22C55E' : '#EF4444' }}>
                  {trendStats.wChg !== 0 ? `${trendStats.wChg > 0 ? '+' : ''}${safeToFixed(trendStats.wChg)} kg` : '- kg'}
                </Text>
                <Text style={{ fontSize: 11, color: '#999999', marginTop: 2 }}>体重变化</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: trendStats.wiChg <= 0 ? '#22C55E' : '#EF4444' }}>
                  {trendStats.wiChg !== 0 ? `${trendStats.wiChg > 0 ? '+' : ''}${safeToFixed(trendStats.wiChg)} cm` : '- cm'}
                </Text>
                <Text style={{ fontSize: 11, color: '#999999', marginTop: 2 }}>腰围变化</Text>
              </View>
            </View>
            {filteredRecords.length >= 2 && (
              <Text style={{ fontSize: 11, color: '#999999', textAlign: 'center', marginTop: 8 }}>
                首次打卡{filteredRecords[filteredRecords.length - 1].record_date}与最新打卡{filteredRecords[0].record_date}对比
              </Text>
            )}
          </View>

          {/* Comparison Table */}
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', backgroundColor: '#F7F4ED', paddingVertical: 10, paddingHorizontal: 12 }}>
              <Text style={{ flex: 2, fontSize: 11, fontWeight: '600', color: '#666666' }}>指标</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '600', color: '#666666', textAlign: 'center' }}>初始</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '600', color: '#666666', textAlign: 'center' }}>当前</Text>
              <Text style={{ flex: 1, fontSize: 11, fontWeight: '600', color: '#666666', textAlign: 'right' }}>变化</Text>
            </View>
            {bodyDataComparison.length === 0 ? (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: '#999999' }}>需要至少2条记录才能对比</Text>
              </View>
            ) : (
              bodyDataComparison.map((item: any, index: number) => (
                <View key={index} style={{ flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12,
                  borderBottomWidth: index < bodyDataComparison.length - 1 ? 1 : 0, borderBottomColor: '#F0F0F0' }}>
                  <Text style={{ flex: 2, fontSize: 12, color: '#333333' }}>{item.label}</Text>
                  <Text style={{ flex: 1, fontSize: 12, color: '#666666', textAlign: 'center' }}>{item.initial}</Text>
                  <Text style={{ flex: 1, fontSize: 12, color: '#333333', textAlign: 'center' }}>{item.current}</Text>
                  <Text style={{ flex: 1, fontSize: 12, color: item.color, textAlign: 'right' }}>{item.change}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
