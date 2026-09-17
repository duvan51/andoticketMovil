import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const PUSH_TOKEN_STORAGE_KEY = '@whaticket:expo_push_token';

export let currentActiveTicketId: string | null = null;
export function setCurrentActiveTicketId(id: string | null) {
  currentActiveTicketId = id;
}

export const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any).appOwnership === 'expo';

// Safely obtain Expo Notifications module only outside Expo Go / Web
export function getSafeNotificationsModule(): typeof import('expo-notifications') | null {
  if (Platform.OS === 'web' || isExpoGo) {
    return null;
  }
  try {
    return require('expo-notifications');
  } catch (e) {
    console.warn('Could not load expo-notifications module:', e);
    return null;
  }
}

if (Platform.OS !== 'web' && !isExpoGo) {
  try {
    const Notifications = getSafeNotificationsModule();
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (error) {
    console.warn('Expo Notifications setNotificationHandler error:', error);
  }
}

export async function registerForPushNotificationsAsync(userId?: number) {
  if (Platform.OS === 'web' || isExpoGo) {
    console.log('[Push Notifications] Desactivadas en Expo Go / Web. Para probarlas en Android se requiere una Development Build.');
    return null;
  }

  const Notifications = getSafeNotificationsModule();
  if (!Notifications) return null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('messages', {
        name: 'Mensajes',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
      });
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
      });
    }

    const existingPermission = await Notifications.getPermissionsAsync();
    let finalStatus = existingPermission.status;

    if (finalStatus !== 'granted') {
      const requestedPermission = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = requestedPermission.status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

    if (!projectId) {
      console.log('Expo projectId is missing. Push notifications cannot be registered.');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const previousToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);

    if (token !== previousToken) {
      await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
    }

    try {
      await api.post('/users/push-token', {
        token,
        platform: Platform.OS,
        userId,
      });
    } catch (error) {
      console.log('Push token registration endpoint is not available yet:', error);
    }

    return token;
  } catch (error) {
    console.warn('Error registering for push notifications:', error);
    return null;
  }
}

export async function clearPushTokenRegistrationAsync(userId?: number) {
  if (Platform.OS === 'web' || isExpoGo) {
    return;
  }

  const Notifications = getSafeNotificationsModule();
  if (!Notifications) return;

  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);

    if (!token) {
      return;
    }

    try {
      await api.delete('/users/push-token', {
        data: {
          token,
          userId,
        },
      });
    } catch (error) {
      console.log('Push token removal endpoint is not available yet:', error);
    }
  } catch (error) {
    console.warn('Error clearing push token registration:', error);
  }
}


