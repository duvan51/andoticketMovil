// src/app/_layout.tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import { useAuth, AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import { useEffect } from 'react';
import { ActivityIndicator, View, StatusBar, Platform } from 'react-native';
import { registerForPushNotificationsAsync, isExpoGo, getSafeNotificationsModule } from '../services/notifications';

function RootLayoutNavigation() {
  const { isAuth, loading, apiUrl, user } = useAuth();
  const segments = useSegments() as string[];
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!apiUrl) {
      // If server URL is not configured, redirect to server config screen
      if (segments[1] !== 'config') {
        router.replace('/(auth)/config');
      }
    } else if (!isAuth) {
      // If not logged in, redirect to login screen
      if (segments[1] !== 'login') {
        router.replace('/(auth)/login');
      }
    } else if (isAuth && inAuthGroup) {
      // If logged in and in auth group, redirect to dashboard (tabs index)
      router.replace('/(tabs)');
    }
  }, [isAuth, loading, segments, apiUrl]);

  useEffect(() => {
    if (!isAuth || !user?.id || Platform.OS === 'web' || isExpoGo) return;

    registerForPushNotificationsAsync(user.id);
  }, [isAuth, user?.id]);

  useEffect(() => {
    if (Platform.OS === 'web' || isExpoGo) return;

    try {
      const Notifications = getSafeNotificationsModule();
      if (!Notifications) return;

      const redirectFromNotification = (notification: any) => {
        const url = notification.request.content.data?.url;
        const ticketId = notification.request.content.data?.ticketId;

        if (typeof url === 'string') {
          router.push(url as any);
          return;
        }

        if (typeof ticketId === 'string' || typeof ticketId === 'number') {
          router.push(`/ticket/${ticketId}` as any);
        }
      };

      const lastResponse = Notifications.getLastNotificationResponse();
      if (lastResponse?.notification) {
        redirectFromNotification(lastResponse.notification);
      }

      const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        redirectFromNotification(response.notification);
      });

      return () => {
        subscription.remove();
      };
    } catch (error) {
      console.warn('Notification listener error:', error);
    }
  }, [router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090D16' }}>
        <StatusBar barStyle="light-content" backgroundColor="#090D16" />
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#090D16" />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <SocketProvider>
        <RootLayoutNavigation />
      </SocketProvider>
    </AuthProvider>
  );
}
