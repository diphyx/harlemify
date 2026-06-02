import type { Logger } from "../types/base";

// Levels

const LEVELS = {
    error: 0,
    warn: 1,
    info: 3,
    debug: 4,
} as const;

// Create Logger

export function createLogger(tag: string, level: number = -999): Logger {
    function report(method: keyof typeof LEVELS, sink: (...args: unknown[]) => void) {
        return (message: string, ...args: unknown[]): void => {
            if (LEVELS[method] > level) {
                return;
            }

            sink(`[${tag}]`, message, ...args);
        };
    }

    return {
        info: report("info", console.info),
        debug: report("debug", console.debug),
        warn: report("warn", console.warn),
        error: report("error", console.error),
    };
}
