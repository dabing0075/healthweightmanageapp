import express from "express";
import cors from "cors";
import { getSupabaseClient } from "./storage/database/supabase-client";
import * as localDb from "./storage/database/local-db";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Supabase client (graceful fallback if env vars not set)
let supabase: any = null;
try {
  supabase = getSupabaseClient();
} catch (e: any) {
  console.log('Supabase not available, using in-memory storage:', e.message);
}

// In-memory data storage (for demo purposes)
interface User {
  id: string;
  nickname: string;
  signature: string;
  gender: string;
  birth_date: string;
  height: number;
  target_weight: number;
  target_waist: number;
  avatar_url: string | null;
  created_at: string;
}

interface Record {
  id: string;
  user_id: string;
  record_date: string;
  weight: number;
  waist: number;
  note: string;
  created_at: string;
}

// Demo user data
let users: User[] = [
  {
    id: '1',
    nickname: '两点丘',
    signature: '每天进步一点点',
    gender: 'male',
    birth_date: '1975-11-03',
    height: 179,
    target_weight: 70,
    target_waist: 80,
    avatar_url: null,
    created_at: '2024-01-01',
  },
];

// Demo records data
let records: Record[] = [
  { id: '1', user_id: '1', record_date: '2024-01-01', weight: 78, waist: 88, note: '开始减重计划', created_at: '2024-01-01' },
  { id: '2', user_id: '1', record_date: '2024-01-02', weight: 77.5, waist: 87.5, note: '', created_at: '2024-01-02' },
  { id: '3', user_id: '1', record_date: '2024-01-03', weight: 77.2, waist: 87, note: '控制饮食', created_at: '2024-01-03' },
  { id: '4', user_id: '1', record_date: '2024-01-04', weight: 76.8, waist: 86.5, note: '', created_at: '2024-01-04' },
  { id: '5', user_id: '1', record_date: '2024-01-05', weight: 76.5, waist: 86, note: '坚持运动', created_at: '2024-01-05' },
  { id: '6', user_id: '1', record_date: '2024-01-06', weight: 76.2, waist: 85.5, note: '', created_at: '2024-01-06' },
  { id: '7', user_id: '1', record_date: '2024-01-07', weight: 76, waist: 85, note: '周末坚持', created_at: '2024-01-07' },
];

// Generate ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 获取内存中最新记录（按日期降序）
function getLatestMemoryRecord(): Record | undefined {
  if (records.length === 0) return undefined;
  return [...records].sort((a, b) =>
    new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
  )[0];
}

// 正确的年龄计算（检查生日是否已过）
function calcAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Health check
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ code: 200, status: 'ok' });
});

// ==================== User API ====================

// Get user info
app.get('/api/v1/user/info', (req, res) => {
  const user = localDb.getUser('1') || users[0];
  if (!user) {
    return res.status(404).json({ code: 404, msg: 'User not found' });
  }

  // Get latest record for current metrics
  const latestRecord = localDb.getLatestRecord() || getLatestMemoryRecord();

  // Calculate BMI
  let bmi = 0;
  let bmiLevel = '未知';
  if (latestRecord && user.height > 0) {
    const heightM = user.height / 100;
    bmi = latestRecord.weight / (heightM * heightM);
    if (bmi < 18.5) bmiLevel = '体重过低';
    else if (bmi < 24) bmiLevel = '正常';
    else if (bmi < 28) bmiLevel = '超重';
    else bmiLevel = '肥胖';
  }

  // Calculate body fat rate (simplified formula)
  let bodyFatRate = 0;
  let bodyFatLevel = '未知';
  if (latestRecord && user.gender) {
    const age = calcAge(user.birth_date);
    if (user.gender === 'male') {
      bodyFatRate = 1.2 * bmi + 0.23 * age - 16.2;
    } else {
      bodyFatRate = 1.2 * bmi + 0.23 * age - 5.4;
    }
    if (bodyFatRate < 10) bodyFatLevel = '偏低';
    else if (bodyFatRate < 20) bodyFatLevel = '正常';
    else if (bodyFatRate < 25) bodyFatLevel = '偏高';
    else bodyFatLevel = '肥胖';
  }

  // Calculate waist level
  let waistLevel = '未知';
  if (latestRecord && user.gender) {
    if (user.gender === 'male') {
      if (latestRecord.waist < 85) waistLevel = '正常';
      else if (latestRecord.waist < 95) waistLevel = '中心型肥胖前期';
      else waistLevel = '中心型肥胖';
    } else {
      if (latestRecord.waist < 80) waistLevel = '正常';
      else if (latestRecord.waist < 90) waistLevel = '中心型肥胖前期';
      else waistLevel = '中心型肥胖';
    }
  }

  res.json({
    code: 200,
    data: {
      ...user,
      current_weight: latestRecord?.weight || null,
      current_waist: latestRecord?.waist || null,
      bmi: Math.round(bmi * 10) / 10,
      bmi_level: bmiLevel,
      body_fat_rate: Math.round(bodyFatRate * 10) / 10,
      body_fat_level: bodyFatLevel,
      waist_level: waistLevel,
      last_checkin_date: latestRecord?.record_date || null,
    },
  });
});

// Update user info
app.put('/api/v1/user/update', (req, res) => {
  const { nickname, signature, gender, birth_date, height, target_weight, target_waist, reminder_time } = req.body;
  const fields: Record<string, any> = {};
  if (nickname !== undefined) fields.nickname = nickname;
  if (signature !== undefined) fields.signature = signature;
  if (gender) fields.gender = gender;
  if (birth_date) fields.birth_date = birth_date;
  if (height) fields.height = height;
  if (target_weight !== undefined) fields.target_weight = target_weight;
  if (target_waist !== undefined) fields.target_waist = target_waist;
  if (reminder_time !== undefined) fields.reminder_time = reminder_time;
  const user = localDb.updateUser('1', fields);
  // Also update in-memory
  const memUser = users[0];
  if (memUser) Object.assign(memUser, fields);
  res.json({ code: 200, msg: 'Update success', data: user || memUser });
});

// Update target
app.put('/api/v1/user/target', (req, res) => {
  const { target_weight, target_waist } = req.body;
  const fields: Record<string, any> = {};
  if (target_weight) fields.target_weight = target_weight;
  if (target_waist) fields.target_waist = target_waist;
  const user = localDb.updateUser('1', fields);
  const memUser = users[0];
  if (memUser) Object.assign(memUser, fields);
  res.json({ code: 200, msg: 'Target updated', data: user || memUser });
});

