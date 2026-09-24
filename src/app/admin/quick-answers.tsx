// src/app/admin/quick-answers.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ActivityIndicator,
  Alert, Modal, TextInput, ScrollView, FlatList, Switch, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius } from '../../theme/colors';
import api from '../../services/api';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  ArrowLeft, Plus, Pencil, Trash2, X, Check, Zap, MessageSquare, ShieldAlert, Paperclip, Music, FileText, Image as ImageIcon
} from 'lucide-react-native';

export const parseQuickAnswerMessage = (msg: string) => {
  if (!msg) return { hasMedia: false, mediaUrl: '', mimeType: '', cleanText: '' };
  const match = msg.match(/^\[media:([^|]+)\|([^\]]+)\](.*)$/s);
  if (match) {
    return {
      hasMedia: true,
      mediaUrl: match[1],
      mimeType: match[2],
      cleanText: match[3],
    };
  }
  return {
    hasMedia: false,
    mediaUrl: '',
    mimeType: '',
    cleanText: msg,
  };
};

// ─── Form Modal ──────────────────────────────────────────────────────────────
interface QuickAnswerFormProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (savedData: any) => void;
  initialData: any | null;
  isAdmin: boolean;
  currentUserId: number | undefined;
  c: typeof colors['dark'];
}

const uploadToTmpFiles = async (uri: string, fileName: string, mimeType: string): Promise<string> => {
  const formData = new FormData();
  
  // Keep the original URI untouched to let React Native handle local path schemes (file://, etc.)
  formData.append('file', {
    uri,
    name: fileName,
    type: mimeType || 'application/octet-stream',
  } as any);

  const response = await fetch('https://tmpfiles.org/api/v1/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Server responded with status ${response.status}: ${errorText}`);
  }

  const resJson = await response.json();
  if (resJson.status === 'success' && resJson.data && resJson.data.url) {
    return resJson.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
  }
  
  throw new Error(resJson.message || 'La respuesta del servidor no fue exitosa.');
};

