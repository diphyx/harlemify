import { defu } from "defu";
import type { Store as SourceStore, BaseState, Mutation } from "@harlem/core";

import { resolveShape } from "./shape";

import type { ShapeDefinition, Shape } from "../types/shape";
import {
    type ModelDefinition,
    type ModelOneDefinition,
    type ModelManyDefinition,
    type ModelOneCommitOptions,
    type ModelManyCommitOptions,
    type ModelOneCommit,
    type ModelManyCommit,
    type ModelCall,
    ModelKind,
    ModelOneMode,
    ModelManyMode,
} from "../types/model";

function resolveIdentifier<S extends Shape>(definition: ModelOneDefinition<S> | ModelManyDefinition<S>): string {
    if (definition.options?.identifier) {
        return definition.options.identifier as string;
    }

    const { identifier } = resolveShape(definition.shape as ShapeDefinition);
    if (identifier) {
        return identifier;
    }

    return "id";
}

function createOneCommit<S extends Shape>(
    definition: ModelOneDefinition<S>,
    source: SourceStore<BaseState>,
): ModelOneCommit<S> {
    const setOperation: Mutation<S> = source.mutation(`${definition.key}:set`, (state, value: S) => {
        state[definition.key] = value;
    });

    const resetOperation: Mutation<undefined> = source.mutation(`${definition.key}:reset`, (state) => {
        state[definition.key] = definition.options?.default ?? null;
    });

    const patchOperation: Mutation<{
        value: Partial<S>;
        options?: ModelOneCommitOptions;
    }> = source.mutation(
        `${definition.key}:patch`,
        (state, payload: { value: Partial<S>; options?: ModelOneCommitOptions }) => {
            if (state[definition.key] === null) {
                return;
            }

            if (payload.options?.deep) {
                state[definition.key] = defu(payload.value, state[definition.key]) as S;

                return;
            }

            state[definition.key] = {
                ...state[definition.key],
                ...payload.value,
            };
        },
    );

    function set(value: S) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "set",
        });

        setOperation(value);
    }

    function reset() {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "reset",
        });

        resetOperation();
    }

    function patch(value: Partial<S>, options?: ModelOneCommitOptions) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "patch",
        });

        patchOperation({
            value,
            options,
        });
    }

    return {
        set,
        reset,
        patch,
    };
}

function createManyCommit<S extends Shape>(
    definition: ModelManyDefinition<S>,
    source: SourceStore<BaseState>,
): ModelManyCommit<S> {
    const identifier = resolveIdentifier(definition);

    const setOperation: Mutation<S[]> = source.mutation(`${definition.key}:set`, (state, value: S[]) => {
        state[definition.key] = value;
    });

    const resetOperation: Mutation<undefined> = source.mutation(`${definition.key}:reset`, (state) => {
        state[definition.key] = definition.options?.default ?? [];
    });

    const patchOperation: Mutation<{
        value: Partial<S> | Partial<S>[];
        options?: ModelManyCommitOptions;
    }> = source.mutation(
        `${definition.key}:patch`,
        (state, payload: { value: Partial<S> | Partial<S>[]; options?: ModelManyCommitOptions }) => {
            const items = Array.isArray(payload.value) ? payload.value : [payload.value];
            const by = payload.options?.by ?? identifier;

            state[definition.key] = state[definition.key].map((item: S) => {
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
        options?: ModelManyCommitOptions;
    }> = source.mutation(
        `${definition.key}:remove`,
        (state, payload: { value: S | S[]; options?: ModelManyCommitOptions }) => {
            const items = Array.isArray(payload.value) ? payload.value : [payload.value];
            const by = payload.options?.by ?? identifier;

            const ids = new Set(
                items.map((item) => {
                    return item[by];
                }),
            );

            state[definition.key] = state[definition.key].filter((item: S) => {
                return !ids.has(item[by]);
            });
        },
    );

    const addOperation: Mutation<{
        value: S | S[];
        options?: ModelManyCommitOptions;
    }> = source.mutation(
        `${definition.key}:add`,
        (state, payload: { value: S | S[]; options?: ModelManyCommitOptions }) => {
            let items = Array.isArray(payload.value) ? payload.value : [payload.value];

            if (payload.options?.unique) {
                const by = payload.options.by ?? identifier;

                const existingIds = new Set(
                    state[definition.key].map((item: S) => {
                        return item[by];
                    }),
                );

                items = items.filter((item) => {
                    return !existingIds.has(item[by]);
                });
            }

            if (payload.options?.prepend) {
                state[definition.key] = [...items, ...state[definition.key]];

                return;
            }

            state[definition.key] = [...state[definition.key], ...items];
        },
    );

    function set(value: S[]) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "set",
        });

        setOperation(value);
    }

    function reset() {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "reset",
        });

        resetOperation();
    }

    function patch(value: Partial<S> | Partial<S>[], options?: ModelManyCommitOptions) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "patch",
        });

        patchOperation({
            value,
            options,
        });
    }

    function remove(value: S | S[], options?: ModelManyCommitOptions) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "remove",
        });

        removeOperation({
            value,
            options,
        });
    }

    function add(value: S | S[], options?: ModelManyCommitOptions) {
        definition.logger?.debug("Model mutation", {
            model: definition.key,
            mutation: "add",
        });

        addOperation({
            value,
            options,
        });
    }

    return {
        set,
        reset,
        patch,
        remove,
        add,
    };
}

function isOneDefinition<S extends Shape>(definition: ModelDefinition<S>): definition is ModelOneDefinition<S> {
    return definition.kind === ModelKind.OBJECT;
}

function resolveCommit<S extends Shape>(
    definition: ModelDefinition<S>,
    source: SourceStore<BaseState>,
): ModelOneCommit<S> | ModelManyCommit<S> {
    if (isOneDefinition(definition)) {
        return createOneCommit(definition, source);
    }

    return createManyCommit(definition, source);
}

export function createModel<S extends Shape>(
    definition: ModelDefinition<S>,
    source: SourceStore<BaseState>,
): ModelCall<S> {
    definition.logger?.debug("Registering model", {
        model: definition.key,
        kind: definition.kind,
    });

    const commit = resolveCommit(definition, source);

    const model: ModelCall<S> = Object.assign(commit, {
        commit(mode: ModelOneMode | ModelManyMode, value?: unknown, options?: unknown) {
            const handler = commit[mode as keyof typeof commit] as (...args: unknown[]) => void;
            switch (mode) {
                case ModelOneMode.RESET:
                case ModelManyMode.RESET: {
                    handler();

                    break;
                }
                default: {
                    handler(value, options);
                }
            }
        },
    });

    return model;
}
