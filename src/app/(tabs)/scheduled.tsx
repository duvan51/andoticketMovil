// src/app/(tabs)/scheduled.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, FlatList, ActivityIndicator,
  RefreshControl, TouchableOpacity,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { CalendarClock, Clock, MessageSquare, User2 } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface ScheduledMessage {
  id: number;
  body: string;
  sendAt: string;
  sentAt?: string;
  status?: string;
  contact?: { name: string; number: string };
  ticket?: { id: number };
}

export default function ScheduledScreen() {
  const { theme, user } = useAuth();
  const c = colors[theme];

  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScheduled = useCallback(async () => {
    try {
      const { data } = await api.get('/scheduled-messages');
      const list = Array.isArray(data) ? data : data?.scheduledMessages ?? [];
      setMessages(list);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchScheduled();
  }, [fetchScheduled]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchScheduled();
  };

  const getStatusLabel = (msg: ScheduledMessage) => {
    if (msg.sentAt) return { text: 'Enviado', color: '#10B981', bg: '#064E3B' };
    if (msg.status === 'error') return { text: 'Error', color: '#EF4444', bg: '#450A0A' };
    return { text: 'Pendiente', color: '#F59E0B', bg: '#451A03' };
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      return format(d, "dd MMM yyyy · HH:mm", { locale: es });
    } catch {
      return dateStr;
    }
  };

  const renderItem = ({ item }: { item: ScheduledMessage }) => {
    const status = getStatusLabel(item);
    return (
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        {/* Header: Contact + Status */}
        <View style={styles.cardHeader}>
          <View style={styles.contactRow}>
            <View style={[styles.avatar, { backgroundColor: c.primary + '22' }]}>
              <User2 size={18} color={c.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactName, { color: c.text }]} numberOfLines={1}>
                {item.contact?.name || 'Sin contacto'}
              </Text>
              <Text style={[styles.contactNumber, { color: c.textMuted }]} numberOfLines={1}>
                {item.contact?.number || '—'}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.color }]} />
            <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
          </View>
        </View>

        {/* Message body */}
        <View style={[styles.messageContainer, { backgroundColor: c.background }]}>
          <MessageSquare size={14} color={c.textMuted} style={{ marginTop: 2 }} />
          <Text style={[styles.messageBody, { color: c.text }]} numberOfLines={3}>
            {item.body || '(sin mensaje)'}
          </Text>
        </View>

        {/* Footer: Date */}
        <View style={styles.cardFooter}>
          <CalendarClock size={14} color={c.textMuted} />
          <Text style={[styles.dateText, { color: c.textMuted }]}>
            {formatDate(item.sendAt)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* ── Top Header Bar (App Title + Advisor Badge) ── */}
      <View style={[styles.topHeaderBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={styles.appBrandRow}>
          <Clock size={20} color={c.primary} />
          <Text style={[styles.appBrandText, { color: c.text }]}>Programados</Text>
          <View style={[styles.countBadge, { backgroundColor: c.primary + '22' }]}>
            <Text style={[styles.countText, { color: c.primary }]}>{messages.length}</Text>
          </View>
        </View>

        {/* Logged in Advisor Badge */}
        <View style={[styles.loggedInUserBadge, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.onlineDot} />
          <User2 size={13} color={c.primary} />
          <Text style={[styles.loggedInUserName, { color: c.text }]} numberOfLines={1}>
            {user?.name || 'Asesor'}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={[styles.loadingText, { color: c.textMuted }]}>Cargando mensajes…</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary} />
          }
          contentContainerStyle={[
            styles.listContent,
            messages.length === 0 && { flexGrow: 1 },
          ]}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={[styles.emptyIconWrapper, { backgroundColor: c.primary + '15' }]}>
                <CalendarClock size={48} color={c.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: c.text }]}>
                Sin mensajes programados
              </Text>
              <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>
                Los mensajes que programes desde la web aparecerán aquí.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  appBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  appBrandText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  loggedInUserBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    maxWidth: 160,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  loggedInUserName: {
    fontSize: 12,
    fontWeight: '700',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    marginTop: spacing.sm,
  },
  listContent: {
    padding: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactName: {
    fontSize: 15,
    fontWeight: '700',
  },
  contactNumber: {
    fontSize: 12,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  messageContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  messageBody: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
});