function QuickAnswerFormModal({
  visible, onClose, onSaved, initialData, isAdmin, currentUserId, c
}: QuickAnswerFormProps) {
  const [shortcut, setShortcut] = useState('');
  const [message, setMessage] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [saving, setSaving] = useState(false);

  // Media states
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaMime, setMediaMime] = useState('');
  const [mediaFileName, setMediaFileName] = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);

  const isEditing = !!initialData;

  useEffect(() => {
    if (initialData) {
      setShortcut(initialData.shortcut || '');
      
      const parsed = parseQuickAnswerMessage(initialData.message || '');
      if (parsed.hasMedia) {
        setMediaUrl(parsed.mediaUrl);
        setMediaMime(parsed.mimeType);
        const parts = parsed.mediaUrl.split('/');
        setMediaFileName(parts[parts.length - 1] || 'archivo');
        setMessage(parsed.cleanText);
      } else {
        setMediaUrl('');
        setMediaMime('');
        setMediaFileName('');
        setMessage(initialData.message || '');
      }

      if (typeof initialData.isPrivate === 'boolean') {
        setIsPrivate(initialData.isPrivate);
      } else {
        setIsPrivate(!!initialData.userId);
      }
    } else {
      setShortcut('');
      setMessage('');
      setMediaUrl('');
      setMediaMime('');
      setMediaFileName('');
      setIsPrivate(!isAdmin);
    }
  }, [initialData, visible, isAdmin]);

  const handlePickFormFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingMedia(true);
        const directUrl = await uploadToTmpFiles(asset.uri, asset.name || 'file', asset.mimeType || '');
        setMediaUrl(directUrl);
        setMediaMime(asset.mimeType || '');
        setMediaFileName(asset.name || 'archivo');
      }
    } catch (error) {
      console.error('Error picking document for quick answer:', error);
      Alert.alert('Error', 'No se pudo cargar el archivo.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handlePickFormImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingMedia(true);
        const name = asset.fileName || `media-${Date.now()}.${asset.uri.split('.').pop()}`;
        const mime = asset.mimeType || (name.endsWith('.mp4') ? 'video/mp4' : name.endsWith('.m4a') ? 'audio/m4a' : 'image/jpeg');
        const directUrl = await uploadToTmpFiles(asset.uri, name, mime);
        setMediaUrl(directUrl);
        setMediaMime(mime);
        setMediaFileName(name);
      }
    } catch (error) {
      console.error('Error picking image for quick answer:', error);
      Alert.alert('Error', 'No se pudo cargar la imagen.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handlePickFormAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingMedia(true);
        const name = asset.name || `audio-${Date.now()}.mp3`;
        const mime = asset.mimeType || 'audio/mpeg';
        const directUrl = await uploadToTmpFiles(asset.uri, name, mime);
        setMediaUrl(directUrl);
        setMediaMime(mime);
        setMediaFileName(name);
      }
    } catch (error) {
      console.error('Error picking audio for quick answer:', error);
      Alert.alert('Error', 'No se pudo cargar el archivo de audio.');
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSave = async () => {
    if (!shortcut.trim()) {
      Alert.alert('Error', 'El atajo es requerido.');
      return;
    }
    if (!message.trim() && !mediaUrl) {
      Alert.alert('Error', 'El mensaje o un archivo adjunto es requerido.');
      return;
    }

    setSaving(true);
    try {
      let finalShortcut = shortcut.trim();
      if (!finalShortcut.startsWith('/')) {
        finalShortcut = '/' + finalShortcut;
      }

      let finalMessage = message.trim();
      if (mediaUrl) {
        finalMessage = `[media:${mediaUrl}|${mediaMime}]${finalMessage}`;
      }

      const payload = {
        shortcut: finalShortcut,
        message: finalMessage,
        isPrivate: isPrivate,
        isPublic: !isPrivate,
        userId: isPrivate ? currentUserId : null,
      };

      onSaved({ id: initialData?.id, payload });
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const st = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: spacing.md },
    container: { backgroundColor: c.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: c.border, overflow: 'hidden' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderBottomWidth: 1, borderBottomColor: c.border },
    title: { fontSize: 16, fontWeight: '700', color: c.text },
    closeBtn: { padding: spacing.xs },
    body: { padding: spacing.md },
    label: { fontSize: 13, fontWeight: '600', color: c.text, marginBottom: spacing.xs },
    input: {
      height: 48, borderWidth: 1, borderRadius: borderRadius.md, paddingHorizontal: spacing.md,
      color: c.text, backgroundColor: c.background, fontSize: 14, marginBottom: spacing.md
    },
    textArea: {
      height: 120, borderWidth: 1, borderRadius: borderRadius.md, padding: spacing.md,
      color: c.text, backgroundColor: c.background, fontSize: 14, textAlignVertical: 'top', marginBottom: spacing.md
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, marginBottom: spacing.md },
    switchTextCol: { flex: 1, marginRight: spacing.md },
    switchTitle: { fontSize: 14, fontWeight: '600', color: c.text },
    switchDesc: { fontSize: 11, color: c.textMuted, marginTop: 2 },
    infoBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: c.border, padding: spacing.sm, borderRadius: borderRadius.md, marginBottom: spacing.md },
    infoText: { fontSize: 12, color: c.textMuted, flex: 1 },
    footer: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderTopWidth: 1, borderTopColor: c.border },
    btn: { flex: 1, height: 48, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
    btnCancel: { backgroundColor: c.border },
    btnSave: { backgroundColor: c.primary },
    btnTextCancel: { color: c.text, fontSize: 14, fontWeight: '700' },
    btnTextSave: { color: '#090D16', fontSize: 14, fontWeight: '700' },
    uploadingBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, height: 48, justifyContent: 'center', marginBottom: spacing.md },
    uploadingText: { fontSize: 13 },
    attachedBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderWidth: 1, borderRadius: borderRadius.md, height: 48, marginBottom: spacing.md },
    attachedText: { flex: 1, fontSize: 13 },
    removeAttachedBtn: { padding: spacing.xs },
    attachmentBtnRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
    attachBtn: { flex: 1, height: 44, borderWidth: 1, borderRadius: borderRadius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    attachBtnText: { fontSize: 12, fontWeight: '600' }
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={st.overlay}>
          <View style={st.container}>
            <View style={st.header}>
              <Text style={st.title}>{isEditing ? 'Editar Respuesta' : 'Nueva Respuesta'}</Text>
              <TouchableOpacity onPress={onClose} style={st.closeBtn}>
                <X size={20} color={c.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.body} keyboardShouldPersistTaps="handled">
              <Text style={st.label}>Atajo (ej: /hola)</Text>
              <TextInput
                style={[st.input, { borderColor: c.border }]}
                placeholder="gracias"
                placeholderTextColor={c.textMuted}
                value={shortcut}
                onChangeText={setShortcut}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={st.label}>Mensaje de Respuesta</Text>
              <TextInput
                style={[st.textArea, { borderColor: c.border }]}
                placeholder="Escribe el mensaje guardado aquí..."
                placeholderTextColor={c.textMuted}
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
              />

              <Text style={st.label}>Archivo Adjunto (Opcional)</Text>
              {uploadingMedia ? (
                <View style={st.uploadingBox}>
                  <ActivityIndicator color={c.primary} size="small" />
                  <Text style={[st.uploadingText, { color: c.textMuted }]}>Subiendo archivo...</Text>
                </View>
              ) : mediaUrl ? (
                <View style={[st.attachedBox, { borderColor: c.border, backgroundColor: c.background }]}>
                  {mediaMime.startsWith('image/') ? (
                    <ImageIcon size={20} color={c.primary} />
                  ) : mediaMime.startsWith('audio/') ? (
                    <Music size={20} color={c.primary} />
                  ) : (
                    <FileText size={20} color={c.primary} />
                  )}
                  <Text style={[st.attachedText, { color: c.text }]} numberOfLines={1}>
                    {mediaFileName || 'Archivo adjunto'}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => {
                      setMediaUrl('');
                      setMediaMime('');
                      setMediaFileName('');
                    }}
                    style={st.removeAttachedBtn}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={st.attachmentBtnRow}>
                  <TouchableOpacity style={[st.attachBtn, { borderColor: c.border }]} onPress={handlePickFormImage}>
                    <ImageIcon size={14} color={c.text} />
                    <Text style={[st.attachBtnText, { color: c.text }]}>Imagen</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.attachBtn, { borderColor: c.border }]} onPress={handlePickFormAudio}>
                    <Music size={14} color={c.text} />
                    <Text style={[st.attachBtnText, { color: c.text }]}>Audio</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.attachBtn, { borderColor: c.border }]} onPress={handlePickFormFile}>
                    <FileText size={14} color={c.text} />
                    <Text style={[st.attachBtnText, { color: c.text }]}>Doc</Text>
                  </TouchableOpacity>
                </View>
              )}

              {isAdmin ? (
                <View style={st.switchRow}>
                  <View style={st.switchTextCol}>
                    <Text style={st.switchTitle}>¿Respuesta Privada?</Text>
                    <Text style={st.switchDesc}>
                      {isPrivate 
                        ? 'Solo tú podrás ver y usar esta respuesta.' 
                        : 'Todos los agentes del sistema podrán ver y usar esta respuesta.'}
                    </Text>
                  </View>
                  <Switch
                    value={isPrivate}
                    onValueChange={setIsPrivate}
                    trackColor={{ false: c.border, true: c.primary }}
                    thumbColor={isPrivate ? '#fff' : c.textMuted}
                  />
                </View>
              ) : (
                <View style={st.infoBox}>
                  <ShieldAlert size={16} color={c.pending} />
                  <Text style={st.infoText}>
                    Como Agente (No Admin), tu respuesta rápida será creada como **Privada** de manera obligatoria.
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={st.footer}>
              <TouchableOpacity style={[st.btn, st.btnCancel]} onPress={onClose} disabled={saving}>
                <Text style={st.btnTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.btn, st.btnSave]} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#090D16" />
                ) : (
                  <>
                    <Check size={18} color="#090D16" />
                    <Text style={st.btnTextSave}>Guardar</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function QuickAnswersScreen() {
  const { user, theme } = useAuth();
  const router = useRouter();
  const c = colors[theme];

  const [quickAnswers, setQuickAnswers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<any | null>(null);
  const [apiEndpoint, setApiEndpoint] = useState<string | null>(null);

  const isAdmin = user?.profile?.toUpperCase() === 'ADMIN' || user?.profile?.toUpperCase() === 'SUPERADMIN';

  // Discover working endpoint (/quick-answers or /quickanswers) on mount
  const fetchAndDiscoverAnswers = useCallback(async () => {
    setLoading(true);
    const endpointsToTry = ['/quickanswers', '/quick-answers'];
    
    for (const endpoint of endpointsToTry) {
      try {
        const response = await api.get(endpoint);
        const data = response.data;
        const answersList = Array.isArray(data) ? data : (data?.quickAnswers || data?.data || []);
        
        setQuickAnswers(answersList);
        setApiEndpoint(endpoint);
        setLoading(false);
        return; // Success!
      } catch (err: any) {
        // If it's a 404, we continue the loop. Otherwise, we break and handle
        if (!err.response || err.response.status !== 404) {
          console.error(`Error loading from ${endpoint}:`, err);
          Alert.alert('Error', 'Ocurrió un error al cargar las respuestas desde el servidor.');
          setLoading(false);
          return;
        }
      }
    }
    
    // If we reach here, both failed with 404
    Alert.alert('Error', 'No se pudieron resolver las rutas de respuestas rápidas en el backend.');
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAndDiscoverAnswers();
  }, [fetchAndDiscoverAnswers]);

  const handleRefresh = async () => {
    if (!apiEndpoint) {
      fetchAndDiscoverAnswers();
      return;
    }
    setLoading(true);
    try {
      const response = await api.get(apiEndpoint);
      const data = response.data;
      const answersList = Array.isArray(data) ? data : (data?.quickAnswers || data?.data || []);
      setQuickAnswers(answersList);
    } catch (err) {
      console.error('Error refreshing quick answers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveForm = async ({ id, payload }: { id?: number; payload: any }) => {
    if (!apiEndpoint) return;
    
    setLoading(true);
    setFormOpen(false);
    setEditingAnswer(null);

    try {
      if (id) {
        // Update
        await api.put(`${apiEndpoint}/${id}`, payload);
        Alert.alert('Éxito', 'Respuesta rápida actualizada correctamente.');
      } else {
        // Create
        await api.post(apiEndpoint, payload);
        Alert.alert('Éxito', 'Respuesta rápida creada correctamente.');
      }
      handleRefresh();
    } catch (err: any) {
      console.error('Error saving quick answer:', err);
      const msg = err.response?.data?.error || err.response?.data?.message || 'No se pudo guardar la respuesta rápida.';
      Alert.alert('Error', msg);
      setLoading(false);
    }
  };

  const handleDelete = (item: any) => {
    Alert.alert(
      'Confirmar Eliminación',
      `¿Está seguro de que desea eliminar el atajo "${item.shortcut}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!apiEndpoint) return;
            setLoading(true);
            try {
              await api.delete(`${apiEndpoint}/${item.id}`);
              Alert.alert('Éxito', 'Respuesta rápida eliminada.');
              handleRefresh();
            } catch (err: any) {
              console.error('Error deleting quick answer:', err);
              Alert.alert('Error', 'No se pudo eliminar la respuesta rápida.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const filteredAnswers = quickAnswers.filter(item => {
    const term = searchQuery.toLowerCase().trim();
    if (!term) return true;
    return (
      (item.shortcut && item.shortcut.toLowerCase().includes(term)) ||
      (item.message && item.message.toLowerCase().includes(term))
    );
  });

  const st = buildStyles(c);

  return (
    <SafeAreaView style={st.safeArea}>
      {/* Custom Stack Header */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Respuestas Rápidas</Text>
        <TouchableOpacity style={st.addBtn} onPress={() => { setEditingAnswer(null); setFormOpen(true); }}>
          <Plus size={24} color="#090D16" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={st.searchContainer}>
        <TextInput
          style={[st.searchInput, { borderColor: c.border }]}
          placeholder="Buscar respuestas por atajo o mensaje..."
          placeholderTextColor={c.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={st.searchClear}>
            <X size={18} color={c.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading && quickAnswers.length === 0 ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={{ color: c.textMuted, marginTop: spacing.sm }}>Cargando respuestas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredAnswers}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={st.listContent}
          onRefresh={handleRefresh}
          refreshing={loading}
          ListEmptyComponent={
            <View style={st.emptyContainer}>
              <Zap size={48} color={c.textMuted} />
              <Text style={st.emptyTitle}>Sin Respuestas Guardadas</Text>
              <Text style={st.emptySubtitle}>
                {searchQuery.length > 0
                  ? 'No hay atajos que coincidan con la búsqueda.'
                  : 'Crea tu primera respuesta rápida pulsando el botón +.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isItemPrivate = typeof item.isPrivate === 'boolean' 
              ? item.isPrivate 
              : !!item.userId;

            const parsed = parseQuickAnswerMessage(item.message || '');

            return (
              <View style={st.card}>
                <View style={st.cardHeader}>
                  <View style={st.shortcutWrapper}>
                    <MessageSquare size={14} color={c.primary} />
                    <Text style={st.shortcutText}>{item.shortcut}</Text>
                  </View>
                  <View style={[
                    st.visibilityBadge, 
                    { backgroundColor: isItemPrivate ? c.border : c.primaryLight }
                  ]}>
                    <Text style={[
                      st.visibilityBadgeText, 
                      { color: isItemPrivate ? c.textMuted : c.primary }
                    ]}>
                      {isItemPrivate ? 'Privada' : 'Compartida'}
                    </Text>
                  </View>
                </View>

                {parsed.hasMedia && (
                  <View style={st.mediaBadgeRow}>
                    {parsed.mimeType.startsWith('image/') ? (
                      <ImageIcon size={14} color={c.primary} />
                    ) : parsed.mimeType.startsWith('audio/') ? (
                      <Music size={14} color={c.primary} />
                    ) : (
                      <FileText size={14} color={c.primary} />
                    )}
                    <Text style={st.mediaBadgeText}>
                      {parsed.mimeType.startsWith('image/') 
                        ? 'Imagen' 
                        : parsed.mimeType.startsWith('audio/') 
                        ? 'Mensaje de voz' 
                        : 'Archivo'}
                    </Text>
                  </View>
                )}

                <Text style={st.messageText}>
                  {parsed.hasMedia ? (parsed.cleanText || '(Sin texto adjunto)') : parsed.cleanText}
                </Text>

                <View style={st.cardFooter}>
                  <Text style={st.authorText}>
                    {isItemPrivate ? 'Solo visible para ti' : 'Visible para todo el equipo'}
                  </Text>
                  <View style={st.actionRow}>
                    <TouchableOpacity
                      style={st.editBtn}
                      onPress={() => { setEditingAnswer(item); setFormOpen(true); }}
                      activeOpacity={0.7}
                    >
                      <Pencil size={16} color={c.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={st.deleteBtn}
                      onPress={() => handleDelete(item)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <QuickAnswerFormModal
        visible={formOpen}
        onClose={() => { setFormOpen(false); setEditingAnswer(null); }}
        onSaved={handleSaveForm}
        initialData={editingAnswer}
        isAdmin={isAdmin}
        currentUserId={user?.id}
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
    searchContainer: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm, backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border
    },
    searchInput: {
      flex: 1, height: 40, borderWidth: 1, borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.md, color: c.text, backgroundColor: c.background, fontSize: 13
    },
    searchClear: { position: 'absolute', right: spacing.lg, padding: spacing.xs },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: spacing.md },
    card: {
      backgroundColor: c.card, borderRadius: borderRadius.lg,
      padding: spacing.md, marginBottom: spacing.md,
      borderWidth: 1, borderColor: c.border,
    },
    cardHeader: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: spacing.sm
    },
    shortcutWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    shortcutText: { fontSize: 15, fontWeight: '700', color: c.primary },
    visibilityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    visibilityBadgeText: { fontSize: 10, fontWeight: '700' },
    messageText: { fontSize: 14, color: c.text, lineHeight: 20, marginBottom: spacing.md },
    cardFooter: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: c.border,
    },
    authorText: { fontSize: 11, color: c.textMuted },
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
      fontSize: 14, color: c.textMuted, marginTop: spacing.xs, textAlign: 'center'
    },
    mediaBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.border,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginBottom: spacing.sm,
    },
    mediaBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textMuted,
    },
  });
}