// ==================== Records API ====================

// Get record by date
app.get('/api/v1/records/date/:date', async (req, res) => {
  const { date } = req.params;
  // Try local DB first
  const localRecord = localDb.getRecordByDate(date);
  if (localRecord) {
    return res.json({ code: 200, data: {
      id: localRecord.id, record_date: localRecord.record_date,
      weight: localRecord.weight, waist: localRecord.waist, note: localRecord.note || '',
    }});
  }
  // Try Supabase
  try {
    const { data } = await supabase.from('checkin_records').select('*').eq('checkin_date', date).maybeSingle();
    if (data) {
      return res.json({ code: 200, data: {
        id: data.id.toString(), record_date: data.checkin_date,
        weight: parseFloat(data.weight) || 0, waist: parseFloat(data.waist_circumference) || 0, note: data.note || '',
      }});
    }
  } catch (_e) { /* ignore */ }
  // Fallback to memory
  const memRecord = records.find(r => r.record_date === date);
  res.json({ code: 200, data: memRecord || null });
});

// Get recent records (从数据库读取)
app.get('/api/v1/records/recent', async (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const now = new Date();
  const reqStartDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const startDateStr = reqStartDate.toISOString().split('T')[0];

  // 1. Local DB
  try {
    const localRecords = localDb.getRecentRecords(days);
    if (localRecords.length > 0) {
      return res.json({ code: 200, data: localRecords.map((r: any) => ({
        id: r.id, record_date: r.record_date, weight: r.weight, waist: r.waist, note: r.note || '',
      })) });
    }
  } catch (e: any) { console.log('LocalDB recent failed:', e.message); }

  // 2. Supabase
  try {
    const { data } = await supabase.from('checkin_records').select('*').gte('checkin_date', startDateStr).order('checkin_date', { ascending: false });
    if (data?.length > 0) {
      return res.json({ code: 200, data: (data || []).map((r: any) => ({
        id: r.id.toString(), record_date: r.checkin_date,
        weight: parseFloat(r.weight) || 0, waist: parseFloat(r.waist_circumference) || 0, note: r.note || '',
      })) });
    }
  } catch (e: any) { console.log('Supabase recent failed:', e.message); }

  // 3. Memory fallback
  const recentRecords = records
    .filter((r) => new Date(r.record_date) >= reqStartDate)
    .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
  res.json({ code: 200, data: recentRecords });
});

// Get records by date range
app.get('/api/v1/records/history', async (req, res) => {
  const { startDate, endDate } = req.query;
  const now = new Date();
  const start = (startDate as string) || new Date(now.getFullYear() - 10, 0, 1).toISOString().split('T')[0];
  const end = (endDate as string) || now.toISOString().split('T')[0];

  // 1. Local DB
  try {
    const localRecords = localDb.getRecordsByDateRange(start, end);
    if (localRecords.length > 0) {
      return res.json({ code: 200, data: localRecords.map((r: any) => ({
        id: r.id, record_date: r.record_date, weight: r.weight, waist: r.waist, note: r.note || '',
      })) });
    }
  } catch (e: any) { console.log('LocalDB history failed:', e.message); }

  // 2. Supabase
  try {
    let query = supabase.from('checkin_records').select('*').order('checkin_date', { ascending: false });
    if (startDate) query = query.gte('checkin_date', startDate as string);
    if (endDate) query = query.lte('checkin_date', endDate as string);
    const { data } = await query;
    if (data?.length > 0) {
      return res.json({ code: 200, data: (data || []).map((r: any) => ({
        id: r.id.toString(), record_date: r.checkin_date,
        weight: parseFloat(r.weight) || 0, waist: parseFloat(r.waist_circumference) || 0, note: r.note || '',
      })) });
    }
  } catch (e: any) { console.log('Supabase history failed:', e.message); }

  // 3. Memory fallback
  const memoryRecords = records
    .filter(r => r.record_date >= start && r.record_date <= end)
    .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
  res.json({ code: 200, data: memoryRecords });
});

// Create or update record
app.post('/api/v1/records', async (req, res) => {
  const { record_date, weight, waist, note } = req.body;
  let result: any = null;
  const recordId = generateId();

  // 1. 写入本地 SQLite 数据库（主存储）
  try {
    result = localDb.upsertRecord({
      id: recordId,
      user_id: '1',
      record_date,
      weight: weight || 0,
      waist: waist || 0,
      note: note || '',
    });
    console.log('LocalDB write success:', record_date);
  } catch (dbErr: any) {
    console.log('LocalDB write failed:', dbErr.message);
  }

  // 2. 尝试 Supabase 写入
  try {
    const { data: existingRecords, error: queryError } = await supabase
      .from('checkin_records')
      .select('*')
      .eq('checkin_date', record_date)
      .maybeSingle();
    if (!queryError) {
      if (existingRecords) {
        await supabase.from('checkin_records').update({
          weight: weight?.toString() || null,
          waist_circumference: waist?.toString() || null,
          note: note || '',
        }).eq('id', existingRecords.id);
      } else {
        await supabase.from('checkin_records').insert({
          checkin_date: record_date,
          weight: weight?.toString() || null,
          waist_circumference: waist?.toString() || null,
          note: note || '',
        });
      }
    }
  } catch (dbErr: any) {
    console.log('Supabase write failed:', dbErr.message);
  }

  // 3. 始终更新内存数组（保底存储）
  const existingIndex = records.findIndex((r) => r.record_date === record_date);
  const isUpdate = existingIndex >= 0;
  if (isUpdate) {
    records[existingIndex] = { ...records[existingIndex], weight, waist: waist || 0, note: note || '' };
  } else {
    records.push({ id: recordId, user_id: '1', record_date, weight, waist: waist || 0, note: note || '', created_at: new Date().toISOString().split('T')[0] });
  }

  // 4. 返回成功响应
  res.json({
    code: 200,
    msg: isUpdate ? 'Record updated' : 'Record created',
    data: {
      id: result?.id?.toString() || records.find(r => r.record_date === record_date)?.id || generateId(),
      record_date,
      weight,
      waist: waist || 0,
      note: note || '',
    },
  });
});

