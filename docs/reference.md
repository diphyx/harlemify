# API Reference

## Module Options

Configure harlemify in your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        api: {
            url: "https://api.example.com",
            timeout: 10000,
        },
    },
});
```

| Option        | Type     | Default     | Description                     |
| ------------- | -------- | ----------- | ------------------------------- |
| `api.url`     | `string` | `undefined` | Base URL for API requests       |
| `api.timeout` | `number` | `undefined` | Request timeout in milliseconds |

## createStore

Creates a new store with API integration and state management.

```typescript
createStore(name, schema, endpoints?, options?)
```

| Parameter            | Type                 | Description                         |
| -------------------- | -------------------- | ----------------------------------- |
| `name`               | `string`             | Unique store name                   |
| `schema`             | `z.ZodObject`        | Zod schema with field metadata      |
| `endpoints`          | `EndpointDefinition` | Endpoint definitions                |
| `options.api`        | `ApiOptions`         | Override API options for this store |
| `options.indicator`  | `string`             | Override the primary key field name |
| `options.hooks`      | `StoreHooks`         | Lifecycle hooks (before/after)      |
| `options.extensions` | `Extension[]`        | Harlem extensions                   |

### Returns

| Property              | Type          | Description                      |
| --------------------- | ------------- | -------------------------------- |
| `api`                 | `Function`    | API client getter                |
| `store`               | `HarlemStore` | Underlying Harlem store          |
| `memorizedUnit`       | `ComputedRef` | Single cached unit               |
| `memorizedUnits`      | `ComputedRef` | Cached unit collection           |
| `hasMemorizedUnits`   | `Function`    | Check if units exist in memory   |
| `endpointsStatus`     | `Object`      | Status getters for all endpoints |
| `setMemorizedUnit`    | `Mutation`    | Set single unit                  |
| `setMemorizedUnits`   | `Mutation`    | Set unit collection              |
| `editMemorizedUnit`   | `Mutation`    | Merge into single unit           |
| `editMemorizedUnits`  | `Mutation`    | Merge into units in collection   |
| `dropMemorizedUnit`   | `Mutation`    | Remove single unit               |
| `dropMemorizedUnits`  | `Mutation`    | Remove units from collection     |
| `patchEndpointMemory` | `Mutation`    | Update endpoint memory directly  |
| `purgeEndpointMemory` | `Mutation`    | Clear all endpoint memory        |
| `getUnit`             | `Action`      | Fetch single unit                |
| `getUnits`            | `Action`      | Fetch unit collection            |
| `postUnit`            | `Action`      | Create single unit               |
| `postUnits`           | `Action`      | Create multiple units            |
| `putUnit`             | `Action`      | Replace single unit              |
| `putUnits`            | `Action`      | Replace multiple units           |
| `patchUnit`           | `Action`      | Partially update single unit     |
| `patchUnits`          | `Action`      | Partially update multiple units  |
| `deleteUnit`          | `Action`      | Delete single unit               |
| `deleteUnits`         | `Action`      | Delete multiple units            |

## createApi

Creates a standalone API client.

```typescript
createApi(options?)
```

| Option    | Type                       | Description              |
| --------- | -------------------------- | ------------------------ |
| `url`     | `string`                   | Base URL                 |
| `timeout` | `number`                   | Request timeout in ms    |
| `headers` | `MaybeRefOrGetter<Record>` | Default request headers  |
| `query`   | `MaybeRefOrGetter<Record>` | Default query parameters |

### Methods

```typescript
const api = createApi({
    url: "https://api.example.com"
});

// GET request
await api.get<T>(url, options?)

// POST request
await api.post<T>(url, options?)

// PUT request
await api.put<T>(url, options?)

// PATCH request
await api.patch<T>(url, options?)

