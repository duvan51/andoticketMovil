import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

const CATALOG_SETTING_KEY = 'andopages_catalog_url';

const CANDIDATE_KEYS = [
  'andopages_catalog_url',
  'andoPagesCatalogUrl',
  'andopages_url',
  'andoPagesUrl',
  'catalog_url',
  'catalogUrl',
  'catalog_api',
  'catalogApi',
  'catalog',
  'catalogo_url',
  'catalogoUrl',
  'catalogo',
  'url_catalogo',
  'urlCatalogo',
  'products_api',
  'productsApi',
  'products_url',
  'productsUrl',
  'products_api_url',
  'productsApiUrl',
  'api_products',
  'apiProducts',
  'products',
  'productos',
  'api_productos',
  'apiProductos',
  'url_productos',
  'urlProductos',
  'marketplace_url',
  'marketplaceUrl',
  'ecommerce_url',
  'ecommerceUrl',
  'company_catalog_url',
  'companyCatalogUrl',
];

function isValidUrl(val: any): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

export function extractCatalogUrl(data: any): string {
  if (!data) return '';

  if (typeof data === 'string') {
    return isValidUrl(data) ? data.trim() : '';
  }

  // If array of settings: [{ key: "...", value: "..." }]
  if (Array.isArray(data)) {
    // 1st pass: direct match in candidate keys
    for (const cand of CANDIDATE_KEYS) {
      const found = data.find((item) => {
        const k = item?.key || item?.name;
        return typeof k === 'string' && k.toLowerCase() === cand.toLowerCase();
      });
      if (found) {
        const val = found.value ?? found.url ?? found.val ?? found;
        const url = extractCatalogUrl(val);
        if (url) return url;
      }
    }

    // 2nd pass: any key containing 'catalog', 'product', 'ando', 'market', or 'ecom' with valid http URL
    for (const item of data) {
      const k = (item?.key || item?.name || '').toLowerCase();
      if (
        k.includes('catalog') ||
        k.includes('product') ||
        k.includes('ando') ||
        k.includes('market') ||
        k.includes('ecom')
      ) {
        const val = item?.value ?? item?.url ?? item?.val;
        if (isValidUrl(val)) return val.trim();
      }
    }

    return '';
  }

  // If object wrapper: { settings: [...] } or { data: [...] }
  if (Array.isArray(data.settings)) {
    const url = extractCatalogUrl(data.settings);
    if (url) return url;
  }
  if (Array.isArray(data.data)) {
    const url = extractCatalogUrl(data.data);
    if (url) return url;
  }

  // Direct properties on object
  if (typeof data === 'object') {
    // 1st pass: check direct candidate keys
    for (const cand of CANDIDATE_KEYS) {
      if (data[cand] !== undefined) {
        const url = extractCatalogUrl(data[cand]);
        if (url) return url;
      }
    }

    // Common value/url fields
    if (isValidUrl(data.value)) return data.value.trim();
    if (isValidUrl(data.url)) return data.url.trim();

    // 2nd pass: any key containing keywords
    for (const key of Object.keys(data)) {
      const k = key.toLowerCase();
      if (
        k.includes('catalog') ||
        k.includes('product') ||
        k.includes('ando') ||
        k.includes('market') ||
        k.includes('ecom')
      ) {
        const val = data[key];
        if (isValidUrl(val)) return val.trim();
      }
    }
  }

  return '';
}

export async function getCompanyScopeKey(): Promise<string> {
  try {
    const savedUser = await AsyncStorage.getItem('@whaticket:user');
    const savedApiUrl = await AsyncStorage.getItem('@whaticket:api_url');
    const cleanApi = (savedApiUrl || 'default_api').replace(/[^a-zA-Z0-9]/g, '_');

    if (savedUser) {
      const user = JSON.parse(savedUser);
      const companyId = user?.companyId ?? user?.company?.id;
      if (companyId) {
        return `${cleanApi}_company_${companyId}`;
      }
      if (user?.id) {
        return `${cleanApi}_user_${user.id}`;
      }
    }
    return cleanApi;
  } catch {
    return 'default_scope';
  }
}

export async function getCompanyCatalogUrl(preferFreshRemote = true): Promise<string> {
  const scope = await getCompanyScopeKey();
  const scopedStorageKey = `@whaticket:catalog_url:${scope}`;

  const fetchRemoteCatalogUrl = async (): Promise<string> => {
    // 1. Try bulk /settings
    try {
      const response = await api.get('/settings');
      const remoteUrl = extractCatalogUrl(response.data);
      if (remoteUrl) return remoteUrl;
    } catch (error) {
      console.log(`[catalog] Could not fetch settings from API for ${scope}:`, error);
    }

    // 2. Fallback to individual keys if bulk /settings is restricted or returns empty
    const singleKeysToTry = [
      'andopages_catalog_url',
      'products_url',
      'products_api',
      'catalog_url',
      'catalog_api',
      'api_products',
      'products',
      'catalog'
    ];
    for (const key of singleKeysToTry) {
      try {
        const singleRes = await api.get(`/settings/${key}`);
        const extracted = extractCatalogUrl(singleRes.data);
        if (extracted) return extracted;
      } catch {}
    }

    return '';
  };

  // 1. Query the server first if preferFreshRemote to get the company's real configured setting
  if (preferFreshRemote) {
    const remoteUrl = await fetchRemoteCatalogUrl();
    if (remoteUrl) {
      console.log(`[catalog] Found catalog/products URL from API for ${scope}:`, remoteUrl);
      await AsyncStorage.setItem(scopedStorageKey, remoteUrl);
      return remoteUrl;
    }
  }

  // 2. Fallback to scoped local storage for this specific company
  const localUrl = await AsyncStorage.getItem(scopedStorageKey);
  if (localUrl) {
    return localUrl;
  }

  // 3. Fallback query to server if preferFreshRemote was false
  if (!preferFreshRemote) {
    const remoteUrl = await fetchRemoteCatalogUrl();
    if (remoteUrl) {
      console.log(`[catalog] Found catalog/products URL from API fallback for ${scope}:`, remoteUrl);
      await AsyncStorage.setItem(scopedStorageKey, remoteUrl);
      return remoteUrl;
    }
  }

  return '';
}

export async function saveCompanyCatalogUrl(url: string): Promise<string> {
  const formattedUrl = url.trim();
  const scope = await getCompanyScopeKey();
  const scopedStorageKey = `@whaticket:catalog_url:${scope}`;

  // 1. Save to API settings
  try {
    await api.put(`/settings/${CATALOG_SETTING_KEY}`, { value: formattedUrl });
  } catch (error) {
    console.log('[catalog] Could not save setting with key andopages_catalog_url, trying products_url:', error);
    try {
      await api.put('/settings/products_url', { value: formattedUrl });
    } catch (e2) {
      console.log('[catalog] Could not save setting in API. Using local scoped fallback:', e2);
    }
  }

  // 2. Save to scoped local storage for this company
  await AsyncStorage.setItem(scopedStorageKey, formattedUrl);

  // 3. Clean legacy global key so other businesses don't accidentally inherit it
  await AsyncStorage.removeItem('@whaticket:andopages_catalog_url').catch(() => {});

  return formattedUrl;
}

