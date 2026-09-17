// src/app/admin/users.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ActivityIndicator,
  Alert, Modal, TextInput, ScrollView, FlatList, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius } from '../../theme/colors';
import api from '../../services/api';
import {
  ArrowLeft, Plus, Pencil, Trash2, X, Check, User, Mail, Shield, Eye, EyeOff
} from 'lucide-react-native';

// ─── User Form Modal ─────────────────────────────────────────────────────────
function UserFormModal({
  visible, onClose, onSaved, initialUser, queues, c,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialUser: any | null;
  queues: any[];
  c: typeof colors['dark'];
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [profile, setProfile] = useState('user');
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const isEditing = !!initialUser;

  useEffect(() => {
    if (initialUser) {
      setName(initialUser.name || '');
      setEmail(initialUser.email || '');
      setPassword('');
      setProfile(initialUser.profile || 'user');
      setSelectedQueueIds(initialUser.queues?.map((q: any) => q.id) || []);
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setProfile('user');
      setSelectedQueueIds([]);
    }
    setShowPassword(false);
  }, [initialUser, visible]);

  const toggleQueue = (queueId: number) => {
    setSelectedQueueIds(prev =>
      prev.includes(queueId)
        ? prev.filter(id => id !== queueId)
        : [...prev, queueId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atención', 'El nombre es obligatorio.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Atención', 'El email es obligatorio.');
      return;
    }
    if (!isEditing && !password.trim()) {
      Alert.alert('Atención', 'La contraseña es obligatoria para nuevos usuarios.');
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: name.trim(),
        email: email.trim(),
        profile,
        queueIds: selectedQueueIds,
      };

      if (password.trim()) {
        payload.password = password.trim();
      }

      if (isEditing) {
        await api.put(`/users/${initialUser.id}`, payload);
        Alert.alert('Éxito', 'Usuario actualizado.');
      } else {
        await api.post('/users', payload);
        Alert.alert('Éxito', 'Usuario creado.');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'No se pudo guardar el usuario.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const st = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    content: {
      backgroundColor: c.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      maxHeight: '90%', borderWidth: 1, borderColor: c.border,
    },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      padding: spacing.md, borderBottomWidth: 1, borderBottomColor: c.border,
      backgroundColor: c.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    },
    title: { fontSize: 18, fontWeight: '700', color: c.text },
    label: { fontSize: 13, fontWeight: '700', color: c.textMuted, marginTop: spacing.md, marginBottom: 6 },
    input: {
      backgroundColor: c.card, borderWidth: 1, borderColor: c.border,
      borderRadius: borderRadius.md, paddingHorizontal: spacing.md,
      height: 46, fontSize: 15, color: c.text,
    },
    passwordRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    },
    profileRow: {
      flexDirection: 'row', gap: spacing.sm, marginTop: 4,
    },
    profileBtn: {
      flex: 1, height: 42, borderRadius: borderRadius.md,
      borderWidth: 1, borderColor: c.border, backgroundColor: c.card,
      justifyContent: 'center', alignItems: 'center',
    },
    profileBtnActive: {
      backgroundColor: c.primary, borderColor: c.primary,
    },
    profileBtnText: { fontSize: 13, fontWeight: '600', color: c.textMuted },
    profileBtnTextActive: { color: '#090D16', fontWeight: '700' },
    queueRow: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingVertical: 10, paddingHorizontal: spacing.sm,
      borderRadius: borderRadius.sm, marginBottom: 4,
    },
    queueDot: { width: 12, height: 12, borderRadius: 6 },
    queueName: { flex: 1, fontSize: 14, color: c.text },
    checkBox: {
      width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: c.border,
      justifyContent: 'center', alignItems: 'center',
    },
    checkBoxActive: { backgroundColor: c.primary, borderColor: c.primary },
    saveBtn: {
      height: 50, borderRadius: borderRadius.md, backgroundColor: c.primary,
      justifyContent: 'center', alignItems: 'center', marginTop: spacing.lg,
    },
    saveBtnText: { color: '#090D16', fontSize: 16, fontWeight: '700' },
  });

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={st.overlay}>
        <View style={st.content}>
          <View style={st.header}>
            <Text style={st.title}>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
            {/* Name */}
            <Text style={st.label}>NOMBRE</Text>
            <TextInput
              style={st.input}
              placeholder="Nombre completo"
              placeholderTextColor={c.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Email */}
            <Text style={st.label}>EMAIL</Text>
            <TextInput
              style={st.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={c.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {/* Password */}
            <Text style={st.label}>
              {isEditing ? 'CONTRASEÑA (dejar vacío para no cambiar)' : 'CONTRASEÑA'}
            </Text>
            <View style={st.passwordRow}>
              <TextInput
                style={[st.input, { flex: 1 }]}
                placeholder={isEditing ? '••••••••' : 'Contraseña'}
                placeholderTextColor={c.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={[st.profileBtn, { flex: 0, width: 46 }]}
                onPress={() => setShowPassword(v => !v)}
              >
                {showPassword
                  ? <EyeOff size={18} color={c.textMuted} />
                  : <Eye size={18} color={c.textMuted} />
                }
              </TouchableOpacity>
            </View>

            {/* Profile/Role */}
            <Text style={st.label}>ROL</Text>
            <View style={st.profileRow}>
              {['user', 'admin'].map(role => (
                <TouchableOpacity
                  key={role}
                  style={[st.profileBtn, profile === role && st.profileBtnActive]}
                  onPress={() => setProfile(role)}
                >
                  <Text style={[st.profileBtnText, profile === role && st.profileBtnTextActive]}>
                    {role === 'admin' ? 'Admin' : 'Agente'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Queues */}
            {queues.length > 0 && (
              <>
                <Text style={st.label}>COLAS / DEPARTAMENTOS</Text>
                {queues.map(q => {
                  const selected = selectedQueueIds.includes(q.id);
                  return (
                    <TouchableOpacity
                      key={q.id}
                      style={[st.queueRow, selected && { backgroundColor: c.primaryLight }]}
                      onPress={() => toggleQueue(q.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[st.queueDot, { backgroundColor: q.color || c.primary }]} />
                      <Text style={st.queueName}>{q.name}</Text>
                      <View style={[st.checkBox, selected && st.checkBoxActive]}>
                        {selected && <Check size={14} color="#fff" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}

            {/* Save */}
            <TouchableOpacity style={st.saveBtn} onPress={handleSave} disabled={saving} activeOpacity={0.8}>
              {saving
                ? <ActivityIndicator color="#090D16" />
                : <Text style={st.saveBtnText}>{isEditing ? 'Guardar Cambios' : 'Crear Usuario'}</Text>
              }
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════
export default function UsersAdminScreen() {
  const router = useRouter();
  const { user: currentUser, theme } = useAuth();
  const c = colors[theme];

  const [users, setUsers] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/users');
      setUsers(data?.users || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQueues = useCallback(async () => {
    try {
      const { data } = await api.get('/queue');
      setQueues(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching queues:', err);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchQueues();
  }, [fetchUsers, fetchQueues]);

  const handleDelete = (u: any) => {
    if (u.id === currentUser?.id) {
      Alert.alert('Atención', 'No puedes eliminar tu propia cuenta.');
      return;
    }
    Alert.alert(
      'Eliminar Usuario',
      `¿Estás seguro de que deseas eliminar a "${u.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/users/${u.id}`);
              fetchUsers();
              Alert.alert('Éxito', 'Usuario eliminado.');
            } catch (err: any) {
              const msg = err?.response?.data?.error || 'No se pudo eliminar el usuario.';
              Alert.alert('Error', msg);
            }
          },
        },
      ]
    );
  };

  const openEdit = (u: any) => {
    setEditingUser(u);
    setFormOpen(true);
  };

  const openCreate = () => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const getRoleBadge = (profile: string) => {
    const isAdmin = profile?.toUpperCase() === 'ADMIN' || profile?.toUpperCase() === 'SUPERADMIN';
    return {
      label: isAdmin ? 'Admin' : 'Agente',
      bg: isAdmin ? '#7C3AED22' : c.primaryLight,
      color: isAdmin ? '#7C3AED' : c.primary,
    };
  };

  const st = buildStyles(c);

  return (
    <SafeAreaView style={st.safeArea}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Gestión de Usuarios</Text>
        <TouchableOpacity style={st.addBtn} onPress={openCreate} activeOpacity={0.8}>
          <Plus size={20} color="#090D16" />
        </TouchableOpacity>
      </View>

      {/* User list */}
      {loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={st.listContent}
          renderItem={({ item }) => {
            const role = getRoleBadge(item.profile);
            const isSelf = item.id === currentUser?.id;
            return (
              <View style={st.userCard}>
                {/* Avatar + Info */}
                <View style={st.userRow}>
                  <View style={[st.avatar, { backgroundColor: role.bg }]}>
                    <Text style={[st.avatarText, { color: role.color }]}>
                      {item.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={st.userName} numberOfLines={1}>{item.name}</Text>
                      {isSelf && (
                        <View style={[st.selfBadge, { backgroundColor: c.primary + '22' }]}>
                          <Text style={[st.selfBadgeText, { color: c.primary }]}>Tú</Text>
                        </View>
                      )}
                    </View>
                    <Text style={st.userEmail} numberOfLines={1}>{item.email}</Text>
                    {/* Queues */}
                    {item.queues && item.queues.length > 0 && (
                      <View style={st.queuesList}>
                        {item.queues.map((q: any) => (
                          <View key={q.id} style={[st.queueTag, { backgroundColor: (q.color || c.primary) + '22' }]}>
                            <View style={[st.queueTagDot, { backgroundColor: q.color || c.primary }]} />
                            <Text style={[st.queueTagText, { color: q.color || c.primary }]}>{q.name}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>

                {/* Role badge + Actions */}
                <View style={st.cardFooter}>
                  <View style={[st.roleBadge, { backgroundColor: role.bg }]}>
                    <Shield size={12} color={role.color} />
                    <Text style={[st.roleBadgeText, { color: role.color }]}>{role.label}</Text>
                  </View>

                  <View style={st.actionRow}>
                    <TouchableOpacity style={st.editBtn} onPress={() => openEdit(item)} activeOpacity={0.7}>
                      <Pencil size={15} color={c.primary} />
                    </TouchableOpacity>
                    {!isSelf && (
                      <TouchableOpacity style={st.deleteBtn} onPress={() => handleDelete(item)} activeOpacity={0.7}>
                        <Trash2 size={15} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={st.emptyContainer}>
              <User size={48} color={c.border} />
              <Text style={st.emptyTitle}>Sin usuarios</Text>
              <Text style={st.emptySubtitle}>No hay usuarios registrados.</Text>
            </View>
          }
        />
      )}

      {/* Form Modal */}
      <UserFormModal
        visible={formOpen}
        onClose={() => { setFormOpen(false); setEditingUser(null); }}
        onSaved={fetchUsers}
        initialUser={editingUser}
        queues={queues}
        c={c}
      />
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function buildStyles(c: typeof colors['dark']) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.background },
    header: {
      height: 60, backgroundColor: c.card, flexDirection: 'row',
      alignItems: 'center', paddingHorizontal: spacing.md,
      borderBottomWidth: 1, borderBottomColor: c.border,
    },
    backBtn: { marginRight: spacing.sm, padding: spacing.xs },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: c.text },
    addBtn: {
      width: 40, height: 40, borderRadius: 20, backgroundColor: c.primary,
      justifyContent: 'center', alignItems: 'center',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: spacing.md },
    userCard: {
      backgroundColor: c.card, borderRadius: borderRadius.lg,
      padding: spacing.md, marginBottom: spacing.md,
      borderWidth: 1, borderColor: c.border,
    },
    userRow: {
      flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    avatar: {
      width: 44, height: 44, borderRadius: 22,
      justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontSize: 18, fontWeight: '700' },
    userName: { fontSize: 15, fontWeight: '700', color: c.text },
    userEmail: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    selfBadge: {
      paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8,
    },
    selfBadgeText: { fontSize: 10, fontWeight: '700' },
    queuesList: {
      flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6,
    },
    queueTag: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
    queueTagDot: { width: 6, height: 6, borderRadius: 3 },
    queueTagText: { fontSize: 10, fontWeight: '600' },
    cardFooter: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: c.border,
    },
    roleBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 5,
      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
    },
    roleBadgeText: { fontSize: 11, fontWeight: '700' },
    actionRow: { flexDirection: 'row', gap: spacing.sm },
    editBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.primary + '15', justifyContent: 'center', alignItems: 'center',
    },
    deleteBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: '#EF444415', justifyContent: 'center', alignItems: 'center',
    },
    emptyContainer: {
      flex: 1, justifyContent: 'center', alignItems: 'center',
      paddingVertical: spacing.xl * 2,
    },
    emptyTitle: {
      fontSize: 18, fontWeight: '700', color: c.text, marginTop: spacing.md,
    },
    emptySubtitle: {
      fontSize: 14, color: c.textMuted, marginTop: spacing.xs,
    },
  });
}
