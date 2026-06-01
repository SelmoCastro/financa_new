import { View, Text, Dimensions } from 'react-native';
import { useCurrency } from '../context/CurrencyContext';

interface BarData {
    month: string;
    income: number;
    expenses: number;
}

interface MonthlyBarChartProps {
    data: BarData[];
    isPrivacyEnabled: boolean;
}

export const MonthlyBarChart: React.FC<MonthlyBarChartProps> = ({ data, isPrivacyEnabled }) => {
    const { formatCurrency } = useCurrency();
    const maxVal = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1000);
    const chartHeight = 150;

    return (
        <View className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm">
            <View className="mb-6">
                <Text className="text-sm font-bold text-slate-800 dark:text-white">Performance Mensal</Text>
                <Text className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Receitas vs Despesas</Text>
            </View>

            <View style={{ height: chartHeight, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                {data.map((item, index) => {
                    const rawIncomeHeight = (item.income / maxVal) * chartHeight;
                    const rawExpenseHeight = (item.expenses / maxVal) * chartHeight;
                    // Minimum visible height of 4px when value > 0
                    const incomeHeight = item.income > 0 ? Math.max(rawIncomeHeight, 4) : 0;
                    const expenseHeight = item.expenses > 0 ? Math.max(rawExpenseHeight, 4) : 0;

                    return (
                        <View key={index} className="items-center" style={{ flex: 1 }}>
                            <View className="flex-row items-end gap-1">
                                {/* Income Bar */}
                                {incomeHeight > 0 && (
                                    <View
                                        style={{
                                            height: incomeHeight,
                                            width: 8,
                                            backgroundColor: '#10b981',
                                            borderRadius: 4
                                        }}
                                    />
                                )}
                                {/* Expense Bar */}
                                {expenseHeight > 0 && (
                                    <View
                                        style={{
                                            height: expenseHeight,
                                            width: 8,
                                            backgroundColor: '#f43f5e',
                                            borderRadius: 4
                                        }}
                                    />
                                )}
                            </View>
                            <Text className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-2 uppercase">
                                {item.month}
                            </Text>
                        </View>
                    );
                })}
            </View>

            <View className="flex-row justify-center gap-4 mt-6">
                <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-emerald-500" />
                    <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Receitas</Text>
                </View>
                <View className="flex-row items-center gap-2">
                    <View className="w-2 h-2 rounded-full bg-rose-500" />
                    <Text className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Despesas</Text>
                </View>
            </View>
        </View>
    );
};
