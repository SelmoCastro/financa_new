import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, AppState, AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as IntentLauncher from 'expo-intent-launcher';
import * as FileSystem from 'expo-file-system/legacy';
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
    apkUrl: string | null;
    apkAvailable: boolean;
    minRequiredVersion: string;
    releaseNotes: string;
}

export type DownloadPhase = 'idle' | 'downloading' | 'ready' | 'installing' | 'error';

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
    resetDownload: () => void;
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
    // Only auto-detect if the user hasn't dismissed the update — prevents loop
    const checkExistingDownload = useCallback(async (version: string, apkUrl: string, skipIfDismissed = true) => {
        // If user already dismissed, don't auto-restore the 'ready' state
        // (prevents infinite loop where dismissed update keeps reappearing)
        if (skipIfDismissed && dismissed) return false;

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
    }, [dismissed]);

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
                // Save downloaded version info for potential resume
                if (data.apkUrl) {
                    await AsyncStorage.setItem(DOWNLOADED_VERSION_KEY, JSON.stringify({
                        version: data.version,
                        apkUrl: data.apkUrl,
                    })).catch(() => {});
                }
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
            // IMPORTANT: .progress() must be chained BEFORE .fetch() to receive callbacks
            const task = ReactNativeBlobUtil.config({
                path: downloadPath,
                fileCache: false, // Use our custom path, not cache
                indicator: true,   // Show download notification on Android
                overwrite: true,
            }).fetch('GET', versionInfo.apkUrl);

            // Wire up progress callback (must be before fetch resolves)
            // Use the config overload: .progress({ count, interval }, callback) — callback receives numbers
            // Without config, callback receives strings which would break the math below.
            task.progress({ count: 10, interval: 250 }, (received: number, total: number) => {
                const percent = total > 0 ? Math.round((received / total) * 100) : 0;
                setDownloadProgress(percent);
            });

            const result = await task;

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

    /**
     * Install the downloaded APK.
     * 
     * Strategy:
     * 1. Try getContentUriAsync() (uses expo-file-system's FileProvider) → ACTION_INSTALL_PACKAGE
     * 2. If that fails, try direct file:// URI with ACTION_VIEW (works on some devices)
     * 3. If that fails, open the APK URL in the browser as last resort
     * 
     * We do NOT call ensureInstallPermission() proactively because:
     * - On Android 8+, opening the install-unknown-apps settings takes the user away from the app
     * - The system will automatically prompt the user for permission when INSTALL_PACKAGE is used
     * - This avoids the "open settings then come back" confusion
     */
    const installUpdate = useCallback(async () => {
        const apkPath = downloadedApkPathRef.current;
        if (!apkPath) {
            setDownloadPhase('error');
            setErrorMessage('APK não encontrado. Tente baixar novamente.');
            return;
        }

        try {
            setDownloadPhase('installing');

            // Ensure the path starts with file:// for getContentUriAsync
            let fileUri: string;
            if (apkPath.startsWith('/')) {
                fileUri = `file://${apkPath}`;
            } else if (!apkPath.startsWith('file://')) {
                fileUri = `file:///${apkPath}`;
            } else {
                fileUri = apkPath;
            }

            console.log('[UpdateChecker] Attempting install from:', fileUri);

            // Step 1: Use FileProvider via getContentUriAsync (correct way for Android 7+)
            try {
                const contentUri = await FileSystem.getContentUriAsync(fileUri);
                console.log('[UpdateChecker] Content URI:', contentUri);

                await IntentLauncher.startActivityAsync(
                    'android.intent.action.INSTALL_PACKAGE',
                    {
                        data: contentUri,
                        flags: 1, // FLAG_ACTIVITY_NEW_TASK
                        type: 'application/vnd.android.package-archive',
                    }
                );
                // Intent was started — install prompt should now be visible to user
                // Don't reset state here; if user cancels install they'll see "ready" state
                // and can tap "Instalar" again. If install succeeds, app will restart.
                return;
            } catch (contentError: any) {
                console.log('[UpdateChecker] getContentUriAsync + INSTALL_PACKAGE failed:', contentError?.message || contentError);
            }

            // Step 2: Try ACTION_VIEW with content URI
            try {
                const contentUri = await FileSystem.getContentUriAsync(fileUri);
                console.log('[UpdateChecker] Trying ACTION_VIEW with content URI:', contentUri);

                await IntentLauncher.startActivityAsync(
                    'android.intent.action.VIEW',
                    {
                        data: contentUri,
                        flags: 1,
                        type: 'application/vnd.android.package-archive',
                    }
                );
                return;
            } catch (viewError: any) {
                console.log('[UpdateChecker] ACTION_VIEW with content URI also failed:', viewError?.message || viewError);
            }

            // Step 3: Try ACTION_VIEW with direct file URI (works on Android < 7 or rooted)
            try {
                console.log('[UpdateChecker] Trying ACTION_VIEW with file URI');
                await IntentLauncher.startActivityAsync(
                    'android.intent.action.VIEW',
                    {
                        data: fileUri,
                        flags: 1,
                        type: 'application/vnd.android.package-archive',
                    }
                );
                return;
            } catch (fileError: any) {
                console.log('[UpdateChecker] ACTION_VIEW with file URI also failed:', fileError?.message || fileError);
            }

            // Step 4: Last resort — open the download URL in the device browser
            // The user can download and install from the browser directly
            try {
                const savedVersionStr = await AsyncStorage.getItem(DOWNLOADED_VERSION_KEY);
                const savedVersion = savedVersionStr ? JSON.parse(savedVersionStr) : null;
                const apkUrl = versionInfo?.apkUrl || savedVersion?.apkUrl;
                
                if (apkUrl) {
                    console.log('[UpdateChecker] Last resort: opening APK URL in browser');
                    const { Linking } = require('react-native');
                    await Linking.openURL(apkUrl);
                    setDownloadPhase('error');
                    setErrorMessage('Não foi possível instalar diretamente. O download foi aberto no navegador — abra o arquivo baixado para instalar.');
                    return;
                }
            } catch (linkError: any) {
                console.log('[UpdateChecker] Browser fallback also failed:', linkError?.message || linkError);
            }

            // All methods failed
            setDownloadPhase('error');
            setErrorMessage('Não foi possível iniciar a instalação. Toque em "Depois" para fechar e tente baixar pelo navegador em finanzaai.tech/downloads');

        } catch (error: any) {
            console.log('[UpdateChecker] Install failed with unexpected error:', error?.message || error);
            setDownloadPhase('error');
            setErrorMessage('Erro inesperado ao instalar. Tente novamente ou baixe pelo navegador.');
        }
    }, [versionInfo]);

    // Reset download state so user can dismiss and re-download later
    const resetDownload = useCallback(() => {
        // Delete cached APK if it exists
        const apkPath = downloadedApkPathRef.current;
        if (apkPath) {
            const pathToDelete = apkPath.startsWith('/') && !apkPath.startsWith('file://')
                ? apkPath
                : apkPath.replace('file://', '');
            ReactNativeBlobUtil.fs.unlink(pathToDelete).catch(() => {});
            downloadedApkPathRef.current = null;
        }
        setDownloadPhase('idle');
        setDownloadProgress(0);
        setErrorMessage('');
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
        resetDownload,
        downloadPhase,
        downloadProgress,
        errorMessage,
    };
}