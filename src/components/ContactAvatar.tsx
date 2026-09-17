import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ContactLike = {
  id?: string | number | null;
  name?: string | null;
  profilePicUrl?: string | null;
  profilePic?: string | null;
  picture?: string | null;
  image?: string | null;
  avatar?: string | null;
  urlPicture?: string | null;
};

interface ContactAvatarProps {
  contact?: ContactLike | null;
  name?: string | null;
  size?: number;
  backgroundColor: string;
  textColor: string;
  style?: ViewStyle;
}

export const getContactInitials = (name?: string | null, fallback = 'C') => {
  if (!name?.trim()) return fallback;
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

const getRawProfilePic = (contact?: ContactLike | null) => {
  if (!contact) return null;
  return (
    contact.profilePicUrl ||
    contact.profilePic ||
    contact.urlPicture ||
    contact.picture ||
    contact.image ||
    contact.avatar ||
    null
  );
};

export const resolveProfilePicUrl = async (contact?: ContactLike | null) => {
  const rawUrl = getRawProfilePic(contact);
  if (!rawUrl) return null;

  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('file:') || rawUrl.startsWith('data:')) {
    return rawUrl;
  }

  const savedApiUrl = await AsyncStorage.getItem('@whaticket:api_url');
  if (!savedApiUrl) return rawUrl;

  const base = savedApiUrl.replace(/\/$/, '');
  const path = rawUrl.replace(/^\//, '');
  return `${base}/${path}`;
};

export const ContactAvatar: React.FC<ContactAvatarProps> = ({
  contact,
  name,
  size = 46,
  backgroundColor,
  textColor,
  style,
}) => {
  const [picUrl, setPicUrl] = React.useState<string | null>(null);
  const [imageFailed, setImageFailed] = React.useState(false);
  const displayName = name || contact?.name;

  React.useEffect(() => {
    let mounted = true;

    const loadPicUrl = async () => {
      setImageFailed(false);
      try {
        const resolved = await resolveProfilePicUrl(contact);
        if (mounted) setPicUrl(resolved);
      } catch (error) {
        console.error('Error resolving profile picture:', error);
        if (mounted) setPicUrl(null);
      }
    };

    loadPicUrl();

    return () => {
      mounted = false;
    };
  }, [
    contact?.id,
    contact?.profilePicUrl,
    contact?.profilePic,
    contact?.urlPicture,
    contact?.picture,
    contact?.image,
    contact?.avatar,
  ]);

  const borderRadius = size / 2;

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius, backgroundColor }, style]}>
      {picUrl && !imageFailed ? (
        <Image
          source={{ uri: picUrl }}
          style={{ width: size, height: size, borderRadius }}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { color: textColor, fontSize: Math.max(12, size * 0.36) }]}>
          {getContactInitials(displayName)}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  initials: {
    fontWeight: '700',
  },
});
