import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const CATALOG_URL_STORAGE_KEY = '@whaticket:andopages_catalog_url';
const CATALOG_SETTING_KEY = 'andopages_catalog_url';

function extractCatalogUrl(data: any): string {
  if (!data) return '';

  if (typeof data === 'string') return data;
  if (typeof data.value === 'string') return data.value;
  if (typeof data.url === 'string') return data.url;
  if (typeof data.catalogUrl === 'string') return data.catalogUrl;
  if (typeof data.andopages_catalog_url === 'string') return data.andopages_catalog_url;
  if (typeof data.andoPagesCatalogUrl === 'string') return data.andoPagesCatalogUrl;

  if (Array.isArray(data)) {
    const setting = data.find((item) => item?.key === CATALOG_SETTING_KEY || item?.key === 'andoPagesCatalogUrl');
    return extractCatalogUrl(setting);
  }

  return '';
}

export async function getCompanyCatalogUrl() {
  const localUrl = await AsyncStorage.getItem(CATALOG_URL_STORAGE_KEY);
  if (localUrl) {
    return localUrl;
  }

  try {
    const response = await api.get('/settings');
    const remoteUrl = extractCatalogUrl(response.data);

    if (remoteUrl) {
      await AsyncStorage.setItem(CATALOG_URL_STORAGE_KEY, remoteUrl);
      return remoteUrl;
    }
  } catch (error) {
    console.log('Company catalog setting is not available from API:', error);
  }

  return '';
}

export async function saveCompanyCatalogUrl(url: string) {
  const formattedUrl = url.trim();

  try {
    await api.put(`/settings/${CATALOG_SETTING_KEY}`, { value: formattedUrl });
  } catch (error) {
    console.log('Company catalog setting could not be saved in API. Using local fallback:', error);
  }

  await AsyncStorage.setItem(CATALOG_URL_STORAGE_KEY, formattedUrl);
  return formattedUrl;
}
