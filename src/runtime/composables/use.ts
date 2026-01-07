import type { ComputedRef } from "vue";

import { capitalize } from "../utils/transform";
import { EndpointMethod, EndpointStatus, makeEndpointStatusFlag } from "../utils/endpoint";
import { StoreMemoryAction } from "../core/store";

import type { Store } from "../core/store";
import type { Pluralize, Capitalize } from "../utils/transform";
import type { EndpointStatusFlag } from "../utils/endpoint";

type Indicator<T, I extends keyof T> = Required<Pick<T, I>>;
type PartialWithIndicator<T, I extends keyof T> = Indicator<T, I> & Partial<T>;

type MemoryState<E extends string, T> = {
    [P in E]: ComputedRef<T | null>;
} & {
    [P in Pluralize<E>]: ComputedRef<T[]>;
};

type MemoryAction<A extends string, E extends string, U> = {
    [K in `${A}${Capitalize<E>}`]: (unit: U) => void;
} & {
    [K in `${A}${Capitalize<Pluralize<E>>}`]: (units: U[]) => void;
};

type EndpointAction<E extends string, T> = {
    [M in EndpointMethod as `${M}${Capitalize<E>}`]: (unit?: Partial<T>) => Promise<T>;
} & {
    [M in EndpointMethod as `${M}${Capitalize<Pluralize<E>>}`]: (units?: Partial<T>[]) => Promise<T[]>;
};

type EndpointMonitor<E extends string> = {
    [M in EndpointMethod as `${M}${Capitalize<E>}${EndpointStatusFlag}`]: ComputedRef<boolean>;
} & {
    [M in EndpointMethod as `${M}${Capitalize<Pluralize<E>>}${EndpointStatusFlag}`]: ComputedRef<boolean>;
};

type StoreAlias<E extends string, T, I extends keyof T = keyof T> = MemoryState<E, T> &
    MemoryAction<"set", E, T | null> &
    MemoryAction<"edit", E, PartialWithIndicator<T, I>> &
    MemoryAction<"drop", E, PartialWithIndicator<T, I>> &
    EndpointAction<E, T> &
    EndpointMonitor<E>;

export function useStoreAlias<E extends string, T, I extends keyof T = keyof T>(
    store: Store<E, T, I>,
): StoreAlias<E, T, I> {
    const capitalizedUnit = capitalize(store.alias.unit);
    const capitalizedUnits = capitalize(store.alias.units);

    const output: any = {
        [store.alias.unit]: store.unit,
        [store.alias.units]: store.units,
    };

    for (const action of Object.values(StoreMemoryAction)) {
        output[`${action}${capitalizedUnit}`] = store.memory[`${action}Unit`];
        output[`${action}${capitalizedUnits}`] = store.memory[`${action}Units`];
    }

    for (const method of Object.values(EndpointMethod)) {
        output[`${method}${capitalizedUnit}`] = store.endpoint[`${method}Unit`];
        output[`${method}${capitalizedUnits}`] = store.endpoint[`${method}Units`];

        for (const status of Object.values(EndpointStatus)) {
            const statusFlag = makeEndpointStatusFlag(status);

            output[`${method}${capitalizedUnit}${statusFlag}`] = store.monitor[`${method}Unit${statusFlag}`];
            output[`${method}${capitalizedUnits}${statusFlag}`] = store.monitor[`${method}Units${statusFlag}`];
        }
    }

    return output;
}
