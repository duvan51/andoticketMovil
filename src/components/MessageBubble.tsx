import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ActivityIndicator, Modal, Linking, Platform, Alert } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius } from '../theme/colors';
import { format, parseISO } from 'date-fns';
import { Check, CheckCheck, Clock, Play, Pause, AlertCircle, FileText, X, Mic } from 'lucide-react-native';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { useAuth } from '../context/AuthContext';
import { AdReplyCard } from './AdReplyCard';
import { extractAdAndCleanMessage } from '../utils/adReplyParser';

interface Message {
  id: string;
  body: string;
  createdAt: string;
  fromMe: boolean;
  ack: number;
  mediaType?: string;
  mediaUrl?: string;
  isDeleted?: boolean;
  isPrivate?: boolean;
  isNote?: boolean;
  adReply?: string | null;
}

interface MessageBubbleProps {
  message: Message;
}

export const isMediaPlaceholder = (text?: string | null) => {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return (
    lower.includes('archivo multimedia') ||
    lower.includes('no se pudo descargar') ||
    lower.includes('media omitted') ||
    lower.includes('omitted') ||
    lower === '[imagen]' ||
    lower === '[audio]' ||
    lower === '[archivo]' ||
    lower === '[video]'
  );
};

export const isAudioFilename = (text?: string | null) => {
  if (!text || isMediaPlaceholder(text)) return false;
  const clean = text.split('?')[0].toLowerCase().trim();
  return (
    clean.endsWith('.mp3') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.opus') ||
    clean.endsWith('.m4a') ||
    clean.endsWith('.wav') ||
    clean.endsWith('.aac') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.amr') ||
    clean.endsWith('.3gp')
  );
};

export const isImageFile = (text?: string | null) => {
  if (!text || isMediaPlaceholder(text)) return false;
  const clean = text.split('?')[0].toLowerCase().trim();
  return (
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.png') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.gif') ||
    clean.endsWith('.bmp')
  );
};

export const isImageFilename = (text?: string | null) => {
  if (!text || isMediaPlaceholder(text)) return false;
  if (text.includes(' ')) return false;
  const filenameRegex = /^[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|gif|webp|pdf|mp3|ogg|wav|mp4|avi|opus|m4a|aac|webm|amr)$/i;
  const timestampFileRegex = /^\d+_.+\.\w+$/;
  return filenameRegex.test(text) || timestampFileRegex.test(text);
};

const getFullMediaUrl = (url: string | undefined, baseUrl: string) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://') || url.startsWith('data:')) {
    return url;
  }
  const cleanBase = (baseUrl || 'https://api.andoticket.cloud').replace(/\/+$/, '');
  const cleanPath = url.replace(/^\/+/, '');
  if (cleanPath.startsWith('public/')) {
    return `${cleanBase}/${cleanPath}`;
  }
  return `${cleanBase}/public/${cleanPath}`;
};

