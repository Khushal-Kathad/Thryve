// Debug utility - only logs in development mode
const isDev = import.meta.env.DEV;

export const debug = {
    log: (...args: unknown[]) => {
        if (isDev) console.log(...args);
    },
    warn: (...args: unknown[]) => {
        if (isDev) console.warn(...args);
    },
    error: (...args: unknown[]) => {
        // Always log errors
        console.error(...args);
    },
    info: (...args: unknown[]) => {
        if (isDev) console.info(...args);
    },
};

export default debug;
