import { format, parseISO } from 'date-fns';

export const getYearMonth = (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return { year: d.getFullYear(), month: d.getMonth() };
};

export const getStartOfDay = (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

export const parseDate = (dateString: string) => {
    return parseISO(dateString);
};

// Return a safe 'YYYY-MM-DD' string for inputs, using local time (avoids UTC timezone shift bug)
export const toYYYYMMDD = (date: Date | string) => {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'yyyy-MM-dd');
};

// Returns a true midnight Date object in Local Time Zone from any 'YYYY-MM-DD' or ISO string
export const toMidnightDate = (dateString: string | Date) => {
    if (typeof dateString === 'string') {
        const parts = dateString.split('T')[0].split('-');
        if (parts.length === 3) {
            return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        }
    }
    const d = new Date(dateString);
    d.setHours(0, 0, 0, 0);
    return d;
};