// Get records statistics
app.get('/api/v1/records/stats', (req, res) => {
  // 从本地数据库读取所有记录（仅到今天为止）
  const todayStr = new Date().toISOString().split('T')[0];
  let allRecords = localDb.getAllRecords().filter((r: any) => r.record_date <= todayStr);
  // 如果本地数据库为空，回退到内存（同样过滤未来日期）
  if (allRecords.length === 0) {
    allRecords = [...records]
      .filter((r: any) => r.record_date <= todayStr)
      .sort((a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime());
  }

  if (allRecords.length === 0) {
    return res.json({
      code: 200,
      data: { totalRecords: 0, consecutiveDays: 0, monthRecords: 0, latest: null },
    });
  }

  // Sort descending
  const sortedRecords = [...allRecords].sort(
    (a, b) => new Date(b.record_date).getTime() - new Date(a.record_date).getTime()
  );

  // Total records
  const totalRecords = sortedRecords.length;

  // This month records
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthRecords = sortedRecords.filter(
    (r: any) => (r.record_date || '').startsWith(monthStart)
  ).length;

  // Consecutive days (counting backwards from today)
  let consecutiveDays = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    const hasRecord = sortedRecords.some((r: any) => r.record_date === dateStr);
    if (hasRecord) {
      consecutiveDays++;
    } else if (i > 0) {
      break;
    }
  }

  res.json({
    code: 200,
    data: {
      totalRecords,
      consecutiveDays,
      monthRecords,
      latest: sortedRecords[0] || null,
    },
  });
});

// Export records (从数据库读取)
app.get('/api/v1/records/export', async (req, res) => {
  // 优先从本地数据库读取
  try {
    const localRecords = localDb.getAllRecords();
    if (localRecords.length > 0) {
      return res.json({ code: 200, data: localRecords.map((r: any) => ({
        id: r.id, record_date: r.record_date, weight: r.weight, waist: r.waist, note: r.note || '',
      })).sort((a: any, b: any) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime()) });
    }
  } catch (_e) {}

  // 尝试 Supabase
  try {
    const { data } = await supabase.from('checkin_records').select('*').order('checkin_date', { ascending: true });
    if (data?.length > 0) {
      return res.json({ code: 200, data: (data || []).map((r: any) => ({
        id: r.id.toString(), record_date: r.checkin_date,
        weight: parseFloat(r.weight) || 0, waist: parseFloat(r.waist_circumference) || 0, note: r.note || '',
      })) });
    }
  } catch (_e) {}

  // 回退到内存
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
  );
  res.json({ code: 200, data: sortedRecords });
});

// ==================== Health API ====================

