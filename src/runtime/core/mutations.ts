import { defu } from "defu";

import type { Store } from "@harlem/core";

import { createCache } from "../utils/cache";

export enum MutationTarget {
    UNIT = "unit",
    UNITS = "units",
}

export enum MutationMode {
    SET = "set",
    PATCH = "patch",
    REMOVE = "remove",
    ADD = "add",
}

function withValueAtPath(parent: Record<string, any>, path: string[], value: any): any {
    if (!path.length) {
        return value;
    }

    const key = path[0];
    const rest = path.slice(1);
    const child = parent[key] ?? {};

    if (rest.length === 0) {
        return {
            ...parent,
            [key]: value,
        };
    }

    return {
        ...parent,
        [key]: withValueAtPath(child, rest, value),
    };
}

function withMergedValueAtPath(parent: Record<string, any>, path: string[], value: any, deep?: boolean): any {
    if (!path.length) {
        return parent;
    }

    const key = path[0];
    const rest = path.slice(1);
    const child = parent[key];

    if (child === undefined) {
        return parent;
    }

    if (rest.length === 0) {
        if (!deep) {
            return {
                ...parent,
                [key]: {
                    ...child,
                    ...value,
                },
            };
        }

        return {
            ...parent,
            [key]: defu(value, child),
        };
    }

    return {
        ...parent,
        [key]: withMergedValueAtPath(child, rest, value, deep),
    };
}

export type StoreMutations<T, I extends keyof T> = {
    unit: {
        set: (payload: { data: T | null; path?: string[] }) => void;
        patch: (payload: { data: Required<Pick<T, I>> & Partial<T>; path?: string[]; deep?: boolean }) => void;
        remove: (payload: { data: Required<Pick<T, I>> & Partial<T>; path?: string[] }) => void;
    };
    units: {
        set: (payload: { data: T[]; path?: string }) => void;
        patch: (payload: { data: (Required<Pick<T, I>> & Partial<T>)[]; path?: string; deep?: boolean }) => void;
        remove: (payload: { data: (Required<Pick<T, I>> & Partial<T>)[]; path?: string }) => void;
        add: (payload: { data: T[]; path?: string; prepend?: boolean }) => void;
    };
};

