import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, ColorSchemeName } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_PREFERENCE_KEY = '@finanza:theme-preference';

export async function getThemePreference(): Promise<ThemePreference> {
  const saved = await AsyncStorage.getItem(THEME_PREFERENCE_KEY);
  if (saved === 'light' || saved === 'dark' || saved === 'system') {
    return saved;
  }
  return 'system';
}

export function applyThemePreference(preference: ThemePreference) {
  Appearance.setColorScheme(preference === 'system' ? null : preference);
}

export async function setThemePreference(preference: ThemePreference) {
  await AsyncStorage.setItem(THEME_PREFERENCE_KEY, preference);
  applyThemePreference(preference);
}

export function getEffectiveTheme(colorScheme: ColorSchemeName): 'light' | 'dark' {
  return colorScheme === 'dark' ? 'dark' : 'light';
}