// Get health metrics (从数据库读取最新数据)
app.get('/api/v1/health/metrics', async (req, res) => {
  try {
    // 从本地数据库获取用户和最新记录
    let user = localDb.getUser('1') || users[0];
    const localLatestRecord = localDb.getLatestRecord();
    let latestRecord = localLatestRecord;

    // 如果本地数据库没有记录，尝试 Supabase
    if (!latestRecord) {
      try {
        const result = await supabase.from('checkin_records').select('*').order('checkin_date', { ascending: false }).limit(1);
        if (!result.error && result.data?.[0]) {
          const r = result.data[0];
          latestRecord = { weight: parseFloat(r.weight) || 0, waist: parseFloat(r.waist_circumference) || 0, record_date: r.checkin_date };
        }
      } catch (_e) { console.log('Supabase records query failed'); }
    }

    // 如果还没有记录，回退到内存
    if (!latestRecord) {
      latestRecord = getLatestMemoryRecord();
    }

    if (!user) {
      user = { height: 170, gender: 'male', birth_date: '1990-01-01', target_weight: 70 } as any;
    }

  // 基本参数
  const currentWeight = latestRecord?.weight || user.target_weight || 70;
  const currentWaist = latestRecord?.waist || 85;
  const heightM = user.height / 100;
  const age = calcAge(user.birth_date);
  const isMale = user.gender === 'male';

  // 1. BMI计算
  const bmi = currentWeight / (heightM * heightM);

  // 2. 体脂率计算（公式：1.2×BMI + 0.23×年龄 - 16.2(男) / -5.4(女)）
  const bodyFatRate = isMale
    ? 1.2 * bmi + 0.23 * age - 16.2
    : 1.2 * bmi + 0.23 * age - 5.4;

  // 3. 脂肪量
  const fatMass = currentWeight * (bodyFatRate / 100);

  // 4. 去脂体重
  const leanBodyMass = currentWeight - fatMass;

  // 5. 水分（去脂体重的73.5%）
  const waterWeight = leanBodyMass * 0.735;

  // 6. 骨质
  const boneMass = leanBodyMass * 0.17;

  // 7. 肌肉量
  const muscleMass = leanBodyMass - boneMass;

  // 8. 骨骼肌（肌肉量的71.3%）
  const skeletalMuscle = muscleMass * 0.713;

  // 9. 蛋白质
  const proteinMass = muscleMass - waterWeight;

  // 10. 基础代谢率BMR（Mifflin-St Jeor公式）
  const bmr = isMale
    ? 10 * currentWeight + 6.25 * user.height - 5 * age + 5
    : 10 * currentWeight + 6.25 * user.height - 5 * age - 161;

  // 11. 内脏脂肪指数(VFA)
  const vfa = 1.08 * currentWaist + 0.13 * bmi + 0.16 * age - 10.5 * (isMale ? 1 : 0) - 94.2;

  // 12. 身体年龄计算（按照《身体年龄计算》文档）
  // BMI年龄
  let bmiAge = age;
  if (bmi >= 18.5 && bmi < 24) bmiAge = age;
  else if (bmi >= 24 && bmi < 28) bmiAge = age + 5;
  else if (bmi >= 28) bmiAge = age + 10;
  else if (bmi < 18.5) bmiAge = age + 3;

  // 腰围年龄
  let waistAge = age;
  if (isMale) {
    if (currentWaist >= 85 && currentWaist < 90) waistAge = age + 5;
    else if (currentWaist >= 90) waistAge = age + 10;
  } else {
    if (currentWaist >= 80 && currentWaist < 85) waistAge = age + 5;
    else if (currentWaist >= 85) waistAge = age + 10;
  }

  // 肌肉量年龄（使用骨骼肌率）
  const skeletalMuscleRate = (skeletalMuscle / currentWeight) * 100;
  let muscleAge = age;
  if (isMale) {
    if (skeletalMuscleRate >= 35) muscleAge = age - 5;
    else if (skeletalMuscleRate < 30) muscleAge = age + 5;
  } else {
    if (skeletalMuscleRate >= 28) muscleAge = age - 5;
    else if (skeletalMuscleRate < 25) muscleAge = age + 5;
  }

  // 基础身体年龄 = 0.6×实际年龄 + 0.4×BMI年龄 + 0.3×腰围年龄 - 0.3×肌肉量年龄
  const basicBodyAge = 0.6 * age + 0.4 * bmiAge + 0.3 * waistAge - 0.3 * muscleAge;

  // 进阶身体年龄 = 实际年龄 +（内脏脂肪等级-9）×2 + (体脂率-标准体脂率) ×1 - (肌肉率-标准肌肉率) ×1
  // 标准体脂率：男性 17.5%，女性 22.5%
  // 标准肌肉率：男性 37.5%，女性 30.5%
  const standardBodyFat = isMale ? 17.5 : 22.5;
  const standardMuscle = isMale ? 37.5 : 30.5;
  const vfiLevel = Math.max(1, Math.min(59, Math.round(vfa / 2 + 5)));
  const advancedBodyAge = age + (vfiLevel - 9) * 2 + (bodyFatRate - standardBodyFat) * 1 - (skeletalMuscleRate - standardMuscle) * 1;

  // 最终身体年龄 = 基础身体年龄 × 40% + 进阶身体年龄 × 60%
  const bodyAge = Math.round(basicBodyAge * 0.4 + advancedBodyAge * 0.6);

  // 13. 健康评分(5个维度，每项20分) - 按照《简易综合健康自评评分表》文档
  // 维度1: BMI评分（20分，男女通用）
  let bmiScore = 6;
  if (bmi >= 18.5 && bmi < 24) bmiScore = 20;
  else if (bmi >= 24 && bmi < 28) bmiScore = 14;

  // 维度2: 腰围评分（20分，男女分开标准）
  let waistScore = 5;
  if (isMale) {
    if (currentWaist < 85) waistScore = 20;
    else if (currentWaist >= 85 && currentWaist < 90) waistScore = 12;
  } else {
    if (currentWaist < 80) waistScore = 20;
    else if (currentWaist >= 80 && currentWaist < 85) waistScore = 12;
  }

  // 维度3: 体脂率评分（20分，男女分开标准）
  let bodyFatScore = 6;
  if (isMale) {
    if (bodyFatRate >= 15 && bodyFatRate <= 22) bodyFatScore = 20;
    else if (bodyFatRate >= 23 && bodyFatRate <= 27) bodyFatScore = 13;
  } else {
    if (bodyFatRate >= 20 && bodyFatRate <= 28) bodyFatScore = 20;
    else if (bodyFatRate >= 29 && bodyFatRate <= 33) bodyFatScore = 13;
  }

  // 维度4: 骨骼肌肉率评分（20分，男女分开标准）
  let muscleScore = 7;
  if (isMale) {
    if (skeletalMuscleRate >= 35) muscleScore = 20;
    else if (skeletalMuscleRate >= 32 && skeletalMuscleRate < 35) muscleScore = 14;
  } else {
    if (skeletalMuscleRate >= 30) muscleScore = 20;
    else if (skeletalMuscleRate >= 27 && skeletalMuscleRate < 30) muscleScore = 14;
  }

  // 维度5: 身体年龄差值评分（20分）
  const ageDiff = bodyAge - age;
  let ageScore = 4;
  if (bodyAge < age) ageScore = 20;
  else if (ageDiff === 0) ageScore = 15;
  else if (ageDiff > 0 && ageDiff <= 3) ageScore = 10;

  const healthScore = bmiScore + waistScore + bodyFatScore + muscleScore + ageScore;

  // 健康等级
  let healthLevel = '偏弱';
  if (healthScore >= 90) healthLevel = '优秀';
  else if (healthScore >= 80) healthLevel = '良好';
  else if (healthScore >= 70) healthLevel = '一般';

  // BMI等级
  let bmiLevel = '正常';
  if (bmi < 18.5) bmiLevel = '体重过低';
  else if (bmi >= 24 && bmi < 28) bmiLevel = '超重';
  else if (bmi >= 28) bmiLevel = '肥胖';

  // 腰围等级
  let waistLevel = '正常';
  if (isMale) {
    if (currentWaist >= 85 && currentWaist < 90) waistLevel = '临界肥胖';
    else if (currentWaist >= 90) waistLevel = '中心性肥胖';
  } else {
    if (currentWaist >= 80 && currentWaist < 85) waistLevel = '临界肥胖';
    else if (currentWaist >= 85) waistLevel = '中心性肥胖';
  }

  // 体脂等级
  let bodyFatLevel = '正常';
  if (isMale) {
    if (bodyFatRate < 15) bodyFatLevel = '偏低';
    else if (bodyFatRate > 27) bodyFatLevel = '偏高';
  } else {
    if (bodyFatRate < 20) bodyFatLevel = '偏低';
    else if (bodyFatRate > 33) bodyFatLevel = '偏高';
  }

  // 肥胖等级
  let obesityLevel = '正常';
  if (bmi < 18.5) obesityLevel = '偏瘦';
  else if (bmi >= 24 && bmi < 28) obesityLevel = '超重';
  else if (bmi >= 28) obesityLevel = '肥胖';

  // 体重差距（基于用户设定的目标体重）
  const weightDiff = currentWeight - (user.target_weight || 70);

  // Check if today is checked in
  const today = new Date().toISOString().split('T')[0];
  const todayCheckedIn = latestRecord?.record_date === today;

  res.json({
    code: 200,
    data: {
      // 基本数据
      currentWeight: Math.round(currentWeight * 10) / 10,
      currentWaist: Math.round(currentWaist * 10) / 10,
      todayCheckedIn,
      weightDiff: Math.round(weightDiff * 10) / 10,
      // 身体成分
      bmi: Math.round(bmi * 10) / 10,
      bmiLevel,
      bodyFatRate: Math.round(bodyFatRate * 10) / 10,
      bodyFatLevel,
      fatMass: Math.round(fatMass * 10) / 10,
      leanBodyMass: Math.round(leanBodyMass * 10) / 10,
      waterWeight: Math.round(waterWeight * 10) / 10,
      muscleMass: Math.round(muscleMass * 10) / 10,
      skeletalMuscle: Math.round(skeletalMuscle * 10) / 10,
      boneMass: Math.round(boneMass * 10) / 10,
      proteinMass: Math.round(proteinMass * 10) / 10,
      // 内脏脂肪
      vfa: Math.round(vfa * 10) / 10,
      vfiLevel,
      // 代谢指标
      bmr: Math.round(bmr),
      // 年龄指标
      bodyAge: Math.round(bodyAge),
      realAge: age,
      // 健康评分（统一标准）
      healthScore: {
        total: healthScore,
        level: healthLevel,
        breakdown: {
          bmi: bmiScore,
          waist: waistScore,
          bodyFat: bodyFatScore,
          muscle: muscleScore,
          bodyAge: ageScore,
        },
      },
      // 其他等级
      waistLevel,
      obesityLevel,
    },
  });
  } catch (error) {
    console.error('Health metrics error:', error);
    res.status(500).json({ code: 500, msg: '获取健康指标失败', error: (error as Error).message });
  }
});

