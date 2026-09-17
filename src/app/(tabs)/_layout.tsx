import { Tabs } from 'expo-router';
import { colors } from '../../theme/colors';
import { MessageSquare, Users, Settings, TrendingUp, Clock } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { theme } = useAuth();
  const c = colors[theme];
  const insets = useSafeAreaInsets();

  // Adjust bottom navigation bar height to accommodate system keys/gestures
  const tabBarBottomPadding = insets.bottom > 0 ? insets.bottom + 4 : 12;
  const tabBarHeight = 64 + tabBarBottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopWidth: 1,
          borderTopColor: c.border,
          height: tabBarHeight,
          paddingBottom: tabBarBottomPadding,
          paddingTop: 8,
        },
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          title: 'Chats',
          tabBarLabel: 'Chats',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="pipelines"
        options={{
          headerShown: false,
          title: 'Pipelines',
          tabBarLabel: 'Pipelines',
          tabBarIcon: ({ color, size }) => (
            <TrendingUp color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="contacts"
        options={{
          headerShown: false,
          title: 'Contactos',
          tabBarLabel: 'Contactos',
          tabBarIcon: ({ color, size }) => (
            <Users color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          headerShown: false,
          title: 'Ajustes',
          tabBarLabel: 'Ajustes',
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size - 2} />
          ),
        }}
      />
      <Tabs.Screen
        name="scheduled"
        options={{
          headerShown: false,
          title: 'Programados',
          tabBarLabel: 'Programados',
          tabBarIcon: ({ color, size }) => (
            <Clock color={color} size={size - 2} />
          ),
        }}
      />
      {/* Hide the old connections screen from tabs */}
      <Tabs.Screen
        name="connections"
        options={{
          headerShown: false,
          href: null,
        }}
      />
    </Tabs>
  );
}
