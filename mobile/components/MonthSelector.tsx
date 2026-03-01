import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMonth } from '../context/MonthContext';
import * as Haptics from 'expo-haptics';

export const MonthSelector = () => {
    const { selectedDate, changeMonth } = useMonth();

    const formattedDate = selectedDate.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
    });

    // Capitalize first letter
    const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    return (
        <View style={styles.container}>
            <View style={styles.buttonWrapper}>
                <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); changeMonth(-1); }}
                    android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true, radius: 24 }}
                    style={styles.navButton}
                >
                    <MaterialIcons name="chevron-left" size={24} color="#64748b" />
                </Pressable>
            </View>

            <Text style={styles.dateText}>
                {displayDate}
            </Text>

            <View style={styles.buttonWrapper}>
                <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); changeMonth(1); }}
                    android_ripple={{ color: 'rgba(0,0,0,0.1)', borderless: true, radius: 24 }}
                    style={styles.navButton}
                >
                    <MaterialIcons name="chevron-right" size={24} color="#64748b" />
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignSelf: 'flex-start',
        marginTop: 4,
    },
    buttonWrapper: {
        borderRadius: 999,
        overflow: 'hidden',
    },
    navButton: {
        padding: 4,
    },
    dateText: {
        marginHorizontal: 12,
        fontWeight: 'bold',
        color: '#334155',
        textAlign: 'center',
    },
});
