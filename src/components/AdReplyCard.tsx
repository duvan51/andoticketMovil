import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { AdReplyData, parseAdReplyData } from '../utils/adReplyParser';

export type { AdReplyData };

export interface AdReplyCardProps {
  adReplyString?: string | AdReplyData | null;
  apiUrl?: string;
}

export const AdReplyCard: React.FC<AdReplyCardProps> = ({ adReplyString, apiUrl: propApiUrl }) => {
  const [imageError, setImageError] = useState(false);

  let authApiUrl = '';
  let isDark = false;
  try {
    const auth = useAuth();
    authApiUrl = auth?.apiUrl;
    isDark = auth?.theme === 'dark';
  } catch (e) {
    // Fallback if component is rendered outside AuthProvider
  }

  const BACKEND_URL = propApiUrl || authApiUrl || 'https://api.andoticket.cloud';

  if (!adReplyString) return null;

  let adData: AdReplyData | null = null;
  try {
    adData = parseAdReplyData(adReplyString);
  } catch (err) {
    return null;
  }

  if (!adData || (!adData.title && !adData.thumbnailUrl && !adData.body)) {
    return null;
  }

  const { title, body, thumbnailUrl, sourceUrl } = adData;

  // Resolver URL de imagen
  let imageUri = thumbnailUrl?.trim();
  if (
    imageUri &&
    !imageUri.startsWith('http://') &&
    !imageUri.startsWith('https://') &&
    !imageUri.startsWith('data:') &&
    !imageUri.startsWith('file://')
  ) {
    const cleanBase = BACKEND_URL.replace(/\/+$/, '');
    const cleanPath = imageUri.replace(/^\/+/, '');
    if (cleanPath.startsWith('public/')) {
      imageUri = `${cleanBase}/${cleanPath}`;
    } else {
      imageUri = `${cleanBase}/public/${cleanPath}`;
    }
  }

  const handlePress = async () => {
    if (sourceUrl) {
      try {
        const supported = await Linking.canOpenURL(sourceUrl);
        if (supported) {
          await Linking.openURL(sourceUrl);
        } else {
          await Linking.openURL(sourceUrl);
        }
      } catch (err) {
        console.warn('Could not open ad source URL:', err);
      }
    }
  };

  const CardWrapper = sourceUrl ? TouchableOpacity : View;

  return (
    <CardWrapper
      onPress={sourceUrl ? handlePress : undefined}
      activeOpacity={0.8}
      style={[
        styles.cardContainer,
        isDark && styles.cardContainerDark,
      ]}
    >
      {/* Badge superior */}
      <View style={[styles.badgeHeader, isDark && styles.badgeHeaderDark]}>
        <Text style={[styles.badgeText, isDark && styles.badgeTextDark]}>
          🏬 Anuncio de Facebook / Instagram
        </Text>
        {Boolean(sourceUrl) && (
          <Text style={[styles.externalIcon, isDark && styles.externalIconDark]}>↗</Text>
        )}
      </View>

      {/* Cuerpo: Texto + Miniatura */}
      <View style={styles.contentRow}>
        <View style={styles.textContainer}>
          {Boolean(title) && (
            <Text style={[styles.adTitle, isDark && styles.adTitleDark]} numberOfLines={2}>
              {title}
            </Text>
          )}
          {Boolean(body) && (
            <Text style={[styles.adBody, isDark && styles.adBodyDark]} numberOfLines={2}>
              {body}
            </Text>
          )}
        </View>
        {Boolean(imageUri) && !imageError && (
          <Image
            source={{ uri: imageUri }}
            style={[styles.thumbnail, isDark && styles.thumbnailDark]}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        )}
      </View>

      {/* Footer enlace */}
      {Boolean(sourceUrl) && (
        <View style={[styles.footer, isDark && styles.footerDark]}>
          <Text style={[styles.footerText, isDark && styles.footerTextDark]}>
            Ver anuncio original ↗
          </Text>
        </View>
      )}
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    minWidth: 220,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginBottom: 6,
    overflow: 'hidden',
  },
  cardContainerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.14)',
  },
  badgeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeHeaderDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#444',
  },
  badgeTextDark: {
    color: '#E2E8F0',
  },
  externalIcon: {
    fontSize: 12,
    color: '#555',
  },
  externalIconDark: {
    color: '#CBD5E1',
  },
  contentRow: {
    flexDirection: 'row',
    padding: 8,
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    paddingRight: 6,
  },
  adTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 2,
  },
  adTitleDark: {
    color: '#F8FAFC',
  },
  adBody: {
    fontSize: 11,
    color: '#555',
  },
  adBodyDark: {
    color: '#94A3B8',
  },
  thumbnail: {
    width: 52,
    height: 52,
    borderRadius: 6,
    backgroundColor: '#ddd',
  },
  thumbnailDark: {
    backgroundColor: '#334155',
  },
  footer: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    alignItems: 'flex-end',
  },
  footerDark: {
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerText: {
    fontSize: 10,
    color: '#1976d2',
    fontWeight: '600',
  },
  footerTextDark: {
    color: '#60A5FA',
  },
});

export default AdReplyCard;
