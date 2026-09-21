import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image as ExpoImage } from 'expo-image';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, spacing, borderRadius } from '../theme/colors';
import { ContactAvatar, resolveProfilePicUrl } from './ContactAvatar';
import {
  X,
  Phone,
  Mail,
  User,
  Building2,
  Tag,
  FileText,
  CalendarClock,
  Info,
  History,
  Edit2,
  ExternalLink,
  Trash2,
  UserCheck,
} from 'lucide-react-native';

export interface ContactDetailModalProps {
  visible: boolean;
  contact: any;
  ticket?: any;
  messages?: any[];
  onClose: () => void;
  onEditContact?: () => void;
  onManageTags?: () => void;
  onScheduleMessage?: () => void;
  onDeleteSchedule?: (id: number) => void;
  scheduledMessages?: any[];
  timelineItems?: any[];
}

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  visible,
  contact,
  ticket,
  messages = [],
  onClose,
  onEditContact,
  onManageTags,
  onScheduleMessage,
  onDeleteSchedule,
  scheduledMessages = [],
  timelineItems = [],
}) => {
  const { theme, user: currentUser } = useAuth();
  const c = colors[theme];
  const isDark = theme === 'dark';

  // Full-screen profile photo state
  const [fullPicModalOpen, setFullPicModalOpen] = useState(false);
  const [fullPicUrl, setFullPicUrl] = useState<string | null>(null);

  // Auto-fetch internal notes when opened without preloaded messages
  const [fetchedMessages, setFetchedMessages] = useState<any[]>([]);
  const hasExternalMessages = Boolean(messages && messages.length > 0);

  React.useEffect(() => {
    if (!visible) {
      if (fetchedMessages.length > 0) {
        setFetchedMessages([]);
      }
      return;
    }

    if (ticket?.id && !hasExternalMessages) {
      let isMounted = true;
      api.get(`/messages/${ticket.id}`, { params: { pageNumber: 1 } })
        .then(({ data }) => {
          if (isMounted && data && Array.isArray(data.messages)) {
            setFetchedMessages(data.messages);
          }
        })
        .catch(err => {
          console.log('Error fetching notes for contact detail modal:', err);
        });
      return () => { isMounted = false; };
    }
  }, [visible, ticket?.id, hasExternalMessages]);

  if (!visible || !contact) return null;

  const handleOpenFullPic = async () => {
    try {
      const resolved = await resolveProfilePicUrl(contact);
      setFullPicUrl(resolved);
    } catch (e) {
      setFullPicUrl(null);
    }
    setFullPicModalOpen(true);
  };

  const assignedUserName =
    ticket?.user?.name ||
    ticket?.userName ||
    (currentUser && ticket?.userId && String(ticket.userId) === String(currentUser.id) ? currentUser.name : null) ||
    'Sin asignar';

  const departmentName = ticket?.queue?.name || contact?.queue?.name || 'Sin departamento';
  const departmentColor = ticket?.queue?.color || contact?.queue?.color || c.primary;

  // Filter internal notes from messages if provided or fetched
  const allNotesMessages = (messages && messages.length > 0) ? messages : fetchedMessages;
  const internalNotes = allNotesMessages.filter(
    (m: any) => m.mediaType === 'note' || m.isPrivate || m.isNote
  );

  const tagsList = ticket?.tags || contact?.tags || [];
  const extraInfoList = contact?.extraInfo || [];

  const handleCall = () => {
    if (contact?.number) {
      Linking.openURL(`tel:+${contact.number}`).catch(() => {});
    }
  };

  const handleMail = () => {
    if (contact?.email) {
      Linking.openURL(`mailto:${contact.email}`).catch(() => {});
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: c.background, borderColor: c.border }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: c.border, backgroundColor: c.card }]}>
              <Text style={[styles.modalTitle, { color: c.text }]}>Detalle del Cliente</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                {onEditContact && (
                  <TouchableOpacity onPress={onEditContact} style={[styles.closeBtn, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
                    <Edit2 size={18} color={c.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: isDark ? '#1F2937' : '#F1F5F9' }]}>
                  <X size={20} color={c.text} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
              {/* Contact Profile Header Card */}
              <View style={[styles.contactCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <TouchableOpacity onPress={handleOpenFullPic} activeOpacity={0.8} style={styles.avatarWrapper}>
                  <ContactAvatar
                    contact={contact}
                    size={92}
                    backgroundColor={c.primaryLight}
                    textColor={c.primary}
                    style={styles.modalAvatar}
                  />
                  <View style={[styles.expandPicBadge, { backgroundColor: c.primary }]}>
                    <ExternalLink size={12} color="#090D16" />
                  </View>
                </TouchableOpacity>

                <Text style={[styles.contactCardName, { color: c.text }]}>{contact?.name || 'Cliente'}</Text>
                
                {contact?.number ? (
                  <TouchableOpacity onPress={handleCall} activeOpacity={0.7} style={styles.contactCardDetailRow}>
                    <Phone size={14} color={c.primary} />
                    <Text style={[styles.contactCardDetailText, { color: c.primary, fontWeight: '600' }]}>
                      +{contact.number}
                    </Text>
                  </TouchableOpacity>
                ) : null}

                {contact?.email ? (
                  <TouchableOpacity onPress={handleMail} activeOpacity={0.7} style={styles.contactCardDetailRow}>
                    <Mail size={14} color={c.textMuted} />
                    <Text style={[styles.contactCardDetailText, { color: c.textMuted }]}>{contact.email}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Assignment & Department Section */}
              <View style={[styles.detailsSection, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={styles.sectionTitleIconRow}>
                  <UserCheck size={16} color={c.primary} />
                  <Text style={[styles.detailsSectionTitle, { color: c.text }]}>Asignación y Departamento</Text>
                </View>
                <View style={styles.badgesRow}>
                  {/* Assigned Advisor */}
                  <View style={[styles.assignmentBadge, { backgroundColor: c.primaryLight, borderColor: c.primary }]}>
                    <User size={13} color={c.primary} />
                    <Text style={[styles.assignmentBadgeText, { color: c.primary }]}>
                      Asesor: {assignedUserName}
                    </Text>
                  </View>

                  {/* Department */}
                  <View style={[styles.assignmentBadge, { backgroundColor: departmentColor + '18', borderColor: departmentColor }]}>
                    <Building2 size={13} color={departmentColor} />
                    <Text style={[styles.assignmentBadgeText, { color: departmentColor }]}>
                      Depto: {departmentName}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Internal Notes Section */}
              <View style={[styles.detailsSection, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={styles.sectionTitleIconRow}>
                  <FileText size={16} color="#F59E0B" />
                  <Text style={[styles.detailsSectionTitle, { color: c.text }]}>Notas Internas</Text>
                </View>
                <View style={styles.notesContainer}>
                  {internalNotes.length > 0 ? (
                    internalNotes.map((note: any) => {
                      const noteDate = note.createdAt ? format(parseISO(note.createdAt), 'dd/MM/yyyy HH:mm') : '';
                      return (
                        <View
                          key={note.id}
                          style={[
                            styles.noteCard,
                            {
                              backgroundColor: isDark ? '#2A2415' : '#FFFBEB',
                              borderColor: '#F59E0B',
                            },
                          ]}
                        >
                          <View style={styles.noteHeader}>
                            <Text style={[styles.noteAuthor, { color: '#D97706' }]}>
                              {note.user?.name || 'Asesor'}
                            </Text>
                            {noteDate ? <Text style={[styles.noteDate, { color: c.textMuted }]}>{noteDate}</Text> : null}
                          </View>
                          <Text style={[styles.noteBody, { color: isDark ? '#FEF3C7' : '#78350F' }]}>
                            {note.body || ''}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={[styles.noDataText, { color: c.textMuted }]}>Sin notas internas registradas.</Text>
                  )}
                </View>
              </View>

              {/* Tags Section */}
              <View style={[styles.detailsSection, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={styles.sectionTitleRow}>
                  <View style={styles.sectionTitleIconRow}>
                    <Tag size={16} color={c.primary} />
                    <Text style={[styles.detailsSectionTitle, { color: c.text }]}>Etiquetas</Text>
                  </View>
                  {onManageTags && (
                    <TouchableOpacity onPress={onManageTags}>
                      <Text style={[styles.manageLink, { color: c.primary }]}>Gestionar</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.tagsContainer}>
                  {tagsList.length > 0 ? (
                    tagsList.map((tag: any) => (
                      <View key={tag.id} style={[styles.tagChip, { backgroundColor: tag.color || c.primary }]}>
                        <Text style={styles.tagChipText}>{tag.name}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.noDataText, { color: c.textMuted }]}>Sin etiquetas en este contacto/ticket.</Text>
                  )}
                </View>
              </View>

              {/* Extra Custom Fields Section (extraInfo) */}
              <View style={[styles.detailsSection, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={styles.sectionTitleIconRow}>
                  <Info size={16} color={c.primary} />
                  <Text style={[styles.detailsSectionTitle, { color: c.text }]}>Campos Extra / Notas</Text>
                </View>
                <View style={styles.extraInfoContainer}>
                  {extraInfoList.length > 0 ? (
                    extraInfoList.map((info: any, idx: number) => (
                      <View key={info.id || idx} style={[styles.extraInfoCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: c.border }]}>
                        <Text style={[styles.extraInfoLabel, { color: c.textMuted }]}>{info.name}</Text>
                        <Text style={[styles.extraInfoValue, { color: c.text }]}>{info.value}</Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.noDataText, { color: c.textMuted }]}>Sin información adicional.</Text>
                  )}
                </View>
              </View>

              {/* Scheduled Messages Section (Optional) */}
              {(onScheduleMessage || scheduledMessages.length > 0) && (
                <View style={[styles.detailsSection, { backgroundColor: c.card, borderColor: c.border }]}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.sectionTitleIconRow}>
                      <CalendarClock size={16} color={c.primary} />
                      <Text style={[styles.detailsSectionTitle, { color: c.text }]}>Mensajes Programados</Text>
                    </View>
                    {onScheduleMessage && (
                      <TouchableOpacity onPress={onScheduleMessage}>
                        <Text style={[styles.manageLink, { color: c.primary }]}>Programar Nuevo</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.scheduledMessagesContainer}>
                    {scheduledMessages.length > 0 ? (
                      scheduledMessages.map((msg: any) => {
                        const sendDate = format(parseISO(msg.sendAt), 'dd/MM/yyyy HH:mm');
                        return (
                          <View key={msg.id} style={[styles.scheduledMessageCard, { backgroundColor: isDark ? '#1E293B' : '#F8FAFC', borderColor: c.border }]}>
                            <View style={styles.scheduledMessageInfo}>
                              <Text style={[styles.scheduledMessageText, { color: c.text }]}>{msg.body}</Text>
                              <Text style={[styles.scheduledMessageTime, { color: c.textMuted }]}>Envío: {sendDate}</Text>
                            </View>
                            {onDeleteSchedule && (
                              <TouchableOpacity onPress={() => onDeleteSchedule(msg.id)} style={styles.deleteScheduleBtn}>
                                <Trash2 size={16} color="#EF4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })
                    ) : (
                      <Text style={[styles.noDataText, { color: c.textMuted }]}>No hay mensajes programados.</Text>
                    )}
                  </View>
                </View>
              )}

              {/* Process History / Timeline Section (Optional) */}
              {timelineItems.length > 0 && (
                <View style={[styles.detailsSection, { backgroundColor: c.card, borderColor: c.border }]}>
                  <View style={styles.sectionTitleIconRow}>
                    <History size={16} color={c.primary} />
                    <Text style={[styles.detailsSectionTitle, { color: c.text }]}>Historial de Proceso</Text>
                  </View>

                  <View style={styles.timelineContainer}>
                    {timelineItems.map((item: any, idx: number) => {
                      const isLast = idx === timelineItems.length - 1;
                      const dateFormatted = format(parseISO(item.createdAt), 'dd/MM/yyyy HH:mm');

                      let contentText = '';
                      let dotBgColor = '#94A3B8';

                      if (item.type === 'note') {
                        contentText = `Nota: "${item.body}"`;
                        dotBgColor = '#F59E0B';
                      } else if (item.type === 'tag') {
                        contentText = item.body;
                        dotBgColor = '#A855F7';
                      } else if (item.type === 'schedule_history') {
                        contentText = item.body;
                        dotBgColor = '#64748B';
                      } else {
                        if (idx === timelineItems.length - 1) {
                          contentText = 'Inicio conversación';
                          dotBgColor = '#EC4899';
                        } else if (!item.userId) {
                          contentText = 'Devuelto a pendientes';
                          dotBgColor = '#F97316';
                        } else {
                          contentText = `Asignado a: ${item.user?.name || 'Desconocido'}`;
                          dotBgColor = '#3B82F6';
                        }

                        if (item.finishedAt) {
                          contentText += ` (Completado)`;
                        } else {
                          contentText += ' (Activo)';
                          dotBgColor = '#10B981';
                        }
                      }

                      return (
                        <View key={item.id} style={styles.timelineItem}>
                          <View style={styles.timelineLeft}>
                            <View style={[styles.timelineDot, { backgroundColor: dotBgColor }]} />
                            {!isLast && <View style={[styles.timelineConnector, { backgroundColor: c.border }]} />}
                          </View>
                          <View style={styles.timelineRight}>
                            <Text style={[styles.timelineContentText, { color: c.text }]}>{contentText}</Text>
                            <Text style={[styles.timelineDateText, { color: c.textMuted }]}>{dateFormatted}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── FULLSCREEN CONTACT PROFILE PICTURE MODAL ── */}
      <Modal visible={fullPicModalOpen} transparent animationType="fade" onRequestClose={() => setFullPicModalOpen(false)}>
        <View style={styles.fullPicOverlay}>
          <SafeAreaView style={styles.fullPicContainer}>
            <View style={styles.fullPicHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fullPicName} numberOfLines={1}>{contact?.name || 'Foto de Perfil'}</Text>
                {contact?.number ? (
                  <Text style={styles.fullPicSub}>+{contact.number}</Text>
                ) : null}
              </View>
              <TouchableOpacity style={styles.fullPicCloseBtn} onPress={() => setFullPicModalOpen(false)}>
                <X size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.fullPicBox}>
              {fullPicUrl ? (
                <ExpoImage
                  source={{ uri: fullPicUrl }}
                  style={styles.fullPicImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              ) : (
                <ContactAvatar
                  contact={contact}
                  size={240}
                  backgroundColor={c.primaryLight}
                  textColor={c.primary}
                />
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '92%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  modalScrollContent: {
    paddingBottom: spacing.xl + 36,
    gap: spacing.md,
  },
  contactCard: {
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  modalAvatar: {
    borderWidth: 3,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  expandPicBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  contactCardName: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  contactCardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  contactCardDetailText: {
    fontSize: 14,
  },
  detailsSection: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.xs,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailsSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  manageLink: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: 'wrap',
  },
  assignmentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  assignmentBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  notesContainer: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  noteCard: {
    padding: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  noteAuthor: {
    fontSize: 12,
    fontWeight: '700',
  },
  noteDate: {
    fontSize: 10,
  },
  noteBody: {
    fontSize: 13,
    lineHeight: 18,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  tagChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  extraInfoContainer: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  extraInfoCard: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  extraInfoLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  extraInfoValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  scheduledMessagesContainer: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  scheduledMessageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  scheduledMessageInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  scheduledMessageText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scheduledMessageTime: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteScheduleBtn: {
    padding: 6,
  },
  timelineContainer: {
    marginTop: spacing.xs,
    paddingLeft: spacing.xs,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: spacing.sm,
    width: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    marginVertical: 2,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: spacing.xs,
  },
  timelineContentText: {
    fontSize: 13,
    fontWeight: '600',
  },
  timelineDateText: {
    fontSize: 11,
    marginTop: 2,
  },
  noDataText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Fullscreen Photo Modal Styles
  fullPicOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.93)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPicContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'space-between',
  },
  fullPicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fullPicName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullPicSub: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
  },
  fullPicCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullPicBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  fullPicImage: {
    width: '100%',
    height: '80%',
    borderRadius: 12,
  },
});