// Get health trend
app.get('/api/v1/health/trend', (req, res) => {
  const days = parseInt(req.query.days as string) || 7;
  const now = new Date();
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = now.toISOString().split('T')[0];

  // 优先从本地数据库读取
  let trendRecords: any[] = [];
  try {
    trendRecords = localDb.getRecordsByDateRange(startDateStr, endDateStr)
      .sort((a: any, b: any) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());
  } catch (_e) { /* ignore */ }

  // 如果本地数据库为空，回退到内存
  if (trendRecords.length === 0) {
    trendRecords = records
      .filter((r) => new Date(r.record_date) >= startDate)
      .sort((a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime());
  }

  const weightTrend = trendRecords.map((r) => ({
    date: r.record_date,
    weight: r.weight,
  }));

  const waistTrend = trendRecords.map((r) => ({
    date: r.record_date,
    waist: r.waist,
  }));

  // Calculate stats
  let weightStats = { start: 0, end: 0, change: 0, changePercent: 0 };
  let waistStats = { start: 0, end: 0, change: 0, changePercent: 0 };

  if (trendRecords.length >= 2) {
    const first = trendRecords[0];
    const last = trendRecords[trendRecords.length - 1];

    weightStats = {
      start: first.weight,
      end: last.weight,
      change: last.weight - first.weight,
      changePercent: ((last.weight - first.weight) / first.weight) * 100,
    };

    waistStats = {
      start: first.waist,
      end: last.waist,
      change: last.waist - first.waist,
      changePercent: ((last.waist - first.waist) / first.waist) * 100,
    };
  }

  res.json({
    code: 200,
    data: {
      weightTrend,
      waistTrend,
      weightStats,
      waistStats,
    },
  });
});

// Calculate weight loss plan - 基于文档公式
app.post('/api/v1/health/weight-plan', async (req, res) => {
  try {
    const { weeklyGoal, activityLevel } = req.body;

    // 从本地数据库/内存获取用户信息和最新记录
    let user = localDb.getUser('1') || users[0];
    const localLatest = localDb.getLatestRecord();
    let latestRecord = localLatest || getLatestMemoryRecord();
    // 尝试 Supabase 补充
    try {
      const { data: dbUsers } = await supabase.from('users').select('*').limit(1);
      if (dbUsers?.[0]) {
        const dbUser = dbUsers[0];
        user = { ...user, height: dbUser.height || 170, gender: dbUser.gender || 'male', birth_date: dbUser.birth_date || '1990-01-01', target_weight: dbUser.target_weight || 70 };
      }
    } catch {}
    try {
      const { data: dbRecords } = await supabase.from('checkin_records').select('*').order('checkin_date', { ascending: false }).limit(1);
      if (dbRecords?.[0] && !latestRecord) {
        latestRecord = { id: String(dbRecords[0].id), user_id: String(dbRecords[0].user_id), record_date: dbRecords[0].checkin_date, weight: parseFloat(dbRecords[0].weight) || 0, waist: parseFloat(dbRecords[0].waist_circumference) || 0, note: dbRecords[0].note || '', created_at: dbRecords[0].created_at || '' };
      }
    } catch {}

    // 基础数据（当前体重 = 最新打卡记录的体重）
    const currentWeight = latestRecord?.weight || user.target_weight || 70; // kg
    const currentWaist = latestRecord?.waist || 80; // cm
  const targetWeight = user.target_weight || 65; // kg
  const height = user.height || 170; // cm
  const age = calcAge(user.birth_date);
  const isMale = user.gender === 'male';
  const genderValue = isMale ? 1 : 0;

  // 1. BMI = 体重(kg) / 身高(m)²
  const heightM = height / 100;
  const bmi = currentWeight / (heightM * heightM);

  // 2. 体脂率估算公式
  // 男性：1.2*BMI + 0.23*年龄 - 16.2
  // 女性：1.2*BMI + 0.23*年龄 - 5.4
  const bodyFatRate = isMale
    ? 1.2 * bmi + 0.23 * age - 16.2
    : 1.2 * bmi + 0.23 * age - 5.4;

  // 3. 脂肪量 = 体重 × 体脂率
  const fatMass = currentWeight * (bodyFatRate / 100);

  // 4. 去脂体重(瘦体重) = 体重 - 脂肪量
  const leanBodyMass = currentWeight - fatMass;

  // 5. 水分 = 去脂体重 × 0.735（单位：kg）
  const bodyWater = leanBodyMass * 0.735;

  // 6. 骨质(BMC) = 瘦体重 × 0.17（男0.16-0.18，女0.15-0.17）
  const boneMassFactor = isMale ? 0.17 : 0.16;
  const boneMass = leanBodyMass * boneMassFactor;

  // 7. 蛋白质 = 瘦体重 × 0.19
  const protein = leanBodyMass * 0.19;

  // 8. 肌肉量 = 水分 + 蛋白质 或 去脂体重 - 骨质
  const muscleMass = leanBodyMass - boneMass;

  // 9. 骨骼肌 = 肌肉量 × 71.3%
  const skeletalMuscle = muscleMass * 0.713;

  // 10. 内脏脂肪(VFA)
  // VFA = 1.08×腰围 + 0.13×BMI + 0.16×年龄 - 10.5×性别 - 94.2
  const vfa = 1.08 * currentWaist + 0.13 * bmi + 0.16 * age - 10.5 * genderValue - 94.2;
  // 内脏脂肪等级(1-59)
  const visceralFatLevel = Math.max(1, Math.min(59, Math.round(vfa / 2 + 5)));
  // 内脏脂肪重量 = VFA × 0.015
  const visceralFatMass = vfa * 0.015;

  // 11. BMR (Mifflin-St Jeor公式)
  // 男性：10×体重 + 6.25×身高 - 5×年龄 + 5
  // 女性：10×体重 + 6.25×身高 - 5×年龄 - 161
  const bmr = isMale
    ? 10 * currentWeight + 6.25 * height - 5 * age + 5
    : 10 * currentWeight + 6.25 * height - 5 * age - 161;

  // 12. 身体年龄计算（按照《身体年龄计算》文档）
  // BMI年龄
  let bmiAge = age;
  if (bmi >= 18.5 && bmi < 24) bmiAge = age;
  else if (bmi >= 24 && bmi < 28) bmiAge = age + 5;
  else if (bmi >= 28) bmiAge = age + 10;
  else if (bmi < 18.5) bmiAge = age + 3;

  // 腰围年龄
  const waistStandard = isMale ? 85 : 80;
  const waistWarning1 = isMale ? 90 : 85;
  let waistAge = age;
  if (currentWaist >= waistWarning1) waistAge = age + 10;
  else if (currentWaist >= waistStandard) waistAge = age + 5;

  // 肌肉量年龄（使用骨骼肌率）
  const skeletalMuscleRate = (skeletalMuscle / currentWeight) * 100;
  const muscleRateStandard = isMale ? 35 : 28;
  const muscleRateGood = isMale ? 37.5 : 30.5;
  let muscleAge = age;
  if (skeletalMuscleRate >= muscleRateGood) muscleAge = age - 5;
  else if (skeletalMuscleRate < (isMale ? 30 : 25)) muscleAge = age + 5;

  // 基础身体年龄 = 0.6×实际年龄 + 0.4×BMI年龄 + 0.3×腰围年龄 - 0.3×肌肉量年龄
  const basicBodyAge = 0.6 * age + 0.4 * bmiAge + 0.3 * waistAge - 0.3 * muscleAge;

  // 标准体脂率和肌肉率
  const standardBodyFatRate = isMale ? 17.5 : 22.5;
  const standardMuscleRate = isMale ? 37.5 : 30.5;

  // 进阶身体年龄 = 实际年龄 +（内脏脂肪等级-9）×2 + (体脂率-标准体脂率) ×1 - (肌肉率-标准肌肉率) ×1
  const advancedBodyAge = age + (visceralFatLevel - 9) * 2 + (bodyFatRate - standardBodyFatRate) * 1 - (skeletalMuscleRate - standardMuscleRate) * 1;

  // 最终身体年龄 = 基础身体年龄 × 40% + 进阶身体年龄 × 60%
  const bodyAge = Math.round(basicBodyAge * 0.4 + advancedBodyAge * 0.6);

	  // 13. 健康评分(5个维度，每项20分) - 按照《简易综合健康自评评分表》文档
	  // 维度1: BMI评分（20分，男女通用）
	  let bmiScore = 6;
	  if (bmi >= 18.5 && bmi < 24) bmiScore = 20;
	  else if (bmi >= 24 && bmi < 28) bmiScore = 14;

	  // 维度2: 腰围评分（20分，男女分开标准）
	  // 男性: <85cm=20, 85-90cm=12, ≥90cm=5
	  // 女性: <80cm=20, 80-85cm=12, ≥85cm=5
	  let waistScore = 5;
	  if (isMale) {
	    if (currentWaist < 85) waistScore = 20;
	    else if (currentWaist >= 85 && currentWaist < 90) waistScore = 12;
	  } else {
	    if (currentWaist < 80) waistScore = 20;
	    else if (currentWaist >= 80 && currentWaist < 85) waistScore = 12;
	  }

	  // 维度3: 体脂率评分（20分，男女分开标准）
	  // 男性: 15%-22%=20, 23%-27%=13, <12% 或 >27%=6
	  // 女性: 20%-28%=20, 29%-33%=13, <17% 或 >33%=6
	  let bodyFatScore = 6;
	  if (isMale) {
	    if (bodyFatRate >= 15 && bodyFatRate <= 22) bodyFatScore = 20;
	    else if (bodyFatRate >= 23 && bodyFatRate <= 27) bodyFatScore = 13;
	  } else {
	    if (bodyFatRate >= 20 && bodyFatRate <= 28) bodyFatScore = 20;
	    else if (bodyFatRate >= 29 && bodyFatRate <= 33) bodyFatScore = 13;
	  }

	  // 维度4: 骨骼肌肉率评分（20分，男女分开标准）
	  // 骨骼肌肉率 = 骨骼肌重量 ÷ 实际体重 × 100%
	  // 男性: ≥35%=20, 32%-34.9%=14, <32%=7
	  // 女性: ≥30%=20, 27%-29.9%=14, <27%=7
	  let muscleScore = 7;
	  if (isMale) {
	    if (skeletalMuscleRate >= 35) muscleScore = 20;
	    else if (skeletalMuscleRate >= 32 && skeletalMuscleRate < 35) muscleScore = 14;
	  } else {
	    if (skeletalMuscleRate >= 30) muscleScore = 20;
	    else if (skeletalMuscleRate >= 27 && skeletalMuscleRate < 30) muscleScore = 14;
	  }

	  // 维度5: 身体年龄差值评分（20分）
	  const ageDiff = bodyAge - age;
	  let ageScore = 4;
	  if (bodyAge < age) ageScore = 20;
	  else if (ageDiff === 0) ageScore = 15;
	  else if (ageDiff > 0 && ageDiff <= 3) ageScore = 10;

	  const healthScore = bmiScore + waistScore + bodyFatScore + muscleScore + ageScore;

  // 健康等级
  let healthLevel = '偏弱';
  if (healthScore >= 90) healthLevel = '优秀';
  else if (healthScore >= 80) healthLevel = '良好';
  else if (healthScore >= 70) healthLevel = '一般';

  // 14. 肥胖等级(中国BMI标准)
  let obesityLevel = '正常';
  if (bmi < 18.5) obesityLevel = '偏瘦';
  else if (bmi >= 24 && bmi < 28) obesityLevel = '超重';
  else if (bmi >= 28) obesityLevel = '肥胖';

  // 15. 理想体重 = 22.2 × 身高²
  const idealWeight = 22.2 * heightM * heightM;
  // 理想脂肪量 = 理想体重 × 19%
  const idealFatMass = idealWeight * 0.19;
  // 理想肌肉量 = 理想体重 × 标准肌肉率（男37.5%，女30.5%）
  const idealMuscleRate = isMale ? 0.375 : 0.305;
  const idealMuscleMass = idealWeight * idealMuscleRate;
  // 体重控制量
  const weightControl = currentWeight - idealWeight;
  // 脂肪控制量
  const fatControl = fatMass - idealFatMass;
  // 肌肉控制量（与骨骼肌比较）
  const muscleControl = Math.max(0, idealMuscleMass - skeletalMuscle);

  // 16. 热量计算
  const activityFactors: { [key: string]: number } = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    veryActive: 1.9,
  };
  const activityFactor = activityFactors[activityLevel] || 1.2;
  const tdee = bmr * activityFactor;

  const weeklyGoalKg = weeklyGoal || 0.5;
  const dailyDeficit = (weeklyGoalKg * 7700) / 7;
  const dailyCalories = Math.round(tdee - dailyDeficit);

  // 营养配比（蛋白质32%、碳水化合物46%、脂肪22%）
  const PROTEIN_RATIO = 0.32;
  const CARBS_RATIO = 0.46;
  const FAT_RATIO = 0.22;
  const proteinCalories = dailyCalories * PROTEIN_RATIO;
  const fatCalories = dailyCalories * FAT_RATIO;
  const carbsCalories = dailyCalories * CARBS_RATIO;

  const proteinGrams = Math.round(proteinCalories / 4);
  const fatGrams = Math.round(fatCalories / 9);
  const carbsGrams = Math.round(carbsCalories / 4);

  // 纤维和水
  const fiber = Math.round((dailyCalories / 1000) * 14);
  const water = Math.round(currentWeight * 33);

  // 达成目标时间
  const weightToLose = currentWeight - targetWeight;
  const weeksToGoal = weightToLose > 0 ? Math.ceil(weightToLose / weeklyGoalKg) : 0;
  const isGoalAchieved = weightToLose <= 0;

  res.json({
    code: 200,
    data: {
      // 基础指标
      bmi: Math.round(bmi * 10) / 10,
      bodyFatRate: Math.round(bodyFatRate * 10) / 10,
      obesityLevel,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      bodyAge,

      // 身体成分
      bodyComposition: {
        weight: Math.round(currentWeight * 10) / 10,
        fatMass: Math.round(fatMass * 10) / 10,
        leanBodyMass: Math.round(leanBodyMass * 10) / 10,
        bodyWater: Math.round(bodyWater * 10) / 10,
        muscleMass: Math.round(muscleMass * 10) / 10,
        skeletalMuscle: Math.round(skeletalMuscle * 10) / 10,
        boneMass: Math.round(boneMass * 10) / 10,
        protein: Math.round(protein * 10) / 10,
        visceralFat: Math.round(visceralFatMass * 10) / 10,
        visceralFatLevel,
      },

      // 健康评估（匹配前端WeightPlanModal期望的结构）
      healthAssessment: {
        visceralFatIndex: Math.round(visceralFatMass * 10) / 10,
        visceralFatLevel,
        bodyAge,
        healthScore: {
          total: healthScore,
          level: healthLevel,
          breakdown: {
            bmi: bmiScore,
            waist: waistScore,
            bodyFat: bodyFatScore,
            muscle: muscleScore,
            bodyAge: ageScore,
          },
        },
      },

      // 控制量
      controlTargets: {
        idealWeight: Math.round(idealWeight * 10) / 10,
        idealFatMass: Math.round(idealFatMass * 10) / 10,
        idealMuscleMass: Math.round(idealMuscleMass * 10) / 10,
        weightControl: Math.round(weightControl * 10) / 10,
        fatControl: Math.round(fatControl * 10) / 10,
        muscleControl: Math.round(muscleControl * 10) / 10,
      },

      // 减重方案
      dailyCalories,
      dailyDeficit: Math.round(dailyDeficit),
      weeksToGoal,
      isGoalAchieved,
      weeklyGoal: weeklyGoalKg,
      activityLevel: activityLevel || 'sedentary',

      // 营养配比（匹配前端WeightPlanModal期望的macros字段名）
      macros: {
        protein: proteinGrams,
        proteinPercent: Math.round((proteinCalories / dailyCalories) * 100),
        carbs: carbsGrams,
        carbsPercent: Math.round((carbsCalories / dailyCalories) * 100),
        fat: fatGrams,
        fatPercent: Math.round(FAT_RATIO * 100),
        fiber,
        water,
      },
    },
  });
  } catch (error) {
    console.error('Weight plan error:', error);
    res.status(500).json({ code: 500, msg: '生成减重方案失败', error: (error as Error).message });
  }
});

