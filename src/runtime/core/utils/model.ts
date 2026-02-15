import { defu } from "defu";
import type { Store as SourceStore, BaseState, Mutation } from "@harlem/core";

import { ensureArray } from "./base";
import { resolveShapeAliases } from "./shape";

import type { Shape } from "../types/shape";
import {
    type ModelDefinition,
    type ModelOneDefinition,
    type ModelManyDefinition,
    type ModelOneCommitOptions,
    type ModelManyCommitOptions,
    type ModelOneCommit,
    type ModelManyListCommit,
    type ModelManyRecordCommit,
    type ModelCall,
    ModelType,
    ModelManyKind,
    ModelOneMode,
    ModelManyMode,
    ModelSilent,
} from "../types/model";

// Hooks Helper

function callHook<S extends Shape>(
    definition: ModelDefinition<S>,
    hook: ModelSilent,
    silent?: true | ModelSilent,
): void {
    if (silent === true || silent === hook) {
        return;
    }

    try {
        definition.options?.[hook]?.();
    } catch (error) {
        definition.logger?.error(`Model ${hook} hook error`, {
            model: definition.key,
            error,
        });
    }
}

function wrapOperation<S extends Shape>(
    definition: ModelDefinition<S>,
    mutation: string,
    operation: () => void,
    silent?: true | ModelSilent,
): void {
    definition.logger?.debug("Model mutation", {
        model: definition.key,
        mutation,
    });

    callHook(definition, ModelSilent.PRE, silent);
    operation();
    callHook(definition, ModelSilent.POST, silent);
}

// Create One Commit

function createOneCommit<S extends Shape>(
    definition: ModelOneDefinition<S>,
    source: SourceStore<BaseState>,
): ModelOneCommit<S> {
    const setOperation: Mutation<{
        payload: S;
    }> = source.mutation(`${definition.key}:set`, (state, { payload }) => {
        state[definition.key] = payload;
    });

    const resetOperation: Mutation<void> = source.mutation(`${definition.key}:reset`, (state) => {
        state[definition.key] = definition.default();
    });

    const patchOperation: Mutation<{
        payload: Partial<S>;
        options?: ModelOneCommitOptions;
    }> = source.mutation(`${definition.key}:patch`, (state, { payload, options }) => {
        if (options?.deep) {
            state[definition.key] = defu(payload, state[definition.key]) as S;

            return;
        }

        state[definition.key] = {
            ...state[definition.key],
            ...payload,
        };
    });

    return {
        set(payload: S, options?: ModelOneCommitOptions) {
            wrapOperation(definition, "set", () => setOperation({ payload }), options?.silent);
        },
        reset(options?: Pick<ModelOneCommitOptions, "silent">) {
            wrapOperation(definition, "reset", () => resetOperation(), options?.silent);
        },
        patch(payload: Partial<S>, options?: ModelOneCommitOptions) {
            wrapOperation(definition, "patch", () => patchOperation({ payload, options }), options?.silent);
        },
    };
}

// Create Many List Commit

function createManyListCommit<S extends Shape>(
    definition: ModelManyDefinition<S, any>,
    source: SourceStore<BaseState>,
): ModelManyListCommit<S, any> {
    const setOperation: Mutation<{
        payload: S[];
    }> = source.mutation(`${definition.key}:set`, (state, { payload }) => {
        state[definition.key] = payload;
    });

    const resetOperation: Mutation<void> = source.mutation(`${definition.key}:reset`, (state) => {
        state[definition.key] = definition.default();
    });

    const patchOperation: Mutation<{
        payload: Partial<S> | Partial<S>[];
        options?: ModelManyCommitOptions;
    }> = source.mutation(`${definition.key}:patch`, (state, { payload, options }) => {
        const items = ensureArray(payload);
        const by = options?.by ?? definition.identifier;

        state[definition.key] = state[definition.key].map((item: S) => {
            const found = items.find((partial) => {
                return partial[by] === item[by];
            });

            if (!found) {
                return item;
            }

            if (options?.deep) {
                return defu(found, item) as S;
            }

            return {
                ...item,
                ...found,
            };
        });
    });

    const removeOperation: Mutation<{
        payload: Partial<S> | Partial<S>[];
    }> = source.mutation(`${definition.key}:remove`, (state, { payload }) => {
        const items = ensureArray(payload);

        state[definition.key] = state[definition.key].filter((item: S) => {
            return !items.some((match) => {
                let keys = Object.keys(match);
                if (definition.identifier in match) {
                    keys = [definition.identifier];
                }

                return keys.every((key) => {
                    return item[key] === match[key];
                });
            });
        });
    });

    const addOperation: Mutation<{
        payload: S | S[];
        options?: ModelManyCommitOptions;
    }> = source.mutation(`${definition.key}:add`, (state, { payload, options }) => {
        let items = ensureArray(payload);

        if (options?.unique) {
            const by = options.by ?? definition.identifier;

            const existingIds = new Set(
                state[definition.key].map((item: S) => {
                    return item[by];
                }),
            );

            items = items.filter((item) => {
                return !existingIds.has(item[by]);
            });
        }

        if (options?.prepend) {
            state[definition.key] = [...items, ...state[definition.key]];

            return;
        }

        state[definition.key] = [...state[definition.key], ...items];
    });

    return {
        set(payload: S[], options?: ModelManyCommitOptions) {
            wrapOperation(definition, "set", () => setOperation({ payload }), options?.silent);
        },
        reset(options?: Pick<ModelManyCommitOptions, "silent">) {
            wrapOperation(definition, "reset", () => resetOperation(), options?.silent);
        },
        patch(payload: Partial<S> | Partial<S>[], options?: ModelManyCommitOptions) {
            wrapOperation(definition, "patch", () => patchOperation({ payload, options }), options?.silent);
        },
        remove(payload: Partial<S> | Partial<S>[], options?: ModelManyCommitOptions) {
            wrapOperation(definition, "remove", () => removeOperation({ payload }), options?.silent);
        },
        add(payload: S | S[], options?: ModelManyCommitOptions) {
            wrapOperation(definition, "add", () => addOperation({ payload, options }), options?.silent);
        },
    } as ModelManyListCommit<S, any>;
}

