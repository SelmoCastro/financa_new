import { format, parseISO } from 'date-fns';

export const getYearMonth = (date: Date | string) => {
    if (typeof date === 'string') {
        const parts = date.split('T')[0].split('-');
        return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) - 1 };
    }
    return { year: date.getFullYear(), month: date.getMonth() };
};

export const getStartOfDay = (date: Date | string) => {
    if (typeof date === 'string') {
        const parts = date.split('T')[0].split('-');
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getTime();
    }
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
};

export const parseDate = (dateString: string) => {
    return parseISO(dateString);
};

// Return a safe 'YYYY-MM-DD' string for inputs, using local time (avoids UTC timezone shift bug)
export const toYYYYMMDD = (date: Date | string) => {
    if (typeof date === 'string') {
        return date.split('T')[0];
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