// DELETE request
await api.del<T>(url, options?)
```

## Enums

### ApiAction

```typescript
enum ApiAction {
    GET = "get",
    POST = "post",
    PUT = "put",
    PATCH = "patch",
    DELETE = "delete",
}
```

### ApiResponseType

```typescript
enum ApiResponseType {
    JSON = "json",
    TEXT = "text",
    BLOB = "blob",
    ARRAY_BUFFER = "arrayBuffer",
}
```

### ApiErrorSource

```typescript
enum ApiErrorSource {
    REQUEST = "request",
    RESPONSE = "response",
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

Used with `postUnits` to control where new items are added in memory.

```typescript
enum StoreMemoryPosition {
    FIRST = "first",
    LAST = "last",
}
```

| Value   | Description                              |
| ------- | ---------------------------------------- |
| `FIRST` | Add new items at the beginning (default) |
| `LAST`  | Add new items at the end                 |

```typescript
import { StoreMemoryPosition } from "@diphyx/harlemify";

// Add at beginning (default)
await postUnits([{ id: 0, name: "New" }]);

// Add at end
await postUnits([{ id: 0, name: "New" }], {
    position: StoreMemoryPosition.LAST,
});
```

## Types

### ApiOptions

```typescript
interface ApiOptions {
    url?: string;
    headers?: MaybeRefOrGetter<Record<string, unknown>>;
    query?: MaybeRefOrGetter<Record<string, unknown>>;
    timeout?: number;
}
```

### ApiRequestOptions

```typescript
interface ApiRequestOptions {
    action?: ApiAction;
    headers?: MaybeRefOrGetter<Record<string, unknown>>;
    query?: MaybeRefOrGetter<Record<string, unknown>>;
    body?: MaybeRefOrGetter<
        string | number | ArrayBuffer | FormData | Blob | Record<string, any>
    >;
    timeout?: number;
    responseType?: ApiResponseType;
    retry?: number | false;
    retryDelay?: number;
    retryStatusCodes?: number[];
    signal?: AbortSignal;
}
```

| Option             | Type               | Default     | Description                           |
| ------------------ | ------------------ | ----------- | ------------------------------------- |
| `action`           | `ApiAction`        | `GET`       | HTTP method                           |
| `headers`          | `MaybeRefOrGetter` | `undefined` | Request headers                       |
| `query`            | `MaybeRefOrGetter` | `undefined` | Query parameters                      |
| `body`             | `MaybeRefOrGetter` | `undefined` | Request body (POST, PUT, PATCH)       |
| `timeout`          | `number`           | `undefined` | Request timeout in milliseconds       |
| `responseType`     | `ApiResponseType`  | `json`      | Expected response format              |
| `retry`            | `number \| false`  | `undefined` | Number of retry attempts              |
| `retryDelay`       | `number`           | `undefined` | Delay between retries in milliseconds |
| `retryStatusCodes` | `number[]`         | `undefined` | HTTP status codes to retry on         |
| `signal`           | `AbortSignal`      | `undefined` | Signal for request cancellation       |

### StoreOptions

```typescript
interface StoreOptions {
    api?: ApiOptions;
    indicator?: string;
    hooks?: StoreHooks;
    extensions?: Extension<BaseState>[];
}
```

| Property     | Type          | Description                         |
| ------------ | ------------- | ----------------------------------- |
| `api`        | `ApiOptions`  | Override API options for this store |
| `indicator`  | `string`      | Override the primary key field name |
| `hooks`      | `StoreHooks`  | Lifecycle hooks for API operations  |
| `extensions` | `Extension[]` | Harlem extensions                   |

### StoreHooks

```typescript
interface StoreHooks {
    before?: () => Promise<void> | void;
    after?: (error?: Error) => Promise<void> | void;
}
```

| Property | Type                                       | Description                       |
| -------- | ------------------------------------------ | --------------------------------- |
| `before` | `() => Promise<void> \| void`              | Called before every API operation |
| `after`  | `(error?: Error) => Promise<void> \| void` | Called after every API operation  |

The `after` hook receives an `Error` parameter if the operation failed, or `undefined` if it succeeded.

### SchemaMeta

```typescript
interface SchemaMeta {
    indicator?: boolean;
    actions?: ApiAction[];
}
```

### EndpointDefinition

```typescript
interface EndpointDefinition<T = Record<string, unknown>> {
    action: ApiAction;
    url: string | ((params: T) => string);
}
```

When used with `createStore`, the type `T` is automatically inferred from your schema, providing full type safety for URL parameters:

```typescript
// params is typed as Partial<Product>
url: (params) => `/products/${params.id}`,
```

### EndpointMemory

```typescript
interface EndpointMemory {
    status: EndpointStatus;
}
```

## Error Classes

Harlemify provides structured error classes for handling API failures.

### ApiError (Base Class)

```typescript
class ApiError extends Error {
    name: "ApiError";
    source: ApiErrorSource;
    method: string;
    url: string;
    message: string;
}
```

| Property  | Type             | Description                        |
| --------- | ---------------- | ---------------------------------- |
| `name`    | `string`         | Always "ApiError"                  |
| `source`  | `ApiErrorSource` | Either "request" or "response"     |
| `method`  | `string`         | HTTP method used (GET, POST, etc.) |
| `url`     | `string`         | Request URL                        |
| `message` | `string`         | Error message                      |

### ApiRequestError

Thrown when a request fails before reaching the server (network error, timeout, abort, etc.).

```typescript
class ApiRequestError extends ApiError {
    source: ApiErrorSource.REQUEST; // Always "request"
}
```

### ApiResponseError

Thrown when the server returns an error response (4xx, 5xx status codes).

```typescript
class ApiResponseError extends ApiError {
    source: ApiErrorSource.RESPONSE; // Always "response"
}
```

### StoreConfigurationError

Thrown when the store fails to initialize (e.g., missing runtime config, used outside Nuxt context).

```typescript
class StoreConfigurationError extends Error {
    name: "StoreConfigurationError";
}
```

### Error Handling Example

```typescript
import { ApiRequestError, ApiResponseError } from "@diphyx/harlemify";

try {
    await getUnits();
} catch (error) {
    if (error instanceof ApiResponseError) {
        // Server returned an error (4xx, 5xx)
        console.error(`Response error: ${error.message}`);
        console.error(`Method: ${error.method}, URL: ${error.url}`);
    } else if (error instanceof ApiRequestError) {
        // Request failed (network, timeout, abort, etc.)
        console.error(`Request error: ${error.message}`);
    } else if (error.name === "AbortError") {
        // Request was cancelled
        console.log("Request was cancelled");
    }
}
```

## Endpoint Status Keys

Each endpoint generates four status getter keys:

```typescript
// For Endpoint.GET_UNITS:
endpointsStatus.getUnitsIsIdle; // ComputedRef<boolean>
endpointsStatus.getUnitsIsPending; // ComputedRef<boolean>
endpointsStatus.getUnitsIsSuccess; // ComputedRef<boolean>
endpointsStatus.getUnitsIsFailed; // ComputedRef<boolean>

// For Endpoint.POST_UNIT:
endpointsStatus.postUnitIsIdle; // ComputedRef<boolean>
endpointsStatus.postUnitIsPending; // ComputedRef<boolean>
endpointsStatus.postUnitIsSuccess; // ComputedRef<boolean>
endpointsStatus.postUnitIsFailed; // ComputedRef<boolean>

// Pattern: {endpointName}Is{Status}
```

## Action Options

All store actions accept options extending `ApiRequestOptions`:

```typescript
// GET actions (no body)
await getUnit(unit?, options?: Omit<ApiActionOptions<ApiAction.GET>, "body">)
await getUnits(options?: Omit<ApiActionOptions<ApiAction.GET>, "body">)

// POST actions
await postUnit(unit, options?: ApiActionOptions<ApiAction.POST> & { validate?: boolean })
await postUnits(units, options?: ApiActionOptions<ApiAction.POST> & { validate?: boolean; position?: StoreMemoryPosition })

// PUT actions
await putUnit(unit, options?: ApiActionOptions<ApiAction.PUT> & { validate?: boolean })
await putUnits(units, options?: ApiActionOptions<ApiAction.PUT> & { validate?: boolean })

// PATCH actions
await patchUnit(unit, options?: ApiActionOptions<ApiAction.PATCH> & { validate?: boolean })
await patchUnits(units, options?: ApiActionOptions<ApiAction.PATCH> & { validate?: boolean })

// DELETE actions (no body)
await deleteUnit(unit, options?: Omit<ApiActionOptions<ApiAction.DELETE>, "body">)
await deleteUnits(units, options?: Omit<ApiActionOptions<ApiAction.DELETE>, "body">)
```

| Option     | Type                  | Actions          | Description                          |
| ---------- | --------------------- | ---------------- | ------------------------------------ |
| `headers`  | `MaybeRefOrGetter`    | All              | Additional request headers           |
| `query`    | `MaybeRefOrGetter`    | All              | Query parameters                     |
| `body`     | `MaybeRefOrGetter`    | POST, PUT, PATCH | Override auto-generated request body |
| `timeout`  | `number`              | All              | Request timeout in milliseconds      |
| `signal`   | `AbortSignal`         | All              | Signal for request cancellation      |
| `validate` | `boolean`             | POST, PUT, PATCH | Validate against schema before send  |
| `position` | `StoreMemoryPosition` | postUnits only   | Where to add new items in memory     |
