// src/app/admin/connections.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, Modal, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { ArrowLeft, Link2, RefreshCw, LogOut, QrCode, Wifi, WifiOff, X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

interface WhatsApp {
  id: number;
  name: string;
  status: string;
  qrcode?: string;
  updatedAt: string;
}

export default function AdminConnectionsScreen() {
  const { theme } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const c = colors[theme];

  const [connections, setConnections] = useState<WhatsApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedQr, setSelectedQr] = useState<string | null>(null);
  const [selectedConnectionName, setSelectedConnectionName] = useState<string>('');

  const fetchConnections = async () => {
    try {
      const { data } = await api.get('/whatsapp/');
      setConnections(data || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchConnections(); }, []);

  useEffect(() => {
    if (!socket) return;

    socket.on('whatsapp', (data: any) => {
      const { action, whatsapp } = data;
      if (action === 'update' && whatsapp) {
        setConnections(prev => {
          const idx = prev.findIndex(c => c.id === whatsapp.id);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...whatsapp };
            return updated;
          }
          return [...prev, whatsapp];
        });
      }
      if (action === 'delete') {
        setConnections(prev => prev.filter(c => c.id !== data.whatsappId));
      }
    });

    socket.on('whatsappSession', (data: any) => {
      const { action, session } = data;
      if (action === 'update' && session) {
        setConnections(prev => {
          const idx = prev.findIndex(c => c.id === session.id);
          if (idx !== -1) {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], ...session };
            return updated;
          }
          return prev;
        });
      }
    });

    return () => {
      socket.off('whatsapp');
      socket.off('whatsappSession');
    };
  }, [socket]);

  const handleRefresh = () => { setRefreshing(true); fetchConnections(); };

  const handleConnect = async (id: number) => {
    try {
      await api.post(`/whatsappsession/${id}`);
      Alert.alert('Conectando', 'Iniciando sesión de WhatsApp. Espere unos segundos.');
    } catch {
      Alert.alert('Error', 'No se pudo iniciar la conexión.');
    }
  };

  const handleDisconnect = (id: number) => {
    Alert.alert(
      'Desconectar',
      '¿Está seguro de que desea desconectar este canal de WhatsApp?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar', style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/whatsappsession/${id}`);
              Alert.alert('Éxito', 'Conexión cerrada.');
            } catch {
              Alert.alert('Error', 'No se pudo cerrar la conexión.');
            }
          },
        },
      ]
    );
  };

  const handleShowQr = (conn: WhatsApp) => {
    if (conn.qrcode) {
      setSelectedQr(conn.qrcode);
      setSelectedConnectionName(conn.name);
    } else {
      Alert.alert('Sin QR', 'El código QR no está disponible. Intente reconectar.');
    }
  };

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase() || '';
    if (s === 'CONNECTED') return (
      <View style={[st.badge, { backgroundColor: '#D1FAE5' }]}>
        <Wifi size={12} color="#065F46" />
        <Text style={[st.badgeTxt, { color: '#065F46' }]}>Conectado</Text>
      </View>
    );
    if (s === 'QRCODE') return (
      <View style={[st.badge, { backgroundColor: '#FEF3C7' }]}>
        <QrCode size={12} color="#92400E" />
        <Text style={[st.badgeTxt, { color: '#92400E' }]}>Esperando QR</Text>
      </View>
    );
    return (
      <View style={[st.badge, { backgroundColor: '#FEE2E2' }]}>
        <WifiOff size={12} color="#991B1B" />
        <Text style={[st.badgeTxt, { color: '#991B1B' }]}>Desconectado</Text>
      </View>
    );
  };

  const connectedCount = connections.filter(c => c.status?.toUpperCase() === 'CONNECTED').length;

  const st = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: c.background },
    header: {
      height: 60, backgroundColor: c.card, flexDirection: 'row',
      alignItems: 'center', paddingHorizontal: spacing.md,
      borderBottomWidth: 1, borderBottomColor: c.border, gap: spacing.md,
    },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: c.text },
    refreshBtn: {
      width: 38, height: 38, borderRadius: 19, borderWidth: 1,
      borderColor: c.border, justifyContent: 'center', alignItems: 'center',
    },
    statsBar: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
      paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
      borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.card,
    },
    statsTxt: { fontSize: 13, color: c.textMuted, fontWeight: '600' },
    statsGreen: { fontSize: 13, color: c.primary, fontWeight: '700' },
    content: { flex: 1, padding: spacing.md },
    card: {
      backgroundColor: c.card, borderRadius: borderRadius.lg, padding: spacing.md,
      marginBottom: spacing.md, borderWidth: 1, borderColor: c.border,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
    connName: { flex: 1, fontSize: 17, fontWeight: '700', color: c.text },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
    badgeTxt: { fontSize: 11, fontWeight: '700' },
    actions: { flexDirection: 'row', gap: spacing.sm },
    actionBtn: {
      flex: 1, flexDirection: 'row', height: 42, borderRadius: borderRadius.sm,
      justifyContent: 'center', alignItems: 'center', gap: 6,
    },
    btnTxt: { fontSize: 13, fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.textMuted, marginTop: spacing.md },
    emptySubtitle: { fontSize: 14, color: c.textMuted, textAlign: 'center', marginTop: spacing.sm },
    // QR Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    modalBox: { backgroundColor: c.card, borderRadius: borderRadius.lg, padding: spacing.lg, width: '100%', maxWidth: 340, borderWidth: 1, borderColor: c.border, alignItems: 'center' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: spacing.md },
    modalTitle: { fontSize: 17, fontWeight: '700', color: c.text },
    modalDesc: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
    qrWrapper: { backgroundColor: '#FFFFFF', padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.xl },
    closeBtn: { width: '100%', backgroundColor: c.border, height: 48, borderRadius: borderRadius.sm, justifyContent: 'center', alignItems: 'center' },
    closeBtnTxt: { color: c.text, fontSize: 14, fontWeight: '700' },
  });

  return (
    <SafeAreaView style={st.safeArea}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <ArrowLeft size={24} color={c.text} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Conexiones de WhatsApp</Text>
        <TouchableOpacity style={st.refreshBtn} onPress={handleRefresh}>
          <RefreshCw size={18} color={c.primary} />
        </TouchableOpacity>
      </View>

      {/* Stats bar */}
      {!loading && (
        <View style={st.statsBar}>
          <Link2 size={14} color={c.primary} />
          <Text style={st.statsTxt}>
            <Text style={st.statsGreen}>{connectedCount}</Text>
            {' '}de {connections.length} canal{connections.length !== 1 ? 'es' : ''} conectado{connectedCount !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Body */}
      {loading ? (
        <View style={st.center}><ActivityIndicator size="large" color={c.primary} /></View>
      ) : (
        <FlatList
          data={connections}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[st.content, connections.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary} />}
          renderItem={({ item }) => (
            <View style={st.card}>
              <View style={st.cardHeader}>
                <Text style={st.connName}>{item.name}</Text>
                {getStatusBadge(item.status)}
              </View>
              <View style={st.actions}>
                {item.status?.toUpperCase() === 'QRCODE' && item.qrcode && (
                  <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#3B82F6' }]} onPress={() => handleShowQr(item)}>
                    <QrCode size={16} color="#fff" />
                    <Text style={[st.btnTxt, { color: '#fff' }]}>Escanear QR</Text>
                  </TouchableOpacity>
                )}
                {item.status?.toUpperCase() !== 'CONNECTED' && (
                  <TouchableOpacity style={[st.actionBtn, { backgroundColor: c.primary }]} onPress={() => handleConnect(item.id)}>
                    <RefreshCw size={16} color="#090D16" />
                    <Text style={[st.btnTxt, { color: '#090D16' }]}>Reconectar</Text>
                  </TouchableOpacity>
                )}
                {item.status?.toUpperCase() === 'CONNECTED' && (
                  <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#EF4444' }]} onPress={() => handleDisconnect(item.id)}>
                    <LogOut size={16} color="#fff" />
                    <Text style={[st.btnTxt, { color: '#fff' }]}>Desconectar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={st.empty}>
              <Link2 size={64} color={c.border} />
              <Text style={st.emptyTitle}>Sin conexiones</Text>
              <Text style={st.emptySubtitle}>No hay canales de WhatsApp configurados en el servidor.</Text>
            </View>
          }
        />
      )}

      {/* QR Modal */}
      <Modal visible={!!selectedQr} transparent animationType="fade">
        <View style={st.modalOverlay}>
          <View style={st.modalBox}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Vincular {selectedConnectionName}</Text>
              <TouchableOpacity onPress={() => setSelectedQr(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <X size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={st.modalDesc}>
              Escanee este código QR desde WhatsApp en su teléfono para iniciar sesión.
            </Text>
            {selectedQr && (
              <View style={st.qrWrapper}>
                <QRCode value={selectedQr} size={220} backgroundColor="#FFFFFF" color="#000000" />
              </View>
            )}
            <TouchableOpacity style={st.closeBtn} onPress={() => setSelectedQr(null)}>
              <Text style={st.closeBtnTxt}>Listo / Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
