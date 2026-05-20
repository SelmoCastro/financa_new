import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from '../services/api';

const DEBOUNCE_MS = 30_000;
const sentErrors = new Map<string, number>();

function getDeviceId(): string {
  // Android ID not easily available via expo-application in managed workflow
  // Use Constants.sessionId as a stable device identifier
  try {
    return Constants.sessionId || 'unknown';
  } catch {
    return 'unknown';
  }
}

function getAppVersion(): string {
  try {
    return Constants.expoConfig?.version || 'unknown';
  } catch {
    return 'unknown';
  }
}

function debounceKey(message: string, stack?: string): string {
  const shortMsg = message.slice(0, 100);
  const shortStack = stack?.slice(0, 200) || '';
  return `${shortMsg}|${shortStack}`;
}

async function sendReport(payload: {
  message: string;
  stack?: string;
  componentStack?: string;
  platform?: string;
  appVersion?: string;
  deviceId?: string;
  userId?: string;
  timestamp?: string;
}) {
  try {
    await api.post('/errors/report', payload);
  } catch {
    // Silently fail - don't create infinite error loops
  }
}

export function reportError(
  error: Error | string,
  componentStack?: string,
  userId?: string,
) {
  const rawMessage = typeof error === 'string' ? error : error.message || String(error);
  const rawStack = typeof error === 'string' ? undefined : error.stack;
  const message = sanitizeErrorText(rawMessage).slice(0, 2000);
  const stack = rawStack ? sanitizeErrorText(rawStack).slice(0, 8000) : undefined;
  const safeComponentStack = componentStack ? sanitizeErrorText(componentStack).slice(0, 8000) : undefined;

  const key = debounceKey(message, stack);
  const now = Date.now();
  const lastSent = sentErrors.get(key);
  if (lastSent && now - lastSent < DEBOUNCE_MS) {
    return; // Debounce: skip duplicate within 30s
  }
  sentErrors.set(key, now);

  // Clean up old entries
  if (sentErrors.size > 100) {
    const cutoff = now - DEBOUNCE_MS;
    sentErrors.forEach((v, k) => {
      if (v < cutoff) sentErrors.delete(k);
    });
  }

  sendReport({
    message,
    stack,
    componentStack: safeComponentStack,
    platform: Platform.OS,
    appVersion: getAppVersion(),
    deviceId: getDeviceId(),
    userId,
    timestamp: new Date().toISOString(),
  });
}

function sanitizeErrorText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/(access_token|refreshToken|authorization|password|senha)=?\s*[^\s&]+/gi, '$1=[REDACTED]');
}

// Convenience wrapper for React ErrorBoundary (catches componentStack)
export function reportReactError(
  error: Error,
  errorInfo: { componentStack?: string },
  userId?: string,
) {
  reportError(error, errorInfo.componentStack, userId);
}

// Initialize global JS error handler
// Call with userIdGetter to include userId in crash reports
let _userIdGetter: (() => string | undefined) | undefined;

export function initErrorReporter(userIdGetter?: () => string | undefined) {
  _userIdGetter = userIdGetter;

  const originalHandler = ErrorUtils.getGlobalHandler();

  ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
    const userId = _userIdGetter?.();
    reportError(error, undefined, userId);

    // Call original handler so the app still shows red screen in dev
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });

  if (__DEV__) console.log('[ErrorReporter] Global error handler initialized');
}