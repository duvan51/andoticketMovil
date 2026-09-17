// src/services/api.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const api = axios.create({
  withCredentials: true,
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('@whaticket:token');
    const savedApiUrl = await AsyncStorage.getItem('@whaticket:api_url');

    if (savedApiUrl) {
      config.baseURL = savedApiUrl;
    }

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const savedApiUrl = await AsyncStorage.getItem('@whaticket:api_url');

    const status = error?.response?.status;
    if (status === 401 && !originalRequest._retry && savedApiUrl) {
      originalRequest._retry = true;

      try {
        const token = await AsyncStorage.getItem('@whaticket:token');
        if (!token) return Promise.reject(error);

        const response = await axios.post(
          `${savedApiUrl}/auth/refresh_token`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
        const { token: newToken } = response.data;

        if (newToken) {
          await AsyncStorage.setItem('@whaticket:token', newToken);
          api.defaults.headers.Authorization = `Bearer ${newToken}`;
          originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (err) {
        console.error('Interceptor token refresh failed. Clearing expired session token:', err);
        await AsyncStorage.multiRemove(['@whaticket:token', '@whaticket:user']);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
