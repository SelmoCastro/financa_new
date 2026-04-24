import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// Use legacy API from expo-file-system (still available in v19)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { documentDirectory, getInfoAsync, makeDirectoryAsync, createDownloadResumable, getContentUriAsync } = require('expo-file-system');

const DISMISS_KEY = '@finanza_update_dismissed_at';
const DOWNLOADED_VERSION_KEY = '@finanza_downloaded_version';
const RECHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const REAPPEAR_DELAY = 24 * 60 * 60 * 1000; // 24 hours after dismiss

interface VersionInfo {
    version: string;
    apkUrl: string;
    minRequiredVersion: string;
    releaseNotes: string;
}

type DownloadPhase = 'idle' | 'downloading' | 'ready' | 'installing' | 'error';

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
    startDownload: () => void;
    installUpdate: () => void;
    downloadPhase: DownloadPhase;
    downloadProgress: number;
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

/**
 * Get a content URI for a file using FileProvider.
 * On Android 7+ (API 24+), you cannot use file:// URIs directly.
 * This converts a file:// URI to a content:// URI that the system installer can use.
 */
async function getContentUri(fileUri: string): Promise<string> {
    // getContentUriAsync is from expo-file-system legacy API, extracted via require above
    // It converts file:// URI to content:// URI via FileProvider (required for Android 7+)
    if (getContentUriAsync) {
        return await getContentUriAsync(fileUri);
    }
    // Fallback: try the file URI directly (won't work on API 24+ but graceful degradation)
    return fileUri;
}

export function useUpdateChecker(): UpdateStatus {
    const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
    const [checking, setChecking] = useState(false);
    const [dismissed, setDismissed] = useState(true); // start true, load async
    const [downloadPhase, setDownloadPhase] = useState<DownloadPhase>('idle');
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [errorMessage, setErrorMessage] = useState('');
    const lastCheckRef = useRef(0);
    const appStateRef = useRef(AppState.currentState);
    const downloadedApkPathRef = useRef<string | null>(null);

    const currentVersion = Application.nativeApplicationVersion || Constants.expoConfig?.version || '0.0.0';

    // Load dismiss timestamp and check for already-downloaded APK
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

    // Check if a downloaded APK already exists for the latest version
    const checkExistingDownload = useCallback(async (version: string, apkUrl: string) => {
        try {
            const apkFileName = `Financa_new_v${version}.apk`;
            const downloadDir = `${documentDirectory}updates/`;
            const downloadPath = `${downloadDir}${apkFileName}`;

            const existingFile = await getInfoAsync(downloadPath);
            if (existingFile.exists) {
                downloadedApkPathRef.current = downloadPath;
                setDownloadPhase('ready');
                return true;
            }
        } catch {
            // ignore
        }
        return false;
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

            // If update available, check if we already downloaded this version
            if (data && compareVersions(data.version, currentVersion) > 0) {
                await checkExistingDownload(data.version, data.apkUrl);
            }
        } catch (error: any) {
            console.log('[UpdateChecker] Failed to check for updates:', error?.message || error);
        } finally {
            setChecking(false);
        }
    }, [currentVersion, checkExistingDownload]);

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

    const startDownload = useCallback(async () => {
        if (!versionInfo?.apkUrl || downloadPhase === 'downloading') return;

        try {
            setDownloadPhase('downloading');
            setDownloadProgress(0);
            setErrorMessage('');

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
                downloadedApkPathRef.current = downloadPath;
                setDownloadPhase('ready');
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

            if (downloadResult?.uri) {
                downloadedApkPathRef.current = downloadResult.uri;
                setDownloadPhase('ready');
            } else {
                setDownloadPhase('error');
                setErrorMessage('Falha ao baixar o APK.');
            }
        } catch (error: any) {
            console.log('[UpdateChecker] Download failed:', error?.message || error);
            setDownloadPhase('error');
            setErrorMessage(error?.message || 'Erro desconhecido');
        }
    }, [versionInfo, downloadPhase]);

    const installUpdate = useCallback(async () => {
        const apkPath = downloadedApkPathRef.current;
        if (!apkPath) {
            setDownloadPhase('error');
            setErrorMessage('APK não encontrado. Tente baixar novamente.');
            return;
        }

        try {
            setDownloadPhase('installing');

            // Convert file:// URI to content:// URI for Android 7+ compatibility
            const contentUri = await getContentUri(apkPath);

            // Launch the system APK installer
            await IntentLauncher.startActivityAsync(
                'android.intent.action.VIEW',
                {
                    data: contentUri,
                    flags: 1, // FLAG_ACTIVITY_NEW_TASK
                    type: 'application/vnd.android.package-archive',
                }
            );
        } catch (error: any) {
            console.log('[UpdateChecker] Install failed:', error?.message || error);
            setDownloadPhase('error');
            setErrorMessage('Não foi possível iniciar a instalação. Tente novamente.');
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
        startDownload,
        installUpdate,
        downloadPhase,
        downloadProgress,
        errorMessage,
    };
}