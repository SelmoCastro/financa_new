import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack, useSegments, router } from 'expo-router';
import * as ExpoRouter from 'expo-router';
import { Component, useEffect, PropsWithChildren, useCallback, useRef, useState } from 'react';
import { ActivityIndicator, AppState, DeviceEventEmitter, LogBox, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { NetworkProvider } from '../context/NetworkContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { LanguageProvider } from '../context/LanguageContext';
import { useLanguage } from '../context/LanguageContext';
import { UpdateDialog } from '../components/UpdateDialog';
import { ConsentModal } from '../components/ConsentModal';
import { initErrorReporter, reportReactError } from '../utils/errorReporter';
import { initLocalDb } from '../services/localDb';
import { applyThemePreference, getThemePreference } from '../services/themePreference';
import { authenticateBiometric, getBiometricLockEnabled } from '../services/biometricLock';
import { initSslPinning } from '../services/sslPinning';
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
  const [securityReady, setSecurityReady] = useState(false);

  useEffect(() => {
    Promise.all([
      initLocalDb().catch((dbError) => {
        if (__DEV__) console.warn('[localDb] Falha ao inicializar banco offline:', dbError);
      }),
      initSslPinning().catch(() => {
        console.warn('[sslPinning] initialization failed');
      }),
    ]).finally(() => {
      setSecurityReady(true);
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
    if (loaded && themeReady && securityReady) {
      SplashScreen.hideAsync();
    }
  }, [loaded, themeReady, securityReady]);

  if (!loaded || !themeReady || !securityReady) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <AuthProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <RootLayoutNav />
            </CurrencyProvider>
          </LanguageProvider>
        </AuthProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const segments = useSegments();
  const { token, isLoading, logout } = useAuth();
  const { t } = useLanguage();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLocked, setBiometricLocked] = useState(false);
  const [biometricUnlocking, setBiometricUnlocking] = useState(false);
  const unlockInFlightRef = useRef(false);

  const requestBiometricUnlock = useCallback(async () => {
    if (!token || !biometricEnabled || unlockInFlightRef.current) return;

    unlockInFlightRef.current = true;
    setBiometricUnlocking(true);
    try {
      const result = await authenticateBiometric({
        promptMessage: t('settings.biometric.unlockTitle'),
        cancelLabel: t('settings.cancel'),
      });

      if (result.success) {
        setBiometricLocked(false);
      }
    } finally {
      unlockInFlightRef.current = false;
      setBiometricUnlocking(false);
    }
  }, [biometricEnabled, t, token]);

  useEffect(() => {
    let mounted = true;

    getBiometricLockEnabled()
      .then((enabled) => {
        if (!mounted) return;
        setBiometricEnabled(enabled);
        if (!token || !enabled) {
          setBiometricLocked(false);
          return;
        }

        setBiometricLocked(true);
        requestBiometricUnlock();
      })
      .catch(() => {
        if (!mounted) return;
        setBiometricEnabled(false);
        setBiometricLocked(false);
      });

    return () => {
      mounted = false;
    };
  }, [requestBiometricUnlock, token]);

  useEffect(() => {
    const biometricPreferenceSubscription = DeviceEventEmitter.addListener(
      'security:biometric-preference-changed',
      (enabled: boolean) => {
        setBiometricEnabled(Boolean(enabled));

        if (!token || !enabled) {
          setBiometricLocked(false);
          return;
        }

        setBiometricLocked(true);
        requestBiometricUnlock();
      }
    );

    return () => biometricPreferenceSubscription.remove();
  }, [requestBiometricUnlock, token]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (!token || !biometricEnabled) return;

      if (nextState === 'background' || nextState === 'inactive') {
        setBiometricLocked(true);
        return;
      }

      if (nextState === 'active') {
        setBiometricLocked(true);
        requestBiometricUnlock();
      }
    });

    return () => subscription.remove();
  }, [biometricEnabled, requestBiometricUnlock, token]);

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
      {token && biometricEnabled && biometricLocked && (
        <View style={lockStyles.overlay}>
          <View style={lockStyles.card}>
            <Text style={lockStyles.icon}>🔒</Text>
            <Text style={lockStyles.title}>{t('settings.biometric.unlockTitle')}</Text>
            <Text style={lockStyles.subtitle}>{t('settings.biometric.unlockSubtitle')}</Text>

            <TouchableOpacity
              style={[lockStyles.primaryButton, biometricUnlocking && lockStyles.buttonDisabled]}
              onPress={requestBiometricUnlock}
              disabled={biometricUnlocking}
            >
              {biometricUnlocking ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={lockStyles.primaryButtonText}>{t('settings.biometric.unlockButton')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={lockStyles.secondaryButton} onPress={logout}>
              <Text style={lockStyles.secondaryButtonText}>{t('settings.logout')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ThemeProvider>
  );
}

const lockStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 9999,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
    alignItems: 'center',
  },
  icon: {
    fontSize: 44,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#cbd5e1',
    textAlign: 'center',
    marginBottom: 20,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});