'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useAuth } from '@/contexts/AuthContext';

interface SettingItemProps {
  icon: string;
  title: string;
  value?: string;
  showSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
  onPress?: () => void;
  showArrow?: boolean;
}

const SettingItem: React.FC<SettingItemProps> = ({
  icon,
  title,
  value,
  showSwitch,
  switchValue,
  onSwitchChange,
  onPress,
  showArrow = true,
}) => (
  <TouchableOpacity
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#F5F5F5',
      backgroundColor: '#FFFFFF',
    }}
    onPress={onPress}
    disabled={showSwitch}
  >
    <FontAwesome6 name={icon as any} size={18} color="#6B7280" />
    <Text style={{ flex: 1, marginLeft: 12, fontSize: 15, color: '#1E2933' }}>{title}</Text>
    {value && <Text style={{ fontSize: 13, color: '#9CA3AF', marginRight: 4 }}>{value}</Text>}
    {showSwitch && (
      <Switch
        value={switchValue}
        onValueChange={onSwitchChange}
        trackColor={{ false: '#E5E7EB', true: '#F26B3A' }}
        thumbColor="#FFFFFF"
      />
    )}
    {showArrow && !showSwitch && <FontAwesome6 name="chevron-right" size={14} color="#D1D5DB" />}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const router = useSafeRouter();
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [sound, setSound] = useState(true);
  const [vibration, setVibration] = useState(true);
  const [dataSync, setDataSync] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      '退出登录',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            await logout();
            Toast.show({
              type: 'success',
              text1: '已退出登录',
            });
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      '清除数据',
      '确定要清除所有数据吗？此操作不可恢复！',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: () => {
            Toast.show({
              type: 'success',
              text1: '数据已清除',
            });
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <ScrollView style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
        {/* Notification Settings */}
        <View style={{ paddingHorizontal: 20, marginTop: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <FontAwesome6 name="bell" size={16} color="#F26B3A" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E2933', marginLeft: 8 }}>
              消息通知
            </Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
            <SettingItem
              icon="bell"
              title="打卡提醒"
              showSwitch
              switchValue={notifications}
              onSwitchChange={setNotifications}
              showArrow={false}
            />
            <SettingItem
              icon="volume-up"
              title="声音提示"
              showSwitch
              switchValue={sound}
              onSwitchChange={setSound}
              showArrow={false}
            />
            <SettingItem
              icon="mobile-screen"
              title="震动提示"
              showSwitch
              switchValue={vibration}
              onSwitchChange={setVibration}
              showArrow={false}
            />
          </View>
        </View>

        {/* Data Settings */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <FontAwesome6 name="database" size={16} color="#F26B3A" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E2933', marginLeft: 8 }}>
              数据设置
            </Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
            <SettingItem
              icon="cloud-arrow-up"
              title="数据同步"
              showSwitch
              switchValue={dataSync}
              onSwitchChange={setDataSync}
              showArrow={false}
            />
            <SettingItem
              icon="cloud-arrow-down"
              title="自动备份"
              value="每日"
              onPress={() => Toast.show({ type: 'info', text1: '自动备份已开启' })}
            />
            <SettingItem
              icon="download"
              title="导出数据"
              onPress={() => Toast.show({ type: 'info', text1: '正在导出数据...' })}
            />
            <SettingItem
              icon="trash-can"
              title="清除数据"
              onPress={handleClearData}
            />
          </View>
        </View>

        {/* Privacy Settings */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <FontAwesome6 name="shield-halved" size={16} color="#F26B3A" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E2933', marginLeft: 8 }}>
              隐私设置
            </Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
            <SettingItem
              icon="eye-slash"
              title="隐藏体重数据"
              showSwitch
              switchValue={false}
              showArrow={false}
            />
            <SettingItem
              icon="user-lock"
              title="隐私密码"
              onPress={() => Toast.show({ type: 'info', text1: '隐私密码设置' })}
            />
            <SettingItem
              icon="address-card"
              title="授权管理"
              onPress={() => Toast.show({ type: 'info', text1: '授权管理' })}
            />
          </View>
        </View>

        {/* Help & Support */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <FontAwesome6 name="circle-question" size={16} color="#F26B3A" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E2933', marginLeft: 8 }}>
              帮助与支持
            </Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
            <SettingItem
              icon="book"
              title="使用指南"
              onPress={() => Toast.show({ type: 'info', text1: '使用指南' })}
            />
            <SettingItem
              icon="headset"
              title="联系客服"
              onPress={() => Toast.show({ type: 'info', text1: '客服电话：400-xxx-xxxx' })}
            />
            <SettingItem
              icon="star"
              title="给我们评分"
              onPress={() => Toast.show({ type: 'info', text1: '感谢您的支持！' })}
            />
          </View>
        </View>

        {/* About */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <FontAwesome6 name="circle-info" size={16} color="#F26B3A" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#1E2933', marginLeft: 8 }}>
              关于
            </Text>
          </View>
          <View style={{ backgroundColor: '#FFFFFF', borderRadius: 12, overflow: 'hidden' }}>
            <SettingItem
              icon="file-contract"
              title="用户协议"
              onPress={() => Toast.show({ type: 'info', text1: '用户协议' })}
            />
            <SettingItem
              icon="shield"
              title="隐私政策"
              onPress={() => Toast.show({ type: 'info', text1: '隐私政策' })}
            />
            <SettingItem
              icon="scale-balanced"
              title="版权声明"
              onPress={() => Toast.show({ type: 'info', text1: '版权声明' })}
            />
            <SettingItem
              icon="code"
              title="版本信息"
              value="v1.0.0"
              showArrow={false}
            />
          </View>
        </View>

        {/* Logout */}
        <View style={{ paddingHorizontal: 20, marginBottom: 40 }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: 'center',
            }}
            onPress={handleLogout}
          >
            <Text style={{ fontSize: 15, color: '#EF4444' }}>退出登录</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}