// Get detailed stats
app.get('/api/v1/health/stats', (req, res) => {
  const user = users[0];
  const sortedRecords = [...records].sort(
    (a, b) => new Date(a.record_date).getTime() - new Date(b.record_date).getTime()
  );

  if (sortedRecords.length === 0) {
    return res.json({ code: 200, data: null });
  }

  const weights = sortedRecords.map((r) => r.weight);
  const waists = sortedRecords.map((r) => r.waist);

  // Calculate weight stats
  const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  const maxWeightDate = sortedRecords.find((r) => r.weight === maxWeight)?.record_date;
  const minWeightDate = sortedRecords.find((r) => r.weight === minWeight)?.record_date;

  // Standard deviation
  const weightVariance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length;
  const weightStdDev = Math.sqrt(weightVariance);

  // Calculate waist stats
  const avgWaist = waists.reduce((a, b) => a + b, 0) / waists.length;
  const maxWaist = Math.max(...waists);
  const minWaist = Math.min(...waists);
  const maxWaistDate = sortedRecords.find((r) => r.waist === maxWaist)?.record_date;
  const minWaistDate = sortedRecords.find((r) => r.waist === minWaist)?.record_date;

  // Waist level
  let waistLevel = '正常';
  if (user.gender === 'male') {
    if (avgWaist >= 95) waistLevel = '中心型肥胖';
    else if (avgWaist >= 85) waistLevel = '中心型肥胖前期';
  } else {
    if (avgWaist >= 90) waistLevel = '中心型肥胖';
    else if (avgWaist >= 80) waistLevel = '中心型肥胖前期';
  }

  // BMI stats
  const heightM = user.height / 100;
  const latestBmi = sortedRecords.length > 0 ? sortedRecords[sortedRecords.length - 1].weight / (heightM * heightM) : 0;
  let bmiLevel = '正常';
  if (latestBmi < 18.5) bmiLevel = '体重过低';
  else if (latestBmi >= 28) bmiLevel = '肥胖';
  else if (latestBmi >= 24) bmiLevel = '超重';

  // Body composition (simplified estimates)
  const latestWeight = sortedRecords[sortedRecords.length - 1].weight;
  const fatMass = Math.round(latestWeight * 0.2 * 10) / 10;
  const leanBodyMass = Math.round((latestWeight - fatMass) * 10) / 10;
  const bodyWater = Math.round(leanBodyMass * 0.6 * 10) / 10;
  const protein = Math.round(leanBodyMass * 0.18 * 10) / 10;
  const boneMass = Math.round(leanBodyMass * 0.05 * 10) / 10;
  const muscleMass = Math.round(leanBodyMass * 0.4 * 10) / 10;
  const skeletalMuscle = Math.round(muscleMass * 0.5 * 10) / 10;
  const vfi = Math.round(avgWaist / 10 - 6);

  // BMR
  const age = calcAge(user.birth_date);
  let bmr = 1800;
  if (user.gender === 'male') {
    bmr = Math.round(66 + 13.7 * latestWeight + 5 * user.height - 6.9 * age);
  } else {
    bmr = Math.round(655 + 9.6 * latestWeight + 1.8 * user.height - 4.7 * age);
  }

  res.json({
    code: 200,
    data: {
      weightStats: {
        avg: Math.round(avgWeight * 10) / 10,
        max: maxWeight,
        maxDate: maxWeightDate,
        min: minWeight,
        minDate: minWeightDate,
        stdDev: Math.round(weightStdDev * 10) / 10,
      },
      waistStats: {
        avg: Math.round(avgWaist * 10) / 10,
        max: maxWaist,
        maxDate: maxWaistDate,
        min: minWaist,
        minDate: minWaistDate,
        stdDev: 0,
        level: waistLevel,
      },
      bmiLevel: {
        current: Math.round(latestBmi * 10) / 10,
        level: bmiLevel,
        ranges: {
          underweight: { max: 18.5, label: '体重过低' },
          normal: { min: 18.5, max: 24, label: '正常' },
          overweight: { min: 24, max: 28, label: '超重' },
          obese: { min: 28, label: '肥胖' },
        },
      },
      bodyFatLevel: {
        current: 20,
        status: '正常',
        ranges: {
          low: { max: 10, label: '偏低' },
          normal: { min: 10, max: 20, label: '正常' },
          high: { min: 20, max: 25, label: '偏高' },
          obese: { min: 25, label: '肥胖' },
        },
      },
      waistLevel: {
        current: avgWaist,
        level: waistLevel,
        ranges: {
          normal: { max: user.gender === 'male' ? 85 : 80, label: '正常' },
          preObese: { min: user.gender === 'male' ? 85 : 80, max: user.gender === 'male' ? 95 : 90, label: '中心型肥胖前期' },
          obese: { min: user.gender === 'male' ? 95 : 90, label: '中心型肥胖' },
        },
      },
      bodyComposition: {
        fatMass,
        leanBodyMass,
        bodyWater,
        protein,
        muscleMass,
        skeletalMuscle,
        boneMass,
        vfi,
        bmr,
      },
      gender: user.gender || 'male',
    },
  });
});

