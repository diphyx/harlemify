import type { ActionConcurrent } from "./core/types/action";

export type RuntimeConfig = {
    model?: {
        identifier?: string;
    };
    action?: {
        endpoint?: string;
        headers?: Record<string, string>;
        query?: Record<string, unknown>;
        timeout?: number;
        concurrent?: ActionConcurrent;
    };
};

export const runtimeConfig: RuntimeConfig = {};
