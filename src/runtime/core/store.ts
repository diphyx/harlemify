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
    options?: {
        api?: ApiOptions;
        extensions?: Extension<BaseState>[];
    },
) {
    const { indicator } = resolveSchema(schema);

    type Schema = z.infer<z.ZodObject<T>>;
    type SchemaIndicator = Required<Pick<Schema, K>>;

    let apiClient: ReturnType<typeof createApi>;

    function api() {
        if (!apiClient) {
            const config = useRuntimeConfig();

            apiClient = createApi({
                ...config.public.harlemify?.api,
                ...options?.api,
            });
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

    async function getUnit(
        unit?: SchemaIndicator & Partial<Schema>,
        options?: Omit<ApiActionOptions<ApiAction.GET>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.GET_UNIT);

        patchEndpointMemoryTo(Endpoint.GET_UNIT, {
            status: EndpointStatus.PENDING,
        });

        try {
            const response = await api().get<Schema>(
                resolveEndpointUrl(endpoint, unit),
                options,
            );

            setMemorizedUnit(response);

            patchEndpointMemoryTo(Endpoint.GET_UNIT, {
                status: EndpointStatus.SUCCESS,
            });

            return response;
        } catch (error) {
            patchEndpointMemoryTo(Endpoint.GET_UNIT, {
                status: EndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function getUnits(
        options?: Omit<ApiActionOptions<ApiAction.GET>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.GET_UNITS);

        patchEndpointMemoryTo(Endpoint.GET_UNITS, {
            status: EndpointStatus.PENDING,
        });

        try {
            const response = await api().get<Schema[]>(
                resolveEndpointUrl(endpoint),
                options,
            );

            setMemorizedUnits(response);

            patchEndpointMemoryTo(Endpoint.GET_UNITS, {
                status: EndpointStatus.SUCCESS,
            });

            return response;
        } catch (error) {
            patchEndpointMemoryTo(Endpoint.GET_UNITS, {
                status: EndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function postUnit(
        unit: SchemaIndicator & Schema,
        options?: ApiActionOptions<ApiAction.POST> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.POST_UNIT);
        const resolvedSchema = resolveSchema(schema, endpoint.action, unit);

        if (options?.validate) {
            schema.pick<any>(resolvedSchema.keys).parse(unit);
        }

        patchEndpointMemoryTo(Endpoint.POST_UNIT, {
            status: EndpointStatus.PENDING,
        });

        try {
            const response = await api().post<SchemaIndicator & Schema>(
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

            patchEndpointMemoryTo(Endpoint.POST_UNIT, {
                status: EndpointStatus.SUCCESS,
            });

            return response;
        } catch (error) {
            patchEndpointMemoryTo(Endpoint.POST_UNIT, {
                status: EndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function postUnits(
        units: (SchemaIndicator & Schema)[],
        options?: ApiActionOptions<ApiAction.POST> & {
            validate?: boolean;
            position?: StoreMemoryPosition;
        },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.POST_UNITS);

        patchEndpointMemoryTo(Endpoint.POST_UNITS, {
            status: EndpointStatus.PENDING,
        });

        try {
            const responses: (SchemaIndicator & Schema)[] = [];

            for (const unit of units) {
                const resolvedSchema = resolveSchema(
                    schema,
                    endpoint.action,
                    unit,
                );

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

            patchEndpointMemoryTo(Endpoint.POST_UNITS, {
                status: EndpointStatus.SUCCESS,
            });

            return responses;
        } catch (error) {
            patchEndpointMemoryTo(Endpoint.POST_UNITS, {
                status: EndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function putUnit(
        unit: SchemaIndicator & Schema,
        options?: ApiActionOptions<ApiAction.PUT> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.PUT_UNIT);
        const resolvedSchema = resolveSchema(schema, endpoint.action, unit);

        if (options?.validate) {
            schema.pick<any>(resolvedSchema.keys).parse(unit);
        }

        patchEndpointMemoryTo(Endpoint.PUT_UNIT, {
            status: EndpointStatus.PENDING,
        });

        try {
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

            patchEndpointMemoryTo(Endpoint.PUT_UNIT, {
                status: EndpointStatus.SUCCESS,
            });

            return response;
        } catch (error) {
            patchEndpointMemoryTo(Endpoint.PUT_UNIT, {
                status: EndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function putUnits(
        units: (SchemaIndicator & Schema)[],
        options?: ApiActionOptions<ApiAction.PUT> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.PUT_UNITS);

        patchEndpointMemoryTo(Endpoint.PUT_UNITS, {
            status: EndpointStatus.PENDING,
        });

        try {
            const responses: (SchemaIndicator & Schema)[] = [];

            for (const unit of units) {
                const resolvedSchema = resolveSchema(
                    schema,
                    endpoint.action,
                    unit,
                );

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

            patchEndpointMemoryTo(Endpoint.PUT_UNITS, {
                status: EndpointStatus.SUCCESS,
            });

            return responses;
        } catch (error) {
            patchEndpointMemoryTo(Endpoint.PUT_UNITS, {
                status: EndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function patchUnit(
        unit: SchemaIndicator & Partial<Schema>,
        options?: ApiActionOptions<ApiAction.PATCH> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.PATCH_UNIT);
        const resolvedSchema = resolveSchema(schema, endpoint.action, unit);

        if (options?.validate) {
            schema.pick<any>(resolvedSchema.keys).partial().parse(unit);
        }

        patchEndpointMemoryTo(Endpoint.PATCH_UNIT, {
            status: EndpointStatus.PENDING,
        });

        try {
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

            patchEndpointMemoryTo(Endpoint.PATCH_UNIT, {
                status: EndpointStatus.SUCCESS,
            });

            return response;
        } catch (error) {
            patchEndpointMemoryTo(Endpoint.PATCH_UNIT, {
                status: EndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function patchUnits(
        units: (SchemaIndicator & Partial<Schema>)[],
        options?: ApiActionOptions<ApiAction.PATCH> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.PATCH_UNITS);

        patchEndpointMemoryTo(Endpoint.PATCH_UNITS, {
            status: EndpointStatus.PENDING,
        });

        try {
            const responses: (SchemaIndicator & Partial<Schema>)[] = [];

            for (const unit of units) {
                const resolvedSchema = resolveSchema(
                    schema,
                    endpoint.action,
                    unit,
                );

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

            patchEndpointMemoryTo(Endpoint.PATCH_UNITS, {
                status: EndpointStatus.SUCCESS,
            });

            return responses;
        } catch (error) {
            patchEndpointMemoryTo(Endpoint.PATCH_UNITS, {
                status: EndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function deleteUnit(
        unit: SchemaIndicator & Partial<Schema>,
        options?: Omit<ApiActionOptions<ApiAction.DELETE>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.DELETE_UNIT);

        patchEndpointMemoryTo(Endpoint.DELETE_UNIT, {
            status: EndpointStatus.PENDING,
        });

        try {
            await api().del<SchemaIndicator & Partial<Schema>>(
                resolveEndpointUrl(endpoint, unit),
                options,
            );

            dropMemorizedUnit(unit);

            patchEndpointMemoryTo(Endpoint.DELETE_UNIT, {
                status: EndpointStatus.SUCCESS,
            });

            return true;
        } catch (error) {
            patchEndpointMemoryTo(Endpoint.DELETE_UNIT, {
                status: EndpointStatus.FAILED,
            });

            throw error;
        }
    }

    async function deleteUnits(
        units: (SchemaIndicator & Partial<Schema>)[],
        options?: Omit<ApiActionOptions<ApiAction.DELETE>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.DELETE_UNITS);

        patchEndpointMemoryTo(Endpoint.DELETE_UNITS, {
            status: EndpointStatus.PENDING,
        });

        try {
            for (const unit of units) {
                await api().del<SchemaIndicator & Partial<Schema>>(
                    resolveEndpointUrl(endpoint, unit),
                    options,
                );

                dropMemorizedUnits([unit]);
            }

            patchEndpointMemoryTo(Endpoint.DELETE_UNITS, {
                status: EndpointStatus.SUCCESS,
            });

            return true;
        } catch (error) {
            patchEndpointMemoryTo(Endpoint.DELETE_UNITS, {
                status: EndpointStatus.FAILED,
            });

            throw error;
        }
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
