import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const bankData = [
    { keywords: ['nubank', 'nu bank'], color: '#8A05BE', text: '#FFFFFF', letter: 'nu', style: { fontSize: 18, fontWeight: '600', letterSpacing: -1 } },
    { keywords: ['caixa', 'cef'], color: '#0364B8', text: '#FFFFFF', letter: 'X', style: { fontSize: 16, fontWeight: '900', letterSpacing: -1 } },
    { keywords: ['banco do brasil', 'bb'], color: '#F8D117', text: '#0038A8', letter: 'bb', style: { fontSize: 18, fontWeight: '900', letterSpacing: -1 } },
    { keywords: ['itau', 'itaú'], color: '#EC7000', text: '#FFFFFF', letter: 'Itaú', style: { fontSize: 12, fontWeight: '900' } },
    { keywords: ['santander'], color: '#CC0000', text: '#FFFFFF', letter: 'S', style: { fontSize: 18, fontWeight: '700' } },
    { keywords: ['bradesco'], color: '#CC092F', text: '#FFFFFF', letter: 'BR', style: { fontSize: 12, fontWeight: '700' } },
    { keywords: ['inter', 'banco inter'], color: '#FF7A00', text: '#FFFFFF', letter: 'inter', style: { fontSize: 11, fontWeight: '900', letterSpacing: -0.5 } },
    { keywords: ['c6', 'c6 bank'], color: '#242424', text: '#FFFFFF', letter: 'C6', style: { fontSize: 13, fontWeight: '900' } },
    { keywords: ['picpay'], color: '#11C76F', text: '#FFFFFF', letter: 'P', style: { fontSize: 18, fontWeight: '900' } },
    { keywords: ['mercado pago'], color: '#009EE3', text: '#FFFFFF', letter: 'mp', style: { fontSize: 13, fontWeight: '900' } },
    { keywords: ['xp', 'xp investimentos'], color: '#000000', text: '#FAD128', letter: 'xp', style: { fontSize: 16, fontWeight: '900' } },
    { keywords: ['btg'], color: '#002B49', text: '#FFFFFF', letter: 'BTG', style: { fontSize: 12, fontWeight: '700' } },
];

interface BankIconProps {
    name: string;
    type?: string;
    size?: number;
}

export function BankIcon({ name, type, size = 48 }: BankIconProps) {
    const normalizedName = name.toLowerCase();
    const bank = bankData.find(b => b.keywords.some(k => normalizedName.includes(k)));

    if (bank) {
        return (
            <View style={[{ width: size, height: size, borderRadius: size * 0.25, backgroundColor: bank.color, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }]}>
                {bank.keywords.includes('caixa') ? (
                    <Text style={[{ color: bank.text }, bank.style as any]}>
                        C<Text style={{ color: '#F39200' }}>X</Text>
                    </Text>
                ) : (
                    <Text style={[{ color: bank.text }, bank.style as any]}>{bank.letter}</Text>
                )}
            </View>
        );
    }

    const defaultIcon = type === 'WALLET' ? 'payments' : type === 'SAVINGS' ? 'savings' : 'account-balance';

    return (
        <View style={[{ width: size, height: size, borderRadius: size * 0.25, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#f1f5f9' }]}>
            <MaterialIcons name={defaultIcon as any} size={size * 0.5} color="#94a3b8" />
        </View>
    );
}
