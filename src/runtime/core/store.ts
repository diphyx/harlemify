import harlem from "@harlem/core";

import { createStoreSchema } from "./schema";
import { createStoreGetters } from "./getters";
import { createStoreMutations } from "./mutations";
import { createStoreActions } from "./actions";
import { createStoreHandlers } from "./handler";

import type { EntityDefinition } from "./entity";
import type { SchemaShape, SchemaDefinition, StoreSchema } from "./schema";
import type { StoreGetters } from "./getters";
import type { StoreMutations } from "./mutations";
import type { StoreActions } from "./actions";
import type { HandlersDefinition, StoreHandlers } from "./handler";

interface StoreDefinition<S extends string, P extends string, T extends SchemaShape> {
    entity: EntityDefinition<S, P>;
    schema: SchemaDefinition<T>;
    handlers: HandlersDefinition<SchemaDefinition<T, "infer">>;
}

interface StoreOptions {
    indicator?: string;
}

export type Store<S extends string, P extends string, T, H extends HandlersDefinition<T>, I extends keyof T> = {
    source: any;
    entity: EntityDefinition<S, P>;
    schema: StoreSchema<T>;
    getters: StoreGetters<T>;
    mutations: StoreMutations<T, I>;
    actions: StoreActions<H>;
    handlers: StoreHandlers<H, T>;
};

export function createStore<
    S extends string,
    P extends string,
    T extends SchemaShape,
    H extends HandlersDefinition<SchemaDefinition<T, "infer">>,
    I extends keyof SchemaDefinition<T, "infer"> = "id" & keyof SchemaDefinition<T, "infer">,
>(parameters: StoreDefinition<S, P, T>, options?: StoreOptions): Store<S, P, SchemaDefinition<T, "infer">, H, I> {
    type Unit = SchemaDefinition<T, "infer">;

    const schema = createStoreSchema(parameters.schema, {
        indicator: options?.indicator as keyof Unit,
    });

    const source = harlem.createStore(parameters.entity.unit, {
        unit: null as Unit | null,
        units: [] as Unit[],
        handlers: [],
    });

    const getters = createStoreGetters(source);
    const mutations = createStoreMutations(source, schema.indicator as I);
    const actions = createStoreActions(source);

    const handlers = createStoreHandlers(parameters.handlers, {
        source,
        schema,
        entity: parameters.entity,
        getters,
        mutations,
        actions,
    });

    return {
        source,
        entity: parameters.entity,
        schema,
        getters,
        mutations,
        actions,
        handlers,
    };
}