// Create Many Record Commit

function createManyRecordCommit<S extends Shape>(
    definition: ModelManyDefinition<S, any, ModelManyKind.RECORD>,
    source: SourceStore<BaseState>,
): ModelManyRecordCommit<S> {
    const setOperation: Mutation<{
        payload: Record<string, S[]>;
    }> = source.mutation(`${definition.key}:set`, (state, { payload }) => {
        state[definition.key] = payload;
    });

    const resetOperation: Mutation<void> = source.mutation(`${definition.key}:reset`, (state) => {
        state[definition.key] = definition.default();
    });

    const patchOperation: Mutation<{
        payload: Record<string, S[]>;
        options?: ModelOneCommitOptions;
    }> = source.mutation(`${definition.key}:patch`, (state, { payload, options }) => {
        if (options?.deep) {
            state[definition.key] = defu(payload, state[definition.key]) as Record<string, S[]>;

            return;
        }

        state[definition.key] = {
            ...state[definition.key],
            ...payload,
        };
    });

    const removeOperation: Mutation<{
        payload: string;
    }> = source.mutation(`${definition.key}:remove`, (state, { payload }) => {
        const record: Record<string, S[]> = {};
        for (const entry of Object.keys(state[definition.key])) {
            if (entry !== payload) {
                record[entry] = state[definition.key][entry];
            }
        }

        state[definition.key] = record;
    });

    const addOperation: Mutation<{
        payload: {
            key: string;
            value: S[];
        };
    }> = source.mutation(`${definition.key}:add`, (state, { payload }) => {
        state[definition.key] = {
            ...state[definition.key],
            [payload.key]: payload.value,
        };
    });

    return {
        set(payload: Record<string, S[]>, options?: ModelOneCommitOptions) {
            wrapOperation(definition, "set", () => setOperation({ payload }), options?.silent);
        },
        reset(options?: Pick<ModelOneCommitOptions, "silent">) {
            wrapOperation(definition, "reset", () => resetOperation(), options?.silent);
        },
        patch(payload: Record<string, S[]>, options?: ModelOneCommitOptions) {
            wrapOperation(definition, "patch", () => patchOperation({ payload, options }), options?.silent);
        },
        remove(payload: string, options?: ModelOneCommitOptions) {
            wrapOperation(definition, "remove", () => removeOperation({ payload }), options?.silent);
        },
        add(payload: { key: string; value: S[] }, options?: ModelOneCommitOptions) {
            wrapOperation(definition, "add", () => addOperation({ payload }), options?.silent);
        },
    } as ModelManyRecordCommit<S>;
}

// Type Guards

function isOneDefinition<S extends Shape>(definition: ModelDefinition<S>): definition is ModelOneDefinition<S> {
    return definition.type === ModelType.ONE;
}

function isManyRecordDefinition<S extends Shape>(definition: ModelManyDefinition<S, any, any>): boolean {
    return definition.kind === ModelManyKind.RECORD;
}

// Resolve Commit

function resolveCommit<S extends Shape>(
    definition: ModelDefinition<S>,
    source: SourceStore<BaseState>,
): ModelOneCommit<S> | ModelManyListCommit<S, any> | ModelManyRecordCommit<S> {
    if (isOneDefinition(definition)) {
        return createOneCommit(definition, source);
    }

    if (isManyRecordDefinition(definition)) {
        return createManyRecordCommit(definition, source);
    }

    return createManyListCommit(definition, source);
}

// Create Model

export function createModel<S extends Shape>(
    definition: ModelDefinition<S>,
    source: SourceStore<BaseState>,
): ModelCall<S> {
    definition.logger?.debug("Registering model", {
        model: definition.key,
        type: definition.type,
    });

    const commit = resolveCommit(definition, source);
    const aliases = resolveShapeAliases(definition.shape);

    const model = Object.assign(commit, {
        commit(mode: ModelOneMode | ModelManyMode, value?: unknown, options?: unknown) {
            const handler = commit[mode as keyof typeof commit] as (...args: unknown[]) => void;
            switch (mode) {
                case ModelOneMode.RESET:
                case ModelManyMode.RESET: {
                    handler(options);

                    break;
                }
                default: {
                    handler(value, options);
                }
            }
        },
        aliases() {
            return aliases;
        },
    }) as ModelCall<S>;

    return model;
}
