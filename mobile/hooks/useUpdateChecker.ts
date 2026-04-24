import { useState, useEffect, useCallback } from 'react';
import { Platform, Linking } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import api from '../services/api';

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
    checking: boolean;
    checkForUpdate: () => Promise<void>;
    dismissUpdate: () => void;
    dismissed: boolean;
    openDownload: () => void;
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
    const [dismissed, setDismissed] = useState(false);

    // nativeApplicationVersion works in production builds (EAS standalone APKs)
    // expoConfig.version only works in development (Expo Go / dev client)
    const currentVersion = Application.nativeApplicationVersion || Constants.expoConfig?.version || '0.0.0';

    const checkForUpdate = useCallback(async () => {
        if (Platform.OS !== 'android') return;

        try {
            setChecking(true);
            // Public endpoint — no auth needed
            const response = await api.get('/app/version');
            // The response interceptor already unwraps { statusCode, data, timestamp } → data
            // So response.data is already the inner data object
            const data = response.data?.data || response.data;
            console.log('[UpdateChecker] currentVersion:', currentVersion, 'serverVersion:', data?.version, 'hasUpdate:', data ? compareVersions(data.version, currentVersion) > 0 : 'no data');
            setVersionInfo(data);
        } catch (error: any) {
            // Log error details to help debug
            console.log('[UpdateChecker] Failed to check for updates:', error?.message || error);
        } finally {
            setChecking(false);
        }
    }, [currentVersion]);

    useEffect(() => {
        // Delay check by 3s to let app fully initialize (auth, network, etc.)
        const timer = setTimeout(() => {
            checkForUpdate();
        }, 3000);
        return () => clearTimeout(timer);
    }, [checkForUpdate]);

    const hasUpdate = versionInfo
        ? compareVersions(versionInfo.version, currentVersion) > 0
        : false;

    const isRequired = versionInfo
        ? compareVersions(currentVersion, versionInfo.minRequiredVersion) < 0
        : false;

    const openDownload = useCallback(() => {
        if (versionInfo?.apkUrl) {
            Linking.openURL(versionInfo.apkUrl);
        }
    }, [versionInfo]);

    return {
        hasUpdate,
        isRequired,
        versionInfo,
        checking,
        checkForUpdate,
        dismissUpdate: () => setDismissed(true),
        dismissed,
        openDownload,
    };
}