import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
  useCallback,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiFetch, setAuthToken, setOnUnauthorized } from '@/utils/api';

export interface UserOut {
  id: string;
  phone: string;
  nickname: string;
  signature: string;
  gender: string;
  birth_date: string;
  height: number;
  target_weight: number;
  target_waist: number;
  avatar_url?: string | null;
  reminder_time?: string | null;
  onboarded: number;
  created_at: string;
}

interface AuthContextType {
  user: UserOut | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sendCode: (phone: string) => Promise<{ devCode?: string; expiresIn?: number }>;
  login: (phone: string, code: string) => Promise<{ isNew: boolean; onboarded: boolean }>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<UserOut>) => void;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserOut | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 启动时恢复会话
  useEffect(() => {
    (async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (storedToken) {
          setAuthToken(storedToken);
          setToken(storedToken);
        }
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        // 忽略恢复失败，走未登录流程
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // 用户状态变化时持久化到 AsyncStorage，保证 onboarded 等字段最新
  useEffect(() => {
    if (user) {
      AsyncStorage.setItem(USER_KEY, JSON.stringify(user)).catch(() => {});
    }
  }, [user]);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([
      TOKEN_KEY,
      USER_KEY,
      'onboarding_data',
      'onboarding_complete',
    ]);
  }, []);

  // 任意接口返回 401 时自动登出
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
    return () => setOnUnauthorized(null);
  }, [logout]);

  const sendCode = useCallback(async (phone: string) => {
    const res = await apiFetch<{ devCode?: string; expiresIn?: number }>('/api/v1/auth/send-code', {
      method: 'POST',
      body: { phone },
    });
    if (res.code !== 200) {
      throw new Error(res.msg || '验证码发送失败');
    }
    return res.data || {};
  }, []);

  const login = useCallback(async (phone: string, code: string) => {
    const res = await apiFetch<{
      token: string;
      user: UserOut;
      isNew: boolean;
      onboarded: boolean;
    }>('/api/v1/auth/login', {
      method: 'POST',
      body: { phone, code },
    });
    if (res.code !== 200 || !res.data) {
      throw new Error(res.msg || '登录失败');
    }
    const { token: newToken, user: newUser, isNew, onboarded } = res.data;
    setAuthToken(newToken);
    setToken(newToken);
    setUser(newUser);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, newToken],
      [USER_KEY, JSON.stringify(newUser)],
    ]);
    return { isNew, onboarded };
  }, []);

  const updateUser = useCallback((userData: Partial<UserOut>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : (userData as UserOut)));
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    sendCode,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
