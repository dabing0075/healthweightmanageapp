import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

// Types
interface Record {
  id: string;
  record_date: string;
  weight: number;
  waist: number;
  note: string;
}

export default function CheckinPage() {
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [weight, setWeight] = useState('');
  const [waist, setWaist] = useState('');
  const [note, setNote] = useState('');
  const [recentRecords, setRecentRecords] = useState<Record[]>([]);
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [checkedDates, setCheckedDates] = useState<Set<string>>(new Set());
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [allRecords, setAllRecords] = useState<Record[]>([]);
  const router = useSafeRouter();

  const API_BASE = 'http://localhost:9091';

  function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Load recent records
  const loadRecentRecords = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/records/recent?days=7`);
      const data = await res.json();
      if (data.code === 200 && data.data) {
        setRecentRecords(data.data);
        const todayRecord = data.data.find((r: Record) => r.record_date === getTodayDate());
        setTodayCheckedIn(!!todayRecord);
      }
    } catch (error) {
      console.error('Load recent records error:', error);
    }
  };

  // Load all records
  const loadAllRecords = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/records/history?days=36500`);
      const data = await res.json();
      if (data.code === 200 && data.data) {
        setAllRecords(data.data);
      }
    } catch (error) {
      console.error('Load all records error:', error);
    }
  };

  // Load month records for calendar
  const loadMonthRecords = async () => {
    try {
      const startDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const endDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const res = await fetch(`${API_BASE}/api/v1/records/history?startDate=${startDate}&endDate=${endDate}`);
      const data = await res.json();
      if (data.code === 200 && data.data) {
        const dates = new Set<string>(data.data.map((r: Record) => r.record_date));
        setCheckedDates(dates);
      }
    } catch (error) {
      console.error('Load month records error:', error);
    }
  };

  // Check existing record for selected date
  const checkExistingRecord = async (date: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/records/date/${date}`);
      const data = await res.json();
      if (data.code === 200 && data.data) {
        const record = data.data;
        setWeight(record.weight?.toString() || '');
        setWaist(record.waist?.toString() || '');
        setNote(record.note || '');
      } else {
        setWeight('');
        setWaist('');
        setNote('');
      }
    } catch (error) {
      console.error('Check existing record error:', error);
      setWeight('');
      setWaist('');
      setNote('');
    }
  };

  // 加载历史记录
  React.useEffect(() => {
    loadRecentRecords();
    loadMonthRecords();
    checkExistingRecord(selectedDate);
  }, [currentYear, currentMonth]);

  // Calendar navigation
  const goToPrevMonth = () => {
    let newYear = currentYear;
    let newMonth = currentMonth - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
  };

  const goToNextMonth = () => {
    let newYear = currentYear;
    let newMonth = currentMonth + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setCurrentYear(newYear);
    setCurrentMonth(newMonth);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const days: Array<{ date: string; day: number; isCurrentMonth: boolean }> = [];
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate();

    // Previous month days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const day = prevMonthDays - i;
      const prevMonth = currentMonth - 1 === 0 ? 12 : currentMonth - 1;
      const year = currentMonth - 1 === 0 ? currentYear - 1 : currentYear;
      days.push({
        date: `${year}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        day,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        day: i,
        isCurrentMonth: true,
      });
    }

    // Next month days (fill 6 rows)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonth = currentMonth + 1 === 13 ? 1 : currentMonth + 1;
      const year = currentMonth + 1 === 13 ? currentYear + 1 : currentYear;
      days.push({
        date: `${year}-${String(nextMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`,
        day: i,
        isCurrentMonth: false,
      });
    }

    return days;
  };

  // Handle date selection
  const handleDateSelect = (date: string, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return;
    setSelectedDate(date);
    checkExistingRecord(date);
  };

  // Submit checkin
  const handleSubmit = async () => {
    if (!weight) {
      Toast.show({ type: 'error', text1: '请输入体重' });
      return;
    }

    const weightNum = parseFloat(weight);
    if (isNaN(weightNum) || weightNum < 20 || weightNum > 300) {
      Toast.show({ type: 'error', text1: '请输入有效的体重（20-300kg）' });
      return;
    }

    const waistNum = waist ? parseFloat(waist) : 0;
    if (waist && (isNaN(waistNum) || waistNum < 40 || waistNum > 200)) {
      Toast.show({ type: 'error', text1: '请输入有效的腰围（40-200cm）' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          record_date: selectedDate,
          weight: weightNum,
          waist: waistNum,
          note: note.trim(),
        }),
      });
      const data = await res.json();

      if (data.code === 200) {
        Toast.show({
          type: 'success',
          text1: '打卡成功',
          text2: selectedDate === getTodayDate() ? '今日已记录' : `已记录 ${selectedDate}`,
        });
        loadRecentRecords();
        loadMonthRecords();
        // 返回首页，useFocusEffect 会自动刷新数据
        setTimeout(() => router.navigate("/(tabs)"), 1500);
      } else {
        Toast.show({ type: 'error', text1: '打卡失败', text2: data.msg });
      }
    } catch (error) {
      console.error('Submit error:', error);
      Toast.show({ type: 'error', text1: '网络错误', text2: '请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const today = getTodayDate();
    
    if (dateStr === today) return `${month}-${day} 今天`;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    if (dateStr === yesterdayStr) return `${month}-${day} 昨天`;
    
    return `${month}-${day}`;
  };

  const calendarDays = generateCalendarDays();
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  const today = getTodayDate();

  return (
    <Screen backgroundColor="#F7F4ED">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#1E2933' }}>记录数据</Text>
          </View>

          {/* Calendar */}
          <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
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
              {/* Month Header */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <TouchableOpacity onPress={goToPrevMonth} style={{ padding: 8 }}>
                  <FontAwesome6 name="chevron-left" size={18} color="#9CA3AF" />
                </TouchableOpacity>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933' }}>
                  {currentYear}年{currentMonth}月
                </Text>
                <TouchableOpacity onPress={goToNextMonth} style={{ padding: 8 }}>
                  <FontAwesome6 name="chevron-right" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {/* Weekday Headers */}
              <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                {weekdays.map((day, index) => (
                  <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ 
                      fontSize: 12, 
                      color: index === 0 || index === 6 ? '#F26B3A' : '#9CA3AF',
                      fontWeight: index === 0 || index === 6 ? '500' : '400'
                    }}>{day}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {calendarDays.map((item, index) => {
                  const isSelected = item.date === selectedDate;
                  const isToday = item.date === today;
                  const isChecked = checkedDates.has(item.date);
                  const dayOfWeek = new Date(item.date).getDay();

                  return (
                    <TouchableOpacity
                      key={index}
                      style={{ width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => handleDateSelect(item.date, item.isCurrentMonth)}
                      disabled={!item.isCurrentMonth}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected
                            ? '#F26B3A'
                            : isToday
                            ? 'rgba(242, 107, 58, 0.08)'
                            : 'transparent',
                          borderWidth: isToday && !isSelected ? 1.5 : 0,
                          borderColor: '#F26B3A',
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color: isSelected
                              ? '#FFFFFF'
                              : !item.isCurrentMonth
                              ? '#D1D5DB'
                              : isToday
                              ? '#F26B3A'
                              : '#1E2933',
                            fontWeight: isToday || isSelected ? '600' : '400',
                            lineHeight: 16,
                          }}
                        >
                          {item.day}
                        </Text>
                        {isChecked && (
                          <FontAwesome6
                            name="check"
                            size={10}
                            color={isSelected ? '#FFFFFF' : '#3C8D6E'}
                            solid
                            style={{ marginTop: 1 }}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Legend */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, gap: 24 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <FontAwesome6 name="check" size={12} color="#3C8D6E" solid style={{ marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>已打卡</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#F26B3A', marginRight: 6 }} />
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>今天</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Checkin Reminder */}
          {!todayCheckedIn && (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <View
                style={{
                  backgroundColor: '#FEF7F0',
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF3E2', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                  <FontAwesome6 name="scale-balanced" size={18} color="#F26B3A" />
                </View>
                <Text style={{ fontSize: 14, color: '#F26B3A', flex: 1 }}>
                  今日未打卡，快来记录今天的数据吧
                </Text>
              </View>
            </View>
          )}

          {/* Input Form */}
          <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
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
              {/* Date Selector */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, color: '#1E2933', marginBottom: 8 }}>打卡日期</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F7F4ED',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <FontAwesome6 name="calendar" size={18} color="#6B7280" />
                  <Text style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#1E2933' }}>
                    {selectedDate}
                  </Text>
                </View>
              </View>

              {/* Weight Input */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, color: '#1E2933', marginBottom: 8 }}>体重</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F7F4ED',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <FontAwesome6 name="weight-scale" size={18} color="#6B7280" />
                  <TextInput
                    style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#1E2933' }}
                    placeholder="请输入体重"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={weight}
                    onChangeText={setWeight}
                  />
                  <Text style={{ fontSize: 14, color: '#6B7280' }}>kg</Text>
                </View>
              </View>

              {/* Waist Input */}
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 14, color: '#1E2933', marginBottom: 8 }}>腰围</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#F7F4ED',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <FontAwesome6 name="ruler-horizontal" size={18} color="#6B7280" />
                  <TextInput
                    style={{ flex: 1, marginLeft: 12, fontSize: 16, color: '#1E2933' }}
                    placeholder="请输入腰围"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="decimal-pad"
                    value={waist}
                    onChangeText={setWaist}
                  />
                  <Text style={{ fontSize: 14, color: '#6B7280' }}>cm</Text>
                </View>
              </View>

              {/* Note Input */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 14, color: '#1E2933', marginBottom: 8 }}>备注(可选)</Text>
                <View
                  style={{
                    backgroundColor: '#F7F4ED',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                  }}
                >
                  <TextInput
                    style={{ fontSize: 16, color: '#1E2933', minHeight: 80, textAlignVertical: 'top' }}
                    placeholder="记录今天的感受或变化..."
                    placeholderTextColor="#9CA3AF"
                    multiline
                    maxLength={100}
                    value={note}
                    onChangeText={setNote}
                  />
                </View>
                <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 6, textAlign: 'right' }}>
                  {note.length}/100
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#F26B3A',
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: 'center',
                }}
                onPress={handleSubmit}
                disabled={loading}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                  {loading ? '保存中...' : '提交打卡'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Records */}
          <View style={{ paddingHorizontal: 20, marginBottom: 100 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#1E2933' }}>
                {showAllRecords ? '全部记录' : '最近7天记录'}
              </Text>
              <TouchableOpacity onPress={async () => {
                if (!showAllRecords) await loadAllRecords();
                setShowAllRecords(!showAllRecords);
              }}>
                <Text style={{ fontSize: 14, color: '#F26B3A' }}>
                  {showAllRecords ? '收起' : '查看全部'}
                </Text>
              </TouchableOpacity>
            </View>

            {(showAllRecords ? allRecords : recentRecords).length === 0 ? (
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 16,
                  padding: 24,
                  alignItems: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                }}
              >
                <FontAwesome6 name="calendar-plus" size={40} color="#D1D5DB" />
                <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 12 }}>暂无记录</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>开始记录你的健康数据吧</Text>
              </View>
            ) : (
              (showAllRecords ? allRecords : recentRecords).map((record: Record, index: number) => {
                const isChecked = checkedDates.has(record.record_date);
                return (
                <View
                  key={record.id || index}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.04,
                    shadowRadius: 4,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#1E2933' }}>
                        {formatDateDisplay(record.record_date)}
                      </Text>
                      {isChecked && (
                        <View style={{ marginLeft: 8 }}>
                          <FontAwesome6 name="check-circle" size={14} color="#3C8D6E" solid />
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: 4, gap: 16 }}>
                      <Text style={{ fontSize: 13, color: '#6B7280' }}>
                        体重 <Text style={{ color: '#1E2933', fontWeight: '500' }}>{record.weight}kg</Text>
                      </Text>
                      {record.waist > 0 && (
                        <Text style={{ fontSize: 13, color: '#6B7280' }}>
                          腰围 <Text style={{ color: '#1E2933', fontWeight: '500' }}>{record.waist}cm</Text>
                        </Text>
                      )}
                    </View>
                    {record.note ? (
                      <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }} numberOfLines={1}>{record.note}</Text>
                    ) : null}
                  </View>
                  <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" style={{ marginLeft: 8 }} />
                </View>
              )})
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
