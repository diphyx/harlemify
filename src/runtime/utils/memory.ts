export type MemoryTarget = "unit" | "units";
export type MemoryMutation = "set" | "edit" | "drop" | "add";
export interface EditOptions {
    deep?: boolean;
}

export interface AddOptions {
    prepend?: boolean;
}

export interface MemoryDefinition {
    readonly on: MemoryTarget;
    readonly path: string[];
    readonly mutation?: MemoryMutation;
    readonly prepend?: boolean;
    readonly deep?: boolean;
}

// Unit builder with mutation methods
export interface UnitMemoryBuilder<_S = unknown> extends MemoryDefinition {
    set(): MemoryDefinition;
    edit(options?: EditOptions): MemoryDefinition;
    drop(): MemoryDefinition;
}

// Units builder with mutation methods (includes add)
export interface UnitsMemoryBuilder<_S = unknown> extends MemoryDefinition {
    set(): MemoryDefinition;
    edit(options?: EditOptions): MemoryDefinition;
    drop(): MemoryDefinition;
    add(options?: AddOptions): MemoryDefinition;
}

// Unit function overloads for type-safe nested paths
export interface UnitFunction<S> {
    (): UnitMemoryBuilder<S>;
    <K extends keyof S & string>(key: K): UnitMemoryBuilder<S[K]>;
    <K extends keyof S & string, K2 extends keyof S[K] & string>(key: K, nested: K2): UnitMemoryBuilder<S[K][K2]>;
}

// Units function (no nested paths for arrays)
export interface UnitsFunction<S> {
    (): UnitsMemoryBuilder<S>;
}

export interface MemoryBuilder<S = unknown> {
    unit: UnitFunction<S>;
    units: UnitsFunction<S>;
}

function createUnitMemoryBuilder<S>(path: string[] = []): UnitMemoryBuilder<S> {
    const definition: MemoryDefinition = {
        on: "unit",
        path,
    };

    return {
        ...definition,
        set(): MemoryDefinition {
            return {
                on: "unit",
                path,
                mutation: "set",
            };
        },
        edit(options?: EditOptions): MemoryDefinition {
            return {
                on: "unit",
                path,
                mutation: "edit",
                deep: options?.deep,
            };
        },
        drop(): MemoryDefinition {
            return {
                on: "unit",
                path,
                mutation: "drop",
            };
        },
    };
}

function createUnitsMemoryBuilder<S>(): UnitsMemoryBuilder<S> {
    const definition: MemoryDefinition = {
        on: "units",
        path: [],
    };

    return {
        ...definition,
        set(): MemoryDefinition {
            return {
                on: "units",
                path: [],
                mutation: "set",
            };
        },
        edit(options?: EditOptions): MemoryDefinition {
            return {
                on: "units",
                path: [],
                mutation: "edit",
                deep: options?.deep,
            };
        },
        drop(): MemoryDefinition {
            return {
                on: "units",
                path: [],
                mutation: "drop",
            };
        },
        add(options?: AddOptions): MemoryDefinition {
            return {
                on: "units",
                path: [],
                mutation: "add",
                prepend: options?.prepend,
            };
        },
    };
}

function createUnitFunction<S>(): UnitFunction<S> {
    return function unit(...keys: string[]): UnitMemoryBuilder<any> {
        return createUnitMemoryBuilder(keys);
    } as UnitFunction<S>;
}

function createUnitsFunction<S>(): UnitsFunction<S> {
    return function units(): UnitsMemoryBuilder<S> {
        return createUnitsMemoryBuilder();
    } as UnitsFunction<S>;
}

export function createMemoryBuilder<S>(): MemoryBuilder<S> {
    return {
        unit: createUnitFunction<S>(),
        units: createUnitsFunction<S>(),
    };
}

// Default untyped Memory builder for simple usage
export const Memory: MemoryBuilder<any> = createMemoryBuilder();
