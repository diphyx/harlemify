# API Reference

## createStore

Creates a new store with API integration and state management.

```typescript
createStore(entity, schema, endpoints?, options?)
```

| Parameter   | Type                                    | Description                |
| ----------- | --------------------------------------- | -------------------------- |
| `entity`    | `string`                                | Entity name (e.g., "user") |
| `schema`    | `z.ZodObject`                           | Zod schema with metadata   |
| `endpoints` | `Partial<Record<Endpoint, Definition>>` | Endpoint definitions       |
| `options`   | `StoreOptions`                          | Store configuration        |

### Returns: Store

| Property    | Type          | Description             |
| ----------- | ------------- | ----------------------- |
| `store`     | `HarlemStore` | Underlying Harlem store |
| `alias`     | `Object`      | Entity name aliases     |
| `indicator` | `keyof T`     | Primary key field name  |
| `unit`      | `ComputedRef` | Single cached unit      |
| `units`     | `ComputedRef` | Cached unit collection  |
| `memory`    | `Object`      | Memory mutation methods |
| `endpoint`  | `Object`      | API endpoint methods    |
| `monitor`   | `Object`      | Endpoint status flags   |

---

## defineApiAdapter

Creates a built-in fetch adapter with configurable options.

```typescript
defineApiAdapter(options?)
```

| Parameter | Type                     | Description     |
| --------- | ------------------------ | --------------- |
| `options` | `ApiFetchAdapterOptions` | Adapter options |

### Returns: ApiAdapter

A function that handles HTTP requests.

---

## useStoreAlias

Composable for entity-named store access.

```typescript
useStoreAlias(store);
```

Returns properties aliased to entity name:

| Property                  | Type          | Description      |
| ------------------------- | ------------- | ---------------- |
| `[entity]`                | `ComputedRef` | Single unit      |
| `[entities]`              | `ComputedRef` | Unit collection  |
| `set[Entity]`             | `Function`    | Set single unit  |
| `set[Entities]`           | `Function`    | Set collection   |
| `edit[Entity]`            | `Function`    | Merge into unit  |
| `edit[Entities]`          | `Function`    | Merge into units |
| `drop[Entity]`            | `Function`    | Remove unit      |
| `drop[Entities]`          | `Function`    | Remove units     |
| `get[Entity]`             | `Function`    | Fetch single     |
| `get[Entities]`           | `Function`    | Fetch collection |
| `post[Entity]`            | `Function`    | Create single    |
| `post[Entities]`          | `Function`    | Create multiple  |
| `put[Entity]`             | `Function`    | Replace single   |
| `put[Entities]`           | `Function`    | Replace multiple |
| `patch[Entity]`           | `Function`    | Update single    |
| `patch[Entities]`         | `Function`    | Update multiple  |
| `delete[Entity]`          | `Function`    | Delete single    |
| `delete[Entities]`        | `Function`    | Delete multiple  |
| `get[Entity]Is{Status}`   | `ComputedRef` | Status flag      |
| `get[Entities]Is{Status}` | `ComputedRef` | Status flag      |

---

## createApi

Creates a standalone API client.

```typescript
createApi(options?)
```

### Options

| Property  | Type               | Description             |
| --------- | ------------------ | ----------------------- |
| `headers` | `MaybeRefOrGetter` | Global headers          |
| `query`   | `MaybeRefOrGetter` | Global query parameters |
| `adapter` | `ApiAdapter`       | Custom adapter          |

### Methods

```typescript
await api.get<T>(url, options?)
await api.post<T>(url, options?)
await api.put<T>(url, options?)
await api.patch<T>(url, options?)
await api.del<T>(url, options?)
```

---

## Enums

### EndpointMethod

```typescript
enum EndpointMethod {
    GET = "get",
    POST = "post",
    PUT = "put",
    PATCH = "patch",
    DELETE = "delete",
}
```

### Endpoint

```typescript
enum Endpoint {
    GET_UNIT = "getUnit",
    GET_UNITS = "getUnits",
    POST_UNIT = "postUnit",
    POST_UNITS = "postUnits",
    PUT_UNIT = "putUnit",
    PUT_UNITS = "putUnits",
    PATCH_UNIT = "patchUnit",
    PATCH_UNITS = "patchUnits",
    DELETE_UNIT = "deleteUnit",
    DELETE_UNITS = "deleteUnits",
}
```

### EndpointStatus

```typescript
enum EndpointStatus {
    IDLE = "idle",
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed",
}
```

### StoreMemoryPosition

```typescript
enum StoreMemoryPosition {
    FIRST = "first", // Default - add at beginning
    LAST = "last", // Add at end
}
```

### ApiErrorSource

```typescript
enum ApiErrorSource {
    REQUEST = "request",
    RESPONSE = "response",
}
```

---

## Types

### StoreOptions

```typescript
interface StoreOptions {
    adapter?: ApiAdapter<any>;
    indicator?: string;
    hooks?: StoreHooks;
    extensions?: Extension<BaseState>[];
}
```

### StoreHooks

```typescript
interface StoreHooks {
    before?: () => Promise<void> | void;
    after?: (error?: Error) => Promise<void> | void;
}
```

### ApiOptions

