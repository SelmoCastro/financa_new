import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter } from 'react-native';

const BIOMETRIC_LOCK_KEY = 'biometric_lock_enabled';

export async function isBiometricProtectionAvailable(): Promise<boolean> {
  const [hasHardware, isEnrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);

  return Boolean(hasHardware && isEnrolled);
}

export async function getBiometricLockEnabled(): Promise<boolean> {
  return (await SecureStore.getItemAsync(BIOMETRIC_LOCK_KEY)) === 'true';
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_LOCK_KEY, enabled ? 'true' : 'false');
  DeviceEventEmitter.emit('security:biometric-preference-changed', enabled);
}

export async function authenticateBiometric(options?: {
  promptMessage?: string;
  cancelLabel?: string;
}): Promise<LocalAuthentication.LocalAuthenticationResult> {
  return LocalAuthentication.authenticateAsync({
    promptMessage: options?.promptMessage || 'Desbloquear Finanza AI',
    cancelLabel: options?.cancelLabel || 'Cancelar',
    disableDeviceFallback: false,
  });
}