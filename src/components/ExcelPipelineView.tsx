// src/components/ExcelPipelineView.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, spacing, borderRadius } from '../theme/colors';
import {
  Search,
  X,
  MessageCircle,
  StickyNote,
  Phone,
  Tag as TagIcon,
  Building2,
  Eye,
  FileSpreadsheet,
  Filter,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { ConversationPreviewModal } from './ConversationPreviewModal';

interface ExcelPipelineViewProps {
  tickets: any[];
  queues: any[];
  tags: any[];
  refreshing: boolean;
  onRefresh: () => void;
  selectedQueueId: number | 'none' | 'all';
  onSelectQueueId: (id: number | 'none' | 'all') => void;
}

interface NoteInfo {
  text: string;
  createdAt?: string;
  user?: string;
}

export function ExcelPipelineView({
  tickets,
  queues,
  tags,
  refreshing,
  onRefresh,
  selectedQueueId,
  onSelectQueueId,
}: ExcelPipelineViewProps) {
  const router = useRouter();
  const { theme } = useAuth();
  const c = colors[theme];
  const isDark = theme === 'dark';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<number | 'all'>('all');
  const [selectedTicketForPreview, setSelectedTicketForPreview] = useState<any | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Notes cache: ticketId -> NoteInfo | null
  const [notesCache, setNotesCache] = useState<Record<number, NoteInfo | null>>({});
  const [loadingNotes, setLoadingNotes] = useState(false);
  const fetchingTicketIds = useRef<Set<number>>(new Set());

  // Filter tickets by Queue (Department), Tag (Stage), and Search Query
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // 1. Queue filter
      if (selectedQueueId !== 'all') {
        if (selectedQueueId === 'none') {
          if (t.queueId || t.queue) return false;
        } else {
          const qId = t.queueId || t.queue?.id;
          if (qId !== selectedQueueId) return false;
        }
      }

      // 2. Tag filter
      if (selectedTagFilter !== 'all') {
        const hasTag = t.tags?.some((tg: any) => tg.id === selectedTagFilter);
        if (!hasTag) return false;
      }

      // 3. Search query filter
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const name = (t.contact?.name || '').toLowerCase();
      const phone = (t.contact?.number || '').toLowerCase();
      const lastMsg = (t.lastMessage || '').toLowerCase();
      const queueName = (t.queue?.name || '').toLowerCase();
      const tagNames = (t.tags || []).map((tg: any) => tg.name.toLowerCase()).join(' ');
      const note = notesCache[t.id]?.text?.toLowerCase() || '';

      return (
        name.includes(q) ||
        phone.includes(q) ||
        lastMsg.includes(q) ||
        queueName.includes(q) ||
        tagNames.includes(q) ||
        note.includes(q)
      );
    });
  }, [tickets, selectedQueueId, selectedTagFilter, searchQuery, notesCache]);

  // Asynchronously fetch last saved note for visible tickets in batches
  useEffect(() => {
    if (filteredTickets.length === 0) return;

    const ticketsToFetch = filteredTickets.filter(
      (t) => notesCache[t.id] === undefined && !fetchingTicketIds.current.has(t.id)
    );

    if (ticketsToFetch.length === 0) return;

    ticketsToFetch.forEach((t) => fetchingTicketIds.current.add(t.id));
    setLoadingNotes(true);

    let isMounted = true;

    const fetchNotesBatch = async () => {
      const batchSize = 5;
      for (let i = 0; i < ticketsToFetch.length; i += batchSize) {
        if (!isMounted) break;
        const currentBatch = ticketsToFetch.slice(i, i + batchSize);

        await Promise.allSettled(
          currentBatch.map(async (ticket) => {
            try {
              const { data } = await api.get(`/messages/${ticket.id}`, {
                params: { pageNumber: 1 },
              });

              let lastNote: NoteInfo | null = null;
              if (data && Array.isArray(data.messages)) {
                // Find latest internal note (notes are isNote || isPrivate || mediaType === 'note')
                const noteMsg = data.messages.find(
                  (m: any) => m.mediaType === 'note' || m.isNote || m.isPrivate
                );

                if (noteMsg) {
                  lastNote = {
                    text: noteMsg.body || '(Nota con adjunto)',
                    createdAt: noteMsg.createdAt,
                    user: noteMsg.user?.name,
                  };
                }
              }

              if (isMounted) {
                setNotesCache((prev) => ({
                  ...prev,
                  [ticket.id]: lastNote,
                }));
              }
            } catch (err) {
              if (isMounted) {
                setNotesCache((prev) => ({
                  ...prev,
                  [ticket.id]: null,
                }));
              }
            }
          })
        );
      }

      if (isMounted) {
        setLoadingNotes(false);
      }
    };

    fetchNotesBatch();

    return () => {
      isMounted = false;
    };
  }, [filteredTickets]);

  const handleRowClick = (ticket: any) => {
    setSelectedTicketForPreview(ticket);
    setPreviewModalOpen(true);
  };

  const handleGoToChatDirect = (ticketId: number) => {
    router.push(`/ticket/${ticketId}`);
  };

  // Cell width constants for Excel feel
  const COL_WIDTH = {
    index: 48,
    name: 180,
    phone: 140,
    note: 260,
    tags: 190,
    dept: 140,
    actions: 110,
  };

  const TOTAL_GRID_WIDTH =
    COL_WIDTH.index +
    COL_WIDTH.name +
    COL_WIDTH.phone +
    COL_WIDTH.note +
    COL_WIDTH.tags +
    COL_WIDTH.dept +
    COL_WIDTH.actions;

  const st = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: c.background,
    },
    // Toolbar: Search + Stats
    toolbar: {
      backgroundColor: c.card,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: spacing.sm,
    },
    toolbarTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sheetBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: isDark ? '#064E3B' : '#E8F5E9',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: isDark ? '#059669' : '#A7F3D0',
    },
    sheetBadgeText: {
      fontSize: 12,
      fontWeight: '800',
      color: isDark ? '#A7F3D0' : '#047857',
    },
    statsCounter: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textMuted,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#1E293B' : '#F8FAFC',
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm,
      height: 40,
    },
    searchInput: {
      flex: 1,
      fontSize: 13,
      color: c.text,
      marginLeft: spacing.xs,
      paddingVertical: 0,
    },
    clearSearchBtn: {
      padding: 4,
    },
    // Quick Tag Filter Bar
    filterScroll: {
      maxHeight: 46,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingVertical: 6,
    },
    filterScrollContent: {
      paddingHorizontal: spacing.md,
      gap: spacing.xs,
      alignItems: 'center',
    },
    filterPill: {
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    filterPillActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    filterPillText: {
      fontSize: 11,
      fontWeight: '600',
    },
    // Excel Spreadsheet Grid Styles
    gridWrapper: {
      flex: 1,
    },
    headerRow: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#111827' : '#F1F5F9',
      borderBottomWidth: 2,
      borderBottomColor: isDark ? '#374151' : '#CBD5E1',
    },
    headerCell: {
      paddingVertical: 10,
      paddingHorizontal: 10,
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: isDark ? '#1F2937' : '#E2E8F0',
    },
    headerText: {
      fontSize: 11,
      fontWeight: '800',
      color: isDark ? '#9CA3AF' : '#475569',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#1E293B' : '#E2E8F0',
      minHeight: 52,
    },
    tableRowEven: {
      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    },
    tableRowOdd: {
      backgroundColor: isDark ? '#141E33' : '#F8FAFC',
    },
    cell: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      justifyContent: 'center',
      borderRightWidth: 1,
      borderRightColor: isDark ? '#1E293B' : '#E2E8F0',
    },
    indexText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textMuted,
      textAlign: 'center',
    },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    initialCircle: {
      width: 26,
      height: 26,
      borderRadius: 13,
      justifyContent: 'center',
      alignItems: 'center',
    },
    initialText: {
      fontSize: 12,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    contactNameText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
      flex: 1,
    },
    phoneCellRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    phoneText: {
      fontSize: 12,
      fontWeight: '500',
      color: c.text,
    },
    // Note Cell
    noteWrapper: {
      backgroundColor: isDark ? '#2D2205' : '#FEF9C3',
      borderColor: isDark ? '#854D0E' : '#FDE047',
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      paddingHorizontal: 8,
      paddingVertical: 4,
      flexDirection: 'column',
      gap: 2,
    },
    noteHeaderLine: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    noteLabel: {
      fontSize: 9,
      fontWeight: '800',
      color: isDark ? '#FBBF24' : '#854D0E',
      textTransform: 'uppercase',
    },
    noteDate: {
      fontSize: 9,
      color: isDark ? '#F59E0B' : '#B45309',
      marginLeft: 'auto',
    },
    noteTextSnippet: {
      fontSize: 11,
      color: isDark ? '#FEF08A' : '#713F12',
      lineHeight: 14,
    },
    noNoteText: {
      fontSize: 11,
      fontStyle: 'italic',
      color: c.textMuted,
    },
    // Tags cell
    tagsScroll: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      alignItems: 'center',
    },
    tagPill: {
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: borderRadius.xs,
    },
    tagPillText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    // Department badge
    deptBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: borderRadius.xs,
      borderWidth: 1,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    deptDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    deptText: {
      fontSize: 10,
      fontWeight: '700',
    },
    // Actions cell
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    actionBtn: {
      padding: 7,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    actionBtnChat: {
      padding: 7,
      borderRadius: borderRadius.sm,
      backgroundColor: c.primary,
    },
    // Empty state
    emptyGrid: {
      paddingVertical: spacing.xl * 2,
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    emptyGridTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.sm,
    },
    emptyGridSub: {
      fontSize: 12,
      color: c.textMuted,
      marginTop: 4,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
  });

  const formatNoteTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return format(parseISO(dateStr), 'dd/MM HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <View style={st.container}>
      {/* ── Toolbar: Header & Search ── */}
      <View style={st.toolbar}>
        <View style={st.toolbarTop}>
          <View style={st.sheetBadge}>
            <FileSpreadsheet size={15} color={isDark ? '#A7F3D0' : '#047857'} />
            <Text style={st.sheetBadgeText}>Módulo Excel / Tabla</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {loadingNotes && (
              <ActivityIndicator size="small" color={c.primary} />
            )}
            <Text style={st.statsCounter}>
              {filteredTickets.length} de {tickets.length} leads
            </Text>
          </View>
        </View>

        {/* Real-time Search Input */}
        <View style={st.searchContainer}>
          <Search size={16} color={c.textMuted} />
          <TextInput
            style={st.searchInput}
            placeholder="Buscar por nombre, teléfono, nota o etiqueta..."
            placeholderTextColor={c.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={st.clearSearchBtn}
            >
              <X size={15} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Tag / Stage Quick Filter ── */}
      <View style={st.filterScroll}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.filterScrollContent}
        >
          <TouchableOpacity
            style={[
              st.filterPill,
              selectedTagFilter === 'all' && st.filterPillActive,
            ]}
            onPress={() => setSelectedTagFilter('all')}
          >
            <Text
              style={[
                st.filterPillText,
                {
                  color: selectedTagFilter === 'all' ? '#090D16' : c.text,
                },
              ]}
            >
              Todas las etapas
            </Text>
          </TouchableOpacity>

          {tags.map((tg) => {
            const isActive = selectedTagFilter === tg.id;
            return (
              <TouchableOpacity
                key={tg.id}
                style={[
                  st.filterPill,
                  isActive && {
                    backgroundColor: tg.color || c.primary,
                    borderColor: tg.color || c.primary,
                  },
                ]}
                onPress={() => setSelectedTagFilter(tg.id)}
              >
                <View
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 3.5,
                    backgroundColor: isActive ? '#090D16' : (tg.color || c.primary),
                  }}
                />
                <Text
                  style={[
                    st.filterPillText,
                    {
                      color: isActive ? '#090D16' : c.text,
                    },
                  ]}
                >
                  {tg.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Excel Bidirectional Grid (Horizontal & Vertical) ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={st.gridWrapper}
      >
        <View style={{ width: TOTAL_GRID_WIDTH }}>
          {/* Sticky-feel Column Header Row */}
          <View style={st.headerRow}>
            <View style={[st.headerCell, { width: COL_WIDTH.index }]}>
              <Text style={st.indexText}>#</Text>
            </View>
            <View style={[st.headerCell, { width: COL_WIDTH.name }]}>
              <Text style={st.headerText}>Contacto / Nombre</Text>
            </View>
            <View style={[st.headerCell, { width: COL_WIDTH.phone }]}>
              <Text style={st.headerText}>Teléfono</Text>
            </View>
            <View style={[st.headerCell, { width: COL_WIDTH.note }]}>
              <Text style={st.headerText}>Última Nota Guardada</Text>
            </View>
            <View style={[st.headerCell, { width: COL_WIDTH.tags }]}>
              <Text style={st.headerText}>Etiquetas</Text>
            </View>
            <View style={[st.headerCell, { width: COL_WIDTH.dept }]}>
              <Text style={st.headerText}>Departamento</Text>
            </View>
            <View style={[st.headerCell, { width: COL_WIDTH.actions }]}>
              <Text style={st.headerText}>Acciones</Text>
            </View>
          </View>

          {/* Table Rows Vertical Scroll */}
          <ScrollView
            showsVerticalScrollIndicator={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[c.primary]}
              />
            }
            contentContainerStyle={{ paddingBottom: spacing.xl * 3 }}
          >
            {filteredTickets.length > 0 ? (
              filteredTickets.map((ticket, index) => {
                const contact = ticket.contact;
                const queue = ticket.queue;
                const ticketTags: any[] = ticket.tags || [];
                const note = notesCache[ticket.id];
                const isEven = index % 2 === 0;

                return (
                  <TouchableOpacity
                    key={ticket.id}
                    style={[
                      st.tableRow,
                      isEven ? st.tableRowEven : st.tableRowOdd,
                    ]}
                    activeOpacity={0.7}
                    onPress={() => handleRowClick(ticket)}
                  >
                    {/* Index */}
                    <View style={[st.cell, { width: COL_WIDTH.index }]}>
                      <Text style={st.indexText}>{index + 1}</Text>
                    </View>

                    {/* Contact Name */}
                    <View style={[st.cell, { width: COL_WIDTH.name }]}>
                      <View style={st.nameRow}>
                        <View
                          style={[
                            st.initialCircle,
                            {
                              backgroundColor: queue?.color || c.primary,
                            },
                          ]}
                        >
                          <Text style={st.initialText}>
                            {(contact?.name || 'C').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text
                          style={st.contactNameText}
                          numberOfLines={1}
                        >
                          {contact?.name || 'Sin nombre'}
                        </Text>
                      </View>
                    </View>

                    {/* Phone */}
                    <View style={[st.cell, { width: COL_WIDTH.phone }]}>
                      <View style={st.phoneCellRow}>
                        <Phone size={12} color={c.textMuted} />
                        <Text style={st.phoneText} numberOfLines={1}>
                          +{contact?.number || '—'}
                        </Text>
                      </View>
                    </View>

                    {/* Last Saved Note */}
                    <View style={[st.cell, { width: COL_WIDTH.note }]}>
                      {note ? (
                        <View style={st.noteWrapper}>
                          <View style={st.noteHeaderLine}>
                            <StickyNote
                              size={11}
                              color={isDark ? '#FBBF24' : '#B45309'}
                            />
                            <Text style={st.noteLabel}>
                              {note.user ? `Nota (${note.user})` : 'Nota Interna'}
                            </Text>
                            {note.createdAt && (
                              <Text style={st.noteDate}>
                                {formatNoteTime(note.createdAt)}
                              </Text>
                            )}
                          </View>
                          <Text
                            style={st.noteTextSnippet}
                            numberOfLines={2}
                          >
                            {note.text}
                          </Text>
                        </View>
                      ) : notesCache[ticket.id] === undefined ? (
                        <Text style={st.noNoteText}>Cargando nota...</Text>
                      ) : (
                        <Text style={st.noNoteText}>— Sin notas</Text>
                      )}
                    </View>

                    {/* Tags */}
                    <View style={[st.cell, { width: COL_WIDTH.tags }]}>
                      {ticketTags.length > 0 ? (
                        <View style={st.tagsScroll}>
                          {ticketTags.map((tg) => (
                            <View
                              key={tg.id}
                              style={[
                                st.tagPill,
                                { backgroundColor: tg.color || c.primary },
                              ]}
                            >
                              <Text style={st.tagPillText} numberOfLines={1}>
                                {tg.name}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <Text style={st.noNoteText}>— Sin etiquetas</Text>
                      )}
                    </View>

                    {/* Department */}
                    <View style={[st.cell, { width: COL_WIDTH.dept }]}>
                      {queue ? (
                        <View
                          style={[
                            st.deptBadge,
                            {
                              backgroundColor: (queue.color || c.primary) + '18',
                              borderColor: queue.color || c.primary,
                            },
                          ]}
                        >
                          <View
                            style={[
                              st.deptDot,
                              { backgroundColor: queue.color || c.primary },
                            ]}
                          />
                          <Text
                            style={[
                              st.deptText,
                              { color: queue.color || c.primary },
                            ]}
                            numberOfLines={1}
                          >
                            {queue.name}
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            st.deptBadge,
                            {
                              backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                              borderColor: c.border,
                            },
                          ]}
                        >
                          <Text style={[st.deptText, { color: c.textMuted }]}>
                            Sin depto
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Actions */}
                    <View style={[st.cell, { width: COL_WIDTH.actions }]}>
                      <View style={st.actionsRow}>
                        {/* Preview Conversation Modal */}
                        <TouchableOpacity
                          style={st.actionBtn}
                          onPress={() => handleRowClick(ticket)}
                          accessibilityLabel="Ver conversación"
                        >
                          <Eye size={14} color={c.text} />
                        </TouchableOpacity>

                        {/* Direct Go to Chat / Reply */}
                        <TouchableOpacity
                          style={st.actionBtnChat}
                          onPress={() => handleGoToChatDirect(ticket.id)}
                          accessibilityLabel="Contestar"
                        >
                          <MessageCircle size={14} color="#090D16" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={[st.emptyGrid, { width: TOTAL_GRID_WIDTH }]}>
                <FileSpreadsheet size={48} color={c.textMuted} />
                <Text style={st.emptyGridTitle}>
                  No se encontraron registros
                </Text>
                <Text style={st.emptyGridSub}>
                  {searchQuery
                    ? `No hay coincidencias con la búsqueda "${searchQuery}".`
                    : 'No hay leads en el departamento o etapa seleccionada.'}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>

      {/* ── Conversation Preview Modal ── */}
      <ConversationPreviewModal
        visible={previewModalOpen}
        ticket={selectedTicketForPreview}
        onClose={() => {
          setPreviewModalOpen(false);
          setSelectedTicketForPreview(null);
        }}
      />
    </View>
  );
}
