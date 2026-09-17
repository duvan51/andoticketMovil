// src/app/(auth)/config.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { Link2, Check } from 'lucide-react-native';

export default function ConfigScreen() {
  const { apiUrl, configureApiUrl } = useAuth();
  const [urlInput, setUrlInput] = useState('');
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (apiUrl) {
      setUrlInput(apiUrl);
    }
  }, [apiUrl]);

  const handleSave = async () => {
    if (!urlInput.trim()) {
      Alert.alert('Error', 'Por favor ingrese la URL de su servidor Whaticket.');
      return;
    }

    // Basic URL validation
    if (!urlInput.startsWith('http://') && !urlInput.startsWith('https://')) {
      Alert.alert('Error', 'La URL debe comenzar con http:// o https://');
      return;
    }

    try {
      setSaving(true);
      await configureApiUrl(urlInput.trim());
      router.replace('/(auth)/login');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Link2 size={40} color={colors.dark.primary} />
          </View>
          <Text style={styles.title}>Configurar Servidor</Text>
          <Text style={styles.subtitle}>
            Conecte su dispositivo móvil ingresando la dirección URL de la API de su backend de Whaticket.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.inputLabel}>Dirección URL del Servidor</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="https://su-whaticket-api.com"
              placeholderTextColor={colors.dark.textMuted}
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>
          <Text style={styles.hint}>
            Ejemplo: http://192.168.1.100:4000 o https://api.whaticket.com
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator color="#090D16" />
          ) : (
            <>
              <Text style={styles.buttonText}>Guardar y Continuar</Text>
              <Check size={20} color="#090D16" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.dark.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  card: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: spacing.lg,
    shadowColor: colors.dark.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.dark.text,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    backgroundColor: colors.dark.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    height: 50,
    color: colors.dark.text,
    fontSize: 15,
  },
  hint: {
    fontSize: 12,
    color: colors.dark.textMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: colors.dark.primary,
    borderRadius: borderRadius.lg,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: colors.dark.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#090D16',
    fontSize: 16,
    fontWeight: '700',
  },
});
