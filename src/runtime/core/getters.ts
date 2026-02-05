import type { ComputedRef, DeepReadonly } from "vue";
import type { Store } from "@harlem/core";

export enum GetterTarget {
    UNIT = "unit",
    UNITS = "units",
}

export type StoreGetters<S> = {
    unit: ComputedRef<DeepReadonly<S> | null>;
    units: ComputedRef<DeepReadonly<S[]>>;
};

export function createStoreGetters<S>({
    getter,
}: Store<{
    unit: S | null;
    units: S[];
}>): StoreGetters<S> {
    const unit = getter("unit", (state) => {
        return state.unit;
    });

    const units = getter("units", (state) => {
        return state.units;
    });

    return {
        unit,
        units,
    };
}