// Feedback
app.post('/api/v1/user/feedback', (req, res) => {
  const { content, contact } = req.body;
  console.log('Feedback received:', { content, contact });
  res.json({ code: 200, msg: 'Feedback submitted successfully' });
});

// Notifications API
app.get('/api/v1/notifications', (req, res) => {
  try {
    const notifications = localDb.getNotifications();
    res.json({ code: 200, data: notifications });
  } catch (e: any) {
    res.json({ code: 200, data: [] });
  }
});

app.get('/api/v1/notifications/unread-count', (req, res) => {
  try {
    const count = localDb.getUnreadCount();
    res.json({ code: 200, data: { count } });
  } catch (e: any) {
    res.json({ code: 200, data: { count: 0 } });
  }
});

app.put('/api/v1/notifications/:id/read', (req, res) => {
  try {
    localDb.markNotificationRead(req.params.id);
    res.json({ code: 200, msg: 'ok' });
  } catch (e: any) {
    res.json({ code: 200, msg: 'ok' });
  }
});

app.put('/api/v1/notifications/read-all', (req, res) => {
  try {
    localDb.markAllNotificationsRead();
    res.json({ code: 200, msg: 'ok' });
  } catch (e: any) {
    res.json({ code: 200, msg: 'ok' });
  }
});

