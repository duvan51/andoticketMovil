// src/app/(tabs)/settings.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Switch, TextInput
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius } from '../../theme/colors';
import {
  User, Mail, LogOut, Sun, Moon, ChevronRight, Link2, Globe, TrendingUp, Users, BookOpen, Zap, FileSignature, Settings, User2
} from 'lucide-react-native';

import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SettingsScreen() {
  const { user, handleLogout, theme, toggleTheme } = useAuth();
  const router = useRouter();
  const c = colors[theme];

  const [useSignature, setUseSignature] = useState(false);
  const [customSignature, setCustomSignature] = useState('');
  const [savingSignature, setSavingSignature] = useState(false);

  useEffect(() => {
    const loadSignatureSettings = async () => {
      try {
        const savedUseSig = await AsyncStorage.getItem('@whaticket:useSignature');
        const savedCustomSig = await AsyncStorage.getItem('@whaticket:customSignature');
        setUseSignature(savedUseSig === 'true');
        setCustomSignature(savedCustomSig || `*~${user?.name || 'Asesor'}:~*`);
      } catch (err) {
        console.error('Error loading signature settings:', err);
      }
    };
    loadSignatureSettings();
  }, [user?.name]);

  const handleToggleSignature = async (val: boolean) => {
    setUseSignature(val);
    await AsyncStorage.setItem('@whaticket:useSignature', val ? 'true' : 'false');
  };

  const handleSaveCustomSignature = async () => {
    try {
      setSavingSignature(true);
      await AsyncStorage.setItem('@whaticket:customSignature', customSignature.trim());
      Alert.alert('Éxito', 'Firma guardada correctamente.');
    } catch (err) {
      console.error('Error saving signature:', err);
      Alert.alert('Error', 'No se pudo guardar la firma.');
    } finally {
      setSavingSignature(false);
    }
  };

  const isAdmin =
    user?.profile?.toUpperCase() === 'ADMIN' ||
    user?.profile?.toUpperCase() === 'SUPERADMIN';

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Está seguro de que desea cerrar su sesión actual?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            try { await handleLogout(); }
            catch { Alert.alert('Error', 'No se pudo cerrar la sesión.'); }
          },
        },
      ]
    );
  };

  const st = buildStyles(c);

  return (
    <View style={st.container}>
      {/* ── Top Header Bar (App Title + Advisor Badge) ── */}
      <View style={[st.topHeaderBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={st.appBrandRow}>
          <Settings size={20} color={c.primary} />
          <Text style={[st.appBrandText, { color: c.text }]}>Ajustes</Text>
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scrollContent}>

      {/* ── Profile ── */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Mi Perfil</Text>
        <View style={st.card}>
          <View style={st.profileHeader}>
            <View style={st.avatar}>
              <Text style={{ color: c.primary, fontSize: 22, fontWeight: '700' }}>
                {user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={st.profileDetails}>
              <Text style={st.profileName}>{user?.name || 'Usuario'}</Text>
              <Text style={st.profileRole}>
                {isAdmin ? 'Administrador' : 'Agente'}
              </Text>
            </View>
          </View>
          <View style={st.divider} />
          <View style={st.row}>
            <Mail size={18} color={c.textMuted} />
            <Text style={st.rowText}>{user?.email || 'No disponible'}</Text>
          </View>
        </View>
      </View>

      {/* ── Queues ── */}
      {user?.queues && user.queues.length > 0 && (
        <View style={st.section}>
          <Text style={st.sectionTitle}>Mis Colas / Departamentos</Text>
          <View style={st.queuesContainer}>
            {user.queues.map((q: any) => (
              <View key={q.id} style={[st.queueBadge, { backgroundColor: q.color || c.primary }]}>
                <Text style={st.queueBadgeText}>{q.name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}



      {/* ── Admin Section ── */}
      {isAdmin && (
        <View style={st.section}>
          <Text style={st.sectionTitle}>Administración</Text>
          <View style={st.menuCard}>
            {/* Pipeline manager row */}
            <TouchableOpacity
              style={st.menuRow}
              onPress={() => router.push('/admin/pipelines')}
              activeOpacity={0.7}
            >
              <View style={[st.menuIconBox, { backgroundColor: c.primaryLight }]}>
                <TrendingUp size={20} color={c.primary} />
              </View>
              <View style={st.menuText}>
                <Text style={st.menuRowTitle}>Gestión de Pipelines</Text>
                <Text style={st.menuRowSubtitle}>Crear, editar y eliminar etapas del embudo de ventas</Text>
              </View>
              <ChevronRight size={18} color={c.textMuted} />
            </TouchableOpacity>

            {/* Divider */}
            <View style={[st.menuDivider, { backgroundColor: c.border }]} />

            {/* Connections row */}
            <TouchableOpacity
              style={st.menuRow}
              onPress={() => router.push('/admin/connections')}
              activeOpacity={0.7}
            >
              <View style={[st.menuIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Link2 size={20} color="#3B82F6" />
              </View>
              <View style={st.menuText}>
                <Text style={st.menuRowTitle}>Conexiones de WhatsApp</Text>
                <Text style={st.menuRowSubtitle}>Conectar, desconectar y escanear QR de canales</Text>
              </View>
              <ChevronRight size={18} color={c.textMuted} />
            </TouchableOpacity>

            {/* Divider */}
            <View style={[st.menuDivider, { backgroundColor: c.border }]} />

            {/* Users management row */}
            <TouchableOpacity
              style={st.menuRow}
              onPress={() => router.push('/admin/users')}
              activeOpacity={0.7}
            >
              <View style={[st.menuIconBox, { backgroundColor: '#F3E8FF' }]}>
                <Users size={20} color="#7C3AED" />
              </View>
              <View style={st.menuText}>
                <Text style={st.menuRowTitle}>Gestión de Usuarios</Text>
                <Text style={st.menuRowSubtitle}>Crear, editar y eliminar usuarios del sistema</Text>
              </View>
              <ChevronRight size={18} color={c.textMuted} />
            </TouchableOpacity>

            {/* Divider */}
            <View style={[st.menuDivider, { backgroundColor: c.border }]} />

            {/* Catalog integration row */}
            <TouchableOpacity
              style={st.menuRow}
              onPress={() => router.push('/admin/catalog')}
              activeOpacity={0.7}
            >
              <View style={[st.menuIconBox, { backgroundColor: '#FEF3C7' }]}>
                <BookOpen size={20} color="#D97706" />
              </View>
              <View style={st.menuText}>
                <Text style={st.menuRowTitle}>Integración de Catálogo</Text>
                <Text style={st.menuRowSubtitle}>Configurar la URL del API de tu catálogo de andoPages</Text>
              </View>
              <ChevronRight size={18} color={c.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Chat Settings ── */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Chat y Firma</Text>
        <View style={st.menuCard}>
          <TouchableOpacity
            style={st.menuRow}
            onPress={() => router.push('/admin/quick-answers' as any)}
            activeOpacity={0.7}
          >
            <View style={[st.menuIconBox, { backgroundColor: c.primaryLight }]}>
              <Zap size={20} color={c.primary} />
            </View>
            <View style={st.menuText}>
              <Text style={st.menuRowTitle}>Respuestas Rápidas</Text>
              <Text style={st.menuRowSubtitle}>Gestionar respuestas guardadas privadas y compartidas</Text>
            </View>
            <ChevronRight size={18} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Signature Configuration */}
        <View style={[st.card, { marginTop: spacing.md }]}>
          <View style={st.row}>
            <FileSignature size={20} color={c.primary} />
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={st.themeLabel}>Firmar Mensajes</Text>
              <Text style={st.themeSubLabel}>
                Agregar tu firma automáticamente en cada mensaje saliente
              </Text>
            </View>
            <Switch
              value={useSignature}
              onValueChange={handleToggleSignature}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor={useSignature ? '#fff' : c.textMuted}
              ios_backgroundColor={c.border}
            />
          </View>

          {useSignature && (
            <View style={{ marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: c.border }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: c.text, marginBottom: spacing.xs }}>
                Personalizar Firma:
              </Text>
              <TextInput
                style={[st.input, { color: c.text, borderColor: c.border }]}
                value={customSignature}
                onChangeText={setCustomSignature}
                placeholder="*~Nombre del Asesor:~*"
                placeholderTextColor={c.textMuted}
              />
              <TouchableOpacity
                style={[st.saveButton, { backgroundColor: c.primary }]}
                onPress={handleSaveCustomSignature}
                disabled={savingSignature}
              >
                <Text style={st.saveButtonText}>
                  {savingSignature ? 'Guardando...' : 'Guardar Firma'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* ── Appearance ── */}
      <View style={st.section}>
        <Text style={st.sectionTitle}>Apariencia</Text>
        <View style={st.card}>
          <View style={st.row}>
            {theme === 'dark' ? <Moon size={20} color={c.primary} /> : <Sun size={20} color={c.primary} />}
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={st.themeLabel}>{theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}</Text>
              <Text style={st.themeSubLabel}>
                {theme === 'dark' ? 'La interfaz usa colores oscuros' : 'La interfaz usa colores claros'}
              </Text>
            </View>
            <Switch
              value={theme === 'light'}
              onValueChange={toggleTheme}
              trackColor={{ false: c.border, true: c.primary }}
              thumbColor={theme === 'light' ? '#fff' : c.textMuted}
              ios_backgroundColor={c.border}
            />
          </View>
        </View>
      </View>

      {/* ── Logout ── */}
      <TouchableOpacity style={st.logoutButton} onPress={handleSignOut} activeOpacity={0.8}>
        <LogOut size={20} color="#FFFFFF" />
        <Text style={st.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

    </ScrollView>
    </View>
  );
}

function buildStyles(c: typeof colors['dark']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    topHeaderBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
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
    scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
    section: { marginBottom: spacing.lg },
    sectionTitle: {
      fontSize: 12, fontWeight: '700', color: c.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.8,
      marginBottom: spacing.sm, paddingLeft: spacing.xs,
    },
    card: {
      backgroundColor: c.card, borderRadius: borderRadius.lg, padding: spacing.md,
      borderWidth: 1, borderColor: c.border, elevation: 2,
    },
    catalogInstructions: {
      fontSize: 13,
      color: c.textMuted,
      lineHeight: 18,
      marginBottom: spacing.md,
    },
    input: {
      height: 44,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      fontSize: 14,
      backgroundColor: c.background,
      marginBottom: spacing.md,
    },
    saveButton: {
      height: 44,
      borderRadius: borderRadius.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#090D16',
      fontSize: 15,
      fontWeight: '700',
    },
    menuCard: {
      backgroundColor: c.card, borderRadius: borderRadius.lg,
      borderWidth: 1, borderColor: c.border, overflow: 'hidden',
    },
    menuRow: {
      flexDirection: 'row', alignItems: 'center',
      padding: spacing.md, gap: spacing.md,
    },
    menuIconBox: {
      width: 42, height: 42, borderRadius: borderRadius.md,
      justifyContent: 'center', alignItems: 'center',
    },
    menuText: { flex: 1 },
    menuRowTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    menuRowSubtitle: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    menuDivider: { height: 1, marginHorizontal: spacing.md },
    // Profile
    profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    avatar: {
      width: 60, height: 60, borderRadius: 30, backgroundColor: c.primaryLight,
      justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
    },
    profileDetails: { flex: 1 },
    profileName: { fontSize: 18, fontWeight: '700', color: c.text },
    profileRole: { fontSize: 13, color: c.primary, fontWeight: '600', marginTop: 2 },
    divider: { height: 1, backgroundColor: c.border, marginVertical: spacing.md },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    rowText: { fontSize: 15, color: c.text },
    // Queues
    queuesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    queueBadge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: borderRadius.md },
    queueBadgeText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    // Theme
    themeLabel: { fontSize: 15, fontWeight: '700', color: c.text },
    themeSubLabel: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    // Logout
    logoutButton: {
      flexDirection: 'row', backgroundColor: '#EF4444', height: 52,
      borderRadius: borderRadius.lg, justifyContent: 'center', alignItems: 'center',
      gap: spacing.sm, marginTop: spacing.md, elevation: 3,
    },
    logoutButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  });
}
