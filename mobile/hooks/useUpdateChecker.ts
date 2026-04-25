import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBlobUtil from 'react-native-blob-util';
import api from '../services/api';

const DISMISS_KEY = '@finanza_update_dismissed_at';
const DOWNLOADED_VERSION_KEY = '@finanza_downloaded_version';
const RECHECK_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
const REAPPEAR_DELAY = 24 * 60 * 60 * 1000; // 24 hours after dismiss
const MAX_RETRIES = 3;

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
 * Check if the device can install packages from unknown sources (Android 8+).
 * If not, prompt the user to enable it.
 */
async function ensureInstallPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') return false;

    try {
        // On Android 8+, we need to check if the app can request package installs
        // expo-intent-launcher doesn't have a direct "canRequestPackageInstalls" API,
        // so we try to install and catch the error if permission is missing.
        // However, we proactively open the settings for unknown sources.
        const sdkVersion = parseInt(Platform.Version as string, 10);
        if (sdkVersion >= 26) {
            // Android 8+ (API 26): Per-app unknown source install permission
            // Try to open the settings page for this app to enable it
            // This is a best-effort — the user must enable it manually
            try {
                const packageName = Application.nativeApplicationVersion
                    ? undefined // Can't easily get package name from Expo
                    : undefined;

                // Open the "Install unknown apps" settings for this app
                await IntentLauncher.startActivityAsync(
                    'android.settings.MANAGE_UNKNOWN_APP_SOURCES',
                    {
                        data: `package:${Constants.expoConfig?.android?.package || Application.applicationId}`,
                        flags: 1,
                    }
                );
                // Give user time to enable — they'll come back and retry
                return false;
            } catch {
                // If the intent fails, the permission might already be granted
                // or the settings page doesn't exist on this device
                // Continue with install attempt
                return true;
            }
        }
    } catch {
        // Older Android or error — proceed with install attempt
    }
    return true;
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
    const retryCountRef = useRef(0);

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
            // react-native-blob-util downloads to its own cache dir, check there
            const dir = ReactNativeBlobUtil.fs.dirs.CacheDir;
            const downloadPath = `${dir}/updates/${apkFileName}`;

            const exists = await ReactNativeBlobUtil.fs.isDir(`${dir}/updates/`).then(
                () => ReactNativeBlobUtil.fs.exists(downloadPath),
                () => false
            );

            if (exists) {
                downloadedApkPathRef.current = downloadPath;
                setDownloadPhase('ready');
                return true;
            }

            // Also check expo-file-system documentDirectory (legacy downloads)
            const legacyPath = `${FileSystem.documentDirectory}updates/${apkFileName}`;
            const legacyInfo = await FileSystem.getInfoAsync(legacyPath);
            if (legacyInfo.exists) {
                downloadedApkPathRef.current = legacyPath;
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
            retryCountRef.current = 0;

            const apkFileName = `Financa_new_v${versionInfo.version}.apk`;
            const cacheDir = ReactNativeBlobUtil.fs.dirs.CacheDir;
            const updatesDir = `${cacheDir}/updates`;
            const downloadPath = `${updatesDir}/${apkFileName}`;

            // Ensure directory exists
            await ReactNativeBlobUtil.fs.mkdir(updatesDir).catch(() => {
                // Directory may already exist, ignore error
            });

            // Check if already downloaded
            const alreadyExists = await ReactNativeBlobUtil.fs.exists(downloadPath);
            if (alreadyExists) {
                downloadedApkPathRef.current = downloadPath;
                setDownloadPhase('ready');
                return;
            }

            // Download using react-native-blob-util (streams to disk, no memory issues)
            const result = await ReactNativeBlobUtil.config({
                path: downloadPath,
                fileCache: false, // Use our custom path, not cache
                indicator: true,   // Show download notification on Android
                overwrite: true,
            }).fetch('GET', versionInfo.apkUrl);

            // Verify the download succeeded
            const fileExists = await ReactNativeBlobUtil.fs.exists(downloadPath);
            if (fileExists) {
                // Check file size to make sure it's not truncated
                const stat = await ReactNativeBlobUtil.fs.stat(downloadPath);
                const fileSize = Number(stat.size);

                if (fileSize < 1_000_000) {
                    // APK smaller than 1MB — download failed/truncated
                    console.log('[UpdateChecker] Downloaded file too small:', fileSize, 'bytes — likely truncated');
                    await ReactNativeBlobUtil.fs.unlink(downloadPath).catch(() => {});
                    setDownloadPhase('error');
                    setErrorMessage('Download falhou — arquivo muito pequeno. Tente novamente.');
                    return;
                }

                downloadedApkPathRef.current = downloadPath;
                setDownloadPhase('ready');
                // Reset retry count on success
                retryCountRef.current = 0;
            } else {
                setDownloadPhase('error');
                setErrorMessage('Falha ao baixar o APK.');
            }
        } catch (error: any) {
            console.log('[UpdateChecker] Download failed:', error?.message || error);
            retryCountRef.current++;

            if (retryCountRef.current < MAX_RETRIES) {
                // Auto-retry after brief delay
                console.log(`[UpdateChecker] Retrying download (${retryCountRef.current}/${MAX_RETRIES})...`);
                setTimeout(() => {
                    // Reset downloading phase so retry can proceed
                    setDownloadPhase('idle');
                    startDownload();
                }, 2000);
            } else {
                setDownloadPhase('error');
                setErrorMessage(error?.message || 'Erro desconhecido ao baixar');
                retryCountRef.current = 0;
            }
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

            // Convert file:// URI to content:// URI for Android 7+ (API 24+)
            // Must use content:// URI via FileProvider — file:// URIs are blocked on API 24+
            let contentUri: string;

            if (apkPath.startsWith('file://')) {
                contentUri = await FileSystem.getContentUriAsync(apkPath);
            } else if (apkPath.startsWith('/')) {
                // react-native-blob-util returns absolute paths without file:// prefix
                contentUri = await FileSystem.getContentUriAsync(`file://${apkPath}`);
            } else {
                contentUri = await FileSystem.getContentUriAsync(apkPath);
            }

            console.log('[UpdateChecker] Installing from:', contentUri);

            // Use ACTION_INSTALL_PACKAGE (not ACTION_VIEW) for APK installation
            await IntentLauncher.startActivityAsync(
                'android.intent.action.INSTALL_PACKAGE',
                {
                    data: contentUri,
                    flags: 1, // FLAG_ACTIVITY_NEW_TASK
                    type: 'application/vnd.android.package-archive',
                }
            );
        } catch (error: any) {
            console.log('[UpdateChecker] Install failed:', error?.message || error);

            // Fallback: try ACTION_VIEW if ACTION_INSTALL_PACKAGE fails
            // (some older devices/ROMs may not support INSTALL_PACKAGE)
            try {
                const apkPath = downloadedApkPathRef.current!;
                let contentUri: string;

                if (apkPath.startsWith('file://')) {
                    contentUri = await FileSystem.getContentUriAsync(apkPath);
                } else if (apkPath.startsWith('/')) {
                    contentUri = await FileSystem.getContentUriAsync(`file://${apkPath}`);
                } else {
                    contentUri = await FileSystem.getContentUriAsync(apkPath);
                }

                await IntentLauncher.startActivityAsync(
                    'android.intent.action.VIEW',
                    {
                        data: contentUri,
                        flags: 1,
                        type: 'application/vnd.android.package-archive',
                    }
                );
            } catch (fallbackError: any) {
                console.log('[UpdateChecker] Fallback install also failed:', fallbackError?.message || fallbackError);
                setDownloadPhase('error');
                setErrorMessage('Não foi possível iniciar a instalação. Tente novamente.');
            }
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