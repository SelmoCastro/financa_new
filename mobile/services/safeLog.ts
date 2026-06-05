/**
 * Safe logger — strips sensitive data (tokens, PII, request configs)
 * before logging to console. Use instead of console.error/warn in production.
 */

function sanitize(err: any): string {
    if (!err) return 'unknown error';
    if (typeof err === 'string') return err;

    // Axios error
    if (err.response) {
        const status = err.response?.status || '?';
        const url = err.response?.config?.url || '?';
        const method = err.response?.config?.method || '?';
        return `HTTP ${status} on ${method} ${url}`;
    }

    // Error object
    if (err.message) {
        // Redact tokens in message
        return err.message.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]');
    }

    return String(err).substring(0, 200);
}

export function safeLog(prefix: string, err: any): void {
    if (__DEV__) {
        console.warn(`${prefix}:`, sanitize(err));
    }
}
