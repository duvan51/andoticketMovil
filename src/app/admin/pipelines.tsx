// src/app/admin/pipelines.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ActivityIndicator,
  Alert, Modal, TextInput, ScrollView, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius } from '../../theme/colors';
import api from '../../services/api';
import {
  ArrowLeft, Plus, Pencil, Trash2, X, Check, Kanban
} from 'lucide-react-native';

// ─── Palette ───────────────────────────────────────────────────────────────
const COLOR_PALETTE = [
  '#10B981', '#3B82F6', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6366F1', '#14B8A6', '#E11D48',
  '#0EA5E9', '#D97706', '#7C3AED', '#059669',
];

// ─── Tag Form Modal ─────────────────────────────────────────────────────────
function TagFormModal({
  visible, onClose, onSaved, initialTag, c,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialTag: any | null;
  c: typeof colors['dark'];
}) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialTag) {
      setName(initialTag.name || '');
      setSelectedColor(initialTag.color || COLOR_PALETTE[0]);
    } else {
      setName('');
      setSelectedColor(COLOR_PALETTE[0]);
    }
  }, [initialTag, visible]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atención', 'El nombre no puede estar vacío.');
      return;
    }
    try {
      setSaving(true);
      if (initialTag?.id) {
        await api.put(`/tags/${initialTag.id}`, { name: name.trim(), color: selectedColor });
      } else {
        await api.post('/tags', { name: name.trim(), color: selectedColor });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error('Error saving tag:', err);
      Alert.alert('Error', 'No se pudo guardar. Intente de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[mSt.overlay]}>
        <View style={[mSt.box, { backgroundColor: c.card, borderColor: c.border }]}>
          {/* Header */}
          <View style={[mSt.hdr, { borderBottomColor: c.border }]}>
            <Text style={[mSt.hdrTitle, { color: c.text }]}>
              {initialTag ? 'Editar Pipeline' : 'Nuevo Pipeline'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={22} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={mSt.body}>
            {/* Preview pill */}
            <View style={mSt.previewRow}>
              <View style={[mSt.previewPill, { backgroundColor: selectedColor }]}>
                <Text style={mSt.previewPillTxt}>{name || 'Vista previa'}</Text>
              </View>
            </View>

            {/* Name */}
            <Text style={[mSt.label, { color: c.textMuted }]}>Nombre de la etapa</Text>
            <TextInput
              style={[mSt.input, { backgroundColor: c.background, borderColor: c.border, color: c.text }]}
              placeholder="Ej: Negociación, Calificado, Ganado..."
              placeholderTextColor={c.textMuted}
              value={name}
              onChangeText={setName}
              autoFocus
            />

            {/* Color picker */}
            <Text style={[mSt.label, { color: c.textMuted }]}>Color de la etapa</Text>
            <View style={mSt.colorGrid}>
              {COLOR_PALETTE.map((clr) => (
                <TouchableOpacity
                  key={clr}
                  style={[
                    mSt.colorDot,
                    { backgroundColor: clr },
                    selectedColor === clr && mSt.colorDotSelected,
                  ]}
                  onPress={() => setSelectedColor(clr)}
                  activeOpacity={0.8}
                >
                  {selectedColor === clr && <Check size={15} color="#fff" />}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={[mSt.actions, { borderTopColor: c.border }]}>
            <TouchableOpacity
              style={[mSt.cancelBtn, { borderColor: c.border }]}
              onPress={onClose}
            >
              <Text style={[mSt.cancelTxt, { color: c.textMuted }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[mSt.saveBtn, { backgroundColor: c.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <><Check size={16} color="#fff" /><Text style={mSt.saveTxt}>Guardar</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const mSt = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  box: {
    width: '100%',
    maxWidth: 380,
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
  hdrTitle: { fontSize: 17, fontWeight: '700' },
  body: { padding: spacing.md, paddingBottom: 0 },
  previewRow: { alignItems: 'center', marginBottom: spacing.lg },
  previewPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderRadius: borderRadius.xl,
    minWidth: 120,
    alignItems: 'center',
  },
  previewPillTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  input: {
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: spacing.lg,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  colorDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelTxt: { fontWeight: '600', fontSize: 14 },
  saveBtn: {
    flex: 1,
    height: 46,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  saveTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function AdminPipelinesScreen() {
  const { theme } = useAuth();
  const router = useRouter();
  const c = colors[theme];

  const [tags, setTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<any | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/tags');
      setTags(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching tags:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTags(); }, [fetchTags]);

  const handleDelete = (tag: any) => {
    Alert.alert(
      `Eliminar "${tag.name}"`,
      'Esta acción no se puede deshacer. Se eliminará el vínculo de este pipeline con todos los tickets.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/tags/${tag.id}`);
              setTags(prev => prev.filter(t => t.id !== tag.id));
            } catch {
              Alert.alert('Error', 'No se pudo eliminar el pipeline.');
            }
          },
        },
      ]
    );
  };

  const st = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.background },
    // Custom header
    header: {
      height: 60,
      backgroundColor: c.card,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: spacing.md,
    },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: c.text },
    addBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Content
    content: { flex: 1 },
    // Empty
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    emptyIcon: { marginBottom: spacing.md },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.textMuted },
    emptySubtitle: { fontSize: 14, color: c.textMuted, textAlign: 'center', marginTop: spacing.sm },
    emptyAddBtn: {
      marginTop: spacing.xl,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: c.primary,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
    },
    emptyAddTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },
    // List
    listContent: { padding: spacing.md, gap: spacing.sm },
    // Card
    tagCard: {
      backgroundColor: c.card,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.md,
      overflow: 'hidden',
    },
    colorBar: {
      width: 6,
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      borderTopLeftRadius: borderRadius.lg,
      borderBottomLeftRadius: borderRadius.lg,
    },
    tagContent: { flex: 1, marginLeft: spacing.sm },
    tagName: { fontSize: 16, fontWeight: '700', color: c.text },
    tagColorHex: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    colorCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    actions: { flexDirection: 'row', gap: spacing.sm },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.border,
    },
    deleteBtn: { backgroundColor: '#FEE2E2' },
    // Stats bar
    statsBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      backgroundColor: c.card,
    },
    statsTxt: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
  });

  return (
    <SafeAreaView style={st.safeArea}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Gestión de Pipelines</Text>
        <TouchableOpacity
          style={st.addBtn}
          onPress={() => { setEditingTag(null); setFormOpen(true); }}
          activeOpacity={0.8}
        >
          <Plus size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      {!loading && (
        <View style={st.statsBar}>
          <Kanban size={14} color={c.primary} />
          <Text style={st.statsTxt}>
            {tags.length} etapa{tags.length !== 1 ? 's' : ''} configurada{tags.length !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Body */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : tags.length === 0 ? (
        <View style={st.empty}>
          <Kanban size={64} color={c.border} style={st.emptyIcon} />
          <Text style={st.emptyTitle}>Sin pipelines</Text>
          <Text style={st.emptySubtitle}>
            Crea las etapas de tu embudo de ventas. Cada etapa será una columna en el tablero Kanban.
          </Text>
          <TouchableOpacity
            style={st.emptyAddBtn}
            onPress={() => { setEditingTag(null); setFormOpen(true); }}
            activeOpacity={0.8}
          >
            <Plus size={18} color="#fff" />
            <Text style={st.emptyAddTxt}>Crear primer pipeline</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={st.listContent}
          renderItem={({ item: tag }) => (
            <View style={st.tagCard}>
              {/* Left color bar */}
              <View style={[st.colorBar, { backgroundColor: tag.color }]} />

              {/* Color circle */}
              <View style={[st.colorCircle, { backgroundColor: tag.color }]} />

              {/* Info */}
              <View style={st.tagContent}>
                <Text style={st.tagName}>{tag.name}</Text>
                <Text style={st.tagColorHex}>{tag.color}</Text>
              </View>

              {/* Actions */}
              <View style={st.actions}>
                <TouchableOpacity
                  style={st.actionBtn}
                  onPress={() => { setEditingTag(tag); setFormOpen(true); }}
                  activeOpacity={0.7}
                >
                  <Pencil size={16} color={c.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.actionBtn, st.deleteBtn]}
                  onPress={() => handleDelete(tag)}
                  activeOpacity={0.7}
                >
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Form Modal */}
      <TagFormModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={fetchTags}
        initialTag={editingTag}
        c={c}
      />
    </SafeAreaView>
  );
}
