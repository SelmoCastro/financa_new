export const getYearMonth = (date: Date | string) => {
    const d = new Date(date);
    return { year: d.getUTCFullYear(), month: d.getUTCMonth() };
};

export const getStartOfDay = (date: Date | string) => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
};

export const parseDate = (dateString: string) => {
    return new Date(dateString);
};
