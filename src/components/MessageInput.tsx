// src/components/MessageInput.tsx
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, Text, Platform, Modal, Image, ScrollView, FlatList, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, spacing, borderRadius } from '../theme/colors';
import { Send, Paperclip, Mic, Square, StickyNote, X, PlusCircle, CalendarClock, Sparkles, ShoppingBag, Play, Pause, Trash2, Zap, FileSignature, Database, Image as ImageIcon, Upload } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  useAudioStream,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  AudioQuality,
  IOSOutputFormat,
  RecordingOptions,
} from 'expo-audio';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCompanyCatalogUrl } from '../services/catalog';
import * as FileSystem from 'expo-file-system/legacy';
import { RealMp3Recorder } from '../services/mp3Encoder';

interface MessageInputProps {
  ticketId: string;
  contactId: number;
}

interface Product {
  id: string | number;
  name?: string;
  title?: string;
  code?: string;
  description?: string;
  details?: string;
  price?: string | number;
  value?: string | number;
  image?: string;
  imageUrl?: string;
  main_image?: string;
  thumbnail?: string;
  url?: string;
  link?: string;
  video_url?: string;
  built_area?: string | number;
}

const getAudioFileInfoFromUri = (uri: string, mimeTypeOverride?: string) => {
  if (!uri) return { ext: 'm4a', mime: 'audio/mp4' };
  const uriLower = uri.toLowerCase().split('?')[0];
  let ext = 'm4a';
  let mime = 'audio/mp4';

  if (uriLower.endsWith('.aac')) {
    ext = 'aac';
    mime = 'audio/aac';
  } else if (uriLower.endsWith('.mp3')) {
    ext = 'mp3';
    mime = 'audio/mpeg';
  } else if (uriLower.endsWith('.wav')) {
    ext = 'wav';
    mime = 'audio/wav';
  } else if (uriLower.endsWith('.webm')) {
    ext = 'webm';
    mime = 'audio/webm';
  } else if (uriLower.endsWith('.ogg') || uriLower.endsWith('.opus')) {
    ext = 'ogg';
    mime = 'audio/ogg';
  } else if (uriLower.endsWith('.mp4') || uriLower.endsWith('.m4a')) {
    ext = 'm4a';
    mime = 'audio/mp4';
  }

  if (mimeTypeOverride && mimeTypeOverride.startsWith('audio/') && mimeTypeOverride !== 'application/octet-stream') {
    mime = mimeTypeOverride;
  }

  return { ext, mime };
};

const WHATSAPP_VOICE_PRESET: RecordingOptions = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1, // CRITICAL: WhatsApp voice notes strictly require Mono (1 channel)
  bitRate: 64000,
  android: {
    extension: '.m4a',
    outputFormat: 'mpeg4',
    audioEncoder: 'aac',
  },
  ios: {
    extension: '.m4a',
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.HIGH,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm;codecs=opus',
    bitsPerSecond: 64000,
  },
};

const WebDatePicker = ({ value, onChange, themeColors, theme }: any) => {
  if (Platform.OS !== 'web') return null;
  const React = require('react');
  return React.createElement('input', {
    type: 'date',
    value: value,
    onChange: (e: any) => onChange(e.target.value),
    style: {
      backgroundColor: themeColors.background,
      color: themeColors.text,
      border: `1px solid ${themeColors.border}`,
      padding: '10px 12px',
      borderRadius: '6px',
      width: '100%',
      boxSizing: 'border-box',
      marginBottom: '12px',
      fontSize: '14px',
      outline: 'none',
      colorScheme: theme === 'dark' ? 'dark' : 'light',
    }
  });
};

const WebTimePicker = ({ value, onChange, themeColors, theme }: any) => {
  if (Platform.OS !== 'web') return null;
  const React = require('react');
  return React.createElement('input', {
    type: 'time',
    value: value,
    onChange: (e: any) => onChange(e.target.value),
    style: {
      backgroundColor: themeColors.background,
      color: themeColors.text,
      border: `1px solid ${themeColors.border}`,
      padding: '10px 12px',
      borderRadius: '6px',
      width: '100%',
      boxSizing: 'border-box',
      marginBottom: '12px',
      fontSize: '14px',
      outline: 'none',
      colorScheme: theme === 'dark' ? 'dark' : 'light',
    }
  });
};

