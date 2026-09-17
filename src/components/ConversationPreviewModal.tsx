// src/components/ConversationPreviewModal.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, spacing, borderRadius } from '../theme/colors';
import {
  X,
  MessageCircle,
  Phone,
  Tag as TagIcon,
  StickyNote,
  Send,
  User,
  Clock,
  ExternalLink,
  Bot,
  CheckCheck,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';

interface ConversationPreviewModalProps {
  visible: boolean;
  ticket: any | null;
  onClose: () => void;
}

export function ConversationPreviewModal({
  visible,
  ticket,
  onClose,
}: ConversationPreviewModalProps) {
  const router = useRouter();
  const { theme } = useAuth();
  const c = colors[theme];

  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && ticket?.id) {
      fetchConversation(ticket.id);
    } else {
      setMessages([]);
    }
  }, [visible, ticket?.id]);

  const fetchConversation = async (ticketId: number) => {
    try {
      setLoading(true);
      const { data } = await api.get(`/messages/${ticketId}`, {
        params: { pageNumber: 1 },
      });
      if (data && Array.isArray(data.messages)) {
        // Most recent at the bottom (chronological order)
        setMessages([...data.messages].reverse());
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error('Error fetching conversation preview:', err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleGoToChat = () => {
    if (!ticket?.id) return;
    onClose();
    router.push(`/ticket/${ticket.id}`);
  };

  if (!ticket) return null;

  const contact = ticket.contact;
  const queue = ticket.queue;
  const tags: any[] = ticket.tags || [];

  const formatMessageTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'HH:mm');
    } catch {
      return '';
    }
  };

  const isDark = theme === 'dark';

  const st = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.sm,
    },
    modalContainer: {
      width: '100%',
      maxWidth: 580,
      height: '90%',
      backgroundColor: c.background,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      flexDirection: 'column',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 10,
    },
    header: {
      backgroundColor: c.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    headerTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    contactInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
      marginRight: spacing.sm,
    },
    avatarPlaceholder: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: (queue?.color || c.primary) + '25',
      borderWidth: 1.5,
      borderColor: queue?.color || c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 16,
      fontWeight: '800',
      color: queue?.color || c.primary,
    },
    contactDetails: {
      flex: 1,
    },
    contactName: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
    },
    phoneRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    phoneText: {
      fontSize: 12,
      color: c.textMuted,
      fontWeight: '500',
    },
    closeButton: {
      padding: 8,
      borderRadius: borderRadius.md,
      backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginTop: spacing.sm,
    },
    queueBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.xs,
      borderWidth: 1,
      gap: 4,
    },
    queueDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    queueText: {
      fontSize: 11,
      fontWeight: '700',
    },
    tagBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: borderRadius.xs,
    },
    tagText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    chatBody: {
      flex: 1,
      backgroundColor: isDark ? '#090D16' : '#F1F5F9',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    loadingCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacing.sm,
      fontSize: 13,
      color: c.textMuted,
    },
    emptyCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.sm,
    },
    emptySub: {
      fontSize: 12,
      color: c.textMuted,
      textAlign: 'center',
      marginTop: 4,
    },
    // Message Bubbles
    bubbleWrapper: {
      marginVertical: 4,
      maxWidth: '82%',
    },
    bubbleLeft: {
      alignSelf: 'flex-start',
    },
    bubbleRight: {
      alignSelf: 'flex-end',
    },
    bubbleCard: {
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: spacing.xs + 4,
      borderWidth: 1,
    },
    bubbleClient: {
      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
      borderColor: isDark ? '#334155' : '#E2E8F0',
      borderBottomLeftRadius: 2,
    },
    bubbleAdvisor: {
      backgroundColor: isDark ? '#064E3B' : '#DCF8C6',
      borderColor: isDark ? '#059669' : '#B8E6A1',
      borderBottomRightRadius: 2,
    },
    bubbleNote: {
      alignSelf: 'center',
      maxWidth: '92%',
      backgroundColor: isDark ? '#3A2E05' : '#FEF3C7',
      borderColor: isDark ? '#B45309' : '#F59E0B',
      borderWidth: 1,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginVertical: 6,
    },
    noteHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 4,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#5A4308' : '#FDE68A',
    },
    noteTitle: {
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      color: isDark ? '#FBBF24' : '#B45309',
    },
    noteBodyText: {
      fontSize: 13,
      color: isDark ? '#FEF3C7' : '#78350F',
      lineHeight: 18,
    },
    messageText: {
      fontSize: 14,
      lineHeight: 20,
    },
    messageFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
      marginTop: 2,
    },
    timeText: {
      fontSize: 10,
      color: c.textMuted,
    },
    // Footer Action Bar
    footerBar: {
      backgroundColor: c.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 4,
      borderTopWidth: 1,
      borderTopColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    replyButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      gap: spacing.sm,
      shadowColor: c.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 4,
    },
    replyButtonText: {
      color: '#090D16',
      fontSize: 15,
      fontWeight: '800',
      letterSpacing: 0.2,
    },
    closeSecondaryBtn: {
      paddingVertical: 12,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    closeSecondaryText: {
      color: c.text,
      fontSize: 13,
      fontWeight: '600',
    },
  });

  const renderItem = ({ item }: { item: any }) => {
    const isNote = item.mediaType === 'note' || item.isNote || item.isPrivate;
    const fromMe = !!item.fromMe;

    if (isNote) {
      return (
        <View style={st.bubbleNote}>
          <View style={st.noteHeaderRow}>
            <StickyNote size={14} color={isDark ? '#FBBF24' : '#B45309'} />
            <Text style={st.noteTitle}>Nota Interna Guardada</Text>
            <Text style={[st.timeText, { marginLeft: 'auto', color: isDark ? '#FBBF24' : '#B45309' }]}>
              {formatMessageTime(item.createdAt)}
            </Text>
          </View>
          <Text style={st.noteBodyText}>{item.body || '(Sin texto en la nota)'}</Text>
        </View>
      );
    }

    const bubbleCardStyle = fromMe ? st.bubbleAdvisor : st.bubbleClient;
    const bubbleWrapperStyle = fromMe ? st.bubbleRight : st.bubbleLeft;
    const textColor = fromMe
      ? isDark
        ? '#ECFDF5'
        : '#064E3B'
      : c.text;

    return (
      <View style={[st.bubbleWrapper, bubbleWrapperStyle]}>
        <View style={[st.bubbleCard, bubbleCardStyle]}>
          <Text style={[st.messageText, { color: textColor }]}>
            {item.body || (item.mediaType ? `[${item.mediaType}]` : '')}
          </Text>
          <View style={st.messageFooter}>
            <Text style={st.timeText}>{formatMessageTime(item.createdAt)}</Text>
            {fromMe && <CheckCheck size={12} color={isDark ? '#34D399' : '#059669'} />}
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.overlay}>
        <SafeAreaView style={st.modalContainer} edges={['top', 'bottom']}>
          {/* Header */}
          <View style={st.header}>
            <View style={st.headerTopRow}>
              <View style={st.contactInfoRow}>
                <View style={st.avatarPlaceholder}>
                  <Text style={st.avatarText}>
                    {(contact?.name || 'C').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={st.contactDetails}>
                  <Text style={st.contactName} numberOfLines={1}>
                    {contact?.name || 'Sin nombre'}
                  </Text>
                  <View style={st.phoneRow}>
                    <Phone size={12} color={c.textMuted} />
                    <Text style={st.phoneText}>
                      +{contact?.number || 'Sin teléfono'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={st.closeButton}
                onPress={onClose}
                activeOpacity={0.7}
              >
                <X size={20} color={c.text} />
              </TouchableOpacity>
            </View>

            {/* Badges: Department & Tags */}
            <View style={st.metaRow}>
              {queue ? (
                <View
                  style={[
                    st.queueBadge,
                    {
                      backgroundColor: (queue.color || c.primary) + '18',
                      borderColor: queue.color || c.primary,
                    },
                  ]}
                >
                  <View
                    style={[
                      st.queueDot,
                      { backgroundColor: queue.color || c.primary },
                    ]}
                  />
                  <Text
                    style={[
                      st.queueText,
                      { color: queue.color || c.primary },
                    ]}
                  >
                    {queue.name}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    st.queueBadge,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
                      borderColor: c.border,
                    },
                  ]}
                >
                  <Text style={[st.queueText, { color: c.textMuted }]}>
                    Sin departamento
                  </Text>
                </View>
              )}

              {tags.map((tg) => (
                <View
                  key={tg.id}
                  style={[st.tagBadge, { backgroundColor: tg.color || c.primary }]}
                >
                  <Text style={st.tagText}>{tg.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Chat Body */}
          <View style={st.chatBody}>
            {loading ? (
              <View style={st.loadingCenter}>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={st.loadingText}>Cargando mensajes...</Text>
              </View>
            ) : messages.length > 0 ? (
              <FlatList
                data={messages}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={{ paddingVertical: spacing.sm }}
                showsVerticalScrollIndicator={true}
              />
            ) : (
              <View style={st.emptyCenter}>
                <MessageCircle size={44} color={c.textMuted} />
                <Text style={st.emptyTitle}>Sin mensajes disponibles</Text>
                <Text style={st.emptySub}>
                  No se encontraron mensajes registrados para esta conversación.
                </Text>
              </View>
            )}
          </View>

          {/* Action Footer */}
          <View style={st.footerBar}>
            <TouchableOpacity
              style={st.closeSecondaryBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={st.closeSecondaryText}>Cerrar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={st.replyButton}
              onPress={handleGoToChat}
              activeOpacity={0.85}
            >
              <MessageCircle size={18} color="#090D16" />
              <Text style={st.replyButtonText}>Contestar / Ir al Chat</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
