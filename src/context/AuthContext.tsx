// src/context/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import api from '../services/api';
import { clearPushTokenRegistrationAsync } from '../services/notifications';

interface Queue {
  id: number;
  name: string;
  color: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  profile: string;
  queues?: Queue[];
  companyId?: number;
}

export type AppTheme = 'dark' | 'light';

interface AuthContextData {
  isAuth: boolean;
  user: User | null;
  apiUrl: string;
  loading: boolean;
  token: string | null;
  theme: AppTheme;
  toggleTheme: () => Promise<void>;
  configureApiUrl: (url: string) => Promise<void>;
  handleLogin: (userData: any) => Promise<void>;
  handleLogout: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setToken: (token: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [apiUrl, setApiUrlState] = useState<string>('https://api.andoticket.cloud');
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<AppTheme>('dark');

  const clearSession = async () => {
    await AsyncStorage.multiRemove([
      '@whaticket:token',
      '@whaticket:user'
    ]);
    setTokenState(null);
    setUser(null);
    setIsAuth(false);
  };

  // Load initial configuration and auth state
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const savedApiUrl = await AsyncStorage.getItem('@whaticket:api_url');
        const savedToken = await AsyncStorage.getItem('@whaticket:token');
        const savedUser = await AsyncStorage.getItem('@whaticket:user');
        const savedTheme = await AsyncStorage.getItem('@whaticket:theme');

        // Restore theme
        if (savedTheme === 'light' || savedTheme === 'dark') {
          setTheme(savedTheme);
        }

        let currentApiUrl = savedApiUrl;
        if (savedApiUrl) {
          setApiUrlState(savedApiUrl);
        } else {
          currentApiUrl = 'https://api.andoticket.cloud';
          await AsyncStorage.setItem('@whaticket:api_url', currentApiUrl);
          setApiUrlState(currentApiUrl);
        }

        if (savedToken && currentApiUrl) {
          setTokenState(savedToken);
          if (savedUser) {
            setUser(JSON.parse(savedUser));
            setIsAuth(true);
          }

          // Verify/refresh token
          try {
            const response = await axios.post(`${savedApiUrl}/auth/refresh_token`, {}, {
              headers: { Authorization: `Bearer ${savedToken}` },
              withCredentials: true,
            });
            const { token: newToken, user: updatedUser } = response.data;
            if (newToken && updatedUser) {
              await AsyncStorage.setItem('@whaticket:token', newToken);
              await AsyncStorage.setItem('@whaticket:user', JSON.stringify(updatedUser));
              setTokenState(newToken);
              setUser(updatedUser);
              setIsAuth(true);
            }
          } catch (refreshError) {
            console.log('Token expired or invalid on boot. Clearing session to request login...');
            await clearSession();
          }
        }
      } catch (e) {
        console.error('Error restoring auth session:', e);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  // Reactive response interceptor to handle 401 logouts dynamically
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error?.response?.status === 401) {
          console.log('API session expired (401). Clearing session reactively...');
          await clearSession();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  const toggleTheme = async () => {
    const newTheme: AppTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    await AsyncStorage.setItem('@whaticket:theme', newTheme);
  };

  const configureApiUrl = async (url: string) => {
    const formattedUrl = url.replace(/\/$/, '');
    await AsyncStorage.setItem('@whaticket:api_url', formattedUrl);
    setApiUrlState(formattedUrl);
  };

  const setToken = async (newToken: string | null) => {
    if (newToken) {
      await AsyncStorage.setItem('@whaticket:token', newToken);
      setTokenState(newToken);
    } else {
      await AsyncStorage.removeItem('@whaticket:token');
      setTokenState(null);
    }
  };



  const handleLogin = async (credentials: any) => {
    if (!apiUrl) {
      throw new Error('Debe configurar la dirección del servidor antes de iniciar sesión.');
    }

    try {
      const response = await axios.post(`${apiUrl}/auth/login`, credentials);
      const { token: receivedToken, user: receivedUser } = response.data;

      if (receivedToken && receivedUser) {
        await AsyncStorage.setItem('@whaticket:token', receivedToken);
        await AsyncStorage.setItem('@whaticket:user', JSON.stringify(receivedUser));
        setTokenState(receivedToken);
        setUser(receivedUser);
        setIsAuth(true);
      } else {
        throw new Error('Respuesta inválida del servidor de autenticación.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.response && error.response.data && error.response.data.error) {
        throw new Error(error.response.data.error);
      }
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await clearPushTokenRegistrationAsync(user?.id);

      if (apiUrl && token) {
        await axios.delete(`${apiUrl}/auth/logout`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (e) {
      console.log('API logout call failed:', e);
    } finally {
      await clearSession();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuth,
        user,
        apiUrl,
        loading,
        token,
        theme,
        toggleTheme,
        configureApiUrl,
        handleLogin,
        handleLogout,
        setUser,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
