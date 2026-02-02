export { EndpointMethod, Endpoint, EndpointStatus } from "./utils/endpoint";
export { getMeta, resolveSchema } from "./utils/schema";
export { createApi } from "./core/api";
export { ApiErrorSource, ApiError, ApiRequestError, ApiResponseError } from "./core/errors";
export { createStore, StoreMemoryPosition } from "./core/store";
export { defineApiAdapter } from "./core/adapter";
export { useStoreAlias } from "./composables/use";

export type { SharedConfig } from "./shared";
export type { EndpointDefinition } from "./utils/endpoint";
export type { SchemaMeta } from "./utils/schema";
export type {
    Api,
    ApiRequestHeader,
    ApiRequestQuery,
    ApiRequestBody,
    ApiRequestOptions,
    ApiOptions,
    EndpointMethodOptions,
} from "./core/api";
export type { ApiErrorOptions } from "./core/errors";
export type {
    ApiAdapter,
    DefineApiAdapter,
    ApiAdapterRequest,
    ApiAdapterResponse,
    ApiFetchAdapterOptions,
} from "./core/adapter";
