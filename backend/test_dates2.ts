const y = 2026;
const m = 2; // March

const startOfMonth = new Date(Date.UTC(y, m, 1));
const endOfMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));

console.log("Start:", startOfMonth.toISOString());
console.log("End:", endOfMonth.toISOString());
