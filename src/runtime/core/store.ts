import { z } from "zod";
import { defu } from "defu";
import {
    createStore as createHarlemStore,
    type Extension,
    type BaseState,
} from "@harlem/core";

import { resolveSchema } from "../utils/schema";

import {
    makeEndpointStatusKey,
    getEndpoint,
    resolveEndpointUrl,
    makeEndpointsStatus,
    Endpoint,
    EndpointStatus,
    type EndpointDefinition,
    type EndpointMemory,
} from "../utils/endpoint";

export enum StoreMemoryPosition {
    FIRST = "first",
    LAST = "last",
}

import {
    createApi,
    ApiAction,
    type ApiActionOptions,
    type ApiOptions,
} from "./api";

export class StoreConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "StoreConfigurationError";
    }
}

export interface StoreHooks {
    before?: () => Promise<void> | void;
    after?: (error?: Error) => Promise<void> | void;
}

export interface StoreOptions {
    api?: ApiOptions;
    indicator?: string;
    hooks?: StoreHooks;
    extensions?: Extension<BaseState>[];
}

export function createStore<
    T extends z.ZodRawShape,
    K extends keyof z.infer<z.ZodObject<T>> = "id" &
        keyof z.infer<z.ZodObject<T>>,
>(
    name: string,
    schema: z.ZodObject<T>,
    endpoints?: Partial<
        Record<Endpoint, EndpointDefinition<Partial<z.infer<z.ZodObject<T>>>>>
    >,
    options?: StoreOptions,
) {
    type Schema = z.infer<z.ZodObject<T>>;
    type SchemaIndicator = Required<Pick<Schema, K>>;

    const { indicator } = resolveSchema(schema, {
        indicator: options?.indicator as keyof Schema,
    });
    const hooks = options?.hooks;

    let apiClient: ReturnType<typeof createApi>;
    let apiInitError: Error | null = null;

    function api() {
        if (apiInitError) {
            throw apiInitError;
        }

        if (!apiClient) {
            try {
                const config = useRuntimeConfig();

                if (!config) {
                    throw new StoreConfigurationError(
                        `Runtime config is not available. Ensure the store "${name}" is used within a Nuxt context.`,
                    );
                }

                apiClient = createApi({
                    ...config.public.harlemify?.api,
                    ...options?.api,
                });
            } catch (error) {
                apiInitError =
                    error instanceof Error
                        ? error
                        : new StoreConfigurationError(
                              `Failed to initialize API client for store "${name}": ${String(error)}`,
                          );
                throw apiInitError;
            }
        }

        return apiClient;
    }

    const store = createHarlemStore(
        name,
        {
            memory: {
                unit: null as Schema | null,
                units: [] as Schema[],
            },
            endpoints: {} as Record<Endpoint, EndpointMemory>,
        },
        {
            extensions: options?.extensions ?? [],
        },
    );

    const memorizedUnit = store.getter("memorizedUnit", (state) => {
        return state.memory.unit;
    });

    const memorizedUnits = store.getter("memorizedUnits", (state) => {
        return state.memory.units;
    });

    function hasMemorizedUnits(
        ...units: (SchemaIndicator & Partial<Schema>)[]
    ) {
        const output = {} as Record<string | number, boolean>;

        for (const unit of units) {
            const exists = memorizedUnits.value.some((memorizedUnit: any) => {
                return memorizedUnit[indicator] === unit[indicator];
            });

            (output as any)[unit[indicator]] = exists;
        }

        return output;
    }

    const setMemorizedUnit = store.mutation(
        "setMemorizedUnit",
        (state, unit: Schema | null = null) => {
            state.memory.unit = unit;
        },
    );

    const setMemorizedUnits = store.mutation(
        "setMemorizedUnits",
        (state, units: Schema[] = []) => {
            state.memory.units = units;
        },
    );

    const editMemorizedUnit = store.mutation(
        "editMemorizedUnit",
        (state, unit: SchemaIndicator & Partial<Schema>) => {
            if (state.memory.unit?.[indicator] === unit[indicator]) {
                state.memory.unit = defu<any, any>(unit, state.memory.unit);
            }
        },
    );

    const editMemorizedUnits = store.mutation(
        "editMemorizedUnits",
        (state, units: (SchemaIndicator & Partial<Schema>)[]) => {
            for (const unit of units) {
                const index = state.memory.units.findIndex((memorizedUnit) => {
                    return memorizedUnit[indicator] === unit[indicator];
                });

                if (index !== -1) {
                    state.memory.units[index] = defu<any, any>(
                        unit,
                        state.memory.units[index],
                    );
                }
            }
        },
    );

    const dropMemorizedUnit = store.mutation(
        "dropMemorizedUnit",
        (state, unit: SchemaIndicator & Partial<Schema>) => {
            if (state.memory.unit?.[indicator] === unit[indicator]) {
                state.memory.unit = null;
            }
        },
    );

    const dropMemorizedUnits = store.mutation(
        "dropMemorizedUnits",
        (state, units: (SchemaIndicator & Partial<Schema>)[]) => {
            state.memory.units = state.memory.units.filter((memorizedUnit) => {
                for (const unit of units) {
                    if (memorizedUnit[indicator] === unit[indicator]) {
                        return false;
                    }
                }

                return true;
            });
        },
    );

    const endpointsStatus = makeEndpointsStatus(store.getter);

    const patchEndpointMemory = store.mutation(
        "patchEndpointMemory",
        (
            state,
            {
                key,
                memory,
            }: {
                key: Endpoint;
                memory: EndpointMemory;
            },
        ) => {
            state.endpoints[key] = memory;
        },
    );

    const purgeEndpointMemory = store.mutation(
        "purgeEndpointMemory",
        (state) => {
            state.endpoints = {} as Record<Endpoint, EndpointMemory>;
        },
    );

    function patchEndpointMemoryTo(key: Endpoint, memory: EndpointMemory) {
        if (memory.status === EndpointStatus.PENDING) {
            const statusKey = makeEndpointStatusKey(
                key,
                EndpointStatus.PENDING,
            );

            if (endpointsStatus[statusKey].value) {
                throw new Error(`Endpoint "${key}" is already pending`);
            }
        }

        patchEndpointMemory({
            key,
            memory,
        });
    }

    async function withEndpointStatus<T>(
        key: Endpoint,
        operation: () => Promise<T>,
    ): Promise<T> {
        await hooks?.before?.();

        patchEndpointMemoryTo(key, {
            status: EndpointStatus.PENDING,
        });

        try {
            const result = await operation();

            patchEndpointMemoryTo(key, {
                status: EndpointStatus.SUCCESS,
            });

            await hooks?.after?.();

            return result;
        } catch (error: any) {
            patchEndpointMemoryTo(key, {
                status: EndpointStatus.FAILED,
            });

            await hooks?.after?.(error);

            throw error;
        }
    }

    async function getUnit(
        unit?: SchemaIndicator & Partial<Schema>,
        options?: Omit<ApiActionOptions<ApiAction.GET>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.GET_UNIT);

        return withEndpointStatus(Endpoint.GET_UNIT, async () => {
            const response = await api().get<Schema>(
                resolveEndpointUrl(endpoint, unit),
                options,
            );

            setMemorizedUnit(response);

            return response;
        });
    }

    async function getUnits(
        options?: Omit<ApiActionOptions<ApiAction.GET>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.GET_UNITS);

        return withEndpointStatus(Endpoint.GET_UNITS, async () => {
            const response = await api().get<Schema[]>(
                resolveEndpointUrl(endpoint),
                options,
            );

            setMemorizedUnits(response);

            return response;
        });
    }

    async function postUnit(
        unit: SchemaIndicator & Schema,
        actionOptions?: ApiActionOptions<ApiAction.POST> & {
            validate?: boolean;
        },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.POST_UNIT);
        const resolvedSchema = resolveSchema(schema, {
            indicator,
            endpoint,
            unit,
        });

        if (actionOptions?.validate) {
            schema.pick<any>(resolvedSchema.keys).parse(unit);
        }

        return withEndpointStatus(Endpoint.POST_UNIT, async () => {
            const response = await api().post<SchemaIndicator & Schema>(
                resolveEndpointUrl(endpoint, unit),
                {
                    ...actionOptions,
                    body: actionOptions?.body ?? resolvedSchema.values,
                },
            );

            setMemorizedUnit({
                ...unit,
                ...response,
            });

            return response;
        });
    }

    async function postUnits(
        units: (SchemaIndicator & Schema)[],
        options?: ApiActionOptions<ApiAction.POST> & {
            validate?: boolean;
            position?: StoreMemoryPosition;
        },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.POST_UNITS);

        return withEndpointStatus(Endpoint.POST_UNITS, async () => {
            const responses: (SchemaIndicator & Schema)[] = [];

            for (const unit of units) {
                const resolvedSchema = resolveSchema(schema, {
                    indicator,
                    endpoint,
                    unit,
                });

                if (options?.validate) {
                    schema.pick<any>(resolvedSchema.keys).parse(unit);
                }

                const response = await api().post<SchemaIndicator & Schema>(
                    resolveEndpointUrl(endpoint, unit),
                    {
                        ...options,
                        body: options?.body ?? resolvedSchema.values,
                    },
                );

                const clonedUnits: any[] = [...memorizedUnits.value];

                if (options?.position === StoreMemoryPosition.LAST) {
                    clonedUnits.push({
                        ...unit,
                        ...response,
                    });
                } else {
                    clonedUnits.unshift({
                        ...unit,
                        ...response,
                    });
                }

                setMemorizedUnits(clonedUnits);

                responses.push(response);
            }

            return responses;
        });
    }

    async function putUnit(
        unit: SchemaIndicator & Schema,
        options?: ApiActionOptions<ApiAction.PUT> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.PUT_UNIT);
        const resolvedSchema = resolveSchema(schema, {
            indicator,
            endpoint,
            unit,
        });

        if (options?.validate) {
            schema.pick<any>(resolvedSchema.keys).parse(unit);
        }

        return withEndpointStatus(Endpoint.PUT_UNIT, async () => {
            const response = await api().put<SchemaIndicator & Schema>(
                resolveEndpointUrl(endpoint, unit),
                {
                    ...options,
                    body: options?.body ?? resolvedSchema.values,
                },
            );

            setMemorizedUnit({
                ...unit,
                ...response,
            });

            return response;
        });
    }

    async function putUnits(
        units: (SchemaIndicator & Schema)[],
        options?: ApiActionOptions<ApiAction.PUT> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.PUT_UNITS);

        return withEndpointStatus(Endpoint.PUT_UNITS, async () => {
            const responses: (SchemaIndicator & Schema)[] = [];

            for (const unit of units) {
                const resolvedSchema = resolveSchema(schema, {
                    indicator,
                    endpoint,
                    unit,
                });

                if (options?.validate) {
                    schema.pick<any>(resolvedSchema.keys).parse(unit);
                }

                const response = await api().put<SchemaIndicator & Schema>(
                    resolveEndpointUrl(endpoint, unit),
                    {
                        ...options,
                        body: options?.body ?? resolvedSchema.values,
                    },
                );

                editMemorizedUnits([
                    {
                        ...unit,
                        ...response,
                    },
                ]);

                responses.push(response);
            }

            return responses;
        });
    }

    async function patchUnit(
        unit: SchemaIndicator & Partial<Schema>,
        options?: ApiActionOptions<ApiAction.PATCH> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.PATCH_UNIT);
        const resolvedSchema = resolveSchema(schema, {
            indicator,
            endpoint,
            unit,
        });

        if (options?.validate) {
            schema.pick<any>(resolvedSchema.keys).partial().parse(unit);
        }

        return withEndpointStatus(Endpoint.PATCH_UNIT, async () => {
            const response = await api().patch<
                SchemaIndicator & Partial<Schema>
            >(resolveEndpointUrl(endpoint, unit), {
                ...options,
                body: options?.body ?? resolvedSchema.values,
            });

            editMemorizedUnit({
                ...unit,
                ...response,
            });

            return response;
        });
    }

    async function patchUnits(
        units: (SchemaIndicator & Partial<Schema>)[],
        options?: ApiActionOptions<ApiAction.PATCH> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.PATCH_UNITS);

        return withEndpointStatus(Endpoint.PATCH_UNITS, async () => {
            const responses: (SchemaIndicator & Partial<Schema>)[] = [];

            for (const unit of units) {
                const resolvedSchema = resolveSchema(schema, {
                    indicator,
                    endpoint,
                    unit,
                });

                if (options?.validate) {
                    schema.pick<any>(resolvedSchema.keys).partial().parse(unit);
                }

                const response = await api().patch<
                    SchemaIndicator & Partial<Schema>
                >(resolveEndpointUrl(endpoint, unit), {
                    ...options,
                    body: options?.body ?? resolvedSchema.values,
                });

                editMemorizedUnits([
                    {
                        ...unit,
                        ...response,
                    },
                ]);

                responses.push(response);
            }

            return responses;
        });
    }

    async function deleteUnit(
        unit: SchemaIndicator & Partial<Schema>,
        options?: Omit<ApiActionOptions<ApiAction.DELETE>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.DELETE_UNIT);

        return withEndpointStatus(Endpoint.DELETE_UNIT, async () => {
            await api().del<SchemaIndicator & Partial<Schema>>(
                resolveEndpointUrl(endpoint, unit),
                options,
            );

            dropMemorizedUnit(unit);

            return true;
        });
    }

    async function deleteUnits(
        units: (SchemaIndicator & Partial<Schema>)[],
        options?: Omit<ApiActionOptions<ApiAction.DELETE>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.DELETE_UNITS);

        return withEndpointStatus(Endpoint.DELETE_UNITS, async () => {
            for (const unit of units) {
                await api().del<SchemaIndicator & Partial<Schema>>(
                    resolveEndpointUrl(endpoint, unit),
                    options,
                );

                dropMemorizedUnits([unit]);
            }

            return true;
        });
    }

    return {
        api,
        store,
        memorizedUnit,
        memorizedUnits,
        hasMemorizedUnits,
        endpointsStatus,
        setMemorizedUnit,
        setMemorizedUnits,
        editMemorizedUnit,
        editMemorizedUnits,
        dropMemorizedUnit,
        dropMemorizedUnits,
        patchEndpointMemory,
        purgeEndpointMemory,
        getUnit,
        getUnits,
        postUnit,
        postUnits,
        putUnit,
        putUnits,
        patchUnit,
        patchUnits,
        deleteUnit,
        deleteUnits,
    };
}
