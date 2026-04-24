import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useUpdateChecker } from '../hooks/useUpdateChecker';

function ProgressBar({ progress }: { progress: number }) {
    const widthAnim = useState(new Animated.Value(0))[0];

    useEffect(() => {
        Animated.timing(widthAnim, {
            toValue: progress,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false,
        }).start();
    }, [progress]);

    return (
        <View style={styles.progressTrack}>
            <Animated.View
                style={[
                    styles.progressFill,
                    { width: widthAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                    })},
                ]}
            />
        </View>
    );
}

export function UpdateDialog() {
    const {
        hasUpdate,
        isRequired,
        versionInfo,
        currentVersion,
        dismissed,
        dismissUpdate,
        showUpdate,
        openDownload,
        downloading,
        downloadProgress,
    } = useUpdateChecker();
    const [showToast, setShowToast] = useState(false);

    // Subtle toast when returning from background with update available
    useEffect(() => {
        if (hasUpdate && dismissed && !isRequired) {
            setShowToast(true);
            const timer = setTimeout(() => setShowToast(false), 5000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [hasUpdate, dismissed, isRequired]);

    // Don't show dialog if no update or explicitly dismissed (and not required)
    if (!hasUpdate || (dismissed && !isRequired)) {
        // Show subtle toast for dismissed optional updates
        if (showToast && hasUpdate && !isRequired && versionInfo) {
            return (
                <View style={styles.toastContainer}>
                    <Pressable
                        style={styles.toast}
                        onPress={() => {
                            setShowToast(false);
                            showUpdate(); // show the update dialog again
                        }}
                    >
                        <Text style={styles.toastEmoji}>📦</Text>
                        <Text style={styles.toastText}>
                            v{versionInfo.version} disponível
                        </Text>
                        <Text style={styles.toastAction}>Ver</Text>
                    </Pressable>
                </View>
            );
        }
        return null;
    }

    // Format release notes as bullet points
    const renderReleaseNotes = () => {
        if (!versionInfo?.releaseNotes) return null;
        const lines = versionInfo.releaseNotes
            .split('\n')
            .filter((l: string) => l.trim());
        return lines.map((line: string, i: number) => (
            <Text key={i} style={styles.noteItem}>
                • {line.replace(/^[-•*]\s*/, '').trim()}
            </Text>
        ));
    };

    return (
        <Modal visible={true} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <Text style={styles.emoji}>{isRequired ? '⚠️' : '🚀'}</Text>
                    <Text style={styles.title}>
                        {isRequired ? 'Atualização obrigatória' : 'Nova versão disponível!'}
                    </Text>
                    <Text style={styles.versionText}>
                        v{currentVersion} → v{versionInfo?.version}
                    </Text>
                    {versionInfo?.releaseNotes ? (
                        <View style={styles.notesContainer}>
                            {renderReleaseNotes()}
                        </View>
                    ) : null}

                    {downloading ? (
                        <View style={styles.downloadSection}>
                            <Text style={styles.downloadLabel}>
                                Baixando... {downloadProgress}%
                            </Text>
                            <ProgressBar progress={downloadProgress} />
                        </View>
                    ) : (
                        <Pressable
                            style={[styles.button, isRequired ? styles.buttonRequired : styles.buttonOptional]}
                            onPress={openDownload}
                        >
                            <Text style={styles.buttonText}>
                                {isRequired ? 'Baixar agora' : 'Baixar atualização'}
                            </Text>
                        </Pressable>
                    )}

                    {!isRequired && !downloading && (
                        <Pressable onPress={dismissUpdate} style={styles.skipButton}>
                            <Text style={styles.skipText}>Depois</Text>
                        </Pressable>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#1e1e3a',
        borderRadius: 20,
        padding: 28,
        alignItems: 'center',
        width: '100%',
        maxWidth: 360,
        borderWidth: 1,
        borderColor: '#6366f1',
    },
    emoji: {
        fontSize: 48,
        marginBottom: 8,
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    versionText: {
        color: '#a5b4fc',
        fontSize: 14,
        marginBottom: 12,
    },
    notesContainer: {
        width: '100%',
        marginBottom: 20,
        padding: 12,
        backgroundColor: 'rgba(99,102,241,0.1)',
        borderRadius: 10,
    },
    noteItem: {
        color: '#cbd5e1',
        fontSize: 13,
        lineHeight: 20,
    },
    button: {
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 8,
    },
    buttonRequired: {
        backgroundColor: '#ef4444',
    },
    buttonOptional: {
        backgroundColor: '#6366f1',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    downloadSection: {
        width: '100%',
        marginBottom: 8,
    },
    downloadLabel: {
        color: '#a5b4fc',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 8,
    },
    progressTrack: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(99,102,241,0.2)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#6366f1',
        borderRadius: 4,
    },
    skipButton: {
        paddingVertical: 8,
    },
    skipText: {
        color: '#64748b',
        fontSize: 14,
    },
    toastContainer: {
        position: 'absolute',
        top: 60,
        left: 16,
        right: 16,
        zIndex: 999,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e1e3a',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#6366f1',
        gap: 8,
    },
    toastEmoji: {
        fontSize: 18,
    },
    toastText: {
        color: '#e2e8f0',
        fontSize: 14,
        flex: 1,
    },
    toastAction: {
        color: '#6366f1',
        fontSize: 14,
        fontWeight: 'bold',
    },
});