import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useSegments, router } from 'expo-router';
import * as ExpoRouter from 'expo-router';
import { Component, useEffect, PropsWithChildren, ReactNode, useState } from 'react';
import { LogBox, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { NetworkProvider } from '../context/NetworkContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { UpdateDialog } from '../components/UpdateDialog';
import { ConsentModal } from '../components/ConsentModal';
import { initErrorReporter, reportReactError } from '../utils/errorReporter';
import { initLocalDb } from '../services/localDb';
import { applyThemePreference, getThemePreference } from '../services/themePreference';
import '../global.css';

// Suppress expo-file-system deprecation warnings (SDK 54+ legacy API, used internally by expo)
LogBox.ignoreLogs(['Method .*Async imported from "expo-file-system" is deprecated']);

// Initialize global JS error handler
initErrorReporter();

// Custom ErrorBoundary that wraps expo-router's and reports React errors
class ErrorBoundary extends Component<
  PropsWithChildren<{ error?: any }>,
  { error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    reportReactError(error, { componentStack: errorInfo.componentStack ?? undefined });
  }

  render() {
    if (this.state.error) {
      // Delegate rendering to expo-router's built-in ErrorBoundary UI
      const ExpoErrorBoundary = (ExpoRouter as any).ErrorBoundary;
      if (ExpoErrorBoundary) {
        return <ExpoErrorBoundary error={this.state.error} />;
      }
      return null;
    }
    return this.props.children;
  }
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    // Load your custom fonts here if needed
  });
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    initLocalDb().catch((dbError) => {
      if (__DEV__) console.warn('[localDb] Falha ao inicializar banco offline:', dbError);
    });
  }, []);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    getThemePreference()
      .then((preference) => {
        applyThemePreference(preference);
      })
      .finally(() => {
        setThemeReady(true);
      });
  }, []);

  useEffect(() => {
    if (loaded && themeReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, themeReady]);

  if (!loaded || !themeReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <AuthProvider>
          <CurrencyProvider>
            <RootLayoutNav />
          </CurrencyProvider>
        </AuthProvider>
      </NetworkProvider>
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

    if (__DEV__) console.log(`[Router Protection] Token: ${!!token} | isPublic: ${isPublicRoute} | Path: ${segments.join('/')}`);

    if (!token && !isPublicRoute) {
      if (__DEV__) console.log('[Router Protection] Deslogado em área protegida. Redirecionando para login...');
      // Small timeout to avoid Expo Router race conditions during re-renders or background recovery
      setTimeout(() => {
        router.replace('/');
      }, 0);
    } else if (token && isPublicRoute) {
      if (__DEV__) console.log('[Router Protection] Logado em área pública. Redirecionando para dashboard...');
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
      <UpdateDialog />
      <ConsentModal />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}