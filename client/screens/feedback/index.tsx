import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { FontAwesome6 } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { apiFetch } from '@/utils/api';

const feedbackTypes = [
  { value: 'function', label: '功能建议', icon: 'lightbulb' },
  { value: 'bug', label: '问题反馈', icon: 'bug' },
  { value: 'other', label: '其他', icon: 'ellipsis' },
];

export default function FeedbackPage() {
  const router = useSafeRouter();
  const [feedbackType, setFeedbackType] = useState('function');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Toast.show({ type: 'error', text1: '请输入反馈内容' });
      return;
    }

    setLoading(true);
    try {
      const data = await apiFetch('/api/v1/user/feedback', {
        method: 'POST',
        body: {
          type: feedbackType,
          content: content.trim(),
          contact: contact.trim(),
        },
      });

      if (data.code === 200) {
        Toast.show({ type: 'success', text1: '反馈已提交', text2: '感谢您的宝贵意见' });
        setTimeout(() => router.back(), 1500);
      } else {
        Toast.show({ type: 'error', text1: '提交失败', text2: data.msg });
      }
    } catch (error) {
      console.error('Submit error:', error);
      Toast.show({ type: 'error', text1: '网络错误', text2: '请稍后重试' });
    } finally {
      setLoading(false);
    }
  };

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
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            paddingVertical: 16,
          }}
        >
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <FontAwesome6 name="arrow-left" size={20} color="#1E2933" />
          </TouchableOpacity>
          <Text style={{ fontSize: 17, fontWeight: '600', color: '#1E2933' }}>意见反馈</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          {/* Feedback Type */}
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Text style={{ fontSize: 14, color: '#1E2933', marginBottom: 12 }}>反馈类型</Text>
            <View style={{ flexDirection: 'row', marginHorizontal: -6 }}>
              {feedbackTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={{
                    flex: 1,
                    marginHorizontal: 6,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 12,
                    padding: 14,
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: feedbackType === type.value ? '#F26B3A' : 'transparent',
                  }}
                  onPress={() => setFeedbackType(type.value)}
                >
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor:
                        feedbackType === type.value
                          ? 'rgba(242, 107, 58, 0.1)'
                          : 'rgba(107, 114, 128, 0.1)',
                      justifyContent: 'center',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <FontAwesome6
                      name={type.icon as any}
                      size={18}
                      color={feedbackType === type.value ? '#F26B3A' : '#6B7280'}
                    />
                  </View>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '500',
                      color: feedbackType === type.value ? '#F26B3A' : '#1E2933',
                    }}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Content Input */}
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Text style={{ fontSize: 14, color: '#1E2933', marginBottom: 8 }}>反馈内容</Text>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <TextInput
                style={{ fontSize: 15, color: '#1E2933', minHeight: 120, textAlignVertical: 'top' }}
                placeholder="请详细描述您的问题或建议..."
                placeholderTextColor="#9CA3AF"
                multiline
                value={content}
                onChangeText={setContent}
                maxLength={500}
              />
              <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'right', marginTop: 8 }}>
                {content.length}/500
              </Text>
            </View>
          </View>

          {/* Contact Input */}
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
            <Text style={{ fontSize: 14, color: '#1E2933', marginBottom: 8 }}>联系方式（选填）</Text>
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}
            >
              <TextInput
                style={{ fontSize: 15, color: '#1E2933' }}
                placeholder="邮箱或手机号"
                placeholderTextColor="#9CA3AF"
                value={contact}
                onChangeText={setContact}
              />
            </View>
            <Text style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
              方便我们联系您获取更多信息
            </Text>
          </View>

          {/* Submit Button */}
          <View style={{ padding: 20, paddingBottom: 40 }}>
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
                {loading ? '提交中...' : '提交反馈'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