export const MessageInput: React.FC<MessageInputProps> = ({ ticketId, contactId }) => {
  const { theme, user } = useAuth();
  const c = colors[theme];

  const [text, setText] = useState('');
  const [isNote, setIsNote] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);

  // Message Signature States
  const [useSignature, setUseSignature] = useState(false);
  const [customSignature, setCustomSignature] = useState('');

  // Database Images Gallery Modal States
  const [dbImagesModalOpen, setDbImagesModalOpen] = useState(false);
  const [dbImages, setDbImages] = useState<any[]>([]);
  const [loadingDbImages, setLoadingDbImages] = useState(false);
  const [dbImagesSearch, setDbImagesSearch] = useState('');

  // Audio Recording State using the new expo-audio API
  const recorder = useAudioRecorder(WHATSAPP_VOICE_PRESET);
  const recorderState = useAudioRecorderState(recorder);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [recordedFileName, setRecordedFileName] = useState('');
  const [showAudioPreview, setShowAudioPreview] = useState(false);

  // Real MP3 streaming recorder
  const mp3RecorderRef = useRef<RealMp3Recorder>(new RealMp3Recorder(44100));
  const [streamDuration, setStreamDuration] = useState(0);
  const streamTimerRef = useRef<any>(null);

  const { stream: audioStream } = useAudioStream({
    sampleRate: 44100,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer) => {
      if (buffer?.data) {
        mp3RecorderRef.current.processBuffer(buffer.data, buffer.sampleRate);
      }
    },
  });

  useEffect(() => {
    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
      }
    };
  }, []);

  // Setup preview player for the recorded audio
  const previewPlayer = useAudioPlayer(recordedUri);
  const previewStatus = useAudioPlayerStatus(previewPlayer);

  useEffect(() => {
    if (previewStatus.didJustFinish) {
      previewPlayer.seekTo(0);
    }
  }, [previewPlayer, previewStatus.didJustFinish]);

  // Image Preview Modal State
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewFileName, setPreviewFileName] = useState('');
  const [previewCaption, setPreviewCaption] = useState('');

  // Scheduled Message Local State (from input bar)
  const [schedModalOpen, setSchedModalOpen] = useState(false);
  const [schedDate, setSchedDate] = useState('');
  const [schedTime, setSchedTime] = useState('');

  // andoPages Catalog Integration States
  const [catalogUrl, setCatalogUrl] = useState('');
  const [catalogModalOpen, setCatalogModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Quick Answers states
  const [quickAnswers, setQuickAnswers] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);
  const [quickAnswersModalOpen, setQuickAnswersModalOpen] = useState(false);
  const [quickAnswersSearch, setQuickAnswersSearch] = useState('');
  const [isPickingForPreview, setIsPickingForPreview] = useState(false);
  const [showCaptionSuggestions, setShowCaptionSuggestions] = useState(false);
  const [filteredCaptionSuggestions, setFilteredCaptionSuggestions] = useState<any[]>([]);

  // Load Signature setting on mount and when user profile changes
  useEffect(() => {
    const loadSigSettings = async () => {
      try {
        const savedUseSig = await AsyncStorage.getItem('@whaticket:useSignature');
        const savedCustomSig = await AsyncStorage.getItem('@whaticket:customSignature');
        setUseSignature(savedUseSig === 'true');
        setCustomSignature(savedCustomSig || `*~${user?.name || 'Asesor'}:~*`);
      } catch (err) {
        console.error('Error loading signature in MessageInput:', err);
      }
    };
    loadSigSettings();
  }, [user?.name]);

  const toggleSignature = async () => {
    const newVal = !useSignature;
    setUseSignature(newVal);
    await AsyncStorage.setItem('@whaticket:useSignature', newVal ? 'true' : 'false');
  };

  const getSignaturePrefix = () => {
    if (!useSignature) return '';
    if (customSignature && customSignature.trim()) {
      return `${customSignature.trim()}\n`;
    }
    return `*~${user?.name || 'Asesor'}:~*\n`;
  };

  // Request permissions and load catalog URL on mount
  useEffect(() => {
    (async () => {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        console.log('Microphone permission was not granted.');
      }
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });
    })();

    const loadCatalogUrl = async () => {
      try {
        const savedUrl = await getCompanyCatalogUrl();
        if (savedUrl) {
          setCatalogUrl(savedUrl);
        }
      } catch (err) {
        console.error('Error loading catalog URL in input:', err);
      }
    };
    loadCatalogUrl();

    const loadQuickAnswers = async () => {
      const endpointsToTry = ['/quick-answers', '/quickanswers'];
      for (const endpoint of endpointsToTry) {
        try {
          const response = await api.get(endpoint);
          const data = response.data;
          const answersList = Array.isArray(data) ? data : (data?.quickAnswers || data?.data || []);
          setQuickAnswers(answersList);
          return;
        } catch (err) {
          console.log(`Failed to fetch quick answers on mount from ${endpoint}:`, err);
        }
      }
    };
    loadQuickAnswers();
  }, []);

  // Load draft text for ticketId if present
  useEffect(() => {
    if (!ticketId) return;
    const loadDraft = async () => {
      try {
        const savedDraft = await AsyncStorage.getItem(`@whaticket:draft:${ticketId}`);
        if (savedDraft) {
          setText(savedDraft);
        } else {
          setText('');
        }
      } catch (e) {
        console.error('Error loading draft:', e);
      }
    };
    loadDraft();
  }, [ticketId]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Fetch products from andoPages API URL
  const fetchCatalogProducts = async (targetUrl?: string) => {
    const activeUrl = targetUrl || catalogUrl;
    if (!activeUrl) {
      console.log(' [andoPages] No active URL found to fetch.');
      return;
    }
    try {
      // Add a cache buster parameter to prevent browser cache from serving the old HTML redirect
      const cacheBusterUrl = activeUrl.includes('?') 
        ? `${activeUrl}&_cb=${Date.now()}` 
        : `${activeUrl}?_cb=${Date.now()}`;

      console.log(' [andoPages] Requesting catalog URL (with cache-buster):', cacheBusterUrl);
      setLoadingCatalog(true);
      
      const response = await axios.get(cacheBusterUrl);
      if (response.data && Array.isArray(response.data.products)) {
        setProducts(response.data.products);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.error(' [andoPages] Error fetching products:', err);
      setProducts([]);
    } finally {
      setLoadingCatalog(false);
    }
  };

  useEffect(() => {
    if (catalogModalOpen) {
      const reloadAndFetch = async () => {
        try {
          const savedUrl = await getCompanyCatalogUrl();
          if (savedUrl) {
            setCatalogUrl(savedUrl);
            await fetchCatalogProducts(savedUrl);
          } else {
            setProducts([]);
            Alert.alert('Aviso', 'No tienes configurada la URL del catálogo en Ajustes.');
          }
        } catch (err) {
          console.error('Error reloading catalog url:', err);
        }
      };
      reloadAndFetch();
    }
  }, [catalogModalOpen]);

  // Calculate next 7 days for quick mobile selection
  const getNext7Days = () => {
    const days = [];
    const weekdayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      let label = '';
      if (i === 0) label = 'Hoy';
      else if (i === 1) label = 'Mañana';
      else {
        label = `${weekdayNames[d.getDay()]} ${d.getDate()}`;
      }
      days.push({ dateStr, label });
    }
    return days;
  };

  const commonTimes = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

  const handleSendText = async () => {
    if (!text.trim()) return;

    // Handle Scheduled Message Mode
    if (isScheduled) {
      if (!schedDate || !schedTime) {
        setSchedModalOpen(true);
        return;
      }

      try {
        setLoading(true);
        const sendAt = `${schedDate}T${schedTime}:00`;
        if (new Date(sendAt).getTime() <= Date.now()) {
          Alert.alert('Error', 'La fecha y hora de envío debe ser en el futuro.');
          return;
        }

        await api.post('/scheduled-messages', {
          body: text.trim(),
          sendAt,
          contactId: contactId,
          ticketId: Number(ticketId),
        });

        Alert.alert('Éxito', 'Mensaje programado correctamente.');
        setText('');
        setIsScheduled(false);
        setSchedDate('');
        setSchedTime('');
      } catch (error: any) {
        console.error('Error creating scheduled message from input:', error);
        Alert.alert('Error', 'No se pudo programar el mensaje.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle Normal message or Private note
    try {
      setLoading(true);
      const sigPrefix = !isNote ? getSignaturePrefix() : '';
      const bodyText = text.trim();
      const finalBody = sigPrefix ? `${sigPrefix}${bodyText}` : bodyText;

      const payload = {
        read: 1,
        fromMe: true,
        mediaUrl: '',
        body: finalBody,
        isNote: isNote,
      };

      await api.post(`/messages/${ticketId}`, payload);
      setText('');
      if (ticketId) {
        AsyncStorage.removeItem(`@whaticket:draft:${ticketId}`).catch(() => {});
      }
      setIsNote(false);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'No se pudo enviar el mensaje.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        // Open Preview Modal with custom caption support (prefilled with current text)
        setPreviewUri(selectedAsset.uri);
        setPreviewFileName(selectedAsset.fileName || 'photo.jpg');
        setPreviewCaption(text);
        setPreviewVisible(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo abrir la galería.');
    }
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        const rawMime = selectedAsset.mimeType;
        const isAudio = rawMime?.startsWith('audio/') || 
          /\.(mp3|m4a|wav|aac|ogg|opus|flac|3gp)$/i.test(selectedAsset.name || '');

        const audioMime = isAudio
          ? (rawMime && rawMime.startsWith('audio/') && rawMime !== 'audio/m4a' && rawMime !== 'audio/mp3' ? rawMime : (selectedAsset.name?.endsWith('.mp3') ? 'audio/mpeg' : 'audio/mp4'))
          : rawMime;

        await sendMediaMessage(
          selectedAsset.uri,
          isAudio ? 'audio' : 'file',
          selectedAsset.name || (isAudio ? `audio_${Date.now()}.m4a` : 'file'),
          text.trim() || '', // Send with the current text as caption
          audioMime
        );
        setText(''); // Clear the text input after sending
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'No se pudo abrir el selector de documentos.');
    }
  };

  const handleOpenDbImagesModal = async () => {
    setDbImagesModalOpen(true);
    setLoadingDbImages(true);
    try {
      const imagesList: any[] = [];
      const seenUrls = new Set<string>();

      // 1. Primary: Fetch images from Whaticket Media Gallery (/media-gallery)
      try {
        const response = await api.get('/media-gallery', {
          params: {
            mediaType: 'image',
            pageNumber: 1,
            searchParam: dbImagesSearch || undefined,
          }
        });
        const galleryData = response.data;
        const items = Array.isArray(galleryData) 
          ? galleryData 
          : (galleryData?.media || galleryData?.records || galleryData?.data || []);

        items.forEach((item: any) => {
          if (item.mediaUrl || item.url) {
            const mediaPath = item.mediaUrl || item.url;
            const cleanBase = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
            const fullUrl = mediaPath.startsWith('http') 
              ? mediaPath 
              : `${cleanBase}/${mediaPath.replace(/^\/+/, '')}`;
            
            if (!seenUrls.has(fullUrl)) {
              seenUrls.add(fullUrl);
              imagesList.push({
                id: `mg-${item.id}`,
                title: item.title || item.name || 'Galería Whaticket',
                url: fullUrl,
                caption: item.caption || '',
                source: 'Galería Whaticket',
                isMediaGallery: true,
                rawId: item.id,
              });
            }
          }
        });
      } catch (err) {
        console.log('Media gallery API call note:', err);
      }

      // 2. Secondary: Fetch images from Quick Answers
      const endpointsToTry = ['/quick-answers', '/quickanswers'];
      for (const endpoint of endpointsToTry) {
        try {
          const res = await api.get(endpoint);
          const qaList = Array.isArray(res.data) ? res.data : (res.data?.quickAnswers || res.data?.data || []);
          qaList.forEach((qa: any) => {
            const parsed = parseQuickAnswerMessage(qa.message || '');
            if (parsed.hasMedia && parsed.mediaUrl) {
              const lower = parsed.mediaUrl.toLowerCase();
              if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png') || lower.endsWith('.webp') || lower.endsWith('.gif') || parsed.mimeType?.startsWith('image')) {
                const cleanBase = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');
                const fullUrl = parsed.mediaUrl.startsWith('http') ? parsed.mediaUrl : `${cleanBase}/${parsed.mediaUrl.replace(/^\/+/, '')}`;
                if (!seenUrls.has(fullUrl)) {
                  seenUrls.add(fullUrl);
                  imagesList.push({
                    id: `qa-${qa.id}`,
                    title: qa.shortcut || 'Respuesta Rápida',
                    url: fullUrl,
                    caption: parsed.cleanText || '',
                    source: 'Respuesta Rápida',
                    isMediaGallery: false,
                    rawId: qa.id,
                  });
                }
              }
            }
          });
          break;
        } catch (e) {
          console.log('Error fetching DB images from quick answers:', e);
        }
      }

      setDbImages(imagesList);
    } catch (err) {
      console.error('Error opening DB images modal:', err);
    } finally {
      setLoadingDbImages(false);
    }
  };

  const handleSelectDbImage = async (imgItem: any) => {
    setDbImagesModalOpen(false);
    
    if (imgItem.isMediaGallery && imgItem.rawId) {
      // Open preview modal prefilled with item caption or user text
      setPreviewUri(imgItem.url);
      setPreviewFileName(`media-gallery-${imgItem.rawId}.jpg`);
      setPreviewCaption(imgItem.caption || text);
      setPreviewVisible(true);
    } else {
      setPreviewUri(imgItem.url);
      setPreviewFileName(`db-image-${Date.now()}.jpg`);
      setPreviewCaption(imgItem.caption || text);
      setPreviewVisible(true);
    }
  };

  const handleUploadToMediaGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setLoading(true);
        const formData = new FormData();
        const cleanUri = (Platform.OS === 'ios' || Platform.OS === 'android') && asset.uri.startsWith('/') ? `file://${asset.uri}` : asset.uri;
        
        formData.append('files', {
          uri: cleanUri,
          name: asset.fileName || `gallery-${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        } as any);
        formData.append('title', asset.fileName || 'Nueva foto');

        await api.post('/media-gallery', formData);

        Alert.alert('Éxito', 'Imagen subida a la Galería Multimedia de Whaticket.');
        await handleOpenDbImagesModal();
      }
    } catch (err) {
      console.error('Error uploading to media gallery:', err);
      Alert.alert('Error', 'No se pudo subir la imagen a la galería.');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachmentPress = () => {
    Alert.alert(
      'Enviar adjunto',
      '¿Qué tipo de archivo deseas enviar?',
      [
        {
          text: 'Imagen (Galería local)',
          onPress: handlePickImage,
        },
        {
          text: 'Imágenes de la Base de Datos',
          onPress: handleOpenDbImagesModal,
        },
        {
          text: 'Producto del Marketplace',
          onPress: () => {
            setCatalogModalOpen(true);
          },
        },
        {
          text: 'Documento / Archivo',
          onPress: handlePickFile,
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  // Helper to send media files via FormData (supports custom caption/body text)
  const sendMediaMessage = async (uri: string, type: 'image' | 'audio' | 'file', fileName: string, caption = '', mimeType?: string) => {
    let tempUploadFile: string | null = null;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('fromMe', 'true');
      
      const sigPrefix = (!isNote && type !== 'audio') ? getSignaturePrefix() : '';
      let textCaption = caption.trim();
      if (sigPrefix) {
        textCaption = textCaption ? `${sigPrefix}${textCaption}` : sigPrefix.trim();
      }

      let targetFileName = fileName;
      let fileType = 'application/octet-stream';

      if (type === 'audio') {
        const isMp3 = fileName && fileName.toLowerCase().endsWith('.mp3');
        targetFileName = isMp3 ? fileName : `${Date.now()}.mp3`;
        fileType = mimeType || 'audio/mp3';
      } else if (type === 'image') {
        fileType = mimeType || 'image/jpeg';
      } else {
        fileType = mimeType || 'application/octet-stream';
      }

      // Use user's caption if filled, otherwise fallback to fileName.
      formData.append('body', textCaption || targetFileName);
      if (type === 'audio') {
        formData.append('mediaType', 'audio');
      } else if (type === 'file') {
        formData.append('mediaType', 'file');
      }

      if (isNote) {
        formData.append('isNote', 'true');
      }

      let cleanUri = uri;
      if (Platform.OS === 'android' || Platform.OS === 'ios') {
        if (!cleanUri.startsWith('file://') && !cleanUri.startsWith('content://') && !cleanUri.startsWith('http')) {
          cleanUri = `file://${cleanUri}`;
        }
      }

      if (Platform.OS !== 'web') {
        const token = await AsyncStorage.getItem('@whaticket:token');
        const savedApiUrl = (await AsyncStorage.getItem('@whaticket:api_url')) || 'https://api.andoticket.cloud';
        const cleanApiUrl = savedApiUrl.replace(/\/+$/, '');

        let fileToUploadUri = cleanUri;
        // For audio (or any media), ensure file on disk matches targetFileName so FileSystem.uploadAsync sends the exact filename in multipart headers
        if (targetFileName && (!cleanUri.endsWith(`/${targetFileName}`) && !cleanUri.endsWith(`\\${targetFileName}`))) {
          const cacheTargetUri = `${FileSystem.cacheDirectory}${targetFileName}`;
          await FileSystem.copyAsync({ from: cleanUri, to: cacheTargetUri });
          fileToUploadUri = cacheTargetUri;
          tempUploadFile = cacheTargetUri;
        }

        // Use FileSystem.uploadAsync for reliable native file uploads instead of RN's buggy FormData
        const uploadResult = await FileSystem.uploadAsync(`${cleanApiUrl}/messages/${ticketId}`, fileToUploadUri, {
          fieldName: 'medias',
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          mimeType: fileType,
          parameters: {
            fromMe: 'true',
            body: textCaption || targetFileName,
            ...(isNote ? { isNote: 'true' } : {})
          },
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            Accept: 'application/json',
          },
        });

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          throw new Error(`Upload failed with status ${uploadResult.status}`);
        }
      } else {
        const response = await fetch(uri);
        const blob = await response.blob();
        const fileData = new File([blob], targetFileName, { type: fileType });
        formData.append('medias', fileData);
        await api.post(`/messages/${ticketId}`, formData);
      }

      if (ticketId) {
        AsyncStorage.removeItem(`@whaticket:draft:${ticketId}`).catch(() => {});
      }
      setIsNote(false); // Success, clear note mode
    } catch (error: any) {
      console.error('Error sending media:', error?.message || error);
      Alert.alert('Error', 'No se pudo enviar el archivo adjunto.');
    } finally {
      if (tempUploadFile) {
        FileSystem.deleteAsync(tempUploadFile, { idempotent: true }).catch(() => {});
      }
      setLoading(false);
    }
  };

  const handleSendImageWithCaption = async () => {
    if (!previewUri) return;
    setPreviewVisible(false);
    await sendMediaMessage(previewUri, 'image', previewFileName, previewCaption);
  };

  // Audio Recording Methods using the new expo-audio API and real MP3 encoding
  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permiso requerido', 'Necesitamos acceso al micrófono para grabar audios.');
        return;
      }

      if (previewPlayer.playing) {
        previewPlayer.pause();
      }

      setRecordedUri(null);
      setRecordedFileName('');
      setShowAudioPreview(false);
      setStreamDuration(0);

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      if (Platform.OS !== 'web' && audioStream) {
        mp3RecorderRef.current.init(44100);
        await audioStream.start();
        setIsRecording(true);
        if (streamTimerRef.current) clearInterval(streamTimerRef.current);
        streamTimerRef.current = setInterval(() => {
          setStreamDuration((prev) => prev + 1);
        }, 1000);
      } else {
        await recorder.prepareToRecordAsync(WHATSAPP_VOICE_PRESET);
        setIsRecording(true);
        recorder.record();
      }
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'No se pudo iniciar la grabación de audio.');
      setIsRecording(false);
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    }
  };

  const stopRecording = async () => {
    try {
      setIsRecording(false);
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });

      let finalUri: string | null = null;
      if (Platform.OS !== 'web' && audioStream) {
        try {
          audioStream.stop();
          finalUri = await mp3RecorderRef.current.finalizeToFile();
        } catch (streamErr) {
          console.error('Error stopping audioStream, falling back to recorder:', streamErr);
        }
      }

      if (!finalUri && recorder) {
        await recorder.stop();
        finalUri = recorder.uri;
      }

      if (finalUri) {
        const fileName = `${Date.now()}.mp3`;
        setRecordedUri(finalUri);
        setRecordedFileName(fileName);
        setShowAudioPreview(true);
        previewPlayer.replace(finalUri);
      } else {
        Alert.alert('Error', 'No se encontró el audio grabado.');
      }
    } catch (error) {
      console.error('Failed to stop recording', error);
      Alert.alert('Error', 'No se pudo finalizar la grabación.');
      setIsRecording(false);
    }
  };

  const clearAudioPreview = () => {
    if (previewPlayer.playing) {
      previewPlayer.pause();
    }
    previewPlayer.seekTo(0);
    setRecordedUri(null);
    setRecordedFileName('');
    setShowAudioPreview(false);
    setStreamDuration(0);
    mp3RecorderRef.current.cancel();
  };

  const toggleAudioPreview = () => {
    if (!recordedUri) return;

    if (previewPlayer.playing) {
      previewPlayer.pause();
    } else {
      previewPlayer.play();
    }
  };

  const handleSendRecordedAudio = async () => {
    if (!recordedUri) return;

    try {
      if (Platform.OS !== 'web') {
        const fileInfo = await FileSystem.getInfoAsync(recordedUri);
        if (!fileInfo.exists || (fileInfo.exists && (fileInfo.size ?? 0) === 0)) {
          console.error('Recorded audio file is missing or 0 bytes:', recordedUri, fileInfo);
          Alert.alert('Error', 'El audio grabado está vacío o dañado. Por favor graba de nuevo.');
          clearAudioPreview();
          return;
        }
      }

      const fileName = recordedFileName || `${Date.now()}.mp3`;
      const uriToSend = recordedUri;
      clearAudioPreview();
      setText(''); // Clear the text input after sending

      await sendMediaMessage(uriToSend, 'audio', fileName, '', 'audio/mp3');
    } catch (err) {
      console.error('Error sending recorded audio:', err);
      Alert.alert('Error', 'No se pudo enviar el mensaje de audio.');
    }
  };

  // Date/Time Shortcuts for Input Bar Schedule Modal
  const setShortcutInOneHour = () => {
    const later = new Date();
    later.setHours(later.getHours() + 1);
    setSchedDate(later.toISOString().split('T')[0]);
    setSchedTime(later.toTimeString().split(' ')[0].substring(0, 5));
  };

  const setShortcutTomorrow = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSchedDate(tomorrow.toISOString().split('T')[0]);
    setSchedTime(tomorrow.toTimeString().split(' ')[0].substring(0, 5));
  };

  const setShortcut24Hours = () => {
    const later = new Date();
    later.setHours(later.getHours() + 24);
    setSchedDate(later.toISOString().split('T')[0]);
    setSchedTime(later.toTimeString().split(' ')[0].substring(0, 5));
  };

  const setShortcutMonday9AM = () => {
    const now = new Date();
    const resultDate = new Date();
    resultDate.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    resultDate.setHours(9, 0, 0, 0);
    setSchedDate(resultDate.toISOString().split('T')[0]);
    setSchedTime('09:00');
  };

  const handleCancelScheduledMode = () => {
    setIsScheduled(false);
    setSchedDate('');
    setSchedTime('');
  };

  // Prefill default preview date/time (tomorrow at current hour) when modal opens
  useEffect(() => {
    if (schedModalOpen) {
      if (!schedDate && !schedTime) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setSchedDate(tomorrow.toISOString().split('T')[0]);
        
        const now = new Date();
        setSchedTime(now.toTimeString().split(' ')[0].substring(0, 5));
      }
    }
  }, [schedModalOpen]);

  const handleSelectProduct = (prod: Product) => {
    const name = prod.title || prod.name || 'Producto';
    const codeStr = prod.code ? ` (${prod.code})` : '';
    const description = prod.description || prod.details || '';
    const price = prod.price || prod.value || '';
    const link = prod.url || prod.link || prod.video_url || '';
    const builtArea = prod.built_area ? `*Área construida:* ${prod.built_area} m²\n` : '';
    const mainImg = prod.main_image || prod.imageUrl || prod.image || prod.thumbnail;

    // Formulate a beautiful product template message
    const formatted = `*🛍️ ${name}${codeStr}*\n\n${description ? `${description}\n\n` : ''}${builtArea}${price ? `*Precio:* $${price}\n` : ''}${link ? `\n🔗 Ver producto / video: ${link}` : ''}`;

    setCatalogModalOpen(false);

    if (mainImg) {
      // If product has a main image, open preview modal to allow sending main_image with caption!
      setPreviewUri(mainImg);
      setPreviewFileName(`product-${prod.id || Date.now()}.jpg`);
      setPreviewCaption(formatted);
      setPreviewVisible(true);
    } else {
      setText(formatted);
    }
  };

  const handleTextChange = (val: string) => {
    setText(val);
    
    if (ticketId) {
      if (!val || !val.trim()) {
        AsyncStorage.removeItem(`@whaticket:draft:${ticketId}`).catch(() => {});
      } else {
        AsyncStorage.setItem(`@whaticket:draft:${ticketId}`, val).catch(() => {});
      }
    }
    
    // Check if the user is typing a shortcut starting with "/"
    const lastSlashIndex = val.lastIndexOf('/');
    if (
      lastSlashIndex !== -1 && 
      (lastSlashIndex === 0 || val[lastSlashIndex - 1] === ' ' || val[lastSlashIndex - 1] === '\n')
    ) {
      const query = val.slice(lastSlashIndex + 1).toLowerCase();
      const filtered = quickAnswers.filter(ans => {
        const cleanShortcut = ans.shortcut.startsWith('/') ? ans.shortcut.slice(1) : ans.shortcut;
        return cleanShortcut.toLowerCase().includes(query);
      });
      
      if (filtered.length > 0) {
        setFilteredSuggestions(filtered);
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  const parseQuickAnswerMessage = (msg: string) => {
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

  const handleSelectQuickAnswer = async (ans: any, isFromSuggestions = false) => {
    const parsed = parseQuickAnswerMessage(ans.message || '');
    
    if (isFromSuggestions) {
      setShowSuggestions(false);
    } else {
      setQuickAnswersModalOpen(false);
    }

    if (parsed.hasMedia) {
      Alert.alert(
        'Enviar respuesta rápida',
        `¿Deseas enviar el archivo adjunto junto con la respuesta rápida?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Enviar',
            onPress: async () => {
              try {
                setLoading(true);
                await api.post(`/messages/${ticketId}`, {
                  read: 1,
                  fromMe: true,
                  mediaUrl: parsed.mediaUrl,
                  body: parsed.cleanText.trim(),
                });
                
                if (isFromSuggestions) {
                  const lastSlashIndex = text.lastIndexOf('/');
                  if (lastSlashIndex !== -1) {
                    setText(text.slice(0, lastSlashIndex));
                  }
                }
              } catch (error) {
                console.error('Error sending media quick answer:', error);
                Alert.alert('Error', 'No se pudo enviar la respuesta rápida con archivo.');
              } finally {
                setLoading(false);
              }
            }
          }
        ]
      );
    } else {
      if (isFromSuggestions) {
        const lastSlashIndex = text.lastIndexOf('/');
        const prefix = text.slice(0, lastSlashIndex);
        setText(prefix + parsed.cleanText);
      } else {
        setText(parsed.cleanText);
      }
    }
  };

  const handleSelectSuggestion = (ans: any) => {
    handleSelectQuickAnswer(ans, true);
  };

  const handleCaptionChange = (val: string) => {
    setPreviewCaption(val);
    
    // Check if the user is typing a shortcut starting with "/" in the image preview caption
    const lastSlashIndex = val.lastIndexOf('/');
    if (
      lastSlashIndex !== -1 && 
      (lastSlashIndex === 0 || val[lastSlashIndex - 1] === ' ' || val[lastSlashIndex - 1] === '\n')
    ) {
      const query = val.slice(lastSlashIndex + 1).toLowerCase();
      const filtered = quickAnswers.filter(ans => {
        const cleanShortcut = ans.shortcut.startsWith('/') ? ans.shortcut.slice(1) : ans.shortcut;
        return cleanShortcut.toLowerCase().includes(query);
      });
      
      if (filtered.length > 0) {
        setFilteredCaptionSuggestions(filtered);
        setShowCaptionSuggestions(true);
      } else {
        setShowCaptionSuggestions(false);
      }
    } else {
      setShowCaptionSuggestions(false);
    }
  };

  const handleSelectCaptionSuggestion = (ans: any) => {
    const parsed = parseQuickAnswerMessage(ans.message || '');
    const lastSlashIndex = previewCaption.lastIndexOf('/');
    const prefix = previewCaption.slice(0, lastSlashIndex);
    setPreviewCaption(prefix + parsed.cleanText);
    setShowCaptionSuggestions(false);
  };





  const insets = useSafeAreaInsets();
  const st = buildStyles(c, insets, keyboardVisible);

  return (
    <View style={[st.container, isNote && st.noteContainer, isScheduled && st.scheduledContainer]}>
      
      {/* Suggestions Popup */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <View style={st.suggestionsContainer}>
          <FlatList
            data={filteredSuggestions}
            keyExtractor={(item) => item.id.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const isItemPrivate = typeof item.isPrivate === 'boolean' 
                ? item.isPrivate 
                : !!item.userId;
              return (
                <TouchableOpacity
                  style={[st.suggestionItem, { borderBottomColor: c.border }]}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <View style={st.suggestionHeader}>
                    <Text style={st.suggestionShortcut}>{item.shortcut}</Text>
                    <View style={[
                      st.suggestionBadge,
                      { backgroundColor: isItemPrivate ? c.border : c.primaryLight }
                    ]}>
                      <Text style={[
                        st.suggestionBadgeText,
                        { color: isItemPrivate ? c.textMuted : c.primary }
                      ]}>
                        {isItemPrivate ? 'Privada' : 'Compartida'}
                      </Text>
                    </View>
                  </View>
                  <Text style={st.suggestionMessage} numberOfLines={1}>
                    {item.message}
                  </Text>
                </TouchableOpacity>
              );
            }}
            style={{ maxHeight: 200 }}
          />
        </View>
      )}
      
      {/* Mode Menu Toolbar (displayed horizontally above input bar when showModeMenu is active) */}
      {showModeMenu && (
        <View style={st.modeMenuRow}>
          <TouchableOpacity
            style={[st.modeMenuBtn, isNote && st.activeNoteBtn]}
            onPress={() => {
              setIsNote(true);
              setIsScheduled(false);
              setShowModeMenu(false);
            }}
          >
            <StickyNote size={15} color={isNote ? '#FFFFFF' : c.text} />
            <Text style={[st.modeMenuText, { color: isNote ? '#FFFFFF' : c.text }]}>Nota Interna</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.modeMenuBtn, isScheduled && st.activeSchedBtn]}
            onPress={() => {
              setIsNote(false);
              setIsScheduled(true);
              setShowModeMenu(false);
              setSchedModalOpen(true); // Open scheduling details right away
            }}
          >
            <CalendarClock size={15} color={isScheduled ? '#FFFFFF' : c.text} />
            <Text style={[st.modeMenuText, { color: isScheduled ? '#FFFFFF' : c.text }]}>Programar Envío</Text>
          </TouchableOpacity>

          {/* Marketplace Catalog Button */}
          <TouchableOpacity
            style={[st.modeMenuBtn, st.catalogModeBtn]}
            onPress={() => {
              setShowModeMenu(false);
              setCatalogModalOpen(true);
            }}
          >
            <ShoppingBag size={15} color={c.primary} />
            <Text style={[st.modeMenuText, { color: c.primary }]}>Catálogo</Text>
          </TouchableOpacity>

          {/* Signature Toggle Button */}
          <TouchableOpacity
            style={[st.modeMenuBtn, useSignature && { backgroundColor: c.primaryLight }]}
            onPress={toggleSignature}
          >
            <FileSignature size={15} color={useSignature ? c.primary : c.text} />
            <Text style={[st.modeMenuText, { color: useSignature ? c.primary : c.text }]}>
              {useSignature ? 'Firma ON' : 'Firma OFF'}
            </Text>
          </TouchableOpacity>

          {/* Database Images Button */}
          <TouchableOpacity
            style={st.modeMenuBtn}
            onPress={() => {
              setShowModeMenu(false);
              handleOpenDbImagesModal();
            }}
          >
            <Database size={15} color={c.primary} />
            <Text style={[st.modeMenuText, { color: c.primary }]}>Imágenes BD</Text>
          </TouchableOpacity>

          {/* Quick Answers Button */}
          <TouchableOpacity
            style={[st.modeMenuBtn, { borderLeftWidth: 1, borderLeftColor: c.border }]}
            onPress={() => {
              setShowModeMenu(false);
              setQuickAnswersModalOpen(true);
            }}
          >
            <Zap size={15} color={c.primary} />
            <Text style={[st.modeMenuText, { color: c.primary }]}>Respuestas</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Indicator for internal note */}
      {isNote && (
        <View style={st.noteHeader}>
          <Text style={st.noteHeaderText}>Modo Nota Interna (Privado)</Text>
          <TouchableOpacity onPress={() => setIsNote(false)}>
            <X size={14} color={c.pending} />
          </TouchableOpacity>
        </View>
      )}

      {/* Indicator for scheduled message */}
      {isScheduled && (
        <View style={st.scheduledHeader}>
          <Text style={st.scheduledHeaderText}>
            {schedDate && schedTime
              ? `Mensaje Programado: ${schedDate} a las ${schedTime} (24h)`
              : 'Programar Envío (Elegir fecha y hora)'}
          </Text>
          <View style={st.scheduledHeaderActions}>
            <TouchableOpacity onPress={() => setSchedModalOpen(true)} style={st.configureScheduleBtn}>
              <Text style={st.configureScheduleBtnText}>Elegir fecha/hora</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCancelScheduledMode}>
              <X size={14} color={c.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showAudioPreview && recordedUri && (
        <View style={st.audioPreviewBar}>
          <TouchableOpacity style={st.audioPreviewPlayBtn} onPress={toggleAudioPreview} disabled={loading}>
            {previewStatus.playing ? (
              <Pause size={18} color={c.primary} fill={c.primary} />
            ) : (
              <Play size={18} color={c.primary} fill={c.primary} />
            )}
          </TouchableOpacity>
          <View style={st.audioPreviewInfo}>
            <Text style={st.audioPreviewTitle}>Audio grabado</Text>
            <Text style={st.audioPreviewSubtitle}>Escúchalo antes de enviarlo</Text>
          </View>
          <TouchableOpacity style={st.audioPreviewIconBtn} onPress={clearAudioPreview} disabled={loading}>
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
          <TouchableOpacity style={st.audioPreviewSendBtn} onPress={handleSendRecordedAudio} disabled={loading}>
            <Send size={18} color="#090D16" fill="#090D16" />
          </TouchableOpacity>
        </View>
      )}

      <View style={st.inputBar}>
        {/* Media Attach Button */}
        {!isRecording && (
          <TouchableOpacity
            style={st.actionButton}
            onPress={handleAttachmentPress}
            disabled={loading}
          >
            <Paperclip size={22} color={c.textMuted} />
          </TouchableOpacity>
        )}

        {/* Toggle Mode Selection Menu (Sticky Note / Scheduled Mode selector) */}
        {!isRecording && (
          <TouchableOpacity
            style={[st.actionButton, (isNote || isScheduled) && st.activeModeIndicatorButton]}
            onPress={() => setShowModeMenu(!showModeMenu)}
            disabled={loading}
          >
            <PlusCircle size={22} color={isNote ? c.pending : isScheduled ? c.primary : c.textMuted} />
          </TouchableOpacity>
        )}

        {/* Input Box / Recording indicator */}
        {isRecording ? (
          <View style={st.recordingIndicator}>
            <View style={st.redDot} />
            <Text style={[st.recordingText, { color: c.textMuted }]}>
              Grabando audio... {Platform.OS !== 'web' ? streamDuration : Math.round((recorderState.durationMillis || 0) / 1000)}s
            </Text>
          </View>
        ) : (
          <TextInput
            style={[
              st.input, 
              isNote && st.noteInput, 
              isScheduled && st.schedInput, 
              { maxHeight: 100 }
            ]}
            placeholder={
              isNote 
                ? "Escribir nota interna..." 
                : isScheduled 
                ? "Mensaje que se programará..." 
                : "Escribir mensaje..."
            }
            placeholderTextColor={c.textMuted}
            value={text}
            onChangeText={handleTextChange}
            multiline
            editable={!loading}
          />
        )}

        {/* Send / Mic Button */}
        {loading ? (
          <View style={st.loaderWrapper}>
            <ActivityIndicator color={c.primary} size="small" />
          </View>
        ) : text.trim().length > 0 ? (
          <TouchableOpacity style={st.sendButton} onPress={handleSendText}>
            <Send size={20} color="#090D16" fill="#090D16" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[st.sendButton, isRecording && st.recordingButton]}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={showAudioPreview}
          >
            {isRecording ? (
              <Square size={18} color="#FFFFFF" fill="#FFFFFF" />
            ) : (
              <Mic size={20} color="#090D16" />
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* ── IMAGE PREVIEW AND CAPTION MODAL ── */}
      <Modal visible={previewVisible} transparent animationType="slide">
        <SafeAreaView style={st.previewOverlay}>
          <View style={st.previewContainer}>
            {/* Top Bar with discard/close */}
            <View style={st.previewHeader}>
              <TouchableOpacity onPress={() => setPreviewVisible(false)} style={st.previewCloseBtn}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={st.previewTitleText}>Enviar Imagen</Text>
              <View style={{ width: 44 }} />
            </View>

            {/* Central Box for the Image */}
            <View style={st.previewImageBox}>
              {previewUri && (
                <Image source={{ uri: previewUri }} style={st.previewFullImage} resizeMode="contain" />
              )}
            </View>

            {/* Suggestions Popup for Caption */}
            {showCaptionSuggestions && filteredCaptionSuggestions.length > 0 && (
              <View style={st.captionSuggestionsContainer}>
                <FlatList
                  data={filteredCaptionSuggestions}
                  keyExtractor={(item) => item.id.toString()}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => {
                    const isItemPrivate = typeof item.isPrivate === 'boolean' 
                      ? item.isPrivate 
                      : !!item.userId;
                    return (
                      <TouchableOpacity
                        style={[st.captionSuggestionItem, { borderBottomColor: 'rgba(255,255,255,0.1)' }]}
                        onPress={() => handleSelectCaptionSuggestion(item)}
                      >
                        <View style={st.captionSuggestionHeader}>
                          <Text style={st.captionSuggestionShortcut}>{item.shortcut}</Text>
                          <Text style={st.captionSuggestionBadge}>{isItemPrivate ? 'Privada' : 'Compartida'}</Text>
                        </View>
                        <Text style={st.captionSuggestionMessage} numberOfLines={1}>
                          {item.message}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                  style={{ maxHeight: 150 }}
                />
              </View>
            )}

            {/* Bottom Bar with Caption Input and Send Button */}
            <View style={st.previewInputBar}>
              <TouchableOpacity 
                style={st.previewZapBtn} 
                onPress={() => {
                  setIsPickingForPreview(true);
                  setQuickAnswersModalOpen(true);
                }}
              >
                <Zap size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <TextInput
                style={[st.previewCaptionInput, { maxHeight: 100 }]}
                placeholder="Añade un comentario..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={previewCaption}
                onChangeText={handleCaptionChange}
                multiline
              />
              <TouchableOpacity style={st.previewSendBtn} onPress={handleSendImageWithCaption}>
                <Send size={20} color="#090D16" fill="#090D16" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── CONFIG SCHEDULE MODAL ── */}
      <Modal visible={schedModalOpen} transparent animationType="fade" onRequestClose={() => setSchedModalOpen(false)}>
        <View style={st.subModalOverlay}>
          <View style={st.subModalContent}>
            <Text style={st.modalTitle}>Configurar Programación</Text>

            {/* Selected Summary Info */}
            <View style={st.selectedScheduleSummary}>
              <Text style={st.selectedScheduleSummaryTitle}>Envío Programado (Formato 24h):</Text>
              <Text style={st.selectedScheduleSummaryText}>
                {schedDate && schedTime 
                  ? `${schedDate} a las ${schedTime}` 
                  : 'Ninguno - Selecciona abajo'}
              </Text>
            </View>

            {Platform.OS === 'web' ? (
              <View style={{ marginVertical: spacing.sm }}>
                <Text style={st.pickerLabel}>Fecha de Envío:</Text>
                <WebDatePicker value={schedDate} onChange={setSchedDate} themeColors={c} theme={theme} />
                <Text style={st.pickerLabel}>Hora de Envío (24h):</Text>
                <WebTimePicker value={schedTime} onChange={setSchedTime} themeColors={c} theme={theme} />
              </View>
            ) : (
              <View style={{ marginVertical: spacing.sm }}>
                {/* Mobile Days Selector (Horizontal pills) */}
                <Text style={st.pickerLabel}>Seleccionar Día:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.pillsScrollView}>
                  {getNext7Days().map((day) => {
                    const isSelected = schedDate === day.dateStr;
                    return (
                      <TouchableOpacity
                        key={day.dateStr}
                        onPress={() => setSchedDate(day.dateStr)}
                        style={[st.pillBtn, isSelected && st.activePillBtn]}
                      >
                        <Text style={[st.pillBtnText, { color: isSelected ? '#090D16' : c.text }]}>
                          {day.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Mobile Hours Selector (Horizontal pills) */}
                <Text style={st.pickerLabel}>Seleccionar Hora:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.pillsScrollView}>
                  {commonTimes.map((time) => {
                    const isSelected = schedTime === time;
                    return (
                      <TouchableOpacity
                        key={time}
                        onPress={() => setSchedTime(time)}
                        style={[st.pillBtn, isSelected && st.activePillBtn]}
                      >
                        <Text style={[st.pillBtnText, { color: isSelected ? '#090D16' : c.text }]}>
                          {time}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Fallback inputs for exact typing if needed */}
                <Text style={[st.pickerLabel, { marginTop: spacing.md, fontSize: 11, opacity: 0.7 }]}>
                  O ingresa manualmente:
                </Text>
                <View style={st.manualInputRow}>
                  <TextInput
                    style={[st.manualInput, { color: c.text, borderColor: c.border }]}
                    placeholder="AAAA-MM-DD"
                    placeholderTextColor={c.textMuted}
                    value={schedDate}
                    onChangeText={setSchedDate}
                  />
                  <TextInput
                    style={[st.manualInput, { color: c.text, borderColor: c.border }]}
                    placeholder="HH:MM"
                    placeholderTextColor={c.textMuted}
                    value={schedTime}
                    onChangeText={setSchedTime}
                  />
                </View>
              </View>
            )}

            {/* Shortcut Buttons */}
            <Text style={st.pickerLabel}>Atajos de Tiempo:</Text>
            <View style={st.shortcutRow}>
              <TouchableOpacity onPress={setShortcutInOneHour} style={st.shortcutBtn}>
                <Text style={st.shortcutBtnText}>+1 hora</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={setShortcutTomorrow} style={st.shortcutBtn}>
                <Text style={st.shortcutBtnText}>Mañana</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={setShortcut24Hours} style={st.shortcutBtn}>
                <Text style={st.shortcutBtnText}>+24 horas</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={setShortcutMonday9AM} style={st.shortcutBtn}>
                <Text style={st.shortcutBtnText}>Lunes 9AM</Text>
              </TouchableOpacity>
            </View>

            <View style={st.subModalActions}>
              <TouchableOpacity onPress={() => setSchedModalOpen(false)} style={st.cancelBtn}>
                <Text style={st.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  if (!schedDate || !schedTime) {
                    Alert.alert('Error', 'Por favor selecciona la fecha y hora de envío.');
                    return;
                  }
                  setSchedModalOpen(false);
                }} 
                style={st.saveBtn}
              >
                <Text style={st.saveBtnText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── ANDOPAGES CATALOG VIEWER MODAL ── */}
      <Modal visible={catalogModalOpen} transparent animationType="slide" onRequestClose={() => setCatalogModalOpen(false)}>
        <SafeAreaView style={st.catalogOverlay}>
          <View style={[st.catalogContainer, { backgroundColor: c.background, borderColor: c.border }]}>
            {/* Modal Header */}
            <View style={[st.catalogHeader, { borderBottomColor: c.border, backgroundColor: c.card }]}>
              <ShoppingBag size={20} color={c.primary} />
              <Text style={[st.catalogTitle, { color: c.text }]}>Catálogo andoPages</Text>
              <TouchableOpacity onPress={() => setCatalogModalOpen(false)} style={st.catalogCloseBtn}>
                <X size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {loadingCatalog ? (
              <View style={st.catalogLoaderBox}>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={{ color: c.textMuted, marginTop: spacing.md }}>Cargando catálogo desde andoPages...</Text>
              </View>
            ) : products.length > 0 ? (
              <FlatList
                data={products}
                keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
                contentContainerStyle={{ padding: spacing.md }}
                renderItem={({ item }) => {
                  const name = item.name || item.title || 'Producto';
                  const desc = item.description || item.details || 'Sin descripción';
                  const price = item.price || item.value || '';
                  const imgUrl = item.imageUrl || item.image || item.thumbnail;
                  return (
                    <View style={[st.productCard, { backgroundColor: c.card, borderColor: c.border }]}>
                      {imgUrl ? (
                        <Image source={{ uri: imgUrl }} style={st.productImage} resizeMode="cover" />
                      ) : (
                        <View style={[st.productImagePlaceholder, { backgroundColor: c.border }]}>
                          <ShoppingBag size={28} color={c.textMuted} />
                        </View>
                      )}
                      <View style={st.productInfo}>
                        <Text style={[st.productName, { color: c.text }]} numberOfLines={1}>{name}</Text>
                        <Text style={[st.productDesc, { color: c.textMuted }]} numberOfLines={2}>{desc}</Text>
                        {price ? <Text style={[st.productPrice, { color: c.primary }]}>${price}</Text> : null}
                      </View>
                      <TouchableOpacity style={[st.productSendBtn, { backgroundColor: c.primary }]} onPress={() => handleSelectProduct(item)}>
                        <Text style={st.productSendBtnText}>Compartir</Text>
                      </TouchableOpacity>
                    </View>
                  );
                }}
              />
            ) : (
              <View style={st.catalogLoaderBox}>
                <ShoppingBag size={48} color={c.textMuted} />
                <Text style={{ color: c.text, fontWeight: '700', marginTop: spacing.md }}>Catálogo Vacío</Text>
                <Text style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: spacing.xl }}>
                  No se encontraron productos en la URL configurada:
                </Text>
                <Text style={{ color: c.primary, fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 8, paddingHorizontal: spacing.md, textAlign: 'center', backgroundColor: 'rgba(0,0,0,0.1)', padding: 6, borderRadius: 4 }}>
                  {catalogUrl || 'Ninguna URL configurada'}
                </Text>
                <Text style={{ color: c.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12, paddingHorizontal: spacing.xl }}>
                  Asegúrate de que la URL guardada en Ajustes sea exactamente igual al enlace dinámico con el companyId de tu panel.
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── DATABASE IMAGES GALLERY MODAL ── */}
      <Modal visible={dbImagesModalOpen} transparent animationType="slide" onRequestClose={() => setDbImagesModalOpen(false)}>
        <SafeAreaView style={st.catalogOverlay}>
          <View style={[st.catalogContainer, { backgroundColor: c.background, borderColor: c.border }]}>
            {/* Modal Header */}
            <View style={[st.catalogHeader, { borderBottomColor: c.border, backgroundColor: c.card }]}>
              <Database size={20} color={c.primary} />
              <Text style={[st.catalogTitle, { color: c.text }]}>Galería Whaticket / BD</Text>
              <TouchableOpacity onPress={handleUploadToMediaGallery} style={[st.catalogCloseBtn, { marginRight: spacing.xs }]}>
                <Upload size={18} color={c.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDbImagesModalOpen(false)} style={st.catalogCloseBtn}>
                <X size={22} color={c.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs }}>
              <TextInput
                style={{
                  height: 40,
                  backgroundColor: c.card,
                  borderRadius: borderRadius.md,
                  borderWidth: 1,
                  borderColor: c.border,
                  paddingHorizontal: spacing.md,
                  color: c.text,
                  fontSize: 14,
                }}
                placeholder="Buscar imagen por nombre o fuente..."
                placeholderTextColor={c.textMuted}
                value={dbImagesSearch}
                onChangeText={setDbImagesSearch}
              />
            </View>

            {loadingDbImages ? (
              <View style={st.catalogLoaderBox}>
                <ActivityIndicator size="large" color={c.primary} />
                <Text style={{ color: c.textMuted, marginTop: spacing.md }}>Cargando imágenes guardadas en el servidor...</Text>
              </View>
            ) : dbImages.length > 0 ? (
              <FlatList
                data={dbImages.filter(item => {
                  if (!dbImagesSearch.trim()) return true;
                  const query = dbImagesSearch.toLowerCase();
                  return (item.title || '').toLowerCase().includes(query) || (item.source || '').toLowerCase().includes(query);
                })}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={{ padding: spacing.sm }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={{
                      flex: 0.5,
                      margin: spacing.xs,
                      backgroundColor: c.card,
                      borderRadius: borderRadius.md,
                      borderWidth: 1,
                      borderColor: c.border,
                      overflow: 'hidden',
                      alignItems: 'center',
                    }}
                    onPress={() => handleSelectDbImage(item)}
                    activeOpacity={0.8}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={{ width: '100%', height: 130 }}
                      resizeMode="cover"
                    />
                    <View style={{ padding: 8, width: '100%' }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: c.text }} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={{ fontSize: 10, color: c.textMuted, marginTop: 2 }}>
                        {item.source}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            ) : (
              <View style={st.catalogLoaderBox}>
                <Database size={48} color={c.textMuted} />
                <Text style={{ color: c.text, fontWeight: '700', marginTop: spacing.md }}>Sin imágenes en Base de Datos</Text>
                <Text style={{ color: c.textMuted, fontSize: 13, textAlign: 'center', marginTop: 4, paddingHorizontal: spacing.xl }}>
                  No se encontraron archivos de imagen multimedia guardados en tus respuestas rápidas ni mensajes del sistema.
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── QUICK ANSWERS PICKER MODAL ── */}
      <Modal visible={quickAnswersModalOpen} transparent animationType="slide" onRequestClose={() => setQuickAnswersModalOpen(false)}>
        <SafeAreaView style={st.pickerModalOverlay}>
          <View style={st.pickerModalContent}>
            {/* Modal Header */}
            <View style={st.pickerModalHeader}>
              <Text style={st.pickerModalTitle}>Respuestas Guardadas</Text>
              <TouchableOpacity onPress={() => setQuickAnswersModalOpen(false)} style={st.pickerCloseBtn}>
                <X size={24} color={c.text} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={st.pickerSearchBox}>
              <TextInput
                style={[st.pickerSearchInput, { borderColor: c.border, color: c.text, backgroundColor: c.background }]}
                placeholder="Buscar por atajo o mensaje..."
                placeholderTextColor={c.textMuted}
                value={quickAnswersSearch}
                onChangeText={setQuickAnswersSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {quickAnswersSearch.length > 0 && (
                <TouchableOpacity onPress={() => setQuickAnswersSearch('')} style={st.pickerSearchClear}>
                  <X size={18} color={c.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Answers List */}
            <FlatList
              data={quickAnswers.filter(ans => {
                const term = quickAnswersSearch.toLowerCase().trim();
                if (!term) return true;
                return (
                  (ans.shortcut && ans.shortcut.toLowerCase().includes(term)) ||
                  (ans.message && ans.message.toLowerCase().includes(term))
                );
              })}
              keyExtractor={(item) => item.id.toString()}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: spacing.md }}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
                  <Text style={{ color: c.textMuted }}>No se encontraron respuestas guardadas.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const isItemPrivate = typeof item.isPrivate === 'boolean' 
                  ? item.isPrivate 
                  : !!item.userId;
                return (
                  <TouchableOpacity
                    style={[st.pickerItem, { borderColor: c.border }]}
                    onPress={() => {
                      if (isPickingForPreview) {
                        setPreviewCaption(item.message);
                        setIsPickingForPreview(false);
                      } else {
                        setText(item.message);
                      }
                      setQuickAnswersModalOpen(false);
                    }}
                  >
                    <View style={st.pickerItemHeader}>
                      <Text style={st.pickerItemShortcut}>{item.shortcut}</Text>
                      <View style={[
                        st.pickerItemBadge, 
                        { backgroundColor: isItemPrivate ? c.border : c.primaryLight }
                      ]}>
                        <Text style={[
                          st.pickerItemBadgeText, 
                          { color: isItemPrivate ? c.textMuted : c.primary }
                        ]}>
                          {isItemPrivate ? 'Privada' : 'Compartida'}
                        </Text>
                      </View>
                    </View>
                    <Text style={st.pickerItemMessage} numberOfLines={3}>{item.message}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </SafeAreaView>
      </Modal>

    </View>
  );
};

function buildStyles(c: typeof colors['dark'], insets: any, keyboardVisible: boolean) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: spacing.sm,
      paddingTop: spacing.sm,
      paddingBottom: keyboardVisible
        ? spacing.xs
        : spacing.md + (insets.bottom > 0 ? insets.bottom : 0),
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    noteContainer: {
      backgroundColor: '#FFFDE7',
      borderTopColor: '#FFF59D',
    },
    scheduledContainer: {
      backgroundColor: 'rgba(16, 185, 129, 0.03)',
      borderTopColor: 'rgba(16, 185, 129, 0.15)',
    },
    noteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    noteHeaderText: {
      fontSize: 12,
      fontWeight: '700',
      color: '#E65100',
    },
    // Scheduled header indicator
    scheduledHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: spacing.xs,
      paddingHorizontal: spacing.sm,
    },
    scheduledHeaderText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      flex: 1,
      marginRight: spacing.sm,
    },
    scheduledHeaderActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    configureScheduleBtn: {
      paddingVertical: 2,
      paddingHorizontal: spacing.sm,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderRadius: borderRadius.sm,
    },
    configureScheduleBtnText: {
      fontSize: 11,
      fontWeight: '600',
      color: c.primary,
    },
    // Input Mode menu row
    modeMenuRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      marginBottom: spacing.xs,
      flexWrap: 'wrap',
    },
    modeMenuBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      borderColor: c.border,
    },
    activeNoteBtn: {
      backgroundColor: '#E65100',
      borderColor: '#E65100',
    },
    activeSchedBtn: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    catalogModeBtn: {
      borderColor: 'rgba(16, 185, 129, 0.3)',
      backgroundColor: 'rgba(16, 185, 129, 0.05)',
    },
    modeMenuText: {
      fontSize: 12,
      fontWeight: '600',
    },
    inputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 2,
    },
    audioPreviewBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.background,
    },
    audioPreviewPlayBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    audioPreviewInfo: {
      flex: 1,
      minWidth: 0,
    },
    audioPreviewTitle: {
      color: c.text,
      fontSize: 13,
      fontWeight: '700',
    },
    audioPreviewSubtitle: {
      color: c.textMuted,
      fontSize: 11,
      marginTop: 1,
    },
    audioPreviewIconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.08)',
    },
    audioPreviewSendBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.primary,
    },
    actionButton: {
      padding: spacing.xs,
    },
    activeModeIndicatorButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      borderRadius: borderRadius.sm,
    },
    input: {
      flex: 1,
      backgroundColor: c.background,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      color: c.text,
      fontSize: 15,
      minHeight: 40,
      borderWidth: 1,
      borderColor: c.border,
    },
    noteInput: {
      backgroundColor: '#FFFFFF',
      borderColor: '#FFF59D',
      color: '#3E2723',
    },
    schedInput: {
      backgroundColor: 'rgba(16, 185, 129, 0.03)',
      borderColor: 'rgba(16, 185, 129, 0.15)',
      color: c.text,
    },
    recordingIndicator: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      height: 40,
      paddingHorizontal: spacing.md,
    },
    redDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#EF4444',
    },
    recordingText: {
      fontSize: 14,
      fontWeight: '500',
    },
    sendButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    recordingButton: {
      backgroundColor: '#EF4444',
    },
    loaderWrapper: {
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Preview image and caption styling
    previewOverlay: {
      flex: 1,
      backgroundColor: '#090D16',
    },
    previewContainer: {
      flex: 1,
      justifyContent: 'space-between',
    },
    previewHeader: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    previewCloseBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 22,
    },
    previewTitleText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
    previewImageBox: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
    },
    previewFullImage: {
      width: '100%',
      height: '100%',
    },
    previewInputBar: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      gap: spacing.md,
      backgroundColor: '#121824',
      borderTopWidth: 1,
      borderTopColor: 'rgba(255,255,255,0.08)',
    },
    previewCaptionInput: {
      flex: 1,
      backgroundColor: 'rgba(255,255,255,0.05)',
      borderColor: 'rgba(255,255,255,0.1)',
      borderWidth: 1,
      borderRadius: borderRadius.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
      color: '#FFFFFF',
      fontSize: 15,
      minHeight: 44,
    },
    previewSendBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: '#10B981',
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Scheduling submodal styles
    subModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md,
    },
    subModalContent: {
      backgroundColor: c.background,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: borderRadius.lg,
      width: '100%',
      maxWidth: 340,
      padding: spacing.md,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
      marginBottom: spacing.sm,
    },
    pickerLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
      marginTop: spacing.sm,
      marginBottom: 6,
    },
    // Selected schedule summary card
    selectedScheduleSummary: {
      backgroundColor: 'rgba(16, 185, 129, 0.06)',
      borderColor: 'rgba(16, 185, 129, 0.15)',
      borderWidth: 1,
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      marginVertical: spacing.xs,
    },
    selectedScheduleSummaryTitle: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textMuted,
    },
    selectedScheduleSummaryText: {
      fontSize: 15,
      fontWeight: '700',
      color: c.primary,
      marginTop: 2,
    },
    pillsScrollView: {
      flexDirection: 'row',
      marginBottom: spacing.xs,
    },
    pillBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: borderRadius.xl,
      borderWidth: 1,
      borderColor: c.border,
      marginRight: spacing.xs,
      backgroundColor: c.card,
    },
    activePillBtn: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    pillBtnText: {
      fontSize: 13,
      fontWeight: '600',
    },
    manualInputRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: 4,
    },
    manualInput: {
      flex: 1,
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 8,
      fontSize: 13,
      backgroundColor: c.card,
    },
    shortcutRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginVertical: spacing.xs,
      flexWrap: 'wrap',
    },
    shortcutBtn: {
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.2)',
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      marginBottom: 4,
    },
    shortcutBtnText: {
      color: c.primary,
      fontSize: 11,
      fontWeight: '600',
    },
    subModalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: spacing.md,
      marginTop: spacing.md,
    },
    cancelBtn: {
      paddingVertical: 8,
      paddingHorizontal: spacing.md,
    },
    cancelBtnText: {
      color: c.textMuted,
      fontSize: 14,
      fontWeight: '600',
    },
    saveBtn: {
      backgroundColor: c.primary,
      paddingVertical: 8,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.sm,
    },
    saveBtnText: {
      color: '#090D16',
      fontSize: 14,
      fontWeight: '700',
    },
    // andoPages Catalog Modals styling
    catalogOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.md
    },
    catalogContainer: {
      width: '95%',
      maxWidth: 600,
      height: '80%',
      borderRadius: borderRadius.lg,
      borderWidth: 1,
      overflow: 'hidden',
    },
    catalogHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderBottomWidth: 1,
      gap: spacing.sm,
    },
    catalogTitle: {
      fontSize: 16,
      fontWeight: '700',
      flex: 1,
    },
    catalogCloseBtn: {
      padding: 4,
    },
    catalogLoaderBox: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    productCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    productImage: {
      width: 60,
      height: 60,
      borderRadius: borderRadius.sm,
    },
    productImagePlaceholder: {
      width: 60,
      height: 60,
      borderRadius: borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    productInfo: {
      flex: 1,
    },
    productName: {
      fontSize: 14,
      fontWeight: '700',
    },
    productDesc: {
      fontSize: 12,
      marginTop: 2,
    },
    productPrice: {
      fontSize: 13,
      fontWeight: '700',
      marginTop: 4,
    },
    productSendBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      borderRadius: borderRadius.sm,
    },
    productSendBtnText: {
      color: '#090D16',
      fontSize: 12,
      fontWeight: '700',
    },
    // Suggestions Dropdown
    suggestionsContainer: {
      position: 'absolute',
      bottom: 60, // Above input bar
      left: spacing.sm,
      right: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      zIndex: 9999,
      overflow: 'hidden',
    },
    suggestionItem: {
      padding: spacing.md,
      borderBottomWidth: 1,
    },
    suggestionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    suggestionShortcut: {
      fontSize: 14,
      fontWeight: '700',
      color: c.primary,
    },
    suggestionBadge: {
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: 4,
    },
    suggestionBadgeText: {
      fontSize: 9,
      fontWeight: '700',
    },
    suggestionMessage: {
      fontSize: 12,
      color: c.textMuted,
    },

    // Picker Modal Styles
    pickerModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'flex-end',
    },
    pickerModalContent: {
      backgroundColor: c.card,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      height: '75%',
      overflow: 'hidden',
    },
    pickerModalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    pickerModalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: c.text,
    },
    pickerCloseBtn: {
      padding: spacing.xs,
    },
    pickerSearchBox: {
      padding: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
    },
    pickerSearchInput: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderRadius: borderRadius.sm,
      paddingHorizontal: spacing.md,
      fontSize: 13,
    },
    pickerSearchClear: {
      position: 'absolute',
      right: spacing.lg,
      padding: spacing.xs,
    },
    pickerItem: {
      backgroundColor: c.background,
      borderWidth: 1,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    pickerItemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    pickerItemShortcut: {
      fontSize: 15,
      fontWeight: '700',
      color: c.primary,
    },
    pickerItemBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    pickerItemBadgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    pickerItemMessage: {
      fontSize: 13,
      color: c.text,
      lineHeight: 18,
    },
    previewZapBtn: {
      marginRight: spacing.sm,
      padding: spacing.xs,
      justifyContent: 'center',
      alignItems: 'center',
    },
    captionSuggestionsContainer: {
      position: 'absolute',
      bottom: 70, // Above bottom preview bar
      left: spacing.md,
      right: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.15)',
      backgroundColor: '#1E293B',
      elevation: 5,
      zIndex: 9999,
      overflow: 'hidden',
    },
    captionSuggestionItem: {
      padding: spacing.md,
      borderBottomWidth: 1,
    },
    captionSuggestionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 2,
    },
    captionSuggestionShortcut: {
      fontSize: 14,
      fontWeight: '700',
      color: c.primary,
    },
    captionSuggestionBadge: {
      fontSize: 9,
      fontWeight: '700',
      color: 'rgba(255, 255, 255, 0.6)',
    },
    captionSuggestionMessage: {
      fontSize: 12,
      color: 'rgba(255, 255, 255, 0.8)',
    },
  });
}
