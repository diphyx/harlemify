import { defu } from "defu";
import { createStore as createHarlemStore } from "@harlem/core";

import type { z } from "zod";
import type { ComputedRef } from "vue";
import type { Extension, BaseState } from "@harlem/core";

import { createApi } from "./api";
import { resolveSchema } from "../utils/schema";
import { pluralize } from "../utils/transform";
import { Endpoint, EndpointStatus, getEndpoint, makeEndpointStatusName, resolveEndpointUrl } from "../utils/endpoint";

import type { Api, EndpointMethodOptions, ApiOptions } from "./api";
import type { EndpointDefinition, EndpointStatusName } from "../utils/endpoint";
import type { Pluralize } from "../utils/transform";

export enum StoreMemoryAction {
    SET = "set",
    EDIT = "edit",
    DROP = "drop",
}

export enum StoreMemoryPosition {
    FIRST = "first",
    LAST = "last",
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

type Indicator<T, I extends keyof T> = Required<Pick<T, I>>;
type WithIndicator<T, I extends keyof T> = Indicator<T, I> & T;
type PartialWithIndicator<T, I extends keyof T> = Indicator<T, I> & Partial<T>;

type StoreEndpointReadOptions = Omit<EndpointMethodOptions<any>, "body">;
type StoreEndpointWriteOptions = EndpointMethodOptions<any> & { validate?: boolean };
type StoreEndpointWriteMultipleOptions = StoreEndpointWriteOptions & { position?: StoreMemoryPosition };

type StoreMemory<T = unknown, I extends keyof T = keyof T> = {
    setUnit: (unit: T | null) => void;
    setUnits: (units: T[]) => void;
    editUnit: (unit: PartialWithIndicator<T, I>) => void;
    editUnits: (units: PartialWithIndicator<T, I>[]) => void;
    dropUnit: (unit: PartialWithIndicator<T, I>) => void;
    dropUnits: (units: PartialWithIndicator<T, I>[]) => void;
};

type StoreEndpoint<T = unknown, I extends keyof T = keyof T> = {
    getUnit: (unit?: PartialWithIndicator<T, I>, options?: StoreEndpointReadOptions) => Promise<T>;
    getUnits: (options?: StoreEndpointReadOptions) => Promise<T[]>;
    postUnit: (unit: WithIndicator<T, I>, options?: StoreEndpointWriteOptions) => Promise<T>;
    postUnits: (units: WithIndicator<T, I>[], options?: StoreEndpointWriteMultipleOptions) => Promise<T[]>;
    putUnit: (unit: WithIndicator<T, I>, options?: StoreEndpointWriteOptions) => Promise<T>;
    putUnits: (units: WithIndicator<T, I>[], options?: StoreEndpointWriteOptions) => Promise<T[]>;
    patchUnit: (unit: PartialWithIndicator<T, I>, options?: StoreEndpointWriteOptions) => Promise<Partial<T>>;
    patchUnits: (units: PartialWithIndicator<T, I>[], options?: StoreEndpointWriteOptions) => Promise<Partial<T>[]>;
    deleteUnit: (unit: PartialWithIndicator<T, I>, options?: StoreEndpointReadOptions) => Promise<boolean>;
    deleteUnits: (units: PartialWithIndicator<T, I>[], options?: StoreEndpointReadOptions) => Promise<boolean>;
};

type StoreMonitor = {
    [K in Endpoint as EndpointStatusName<K, EndpointStatus>]: ComputedRef<boolean>;
};

export type Store<E extends string = string, T = unknown, I extends keyof T = keyof T> = {
    store: any;
    alias: {
        unit: E;
        units: Pluralize<E>;
    };
    indicator: I;
    unit: ComputedRef<T | null>;
    units: ComputedRef<T[]>;
    memory: StoreMemory<T, I>;
    endpoint: StoreEndpoint<T, I>;
    monitor: StoreMonitor;
};

export function createStore<
    E extends string,
    T extends z.ZodRawShape,
    S extends z.infer<z.ZodObject<T>> = z.infer<z.ZodObject<T>>,
    I extends keyof S = "id" & keyof S,
>(
    entity: E,
    schema: z.ZodObject<T>,
    endpoints?: Partial<Record<Endpoint, EndpointDefinition<Partial<S>>>>,
    options?: StoreOptions,
): Store<E, S, I> {
    const { indicator } = resolveSchema(schema, {
        indicator: options?.indicator as keyof S,
    });

    let apiClient: Api;

    function api() {
        if (!apiClient) {
            const config = useRuntimeConfig();

            apiClient = createApi({
                ...(config.public.harlemify?.api ?? {}),
                ...options?.api,
            });
        }

        return apiClient;
    }

    type State = {
        memory: {
            unit: S | null;
            units: S[];
        };
        endpoints: Record<Endpoint, EndpointStatus>;
    };

    const state: State = {
        memory: {
            unit: null,
            units: [],
        },
        endpoints: {} as any,
    };

    const store = createHarlemStore(entity, state, {
        extensions: options?.extensions ?? [],
    });

    const alias = {
        unit: entity,
        units: pluralize(entity),
    };

    const memorizedUnit = store.getter("memorizedUnit", (state) => {
        return state.memory.unit;
    });

    const memorizedUnits = store.getter("memorizedUnits", (state) => {
        return state.memory.units;
    });

    const setMemorizedUnit = store.mutation("setMemorizedUnit", (state, unit: S | null = null) => {
        state.memory.unit = unit;
    });

    const setMemorizedUnits = store.mutation("setMemorizedUnits", (state, units: S[] = []) => {
        state.memory.units = units;
    });

    const editMemorizedUnit = store.mutation("editMemorizedUnit", (state, unit: PartialWithIndicator<S, I>) => {
        if (state.memory.unit?.[indicator] === unit[indicator]) {
            state.memory.unit = defu<any, any>(unit, state.memory.unit);
        }
    });

    const editMemorizedUnits = store.mutation("editMemorizedUnits", (state, units: PartialWithIndicator<S, I>[]) => {
        for (const unit of units) {
            const index = state.memory.units.findIndex((memorizedUnit) => {
                return memorizedUnit[indicator] === unit[indicator];
            });

            if (index !== -1) {
                state.memory.units[index] = defu<any, any>(unit, state.memory.units[index]);
            }
        }
    });

    const dropMemorizedUnit = store.mutation("dropMemorizedUnit", (state, unit: PartialWithIndicator<S, I>) => {
        if (state.memory.unit?.[indicator] === unit[indicator]) {
            state.memory.unit = null;
        }
    });

    const dropMemorizedUnits = store.mutation("dropMemorizedUnits", (state, units: PartialWithIndicator<S, I>[]) => {
        state.memory.units = state.memory.units.filter((memorizedUnit) => {
            for (const unit of units) {
                if (memorizedUnit[indicator] === unit[indicator]) {
                    return false;
                }
            }

            return true;
        });
    });

    const monitor: Record<string, ComputedRef<boolean>> = {};

    for (const endpoint of Object.values(Endpoint)) {
        for (const endpointStatus of Object.values(EndpointStatus)) {
            const statusKey = makeEndpointStatusName(endpoint, endpointStatus);

            monitor[statusKey] = store.getter(statusKey, (state) => {
                return state.endpoints[endpoint] === endpointStatus;
            });
        }
    }

    const patchMonitor = store.mutation(
        "patchMonitor",
        (state, payload: { endpoint: Endpoint; status: EndpointStatus }) => {
            state.endpoints[payload.endpoint] = payload.status;
        },
    );

    function patchMonitorTo(endpoint: Endpoint, status: EndpointStatus) {
        if (status === EndpointStatus.PENDING) {
            const statusKey = makeEndpointStatusName(endpoint, EndpointStatus.PENDING);

            if (monitor[statusKey].value) {
                throw new Error(`Endpoint "${endpoint}" is already pending`);
            }
        }

        patchMonitor({
            endpoint,
            status,
        });
    }

    async function withStatus<T>(key: Endpoint, operation: () => Promise<T>): Promise<T> {
        await options?.hooks?.before?.();

        patchMonitorTo(key, EndpointStatus.PENDING);

        try {
            const result = await operation();

            patchMonitorTo(key, EndpointStatus.SUCCESS);

            await options?.hooks?.after?.();

            return result;
        } catch (error: any) {
            patchMonitorTo(key, EndpointStatus.FAILED);

            await options?.hooks?.after?.(error);

            throw error;
        }
    }

    async function getUnitEndpoint(
        unit?: PartialWithIndicator<S, I>,
        options?: Omit<EndpointMethodOptions<any>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.GET_UNIT);

        return withStatus(Endpoint.GET_UNIT, async () => {
            const response = await api().get<S>(resolveEndpointUrl(endpoint, unit), options);

            setMemorizedUnit(response);

            return response;
        });
    }

