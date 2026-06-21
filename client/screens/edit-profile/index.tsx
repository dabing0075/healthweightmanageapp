import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

export default function EditProfile() {
  const router = useSafeRouter();
  const params = useSafeSearchParams<{ type?: string }>();
  
  const [nickname, setNickname] = useState('');
  const [signature, setSignature] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [birthDate, setBirthDate] = useState('');
  const [height, setHeight] = useState('');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);
  
  // Date picker state
  const [selectedYear, setSelectedYear] = useState(1990);
  const [selectedMonth, setSelectedMonth] = useState(1);
  const [selectedDay, setSelectedDay] = useState(1);
  
  // Generate years (1950-2020)
  const years = Array.from({ length: 71 }, (_, i) => 2020 - i);
  // Generate months (1-12)
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  // Days in month (1-31)
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  
  useEffect(() => {
    fetchUserInfo();
  }, []);
  
  const fetchUserInfo = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/user/info`);
      const data = await res.json();
      if (data.code === 200 && data.data) {
        setNickname(data.data.nickname || '');
        setSignature(data.data.signature || '');
        setGender(data.data.gender === 'male' ? 'male' : 'female');
        setBirthDate(data.data.birth_date || '');
        setHeight(data.data.height ? String(data.data.height) : '');
        
        // Set initial date picker values
        if (data.data.birth_date) {
          const parts = data.data.birth_date.split('-');
          if (parts.length === 3) {
            setSelectedYear(parseInt(parts[0]));
            setSelectedMonth(parseInt(parts[1]));
            setSelectedDay(parseInt(parts[2]));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch user info:', err);
    }
  };
  
  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('提示', '请输入昵称');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/user/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickname,
          signature,
          gender,
          birth_date: birthDate,
          height: height ? parseFloat(height) : null,
        }),
      });
      
      const data = await res.json();
      
      if (data.code === 200) {
        setSaved(true);
        setLoading(false);
        // Auto return after 0.5s
        setTimeout(() => {
          router.back();
        }, 500);
      } else {
        Alert.alert('错误', data.message || '保存失败');
      }
    } catch (err) {
      Alert.alert('错误', '网络请求失败');
    } finally {
      setLoading(false);
    }
  };
  
  // Open date picker modal
  const openDatePicker = () => {
    // Set default values based on current birthDate or today
    const now = new Date();
    setSelectedYear(now.getFullYear() - 30);
    setSelectedMonth(1);
    setSelectedDay(1);
    setDateModalVisible(true);
  };
  
  // Confirm date selection
  const confirmDateSelection = () => {
    const monthStr = selectedMonth.toString().padStart(2, '0');
    const dayStr = selectedDay.toString().padStart(2, '0');
    setBirthDate(`${selectedYear}-${monthStr}-${dayStr}`);
    setDateModalVisible(false);
  };
  
  return (
    <Screen>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#F7F3EE' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 16,
          paddingVertical: 14,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        }}>
          <TouchableOpacity
            style={{ position: 'absolute', left: 16 }}
            onPress={() => router.back()}
          >
            <Text style={{ fontSize: 24, color: '#666666' }}>←</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: '600', color: '#1E2933' }}>
            编辑个人信息
          </Text>
          <View style={{ width: 40 }} />
        </View>
        
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          {/* Form Card */}
          <View style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
          }}>
            {/* Nickname */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>
                昵称
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F7F3EE',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#1E2933',
                }}
                value={nickname}
                onChangeText={setNickname}
                placeholder="请输入昵称"
                placeholderTextColor="#999999"
              />
            </View>
            
            {/* Signature */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>
                签名
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F7F3EE',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#1E2933',
                  minHeight: 80,
                  textAlignVertical: 'top',
                }}
                value={signature}
                onChangeText={setSignature}
                placeholder="请输入个性签名"
                placeholderTextColor="#999999"
                multiline
                numberOfLines={3}
              />
            </View>
            
            {/* Gender */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>
                性别
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#F7F3EE',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onPress={() => setGenderModalVisible(true)}
              >
                <Text style={{ fontSize: 16, color: '#1E2933' }}>
                  {gender === 'male' ? '男' : '女'}
                </Text>
                <Text style={{ fontSize: 14, color: '#999999' }}>点击选择</Text>
              </TouchableOpacity>
            </View>
            
            {/* Birth Date */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>
                出生日期
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: '#F7F3EE',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onPress={openDatePicker}
              >
                <Text style={{ fontSize: 16, color: '#1E2933' }}>
                  {birthDate || '请选择日期'}
                </Text>
                <Text style={{ fontSize: 14, color: '#999999' }}>点击选择</Text>
              </TouchableOpacity>
            </View>
            
            {/* Height */}
            <View style={{ marginBottom: 0 }}>
              <Text style={{ fontSize: 14, color: '#666666', marginBottom: 8 }}>
                身高(cm)
              </Text>
              <TextInput
                style={{
                  backgroundColor: '#F7F3EE',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                  fontSize: 16,
                  color: '#1E2933',
                }}
                value={height}
                onChangeText={setHeight}
                placeholder="请输入身高"
                placeholderTextColor="#999999"
                keyboardType="numeric"
              />
            </View>
          </View>
          
          {/* Save Button */}
          <View style={{ padding: 16, paddingBottom: 40 }}>
            <TouchableOpacity
              style={{
                backgroundColor: '#F26B3A',
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: 'center',
              }}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
                {loading ? '保存中...' : saved ? '已保存' : '保存'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
        
        {/* Gender Modal */}
        {genderModalVisible && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={1}
            onPress={() => setGenderModalVisible(false)}
          >
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                width: '80%',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#1E2933', textAlign: 'center', marginBottom: 20 }}>
                选择性别
              </Text>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F3F4F6',
                }}
                onPress={() => {
                  setGender('male');
                  setGenderModalVisible(false);
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: gender === 'male' ? '#F26B3A' : '#D1D5DB',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  {gender === 'male' && (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: '#F26B3A',
                      }}
                    />
                  )}
                </View>
                <Text style={{ fontSize: 16, color: '#1E2933' }}>男</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 14,
                }}
                onPress={() => {
                  setGender('female');
                  setGenderModalVisible(false);
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 2,
                    borderColor: gender === 'female' ? '#F26B3A' : '#D1D5DB',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}
                >
                  {gender === 'female' && (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: '#F26B3A',
                      }}
                    />
                  )}
                </View>
                <Text style={{ fontSize: 16, color: '#1E2933' }}>女</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  marginTop: 16,
                  backgroundColor: '#F26B3A',
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                onPress={() => setGenderModalVisible(false)}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>确定</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        
        {/* Date Picker Modal */}
        {dateModalVisible && (
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            activeOpacity={1}
            onPress={() => setDateModalVisible(false)}
          >
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 16,
                padding: 20,
                width: '85%',
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: '600', color: '#1E2933', textAlign: 'center', marginBottom: 20 }}>
                选择出生日期
              </Text>
              
              {/* Year/Month/Day Selector */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 }}>
                {/* Year Column */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#999999', marginBottom: 8 }}>年</Text>
                  <ScrollView style={{ height: 150 }} showsVerticalScrollIndicator={false}>
                    {years.map((year) => (
                      <TouchableOpacity
                        key={year}
                        onPress={() => setSelectedYear(year)}
                        style={{
                          paddingVertical: 8,
                          backgroundColor: selectedYear === year ? '#FFF5F0' : 'transparent',
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            color: selectedYear === year ? '#F26B3A' : '#1E2933',
                            fontWeight: selectedYear === year ? '600' : '400',
                            textAlign: 'center',
                          }}
                        >
                          {year}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                {/* Month Column */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#999999', marginBottom: 8 }}>月</Text>
                  <ScrollView style={{ height: 150 }} showsVerticalScrollIndicator={false}>
                    {months.map((month) => (
                      <TouchableOpacity
                        key={month}
                        onPress={() => setSelectedMonth(month)}
                        style={{
                          paddingVertical: 8,
                          backgroundColor: selectedMonth === month ? '#FFF5F0' : 'transparent',
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            color: selectedMonth === month ? '#F26B3A' : '#1E2933',
                            fontWeight: selectedMonth === month ? '600' : '400',
                            textAlign: 'center',
                          }}
                        >
                          {month}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                {/* Day Column */}
                <View style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#999999', marginBottom: 8 }}>日</Text>
                  <ScrollView style={{ height: 150 }} showsVerticalScrollIndicator={false}>
                    {days.map((day) => (
                      <TouchableOpacity
                        key={day}
                        onPress={() => setSelectedDay(day)}
                        style={{
                          paddingVertical: 8,
                          backgroundColor: selectedDay === day ? '#FFF5F0' : 'transparent',
                          borderRadius: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 16,
                            color: selectedDay === day ? '#F26B3A' : '#1E2933',
                            fontWeight: selectedDay === day ? '600' : '400',
                            textAlign: 'center',
                          }}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              
              <TouchableOpacity
                style={{
                  marginTop: 8,
                  backgroundColor: '#F26B3A',
                  borderRadius: 10,
                  paddingVertical: 12,
                  alignItems: 'center',
                }}
                onPress={confirmDateSelection}
              >
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>确定</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
