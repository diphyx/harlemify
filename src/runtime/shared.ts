import type { ApiFetchAdapterOptions } from "./utils/adapter";

export type SharedConfig = {
    api?: {
        headers?: Record<string, string>;
        query?: Record<string, unknown>;
        adapter?: ApiFetchAdapterOptions;
    };
};

export const sharedConfig: SharedConfig = {
    api: {},
};
