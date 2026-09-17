// src/app/(tabs)/pipelines.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { MessageCircle, Eye, X, Phone, Mail, Tag, ChevronRight, RefreshCw, CalendarClock, Trash2, User2, TrendingUp, Columns, FileSpreadsheet } from 'lucide-react-native';
import { ExcelPipelineView } from '../../components/ExcelPipelineView';
import { format, parseISO } from 'date-fns';

// --- Helper functions ---
const formatDuration = (startStr: string, endStr: string) => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return 'menos de 1 min';
  if (diffMins < 60) return `${diffMins} min`;
  const h = Math.floor(diffMins / 60);
  return `${h}h ${diffMins % 60}m`;
};

// --- Lead Card Component ---
function LeadCard({ ticket, tag, allTags, onMoved }: any) {
  const router = useRouter();
  const { theme } = useAuth();
  const c = colors[theme];
  const [detailOpen, setDetailOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moving, setMoving] = useState(false);

  // Scheduled Messages inside Lead Modal
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [schedLoading, setSchedLoading] = useState(false);

  const fetchScheduledMessages = async () => {
    if (!ticket.contact?.id) return;
    try {
      setSchedLoading(true);
      const { data } = await api.get('/scheduled-messages', {
        params: { contactId: ticket.contact.id }
      });
      setScheduledMessages(data || []);
    } catch (err) {
      console.error('Error fetching scheduled messages in pipeline:', err);
    } finally {
      setSchedLoading(false);
    }
  };

  useEffect(() => {
    if (detailOpen) {
      fetchScheduledMessages();
    }
  }, [detailOpen]);

  const handleDeleteSchedule = async (id: number) => {
    Alert.alert(
      'Confirmar Eliminación',
      '¿Estás seguro de que deseas eliminar este mensaje programado?',
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
              console.error('Error deleting scheduled message in pipeline:', err);
              Alert.alert('Error', 'No se pudo eliminar el mensaje programado.');
            }
          }
        }
      ]
    );
  };

  const handleMoveToLane = async (targetTag: any) => {
    if (targetTag.id === tag.id) {
      setMoveOpen(false);
      return;
    }
    try {
      setMoving(true);
      await api.post(`/tags/sync/${ticket.id}`, { tags: [targetTag] });
      setMoveOpen(false);
      Alert.alert('✅ Movido', `Lead movido a "${targetTag.name}" exitosamente.`);
      onMoved();
    } catch (err) {
      console.error('Error moving lead:', err);
      Alert.alert('Error', 'No se pudo mover el lead.');
    } finally {
      setMoving(false);
    }
  };

  const cardStyles = StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: c.border,
      borderLeftWidth: 4,
      borderLeftColor: tag.color || c.primary,
    },
    name: { fontSize: 15, fontWeight: '700', color: c.text, marginBottom: 2 },
    lastMsg: { fontSize: 12, color: c.textMuted },
    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: c.border },
    number: { fontSize: 11, color: c.textMuted },
    actions: { flexDirection: 'row', gap: spacing.sm },
    actionBtn: { padding: 6, borderRadius: borderRadius.sm, backgroundColor: c.border },
    queueBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: borderRadius.xs,
      borderWidth: 1,
      alignSelf: 'center',
    },
    queueBadgeText: {
      fontSize: 9,
      fontWeight: '700',
    },
  });

  const detailSt = buildDetailStyles(c);

  return (
    <>
      <View style={cardStyles.card}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <Text style={[cardStyles.name, { flex: 1, marginRight: spacing.sm }]} numberOfLines={1}>{ticket.contact?.name || 'Sin nombre'}</Text>
          {ticket.queue ? (
            <View style={[cardStyles.queueBadge, { backgroundColor: (ticket.queue.color || c.primary) + '15', borderColor: ticket.queue.color || c.primary }]}>
              <Text style={[cardStyles.queueBadgeText, { color: ticket.queue.color || c.primary }]}>{ticket.queue.name}</Text>
            </View>
          ) : (
            <View style={[cardStyles.queueBadge, { backgroundColor: 'rgba(156, 163, 175, 0.1)', borderColor: '#9CA3AF' }]}>
              <Text style={[cardStyles.queueBadgeText, { color: '#9CA3AF' }]}>Sin depto</Text>
            </View>
          )}
        </View>
        <Text style={cardStyles.lastMsg} numberOfLines={1}>{ticket.lastMessage || 'Sin mensajes'}</Text>
        <View style={cardStyles.footer}>
          <Text style={cardStyles.number}>+{ticket.contact?.number || ''}</Text>
          <View style={cardStyles.actions}>
            {/* Move lane */}
            <TouchableOpacity style={cardStyles.actionBtn} onPress={() => setMoveOpen(true)}>
              <ChevronRight size={14} color={c.primary} />
            </TouchableOpacity>
            {/* Details */}
            <TouchableOpacity style={cardStyles.actionBtn} onPress={() => setDetailOpen(true)}>
              <Eye size={14} color={c.textMuted} />
            </TouchableOpacity>
            {/* Go to chat */}
            <TouchableOpacity style={cardStyles.actionBtn} onPress={() => router.push(`/ticket/${ticket.id}`)}>
              <MessageCircle size={14} color={c.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Move to Lane Modal */}
      <Modal visible={moveOpen} transparent animationType="fade">
        <View style={[detailSt.overlay]}>
          <View style={[detailSt.box, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={detailSt.hdr}>
              <Text style={[detailSt.title, { color: c.text }]}>Mover a etapa</Text>
              <TouchableOpacity onPress={() => setMoveOpen(false)}>
                <X size={20} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            {moving ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {allTags.map((t: any) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[detailSt.laneItem, { borderColor: c.border, backgroundColor: t.id === tag.id ? c.primaryLight : 'transparent' }]}
                    onPress={() => handleMoveToLane(t)}
                    activeOpacity={0.7}
                  >
                    <View style={[detailSt.dot, { backgroundColor: t.color || c.primary }]} />
                    <Text style={[detailSt.laneName, { color: c.text }]}>{t.name}</Text>
                    {t.id === tag.id && <Text style={{ fontSize: 11, color: c.primary, marginLeft: 'auto' }}>Actual</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={detailOpen} transparent animationType="slide" onRequestClose={() => setDetailOpen(false)}>
        <SafeAreaView style={detailSt.overlay}>
          <View style={[detailSt.detailContent, { backgroundColor: c.background, borderColor: c.border }]}>
            <View style={[detailSt.hdr, { borderBottomColor: c.border, backgroundColor: c.card }]}>
              <Text style={[detailSt.title, { color: c.text }]}>Detalle del Lead</Text>
              <TouchableOpacity onPress={() => setDetailOpen(false)}>
                <X size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
              {/* Contact info */}
              <View style={[detailSt.section, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[detailSt.sectionTitle, { color: c.text }]}>{ticket.contact?.name}</Text>
                <View style={detailSt.row}>
                  <Phone size={13} color={c.textMuted} />
                  <Text style={[detailSt.rowTxt, { color: c.textMuted }]}>+{ticket.contact?.number}</Text>
                </View>
                {ticket.contact?.email ? (
                  <View style={detailSt.row}>
                    <Mail size={13} color={c.textMuted} />
                    <Text style={[detailSt.rowTxt, { color: c.textMuted }]}>{ticket.contact.email}</Text>
                  </View>
                ) : null}
              </View>

              {/* Scheduled Messages Section */}
              <View style={[detailSt.section, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={detailSt.row}>
                  <CalendarClock size={15} color={c.primary} />
                  <Text style={[detailSt.sectionTitle, { color: c.text, marginBottom: 0, marginLeft: spacing.sm }]}>Mensajes Programados</Text>
                </View>
                
                <View style={{ marginTop: spacing.md }}>
                  {schedLoading ? (
                    <ActivityIndicator size="small" color={c.primary} />
                  ) : scheduledMessages.length > 0 ? (
                    scheduledMessages.map((msg: any) => {
                      const sendDate = format(parseISO(msg.sendAt), 'dd/MM/yyyy HH:mm');
                      return (
                        <View key={msg.id} style={[detailSt.scheduledCard, { borderColor: c.border, backgroundColor: c.background }]}>
                          <View style={{ flex: 1, marginRight: spacing.sm }}>
                            <Text style={[detailSt.scheduledText, { color: c.text }]}>{msg.body}</Text>
                            <Text style={[detailSt.scheduledTime, { color: c.textMuted }]}>Envío: {sendDate}</Text>
                          </View>
                          <TouchableOpacity onPress={() => handleDeleteSchedule(msg.id)} style={{ padding: 4 }}>
                            <Trash2 size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={{ color: c.textMuted, fontSize: 12, fontStyle: 'italic' }}>No hay mensajes programados.</Text>
                  )}
                </View>
              </View>

              {/* Tags */}
              <View style={[detailSt.section, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={detailSt.row}>
                  <Tag size={13} color={c.primary} />
                  <Text style={[detailSt.sectionTitle, { color: c.text, marginBottom: 0, marginLeft: spacing.sm }]}>Etiquetas</Text>
                </View>
                <View style={[detailSt.tagsRow, { marginTop: spacing.sm }]}>
                  {ticket.tags && ticket.tags.length > 0 ? ticket.tags.map((tg: any) => (
                    <View key={tg.id} style={[detailSt.tag, { backgroundColor: tg.color }]}>
                      <Text style={detailSt.tagTxt}>{tg.name}</Text>
                    </View>
                  )) : <Text style={{ color: c.textMuted, fontSize: 12 }}>Sin etiquetas</Text>}
                </View>
              </View>

              {/* Extra info */}
              {ticket.contact?.extraInfo && ticket.contact.extraInfo.length > 0 && (
                <View style={[detailSt.section, { backgroundColor: c.card, borderColor: c.border }]}>
                  <Text style={[detailSt.sectionTitle, { color: c.text }]}>Campos Extra</Text>
                  {ticket.contact.extraInfo.map((info: any) => (
                    <View key={info.id} style={[detailSt.extraRow, { borderBottomColor: c.border }]}>
                      <Text style={[detailSt.extraLabel, { color: c.textMuted }]}>{info.name}</Text>
                      <Text style={[detailSt.extraVal, { color: c.text }]}>{info.value}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            
            {/* Action Bar (Go to chat) */}
            <View style={[detailSt.actionFooter, { borderTopColor: c.border, backgroundColor: c.card }]}>
              <TouchableOpacity
                style={[detailSt.chatBtn, { backgroundColor: c.primary }]}
                onPress={() => { setDetailOpen(false); router.push(`/ticket/${ticket.id}`); }}
              >
                <MessageCircle size={18} color="#090D16" />
                <Text style={detailSt.chatBtnTxt}>Ir al Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function buildDetailStyles(c: typeof colors['dark']) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md
    },
    box: {
      width: '95%',
      maxWidth: 340,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      padding: spacing.md
    },
    detailContent: {
      width: '95%',
      maxWidth: 600,
      maxHeight: '85%',
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    hdr: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      borderBottomWidth: 1,
    },
    title: {
      fontSize: 16,
      fontWeight: '700'
    },
    section: {
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      marginBottom: spacing.md
    },
    sectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      marginBottom: spacing.sm
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 4
    },
    rowTxt: {
      fontSize: 13
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm
    },
    tag: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: borderRadius.xs
    },
    tagTxt: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700'
    },
    extraRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 6,
      borderBottomWidth: 1
    },
    extraLabel: {
      fontSize: 12,
      fontWeight: '600'
    },
    extraVal: {
      fontSize: 13
    },
    actionFooter: {
      padding: spacing.md,
      borderTopWidth: 1,
    },
    chatBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: borderRadius.md
    },
    chatBtnTxt: {
      color: '#090D16',
      fontWeight: '700',
      fontSize: 15
    },
    laneItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderBottomWidth: 1
    },
    dot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: spacing.sm
    },
    laneName: {
      fontSize: 14,
      fontWeight: '600'
    },
    // Scheduled Card within Lead details
    scheduledCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      marginBottom: spacing.xs,
    },
    scheduledText: {
      fontSize: 13,
      fontWeight: '500',
    },
    scheduledTime: {
      fontSize: 10,
      marginTop: 2,
    },
  });
}

// --- Main Pipelines Screen ---
export default function PipelinesScreen() {
  const { user, theme } = useAuth();
  const { socket } = useSocket();
  const c = colors[theme];

  const [tags, setTags] = useState<any[]>([]);
  const [allTickets, setAllTickets] = useState<any[]>([]);
  const [selectedLaneIndex, setSelectedLaneIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<number | 'none' | 'all'>('all');
  const [viewMode, setViewMode] = useState<'kanban' | 'excel'>('kanban');

  const isAdmin = user?.profile?.toLowerCase() === 'admin' || user?.profile?.toLowerCase() === 'superadmin';

  const fetchData = useCallback(async () => {
    try {
      const [tagsRes, ticketsRes, queuesRes] = await Promise.all([
        api.get('/tags'),
        api.get('/tickets', {
          params: { status: 'open', showAll: showAll ? 'true' : 'false' },
        }),
        api.get('/queue'),
      ]);
      setTags(tagsRes.data || []);
      setAllTickets(ticketsRes.data?.tickets || []);
      setQueues(queuesRes.data || []);
    } catch (err) {
      console.error('Error fetching pipeline data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showAll]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket listeners for real-time ticket updates
  useEffect(() => {
    if (!socket) return;
    const handleTicket = (data: any) => {
      if (data.action === 'update' || data.action === 'create' || data.action === 'delete') {
        fetchData();
      }
    };
    const handleAppMessage = (data: any) => {
      if (data.action === 'create') {
        fetchData();
      }
    };
    socket.on('ticket', handleTicket);
    socket.on('appMessage', handleAppMessage);
    return () => {
      socket.off('ticket', handleTicket);
      socket.off('appMessage', handleAppMessage);
    };
  }, [socket, fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const activeLane = tags[selectedLaneIndex];
  const laneTickets = allTickets.filter(t => {
    const matchesTag = activeLane ? t.tags?.some((tg: any) => tg.id === activeLane.id) : false;
    if (!matchesTag) return false;

    if (selectedQueueId === 'all') return true;
    if (selectedQueueId === 'none') {
      return !t.queueId && !t.queue;
    }
    return t.queueId === selectedQueueId || t.queue?.id === selectedQueueId;
  });

  const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topHeaderBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
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
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    switchLabel: { fontSize: 11, color: c.textMuted },
    switchBtn: { paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm, backgroundColor: c.border },
    switchBtnActive: { backgroundColor: c.primary },
    switchTxt: { fontSize: 11, fontWeight: '700' },

    // View Mode Switcher
    modeSwitcherBar: {
      backgroundColor: c.card,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    modeSegmentContainer: {
      flexDirection: 'row',
      backgroundColor: theme === 'dark' ? '#1E293B' : '#E2E8F0',
      borderRadius: borderRadius.md,
      padding: 3,
      gap: 3,
    },
    modeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: borderRadius.sm,
      gap: 6,
    },
    modeBtnActive: {
      backgroundColor: c.primary,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 2,
    },
    modeBtnText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
    
    // Queue selector styling
    queueSelector: { maxHeight: 50, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card, paddingVertical: 8 },
    queueScrollContent: { paddingHorizontal: spacing.md, alignItems: 'center', gap: spacing.xs },
    queueTab: { paddingHorizontal: spacing.sm, paddingVertical: 6, borderRadius: borderRadius.md, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    queueTabActive: { backgroundColor: c.primary, borderColor: c.primary },
    queueTabTxt: { fontSize: 12, fontWeight: '600' },

    // Lane selector styling
    laneSelector: { maxHeight: 60, borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card },
    laneScrollContent: { paddingHorizontal: spacing.md, alignItems: 'center', gap: spacing.sm },
    laneTab: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: borderRadius.xl, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
    laneTabActive: { backgroundColor: c.primary, borderColor: c.primary },
    laneTabTxt: { fontSize: 13, fontWeight: '600' },
    laneBadge: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: c.border, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
    laneBadgeActive: { backgroundColor: '#090D16' },
    laneBadgeTxt: { fontSize: 10, fontWeight: '700' },

    // Tickets Scroll
    content: { flex: 1, padding: spacing.md },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl * 2 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: c.textMuted, marginTop: spacing.sm },
    emptySub: { fontSize: 13, color: c.textMuted, textAlign: 'center', marginTop: 4, paddingHorizontal: spacing.xl },
  });

  return (
    <SafeAreaView style={st.container}>
      {/* ── Top Header Bar (App Title + Advisor Badge) ── */}
      <View style={st.topHeaderBar}>
        <View style={st.appBrandRow}>
          <TrendingUp size={20} color={c.primary} />
          <Text style={[st.appBrandText, { color: c.text }]}>Pipelines</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          {isAdmin && (
            <View style={st.switchRow}>
              <Text style={st.switchLabel}>Ver todos</Text>
              <TouchableOpacity 
                style={[st.switchBtn, showAll && st.switchBtnActive]} 
                onPress={() => { setLoading(true); setShowAll(!showAll); }}
              >
                <Text style={[st.switchTxt, { color: showAll ? '#090D16' : c.text }]}>
                  {showAll ? 'SÍ' : 'NO'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Logged in Advisor Badge */}
          <View style={[st.loggedInUserBadge, { backgroundColor: c.card, borderColor: c.border }]}>
            <View style={st.onlineDot} />
            <User2 size={13} color={c.primary} />
            <Text style={[st.loggedInUserName, { color: c.text }]} numberOfLines={1}>
              {user?.name || 'Asesor'}
            </Text>
          </View>
        </View>
      </View>

      {/* ── View Mode Switcher (Kanban vs Excel) ── */}
      <View style={st.modeSwitcherBar}>
        <View style={st.modeSegmentContainer}>
          <TouchableOpacity
            style={[st.modeBtn, viewMode === 'kanban' && st.modeBtnActive]}
            onPress={() => setViewMode('kanban')}
            activeOpacity={0.7}
          >
            <Columns size={15} color={viewMode === 'kanban' ? '#090D16' : c.textMuted} />
            <Text style={[st.modeBtnText, { color: viewMode === 'kanban' ? '#090D16' : c.textMuted }]}>
              Vista Pipelines
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.modeBtn, viewMode === 'excel' && st.modeBtnActive]}
            onPress={() => setViewMode('excel')}
            activeOpacity={0.7}
          >
            <FileSpreadsheet size={15} color={viewMode === 'excel' ? '#090D16' : c.textMuted} />
            <Text style={[st.modeBtnText, { color: viewMode === 'excel' ? '#090D16' : c.textMuted }]}>
              Vista Excel
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <>
          {/* Horizontal Department Filter Selector */}
          <View style={st.queueSelector}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={st.queueScrollContent}
            >
              <TouchableOpacity
                style={[st.queueTab, selectedQueueId === 'all' && st.queueTabActive]}
                onPress={() => setSelectedQueueId('all')}
              >
                <Text style={[st.queueTabTxt, { color: selectedQueueId === 'all' ? '#090D16' : c.text }]}>
                  Todos los deptos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[st.queueTab, selectedQueueId === 'none' && st.queueTabActive]}
                onPress={() => setSelectedQueueId('none')}
              >
                <Text style={[st.queueTabTxt, { color: selectedQueueId === 'none' ? '#090D16' : c.text }]}>
                  Sin depto
                </Text>
              </TouchableOpacity>

              {queues.map((q) => {
                const isActive = selectedQueueId === q.id;
                return (
                  <TouchableOpacity
                    key={q.id}
                    style={[st.queueTab, isActive && { backgroundColor: q.color || c.primary, borderColor: q.color || c.primary }]}
                    onPress={() => setSelectedQueueId(q.id)}
                  >
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isActive ? '#090D16' : (q.color || c.primary) }} />
                    <Text style={[st.queueTabTxt, { color: isActive ? '#090D16' : c.text }]}>
                      {q.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {viewMode === 'excel' ? (
            /* Excel / Spreadsheet Module */
            <ExcelPipelineView
              tickets={allTickets}
              queues={queues}
              tags={tags}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              selectedQueueId={selectedQueueId}
              onSelectQueueId={setSelectedQueueId}
            />
          ) : (
            /* Kanban / Pipelines Module */
            <>
              {/* Horizontal Lane Tab Selector */}
              <View style={st.laneSelector}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={st.laneScrollContent}
                >
                  {tags.map((lane, index) => {
                    const count = allTickets.filter(t => {
                      const matchesTag = t.tags?.some((tg: any) => tg.id === lane.id);
                      if (!matchesTag) return false;
                      if (selectedQueueId === 'all') return true;
                      if (selectedQueueId === 'none') return !t.queueId && !t.queue;
                      return t.queueId === selectedQueueId || t.queue?.id === selectedQueueId;
                    }).length;
                    const isActive = selectedLaneIndex === index;
                    return (
                      <TouchableOpacity
                        key={lane.id}
                        style={[st.laneTab, isActive && st.laneTabActive]}
                        onPress={() => setSelectedLaneIndex(index)}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: lane.color || c.primary }} />
                        <Text style={[st.laneTabTxt, { color: isActive ? '#090D16' : c.text }]}>
                          {lane.name}
                        </Text>
                        <View style={[st.laneBadge, isActive && st.laneBadgeActive]}>
                          <Text style={[st.laneBadgeTxt, { color: isActive ? c.primary : c.text }]}>
                            {count}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Vertical Leads List */}
              <FlatList
                data={laneTickets}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                  <LeadCard 
                    ticket={item} 
                    tag={activeLane} 
                    allTags={tags} 
                    onMoved={fetchData} 
                  />
                )}
                contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xl * 2 }}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[c.primary]} />
                }
                ListEmptyComponent={
                  <View style={st.emptyBox}>
                    <Tag size={40} color={c.textMuted} />
                    <Text style={st.emptyTitle}>Sin leads en esta etapa</Text>
                    <Text style={st.emptySub}>
                      No hay conversaciones asociadas a la etiqueta "{activeLane?.name || ''}"
                    </Text>
                  </View>
                }
              />
            </>
          )}
        </>
      )}
    </SafeAreaView>
  );
}
