import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus, Linking, Alert } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// Use legacy API from expo-file-system (still available in v19)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { documentDirectory, getInfoAsync, makeDirectoryAsync, createDownloadResumable } = require('expo-file-system');

const DISMISS_KEY = '@finanza_update_dismissed_at';
const RECHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const REAPPEAR_DELAY = 24 * 60 * 60 * 1000; // 24 hours after dismiss

interface VersionInfo {
    version: string;
    apkUrl: string;
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
    openDownload: () => void;
    downloading: boolean;
    downloadProgress: number;
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
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const lastCheckRef = useRef(0);
    const appStateRef = useRef(AppState.currentState);

    const currentVersion = Application.nativeApplicationVersion || Constants.expoConfig?.version || '0.0.0';

    // Load dismiss timestamp from AsyncStorage
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
                // Re-check dismiss: maybe 24h passed since dismissal
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
        ? compareVersions(versionInfo.version, currentVersion) > 0
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

    const openDownload = useCallback(async () => {
        if (!versionInfo?.apkUrl) return;

        try {
            setDownloading(true);
            setDownloadProgress(0);

            const apkFileName = `Financa_new_v${versionInfo.version}.apk`;
            const downloadDir = `${documentDirectory}updates/`;
            const downloadPath = `${downloadDir}${apkFileName}`;

            // Ensure directory exists
            const dirInfo = await getInfoAsync(downloadDir);
            if (!dirInfo.exists) {
                await makeDirectoryAsync(downloadDir, { intermediates: true });
            }

            // Check if already downloaded
            const existingFile = await getInfoAsync(downloadPath);
            if (existingFile.exists) {
                setDownloading(false);
                Alert.alert(
                    'Atualização baixada',
                    'O APK já foi baixado. Deseja abrir para instalar?',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Instalar', onPress: () => Linking.openURL(downloadPath) },
                    ]
                );
                return;
            }

            // Download with progress
            const downloadResumable = createDownloadResumable(
                versionInfo.apkUrl,
                downloadPath,
                {},
                (progress: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => {
                    const percent = progress.totalBytesWritten / progress.totalBytesExpectedToWrite;
                    setDownloadProgress(Math.round(percent * 100));
                }
            );

            const downloadResult = await downloadResumable.downloadAsync();
            setDownloading(false);

            if (downloadResult?.uri) {
                Alert.alert(
                    'Download concluído!',
                    `v${versionInfo.version} baixado. Toque para instalar.`,
                    [
                        { text: 'Depois', style: 'cancel' },
                        { text: 'Instalar', onPress: () => Linking.openURL(downloadResult.uri) },
                    ]
                );
            }
        } catch (error: any) {
            setDownloading(false);
            console.log('[UpdateChecker] Download failed:', error?.message || error);
            // Fallback: open in browser
            Alert.alert(
                'Erro no download',
                'Não foi possível baixar diretamente. Abrindo no navegador...',
                [
                    {
                        text: 'OK',
                        onPress: () => Linking.openURL(versionInfo.apkUrl),
                    },
                ]
            );
        }
    }, [versionInfo]);

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
        openDownload,
        downloading,
        downloadProgress,
    };
}