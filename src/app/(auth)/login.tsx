// src/app/(auth)/login.tsx
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { LogIn, Key, Mail, Settings } from 'lucide-react-native';

export default function LoginScreen() {
  const { handleLogin, apiUrl } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Por favor ingrese su correo y contraseña.');
      return;
    }

    try {
      setLoading(true);
      await handleLogin({ email: email.trim(), password });
      // Redirection to (tabs) is handled automatically by the Root Layout's useEffect!
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Error de Inicio de Sesión', error.message || 'Credenciales inválidas o servidor inaccesible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <LogIn size={40} color={colors.dark.primary} />
          </View>
          <Text style={styles.title}>Whaticket Móvil</Text>
          <Text style={styles.subtitle}>Ingrese sus credenciales de Whaticket para continuar</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Correo Electrónico</Text>
          <View style={styles.inputWrapper}>
            <Mail size={18} color={colors.dark.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="nombre@empresa.com"
              placeholderTextColor={colors.dark.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
          </View>

          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Contraseña</Text>
          <View style={styles.inputWrapper}>
            <Key size={18} color={colors.dark.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.dark.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#090D16" />
          ) : (
            <>
              <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
              <LogIn size={20} color="#090D16" />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.serverInfoWrapper}>
          <Text style={styles.serverInfoText} numberOfLines={1}>
            Servidor: {apiUrl || 'No configurado'}
          </Text>
          <TouchableOpacity
            style={styles.changeServerButton}
            onPress={() => router.replace('/(auth)/config')}
          >
            <Settings size={14} color={colors.dark.primary} />
            <Text style={styles.changeServerText}>Cambiar</Text>
          </TouchableOpacity>
        </View>
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
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.dark.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.dark.text,
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.dark.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  formCard: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.dark.border,
    marginBottom: spacing.xl,
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
    marginBottom: spacing.xs,
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
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    color: colors.dark.text,
    fontSize: 15,
  },
  loginButton: {
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
    marginBottom: spacing.lg,
  },
  loginButtonText: {
    color: '#090D16',
    fontSize: 16,
    fontWeight: '700',
  },
  serverInfoWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  serverInfoText: {
    fontSize: 13,
    color: colors.dark.textMuted,
    flexShrink: 1,
  },
  changeServerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.dark.border,
  },
  changeServerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.dark.primary,
  },
});