let globalActivePlayer: any = null;

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const { theme, apiUrl, token } = useAuth();
  const c = colors[theme];

  const { body, createdAt, fromMe, ack, mediaType, mediaUrl, isDeleted, isPrivate, isNote, adReply } = message;

  // Extract AdReply card data (from JSON, adReply, or HTML in body) and get cleaned text
  const { adData: parsedAdData, cleanText: displayBody } = extractAdAndCleanMessage(body, adReply);

  const isBodyAudio = Boolean(displayBody && !isMediaPlaceholder(displayBody) && (isAudioFilename(displayBody) || (displayBody.includes('/') && !displayBody.includes(' ') && isAudioFilename(displayBody))));
  const isBodyImage = Boolean(displayBody && !isMediaPlaceholder(displayBody) && (isImageFile(displayBody) || (isImageFilename(displayBody) && !displayBody.includes(' '))));

  const rawMediaUrl = mediaUrl || (
    (mediaType === 'audio' || mediaType === 'audio-record' || mediaType === 'ptt' || mediaType === 'voice' || mediaType?.startsWith('audio'))
      ? (isBodyAudio ? body : undefined)
      : (mediaType === 'image' || mediaType?.startsWith('image'))
        ? (isBodyImage ? body : undefined)
        : (isBodyAudio || isBodyImage ? body : undefined)
  );

  const fullMediaUrl = getFullMediaUrl(rawMediaUrl, apiUrl);

  const lowerUrl = fullMediaUrl.toLowerCase();
  const lowerType = (mediaType || '').toLowerCase();
  const lowerBody = (body || '').toLowerCase();

  const isAudio = !!fullMediaUrl && (
    lowerType === 'audio' || 
    lowerType === 'audio-record' || 
    lowerType === 'ptt' || 
    lowerType === 'voice' || 
    lowerType.startsWith('audio/') ||
    lowerUrl.endsWith('.mp3') || 
    lowerUrl.endsWith('.ogg') || 
    lowerUrl.endsWith('.opus') || 
    lowerUrl.endsWith('.m4a') || 
    lowerUrl.endsWith('.wav') ||
    lowerUrl.endsWith('.aac') ||
    lowerUrl.endsWith('.webm') ||
    lowerUrl.endsWith('.amr') ||
    lowerUrl.endsWith('.3gp') ||
    lowerUrl.includes('.ogg') ||
    lowerUrl.includes('.opus') ||
    lowerUrl.includes('.m4a') ||
    lowerUrl.includes('.mp3') ||
    lowerUrl.includes('.wav') ||
    lowerUrl.includes('.3gp') ||
    lowerBody.endsWith('.mp3') || 
    lowerBody.endsWith('.ogg') || 
    lowerBody.endsWith('.opus') || 
    lowerBody.endsWith('.m4a') || 
    lowerBody.endsWith('.wav') ||
    lowerBody.endsWith('.aac') ||
    lowerBody.endsWith('.webm') ||
    lowerBody.endsWith('.amr') ||
    lowerBody.endsWith('.3gp')
  );

  const isImage = !!fullMediaUrl && !isAudio && (
    lowerType === 'image' || 
    lowerType.startsWith('image/') ||
    lowerUrl.endsWith('.jpg') || 
    lowerUrl.endsWith('.jpeg') || 
    lowerUrl.endsWith('.png') || 
    lowerUrl.endsWith('.webp') || 
    lowerUrl.endsWith('.gif') ||
    lowerBody.endsWith('.jpg') || 
    lowerBody.endsWith('.jpeg') || 
    lowerBody.endsWith('.png') || 
    lowerBody.endsWith('.webp') || 
    lowerBody.endsWith('.gif')
  );

  const isFile = !!fullMediaUrl && !isImage && !isAudio;

  const [loadingAudio, setLoadingAudio] = useState(false);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [localAudioUri, setLocalAudioUri] = useState<string | null>(null);

  // Download and cache audio locally before playing to prevent extension/mimetype issues
  useEffect(() => {
    if (!fullMediaUrl || !isAudio) return;

    if (Platform.OS === 'web') {
      setLocalAudioUri(fullMediaUrl);
      return;
    }

    let isMounted = true;

    const cacheAudio = async () => {
      try {
        if (!fullMediaUrl.startsWith('http://') && !fullMediaUrl.startsWith('https://')) {
          if (isMounted) setLocalAudioUri(fullMediaUrl);
          return;
        }

        // Parse unique file name from URL
        const parts = fullMediaUrl.split('/');
        const lastPart = parts[parts.length - 1].split('?')[0];
        const hash = lastPart || `audio_${Date.now()}`;
        
        const isOggOrOpus = fullMediaUrl.toLowerCase().endsWith('.ogg') || fullMediaUrl.toLowerCase().endsWith('.opus') || fullMediaUrl.toLowerCase().includes('.ogg') || fullMediaUrl.toLowerCase().includes('.opus');
        const mp3MediaUrl = isOggOrOpus ? fullMediaUrl.replace(/\.(ogg|opus)$/i, '.mp3') : fullMediaUrl;

        const cleanHash = hash.replace(/\.(ogg|opus|mp3|m4a|wav|aac)$/i, '');
        const mp3LocalPath = `${FileSystem.cacheDirectory}cached_audio_${cleanHash}.mp3`;
        const oggLocalPath = `${FileSystem.cacheDirectory}cached_audio_${hash}`;

        // 1. Check if cached MP3 exists locally
        const mp3Info = await FileSystem.getInfoAsync(mp3LocalPath);
        if (mp3Info.exists) {
          if (isMounted) setLocalAudioUri(mp3LocalPath);
          return;
        }

        // 2. Check if cached OGG exists locally (non-iOS)
        const oggInfo = await FileSystem.getInfoAsync(oggLocalPath);
        if (oggInfo.exists && Platform.OS !== 'ios') {
          if (isMounted) setLocalAudioUri(oggLocalPath);
          return;
        }

        if (isMounted) setLoadingAudio(true);

        // 3. Try downloading backend-converted MP3 version first (for iOS & native player compatibility)
        if (isOggOrOpus) {
          try {
            const mp3Download = await FileSystem.downloadAsync(mp3MediaUrl, mp3LocalPath, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            if (isMounted && mp3Download.status === 200) {
              setLocalAudioUri(mp3Download.uri);
              return;
            }
          } catch (e) {
            // MP3 download failed or not yet available on server, fall back to original
          }
        }

        // 4. Download original URL
        const downloadResult = await FileSystem.downloadAsync(fullMediaUrl, oggLocalPath, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (isMounted && downloadResult.status === 200) {
          setLocalAudioUri(downloadResult.uri);
        } else if (isMounted) {
          setLocalAudioUri(fullMediaUrl);
        }
      } catch (error) {
        console.error('Error caching audio message:', error);
        if (isMounted) setLocalAudioUri(fullMediaUrl);
      } finally {
        if (isMounted) setLoadingAudio(false);
      }
    };

    cacheAudio();

    return () => {
      isMounted = false;
    };
  }, [fullMediaUrl, isAudio]);

  // Set up the player using the new expo-audio API
  const player = useAudioPlayer(localAudioUri || null);
  const playerStatus = useAudioPlayerStatus(player);
  
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const toggleSpeed = () => {
    let nextSpeed = 1;
    if (playbackSpeed === 1) nextSpeed = 1.5;
    else if (playbackSpeed === 1.5) nextSpeed = 2;
    else nextSpeed = 1;
    setPlaybackSpeed(nextSpeed);
    if (player && localAudioUri && isAudio) {
      try {
        if (typeof (player as any).setPlaybackRate === 'function') {
          (player as any).setPlaybackRate(nextSpeed);
        } else if (typeof (player as any).setRate === 'function') {
          (player as any).setRate(nextSpeed);
        }
      } catch (e) {
        console.log('Error setting playbackRate on toggle:', e);
      }
    }
  };

  // Keep player source updated with the local uri
  useEffect(() => {
    if (player && localAudioUri) {
      player.replace(localAudioUri);
    }
  }, [player, localAudioUri]);

  useEffect(() => {
    if (player && localAudioUri && isAudio) {
      try {
        if (typeof (player as any).setPlaybackRate === 'function') {
          (player as any).setPlaybackRate(playbackSpeed);
        } else if (typeof (player as any).setRate === 'function') {
          (player as any).setRate(playbackSpeed);
        }
      } catch (e) {
        console.log('Error setting playbackRate on load:', e);
      }
    }
  }, [player, playbackSpeed, localAudioUri, isAudio]);

  useEffect(() => {
    if (playerStatus?.didJustFinish && player && localAudioUri) {
      try {
        player.seekTo(0);
      } catch (e) {
        console.log('Error seeking to 0 on finish:', e);
      }
    }
  }, [playerStatus?.didJustFinish, player, localAudioUri]);

  // Clean up and pause player on unmount
  useEffect(() => {
    return () => {
      if (player) {
        try {
          player.pause();
        } catch (e) {}
        if (globalActivePlayer === player) {
          globalActivePlayer = null;
        }
      }
    };
  }, [player]);

  const isPlaying = playerStatus?.playing || false;
  const currentTime = playerStatus?.currentTime ?? 0;
  const duration = playerStatus?.duration ?? 0;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handlePlayPauseAudio = async () => {
    // Check if current loaded audio is un-converted .ogg/.opus on iOS
    const currentUri = localAudioUri || fullMediaUrl;
    const isOggOnIos = Platform.OS === 'ios' && (
      currentUri.toLowerCase().endsWith('.ogg') || 
      currentUri.toLowerCase().endsWith('.opus')
    );

    if (isOggOnIos && fullMediaUrl) {
      try {
        const supported = await Linking.canOpenURL(fullMediaUrl);
        if (supported) {
          await Linking.openURL(fullMediaUrl);
        } else {
          Alert.alert('Audio .OGG (iOS)', 'En iOS los archivos .ogg de WhatsApp se abren mediante el navegador o reproductor externo.');
        }
      } catch (e) {
        Alert.alert('Error', 'No se pudo abrir el audio en iOS.');
      }
      return;
    }

    if (!player || !localAudioUri) return;

    try {
      if (playerStatus?.playing) {
        player.pause();
      } else {
        if (globalActivePlayer && globalActivePlayer !== player) {
          try {
            globalActivePlayer.pause();
          } catch (e) {
            console.log('Error pausing previous player:', e);
          }
        }
        globalActivePlayer = player;
        player.play();
      }
    } catch (error) {
      console.log('Error playing audio:', error);
      if (fullMediaUrl) {
        Linking.openURL(fullMediaUrl).catch(() => {});
      }
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return '0:00';
    let totalSecs = Math.floor(secs);
    if (Platform.OS === 'web' && secs > 1000) {
      totalSecs = Math.floor(secs / 1000);
    }
    const minutes = Math.floor(totalSecs / 60);
    const seconds = totalSecs % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleDownloadFile = async () => {
    if (!fullMediaUrl) return;

    try {
      if (Platform.OS === 'web') {
        // In browser web context (PC/Tablet), trigger local file download
        const link = document.createElement('a');
        link.href = fullMediaUrl;
        link.target = '_blank';
        const cleanName = body && !isImageFilename(body) ? body : 'documento';
        link.download = cleanName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Éxito', 'El documento se ha abierto/descargado en su dispositivo.');
      } else {
        // In native Android/iOS context, open native browser/default app handler to download & view
        const supported = await Linking.canOpenURL(fullMediaUrl);
        if (supported) {
          await Linking.openURL(fullMediaUrl);
          Alert.alert('Éxito', 'El documento se está abriendo/descargando en su dispositivo.');
        } else {
          Alert.alert('Error', 'No se pudo abrir el enlace del archivo.');
        }
      }
    } catch (error) {
      console.error('Error opening/downloading document:', error);
      Alert.alert('Error', 'No se pudo descargar el archivo.');
    }
  };

  // Format time
  let timeStr = '';
  try {
    if (createdAt) {
      const date = parseISO(createdAt);
      timeStr = format(date, 'HH:mm');
    }
  } catch (e) {
    timeStr = '';
  }

  // Render status icons for self messages
  const renderStatus = () => {
    if (!fromMe) return null;
    if (ack === 0) return <Clock size={12} color={c.textMuted} />;
    if (ack === 1) return <Check size={12} color={c.textMuted} />;
    if (ack === 2) return <CheckCheck size={12} color={c.textMuted} />;
    if (ack >= 3) return <CheckCheck size={12} color={c.primary} />;
    return null;
  };

  const isDark = theme === 'dark';
  const trackBg = fromMe 
    ? (isDark ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.12)') 
    : (isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)');

  const speedBg = fromMe 
    ? (isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.06)') 
    : (isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)');

  const speedTextColor = fromMe 
    ? (theme === 'light' ? '#0F172A' : '#FFFFFF') 
    : c.text;

  const timeColor = fromMe 
    ? (theme === 'light' ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.6)') 
    : c.textMuted;

  const st = buildStyles(c, fromMe);

  // Render deleted messages
  if (isDeleted) {
    return (
      <View style={[st.bubble, fromMe ? st.bubbleSelf : st.bubbleOther, st.deletedBubble]}>
        <View style={st.deletedRow}>
          <AlertCircle size={14} color={c.textMuted} />
          <Text style={[st.deletedText, { color: c.textMuted }]}>Mensaje eliminado</Text>
        </View>
        <Text style={[st.time, { color: c.textMuted }]}>{timeStr}</Text>
      </View>
    );
  }

  // Render internal logs/system status messages
  if (mediaType === 'tag' || mediaType === 'schedule_history') {
    return (
      <View style={st.systemMessageContainer}>
        <View style={[st.systemMessage, { backgroundColor: c.border }]}>
          <Text style={[st.systemMessageText, { color: c.text }]}>{body}</Text>
        </View>
      </View>
    );
  }

  const isPrivateNote = isPrivate || isNote || mediaType === 'note';

  // Render internal agent comments/notes
  if (isPrivateNote) {
    const hasNoteCaption = body && body.trim() !== '' && !isImageFilename(body) && !isMediaPlaceholder(body) && mediaType !== 'note';

    // Note text colors (fixed for the yellow note background)
    const noteTextColor = '#78350F';
    const noteTimeColor = '#B45309';

    return (
      <View style={st.noteContainer}>
        <View style={st.noteMessage}>
          <Text style={st.noteHeader}>Nota Interna</Text>

          {/* Media inside the Note */}
          {isImage && (
            <TouchableOpacity onPress={() => setImageViewerOpen(true)} activeOpacity={0.9}>
              <ExpoImage
                source={{
                  uri: fullMediaUrl,
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }}
                style={[st.mediaImage, { width: '100%', height: 160 }]}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            </TouchableOpacity>
          )}

          {isAudio && (
            <View style={[st.audioContainer, { width: '100%' }]}>
              <TouchableOpacity
                style={[st.audioButton, { backgroundColor: 'rgba(180, 83, 9, 0.15)' }]}
                onPress={handlePlayPauseAudio}
                disabled={loadingAudio}
                activeOpacity={0.8}
              >
                {loadingAudio ? (
                  <ActivityIndicator color="#B45309" size="small" />
                ) : isPlaying ? (
                  <Pause size={18} color="#B45309" fill="#B45309" />
                ) : (
                  <Play size={18} color="#B45309" fill="#B45309" />
                )}
              </TouchableOpacity>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={[st.progressBarTrack, { backgroundColor: 'rgba(180, 83, 9, 0.15)' }]}>
                  <View style={[st.progressBarFill, { width: `${progress}%`, backgroundColor: '#B45309' }]} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={[st.audioTimeText, { color: noteTextColor }]}>
                    {formatTime(currentTime)}
                  </Text>
                  <Text style={[st.audioTimeText, { color: noteTextColor }]}>
                    {formatTime(duration)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={[st.speedButton, { backgroundColor: 'rgba(180, 83, 9, 0.15)' }]} onPress={toggleSpeed}>
                <Text style={[st.speedButtonText, { color: '#B45309' }]}>{playbackSpeed}x</Text>
              </TouchableOpacity>
            </View>
          )}

          {isFile && (
            <TouchableOpacity 
              style={[st.fileContainer, { width: '100%', backgroundColor: 'rgba(180, 83, 9, 0.1)' }]} 
              activeOpacity={0.8} 
              onPress={handleDownloadFile}
            >
              <FileText size={24} color="#B45309" />
              <Text style={[st.fileText, { color: noteTextColor }]} numberOfLines={1}>
                {body || 'Documento adjunto'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Note Text Body */}
          {(!fullMediaUrl || mediaType === 'note') && (
            <Text style={st.noteBody}>{body}</Text>
          )}

          {hasNoteCaption && (
            <Text style={[st.noteBody, { marginTop: spacing.xs }]}>{body}</Text>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 }}>
            <Text style={st.noteTime}>{timeStr}</Text>
          </View>
        </View>

        {/* ── IMAGE VIEWER FULLSCREEN MODAL (Same for note images) ── */}
        {isImage && (
          <Modal visible={imageViewerOpen} transparent animationType="fade" onRequestClose={() => setImageViewerOpen(false)}>
            <TouchableOpacity style={st.viewerOverlay} activeOpacity={1} onPress={() => setImageViewerOpen(false)}>
              <SafeAreaView style={st.viewerContainer}>
                {/* Header with close button */}
                <View style={st.viewerHeader}>
                  <TouchableOpacity style={st.viewerCloseBtn} onPress={() => setImageViewerOpen(false)} activeOpacity={0.7}>
                    <X size={24} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                {/* Image box */}
                <View style={st.viewerImageBox}>
                  <ExpoImage
                    source={{
                      uri: fullMediaUrl,
                      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    }}
                    style={st.viewerFullImage}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                </View>
              </SafeAreaView>
            </TouchableOpacity>
          </Modal>
        )}
      </View>
    );
  }

  const bubbleTextColor = fromMe
    ? (theme === 'light' ? '#0F172A' : '#FFFFFF')
    : c.text;

  const bubbleTimeColor = fromMe
    ? (theme === 'light' ? 'rgba(15, 23, 42, 0.65)' : 'rgba(255, 255, 255, 0.75)')
    : c.textMuted;

  const hasCaption = Boolean(
    displayBody &&
    displayBody.trim() !== '' &&
    !isImageFilename(displayBody) &&
    !isMediaPlaceholder(displayBody) &&
    displayBody !== rawMediaUrl &&
    displayBody !== fullMediaUrl
  );

  const isMediaError = !fullMediaUrl && (
    isMediaPlaceholder(body) ||
    (Boolean(mediaType) && ['image', 'audio', 'video', 'document', 'audio-record', 'ptt'].includes((mediaType || '').toLowerCase()))
  );

  return (
    <View style={[st.bubble, fromMe ? st.bubbleSelf : st.bubbleOther]}>
      {/* Tarjeta de anuncio de Meta Ads (adReply / HTML parsed) */}
      {parsedAdData ? (
        <AdReplyCard adReplyString={parsedAdData} />
      ) : adReply ? (
        <AdReplyCard adReplyString={adReply} />
      ) : null}

      {/* Media Error Placeholder Banner (when media is missing or could not be downloaded) */}
      {isMediaError && (
        <View style={[st.mediaErrorContainer, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.05)' }]}>
          <View style={[st.mediaErrorIconBox, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.07)' }]}>
            {mediaType?.startsWith('audio') || mediaType === 'ptt' || mediaType === 'voice' ? (
              <Mic size={18} color={c.textMuted} />
            ) : mediaType?.startsWith('image') ? (
              <AlertCircle size={18} color={c.textMuted} />
            ) : (
              <FileText size={18} color={c.textMuted} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[st.mediaErrorTitle, { color: bubbleTextColor }]}>
              {mediaType?.startsWith('audio') || mediaType === 'ptt' || mediaType === 'voice'
                ? 'Audio no disponible'
                : mediaType?.startsWith('image')
                  ? 'Imagen no disponible'
                  : 'Archivo no disponible'}
            </Text>
            <Text style={[st.mediaErrorSub, { color: bubbleTimeColor }]}>
              No se pudo descargar de WhatsApp
            </Text>
          </View>
        </View>
      )}

      {/* Media Rendering */}
      {isImage && (
        <TouchableOpacity onPress={() => setImageViewerOpen(true)} activeOpacity={0.9}>
          <ExpoImage
            source={{
              uri: fullMediaUrl,
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }}
            style={[st.mediaImage, !hasCaption && { marginBottom: 2 }]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
          />
        </TouchableOpacity>
      )}

      {/* Audio Rendering */}
      {isAudio && (
        <View style={[st.audioContainer, { width: 230 }]}>
          <TouchableOpacity
            style={st.audioButton}
            onPress={handlePlayPauseAudio}
            disabled={loadingAudio}
            activeOpacity={0.8}
          >
            {loadingAudio ? (
              <ActivityIndicator color={c.primary} size="small" />
            ) : isPlaying ? (
              <Pause size={18} color={c.primary} fill={c.primary} />
            ) : (
              <Play size={18} color={c.primary} fill={c.primary} />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={[st.progressBarTrack, { backgroundColor: trackBg }]}>
              <View style={[st.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={[st.audioTimeText, { color: timeColor }]}>
                {formatTime(currentTime)}
              </Text>
              <Text style={[st.audioTimeText, { color: timeColor }]}>
                {formatTime(duration)}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={[st.speedButton, { backgroundColor: speedBg }]} onPress={toggleSpeed}>
            <Text style={[st.speedButtonText, { color: speedTextColor }]}>{playbackSpeed}x</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* File/Document Rendering */}
      {isFile && (
        <TouchableOpacity style={st.fileContainer} activeOpacity={0.8} onPress={handleDownloadFile}>
          <FileText size={24} color={c.primary} />
          <Text style={[st.fileText, { color: bubbleTextColor }]} numberOfLines={1}>
            {body || 'Documento adjunto'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Normal Text Body (rendered if not a pure voice/document note or alongside media, and not an error placeholder) */}
      {(!fullMediaUrl || isImage) && hasCaption && !isAudio && !isFile && !isMediaError && (
        <Text style={[st.bodyText, { color: bubbleTextColor }]}>{displayBody}</Text>
      )}

      {/* Footer (Time & Status) */}
      <View style={st.footer}>
        <Text style={[st.time, { color: bubbleTimeColor }]}>{timeStr}</Text>
        {renderStatus()}
      </View>

      {/* ── IMAGE VIEWER FULLSCREEN MODAL ── */}
      {isImage && (
        <Modal visible={imageViewerOpen} transparent animationType="fade" onRequestClose={() => setImageViewerOpen(false)}>
          <TouchableOpacity style={st.viewerOverlay} activeOpacity={1} onPress={() => setImageViewerOpen(false)}>
            <SafeAreaView style={st.viewerContainer}>
              {/* Header with close button */}
              <View style={st.viewerHeader}>
                <TouchableOpacity style={st.viewerCloseBtn} onPress={() => setImageViewerOpen(false)} activeOpacity={0.7}>
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              {/* Image box */}
              <View style={st.viewerImageBox}>
                <ExpoImage
                  source={{
                    uri: fullMediaUrl,
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                  }}
                  style={st.viewerFullImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />
              </View>
            </SafeAreaView>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

function buildStyles(c: typeof colors['dark'], fromMe: boolean) {
  return StyleSheet.create({
    bubble: {
      maxWidth: '75%',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: 4,
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 1,
      elevation: 1,
    },
    bubbleSelf: {
      backgroundColor: c.bubbleSelf,
      alignSelf: 'flex-end',
      borderBottomRightRadius: 2,
    },
    bubbleOther: {
      backgroundColor: c.bubbleOther,
      alignSelf: 'flex-start',
      borderBottomLeftRadius: 2,
    },
    deletedBubble: {
      backgroundColor: 'rgba(0,0,0,0.03)',
      borderWidth: 1,
      borderColor: c.border,
    },
    deletedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    deletedText: {
      fontSize: 14,
      fontStyle: 'italic',
    },
    bodyText: {
      fontSize: 15,
      lineHeight: 20,
    },
    mediaImage: {
      width: 220,
      height: 160,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.sm,
      backgroundColor: c.border,
    },
    audioContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    audioButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    audioText: {
      fontSize: 14,
      fontWeight: '500',
    },
    progressBarTrack: {
      height: 4,
      borderRadius: 2,
      flex: 1,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 2,
      backgroundColor: '#8E8E93',
    },
    audioTimeText: {
      fontSize: 9,
      fontWeight: '600',
    },
    speedButton: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      minWidth: 32,
    },
    speedButtonText: {
      fontSize: 10,
      fontWeight: '700',
    },
    fileContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      width: 200,
      marginBottom: spacing.xs,
    },
    fileText: {
      fontSize: 14,
      fontWeight: '500',
      flex: 1,
    },
    footer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    time: {
      fontSize: 10,
    },
    systemMessageContainer: {
      alignItems: 'center',
      marginVertical: spacing.sm,
      width: '100%',
    },
    systemMessage: {
      paddingHorizontal: spacing.md,
      paddingVertical: 4,
      borderRadius: borderRadius.lg,
    },
    systemMessageText: {
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },
    noteContainer: {
      alignItems: 'center',
      marginVertical: spacing.xs,
      width: '100%',
    },
    noteMessage: {
      backgroundColor: '#FEF3C7',
      borderColor: '#F59E0B',
      borderWidth: 1,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      width: '80%',
    },
    noteHeader: {
      fontSize: 11,
      fontWeight: '700',
      color: '#B45309',
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    noteBody: {
      fontSize: 14,
      color: '#78350F',
      lineHeight: 18,
    },
    noteTime: {
      fontSize: 9,
      color: '#B45309',
      textAlign: 'right',
      marginTop: 4,
    },
    // Image viewer modal styles
    viewerOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
    },
    viewerContainer: {
      flex: 1,
    },
    viewerHeader: {
      height: 50,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },
    viewerCloseBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 22,
    },
    viewerImageBox: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    viewerFullImage: {
      width: '100%',
      height: '100%',
    },
    mediaErrorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.xs,
      minWidth: 200,
    },
    mediaErrorIconBox: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    mediaErrorTitle: {
      fontSize: 13,
      fontWeight: '600',
    },
    mediaErrorSub: {
      fontSize: 11,
      marginTop: 1,
    },
  });
}
