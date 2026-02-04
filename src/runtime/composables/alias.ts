import type { ComputedRef } from "vue";

import { capitalize } from "../utils/text";

import type { ActionFunction, ActionStatus, ActionsConfig, Store, StoreMemory } from "../core/store";
import type { Capitalize, Pluralize } from "../utils/text";

type MemoryState<E extends string, T> = {
    [P in E]: ComputedRef<T | null>;
} & {
    [P in Pluralize<E>]: ComputedRef<T[]>;
};

type AliasActions<E extends string, A extends ActionsConfig<S>, S> = {
    [K in keyof A as `${K & string}${Capitalize<E>}`]: ActionFunction<S>;
};

type AliasMemory<E extends string, S, I extends keyof S> = {
    [K in `${E}Memory`]: StoreMemory<S, I>;
};

type AliasMonitor<E extends string, A extends ActionsConfig<any>> = {
    [K in `${E}Monitor`]: {
        [ActionName in keyof A]: ActionStatus;
    };
};

export type StoreAlias<E extends string, S, I extends keyof S, A extends ActionsConfig<S>> = MemoryState<E, S> &
    AliasActions<E, A, S> &
    AliasMemory<E, S, I> &
    AliasMonitor<E, A>;

export function useStoreAlias<E extends string, S, I extends keyof S, A extends ActionsConfig<S>>(
    store: Store<E, S, I, A>,
): StoreAlias<E, S, I, A> {
    const capitalizedEntity = capitalize(store.alias.unit);

    const output: any = {
        [store.alias.unit]: store.unit,
        [store.alias.units]: store.units,
        [`${store.alias.unit}Memory`]: store.memory,
        [`${store.alias.unit}Monitor`]: store.monitor,
    };

    for (const actionName in store.action) {
        output[`${actionName}${capitalizedEntity}`] = store.action[actionName];
    }

    return output;
}
