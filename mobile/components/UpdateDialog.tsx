import React, { useEffect, useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { useUpdateChecker, DownloadPhase } from '../hooks/useUpdateChecker';

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

function PhaseIcon({ phase }: { phase: DownloadPhase }) {
    switch (phase) {
        case 'downloading':
            return <Text style={styles.emoji}>📥</Text>;
        case 'ready':
            return <Text style={styles.emoji}>✅</Text>;
        case 'error':
            return <Text style={styles.emoji}>❌</Text>;
        default:
            return <Text style={styles.emoji}>🚀</Text>;
    }
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
        startDownload,
        installUpdate,
        resetDownload,
        downloadPhase,
        downloadProgress,
        errorMessage,
    } = useUpdateChecker();
    const [showToast, setShowToast] = useState(false);

    // Subtle toast when returning from background with update available
    useEffect(() => {
        if (hasUpdate && dismissed && !isRequired && downloadPhase === 'idle') {
            setShowToast(true);
            const timer = setTimeout(() => setShowToast(false), 5000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [hasUpdate, dismissed, isRequired, downloadPhase]);

    // Auto-start download when dialog appears for required updates
    useEffect(() => {
        if (hasUpdate && !dismissed && isRequired && downloadPhase === 'idle') {
            startDownload();
        }
    }, [hasUpdate, dismissed, isRequired, downloadPhase, startDownload]);

    // Don't show dialog if no update or explicitly dismissed (and not required).
    // Allow dismiss in ALL phases (idle, ready, error) — prevents infinite loop
    // when install fails. Dismissed state persists in AsyncStorage.
    if (!hasUpdate || (dismissed && !isRequired)) {
        // Show subtle toast for dismissed optional updates
        if (showToast && hasUpdate && !isRequired && versionInfo && downloadPhase === 'idle') {
            return (
                <View style={styles.toastContainer}>
                    <Pressable
                        style={styles.toast}
                        onPress={() => {
                            setShowToast(false);
                            showUpdate();
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

    const renderContent = () => {
        switch (downloadPhase) {
            case 'downloading':
                return (
                    <View style={styles.downloadSection}>
                        <Text style={styles.downloadLabel}>
                            Baixando atualização... {downloadProgress}%
                        </Text>
                        <ProgressBar progress={downloadProgress} />
                    </View>
                );

            case 'ready':
                return (
                    <View style={styles.readySection}>
                        <Text style={styles.readyText}>
                            ✅ Download concluído!
                        </Text>
                        <Pressable
                            style={[styles.button, styles.buttonInstall]}
                            onPress={installUpdate}
                        >
                            <Text style={styles.buttonText}>Baixar no navegador</Text>
                        </Pressable>
                        <Text style={styles.hintText}>
                            O APK será baixado pelo navegador. Abra o arquivo para instalar.
                        </Text>
                    </View>
                );

            case 'error':
                return (
                    <View style={styles.readySection}>
                        <Text style={styles.errorText}>
                            {errorMessage || 'Erro ao atualizar'}
                        </Text>
                        <Pressable
                            style={[styles.button, styles.buttonOptional]}
                            onPress={() => {
                                resetDownload();
                                setTimeout(() => startDownload(), 300);
                            }}
                        >
                            <Text style={styles.buttonText}>Tentar novamente</Text>
                        </Pressable>
                    </View>
                );

            default: // 'idle'
                return (
                    <>
                        {versionInfo?.releaseNotes ? (
                            <View style={styles.notesContainer}>
                                {renderReleaseNotes()}
                            </View>
                        ) : null}
                        <Pressable
                            style={[styles.button, isRequired ? styles.buttonRequired : styles.buttonOptional]}
                            onPress={startDownload}
                        >
                            <Text style={styles.buttonText}>
                                {isRequired ? 'Baixar agora' : 'Baixar atualização'}
                            </Text>
                        </Pressable>
                    </>
                );
        }
    };

    const getTitle = () => {
        switch (downloadPhase) {
            case 'downloading': return 'Baixando atualização...';
            case 'ready': return 'Pronto para atualizar!';
            case 'error': return 'Erro na atualização';
            default: return isRequired ? 'Atualização obrigatória' : 'Nova versão disponível!';
        }
    };

    return (
        <Modal visible={true} transparent animationType="fade" statusBarTranslucent>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <PhaseIcon phase={downloadPhase} />
                    <Text style={styles.title}>{getTitle()}</Text>
                    <Text style={styles.versionText}>
                        v{currentVersion} → v{versionInfo?.version}
                    </Text>
                    {renderContent()}
                    {/* Always show "Depois" button except during active download, even for required updates 
                        so user can escape the dialog. On dismiss, reset any cached download. */}
                    {downloadPhase !== 'downloading' && (
                        <Pressable 
                            onPress={() => {
                                resetDownload();
                                dismissUpdate();
                            }} 
                            style={styles.skipButton}
                        >
                            <Text style={styles.skipText}>
                                {isRequired ? 'Lembrar mais tarde' : 'Depois'}
                            </Text>
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
    buttonInstall: {
        backgroundColor: '#22c55e',
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
    readySection: {
        width: '100%',
        alignItems: 'center',
    },
    readyText: {
        color: '#4ade80',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 12,
    },
    hintText: {
        color: '#64748b',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
    errorText: {
        color: '#f87171',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 12,
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