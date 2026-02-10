import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMonth } from '../context/MonthContext';
import { triggerHaptic } from '../utils/haptics';

export const MonthSelector = () => {
    const { selectedDate, changeMonth } = useMonth();

    const formattedDate = selectedDate.toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric'
    });

    // Capitalize first letter
    const displayDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    return (
        <View className="flex-row items-center justify-center bg-slate-100 rounded-full px-4 py-2 self-start mt-1">
            <TouchableOpacity onPress={() => changeMonth(-1)} className="p-1">
                <MaterialIcons name="chevron-left" size={24} color="#64748b" />
            </TouchableOpacity>

            <Text className="mx-4 font-bold text-slate-700 min-w-[120px] text-center">
                {displayDate}
            </Text>

            <TouchableOpacity onPress={() => changeMonth(1)} className="p-1">
                <MaterialIcons name="chevron-right" size={24} color="#64748b" />
            </TouchableOpacity>
        </View>
    );
};
