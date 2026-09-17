// src/app/admin/catalog.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { ArrowLeft, BookOpen, ExternalLink, HelpCircle } from 'lucide-react-native';
import { getCompanyCatalogUrl, saveCompanyCatalogUrl } from '../../services/catalog';

export default function CatalogAdminScreen() {
  const router = useRouter();
  const { theme } = useAuth();
  const c = colors[theme];

  const [catalogUrl, setCatalogUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadCatalogUrl = async () => {
      try {
        const savedUrl = await getCompanyCatalogUrl();
        if (savedUrl) {
          setCatalogUrl(savedUrl);
        }
      } catch (err) {
        console.error('Error loading catalog URL:', err);
      }
    };
    loadCatalogUrl();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await saveCompanyCatalogUrl(catalogUrl);
      Alert.alert('Éxito', 'La URL del catálogo de andoPages se ha guardado correctamente.');
    } catch (err) {
      console.error('Error saving catalog URL:', err);
      Alert.alert('Error', 'No se pudo guardar la URL del catálogo.');
    } finally {
      setSaving(false);
    }
  };

  const st = buildStyles(c);

  return (
    <SafeAreaView style={st.safeArea}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Integración de Catálogo</Text>
      </View>

      <ScrollView style={st.container} contentContainerStyle={st.scrollContent}>
        {/* Card de Configuración */}
        <View style={st.card}>
          <Text style={st.cardTitle}>URL del Catálogo (andoPages)</Text>
          <Text style={st.catalogInstructions}>
            Introduce la URL del API de tu catálogo de andoPages para habilitar la consulta y envío de productos directo en el chat.
          </Text>
          <TextInput
            style={[st.input, { color: c.text, borderColor: c.border }]}
            placeholder="https://desarrollandoando.fun/api/catalog/..."
            placeholderTextColor={c.textMuted}
            value={catalogUrl}
            onChangeText={setCatalogUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[st.saveButton, { backgroundColor: c.primary }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#090D16" />
            ) : (
              <Text style={st.saveButtonText}>Guardar Integración</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Guía de Ayuda */}
        <View style={st.helpCard}>
          <View style={st.helpHeader}>
            <HelpCircle size={20} color={c.primary} />
            <Text style={st.helpTitle}>¿Dónde obtener esta URL?</Text>
          </View>
          <View style={st.divider} />
          
          <Text style={st.stepTitle}>Paso 1: Inicia sesión en andoPages</Text>
          <Text style={st.stepDescription}>
            Ve a tu panel de control de andoPages y dirígete al módulo de Catálogo o Ajustes de Desarrollador.
          </Text>

          <Text style={st.stepTitle}>Paso 2: Copia la URL del API</Text>
          <Text style={st.stepDescription}>
            Busca la sección llamada "Integración de Catálogo" o "URL del API del Catálogo". Debe tener un formato similar a:{"\n"}
            <Text style={st.codeText}>https://desarrollandoando.fun/api/catalog/YOUR_ID</Text>
          </Text>

          <Text style={st.stepTitle}>Paso 3: Guarda y usa</Text>
          <Text style={st.stepDescription}>
            Pega la URL copiada en el campo superior y presiona "Guardar Integración". Al hacerlo, los agentes podrán ver los productos y enviárselos a los clientes en los chats de manera automática.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

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
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
    card: {
      backgroundColor: c.card, borderRadius: borderRadius.lg, padding: spacing.md,
      borderWidth: 1, borderColor: c.border, elevation: 2, marginBottom: spacing.md,
    },
    cardTitle: {
      fontSize: 16, fontWeight: '700', color: c.text, marginBottom: spacing.xs,
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
    helpCard: {
      backgroundColor: c.card, borderRadius: borderRadius.lg, padding: spacing.md,
      borderWidth: 1, borderColor: c.border,
    },
    helpHeader: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    },
    helpTitle: {
      fontSize: 15, fontWeight: '700', color: c.text,
    },
    divider: {
      height: 1, backgroundColor: c.border, marginVertical: spacing.md,
    },
    stepTitle: {
      fontSize: 13, fontWeight: '700', color: c.text, marginTop: spacing.sm,
    },
    stepDescription: {
      fontSize: 13, color: c.textMuted, lineHeight: 18, marginTop: 4,
    },
    codeText: {
      fontFamily: 'monospace', fontSize: 11, color: c.primary, fontWeight: 'bold',
    }
  });
}
