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

    const currentVersion = Constants.expoConfig?.version || '0.0.0';

    const checkForUpdate = useCallback(async () => {
        if (Platform.OS !== 'android') return;

        try {
            setChecking(true);
            // Public endpoint — no auth needed
            const response = await api.get('/v1/app/version');
            const data = response.data?.data || response.data;
            setVersionInfo(data);
        } catch (error) {
            // Silently fail — don't disrupt the user
            console.log('[UpdateChecker] Failed to check for updates:', error);
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        checkForUpdate();
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