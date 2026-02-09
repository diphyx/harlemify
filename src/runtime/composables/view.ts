import { type ComputedRef, type WatchStopHandle, computed, watch } from "vue";

import type { ViewCall } from "../core/types/view";
import { debounce, throttle, toReactiveProxy } from "../core/utils/base";

// Options

export interface UseStoreViewTrackOptions {
    deep?: boolean;
    immediate?: boolean;
    debounce?: number;
    throttle?: number;
}

export interface UseStoreViewOptions<T> {
    proxy?: boolean;
    default?: T;
}

// Return

export type UseStoreViewData<T> = { value: T } & (T extends Record<string, unknown>
    ? { [K in keyof T]: T[K] }
    : Record<string, unknown>);

export type UseStoreViewProxy<T> = {
    data: UseStoreViewData<T>;
    track: (handler: (value: T) => void, options?: UseStoreViewTrackOptions) => WatchStopHandle;
};

export type UseStoreViewComputed<T> = {
    data: ComputedRef<T>;
    track: (handler: (value: T) => void, options?: UseStoreViewTrackOptions) => WatchStopHandle;
};

// Helpers

function resolveDefault<T>(view: ComputedRef<T>, defaultValue?: T): ComputedRef<T> {
    if (defaultValue === undefined) {
        return view;
    }

    return computed(() => {
        const value = view.value;
        if (value == null) {
            return defaultValue as T;
        }

        return value;
    });
}

function resolveData<T>(source: ComputedRef<T>, proxy?: boolean): UseStoreViewData<T> | ComputedRef<T> {
    if (proxy !== false) {
        return toReactiveProxy(source) as UseStoreViewData<T>;
    }

    return source;
}

// Composable

export function useStoreView<
    V extends Record<string, ViewCall>,
    K extends keyof V & string,
    T = V[K] extends ComputedRef<infer R> ? R : unknown,
>(store: { view: V }, key: K, options: UseStoreViewOptions<T> & { proxy: false }): UseStoreViewComputed<T>;

export function useStoreView<
    V extends Record<string, ViewCall>,
    K extends keyof V & string,
    T = V[K] extends ComputedRef<infer R> ? R : unknown,
>(store: { view: V }, key: K, options?: UseStoreViewOptions<T>): UseStoreViewProxy<T>;

export function useStoreView<
    V extends Record<string, ViewCall>,
    K extends keyof V & string,
    T = V[K] extends ComputedRef<infer R> ? R : unknown,
>(store: { view: V }, key: K, options?: UseStoreViewOptions<T>): UseStoreViewProxy<T> | UseStoreViewComputed<T> {
    if (!store.view[key]) {
        throw new Error(`View "${key}" not found in store`);
    }

    const source = resolveDefault(store.view[key], options?.default);
    const data = resolveData(source, options?.proxy);

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
    } as UseStoreViewProxy<T> | UseStoreViewComputed<T>;
}
