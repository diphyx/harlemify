import { defu } from "defu";
import type { ShapeDefinition, Shape } from "../types/shape";
import type { Store as SourceStore, BaseState, Mutation } from "@harlem/core";

import { resolveShape } from "./shape";
import {
    type Model,
    type ModelOneDefinition,
    type ModelManyDefinition,
    type ModelStateOf,
    type MutationsOneOptions,
    type MutationsManyOptions,
    type MutationsOne,
    type MutationsMany,
    type Mutations,
    ModelKind,
} from "../types/model";
import { type ActionCommitter, ActionOneMode, ActionManyMode } from "../types/action";

export function initializeState<M extends Model>(model: M): ModelStateOf<M> {
    const state = {} as Record<string, any>;
    for (const [key, definition] of Object.entries(model)) {
        if (definition.kind === ModelKind.OBJECT) {
            state[key] = definition.options?.default ?? null;
        } else {
            state[key] = definition.options?.default ?? [];
        }
    }

    return state as ModelStateOf<M>;
}

function getIdentifier(definition: ModelOneDefinition<Shape> | ModelManyDefinition<Shape>): string {
    if (definition.options?.identifier) {
        return definition.options.identifier;
    }

    const { identifier } = resolveShape(definition.shape as ShapeDefinition);
    if (identifier) {
        return identifier;
    }

    return "id";
}

function createOneMutations<S extends Shape>(
    source: SourceStore<BaseState>,
    key: string,
    definition: ModelOneDefinition<S>,
): MutationsOne<S> {
    const setOperation: Mutation<S> = source.mutation(`${key}:set`, (state: any, value: S) => {
        state[key] = value;
    });

    const resetOperation: Mutation<undefined> = source.mutation(`${key}:reset`, (state: any) => {
        state[key] = definition.options?.default ?? null;
    });

    const patchOperation: Mutation<{
        value: Partial<S>;
        options?: MutationsOneOptions;
    }> = source.mutation(
        `${key}:patch`,
        (state: any, payload: { value: Partial<S>; options?: MutationsOneOptions }) => {
            if (state[key] === null) {
                return;
            }

            if (payload.options?.deep) {
                state[key] = defu(payload.value, state[key]) as S;

                return;
            }

            state[key] = {
                ...state[key],
                ...payload.value,
            };
        },
    );

    function set(value: S) {
        setOperation(value);
    }

    function reset() {
        resetOperation();
    }

    function patch(value: Partial<S>, options?: MutationsOneOptions) {
        patchOperation({ value, options });
    }

    return {
        set,
        reset,
        patch,
    };
}

function createManyMutations<S extends Shape>(
    source: SourceStore<BaseState>,
    key: string,
    definition: ModelManyDefinition<S>,
): MutationsMany<S> {
    const identifier = getIdentifier(definition as any);

    const setOperation: Mutation<S[]> = source.mutation(`${key}:set`, (state, value: S[]) => {
        state[key] = value;
    });

    const resetOperation: Mutation<undefined> = source.mutation(`${key}:reset`, (state) => {
        state[key] = definition.options?.default ?? [];
    });

    const patchOperation: Mutation<{
        value: Partial<S> | Partial<S>[];
        options?: MutationsManyOptions;
    }> = source.mutation(
        `${key}:patch`,
        (state, payload: { value: Partial<S> | Partial<S>[]; options?: MutationsManyOptions }) => {
            const items = Array.isArray(payload.value) ? payload.value : [payload.value];
            const by = payload.options?.by ?? identifier;

            state[key] = state[key].map((item: S) => {
                const found = items.find((p) => {
                    return p[by] === item[by];
                });

                if (!found) {
                    return item;
                }

                if (payload.options?.deep) {
                    return defu(found, item) as S;
                }

                return {
                    ...item,
                    ...found,
                };
            });
        },
    );

    const removeOperation: Mutation<{
        value: S | S[];
        options?: MutationsManyOptions;
    }> = source.mutation(`${key}:remove`, (state, payload: { value: S | S[]; options?: MutationsManyOptions }) => {
        const items = Array.isArray(payload.value) ? payload.value : [payload.value];
        const by = payload.options?.by ?? identifier;

        const ids = new Set(
            items.map((item) => {
                return item[by];
            }),
        );

        state[key] = state[key].filter((item: S) => {
            return !ids.has(item[by]);
        });
    });

    const addOperation: Mutation<{
        value: S | S[];
        options?: MutationsManyOptions;
    }> = source.mutation(`${key}:add`, (state, payload: { value: S | S[]; options?: MutationsManyOptions }) => {
        let items = Array.isArray(payload.value) ? payload.value : [payload.value];

        if (payload.options?.unique) {
            const by = payload.options.by ?? identifier;

            const existingIds = new Set(
                state[key].map((item: S) => {
                    return item[by];
                }),
            );

            items = items.filter((item) => {
                return !existingIds.has(item[by]);
            });
        }

        if (payload.options?.prepend) {
            state[key] = [...items, ...state[key]];

            return;
        }

        state[key] = [...state[key], ...items];
    });

    function set(value: S[]) {
        setOperation(value);
    }

    function reset() {
        resetOperation();
    }

    function patch(value: Partial<S> | Partial<S>[], options?: MutationsManyOptions) {
        patchOperation({ value, options });
    }

    function remove(value: S | S[], options?: MutationsManyOptions) {
        removeOperation({ value, options });
    }

    function add(value: S | S[], options?: MutationsManyOptions) {
        addOperation({ value, options });
    }

    return {
        set,
        reset,
        patch,
        remove,
        add,
    };
}

export function createMutations<M extends Model>(source: SourceStore<BaseState>, model: M): Mutations<M> {
    const mutations = {} as Record<string, any>;
    for (const [key, definition] of Object.entries(model)) {
        if (definition.kind === ModelKind.OBJECT) {
            mutations[key] = createOneMutations(source, key, definition as any);
        } else {
            mutations[key] = createManyMutations(source, key, definition as any);
        }
    }

    return mutations as Mutations<M>;
}

export function executeCommit<M extends Model>(
    definition: {
        model: keyof M;
        mode: ActionOneMode | ActionManyMode;
        value?: unknown;
        options?: MutationsOneOptions | MutationsManyOptions;
    },
    mutations: Mutations<M>,
    result?: unknown,
): void {
    const handler = (mutations[definition.model] as any)[definition.mode];

    switch (definition.mode) {
        case ActionOneMode.RESET:
        case ActionManyMode.RESET: {
            handler();

            break;
        }
        default: {
            handler(definition.value ?? result, definition.options);
        }
    }
}

export function createCommitter<M extends Model>(mutations: Mutations<M>): ActionCommitter<M> {
    function committer(model: keyof M, mode: any, value?: any, options?: any) {
        executeCommit({ model, mode, value, options }, mutations);
    }

    return committer as ActionCommitter<M>;
}
