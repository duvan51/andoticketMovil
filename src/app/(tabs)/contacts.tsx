// src/app/(tabs)/contacts.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet, Text, View, FlatList, TextInput, ActivityIndicator,
  RefreshControl, TouchableOpacity, Modal, Alert, ScrollView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { ContactAvatar } from '../../components/ContactAvatar';
import { colors, spacing, borderRadius } from '../../theme/colors';
import { Search, User, Phone, Plus, X, Mail, UserPlus, MessageSquare, Edit2, ChevronDown, Info, Users, User2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Contact {
  id: number;
  name: string;
  number: string;
  email?: string;
  profilePicUrl?: string;
  profilePic?: string;
  picture?: string;
  image?: string;
  avatar?: string;
  urlPicture?: string;
}

interface Country {
  name: string;
  code: string;
  flag: string;
}

const countriesList: Country[] = [
  { name: 'Colombia', code: '57', flag: '🇨🇴' },
  { name: 'Venezuela', code: '58', flag: '🇻🇪' },
  { name: 'Ecuador', code: '593', flag: '🇪🇨' },
  { name: 'Perú', code: '51', flag: '🇵🇪' },
  { name: 'Panamá', code: '507', flag: '🇵🇦' },
  { name: 'Chile', code: '56', flag: '🇨🇱' },
  { name: 'Argentina', code: '54', flag: '🇦🇷' },
  { name: 'México', code: '52', flag: '🇲🇽' },
  { name: 'España', code: '34', flag: '🇪🇸' },
  { name: 'Estados Unidos / Canadá', code: '1', flag: '🇺🇸' },
  { name: 'Bolivia', code: '591', flag: '🇧🇴' },
  { name: 'Brasil', code: '55', flag: '🇧🇷' },
  { name: 'Costa Rica', code: '506', flag: '🇨🇷' },
  { name: 'Guatemala', code: '502', flag: '🇬🇹' },
  { name: 'Honduras', code: '504', flag: '🇭🇳' },
  { name: 'Nicaragua', code: '505', flag: '🇳🇮' },
  { name: 'Paraguay', code: '595', flag: '🇵🇾' },
  { name: 'El Salvador', code: '503', flag: '🇸🇻' },
  { name: 'Uruguay', code: '598', flag: '🇺🇾' },
];

export default function ContactsScreen() {
  const { theme, user } = useAuth();
  const c = colors[theme];
  const router = useRouter();

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Unified Contact Modal State (Create & Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Country Code State
  const defaultCountry = countriesList.find(item => item.code === '57') || countriesList[0];
  const [selectedCountry, setSelectedCountry] = useState<Country>(defaultCountry);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState('');

  // Chat initiation state
  const [initiatingChatId, setInitiatingChatId] = useState<number | null>(null);
  // Contact Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactExtraInfo, setContactExtraInfo] = useState<any[]>([]);
  const [loadingExtraInfo, setLoadingExtraInfo] = useState(false);
  const searchDebounceRef = useRef<any | null>(null);

  // Fetch contacts
  const fetchContacts = async (pageNum: number, isRefresh = false, searchStr = searchQuery) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const { data } = await api.get('/contacts', {
        params: {
          searchParam: searchStr,
          pageNumber: pageNum,
        },
      });

      if (data && data.contacts) {
        if (isRefresh || pageNum === 1) {
          setContacts(data.contacts);
        } else {
          setContacts((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const newContacts = data.contacts.filter((c: any) => !existingIds.has(c.id));
            return [...prev, ...newContacts];
          });
        }
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Auto-detect country based on IP (Free API)
  const detectUserCountry = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data && data.country_calling_code) {
        const cleanCode = data.country_calling_code.replace('+', '');
        const matched = countriesList.find(item => item.code === cleanCode);
        if (matched) {
          setSelectedCountry(matched);
        }
      }
    } catch {
      // Fail silently, default to Colombia (+57)
    }
  };

  useEffect(() => {
    fetchContacts(1, true);
    detectUserCountry();
  }, []);



  // Debounced search
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      fetchContacts(1, true, text);
    }, 500);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchContacts(1, true);
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchContacts(nextPage);
  };

  // Parse phone number to isolate country code from local number
  const parsePhoneNumber = (fullNumber: string) => {
    const sorted = [...countriesList].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      if (fullNumber.startsWith(c.code)) {
        return {
          country: c,
          local: fullNumber.slice(c.code.length),
        };
      }
    }
    return {
      country: defaultCountry,
      local: fullNumber,
    };
  };

  // Open creation modal
  const handleOpenCreateModal = () => {
    setIsEditMode(false);
    setSelectedContactId(null);
    const cleanNum = searchQuery.replace(/[^0-9]/g, '');
    if (cleanNum.length >= 5) {
      const parsed = parsePhoneNumber(cleanNum);
      setSelectedCountry(parsed.country);
      setNewPhone(parsed.local);
      setNewName('');
    } else {
      setNewPhone('');
      setNewName(searchQuery);
    }
    setNewEmail('');
    setModalOpen(true);
  };

  // Open edit modal
  const handleOpenEditModal = (contact: Contact) => {
    setIsEditMode(true);
    setSelectedContactId(contact.id);
    setNewName(contact.name);
    const parsed = parsePhoneNumber(contact.number);
    setSelectedCountry(parsed.country);
    setNewPhone(parsed.local);
    setNewEmail(contact.email || '');
    setModalOpen(true);
  };

  const handleOpenDetailModal = async (contact: Contact) => {
    setSelectedContact(contact);
    setContactExtraInfo([]);
    setDetailModalOpen(true);
    setLoadingExtraInfo(true);
    try {
      const { data } = await api.get(`/contacts/${contact.id}`);
      if (data && data.extraInfo) {
        setContactExtraInfo(data.extraInfo);
      }
    } catch (error) {
      console.error('Error fetching contact extra info:', error);
    } finally {
      setLoadingExtraInfo(false);
    }
  };

  // Save contact
  const handleSaveContact = async () => {
    if (!newName.trim()) {
      Alert.alert('Falta nombre', 'Por favor, ingrese el nombre del contacto.');
      return;
    }
    let sanitizedLocalPhone = newPhone.replace(/[^0-9]/g, '');
    if (!sanitizedLocalPhone) {
      Alert.alert('Falta teléfono', 'Por favor, ingrese un número telefónico válido.');
      return;
    }

    // Avoid duplicating country code if already typed by the user
    if (sanitizedLocalPhone.startsWith(selectedCountry.code)) {
      sanitizedLocalPhone = sanitizedLocalPhone.slice(selectedCountry.code.length);
    }

    // Concatenate calling code + local number
    const finalNumber = selectedCountry.code + sanitizedLocalPhone;

    try {
      setSubmitting(true);
      const payload = {
        name: newName.trim(),
        number: finalNumber,
        email: newEmail.trim() || undefined,
        extraInfo: [],
      };

      if (isEditMode && selectedContactId) {
        await api.put(`/contacts/${selectedContactId}`, payload);
        setModalOpen(false);
        Alert.alert('Éxito', 'Contacto actualizado correctamente.');
      } else {
        const { data } = await api.post('/contacts', payload);
        setModalOpen(false);
        Alert.alert(
          'Contacto Creado',
          '¿Desea iniciar un chat con este contacto ahora mismo?',
          [
            {
              text: 'Más tarde',
              onPress: () => {
                setSearchQuery('');
                setPage(1);
                fetchContacts(1, true, '');
              }
            },
            {
              text: 'Ir al Chat',
              onPress: () => handleStartChat(data.id)
            }
          ]
        );
      }

      setPage(1);
      fetchContacts(1, true);
    } catch (error: any) {
      console.error('Error saving contact:', error);
      const msg = error?.response?.data?.error || 'No se pudo guardar el contacto.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Start chat helper
  const handleStartChat = async (contactId: number) => {
    try {
      setInitiatingChatId(contactId);

      // 1. Check if an existing ticket already exists for this contact
      try {
        const { data: listRes } = await api.get('/tickets', {
          params: { searchParam: String(contactId), showAll: 'true', pageNumber: 1 }
        });
        const tickets = listRes?.tickets || [];
        const existing = tickets.find((t: any) => Number(t.contactId) === Number(contactId) || Number(t.contact?.id) === Number(contactId));
        if (existing?.id) {
          router.push(`/ticket/${existing.id}`);
          return;
        }
      } catch (searchErr) {
        console.log('Search existing ticket fallback note:', searchErr);
      }

      // 2. If no existing ticket found, create a new ticket
      const payload: any = {
        contactId,
        status: 'open',
      };
      if (user?.id) payload.userId = user.id;

      try {
        const { data: ticket } = await api.post('/tickets', payload);
        const targetId = ticket?.id || ticket?.ticket?.id;
        if (targetId) {
          router.push(`/ticket/${targetId}`);
          return;
        }
      } catch (createErr: any) {
        // If backend returns an existing ticket inside the error object (e.g. ERR_OTHER_OPEN_TICKET)
        const errTicketId = createErr?.response?.data?.ticket?.id || createErr?.response?.data?.ticketId;
        if (errTicketId) {
          router.push(`/ticket/${errTicketId}`);
          return;
        }
        throw createErr;
      }
    } catch (error: any) {
      console.error('Error starting chat:', error);
      const errMsg = error?.response?.data?.error || error?.response?.data?.message || 'No se pudo abrir el chat para este contacto.';
      Alert.alert('Aviso de Chat', errMsg);
    } finally {
      setInitiatingChatId(null);
    }
  };

  const filteredCountries = countriesList.filter(c =>
    c.name.toLowerCase().includes(countrySearchQuery.toLowerCase()) ||
    c.code.includes(countrySearchQuery)
  );

  const insets = useSafeAreaInsets();
  const st = buildStyles(c, insets);

  return (
    <View style={st.container}>
      {/* ── Top Header Bar (App Title + Advisor Badge) ── */}
      <View style={[st.topHeaderBar, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={st.appBrandRow}>
          <Users size={20} color={c.primary} />
          <Text style={[st.appBrandText, { color: c.text }]}>Contactos</Text>
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

      {/* Search Header Row */}
      <View style={st.searchContainer}>
        <View style={st.searchWrapper}>
          <Search size={18} color={c.textMuted} style={st.searchIcon} />
          <TextInput
            style={st.searchInput}
            placeholder="Buscar contactos..."
            placeholderTextColor={c.textMuted}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={16} color={c.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={st.addButton} onPress={handleOpenCreateModal} activeOpacity={0.8}>
          <Plus size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Quick Add Promo Card when query yields no results */}
      {!loading && contacts.length === 0 && searchQuery.length > 0 && (
        <View style={st.promoCard}>
          <View style={st.promoHeader}>
            <UserPlus size={22} color={c.primary} />
            <Text style={st.promoTitle}>¿No encuentras a &quot;{searchQuery}&quot;?</Text>
          </View>
          <Text style={st.promoSubtitle}>
            Crea este contacto rápidamente en el sistema para iniciar chats.
          </Text>
          <TouchableOpacity style={st.promoAction} onPress={handleOpenCreateModal} activeOpacity={0.8}>
            <Text style={st.promoActionTxt}>Crear Contacto Rápido</Text>
            <Plus size={16} color="#090D16" />
          </TouchableOpacity>
        </View>
      )}

      {/* Contacts List */}
      {loading ? (
        <View style={st.center}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={(item) => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={c.primary} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.2}
          ListFooterComponent={() => loadingMore ? <View style={st.footerLoader}><ActivityIndicator color={c.primary} size="small" /></View> : null}
          renderItem={({ item }) => {
            const isInitiating = initiatingChatId === item.id;

            return (
              <View style={st.contactItem}>
                <TouchableOpacity
                  style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => handleOpenDetailModal(item)}
                  activeOpacity={0.7}
                >
                  <ContactAvatar
                    contact={item}
                    size={46}
                    backgroundColor={c.primaryLight}
                    textColor={c.primary}
                    style={st.avatar}
                  />
                  <View style={st.contactInfo}>
                    <Text style={st.contactName} numberOfLines={1}>{item.name}</Text>
                    <View style={st.phoneRow}>
                      <Phone size={12} color={c.textMuted} />
                      <Text style={st.contactPhone} numberOfLines={1}>+{item.number}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Actions Column */}
                <View style={st.actionsContainer}>
                  <TouchableOpacity
                    style={[st.actionBtn, { borderColor: c.border }]}
                    onPress={() => handleOpenEditModal(item)}
                    activeOpacity={0.7}
                  >
                    <Edit2 size={16} color={c.textMuted} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[st.actionBtn, { backgroundColor: c.primaryLight }]}
                    onPress={() => handleStartChat(item.id)}
                    activeOpacity={0.7}
                    disabled={initiatingChatId !== null}
                  >
                    {isInitiating ? (
                      <ActivityIndicator size="small" color={c.primary} />
                    ) : (
                      <MessageSquare size={16} color={c.primary} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            searchQuery.length === 0 ? (
              <View style={st.emptyContainer}>
                <User size={48} color={c.border} style={st.emptyIcon} />
                <Text style={st.emptyTitle}>No hay contactos</Text>
                <Text style={st.emptySubtitle}>Aún no se han guardado contactos en este servidor.</Text>
              </View>
            ) : null
          }
          contentContainerStyle={contacts.length === 0 && { flexGrow: 1 }}
        />
      )}

      {/* ── CREATE / EDIT CONTACT MODAL ── */}
      <Modal visible={modalOpen} transparent animationType="slide">
        <SafeAreaView style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: c.background, borderColor: c.border }]}>
            <View style={[st.modalHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
              <Text style={[st.modalTitle, { color: c.text }]}>
                {isEditMode ? 'Editar Contacto' : 'Nuevo Contacto'}
              </Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <X size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={st.modalForm} keyboardShouldPersistTaps="handled">
              {/* Full Name */}
              <View style={st.formGroup}>
                <Text style={st.formLabel}>Nombre completo *</Text>
                <View style={st.inputWrapper}>
                  <User size={16} color={c.textMuted} />
                  <TextInput
                    style={st.formInput}
                    placeholder="Ej. Juan Pérez"
                    placeholderTextColor={c.textMuted}
                    value={newName}
                    onChangeText={setNewName}
                  />
                </View>
              </View>

              {/* Phone Field with Country Picker */}
              <View style={st.formGroup}>
                <Text style={st.formLabel}>Teléfono móvil *</Text>
                <View style={st.phoneInputContainer}>
                  {/* Country Selector Dropdown */}
                  <TouchableOpacity
                    style={[st.countrySelector, { borderColor: c.border, backgroundColor: c.card }]}
                    onPress={() => { setCountrySearchQuery(''); setCountrySheetOpen(true); }}
                    activeOpacity={0.8}
                  >
                    <Text style={st.countryFlag}>{selectedCountry.flag}</Text>
                    <Text style={[st.countryCodeText, { color: c.text }]}>+{selectedCountry.code}</Text>
                    <ChevronDown size={14} color={c.textMuted} />
                  </TouchableOpacity>

                  {/* Local Number Input */}
                  <View style={[st.localPhoneWrapper, { borderColor: c.border, backgroundColor: c.card }]}>
                    <TextInput
                      style={[st.localPhoneInput, { color: c.text }]}
                      placeholder="Ej. 3001234567"
                      placeholderTextColor={c.textMuted}
                      value={newPhone}
                      onChangeText={setNewPhone}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>
                <Text style={st.inputHelp}>El prefijo se añade automáticamente.</Text>
              </View>

              {/* Email */}
              <View style={st.formGroup}>
                <Text style={st.formLabel}>Email (opcional)</Text>
                <View style={st.inputWrapper}>
                  <Mail size={16} color={c.textMuted} />
                  <TextInput
                    style={st.formInput}
                    placeholder="Ej. correo@ejemplo.com"
                    placeholderTextColor={c.textMuted}
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* Action buttons */}
              <View style={st.formActions}>
                <TouchableOpacity style={st.cancelBtn} onPress={() => setModalOpen(false)} disabled={submitting}>
                  <Text style={st.cancelBtnTxt}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={st.saveBtn} onPress={handleSaveContact} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#090D16" />
                  ) : (
                    <Text style={st.saveBtnTxt}>
                      {isEditMode ? 'Guardar Cambios' : 'Guardar Contacto'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── COUNTRY SELECTOR BOTTOM SHEET ── */}
      <Modal visible={countrySheetOpen} transparent animationType="slide" onRequestClose={() => setCountrySheetOpen(false)}>
        <SafeAreaView style={st.modalOverlay}>
          <View style={[st.modalContent, { height: '80%', flex: 0 }]}>
            {/* Sheet Header */}
            <View style={[st.modalHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
              <Text style={[st.modalTitle, { color: c.text }]}>Seleccione País</Text>
              <TouchableOpacity onPress={() => setCountrySheetOpen(false)}>
                <X size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Country Search Bar */}
            <View style={[st.countrySearchWrapper, { backgroundColor: c.card, borderBottomColor: c.border }]}>
              <Search size={16} color={c.textMuted} />
              <TextInput
                style={[st.countrySearchInput, { color: c.text }]}
                placeholder="Buscar país o prefijo..."
                placeholderTextColor={c.textMuted}
                value={countrySearchQuery}
                onChangeText={setCountrySearchQuery}
                autoCorrect={false}
              />
              {countrySearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setCountrySearchQuery('')}>
                  <X size={16} color={c.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Countries Scroll List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code + '-' + item.name}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[st.countryItemRow, { borderBottomColor: c.border }]}
                  onPress={() => {
                    setSelectedCountry(item);
                    setCountrySheetOpen(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={st.countryItemFlag}>{item.flag}</Text>
                  <Text style={[st.countryItemName, { color: c.text }]}>{item.name}</Text>
                  <Text style={[st.countryItemCode, { color: c.primary }]}>+{item.code}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                  <Text style={{ color: c.textMuted }}>No se encontraron países.</Text>
                </View>
              }
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── CONTACT DETAILS MODAL ── */}
      <Modal visible={detailModalOpen} transparent animationType="slide" onRequestClose={() => setDetailModalOpen(false)}>
        <SafeAreaView style={st.modalOverlay}>
          <View style={[st.modalContent, { backgroundColor: c.background, borderColor: c.border }]}>
            {/* Modal Header */}
            <View style={[st.modalHeader, { backgroundColor: c.card, borderBottomColor: c.border }]}>
              <Text style={[st.modalTitle, { color: c.text }]}>Detalle del Cliente</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                {selectedContact && (
                  <TouchableOpacity 
                    onPress={() => {
                      setDetailModalOpen(false);
                      handleOpenEditModal(selectedContact);
                    }} 
                    style={{ padding: 4 }}
                  >
                    <Edit2 size={20} color={c.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setDetailModalOpen(false)}>
                  <X size={22} color={c.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
              {selectedContact && (
                <>
                  {/* Contact Header Card */}
                  <View style={[st.contactCard, { backgroundColor: c.card, borderColor: c.border }]}>
                    <ContactAvatar
                      contact={selectedContact}
                      size={88}
                      backgroundColor={c.primaryLight}
                      textColor={c.primary}
                      style={{ marginBottom: spacing.md }}
                    />
                    <Text style={[st.contactCardName, { color: c.text }]}>{selectedContact.name}</Text>
                    <View style={st.contactCardDetailRow}>
                      <Phone size={14} color={c.textMuted} />
                      <Text style={[st.contactCardDetailText, { color: c.text }]}>+{selectedContact.number}</Text>
                    </View>
                    {selectedContact.email ? (
                      <View style={st.contactCardDetailRow}>
                        <Mail size={14} color={c.textMuted} />
                        <Text style={[st.contactCardDetailText, { color: c.text }]}>{selectedContact.email}</Text>
                      </View>
                    ) : null}
                  </View>

                  {/* Custom Fields Section */}
                  <View style={[st.detailsSection, { borderColor: c.border }]}>
                    <View style={st.sectionTitleIconRow}>
                      <Info size={16} color={c.primary} />
                      <Text style={[st.detailsSectionTitle, { color: c.text }]}>Campos Extra</Text>
                    </View>
                    {loadingExtraInfo ? (
                      <ActivityIndicator size="small" color={c.primary} style={{ marginTop: spacing.md }} />
                    ) : contactExtraInfo.length > 0 ? (
                      <View style={st.extraInfoContainer}>
                        {contactExtraInfo.map((info: any) => (
                          <View key={info.id} style={[st.extraInfoCard, { backgroundColor: c.background, borderColor: c.border }]}>
                            <Text style={st.extraInfoLabel}>{info.name}</Text>
                            <Text style={[st.extraInfoValue, { color: c.text }]}>{info.value}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={st.noDataText}>Sin información adicional.</Text>
                    )}
                  </View>

                  {/* Actions Section */}
                  <View style={st.formActions}>
                    <TouchableOpacity 
                      style={[st.saveBtn, { flexDirection: 'row', gap: spacing.sm }]} 
                      onPress={() => {
                        setDetailModalOpen(false);
                        handleStartChat(selectedContact.id);
                      }}
                      disabled={initiatingChatId !== null}
                    >
                      {initiatingChatId === selectedContact.id ? (
                        <ActivityIndicator size="small" color="#090D16" />
                      ) : (
                        <>
                          <MessageSquare size={18} color="#090D16" />
                          <Text style={st.saveBtnTxt}>Iniciar Chat</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function buildStyles(c: typeof colors['dark'], insets: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    topHeaderBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: Platform.OS !== 'web' ? Math.max(insets.top, 8) : spacing.sm,
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
    searchContainer: {
      flexDirection: 'row', padding: spacing.md, gap: spacing.sm,
      backgroundColor: c.background, alignItems: 'center',
    },
    searchWrapper: {
      flex: 1, backgroundColor: c.card, borderRadius: borderRadius.md,
      borderWidth: 1, borderColor: c.border, flexDirection: 'row',
      alignItems: 'center', paddingHorizontal: spacing.md, height: 46,
    },
    searchIcon: { marginRight: spacing.sm },
    searchInput: { flex: 1, color: c.text, fontSize: 15 },
    addButton: {
      width: 46, height: 46, borderRadius: borderRadius.md,
      backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center',
    },
    promoCard: {
      marginHorizontal: spacing.md, marginBottom: spacing.md, padding: spacing.md,
      backgroundColor: c.card, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: c.border,
      gap: spacing.sm,
    },
    promoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    promoTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    promoSubtitle: { fontSize: 13, color: c.textMuted, lineHeight: 18 },
    promoAction: {
      flexDirection: 'row', height: 40, backgroundColor: c.primary, borderRadius: borderRadius.sm,
      justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 4,
    },
    promoActionTxt: { color: '#090D16', fontWeight: '700', fontSize: 13 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    contactItem: {
      flexDirection: 'row', alignItems: 'center', padding: spacing.md,
      backgroundColor: c.card, borderBottomWidth: 1, borderBottomColor: c.border,
    },
    avatar: {
      marginRight: spacing.md,
    },
    contactInfo: { flex: 1, justifyContent: 'center' },
    contactName: { fontSize: 16, fontWeight: '600', color: c.text, marginBottom: 4 },
    phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    contactPhone: { fontSize: 13, color: c.textMuted },
    actionsContainer: { flexDirection: 'row', gap: spacing.sm },
    actionBtn: {
      width: 38, height: 38, borderRadius: 19, borderWidth: 1,
      justifyContent: 'center', alignItems: 'center',
    },
    footerLoader: { paddingVertical: spacing.md, alignItems: 'center' },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    emptyIcon: { marginBottom: spacing.md },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: c.text, marginBottom: spacing.xs },
    emptySubtitle: { fontSize: 14, color: c.textMuted, textAlign: 'center', lineHeight: 20 },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', paddingTop: Platform.OS !== 'web' ? insets.top : 0 },
    modalContent: { flex: 1, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg, borderWidth: 1, marginTop: 10 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.md, borderBottomWidth: 1, borderTopLeftRadius: borderRadius.lg, borderTopRightRadius: borderRadius.lg },
    modalTitle: { fontSize: 17, fontWeight: '700' },
    modalForm: { padding: spacing.md, gap: spacing.md },
    formGroup: { gap: 6 },
    formLabel: { fontSize: 13, fontWeight: '700', color: c.textMuted },
    inputWrapper: {
      flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: c.border,
      borderRadius: borderRadius.md, backgroundColor: c.card, paddingHorizontal: spacing.md, height: 48,
    },
    formInput: { flex: 1, color: c.text, fontSize: 15 },
    inputHelp: { fontSize: 11, color: c.textMuted, fontStyle: 'italic' },
    formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    cancelBtn: { flex: 1, height: 48, borderRadius: borderRadius.md, borderWidth: 1, borderColor: c.border, justifyContent: 'center', alignItems: 'center' },
    cancelBtnTxt: { color: c.textMuted, fontSize: 14, fontWeight: '700' },
    saveBtn: { flex: 1, height: 48, borderRadius: borderRadius.md, backgroundColor: c.primary, justifyContent: 'center', alignItems: 'center' },
    saveBtnTxt: { color: '#090D16', fontSize: 14, fontWeight: '700' },
    // Split phone layout
    phoneInputContainer: { flexDirection: 'row', gap: spacing.sm },
    countrySelector: {
      flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: borderRadius.md,
      paddingHorizontal: spacing.sm, height: 48, gap: 4, minWidth: 96, justifyContent: 'center',
    },
    countryFlag: { fontSize: 18 },
    countryCodeText: { fontSize: 14, fontWeight: '600' },
    localPhoneWrapper: {
      flex: 1, borderWidth: 1, borderRadius: borderRadius.md,
      justifyContent: 'center', paddingHorizontal: spacing.md, height: 48,
    },
    localPhoneInput: { flex: 1, fontSize: 15 },
    // Country Sheet search & rows
    countrySearchWrapper: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md,
      height: 48, gap: spacing.sm, borderBottomWidth: 1,
    },
    countrySearchInput: { flex: 1, fontSize: 14 },
    countryItemRow: {
      flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg,
      paddingVertical: 14, borderBottomWidth: 1, gap: spacing.md,
    },
    countryItemFlag: { fontSize: 22 },
    countryItemName: { flex: 1, fontSize: 15, fontWeight: '500' },
    countryItemCode: { fontSize: 14, fontWeight: '700' },

    // Contact Detail Card Styles
    contactCard: {
      alignItems: 'center',
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      borderWidth: 1,
      marginBottom: spacing.md,
    },
    contactCardName: {
      fontSize: 18,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },
    contactCardDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 4,
    },
    contactCardDetailText: {
      fontSize: 14,
    },
    detailsSection: {
      borderWidth: 1,
      borderRadius: borderRadius.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    sectionTitleIconRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    detailsSectionTitle: {
      fontSize: 14,
      fontWeight: '700',
    },
    extraInfoContainer: {
      gap: spacing.sm,
    },
    extraInfoCard: {
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      borderWidth: 1,
    },
    extraInfoLabel: {
      fontSize: 11,
      color: c.textMuted,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    extraInfoValue: {
      fontSize: 14,
      marginTop: 2,
      fontWeight: '500',
    },
    noDataText: {
      fontSize: 13,
      color: c.textMuted,
      fontStyle: 'italic',
      textAlign: 'center',
      paddingVertical: spacing.xs,
    },
  });
}
