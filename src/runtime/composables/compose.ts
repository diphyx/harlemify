import type { Ref } from "vue";

import type { ComposeCallback, ComposeDefinitions, StoreCompose } from "../core/types/compose";

// Return

export type UseStoreCompose<A extends any[] = any[]> = {
    execute: (...args: A) => Promise<void>;
    active: Readonly<Ref<boolean>>;
};

// Composable

export function useStoreCompose<
    CD extends ComposeDefinitions,
    K extends keyof StoreCompose<CD> & string,
    A extends any[] = CD[K] extends ComposeCallback<infer P> ? P : any[],
>(store: { compose: StoreCompose<CD> }, key: K): UseStoreCompose<A> {
    const compose = store.compose[key];
    if (!compose) {
        throw new Error(`Compose "${key}" not found in store`);
    }

    return {
        execute: (...args: A) => (compose as any)(...args),
        active: compose.active,
    };
}
