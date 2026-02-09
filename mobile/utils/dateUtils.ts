export const getStartOfDay = (date: Date): Date => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const getYearMonth = (date: Date): { year: number; month: number } => {
    return {
        year: date.getFullYear(),
        month: date.getMonth(),
    };
};

export const isSameMonth = (d1: Date, d2: Date): boolean => {
    return (
        d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth()
    );
};

export const parseDate = (dateString: string | Date): Date => {
    if (dateString instanceof Date) return dateString;
    // Handle "YYYY-MM-DD" or ISO strings
    if (typeof dateString === 'string') {
        if (dateString.includes('T')) {
            return new Date(dateString);
        }
        // "YYYY-MM-DD" split to avoid timezone issues with new Date("YYYY-MM-DD")
        const [y, m, d] = dateString.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    return new Date(); // Fallback
};

export const formatDateToISORequest = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
