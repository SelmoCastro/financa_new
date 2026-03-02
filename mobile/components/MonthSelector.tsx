import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, SafeAreaView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMonth } from '../context/MonthContext';
import * as Haptics from 'expo-haptics';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export const MonthSelector = () => {
    const { selectedDate, setDate } = useMonth();
    const [modalVisible, setModalVisible] = useState(false);
    const [tempYear, setTempYear] = useState(selectedDate.getFullYear());

    const handleOpen = () => {
        setTempYear(selectedDate.getFullYear());
        setModalVisible(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSelectMonth = (monthIndex: number) => {
        const newDate = new Date(tempYear, monthIndex, 1);
        setDate(newDate);
        setModalVisible(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    // Pega o nome do mês e ano para mostrar ao lado do ícone, só pra não ficar totalmente perdido sem contexto.
    // Mas o botão todo é enxuto em forma de ícone ou pílula.
    const monthName = selectedDate.toLocaleDateString('pt-BR', { month: 'short' });
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    return (
        <>
            <Pressable
                onPress={handleOpen}
                android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true }}
                style={styles.iconButton}
            >
                <MaterialIcons name="calendar-month" size={24} color="#4f46e5" />
            </Pressable>

            <Modal
                visible={modalVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={() => setTempYear(y => y - 1)} style={styles.yearBtn}>
                                <MaterialIcons name="chevron-left" size={28} color="#64748b" />
                            </TouchableOpacity>
                            <Text style={styles.yearText}>{tempYear}</Text>
                            <TouchableOpacity onPress={() => setTempYear(y => y + 1)} style={styles.yearBtn}>
                                <MaterialIcons name="chevron-right" size={28} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.monthsGrid}>
                            {MONTHS.map((m, index) => {
                                const isSelected = selectedDate.getMonth() === index && selectedDate.getFullYear() === tempYear;
                                return (
                                    <TouchableOpacity
                                        key={m}
                                        onPress={() => handleSelectMonth(index)}
                                        style={[
                                            styles.monthCell,
                                            isSelected && styles.monthCellSelected
                                        ]}
                                    >
                                        <Text style={[
                                            styles.monthCellText,
                                            isSelected && styles.monthCellTextSelected
                                        ]}>
                                            {m}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                            <Text style={styles.closeBtnText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    iconButton: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e0e7ff',
        borderRadius: 999,
        padding: 10,
        alignSelf: 'flex-start',
    },
    iconButtonText: {
        color: '#4338ca',
        fontWeight: 'bold',
        fontSize: 14,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    yearBtn: {
        padding: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 12,
    },
    yearText: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1e293b',
    },
    monthsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    monthCell: {
        width: '30%',
        aspectRatio: 2,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: '#f8fafc',
    },
    monthCellSelected: {
        backgroundColor: '#4f46e5',
    },
    monthCellText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#64748b',
    },
    monthCellTextSelected: {
        color: 'white',
    },
    closeBtn: {
        marginTop: 24,
        padding: 14,
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 16,
    },
    closeBtnText: {
        fontWeight: '700',
        color: '#475569',
        fontSize: 15,
    }
});
