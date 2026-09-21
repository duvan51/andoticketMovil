// src/app/ticket/[id].tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, Modal, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { MessageBubble } from '../../components/MessageBubble';
import { MessageInput } from '../../components/MessageInput';
import { ContactAvatar } from '../../components/ContactAvatar';
import { ContactDetailModal } from '../../components/ContactDetailModal';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { ArrowLeft, CheckCircle, UserPlus, X, Tag, Info, History, Mail, Phone, Calendar, User, CalendarClock, Trash2, MoreVertical, UserCheck, ArrowRightLeft, Edit2, Layers, Building2, FileText } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setCurrentActiveTicketId } from '../../services/notifications';

// Helper to format trackings durations
const formatDuration = (startStr: string, endStr: string) => {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const diffMs = end.getTime() - start.getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1) return 'menos de 1 min';
  if (diffMins < 60) return `${diffMins} min`;
  const diffHours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  return `${diffHours}h ${remMins}m`;
};

// Helper to construct timeline items
const getTimelineItems = (ticketData: any) => {
  const items: any[] = [];
  const seenIds = new Set<string>();

  if (ticketData?.trackings) {
    ticketData.trackings.forEach((t: any) => {
      const trackingKey = `tracking-${t.id}`;
      if (!seenIds.has(trackingKey)) {
        seenIds.add(trackingKey);
        items.push({
          type: 'tracking',
          id: trackingKey,
          createdAt: t.createdAt,
          finishedAt: t.finishedAt,
          userId: t.userId,
          user: t.user,
        });
      }
    });
  }

  if (ticketData?.messages) {
    ticketData.messages.forEach((m: any) => {
      if (m.mediaType === 'note' || m.isPrivate || m.isNote) {
        const noteKey = `note-${m.id}`;
        if (!seenIds.has(noteKey)) {
          seenIds.add(noteKey);
          items.push({
            type: 'note',
            id: noteKey,
            createdAt: m.createdAt,
            body: m.body || (m.mediaType === 'image' ? '[Imagen]' : m.mediaType === 'audio' ? '[Audio]' : '[Archivo]'),
          });
        }
      } else if (m.mediaType === 'tag') {
        const tagKey = `tag-${m.id}`;
        if (!seenIds.has(tagKey)) {
          seenIds.add(tagKey);
          items.push({
            type: 'tag',
            id: tagKey,
            createdAt: m.createdAt,
            body: m.body,
          });
        }
      } else if (m.mediaType === 'schedule_history') {
        const schedKey = `schedule-${m.id}`;
        if (!seenIds.has(schedKey)) {
          seenIds.add(schedKey);
          items.push({
            type: 'schedule_history',
            id: schedKey,
            createdAt: m.createdAt,
            body: m.body,
          });
        }
      }
    });
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const WebDatePicker = ({ value, onChange, themeColors }: any) => {
  if (Platform.OS !== 'web') return null;
  return React.createElement('input', {
    type: 'date',
    value: value,
    onChange: (e: any) => onChange(e.target.value),
    style: {
      backgroundColor: themeColors.background,
      color: themeColors.text,
      border: `1px solid ${themeColors.border}`,
      padding: '10px 12px',
      borderRadius: '6px',
      width: '100%',
      boxSizing: 'border-box',
      marginBottom: '12px',
      fontSize: '14px',
      outline: 'none',
      colorScheme: themeColors.theme === 'dark' ? 'dark' : 'light',
    }
  });
};

const WebTimePicker = ({ value, onChange, themeColors }: any) => {
  if (Platform.OS !== 'web') return null;
  return React.createElement('input', {
    type: 'time',
    value: value,
    onChange: (e: any) => onChange(e.target.value),
    style: {
      backgroundColor: themeColors.background,
      color: themeColors.text,
      border: `1px solid ${themeColors.border}`,
      padding: '10px 12px',
      borderRadius: '6px',
      width: '100%',
      boxSizing: 'border-box',
      marginBottom: '12px',
      fontSize: '14px',
      outline: 'none',
      colorScheme: themeColors.theme === 'dark' ? 'dark' : 'light',
    }
  });
};

export default function TicketChatScreen() {
  const { id: ticketId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, theme } = useAuth();
  const { socket } = useSocket();
  const c = colors[theme];

  const [ticket, setTicket] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Contact Details Modal state
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<any[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [tagModalOpen, setTagModalOpen] = useState(false);

  // Edit Contact state
  const [editContactModalOpen, setEditContactModalOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [savingContact, setSavingContact] = useState(false);
  const [queues, setQueues] = useState<any[]>([]);
  const [editQueueId, setEditQueueId] = useState<number | null>(null);

  const fetchQueues = async () => {
    try {
      const { data } = await api.get('/queue');
      setQueues(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching queues in ticket screen:', err);
    }
  };

  // Scheduled Messages state
  const [scheduledMessages, setScheduledMessages] = useState<any[]>([]);
  const [schedModalOpen, setSchedModalOpen] = useState(false);
  const [schedBody, setSchedBody] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');

  // Options menu & Transfer state
  const [optionsMenuOpen, setOptionsMenuOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferUsers, setTransferUsers] = useState<any[]>([]);
  const [loadingTransferUsers, setLoadingTransferUsers] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferTab, setTransferTab] = useState<'users' | 'queues'>('users');

  // Fetch ticket details
  const fetchTicketDetails = async () => {
    try {
      const { data } = await api.get(`/tickets/${ticketId}`);
      setTicket(data);
      setContact(data.contact);
    } catch (err) {
      console.error('Error fetching ticket details:', err);
      Alert.alert('Error', 'No se pudo cargar la información del ticket.');
    }
  };

  const handleOpenEditContactModal = () => {
    if (!contact) return;
    setEditName(contact.name || '');
    setEditPhone(contact.number || '');
    setEditEmail(contact.email || '');
    setEditQueueId(ticket?.queueId || ticket?.queue?.id || null);
    fetchQueues();
    setEditContactModalOpen(true);
  };

  const handleSaveContactEdit = async () => {
    if (!editName.trim()) {
      Alert.alert('Falta nombre', 'Por favor, ingrese el nombre del contacto.');
      return;
    }
    if (!editPhone.trim()) {
      Alert.alert('Falta teléfono', 'Por favor, ingrese el número de teléfono.');
      return;
    }
    try {
      setSavingContact(true);
      const payload = {
        name: editName.trim(),
        number: editPhone.trim().replace(/[^0-9]/g, ''),
        email: editEmail.trim() || undefined,
        extraInfo: contact?.extraInfo || [],
      };
      await api.put(`/contacts/${contact.id}`, payload);
      
      await api.put(`/tickets/${ticketId}`, {
        queueId: editQueueId,
      });

      setEditContactModalOpen(false);
      Alert.alert('Éxito', 'Contacto y departamento actualizados correctamente.');
      fetchTicketDetails();
    } catch (error: any) {
      console.error('Error saving contact in ticket screen:', error);
      const msg = error?.response?.data?.error || 'No se pudo actualizar el contacto.';
      Alert.alert('Error', msg);
    } finally {
      setSavingContact(false);
    }
  };

  useEffect(() => {
    fetchTicketDetails();
    fetchQueues();
    setCurrentActiveTicketId(ticketId as string);
    return () => {
      setCurrentActiveTicketId(null);
    };
  }, [ticketId]);

  // Fetch messages
  const fetchMessages = async (pageNum: number) => {
    if (pageNum === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const { data } = await api.get(`/messages/${ticketId}`, {
        params: { pageNumber: pageNum },
      });

      if (data && data.messages) {
        const reversedMessages = [...data.messages].reverse();

        if (pageNum === 1) {
          setMessages(reversedMessages);
        } else {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const newMessages = reversedMessages.filter((m) => !existingIds.has(m.id));
            return [...prev, ...newMessages];
          });
        }
        setHasMore(data.hasMore);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchMessages(1);
  }, [ticketId]);

  // Sockets
  useEffect(() => {
    if (!socket || !ticketId) return;

    socket.emit('joinChatBox', ticketId);

    socket.on('ticket', (data: any) => {
      if (data.action === 'update' && data.ticket.id === parseInt(ticketId, 10)) {
        setTicket((prev: any) => {
          if (!prev) return data.ticket;
          return {
            ...data.ticket,
            contact: data.ticket.contact ? {
              ...prev.contact,
              ...data.ticket.contact,
              profilePicUrl: data.ticket.contact.profilePicUrl || prev.contact?.profilePicUrl,
            } : prev.contact
          };
        });
        if (data.ticket.contact) {
          setContact((prev: any) => {
            return {
              ...prev,
              ...data.ticket.contact,
              profilePicUrl: data.ticket.contact.profilePicUrl || prev?.profilePicUrl,
            };
          });
        }
      }
    });

    socket.on('contact', (data: any) => {
      if (data.action === 'update') {
        setContact((prev: any) => {
          if (prev && data.contact.id === prev.id) {
            return {
              ...prev,
              ...data.contact,
              profilePicUrl: data.contact.profilePicUrl || prev.profilePicUrl,
            };
          }
          return prev;
        });
      }
    });

    socket.on('appMessage', (data: any) => {
      const { action, message, messageId } = data;
      if (message && message.ticketId === parseInt(ticketId, 10)) {
        if (action === 'create') {
          setMessages((prev) => {
            if (prev.some((m) => m.id === message.id)) {
              return prev;
            }
            return [message, ...prev];
          });
        } else if (action === 'update') {
          setMessages((prev) => {
            return prev.map((m) => (m.id === message.id ? { ...m, ...message } : m));
          });
        }
      }

      if (action === 'delete' && messageId) {
        setMessages((prev) => {
          return prev.map((m) => (String(m.id) === String(messageId) ? { ...m, isDeleted: true } : m));
        });
      }
    });

    return () => {
      socket.off('ticket');
      socket.off('contact');
      socket.off('appMessage');
    };
  }, [socket, ticketId, ticket?.contactId]);

  // Fetch all system tags when contact detail modal is opened
  const fetchSystemTags = async () => {
    try {
      setLoadingTags(true);
      const { data } = await api.get('/tags');
      setAllTags(data || []);
      setSelectedTags(ticket?.tags || []);
    } catch (err) {
      console.error('Error fetching system tags:', err);
    } finally {
      setLoadingTags(false);
    }
  };

  // Fetch scheduled messages for this contact
  const fetchScheduledMessages = async () => {
    if (!contact?.id) return;
    try {
      const { data } = await api.get('/scheduled-messages', {
        params: { contactId: contact.id }
      });
      setScheduledMessages(data || []);
    } catch (err) {
      console.error('Error fetching scheduled messages:', err);
    }
  };

  const handleCreateSchedule = async () => {
    if (!schedBody.trim()) {
      Alert.alert('Error', 'Por favor ingresa el contenido del mensaje.');
      return;
    }
    if (!schedDate || !schedTime) {
      Alert.alert('Error', 'Por favor selecciona la fecha y hora de envío.');
      return;
    }

    try {
      const sendAt = `${schedDate}T${schedTime}:00`;
      if (new Date(sendAt).getTime() <= Date.now()) {
        Alert.alert('Error', 'La fecha y hora de envío debe ser en el futuro.');
        return;
      }

      setActionLoading(true);
      await api.post('/scheduled-messages', {
        body: schedBody.trim(),
        sendAt,
        contactId: contact.id,
        ticketId: Number(ticketId),
      });

      Alert.alert('Éxito', 'Mensaje programado correctamente.');
      setSchedBody('');
      setSchedDate('');
      setSchedTime('');
      setSchedModalOpen(false);
      fetchScheduledMessages();
    } catch (err) {
      console.error('Error creating scheduled message:', err);
      Alert.alert('Error', 'No se pudo programar el mensaje.');
    } finally {
      setActionLoading(false);
    }
  };

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
              console.error('Error deleting scheduled message:', err);
              Alert.alert('Error', 'No se pudo eliminar el mensaje programado.');
            }
          }
        }
      ]
    );
  };

  // Date/Time Shortcuts
  const setShortcutInOneHour = () => {
    const later = new Date();
    later.setHours(later.getHours() + 1);
    setSchedDate(later.toISOString().split('T')[0]);
    setSchedTime(later.toTimeString().split(' ')[0].substring(0, 5));
  };

  const setShortcutTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSchedDate(tomorrow.toISOString().split('T')[0]);
    setSchedTime(tomorrow.toTimeString().split(' ')[0].substring(0, 5));
  };

  const setShortcut24Hours = () => {
    const later = new Date();
    later.setHours(later.getHours() + 24);
    setSchedDate(later.toISOString().split('T')[0]);
    setSchedTime(later.toTimeString().split(' ')[0].substring(0, 5));
  };

  const setShortcutMonday9AM = () => {
    const now = new Date();
    const resultDate = new Date();
    resultDate.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    resultDate.setHours(9, 0, 0, 0);
    setSchedDate(resultDate.toISOString().split('T')[0]);
    setSchedTime('09:00');
  };

  const getNext7Days = () => {
    const days = [];
    const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      let label = '';
      if (i === 0) label = 'Hoy';
      else if (i === 1) label = 'Mañana';
      else {
        label = `${weekdayNames[d.getDay()]} ${d.getDate()}`;
      }
      days.push({ dateStr, label });
    }
    return days;
  };

  const commonTimes = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

  useEffect(() => {
    if (contactModalOpen && ticket) {
      fetchSystemTags();
      fetchScheduledMessages();
    }
  }, [contactModalOpen, ticket, contact?.id]);

  // Prefill default preview date/time (tomorrow at current hour) when modal opens
  useEffect(() => {
    if (schedModalOpen) {
      if (!schedDate && !schedTime) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setSchedDate(tomorrow.toISOString().split('T')[0]);
        
        const now = new Date();
        setSchedTime(now.toTimeString().split(' ')[0].substring(0, 5));
      }
    }
  }, [schedModalOpen]);

  // Toggle tag selection
  const handleToggleTag = (tag: any) => {
    const exists = selectedTags.some((t) => t.id === tag.id);
    if (exists) {
      setSelectedTags(selectedTags.filter((t) => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Sync tags with backend
  const handleSaveTags = async () => {
    try {
      setLoadingTags(true);
      await api.post(`/tags/sync/${ticketId}`, { tags: selectedTags });
      setTicket((prev: any) => ({ ...prev, tags: selectedTags }));
      setTagModalOpen(false);
      Alert.alert('Éxito', 'Etiquetas actualizadas correctamente.');
    } catch (err) {
      console.error('Error syncing tags:', err);
      Alert.alert('Error', 'No se pudieron actualizar las etiquetas.');
    } finally {
      setLoadingTags(false);
    }
  };

  const loadMoreMessages = () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMessages(nextPage);
  };

  const handleAcceptTicket = async () => {
    try {
      setActionLoading(true);
      await api.put(`/tickets/${ticketId}`, {
        status: 'open',
        userId: user?.id,
      });
      setTicket((prev: any) => ({
        ...prev,
        status: 'open',
        userId: user?.id,
        user: user ? { id: user.id, name: user.name } : prev?.user,
      }));
      Alert.alert('Éxito', 'Ticket aceptado exitosamente.');
    } catch (err) {
      console.error('Error accepting ticket:', err);
      Alert.alert('Error', 'No se pudo aceptar el ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveTicket = async () => {
    setOptionsMenuOpen(false);
    try {
      setActionLoading(true);
      await api.put(`/tickets/${ticketId}`, {
        status: 'closed',
        userId: ticket.userId || user?.id,
      });
      Alert.alert('Éxito', 'Ticket resuelto/cerrado exitosamente.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Error resolving ticket:', err);
      Alert.alert('Error', 'No se pudo resolver el ticket.');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchTransferUsers = async () => {
    try {
      setLoadingTransferUsers(true);
      const { data } = await api.get('/users');
      const users = (data?.users || []).filter((u: any) => u.id !== user?.id);
      setTransferUsers(users);
    } catch (err) {
      console.error('Error fetching users for transfer:', err);
    } finally {
      setLoadingTransferUsers(false);
    }
  };

  const handleTransferTicket = async (targetUserId?: number | null, targetQueueId?: number | null) => {
    try {
      setTransferring(true);
      const payload: any = { status: 'open' };
      if (targetUserId !== undefined) payload.userId = targetUserId;
      if (targetQueueId !== undefined) payload.queueId = targetQueueId;

      await api.put(`/tickets/${ticketId}`, payload);
      setTransferModalOpen(false);
      Alert.alert('Éxito', 'Ticket transferido exitosamente.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err) {
      console.error('Error transferring ticket:', err);
      Alert.alert('Error', 'No se pudo transferir el ticket.');
    } finally {
      setTransferring(false);
    }
  };

  const openTransferModal = () => {
    setOptionsMenuOpen(false);
    fetchTransferUsers();
    fetchQueues();
    setTransferModalOpen(true);
  };

  const renderFooterLoader = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator color={c.primary} size="small" />
      </View>
    );
  };

  const insets = useSafeAreaInsets();
  const timelineItems = ticket ? getTimelineItems(ticket) : [];
  const styles = buildStyles(c, insets);

  const assignedUserName =
    ticket?.user?.name ||
    ticket?.userName ||
    (user && ticket?.userId && String(ticket?.userId) === String(user.id) ? user.name : null) ||
    'Sin asignar';

  const departmentName = ticket?.queue?.name || 'Sin departamento';
  const departmentColor = ticket?.queue?.color || c.primary;

  const allMessagesList = messages.length > 0 ? messages : (ticket?.messages || []);
  const internalNotes = allMessagesList.filter((m: any) => m.mediaType === 'note' || m.isPrivate || m.isNote);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color={c.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.contactInfo}
          onPress={() => setContactModalOpen(true)}
          activeOpacity={0.7}
        >
          <ContactAvatar
            contact={contact}
            size={38}
            backgroundColor={c.primaryLight}
            textColor={c.primary}
            style={styles.headerAvatar}
          />
          <View style={styles.contactTextCol}>
            <Text style={styles.contactName} numberOfLines={1}>
              {contact?.name || 'Cargando...'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.contactNumber} numberOfLines={1}>
                {contact?.number ? `+${contact.number}` : ''}
              </Text>
              {ticket?.queue && (
                <View style={[styles.headerQueueBadge, { borderColor: ticket.queue.color || c.primary }]}>
                  <Text style={[styles.headerQueueText, { color: ticket.queue.color || c.primary }]} numberOfLines={1}>
                    {ticket.queue.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Header Actions */}
        {ticket && (
          <View style={styles.headerActions}>
            {ticket.status === 'pending' ? (
              <TouchableOpacity
                style={[styles.headerActionButton, styles.acceptButton]}
                onPress={handleAcceptTicket}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#090D16" />
                ) : (
                  <>
                    <UserPlus size={16} color="#090D16" />
                    <Text style={styles.acceptButtonText}>Aceptar</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : ticket.status === 'open' ? (
              <View style={{ position: 'relative' }}>
                <TouchableOpacity
                  style={[styles.headerActionButton, { backgroundColor: c.card, borderWidth: 1, borderColor: c.border, paddingHorizontal: 10 }]}
                  onPress={() => setOptionsMenuOpen(o => !o)}
                  activeOpacity={0.7}
                >
                  <MoreVertical size={20} color={c.text} />
                </TouchableOpacity>

                {/* Dropdown Menu */}
                {optionsMenuOpen && (
                  <View style={styles.optionsDropdown}>
                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={handleResolveTicket}
                      activeOpacity={0.7}
                    >
                      <CheckCircle size={16} color={c.primary} />
                      <Text style={[styles.optionText, { color: c.text }]}>Resolver</Text>
                    </TouchableOpacity>

                    <View style={[styles.optionDivider, { backgroundColor: c.border }]} />

                    <TouchableOpacity
                      style={styles.optionItem}
                      onPress={openTransferModal}
                      activeOpacity={0.7}
                    >
                      <ArrowRightLeft size={16} color={c.primary} />
                      <Text style={[styles.optionText, { color: c.text }]}>Transferir</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.keyboardView}
      >
        {/* Messages Inverted List */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => <MessageBubble message={item} />}
            inverted
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.1}
            ListFooterComponent={renderFooterLoader}
            contentContainerStyle={styles.listContent}
          />
        )}

        {/* Pending Overlay */}
        {ticket && ticket.status === 'pending' && (
          <View style={styles.pendingOverlay}>
            <Text style={styles.pendingText}>Acepta el ticket para comenzar a chatear</Text>
            <TouchableOpacity
              style={styles.pendingOverlayButton}
              onPress={handleAcceptTicket}
              disabled={actionLoading}
            >
              <Text style={styles.pendingOverlayButtonText}>Aceptar Ticket</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Input Bar */}
        {ticket && ticket.status !== 'pending' && (
          <MessageInput ticketId={ticketId} contactId={ticket.contactId} />
        )}
      </KeyboardAvoidingView>

      {/* Contact Details & History Modal */}
      <ContactDetailModal
        visible={contactModalOpen}
        contact={contact}
        ticket={ticket}
        messages={allMessagesList}
        onClose={() => setContactModalOpen(false)}
        onEditContact={handleOpenEditContactModal}
        onManageTags={() => setTagModalOpen(true)}
        onScheduleMessage={() => setSchedModalOpen(true)}
        onDeleteSchedule={handleDeleteSchedule}
        scheduledMessages={scheduledMessages}
        timelineItems={timelineItems}
      />

      {/* Manage Tags Sub-Modal */}
      <Modal visible={tagModalOpen} transparent animationType="fade">
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gestionar Etiquetas</Text>
              <TouchableOpacity onPress={() => setTagModalOpen(false)}>
                <X size={20} color={c.text} />
              </TouchableOpacity>
            </View>

            {loadingTags ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: spacing.xl }} />
            ) : (
              <ScrollView style={styles.tagsSelectScroll} contentContainerStyle={styles.tagsGrid}>
                {allTags.map((tag) => {
                  const isSelected = selectedTags.some((t) => t.id === tag.id);
                  return (
                    <TouchableOpacity
                      key={tag.id}
                      style={[
                        styles.tagSelectChip,
                        {
                          backgroundColor: isSelected ? tag.color || c.primary : 'transparent',
                          borderColor: tag.color || c.primary,
                        },
                      ]}
                      onPress={() => handleToggleTag(tag)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.tagSelectChipText,
                          { color: isSelected ? '#FFFFFF' : tag.color || c.primary },
                        ]}
                      >
                        {tag.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.subModalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTagModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveTags} disabled={loadingTags}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── SCHEDULE MESSAGE MODAL ── */}
      <Modal visible={schedModalOpen} transparent animationType="fade" onRequestClose={() => setSchedModalOpen(false)}>
        <View style={styles.subModalOverlay}>
          <View style={styles.subModalContent}>
            <Text style={styles.modalTitle}>Programar Mensaje</Text>
            
            <TextInput
              style={[styles.scheduledInput, { color: c.text, borderColor: c.border }]}
              placeholder="Escribe el mensaje a programar..."
              placeholderTextColor={c.textMuted}
              value={schedBody}
              onChangeText={setSchedBody}
              multiline
              numberOfLines={4}
            />

            {/* Selected Summary Info */}
            <View style={styles.selectedScheduleSummary}>
              <Text style={styles.selectedScheduleSummaryTitle}>Envío Programado (Formato 24h):</Text>
              <Text style={styles.selectedScheduleSummaryText}>
                {schedDate && schedTime 
                  ? `${schedDate} a las ${schedTime}` 
                  : 'Ninguno - Selecciona abajo'}
              </Text>
            </View>

            {Platform.OS === 'web' ? (
              <View style={{ marginVertical: spacing.sm }}>
                <Text style={styles.pickerLabel}>Fecha de Envío:</Text>
                <WebDatePicker value={schedDate} onChange={setSchedDate} themeColors={c} />
                <Text style={styles.pickerLabel}>Hora de Envío (24h):</Text>
                <WebTimePicker value={schedTime} onChange={setSchedTime} themeColors={c} />
              </View>
            ) : (
              <View style={{ marginVertical: spacing.sm }}>
                {/* Mobile Days Selector (Horizontal pills) */}
                <Text style={styles.pickerLabel}>Seleccionar Día:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScrollView}>
                  {getNext7Days().map((day) => {
                    const isSelected = schedDate === day.dateStr;
                    return (
                      <TouchableOpacity
                        key={day.dateStr}
                        onPress={() => setSchedDate(day.dateStr)}
                        style={[styles.pillBtn, isSelected && styles.activePillBtn]}
                      >
                        <Text style={[styles.pillBtnText, { color: isSelected ? '#090D16' : c.text }]}>
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Mobile Hours Selector (Horizontal pills) */}
                <Text style={styles.pickerLabel}>Seleccionar Hora:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillsScrollView}>
                  {commonTimes.map((time) => {
                    const isSelected = schedTime === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        onPress={() => setSchedTime(time)}
                        style={[styles.pillBtn, isSelected && styles.activePillBtn]}
                      >
                        <Text style={[styles.pillBtnText, { color: isSelected ? '#090D16' : c.text }]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Fallback inputs for exact typing if needed */}
                <Text style={[styles.pickerLabel, { marginTop: spacing.md, fontSize: 11, opacity: 0.7 }]}>
                  O ingresa manualmente:
                </Text>
                <View style={styles.manualInputRow}>
                  <TextInput
                    style={[styles.manualInput, { color: c.text, borderColor: c.border }]}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={c.textMuted}
                    value={schedDate}
                    onChangeText={setSchedDate}
                  />
                  <TextInput
                    style={[styles.manualInput, { color: c.text, borderColor: c.border }]}
                    placeholder="HH:MM"
                    placeholderTextColor={c.textMuted}
                    value={schedTime}
                    onChangeText={setSchedTime}
                  />
                </View>
              </View>
            )}

            {/* Shortcut Buttons */}
            <Text style={styles.pickerLabel}>Atajos de Tiempo:</Text>
            <View style={styles.shortcutRow}>
              <TouchableOpacity onPress={setShortcutInOneHour} style={styles.shortcutBtn}>
                <Text style={styles.shortcutBtnText}>+1 hora</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={setShortcutTomorrow} style={styles.shortcutBtn}>
                <Text style={styles.shortcutBtnText}>Mañana</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={setShortcut24Hours} style={styles.shortcutBtn}>
                <Text style={styles.shortcutBtnText}>+24 horas</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={setShortcutMonday9AM} style={styles.shortcutBtn}>
                <Text style={styles.shortcutBtnText}>Lunes 9AM</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.subModalActions}>
              <TouchableOpacity onPress={() => { setSchedModalOpen(false); setSchedBody(''); }} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleCreateSchedule} 
                style={styles.saveBtn}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator size="small" color="#090D16" />
                ) : (
                  <Text style={styles.saveBtnText}>Guardar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── TRANSFER TICKET MODAL ── */}
      <Modal visible={transferModalOpen} transparent animationType="slide">
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transferir a...</Text>
              <TouchableOpacity onPress={() => setTransferModalOpen(false)} style={styles.closeBtn}>
                <X size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.border, paddingHorizontal: spacing.md }}>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: transferTab === 'users' ? 2 : 0, borderBottomColor: c.primary }}
                onPress={() => setTransferTab('users')}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: transferTab === 'users' ? c.primary : c.textMuted }}>Agentes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: transferTab === 'queues' ? 2 : 0, borderBottomColor: c.primary }}
                onPress={() => setTransferTab('queues')}
              >
                <Text style={{ fontSize: 14, fontWeight: '600', color: transferTab === 'queues' ? c.primary : c.textMuted }}>Departamentos</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing.md }}>
              {transferTab === 'users' ? (
                loadingTransferUsers ? (
                  <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={c.primary} />
                    <Text style={{ color: c.textMuted, marginTop: spacing.sm }}>Cargando usuarios...</Text>
                  </View>
                ) : transferUsers.length === 0 ? (
                  <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
                    <User size={48} color={c.border} />
                    <Text style={{ color: c.textMuted, marginTop: spacing.sm, fontSize: 14 }}>No hay otros usuarios disponibles.</Text>
                  </View>
                ) : (
                  transferUsers.map(u => (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.transferUserRow, { backgroundColor: c.card, borderColor: c.border }]}
                      onPress={() => handleTransferTicket(u.id, null)}
                      activeOpacity={0.7}
                      disabled={transferring}
                    >
                      <View style={[styles.transferAvatar, { backgroundColor: c.primary + '22' }]}>
                        <Text style={[styles.transferAvatarTxt, { color: c.primary }]}>
                          {u.name?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.transferUserName, { color: c.text }]}>{u.name}</Text>
                        <Text style={[styles.transferUserEmail, { color: c.textMuted }]}>{u.email}</Text>
                      </View>
                      {transferring ? (
                        <ActivityIndicator size="small" color={c.primary} />
                      ) : (
                        <ArrowRightLeft size={18} color={c.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                )
              ) : (
                queues.length === 0 ? (
                  <View style={{ paddingVertical: spacing.xl, alignItems: 'center' }}>
                    <Layers size={48} color={c.border} />
                    <Text style={{ color: c.textMuted, marginTop: spacing.sm, fontSize: 14 }}>No hay departamentos disponibles.</Text>
                  </View>
                ) : (
                  queues.map(q => (
                    <TouchableOpacity
                      key={q.id}
                      style={[styles.transferUserRow, { backgroundColor: c.card, borderColor: c.border }]}
                      onPress={() => handleTransferTicket(null, q.id)}
                      activeOpacity={0.7}
                      disabled={transferring}
                    >
                      <View style={[styles.transferAvatar, { backgroundColor: (q.color || c.primary) + '22' }]}>
                        <Text style={[styles.transferAvatarTxt, { color: q.color || c.primary }]}>
                          {q.name?.charAt(0)?.toUpperCase() || 'D'}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.transferUserName, { color: c.text }]}>{q.name}</Text>
                        <Text style={[styles.transferUserEmail, { color: c.textMuted }]}>Departamento / Cola</Text>
                      </View>
                      {transferring ? (
                        <ActivityIndicator size="small" color={c.primary} />
                      ) : (
                        <ArrowRightLeft size={18} color={c.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                )
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── EDIT CONTACT DETAILS MODAL ── */}
      <Modal visible={editContactModalOpen} transparent animationType="slide">
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background, borderColor: c.border }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Editar Contacto</Text>
              <TouchableOpacity onPress={() => setEditContactModalOpen(false)}>
                <X size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              {/* Full Name */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nombre completo *</Text>
                <View style={styles.inputWrapper}>
                  <User size={16} color={c.textMuted} />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej. Juan Pérez"
                    placeholderTextColor={c.textMuted}
                    value={editName}
                    onChangeText={setEditName}
                  />
                </View>
              </View>

              {/* Phone Number */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Teléfono (Completo con prefijo) *</Text>
                <View style={styles.inputWrapper}>
                  <Phone size={16} color={c.textMuted} />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej. 573001234567"
                    placeholderTextColor={c.textMuted}
                    keyboardType="phone-pad"
                    value={editPhone}
                    onChangeText={setEditPhone}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Correo electrónico</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={16} color={c.textMuted} />
                  <TextInput
                    style={styles.formInput}
                    placeholder="Ej. correo@dominio.com"
                    placeholderTextColor={c.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={editEmail}
                    onChangeText={setEditEmail}
                  />
                </View>
              </View>

              {/* Department (Queue) */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Departamento</Text>
                <View style={{ gap: spacing.sm, flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                  <TouchableOpacity
                    style={[
                      styles.queueSelectOption,
                      !editQueueId && { backgroundColor: c.border },
                      { borderColor: c.border }
                    ]}
                    onPress={() => setEditQueueId(null)}
                  >
                    <Text style={[styles.queueSelectOptionText, { color: !editQueueId ? (theme === 'light' ? '#0F172A' : '#FFFFFF') : c.text }]}>
                      Sin departamento
                    </Text>
                  </TouchableOpacity>
                  {queues.map((q) => {
                    const isSelected = editQueueId === q.id;
                    return (
                      <TouchableOpacity
                        key={q.id}
                        style={[
                          styles.queueSelectOption,
                          { borderColor: q.color || c.primary },
                          isSelected && { backgroundColor: q.color || c.primary }
                        ]}
                        onPress={() => setEditQueueId(q.id)}
                      >
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isSelected ? '#090D16' : (q.color || c.primary) }} />
                        <Text style={[styles.queueSelectOptionText, { color: isSelected ? '#090D16' : c.text }]}>
                          {q.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Actions */}
              <View style={styles.modalFormActions}>
                <TouchableOpacity 
                  onPress={() => setEditContactModalOpen(false)} 
                  style={styles.contactCancelBtn}
                  disabled={savingContact}
                >
                  <Text style={styles.contactCancelBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={handleSaveContactEdit} 
                  style={styles.contactSaveBtn}
                  disabled={savingContact}
                >
                  {savingContact ? (
                    <ActivityIndicator size="small" color="#090D16" />
                  ) : (
                    <Text style={styles.contactSaveBtnText}>Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function buildStyles(c: typeof colors['dark'], insets: any) {
  const headerHeight = 60 + (Platform.OS !== 'web' ? insets.top : 0);
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: c.background,
    },
    header: {
      height: headerHeight,
      backgroundColor: c.card,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: Platform.OS !== 'web' ? insets.top : 0,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      zIndex: 100,
    },
    backButton: {
      marginRight: spacing.sm,
      padding: spacing.xs,
    },
    contactInfo: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerAvatar: {
      marginRight: spacing.sm,
    },
    contactTextCol: {
      flex: 1,
      minWidth: 0,
    },
    contactName: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
    },
    contactNumber: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 2,
    },
    headerQueueBadge: {
      borderWidth: 1,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    headerQueueText: {
      fontSize: 9,
      fontWeight: '700',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      borderRadius: borderRadius.sm,
    },
    acceptButton: {
      backgroundColor: c.primary,
    },
    acceptButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#090D16',
    },
    resolveButton: {
      backgroundColor: c.pending,
    },
    resolveButtonText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    keyboardView: {
      flex: 1,
    },
    listContent: {
      padding: spacing.md,
    },
    footerLoader: {
      paddingVertical: spacing.md,
      alignItems: 'center',
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    pendingOverlay: {
      backgroundColor: c.background + 'EE',
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg + (insets.bottom > 0 ? insets.bottom : spacing.sm),
      alignItems: 'center',
      justifyContent: 'center',
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    pendingText: {
      color: c.text,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: spacing.md,
    },
    pendingOverlayButton: {
      backgroundColor: c.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: 12,
      borderRadius: borderRadius.md,
    },
    pendingOverlayButtonText: {
      color: '#090D16',
      fontWeight: '700',
      fontSize: 14,
    },
  
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'flex-end',
      paddingTop: Platform.OS !== 'web' ? insets.top : 0,
    },
    modalContent: {
      flex: 1,
      backgroundColor: c.background,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.card,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
    },
    closeBtn: {
      padding: 4,
    },
    modalScroll: {
      flex: 1,
    },
    modalScrollContent: {
      padding: spacing.md,
    },
  
    // Contact card style
    contactCard: {
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: spacing.md,
    },
    modalAvatar: {
      marginBottom: spacing.md,
    },
    contactCardName: {
      fontSize: 20,
      fontWeight: '700',
      color: c.text,
      marginBottom: spacing.xs,
      textAlign: 'center',
    },
    contactCardDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    contactCardDetailText: {
      fontSize: 14,
      color: c.textMuted,
    },
  
    // Detail Sections
    detailsSection: {
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: spacing.md,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    sectionTitleIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    detailsSectionTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
    },
    manageTagsLink: {
      fontSize: 13,
      fontWeight: '700',
      color: c.primary,
    },
    noDataText: {
      fontSize: 13,
      color: c.textMuted,
      fontStyle: 'italic',
    },

    // Assignment Badges
    assignmentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
    },
    assignmentBadgeText: {
      fontSize: 13,
      fontWeight: '600',
    },

    // Internal Notes Card
    notesContainer: {
      gap: spacing.sm,
    },
    noteCard: {
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderLeftWidth: 4,
    },
    noteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    noteAuthor: {
      fontSize: 12,
      fontWeight: '700',
    },
    noteDate: {
      fontSize: 11,
    },
    noteBody: {
      fontSize: 13,
      lineHeight: 18,
    },
  
    // Tags Chips
    tagsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    tagChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
    },
    tagChipText: {
      color: '#FFFFFF',
      fontSize: 12,
      fontWeight: '700',
    },
  
    // Extra info container
    extraInfoContainer: {
      gap: spacing.sm,
    },
    extraInfoCard: {
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    extraInfoLabel: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    extraInfoValue: {
      fontSize: 14,
      color: c.text,
      marginTop: 2,
      fontWeight: '500',
    },
  
    // Timeline UI styling
    timelineContainer: {
      paddingLeft: spacing.xs,
    },
    timelineItem: {
      flexDirection: 'row',
      minHeight: 50,
    },
    timelineLeft: {
      alignItems: 'center',
      width: 30,
    },
    timelineDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      zIndex: 2,
      marginTop: 4,
    },
    timelineConnector: {
      width: 2,
      backgroundColor: c.border,
      flex: 1,
      marginVertical: 2,
    },
    timelineRight: {
      flex: 1,
      paddingLeft: spacing.sm,
      paddingBottom: spacing.md,
    },
    timelineContentText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.text,
    },
    timelineDateText: {
      fontSize: 10,
      color: c.textMuted,
      marginTop: 2,
    },
  
    // Sub-modal styling (Manage Tags)
    subModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
    },
    subModalContent: {
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: borderRadius.lg,
      width: '100%',
      maxWidth: 320,
      padding: spacing.md,
    },
    tagsSelectScroll: {
      maxHeight: 250,
      marginVertical: spacing.md,
    },
    tagsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    tagSelectChip: {
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
    },
    tagSelectChipText: {
      fontSize: 12,
      fontWeight: '700',
    },
    subModalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: spacing.md,
    },
    cancelBtn: {
      paddingVertical: 8,
      paddingHorizontal: spacing.md,
    },
    cancelBtnText: {
      color: c.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    saveBtn: {
      backgroundColor: c.primary,
      paddingVertical: 8,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.sm,
    },
    saveBtnText: {
      color: '#090D16',
      fontSize: 14,
      fontWeight: '700',
    },
    // Scheduled Messages list and modal styles
    scheduledMessagesContainer: {
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    scheduledMessageCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.background,
      borderColor: c.border,
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
    },
    scheduledMessageInfo: {
      flex: 1,
      marginRight: spacing.sm,
    },
    scheduledMessageText: {
      fontSize: 14,
      color: c.text,
      fontWeight: '500',
    },
    scheduledMessageTime: {
      fontSize: 11,
      color: c.textMuted,
      marginTop: 4,
    },
    deleteScheduleBtn: {
      padding: spacing.xs,
    },
    scheduledInput: {
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      fontSize: 14,
      minHeight: 80,
      textAlignVertical: 'top',
      marginVertical: spacing.sm,
    },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '600',
      marginTop: spacing.sm,
      marginBottom: 4,
    },
    dateInput: {
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      fontSize: 14,
      marginBottom: spacing.xs,
    },
    shortcutRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginVertical: spacing.sm,
      flexWrap: 'wrap',
    },
    shortcutBtn: {
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.2)',
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
    },
    shortcutBtnText: {
      color: c.primary,
      fontSize: 11,
      fontWeight: '600',
    },
    pickerLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.sm,
      marginBottom: 6,
    },
    selectedScheduleSummary: {
      backgroundColor: 'rgba(16, 185, 129, 0.06)',
      borderColor: 'rgba(16, 185, 129, 0.15)',
      borderWidth: 1,
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      marginVertical: spacing.xs,
    },
    selectedScheduleSummaryTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textMuted,
    },
    selectedScheduleSummaryText: {
      fontSize: 15,
      fontWeight: '700',
      color: c.primary,
      marginTop: 2,
    },
    pillsScrollView: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    pillBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: c.border,
      marginRight: spacing.xs,
      backgroundColor: c.card,
    },
    activePillBtn: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    pillBtnText: {
      fontSize: 13,
      fontWeight: '600',
    },
    manualInputRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: 4,
    },
    manualInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      fontSize: 13,
      backgroundColor: c.card,
    },

    // Options dropdown menu
    optionsDropdown: {
      position: 'absolute',
      top: 50,
      right: 0,
      backgroundColor: c.card,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      minWidth: 170,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 8,
      zIndex: 999,
      overflow: 'hidden',
    },
    optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
    },
    optionText: {
      fontSize: 14,
      fontWeight: '600',
    },
    optionDivider: {
      height: 1,
      width: '100%',
    },

    // Transfer modal styles
    transferUserRow: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      marginBottom: spacing.sm,
      gap: spacing.sm,
    },
    transferAvatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
    },
    transferAvatarTxt: {
      fontSize: 18,
      fontWeight: '700',
    },
    transferUserName: {
      fontSize: 15,
      fontWeight: '700',
    },
    transferUserEmail: {
      fontSize: 12,
      marginTop: 2,
    },

    // Modal Form Styles for Contact Edit
    modalForm: { padding: spacing.md, gap: spacing.md },
    formGroup: { gap: 6, marginBottom: spacing.md },
    formLabel: { fontSize: 13, fontWeight: '700', color: c.textMuted },
    inputWrapper: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: c.border,
      borderRadius: borderRadius.md, backgroundColor: c.card, paddingHorizontal: spacing.md, height: 48,
    },
    formInput: { flex: 1, color: c.text, fontSize: 15 },
    modalFormActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    contactCancelBtn: { flex: 1, height: 48, borderRadius: borderRadius.md, borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center' },
    contactCancelBtnText: { color: c.textMuted, fontSize: 14, fontWeight: '700' },
    contactSaveBtn: { flex: 1, height: 48, borderRadius: borderRadius.md, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center' },
    contactSaveBtnText: { color: '#090D16', fontSize: 14, fontWeight: '700' },
    queueSelectOption: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
    queueSelectOptionText: {
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