export function createStoreMutations<S extends Record<string, unknown>, I extends keyof S>(
    {
        mutation,
    }: Store<{
        unit: S | null;
        units: S[];
    }>,
    indicator: I,
): StoreMutations<S, I> {
    const indexCache = createCache<unknown, number>();

    const unitSet = mutation("unit:set", (state, payload: { data: S | null; path?: string[] }) => {
        if (payload.path?.length) {
            if (state.unit) {
                state.unit = withValueAtPath(state.unit, payload.path, payload.data);
            }

            return;
        }

        state.unit = payload.data;
    });

    const unitPatch = mutation(
        "unit:patch",
        (state, payload: { data: Required<Pick<S, I>> & Partial<S>; path?: string[]; deep?: boolean }) => {
            if (payload.path?.length) {
                if (state.unit) {
                    state.unit = withMergedValueAtPath(state.unit, payload.path, payload.data, payload.deep);
                }

                return;
            }

            if (state.unit?.[indicator] !== payload.data[indicator]) {
                return;
            }

            if (payload.deep) {
                state.unit = defu<any, any>(payload.data, state.unit);

                return;
            }

            state.unit = {
                ...state.unit,
                ...payload.data,
            };
        },
    );

    const unitRemove = mutation(
        "unit:remove",
        (state, payload: { data: Required<Pick<S, I>> & Partial<S>; path?: string[] }) => {
            if (payload.path?.length) {
                if (state.unit) {
                    state.unit = withValueAtPath(state.unit, payload.path, null);
                }

                return;
            }

            if (state.unit?.[indicator] === payload.data[indicator]) {
                state.unit = null;
            }
        },
    );

    const unitsSet = mutation("units:set", (state, payload: { data: S[]; path?: string }) => {
        if (payload.path) {
            for (const item of payload.data) {
                const index = indexCache.get(item[indicator]);
                if (index === undefined || !state.units[index]) {
                    continue;
                }

                state.units[index] = withValueAtPath(state.units[index], [payload.path], item);
            }

            return;
        }

        state.units = payload.data;

        indexCache.map.clear();
        for (let index = 0; index < payload.data.length; index++) {
            if (payload.data[index]) {
                indexCache.set(payload.data[index][indicator], index);
            }
        }
    });

    const unitsPatch = mutation(
        "units:patch",
        (state, payload: { data: (Required<Pick<S, I>> & Partial<S>)[]; path?: string; deep?: boolean }) => {
            const indexMap = new Map();
            for (let index = 0; index < state.units.length; index++) {
                indexMap.set(state.units[index][indicator], index);
            }

            for (const unit of payload.data) {
                let index = indexCache.get(unit[indicator]);

                const isCacheHit = index !== undefined;
                const isCacheInBounds = isCacheHit && index! < state.units.length;
                const isCacheMatch = isCacheInBounds && (state.units[index!]?.[indicator] as any) === unit[indicator];

                if (!isCacheMatch) {
                    index = indexMap.get(unit[indicator]);
                    if (index !== undefined) {
                        indexCache.set(unit[indicator], index);
                    }
                }

                if (index === undefined) {
                    continue;
                }

                if (payload.path) {
                    state.units[index] = withMergedValueAtPath(state.units[index], [payload.path], unit, payload.deep);

                    continue;
                }

                if (payload.deep) {
                    state.units[index] = defu<any, any>(unit, state.units[index]);

                    continue;
                }

                state.units[index] = {
                    ...state.units[index],
                    ...unit,
                };
            }
        },
    );

    const unitsRemove = mutation(
        "units:remove",
        (state, payload: { data: (Required<Pick<S, I>> & Partial<S>)[]; path?: string }) => {
            if (payload.path) {
                for (const unit of payload.data) {
                    const index = indexCache.get(unit[indicator]);
                    if (index === undefined || !state.units[index]) {
                        continue;
                    }

                    state.units[index] = withValueAtPath(state.units[index], [payload.path], null);
                }

                return;
            }

            const dropSet = new Set(
                payload.data.map((unit) => {
                    return unit[indicator];
                }),
            );

            for (const unit of payload.data) {
                indexCache.unset(unit[indicator]);
            }

            state.units = state.units.filter((unit) => {
                return !dropSet.has(unit[indicator] as any);
            });
        },
    );

    const unitsAdd = mutation("units:add", (state, payload: { data: S[]; path?: string; prepend?: boolean }) => {
        if (payload.path) {
            for (const item of payload.data) {
                const index = indexCache.get(item[indicator]);
                if (index === undefined || !state.units[index]) {
                    continue;
                }

                const current = (state.units[index] as any)[payload.path] || [];

                if (payload.prepend) {
                    (state.units[index] as any)[payload.path] = [item, ...current];

                    continue;
                }

                (state.units[index] as any)[payload.path] = [...current, item];
            }

            return;
        }

        if (payload.prepend) {
            indexCache.map.clear();

            for (let index = 0; index < payload.data.length; index++) {
                indexCache.set(payload.data[index][indicator], index);
            }

            for (let index = 0; index < state.units.length; index++) {
                indexCache.set(state.units[index][indicator], index + payload.data.length);
            }

            state.units = [...payload.data, ...state.units];

            return;
        }

        for (let index = 0; index < payload.data.length; index++) {
            indexCache.set(payload.data[index][indicator], state.units.length + index);
        }

        state.units = [...state.units, ...payload.data];
    });

    return {
        unit: {
            set: unitSet,
            patch: unitPatch,
            remove: unitRemove,
        },
        units: {
            set: unitsSet,
            patch: unitsPatch,
            remove: unitsRemove,
            add: unitsAdd,
        },
    };
}
