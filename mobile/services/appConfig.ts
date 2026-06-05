import Constants from 'expo-constants';

type ExpoExtra = {
  apiUrl?: string;
};

function normalizeApiUrl(input?: string | null): string {
  const raw = String(input || 'https://api.finanzaai.tech').trim();
  const withoutTrailingSlash = raw.replace(/\/+$/, '');
  return withoutTrailingSlash.endsWith('/v1')
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/v1`;
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

export const API_URL = normalizeApiUrl(
  process.env.EXPO_PUBLIC_API_URL || extra.apiUrl,
);