import { type ComputedRef, type WatchStopHandle, watch } from "vue";

import type { ViewCall } from "../core/types/view";
import { debounce, throttle } from "../core/utils/base";

// Options

export interface UseStoreViewTrackOptions {
    deep?: boolean;
    immediate?: boolean;
    debounce?: number;
    throttle?: number;
}

// Return

export type UseStoreView<T> = {
    data: ComputedRef<T>;
    track: (handler: (value: T) => void, options?: UseStoreViewTrackOptions) => WatchStopHandle;
};

// Composable

export function useStoreView<
    V extends Record<string, ViewCall>,
    K extends keyof V & string,
    T = V[K] extends ComputedRef<infer R> ? R : unknown,
>(store: { view: V }, key: K): UseStoreView<T> {
    if (!store.view[key]) {
        throw new Error(`View "${key}" not found in store`);
    }

    const source = store.view[key];
    const data = source;

    function resolveCallback<C extends (...args: unknown[]) => void>(
        callback: C,
        callbackOptions?: {
            debounce?: number;
            throttle?: number;
        },
    ): C {
        if (callbackOptions?.debounce) {
            return debounce(callback, callbackOptions.debounce);
        }

        if (callbackOptions?.throttle) {
            return throttle(callback, callbackOptions.throttle);
        }

        return callback;
    }

    function track(handler: (value: T) => void, trackOptions?: UseStoreViewTrackOptions): WatchStopHandle {
        const callback = resolveCallback(handler as (...args: unknown[]) => void, trackOptions);

        const stop = watch(
            source,
            (value) => {
                callback(value);
            },
            {
                deep: trackOptions?.deep,
                immediate: trackOptions?.immediate,
            },
        );

        return stop;
    }

    return {
        data,
        track,
    } as UseStoreView<T>;
}
