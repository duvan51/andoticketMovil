import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../theme/colors';
import { format, parseISO } from 'date-fns';
import { User, UserCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { ContactAvatar } from './ContactAvatar';

interface Queue {
  id: number;
  name: string;
  color: string;
}

interface Contact {
  id: number;
  name: string;
  number: string;
  profilePicUrl?: string;
}

interface AssignedUser {
  id: number;
  name: string;
}

interface TicketTag {
  id: number;
  name: string;
  color?: string;
}

interface Ticket {
  id: number;
  status: string;
  unreadMessages: number;
  lastMessage: string;
  updatedAt: string;
  contact: Contact;
  queue?: Queue;
  user?: AssignedUser;
  tags?: TicketTag[];
  isGroup?: boolean;
}

interface TicketListItemProps {
  ticket: Ticket;
  isInternal?: boolean;
  allUsers?: any[];
}

export const TicketListItem: React.FC<TicketListItemProps> = ({ ticket, isInternal, allUsers }) => {
  const router = useRouter();
  const { theme, user: currentUser } = useAuth();
  const c = colors[theme];
  const [draftText, setDraftText] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkDraft = async () => {
      try {
        const savedDraft = await AsyncStorage.getItem(`@whaticket:draft:${ticket.id}`);
        if (isMounted) {
          setDraftText(savedDraft && savedDraft.trim() ? savedDraft.trim() : null);
        }
      } catch (e) {
        if (isMounted) setDraftText(null);
      }
    };
    checkDraft();
    return () => { isMounted = false; };
  }, [ticket.id]);

  const { contact, queue, user: assignedUser, unreadMessages, lastMessage, updatedAt, tags = [] } = ticket;

  const assignedUserName =
    assignedUser?.name ||
    (ticket as any)?.userName ||
    (ticket as any)?.user?.name ||
    (currentUser && (ticket as any)?.userId && String((ticket as any).userId) === String(currentUser.id) ? currentUser.name : null) ||
    ((ticket as any)?.userId && allUsers ? allUsers.find(u => String(u.id) === String((ticket as any).userId))?.name : null);

  // Format time
  let timeStr = '';
  try {
    if (updatedAt) {
      const date = parseISO(updatedAt);
      timeStr = format(date, 'HH:mm');
    }
  } catch (e) {
    timeStr = '';
  }

  const st = buildStyles(c);
  const visibleTags = tags.slice(0, 2);
  const hiddenTagCount = Math.max(tags.length - visibleTags.length, 0);

  return (
    <TouchableOpacity
      style={[isInternal ? st.containerInternal : st.container, unreadMessages > 0 && { backgroundColor: theme === 'dark' ? '#1E2536' : '#F1F5F9' }]}
      onPress={() => router.push(`/ticket/${ticket.id}`)}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <ContactAvatar
        contact={contact}
        size={50}
        backgroundColor={c.primaryLight}
        textColor={c.primary}
        style={st.avatar}
      />

      {/* Info Column */}
      <View style={st.infoCol}>
        <View style={st.row}>
          <Text style={[st.name, { color: c.text }]} numberOfLines={1}>
            {contact?.name || 'Contacto Desconocido'}
          </Text>
          {ticket.isGroup && (
            <View style={st.badge}>
              <Text style={st.badgeText}>Grupo</Text>
            </View>
          )}
          <Text style={[st.time, { color: c.textMuted }]}>{timeStr}</Text>
        </View>

        <View style={st.row}>
          <Text style={[st.message, { color: draftText ? '#EF4444' : c.textMuted }, (unreadMessages > 0 || Boolean(draftText)) && st.messageUnread]} numberOfLines={1}>
            {draftText ? `[Borrador]: ${draftText}` : (lastMessage || 'Sin mensajes')}
          </Text>

          {unreadMessages > 0 && (
            <View style={st.badge}>
              <Text style={st.badgeText}>{unreadMessages}</Text>
            </View>
          )}
        </View>

        {/* Tags Row */}
        <View style={st.tagsRow}>
          {visibleTags.map((tag) => (
            <View key={tag.id} style={[st.tag, { backgroundColor: tag.color || c.primary }]}>
              <Text style={st.tagText} numberOfLines={1}>{tag.name}</Text>
            </View>
          ))}

          {hiddenTagCount > 0 && (
            <View style={[st.tag, { backgroundColor: c.border }]}>
              <Text style={[st.tagText, { color: c.textMuted }]}>+{hiddenTagCount}</Text>
            </View>
          )}

          {queue && (
            <View style={[st.queueTag, { borderColor: queue.color || c.primary }]}>
              <Text style={[st.queueTagText, { color: queue.color || c.primary }]} numberOfLines={1}>
                {queue.name}
              </Text>
            </View>
          )}

          {assignedUserName ? (
            <View style={[st.userTag, st.assigned]}>
              <UserCheck size={11} color={c.primary} />
              <Text style={[st.userTagText, { color: c.primary, fontWeight: '700' }]} numberOfLines={1}>
                {assignedUserName}
              </Text>
            </View>
          ) : (
            <View style={[st.userTag, st.unassigned]}>
              <User size={10} color={c.textMuted} />
              <Text style={[st.userTagText, { color: c.textMuted }]} numberOfLines={1}>
                Sin asignar
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

function buildStyles(c: typeof colors['dark']) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      padding: spacing.md,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      alignItems: 'center',
    },
    containerInternal: {
      flexDirection: 'row',
      padding: spacing.md,
      backgroundColor: c.primaryLight,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      alignItems: 'center',
    },
    containerLarge: {
      flexDirection: 'row',
      padding: spacing.xl,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      alignItems: 'center',
      minHeight: 300,
    },
    avatar: {
      marginRight: spacing.md,
    },
    infoCol: {
      flex: 1,
      justifyContent: 'center',
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 4,
    },
    name: {
      fontSize: 16,
      fontWeight: '600',
      flex: 1,
      marginRight: spacing.sm,
    },
    time: {
      fontSize: 12,
    },
    message: {
      fontSize: 14,
      flex: 1,
      marginRight: spacing.sm,
    },
    messageUnread: {
      color: c.text,
      fontWeight: '600',
    },
    badge: {
      backgroundColor: c.primary,
      borderRadius: 10,
      minWidth: 20,
      height: 20,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    badgeText: {
      color: '#090D16',
      fontSize: 11,
      fontWeight: '700',
    },
    tagsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xs,
      alignItems: 'center',
      flexWrap: 'wrap',
    },
    tag: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.xs,
      maxWidth: 110,
    },
    queueTag: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.xs,
      borderWidth: 1,
      maxWidth: 110,
    },
    tagText: {
      color: '#FFFFFF',
      fontSize: 10,
      fontWeight: '700',
    },
    queueTagText: {
      fontSize: 10,
      fontWeight: '700',
    },
    userTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadius.xs,
      borderWidth: 1,
    },
    assigned: {
      borderColor: c.primaryLight,
      backgroundColor: 'rgba(16, 185, 129, 0.05)',
    },
    unassigned: {
      borderColor: c.border,
      backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    userTagText: {
      fontSize: 10,
      fontWeight: '500',
      maxWidth: 100,
    },
  });
}