// Seed demo records into local DB if empty
try {
  const existingRecords = localDb.getAllRecords();
  if (existingRecords.length === 0) {
    const demoRecords = [
      { date: '2024-01-01', weight: 78, waist: 88 },
      { date: '2024-01-02', weight: 77.5, waist: 87.5 },
      { date: '2024-01-03', weight: 77.2, waist: 87 },
      { date: '2024-01-04', weight: 76.8, waist: 86.5 },
      { date: '2024-01-05', weight: 76.5, waist: 86 },
      { date: '2024-01-06', weight: 76.2, waist: 85.5 },
      { date: '2024-01-07', weight: 76, waist: 85 },
    ];
    demoRecords.forEach(r => {
      localDb.upsertRecord({ id: generateId(), user_id: '1', record_date: r.date, weight: r.weight, waist: r.waist, note: '' });
    });
    console.log('LocalDB: Seeded 7 demo records');
  }
  // Seed demo notifications if none exist
  const existingNotifs = localDb.getNotifications();
  if (existingNotifs.length === 0) {
    localDb.addNotification('打卡提醒', '坚持打卡，记录今天的体重和腰围数据吧！');
    localDb.addNotification('健康小贴士', '每天饮水2000ml以上，有助于新陈代谢和体重管理。');
    localDb.addNotification('每周总结', '本周体重下降0.5kg，继续保持良好的运动和饮食习惯！');
    console.log('LocalDB: Seeded 3 demo notifications');
  }
} catch (e: any) {
  console.log('LocalDB seed skipped:', e.message);
}

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
