import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus, Linking } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

const DISMISS_KEY = '@finanza_update_dismissed_at';
const RECHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const REAPPEAR_DELAY = 24 * 60 * 60 * 1000; // 24 hours after dismiss

interface VersionInfo {
    version: string;
    apkUrl: string | null;
    apkAvailable: boolean;
    minRequiredVersion: string;
    releaseNotes: string;
}

interface UpdateStatus {
    hasUpdate: boolean;
    isRequired: boolean;
    versionInfo: VersionInfo | null;
    currentVersion: string;
    checking: boolean;
    checkForUpdate: () => Promise<void>;
    dismissUpdate: () => void;
    showUpdate: () => void;
    dismissed: boolean;
    goToDownloadPage: () => void;
    errorMessage: string;
}

/**
 * Compares two semver strings.
 * Returns: 1 if a > b, -1 if a < b, 0 if equal
 */
function compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const ai = aParts[i] || 0;
        const bi = bParts[i] || 0;
        if (ai > bi) return 1;
        if (ai < bi) return -1;
    }
    return 0;
}

export function useUpdateChecker(): UpdateStatus {
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
    const [checking, setChecking] = useState(false);
    const [dismissed, setDismissed] = useState(true); // start true, load async
    const [errorMessage, setErrorMessage] = useState('');
    const lastCheckRef = useRef(0);
    const appStateRef = useRef(AppState.currentState);

    const currentVersion = Application.nativeApplicationVersion || Constants.expoConfig?.version || '0.0.0';

    // Load dismiss timestamp
    useEffect(() => {
        (async () => {
            try {
                const dismissedAt = await AsyncStorage.getItem(DISMISS_KEY);
                if (dismissedAt) {
                    const elapsed = Date.now() - parseInt(dismissedAt, 10);
                    setDismissed(elapsed < REAPPEAR_DELAY);
                } else {
                    setDismissed(false);
                }
            } catch {
                setDismissed(false);
            }
        })();
    }, []);

    const checkForUpdate = useCallback(async (force = false) => {
        if (Platform.OS !== 'android') return;

        const now = Date.now();
        if (!force && now - lastCheckRef.current < RECHECK_INTERVAL) return;
        lastCheckRef.current = now;

        try {
            setChecking(true);
            const response = await api.get('/app/version');
            const data = response.data?.data || response.data;
            console.log('[UpdateChecker] currentVersion:', currentVersion, 'serverVersion:', data?.version, 'hasUpdate:', data ? compareVersions(data.version, currentVersion) > 0 : 'no data');
            setVersionInfo(data);
        } catch (error: any) {
            console.log('[UpdateChecker] Failed to check for updates:', error?.message || error);
        } finally {
            setChecking(false);
        }
    }, [currentVersion]);

    // Initial check with 3s delay
    useEffect(() => {
        const timer = setTimeout(() => {
            checkForUpdate();
        }, 3000);
        return () => clearTimeout(timer);
    }, [checkForUpdate]);

    // Check when app returns from background + re-evaluate dismiss
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            if (appStateRef.current === 'background' && nextState === 'active') {
                (async () => {
                    try {
                        const dismissedAt = await AsyncStorage.getItem(DISMISS_KEY);
                        if (dismissedAt) {
                            const elapsed = Date.now() - parseInt(dismissedAt, 10);
                            if (elapsed >= REAPPEAR_DELAY) {
                                setDismissed(false);
                                await AsyncStorage.removeItem(DISMISS_KEY);
                            }
                        }
                    } catch { /* ignore */ }
                })();

                checkForUpdate();
            }
            appStateRef.current = nextState;
        });

        return () => subscription.remove();
    }, [checkForUpdate]);

    const hasUpdate = versionInfo
        ? compareVersions(versionInfo.version, currentVersion) > 0 && versionInfo.apkAvailable !== false
        : false;

    const isRequired = versionInfo
        ? compareVersions(currentVersion, versionInfo.minRequiredVersion) < 0
        : false;

    const dismissUpdate = useCallback(() => {
        setDismissed(true);
        AsyncStorage.setItem(DISMISS_KEY, String(Date.now())).catch(() => {});
    }, []);

    const showUpdate = useCallback(() => {
        setDismissed(false);
        AsyncStorage.removeItem(DISMISS_KEY).catch(() => {});
    }, []);

    /**
     * Redirect to the central downloads page.
     * This avoids automatic double-downloads in the background.
     */
    const goToDownloadPage = useCallback(async () => {
        const url = 'https://finanzaai.tech/downloads/';
        try {
            await Linking.openURL(url);
        } catch (error: any) {
            console.log('[UpdateChecker] Failed to open URL:', error?.message || error);
            setErrorMessage('Não foi possível abrir a página de download. Acesse finanzaai.tech/downloads manualmente.');
        }
    }, []);

    return {
        hasUpdate,
        isRequired,
        versionInfo,
        currentVersion,
        checking,
        checkForUpdate,
        dismissUpdate,
        showUpdate,
        dismissed,
        goToDownloadPage,
        errorMessage,
    };
}