```typescript
interface ApiOptions {
    headers?: MaybeRefOrGetter<Record<string, unknown>>;
    query?: MaybeRefOrGetter<Record<string, unknown>>;
    adapter?: ApiAdapter<any>;
}
```

### ApiRequestOptions

```typescript
interface ApiRequestOptions {
    headers?: MaybeRefOrGetter<Record<string, unknown>>;
    query?: MaybeRefOrGetter<Record<string, unknown>>;
    body?: MaybeRefOrGetter<unknown>;
    signal?: AbortSignal;
}
```

### EndpointDefinition

```typescript
interface EndpointDefinition<T = Record<string, unknown>> {
    method: EndpointMethod;
    url: string | ((params: T) => string);
    adapter?: ApiAdapter<any>;
}
```

### SchemaMeta

```typescript
interface SchemaMeta {
    indicator?: boolean;
    methods?: EndpointMethod[];
}
```

---

## Adapter Types

### ApiAdapter

Function signature for custom adapters.

```typescript
type ApiAdapter<T = unknown> = (request: ApiAdapterRequest) => Promise<ApiAdapterResponse<T>>;
```

### ApiAdapterRequest

Request data passed to adapters.

```typescript
interface ApiAdapterRequest {
    method: EndpointMethod;
    url: string;
    body?: unknown;
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}
```

### ApiAdapterResponse

Response structure returned by adapters.

```typescript
interface ApiAdapterResponse<T = unknown> {
    data: T;
    status?: number;
}
```

### ApiFetchAdapterOptions

Options for the built-in fetch adapter.

```typescript
interface ApiFetchAdapterOptions {
    baseURL?: string;
    timeout?: number;
    retry?: number | false;
    retryDelay?: number;
    retryStatusCodes?: number[];
    responseType?: "json" | "text" | "blob" | "arrayBuffer";
}
```

### DefineApiAdapter

Factory type for creating adapters.

```typescript
type DefineApiAdapter<T = unknown, O = unknown> = (options?: O) => ApiAdapter<T>;
```

---

## Error Classes

### ApiError

Base error class for all API errors.

```typescript
class ApiError extends Error {
    name: "ApiError";
    source: ApiErrorSource;
    method: string;
    url: string;
    message: string;
}
```

### ApiRequestError

Thrown when request fails before reaching server.

```typescript
class ApiRequestError extends ApiError {
    source: ApiErrorSource.REQUEST;
}
```

### ApiResponseError

Thrown when server returns an error response.

```typescript
class ApiResponseError extends ApiError {
    source: ApiErrorSource.RESPONSE;
}
```

### Error Handling

```typescript
import { ApiRequestError, ApiResponseError } from "@diphyx/harlemify";

try {
    await store.endpoint.getUnits();
} catch (error) {
    if (error instanceof ApiResponseError) {
        // Server error (4xx, 5xx)
    } else if (error instanceof ApiRequestError) {
        // Network/timeout error
    } else if (error.name === "AbortError") {
        // Request cancelled
    }
}
```

---

## Memory Methods

| Method      | Signature                                    | Description      |
| ----------- | -------------------------------------------- | ---------------- |
| `setUnit`   | `(unit: T \| null) => void`                  | Set single unit  |
| `setUnits`  | `(units: T[]) => void`                       | Set collection   |
| `editUnit`  | `(unit: PartialWithIndicator<T>) => void`    | Merge into unit  |
| `editUnits` | `(units: PartialWithIndicator<T>[]) => void` | Merge into units |
| `dropUnit`  | `(unit: PartialWithIndicator<T>) => void`    | Remove unit      |
| `dropUnits` | `(units: PartialWithIndicator<T>[]) => void` | Remove units     |

---

## Endpoint Methods

| Method        | Returns              | Description       |
| ------------- | -------------------- | ----------------- |
| `getUnit`     | `Promise<T>`         | Fetch single unit |
| `getUnits`    | `Promise<T[]>`       | Fetch collection  |
| `postUnit`    | `Promise<T>`         | Create single     |
| `postUnits`   | `Promise<T[]>`       | Create multiple   |
| `putUnit`     | `Promise<T>`         | Replace single    |
| `putUnits`    | `Promise<T[]>`       | Replace multiple  |
| `patchUnit`   | `Promise<Partial>`   | Update single     |
| `patchUnits`  | `Promise<Partial[]>` | Update multiple   |
| `deleteUnit`  | `Promise<boolean>`   | Delete single     |
| `deleteUnits` | `Promise<boolean>`   | Delete multiple   |

---

## Monitor Keys

Pattern: `{endpointName}Is{Status}`

```typescript
// Examples
monitor.getUnitIsIdle;
monitor.getUnitsIsPending;
monitor.postUnitIsSuccess;
monitor.deleteUnitsIsFailed;
```

---

## Module Options

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        api: {
            headers: Record<string, string>,  // Global headers
            query: Record<string, unknown>,   // Global query params
            adapter: {
                baseURL: string,              // Base URL
                timeout: number,              // Timeout in ms
                retry: number | false,        // Retry count
                retryDelay: number,           // Retry delay in ms
                retryStatusCodes: number[],   // Status codes to retry
                responseType: string,         // Response type
            },
        },
    },
});
```
