import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useSegments, router } from 'expo-router';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import '../global.css';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Load your custom fonts here if needed
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CurrencyProvider>
          <RootLayoutNav />
        </CurrencyProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const { token, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    // Root (index) has empty segments `[]` or no defined first segment
    const isIndex = !segments[0];
    const isSignup = segments[0] === 'signup';
    const isPublicRoute = isIndex || isSignup;

    console.log(`[Router Protection] Token: ${!!token} | isPublic: ${isPublicRoute} | Path: ${segments.join('/')}`);

    if (!token && !isPublicRoute) {
      console.log('[Router Protection] Deslogado em área protegida. Redirecionando para login...');
      // Small timeout to avoid Expo Router race conditions during re-renders or background recovery
      setTimeout(() => {
        router.replace('/');
      }, 0);
    } else if (token && isPublicRoute) {
      console.log('[Router Protection] Logado em área pública. Redirecionando para dashboard...');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 0);
    }
  }, [token, isLoading, segments]);

  if (isLoading) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
