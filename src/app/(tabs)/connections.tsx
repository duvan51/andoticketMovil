// src/app/(tabs)/connections.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Modal, Alert } from 'react-native';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { Link2, RefreshCw, LogOut, QrCode, Wifi, WifiOff, X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

interface WhatsApp {
  id: number;
  name: string;
  status: string;
  qrcode?: string;
  updatedAt: string;
}

export default function ConnectionsScreen() {
  const { socket } = useSocket();

  const [connections, setConnections] = useState<WhatsApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedQr, setSelectedQr] = useState<string | null>(null);
  const [selectedConnectionName, setSelectedConnectionName] = useState<string>('');

  // Fetch connections from backend
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

  useEffect(() => {
    fetchConnections();
  }, []);

  // Socket updates
  useEffect(() => {
    if (!socket) return;

    socket.on('whatsapp', (data: any) => {
      const { action, whatsapp } = data;
      if (action === 'update' && whatsapp) {
        setConnections((prev) => {
          const index = prev.findIndex((c) => c.id === whatsapp.id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...whatsapp };
            return updated;
          } else {
            return [...prev, whatsapp];
          }
        });
      }

      if (action === 'delete') {
        setConnections((prev) => prev.filter((c) => c.id !== data.whatsappId));
      }
    });

    socket.on('whatsappSession', (data: any) => {
      const { action, session } = data;
      if (action === 'update' && session) {
        setConnections((prev) => {
          const index = prev.findIndex((c) => c.id === session.id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...session };
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

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConnections();
  };

  // Start WhatsApp session (connect/reconnect)
  const handleConnect = async (id: number) => {
    try {
      await api.post(`/whatsappsession/${id}`);
      Alert.alert('Conectando', 'Iniciando sesión de WhatsApp. Espere unos segundos.');
    } catch (error) {
      console.error('Error connecting session:', error);
      Alert.alert('Error', 'No se pudo iniciar la conexión.');
    }
  };

  // Disconnect WhatsApp session
  const handleDisconnect = async (id: number) => {
    Alert.alert(
      'Desconectar',
      '¿Está seguro de que desea desconectar este canal de WhatsApp?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/whatsappsession/${id}`);
              Alert.alert('Éxito', 'Conexión cerrada.');
            } catch (error) {
              console.error('Error disconnecting session:', error);
              Alert.alert('Error', 'No se pudo cerrar la conexión.');
            }
          },
        },
      ]
    );
  };

  // Open QR modal
  const handleShowQr = (conn: WhatsApp) => {
    if (conn.qrcode) {
      setSelectedQr(conn.qrcode);
      setSelectedConnectionName(conn.name);
    } else {
      Alert.alert('Error', 'El código QR no está disponible en este momento. Intente reconectar.');
    }
  };

  // Status badges UI
  const getStatusBadge = (status: string) => {
    const formatted = status ? status.toUpperCase() : 'DESCONECTADO';

    if (formatted === 'CONNECTED') {
      return (
        <View style={[styles.badge, styles.badgeSuccess]}>
          <Wifi size={12} color="#065F46" />
          <Text style={[styles.badgeText, styles.badgeTextSuccess]}>Conectado</Text>
        </View>
      );
    }

    if (formatted === 'QRCODE') {
      return (
        <View style={[styles.badge, styles.badgeWarning]}>
          <QrCode size={12} color="#92400E" />
          <Text style={[styles.badgeText, styles.badgeTextWarning]}>Esperando QR</Text>
        </View>
      );
    }

    return (
      <View style={[styles.badge, styles.badgeDanger]}>
        <WifiOff size={12} color="#991B1B" />
        <Text style={[styles.badgeText, styles.badgeTextDanger]}>Desconectado</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.dark.primary} />
        </View>
      ) : (
        <FlatList
          data={connections}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.dark.primary} />
          }
          renderItem={({ item }) => (
            <View style={styles.connCard}>
              <View style={styles.connHeader}>
                <View style={styles.connInfo}>
                  <Text style={styles.connName}>{item.name}</Text>
                  {getStatusBadge(item.status)}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.connActions}>
                {item.status?.toUpperCase() === 'QRCODE' && item.qrcode && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.qrBtn]}
                    onPress={() => handleShowQr(item)}
                    activeOpacity={0.7}
                  >
                    <QrCode size={16} color="#FFFFFF" />
                    <Text style={styles.qrBtnText}>Escanear QR</Text>
                  </TouchableOpacity>
                )}

                {item.status?.toUpperCase() !== 'CONNECTED' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.connectBtn]}
                    onPress={() => handleConnect(item.id)}
                    activeOpacity={0.7}
                  >
                    <RefreshCw size={16} color="#090D16" />
                    <Text style={styles.connectBtnText}>Reconectar</Text>
                  </TouchableOpacity>
                )}

                {item.status?.toUpperCase() === 'CONNECTED' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.disconnectBtn]}
                    onPress={() => handleDisconnect(item.id)}
                    activeOpacity={0.7}
                  >
                    <LogOut size={16} color="#FFFFFF" />
                    <Text style={styles.disconnectBtnText}>Desconectar</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Link2 size={48} color={colors.dark.border} style={styles.emptyIcon} />
              <Text style={styles.emptyTitle}>No hay conexiones</Text>
              <Text style={styles.emptySubtitle}>
                No se encontraron canales de WhatsApp configurados en este servidor.
              </Text>
            </View>
          }
          contentContainerStyle={connections.length === 0 && { flexGrow: 1 }}
        />
      )}

      {/* QR Modal */}
      <Modal visible={!!selectedQr} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Vincular {selectedConnectionName}</Text>
              <TouchableOpacity onPress={() => setSelectedQr(null)} style={styles.closeBtn}>
                <X size={20} color={colors.dark.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Escanee este código QR desde el WhatsApp de su teléfono para iniciar sesión.
            </Text>

            {selectedQr && (
              <View style={styles.qrWrapper}>
                <QRCode value={selectedQr} size={220} backgroundColor="#FFFFFF" color="#000000" />
              </View>
            )}

            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setSelectedQr(null)}>
              <Text style={styles.closeModalBtnText}>Listo / Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dark.background,
    padding: spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connCard: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dark.border,
  },
  connHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  connInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  connName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  badgeSuccess: {
    backgroundColor: '#D1FAE5',
  },
  badgeTextSuccess: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 11,
  },
  badgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  badgeTextWarning: {
    color: '#92400E',
    fontWeight: '700',
    fontSize: 11,
  },
  badgeDanger: {
    backgroundColor: '#FEE2E2',
  },
  badgeTextDanger: {
    color: '#991B1B',
    fontWeight: '700',
    fontSize: 11,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  connActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  connectBtn: {
    backgroundColor: colors.dark.primary,
  },
  connectBtnText: {
    color: '#090D16',
    fontSize: 13,
    fontWeight: '700',
  },
  disconnectBtn: {
    backgroundColor: '#EF4444',
  },
  disconnectBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  qrBtn: {
    backgroundColor: '#3B82F6',
  },
  qrBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark.text,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.dark.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderColor: colors.dark.border,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.dark.text,
  },
  closeBtn: {
    padding: 4,
  },
  modalDescription: {
    fontSize: 14,
    color: colors.dark.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
  },
  closeModalBtn: {
    width: '100%',
    backgroundColor: colors.dark.border,
    height: 48,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeModalBtnText: {
    color: colors.dark.text,
    fontSize: 14,
    fontWeight: '700',
  },
});