    async function getUnitsEndpoint(options?: Omit<EndpointMethodOptions<any>, "body">) {
        const endpoint = getEndpoint(endpoints, Endpoint.GET_UNITS);

        return withStatus(Endpoint.GET_UNITS, async () => {
            const response = await api().get<S[]>(resolveEndpointUrl(endpoint), options);

            setMemorizedUnits(response);

            return response;
        });
    }

    async function postUnitEndpoint(
        unit: WithIndicator<S, I>,
        actionOptions?: EndpointMethodOptions<any> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.POST_UNIT);
        const resolvedSchema = resolveSchema(schema, { indicator, endpoint, unit });

        if (actionOptions?.validate) {
            schema.pick<any>(resolvedSchema.keys).parse(unit);
        }

        return withStatus(Endpoint.POST_UNIT, async () => {
            const response = await api().post<WithIndicator<S, I>>(resolveEndpointUrl(endpoint, unit), {
                ...actionOptions,
                body: actionOptions?.body ?? resolvedSchema.values,
            });

            setMemorizedUnit({ ...unit, ...response });

            return response;
        });
    }

    async function postUnitsEndpoint(
        units: WithIndicator<S, I>[],
        options?: EndpointMethodOptions<any> & { validate?: boolean; position?: StoreMemoryPosition },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.POST_UNITS);

        return withStatus(Endpoint.POST_UNITS, async () => {
            const responses: WithIndicator<S, I>[] = [];

            for (const unit of units) {
                const resolvedSchema = resolveSchema(schema, { indicator, endpoint, unit });

                if (options?.validate) {
                    schema.pick<any>(resolvedSchema.keys).parse(unit);
                }

                const response = await api().post<WithIndicator<S, I>>(resolveEndpointUrl(endpoint, unit), {
                    ...options,
                    body: options?.body ?? resolvedSchema.values,
                });

                const clonedUnits: any[] = [...memorizedUnits.value];

                if (options?.position === StoreMemoryPosition.LAST) {
                    clonedUnits.push({ ...unit, ...response });
                } else {
                    clonedUnits.unshift({ ...unit, ...response });
                }

                setMemorizedUnits(clonedUnits);

                responses.push(response);
            }

            return responses;
        });
    }

    async function putUnitEndpoint(
        unit: WithIndicator<S, I>,
        options?: EndpointMethodOptions<any> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.PUT_UNIT);
        const resolvedSchema = resolveSchema(schema, { indicator, endpoint, unit });

        if (options?.validate) {
            schema.pick<any>(resolvedSchema.keys).parse(unit);
        }

        return withStatus(Endpoint.PUT_UNIT, async () => {
            const response = await api().put<WithIndicator<S, I>>(resolveEndpointUrl(endpoint, unit), {
                ...options,
                body: options?.body ?? resolvedSchema.values,
            });

            setMemorizedUnit({ ...unit, ...response });

            return response;
        });
    }

    async function putUnitsEndpoint(
        units: WithIndicator<S, I>[],
        options?: EndpointMethodOptions<any> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.PUT_UNITS);

        return withStatus(Endpoint.PUT_UNITS, async () => {
            const responses: WithIndicator<S, I>[] = [];

            for (const unit of units) {
                const resolvedSchema = resolveSchema(schema, { indicator, endpoint, unit });

                if (options?.validate) {
                    schema.pick<any>(resolvedSchema.keys).parse(unit);
                }

                const response = await api().put<WithIndicator<S, I>>(resolveEndpointUrl(endpoint, unit), {
                    ...options,
                    body: options?.body ?? resolvedSchema.values,
                });

                editMemorizedUnits([{ ...unit, ...response }]);

                responses.push(response);
            }

            return responses;
        });
    }

    async function patchUnitEndpoint(
        unit: PartialWithIndicator<S, I>,
        options?: EndpointMethodOptions<any> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.PATCH_UNIT);
        const resolvedSchema = resolveSchema(schema, { indicator, endpoint, unit });

        if (options?.validate) {
            schema.pick<any>(resolvedSchema.keys).partial().parse(unit);
        }

        return withStatus(Endpoint.PATCH_UNIT, async () => {
            const response = await api().patch<PartialWithIndicator<S, I>>(resolveEndpointUrl(endpoint, unit), {
                ...options,
                body: options?.body ?? resolvedSchema.values,
            });

            editMemorizedUnit({ ...unit, ...response });

            return response;
        });
    }

    async function patchUnitsEndpoint(
        units: PartialWithIndicator<S, I>[],
        options?: EndpointMethodOptions<any> & { validate?: boolean },
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.PATCH_UNITS);

        return withStatus(Endpoint.PATCH_UNITS, async () => {
            const responses: PartialWithIndicator<S, I>[] = [];

            for (const unit of units) {
                const resolvedSchema = resolveSchema(schema, { indicator, endpoint, unit });

                if (options?.validate) {
                    schema.pick<any>(resolvedSchema.keys).partial().parse(unit);
                }

                const response = await api().patch<PartialWithIndicator<S, I>>(resolveEndpointUrl(endpoint, unit), {
                    ...options,
                    body: options?.body ?? resolvedSchema.values,
                });

                editMemorizedUnits([{ ...unit, ...response }]);

                responses.push(response);
            }

            return responses;
        });
    }

    async function deleteUnitEndpoint(
        unit: PartialWithIndicator<S, I>,
        options?: Omit<EndpointMethodOptions<any>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.DELETE_UNIT);

        return withStatus(Endpoint.DELETE_UNIT, async () => {
            await api().del<PartialWithIndicator<S, I>>(resolveEndpointUrl(endpoint, unit), options);

            dropMemorizedUnit(unit);

            return true;
        });
    }

    async function deleteUnitsEndpoint(
        units: PartialWithIndicator<S, I>[],
        options?: Omit<EndpointMethodOptions<any>, "body">,
    ) {
        const endpoint = getEndpoint(endpoints, Endpoint.DELETE_UNITS);

        return withStatus(Endpoint.DELETE_UNITS, async () => {
            for (const unit of units) {
                await api().del<PartialWithIndicator<S, I>>(resolveEndpointUrl(endpoint, unit), options);

                dropMemorizedUnits([unit]);
            }

            return true;
        });
    }

    return {
        store,
        alias,
        indicator,
        unit: memorizedUnit,
        units: memorizedUnits,
        memory: {
            setUnit: setMemorizedUnit,
            setUnits: setMemorizedUnits,
            editUnit: editMemorizedUnit,
            editUnits: editMemorizedUnits,
            dropUnit: dropMemorizedUnit,
            dropUnits: dropMemorizedUnits,
        },
        endpoint: {
            getUnit: getUnitEndpoint,
            getUnits: getUnitsEndpoint,
            postUnit: postUnitEndpoint,
            postUnits: postUnitsEndpoint,
            putUnit: putUnitEndpoint,
            putUnits: putUnitsEndpoint,
            patchUnit: patchUnitEndpoint,
            patchUnits: patchUnitsEndpoint,
            deleteUnit: deleteUnitEndpoint,
            deleteUnits: deleteUnitsEndpoint,
        },
        monitor,
    } as any;
}
