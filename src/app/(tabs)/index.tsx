// src/app/(tabs)/index.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Platform } from 'react-native';
import {
  StyleSheet, Text, View, FlatList, TextInput, ActivityIndicator,
  RefreshControl, TouchableOpacity, Modal, ScrollView, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { TicketListItem } from '../../components/TicketListItem';
import { ContactAvatar } from '../../components/ContactAvatar';
import { colors, spacing, borderRadius } from '../../theme/colors';
import {
  Search, MessageSquare, Clock, UserPlus, X, Users, Bell,
  SlidersHorizontal, Tag, User2, Layers, Check, ChevronRight, Trash2, CalendarClock, Building2, Mail
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { format, parseISO } from 'date-fns';
import { currentActiveTicketId, isExpoGo, getSafeNotificationsModule } from '../../services/notifications';

// ─────────────────────────────────────────────────────
// Center-dialog picker (reusable)
// ─────────────────────────────────────────────────────
function PickerSheet({
  visible, title, icon, items, selectedId, onSelect, onClose, c,
}: {
  visible: boolean;
  title: string;
  icon: React.ReactNode;
  items: { id: string | number; label: string; color?: string; subtitle?: string }[];
  selectedId: string | number | null;
  onSelect: (id: string | number | null) => void;
  onClose: () => void;
  c: typeof colors['dark'];
}) {
  const st = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },
    sheet: {
      backgroundColor: c.background,
      borderRadius: 16,
      width: '95%',
      maxWidth: 600,
      height: '40%',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
      ...(Platform.OS === 'web' ? {
        boxShadow: '0px 4px 10px rgba(0,0,0,0.15)',
      } : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      }),  elevation: 6,
    },
    header: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: c.text },
    closeBtn: {
      width: 32, height: 32, borderRadius: 16, backgroundColor: c.border,
      justifyContent: 'center', alignItems: 'center',
    },
    // "All" clear option
    clearRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      paddingHorizontal: spacing.lg, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    clearDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.border },
    clearLabel: { flex: 1, fontSize: 15, color: c.textMuted, fontStyle: 'italic' },
    // Items
    item: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.md,
      paddingHorizontal: spacing.lg, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.border + '60',
    },
    itemActive: { backgroundColor: c.primaryLight },
    colorDot: { width: 14, height: 14, borderRadius: 7 },
    labelCol: { flex: 1 },
    itemLabel: { fontSize: 15, fontWeight: '600', color: c.text },
    itemSub: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    checkBox: {
      width: 24, height: 24, borderRadius: 12,
      backgroundColor: c.primary,
      justifyContent: 'center', alignItems: 'center',
    },
    emptyBox: { paddingVertical: 40, alignItems: 'center' },
    emptyTxt: { fontSize: 14, color: c.textMuted },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={st.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()} style={{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
          <View style={st.sheet}>
            {/* Header */}
            <View style={st.header}>
              {icon}
              <Text style={st.headerTitle}>{title}</Text>
              <TouchableOpacity style={st.closeBtn} onPress={onClose}>
                <X size={16} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
              {/* Clear / All option */}
              <TouchableOpacity style={[st.clearRow, !selectedId && { backgroundColor: c.primaryLight }]}
                onPress={() => { onSelect(null); onClose(); }} activeOpacity={0.7}>
                <View style={st.clearDot} />
                <Text style={[st.clearLabel, !selectedId && { color: c.primary, fontStyle: 'normal', fontWeight: '700' }]}>
                  Todos / Sin filtro
                </Text>
                {!selectedId && (
                  <View style={st.checkBox}><Check size={14} color="#fff" /></View>
                )}
              </TouchableOpacity>

              {/* Options */}
              {items.length === 0 ? (
                <View style={st.emptyBox}><Text style={st.emptyTxt}>Sin opciones disponibles</Text></View>
              ) : (
                items.map(item => {
                  const active = String(selectedId) === String(item.id);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[st.item, active && st.itemActive]}
                      onPress={() => { onSelect(item.id); onClose(); }}
                      activeOpacity={0.7}
                    >
                      {item.color
                        ? <View style={[st.colorDot, { backgroundColor: item.color }]} />
                        : <View style={[st.colorDot, { backgroundColor: 'transparent' }]} />
                      }
                      <View style={st.labelCol}>
                        <Text style={[st.itemLabel, active && { color: c.primary }]}>{item.label}</Text>
                        {item.subtitle && <Text style={st.itemSub}>{item.subtitle}</Text>}
                      </View>
                      {active && (
                        <View style={st.checkBox}><Check size={14} color="#fff" /></View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────
// Filter chip (for the selected value display)
// ─────────────────────────────────────────────────────
function FilterChip({
  label, color, active, onPress, c,
}: {
  label: string; color?: string; active: boolean;
  onPress: () => void; c: typeof colors['dark'];
}) {
  return (
    <TouchableOpacity
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, height: 36,
        borderRadius: borderRadius.md,
        backgroundColor: active ? (color ? color + '18' : c.primaryLight) : c.card,
        borderWidth: 1,
        borderColor: active ? (color || c.primary) : c.border,
        flex: 1,
      }}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {color && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />}
      <Text style={{ flex: 1, fontSize: 12, fontWeight: '600', color: active ? (color || c.primary) : c.textMuted }} numberOfLines={1}>
        {label}
      </Text>
      <ChevronRight size={12} color={active ? (color || c.primary) : c.textMuted} />
    </TouchableOpacity>
  );
}

// ═════════════════════════════════════════════════════
// MAIN SCREEN
// ═════════════════════════════════════════════════════
export default function ChatsScreen() {
  const { user, theme, isAuth } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const c = colors[theme];

  const isAdmin =
    user?.profile?.toUpperCase() === 'ADMIN' ||
    user?.profile?.toUpperCase() === 'SUPERADMIN';

  // ── Tabs ──────────────────────────────────────────
  const [statusTab, setStatusTab] = useState<'open' | 'pending' | 'internal' | 'group'>('open');

  // ── External tickets ──────────────────────────────
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const searchDebounceRef = useRef<any | null>(null);

  // ── Filters ───────────────────────────────────────
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tags, setTags] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [allQueues, setAllQueues] = useState<any[]>([]);
  const [filterTag, setFilterTag] = useState<any | null>(null);
  const [filterQueue, setFilterQueue] = useState<any | null>(null);
  const [filterUser, setFilterUser] = useState<string>('');
  const [showAll, setShowAll] = useState<boolean>(false);
  const [filterUnread, setFilterUnread] = useState<boolean>(false);
  // Sheet open states
  const [tagSheetOpen, setTagSheetOpen] = useState(false);
  const [queueSheetOpen, setQueueSheetOpen] = useState(false);
  const [userSheetOpen, setUserSheetOpen] = useState(false);

  const activeFilterCount = [filterTag, filterQueue, filterUser].filter(Boolean).length;

  const unreadOpenCount = useMemo(() => {
    return tickets.filter(t => !t.isGroup && (t.unreadMessages || 0) > 0).length;
  }, [tickets]);

  const sortedTickets = useMemo(() => {
    let list = [...tickets].filter(t => !t.isGroup);
    if (filterUnread) {
      list = list.filter(t => (t.unreadMessages || 0) > 0);
    }
    return list.sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.updated_at || 0).getTime();
      const timeB = new Date(b.updatedAt || b.updated_at || 0).getTime();
      return timeB - timeA;
    });
  }, [tickets, filterUnread]);

  // ── Internal chats ────────────────────────────────
  const [internalTickets, setInternalTickets] = useState<any[]>([]);
  const [loadingInternal, setLoadingInternal] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [usersModalOpen, setUsersModalOpen] = useState(false);
  const [startingChat, setStartingChat] = useState(false);


  // ── Scheduled Messages Modal ──────────────────────
  const [schedListModalOpen, setSchedListModalOpen] = useState(false);
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);

  // ── Notifications ─────────────────────────────────
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // ================================================
  // FETCH FILTER DATA
  // ================================================
  const fetchFilterData = useCallback(async () => {
    try {
      const tagsRes = await api.get('/tags');
      setTags(Array.isArray(tagsRes.data) ? tagsRes.data : []);
      
      try {
        const queuesRes = await api.get('/queue');
        const queueList = Array.isArray(queuesRes.data) ? queuesRes.data : (queuesRes.data?.queues || []);
        setAllQueues(queueList);
      } catch (e) {
        console.error('Error fetching queues for filter data:', e);
      }

      try {
        const usersRes = await api.get('/users');
        const list = Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.users || []);
        setAllUsers(list);
      } catch (e) {
        console.error('Error fetching users for filter data:', e);
      }
    } catch (err) {
      console.error('Error fetching filter data:', err);
    }
  }, []);

  // ================================================
  // FETCH TICKETS
  // ================================================
  const fetchTickets = useCallback(async (pageNum: number, isRefresh = false, searchStr = searchQuery) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      let queueIds: string | undefined;
      if (filterQueue) {
        queueIds = JSON.stringify([filterQueue.id]);
      } else if (!isAdmin && user?.queues && user.queues.length > 0) {
        queueIds = JSON.stringify(user.queues.map((q: any) => q.id));
      }

      const isFilteredOrAdmin = isAdmin && (showAll || Boolean(filterUser) || Boolean(filterQueue));
      const params: Record<string, any> = {
        searchParam: searchStr,
        pageNumber: pageNum,
        status: statusTab,
        showAll: isFilteredOrAdmin ? 'true' : 'false',
      };
      if (queueIds) params.queueIds = queueIds;
      if (filterTag) params.tags = JSON.stringify([filterTag.id]);
      if (filterUser) params.userId = filterUser;
      if (filterUnread) params.withUnreadMessages = 'true';

      if (statusTab === 'open') {
        // Execute parallel requests for answered (unanswered: 'false') and unanswered (unanswered: 'true') open tickets
        const [resRespondidos, resSinResponder] = await Promise.all([
          api.get('/tickets', { params: { ...params, unanswered: 'false' } }),
          api.get('/tickets', { params: { ...params, unanswered: 'true' } }),
        ]);

        const respondidos = resRespondidos.data?.tickets || [];
        const sinResponder = resSinResponder.data?.tickets || [];

        // Combine and deduplicate by ticket ID
        const ticketMap = new Map<number, any>();
        [...sinResponder, ...respondidos].forEach((t: any) => {
          if (t && t.id) {
            ticketMap.set(t.id, t);
          }
        });

        // Also check unread tickets for urgent notifications
        if (pageNum === 1 && !searchStr) {
          try {
            const notifRes = await api.get('/tickets', { params: { withUnreadMessages: 'true', showAll: isFilteredOrAdmin ? 'true' : 'false' } });
            const notifTickets = notifRes.data?.tickets || [];
            notifTickets.forEach((notifTicket: any) => {
              if (notifTicket.status === 'open' && !ticketMap.has(notifTicket.id)) {
                ticketMap.set(notifTicket.id, notifTicket);
              }
            });
          } catch (err) {
            console.error('Error merging urgent notifications:', err);
          }
        }

        let mergedTickets = Array.from(ticketMap.values());
        mergedTickets.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

        if (isRefresh || pageNum === 1) {
          setTickets(prev => {
            const existingMap = new Map(mergedTickets.map((t: any) => [t.id, t]));
            prev.forEach((prevTicket: any) => {
              if (prevTicket.status === 'open' && !existingMap.has(prevTicket.id)) {
                mergedTickets.push(prevTicket);
              }
            });
            return mergedTickets.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
          });
        } else {
          setTickets(prev => {
            const existingMap = new Map(prev.map((t: any) => [t.id, t]));
            mergedTickets.forEach((t: any) => existingMap.set(t.id, t));
            const combined = Array.from(existingMap.values());
            return combined.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
          });
        }
        setHasMore(Boolean(resRespondidos.data?.hasMore || resSinResponder.data?.hasMore));
      } else {
        // Standard single request for non-open tabs (pending, closed)
        const { data } = await api.get('/tickets', { params });
        if (data?.tickets) {
          let mergedTickets = [...data.tickets];
          if (isRefresh || pageNum === 1) {
            setTickets(mergedTickets);
          } else {
            setTickets(prev => {
              const existingIds = new Set(prev.map(t => t.id));
              return [...prev, ...mergedTickets.filter((t: any) => !existingIds.has(t.id))];
            });
          }
          setHasMore(Boolean(data.hasMore));
        }
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [statusTab, filterTag, filterQueue, filterUser, showAll, user?.queues, searchQuery, filterUnread]);

  // ================================================
  // FETCH INTERNAL / NOTIFICATIONS / USERS
  // ================================================
  const [groupTickets, setGroupTickets] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  const fetchGroups = useCallback(async () => {
    try {
      setLoadingGroups(true);
      const { data } = await api.get('/tickets', { params: { isGroup: 'true', showAll: 'false' } });
      setGroupTickets(data?.tickets || []);
    } catch (err) {
      console.error('Error fetching groups:', err);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // ---- Restoring internal tickets fetch ----
// internal tickets state already declared above

  // ---- Restoring internal tickets fetch ----
  function fetchInternalTickets() {
    setLoadingInternal(true);
    api.get('/tickets', { params: { isInternal: 'true', showAll: 'false' } })
        .then(res => {
          // Exclude group tickets from internal list
          const filtered = (res.data?.tickets || []).filter((t: any) => !t.isGroup);
          setInternalTickets(filtered);
        })
      .catch(err => {
        console.error('Error fetching internal tickets:', err);
      })
      .finally(() => {
        setLoadingInternal(false);
      });
  }

  const fetchScheduledMessages = useCallback(async () => {
    try {
      setLoadingScheduled(true);
      const { data } = await api.get('/scheduled-messages');
      const sorted = (data || []).sort((a: any, b: any) => {
        const dateA = new Date(a.sendAt || a.dataLimite || 0).getTime();
        const dateB = new Date(b.sendAt || b.dataLimite || 0).getTime();
        return dateA - dateB;
      });
      setScheduledMessages(sorted);
    } catch (err) { 
      console.error('Error fetching scheduled messages in chats screen:', err); 
    } finally {
      setLoadingScheduled(false);
    }
  }, []);

  const handleDeleteSchedule = async (id: number) => {
    Alert.alert(
      'Eliminar Programación',
      '¿Estás seguro de que deseas cancelar y eliminar este mensaje programado?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/scheduled-messages/${id}`);
              fetchScheduledMessages();
            } catch (err) {
              console.error('Error deleting scheduled message:', err);
              Alert.alert('Error', 'No se pudo eliminar el mensaje programado.');
            }
          }
        }
      ]
    );
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const { data } = await api.get('/tickets', { params: { withUnreadMessages: 'true', showAll: 'false' } });
      const notifs = data?.tickets || [];
      setNotifications(notifs);
      setUnreadCount(notifs.length);
    } catch (err) { console.error(err); }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const { data } = await api.get('/users');
      setUsersList((data?.users || []).filter((u: any) => u.id !== user?.id));
    } catch (err) { console.error(err); }
  }, [user?.id]);

  const handleStartInternalChat = async (targetUserId: number) => {
    try {
      setStartingChat(true);
      const { data } = await api.post('/tickets/internal', { targetUserId });
      setUsersModalOpen(false);
      router.push(`/ticket/${data.id}`);
    } catch (err) { console.error(err); }
    finally { setStartingChat(false); }
  };

  // ================================================
  // EFFECTS
  // ================================================
  useEffect(() => {
    if (!isAuth) return;
    fetchFilterData();
  }, [isAuth, fetchFilterData]);

  useEffect(() => {
    if (!isAuth) return;
    if (statusTab !== 'internal') {
      setPage(1);
      fetchTickets(1, true);
    } else {
      fetchInternalTickets();
      fetchGroups();
    }
  }, [isAuth, statusTab, filterTag, filterQueue, filterUser, showAll, filterUnread]);

  useEffect(() => {
    if (!isAuth) return;
    fetchScheduledMessages();
    fetchNotifications();
  }, [isAuth, fetchScheduledMessages, fetchNotifications]);
  useEffect(() => { if (usersModalOpen) fetchUsers(); }, [usersModalOpen]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => { setPage(1); fetchTickets(1, true, text); }, 500);
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    if (statusTab === 'internal') { fetchInternalTickets(); fetchGroups(); }
    else fetchTickets(1, true);
  };

  const loadMore = () => {
    if (!hasMore || loadingMore || loading || statusTab === 'internal') return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchTickets(nextPage);

  };

  const clearFilters = () => {
    setFilterTag(null);
    setFilterQueue(null);
    setFilterUser('');
    setShowAll(isAdmin);
    setFilterUnread(false);
  };

  // ================================================
  // SOCKET EVENTS
  // ================================================
  useEffect(() => {
    if (!socket) return;
    socket.emit('joinNotification');

    const shouldIncludeTicket = (t: any) => {
      if (!t) return false;

      if (filterUser && String(t.userId) !== String(filterUser)) {
        return false;
      }

      if (filterQueue) {
        const ticketQueueId = t.queueId || t.queue?.id;
        if (String(ticketQueueId) !== String(filterQueue.id)) {
          return false;
        }
      }

      if (statusTab === 'pending') {
        return t.status === 'pending';
      }

      if (statusTab === 'open') {
        if (t.status !== 'open') return false;
        if (!showAll && !filterUser && user?.id) {
          return String(t.userId) === String(user.id) || !t.userId;
        }
        return true;
      }

      if ((statusTab as string) === 'closed') {
        if (t.status !== 'closed') return false;
        if (!showAll && !filterUser && user?.id) {
          return String(t.userId) === String(user.id);
        }
        return true;
      }

      return false;
    };

    socket.on('ticket', (data: any) => {
      const { action, ticket } = data;
      if (action === 'update' && ticket) {
        setTickets(prev => {
          const idx = prev.findIndex(t => t.id === ticket.id);
          const correctStatus = shouldIncludeTicket(ticket);
          
          if (idx !== -1) {
            if (correctStatus) {
              const oldTicket = prev[idx];
              const updatedTicket = {
                ...oldTicket,
                ...ticket,
                user: ticket.user || oldTicket.user || (ticket.userId && user?.id && String(ticket.userId) === String(user.id) ? { id: user.id, name: user.name } : undefined),
                contact: {
                  ...oldTicket.contact,
                  ...ticket.contact,
                  profilePicUrl: ticket.contact?.profilePicUrl || oldTicket.contact?.profilePicUrl,
                }
              };
              const rest = prev.filter(t => t.id !== ticket.id);
              return [updatedTicket, ...rest];
            }
            return prev.filter(t => t.id !== ticket.id);
          }
          if (correctStatus) {
            const newTicket = {
              ...ticket,
              user: ticket.user || (ticket.userId && user?.id && String(ticket.userId) === String(user.id) ? { id: user.id, name: user.name } : undefined),
            };
            return [newTicket, ...prev];
          }
          return prev;
        });
      }
      if (action === 'delete') setTickets(prev => prev.filter(t => t.id !== data.ticketId));
      fetchNotifications();
    });

    socket.on('appMessage', (data: any) => {
      const { action, message, ticket } = data;
      if (action === 'create' && ticket) {
        if (!message.read && (ticket.userId === user?.id || !ticket.userId)) {
          // Play sound and show local notification if not in active chat
          const isCurrentlyViewingChat = currentActiveTicketId && String(currentActiveTicketId) === String(ticket.id);
          if (!isCurrentlyViewingChat && Platform.OS !== 'web' && !isExpoGo) {
            try {
              const Notifications = getSafeNotificationsModule();
              Notifications?.scheduleNotificationAsync({
                content: {
                  title: ticket.contact?.name || 'Nuevo Mensaje',
                  body: message.body || 'Nuevo mensaje recibido',
                  data: { ticketId: ticket.id },
                },
                trigger: null,
              });
            } catch (err) {
              console.error('Error triggering local foreground notification:', err);
            }
          }

          setUnreadCount(prev => prev + 1);
          setNotifications(prev => {
            const idx = prev.findIndex(t => t.id === ticket.id);
            if (idx !== -1) {
              const oldTicket = prev[idx];
              const updatedTicket = {
                ...oldTicket,
                ...ticket,
                user: ticket.user || oldTicket.user || (ticket.userId && user?.id && String(ticket.userId) === String(user.id) ? { id: user.id, name: user.name } : undefined),
                contact: {
                  ...oldTicket.contact,
                  ...ticket.contact,
                  profilePicUrl: ticket.contact?.profilePicUrl || oldTicket.contact?.profilePicUrl,
                }
              };
              const rest = prev.filter(t => t.id !== ticket.id);
              return [updatedTicket, ...rest];
            }
            return [ticket, ...prev];
          });
        }
        setTickets(prev => {
          const idx = prev.findIndex(t => t.id === ticket.id);
          const correctStatus = shouldIncludeTicket(ticket);
          if (idx !== -1) {
            if (correctStatus) {
              const oldTicket = prev[idx];
              const updatedTicket = {
                ...oldTicket,
                ...ticket,
                user: ticket.user || oldTicket.user || (ticket.userId && user?.id && String(ticket.userId) === String(user.id) ? { id: user.id, name: user.name } : undefined),
                lastMessage: message.body,
                unreadMessages: ticket.unreadMessages,
                updatedAt: ticket.updatedAt || new Date().toISOString(),
                contact: {
                  ...oldTicket.contact,
                  ...ticket.contact,
                  profilePicUrl: ticket.contact?.profilePicUrl || oldTicket.contact?.profilePicUrl,
                }
              };
              const rest = prev.filter(t => t.id !== ticket.id);
              return [updatedTicket, ...rest];
            }
            return prev.filter(t => t.id !== ticket.id);
          }
          if (correctStatus) {
            const newTicket = {
              ...ticket,
              user: ticket.user || (ticket.userId && user?.id && String(ticket.userId) === String(user.id) ? { id: user.id, name: user.name } : undefined),
            };
            return [newTicket, ...prev];
          }
          return prev;
        });
      }
    });

    socket.on('contact', (data: any) => {
      const { action, contact } = data;
      if (action === 'update' && contact) {
        setTickets(prev => {
          return prev.map(t => {
            if (t.contact?.id === contact.id) {
              return {
                ...t,
                contact: {
                  ...t.contact,
                  ...contact,
                  profilePicUrl: contact.profilePicUrl || t.contact?.profilePicUrl,
                }
              };
            }
            return t;
          });
        });
        setNotifications(prev => {
          return prev.map(t => {
            if (t.contact?.id === contact.id) {
              return {
                ...t,
                contact: {
                  ...t.contact,
                  ...contact,
                  profilePicUrl: contact.profilePicUrl || t.contact?.profilePicUrl,
                }
              };
            }
            return t;
          });
        });
      }
    });

    return () => {
      socket.off('ticket');
      socket.off('appMessage');
      socket.off('contact');
    };
  }, [socket, statusTab, showAll, user?.id]);

  // ================================================
  // RENDER
  // ================================================
  const insets = useSafeAreaInsets();
  const st = buildStyles(c, insets);

  return (
    <View style={st.container}>

      {/* ── Top Header Bar (App Title + Logged-in Advisor Badge) ── */}
      <View style={st.topHeaderBar}>
        <View style={st.appBrandRow}>
          <MessageSquare size={20} color={c.primary} />
          <Text style={[st.appBrandText, { color: c.text }]}>Chats</Text>
        </View>

        {/* Logged in Advisor Badge */}
        <View style={[st.loggedInUserBadge, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={st.onlineDot} />
          <User2 size={13} color={c.primary} />
          <Text style={[st.loggedInUserName, { color: c.text }]} numberOfLines={1}>
            {user?.name || 'Asesor'}
          </Text>
        </View>
      </View>

      {/* ── Search Row ── */}
      <View style={st.topRow}>
        <View style={st.searchWrapper}>
          <Search size={16} color={c.textMuted} />
          <TextInput
            style={st.searchInput}
            placeholder="Buscar chats..."
            placeholderTextColor={c.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={14} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter toggle */}
        <TouchableOpacity
          style={[st.iconBtn, filtersOpen && { backgroundColor: c.primary, borderColor: c.primary }]}
          onPress={() => setFiltersOpen(o => !o)}
          activeOpacity={0.7}
        >
          <SlidersHorizontal size={18} color={filtersOpen ? '#fff' : c.textMuted} />
          {activeFilterCount > 0 && !filtersOpen && (
            <View style={st.dotBadge} />
          )}
        </TouchableOpacity>

        {/* Notifications (Bell) */}
        <TouchableOpacity 
          style={st.iconBtn} 
          onPress={() => {
            fetchNotifications();
            setNotifModalOpen(true);
          }} 
          activeOpacity={0.7}
        >
          <Bell size={18} color={unreadCount > 0 ? c.primary : c.textMuted} />
          {unreadCount > 0 && (
            <View style={st.badge}>
              <Text style={st.badgeTxt}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* ── COMPACT FILTER SELECTORS ROW ── */}
      {filtersOpen && (
        <View style={st.compactFilterRow}>
          {/* Tag Select */}
          <TouchableOpacity 
            style={[st.compactSelect, filterTag && st.compactSelectActive]} 
            onPress={() => setTagSheetOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={[st.compactSelectTxt, filterTag && st.compactSelectTxtActive]}>
              {filterTag?.name || 'Etiqueta'} ▾
            </Text>
          </TouchableOpacity>

          {/* Queue / Department Select */}
          <TouchableOpacity 
            style={[st.compactSelect, filterQueue && st.compactSelectActive]} 
            onPress={() => setQueueSheetOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={[st.compactSelectTxt, filterQueue && st.compactSelectTxtActive]}>
              {filterQueue?.name || 'Departamento'} ▾
            </Text>
          </TouchableOpacity>

          {/* User Select (admin only) */}
          {isAdmin && (
            <TouchableOpacity 
              style={[st.compactSelect, filterUser && st.compactSelectActive]} 
              onPress={() => setUserSheetOpen(true)}
              activeOpacity={0.7}
            >
              <Text style={[st.compactSelectTxt, filterUser && st.compactSelectTxtActive]}>
                {allUsers.find(u => u.id.toString() === filterUser)?.name || 'Asesor'} ▾
              </Text>
            </TouchableOpacity>
          )}

          {/* Show All Toggle (admin only) */}
          {isAdmin && (
            <TouchableOpacity 
              style={[st.compactSelect, showAll && st.compactSelectActive]} 
              onPress={() => setShowAll(s => !s)}
              activeOpacity={0.7}
            >
              <Text style={[st.compactSelectTxt, showAll && st.compactSelectTxtActive]}>
                {showAll ? 'Todos' : 'Mis chats'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Clear button if active */}
          {activeFilterCount > 0 && (
            <TouchableOpacity 
              style={st.compactClearBtn} 
              onPress={clearFilters}
              activeOpacity={0.7}
            >
              <X size={12} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Active Filter Chips Row ── */}
      {activeFilterCount > 0 && statusTab !== 'internal' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipRow}>
          {filterTag && (
            <TouchableOpacity style={[st.activeChip, { backgroundColor: filterTag.color + '18', borderColor: filterTag.color }]} onPress={() => setFilterTag(null)}>
              <View style={[st.chipDot, { backgroundColor: filterTag.color }]} />
              <Text style={[st.chipTxt, { color: filterTag.color }]}>{filterTag.name}</Text>
              <X size={10} color={filterTag.color} />
            </TouchableOpacity>
          )}
          {filterQueue && (
            <TouchableOpacity style={[st.activeChip, { backgroundColor: c.primaryLight, borderColor: c.primary }]} onPress={() => setFilterQueue(null)}>
              <View style={[st.chipDot, { backgroundColor: filterQueue.color || c.primary }]} />
              <Text style={[st.chipTxt, { color: c.primary }]}>{filterQueue.name}</Text>
              <X size={10} color={c.primary} />
            </TouchableOpacity>
          )}
          {filterUser && (
            <TouchableOpacity style={[st.activeChip, { backgroundColor: c.primaryLight, borderColor: c.primary }]} onPress={() => setFilterUser('')}>
              <Text style={[st.chipTxt, { color: c.primary }]}>
                {allUsers.find(u => u.id.toString() === filterUser)?.name || 'Asesor'}
              </Text>
              <X size={10} color={c.primary} />
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Updated tabs with icons */}
      <View style={st.tabsContainer}>
        {(['open', 'pending', 'internal', 'group'] as const).map(tab => {
          const label = tab === 'open' ? 'Abiertos' : tab === 'pending' ? 'Pendientes' : tab === 'internal' ? 'Internos' : 'Grupos';
          const IconComponent =
            tab === 'open' ? MessageSquare :
            tab === 'pending' ? Clock :
            tab === 'internal' ? User2 :
            Users; // group
          return (
            <TouchableOpacity
              key={tab}
              style={[st.tab, statusTab === tab && st.activeTab]}
              onPress={() => {
                setStatusTab(tab);
                if (tab !== 'open') setFilterUnread(false);
              }}
              activeOpacity={0.7}
            >
              <IconComponent size={16} color={statusTab === tab ? c.primary : c.text} style={{ marginRight: 4 }} />
              <Text style={[st.tabText, statusTab === tab && st.activeTabText]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Sub-Filter Bar for Open Chats (Todos / No leídos) ── */}
      {statusTab === 'open' && (
        <View style={st.openSubFilterBar}>
          <TouchableOpacity
            style={[st.openFilterPill, !filterUnread && st.openFilterPillActive]}
            onPress={() => setFilterUnread(false)}
            activeOpacity={0.7}
          >
            <Text style={[st.openFilterPillText, !filterUnread && st.openFilterPillTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.openFilterPill, filterUnread && st.openFilterPillActive]}
            onPress={() => setFilterUnread(u => !u)}
            activeOpacity={0.7}
          >
            <Mail size={13} color={filterUnread ? '#090D16' : c.textMuted} style={{ marginRight: 5 }} />
            <Text style={[st.openFilterPillText, filterUnread && st.openFilterPillTextActive]}>
              No leídos
            </Text>
            {unreadOpenCount > 0 && (
              <View style={[st.unreadPillBadge, filterUnread && st.unreadPillBadgeActive, { marginLeft: 5 }]}>
                <Text style={[st.unreadPillBadgeText, filterUnread && st.unreadPillBadgeTextActive]}>
                  {unreadOpenCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* ── INTERNAL TAB ── */}
      {statusTab === 'internal' ? (
        <FlatList
          style={{ backgroundColor: '#d0e8ff' }}
          data={internalTickets}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TicketListItem ticket={item} isInternal={!item.isGroup} allUsers={allUsers} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={() => loadingMore ? <View style={st.footerLoader}><ActivityIndicator color={c.primary} /></View> : null}
          ListEmptyComponent={() => (
            <View style={st.emptyContainer}>
              <Users size={48} color={c.border} />
              <Text style={st.emptyTitle}>Sin chats internos</Text>
              <Text style={st.emptySubtitle}>No hay chats internos disponibles.</Text>
            </View>
          )}
          contentContainerStyle={[st.listContent, internalTickets.length === 0 && { flexGrow: 1 }]}
        />
      ) : statusTab === 'group' ? (
        // GROUPS TAB
        <FlatList
          data={groupTickets}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TicketListItem ticket={item} isInternal={false} allUsers={allUsers} />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={() => loadingMore ? <View style={st.footerLoader}><ActivityIndicator color={c.primary} /></View> : null}
          ListEmptyComponent={() => (
            <View style={st.emptyContainer}>
              <Users size={48} color={c.border} />
              <Text style={st.emptyTitle}>Sin grupos</Text>
              <Text style={st.emptySubtitle}>No hay grupos disponibles.</Text>
            </View>
          )}
          contentContainerStyle={[st.listContent, groupTickets.length === 0 && { flexGrow: 1 }]}
        />
      ) : loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={sortedTickets}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => <TicketListItem ticket={item} allUsers={allUsers} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={() => loadingMore ? <View style={st.footerLoader}><ActivityIndicator color={c.primary} /></View> : null}
          ListEmptyComponent={
            <View style={st.emptyContainer}>
              <MessageSquare size={48} color={c.border} style={{ marginBottom: spacing.md }} />
              <Text style={st.emptyTitle}>No hay conversaciones</Text>
              <Text style={st.emptySubtitle}>
                {filterUnread
                  ? 'No tienes chats abiertos con mensajes sin leer.'
                  : searchQuery || activeFilterCount > 0
                  ? 'No se encontraron chats con los filtros aplicados.'
                  : `No tienes chats ${statusTab === 'open' ? 'abiertos' : 'pendientes'} en este momento.`}
              </Text>
              {filterUnread && (
                <TouchableOpacity
                  style={[st.openFilterPill, { marginTop: spacing.md, backgroundColor: c.primary, borderColor: c.primary }]}
                  onPress={() => setFilterUnread(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[st.openFilterPillText, { color: '#090D16', fontWeight: '700' }]}>
                    Ver todos los chats abiertos
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
          contentContainerStyle={[st.listContent, tickets.length === 0 && { flexGrow: 1 }]}
        />
      )}

      {/* ════════════════════════════════════════
          PICKER SHEETS
      ════════════════════════════════════════ */}

      {/* Tag picker */}
      <PickerSheet
        visible={tagSheetOpen}
        title="Filtrar por etiqueta"
        icon={<Tag size={18} color={c.primary} />}
        items={tags.map(t => ({ id: t.id, label: t.name, color: t.color }))}
        selectedId={filterTag?.id ?? null}
        onSelect={id => setFilterTag(id ? tags.find(t => t.id === id) || null : null)}
        onClose={() => setTagSheetOpen(false)}
        c={c}
      />

      {/* Queue / Department picker */}
      <PickerSheet
        visible={queueSheetOpen}
        title="Filtrar por departamento"
        icon={<Building2 size={18} color={c.primary} />}
        items={(allQueues.length > 0 ? allQueues : (user?.queues || [])).map((q: any) => ({ id: q.id, label: q.name, color: q.color }))}
        selectedId={filterQueue?.id ?? null}
        onSelect={id => {
          const list = allQueues.length > 0 ? allQueues : (user?.queues || []);
          setFilterQueue(id ? list.find((q: any) => q.id === id) || null : null);
        }}
        onClose={() => setQueueSheetOpen(false)}
        c={c}
      />

      {/* User picker (admin only) */}
      {isAdmin && (
        <PickerSheet
          visible={userSheetOpen}
          title="Filtrar por asesor"
          icon={<User2 size={18} color={c.primary} />}
          items={allUsers.map(u => ({ id: u.id, label: u.name, subtitle: u.email }))}
          selectedId={filterUser || null}
          onSelect={id => setFilterUser(id ? String(id) : '')}
          onClose={() => setUserSheetOpen(false)}
          c={c}
        />
      )}

      {/* ════════════════════════════════════════
          USERS MODAL (internal chat)
      ════════════════════════════════════════ */}
      <Modal visible={usersModalOpen} transparent animationType="slide">
        <SafeAreaView style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: c.background, borderColor: c.border }]}>
            <View style={[st.modalHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
              <Text style={[st.modalTitle, { color: c.text }]}>Iniciar chat con...</Text>
              <TouchableOpacity onPress={() => setUsersModalOpen(false)}><X size={22} color={c.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
              {usersList.length === 0
                ? <Text style={[st.emptySubtitle, { textAlign: 'center', marginTop: spacing.xl }]}>No hay otros asesores disponibles.</Text>
                : usersList.map(u => (
                  <TouchableOpacity key={u.id} style={[st.userRow, { backgroundColor: c.card, borderColor: c.border }]}
                    onPress={() => handleStartInternalChat(u.id)} activeOpacity={0.7} disabled={startingChat}>
                    <View style={[st.userAvatar, { backgroundColor: c.primaryLight }]}>
                      <Text style={[st.userAvatarTxt, { color: c.primary }]}>{u.name?.charAt(0)?.toUpperCase() || 'U'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[st.userName, { color: c.text }]}>{u.name}</Text>
                      <Text style={[st.userEmail, { color: c.textMuted }]}>{u.email}</Text>
                    </View>
                    {startingChat ? <ActivityIndicator size="small" color={c.primary} /> : <MessageSquare size={18} color={c.primary} />}
                  </TouchableOpacity>
                ))
              }
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ════════════════════════════════════════
          NOTIFICATIONS MODAL
      ════════════════════════════════════════ */}
      <Modal visible={notifModalOpen} transparent animationType="slide">
        <SafeAreaView style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: c.background, borderColor: c.border }]}>
            <View style={[st.modalHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
              <Text style={[st.modalTitle, { color: c.text }]}>
                Notificaciones ({notifications.length})
              </Text>
              <TouchableOpacity onPress={() => setNotifModalOpen(false)}>
                <X size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}
              refreshControl={
                <RefreshControl 
                  refreshing={false} 
                  onRefresh={fetchNotifications} 
                  tintColor={c.primary} 
                  colors={[c.primary]} 
                />
              }
            >
              {notifications.length === 0 ? (
                <View style={[st.emptyContainer, { paddingVertical: spacing.xl * 2 }]}>
                  <Bell size={56} color={c.border} />
                  <Text style={[st.emptyTitle, { color: c.textMuted }]}>Sin notificaciones</Text>
                  <Text style={[st.emptySubtitle, { color: c.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8 }]}>
                    No tienes mensajes sin leer por el momento.
                  </Text>
                </View>
              ) : (
                notifications.map(ticket => (
                  <TouchableOpacity 
                    key={ticket.id} 
                    style={[st.schedCard, { backgroundColor: c.card, borderColor: c.border }]}
                    onPress={() => {
                      setNotifModalOpen(false);
                      router.push(`/ticket/${ticket.id}`);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={st.schedCardHeader}>
                      <ContactAvatar
                        contact={ticket.contact}
                        size={36}
                        backgroundColor="rgba(16, 185, 129, 0.08)"
                        textColor="#10B981"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[st.contactName, { color: c.text }]} numberOfLines={1}>
                          {ticket.contact?.name || 'Contacto'}
                        </Text>
                        <Text style={[st.contactPhone, { color: c.textMuted }]} numberOfLines={1}>
                          {ticket.lastMessage || ''}
                        </Text>
                      </View>
                      {ticket.unreadMessages > 0 && (
                        <View style={[st.dateBox, { backgroundColor: c.primary + '22' }]}>
                          <Text style={[st.dateTxt, { color: c.primary, fontWeight: '700' }]}>
                            {ticket.unreadMessages} sin leer
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function buildStyles(c: typeof colors['dark'], insets: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    // Top header bar
    topHeaderBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: Platform.OS !== 'web' ? Math.max(insets.top, 8) : spacing.sm,
      paddingBottom: 4,
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
      maxWidth: 180,
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
    // Top search row
    topRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.sm, gap: spacing.sm },
    searchWrapper: { flex: 1, backgroundColor: c.card, borderRadius: borderRadius.md, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, height: 46, gap: spacing.sm },
    searchInput: { flex: 1, color: c.text, fontSize: 15 },
    iconBtn: { width: 46, height: 46, borderRadius: borderRadius.md, backgroundColor: c.card, borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center' },
    dotBadge: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary },
    badge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', borderRadius: 10, minWidth: 18, height: 18, paddingHorizontal: 3, justifyContent: 'center', alignItems: 'center' },
    badgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
    // Filter panel
    compactFilterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: 6,
      flexWrap: 'wrap'
    },
    compactSelect: {
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    containerLarge: {
      flexDirection: 'row',
      padding: spacing.lg,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      alignItems: 'center',
      minHeight: 80,
    },
    compactSelectActive: {
      backgroundColor: c.primaryLight,
      borderColor: c.primary,
    },
    compactSelectTxt: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
    },
    compactSelectTxtActive: {
      color: c.primary,
      fontWeight: '700',
    },
    compactClearBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: '#FEE2E2',
      borderWidth: 1,
      borderColor: '#FCA5A5',
      justifyContent: 'center',
      alignItems: 'center',
    },
    toggleOptionTxtActive: { color: '#fff' },
    // Active chips row
    chipRow: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm, flexDirection: 'row', gap: spacing.sm },
    activeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: borderRadius.sm, borderWidth: 1 },
    chipDot: { width: 7, height: 7, borderRadius: 4 },
    chipTxt: { fontSize: 12, fontWeight: '700' },
    // Tabs
    tabsContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.border },
    tab: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    activeTab: { borderBottomColor: c.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    activeTabText: { color: c.primary },
    // Open chats sub-filter bar (Todos / No leídos)
    openSubFilterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      gap: 8,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    openFilterPill: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
    },
    openFilterPillActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    openFilterPillText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
    },
    openFilterPillTextActive: {
      color: '#090D16',
      fontWeight: '700',
    },
    unreadPillBadge: {
      backgroundColor: c.primary,
      borderRadius: 10,
      paddingHorizontal: 5,
      paddingVertical: 1,
      minWidth: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    unreadPillBadgeActive: {
      backgroundColor: '#090D16',
    },
    unreadPillBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#090D16',
    },
    unreadPillBadgeTextActive: {
      color: c.primary,
    },
    // Internal
    newInternalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, margin: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: c.primary },
    newInternalBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
    // Empty
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xl, paddingVertical: spacing.xl },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.textMuted, marginTop: spacing.md },
    emptySubtitle: { fontSize: 14, color: c.textMuted, marginTop: spacing.sm, textAlign: 'center' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: {
      paddingBottom: spacing.lg + (insets.bottom > 0 ? insets.bottom : spacing.md),
    },
    footerLoader: { paddingVertical: spacing.md, alignItems: 'center' },
    // Modal shared
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { flex: 1, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, borderWidth: 1, marginTop: 60 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg },
    modalTitle: { fontSize: 17, fontWeight: '700' },
    userRow: { flexDirection: 'row', alignItems: 'center', padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, marginBottom: spacing.sm, gap: spacing.md },
    userAvatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    userAvatarTxt: { fontSize: 18, fontWeight: '700' },
    userName: { fontSize: 15, fontWeight: '700' },
    userEmail: { fontSize: 12, marginTop: 2 },
    // Scheduled cards style
    schedCard: {
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      padding: spacing.md,
      marginBottom: spacing.md,
      elevation: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    schedCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    contactName: {
      fontSize: 15,
      fontWeight: '700',
    },
    contactPhone: {
      fontSize: 11,
      marginTop: 1,
    },
    dateBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    dateTxt: {
      fontSize: 11,
      fontWeight: '700',
    },
    messageBody: {
      fontSize: 14,
      lineHeight: 20,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      borderTopWidth: 1,
      paddingTop: spacing.sm,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: borderRadius.md,
    },
    actionButtonTxt: {
      fontSize: 12,
      fontWeight: '700',
    },
  });
}
