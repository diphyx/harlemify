# API Reference

## Module Options

Configure harlemify in your `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
    modules: ["harlemify"],
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
| `options.extensions` | `Extension[]`        | Harlem extensions                   |

### Returns

| Property             | Type          | Description                      |
| -------------------- | ------------- | -------------------------------- |
| `api`                | `ApiClient`   | API client instance              |
| `store`              | `HarlemStore` | Underlying Harlem store          |
| `memorizedUnit`      | `ComputedRef` | Single cached unit               |
| `memorizedUnits`     | `ComputedRef` | Cached unit collection           |
| `hasMemorizedUnits`  | `Function`    | Check if units exist in memory   |
| `endpointsStatus`    | `Object`      | Status getters for all endpoints |
| `setMemorizedUnit`   | `Mutation`    | Set single unit                  |
| `setMemorizedUnits`  | `Mutation`    | Set unit collection              |
| `editMemorizedUnit`  | `Mutation`    | Merge into single unit           |
| `editMemorizedUnits` | `Mutation`    | Merge into units in collection   |
| `dropMemorizedUnit`  | `Mutation`    | Remove single unit               |
| `dropMemorizedUnits` | `Mutation`    | Remove units from collection     |
| `getUnit`            | `Action`      | Fetch single unit                |
| `getUnits`           | `Action`      | Fetch unit collection            |
| `postUnit`           | `Action`      | Create single unit               |
| `postUnits`          | `Action`      | Create multiple units            |
| `putUnit`            | `Action`      | Replace single unit              |
| `putUnits`           | `Action`      | Replace multiple units           |
| `patchUnit`          | `Action`      | Partially update single unit     |
| `patchUnits`         | `Action`      | Partially update multiple units  |
| `deleteUnit`         | `Action`      | Delete single unit               |
| `deleteUnits`        | `Action`      | Delete multiple units            |

## createApi

Creates a standalone API client.

```typescript
createApi(options?)
```

| Option    | Type                       | Description           |
| --------- | -------------------------- | --------------------- |
| `url`     | `string`                   | Base URL              |
| `timeout` | `number`                   | Request timeout in ms |
| `headers` | `MaybeRefOrGetter<Record>` | Request headers       |

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

## Types

### SchemaMeta

```typescript
interface SchemaMeta {
    indicator?: boolean;
    actions?: ApiAction[];
}
```

### EndpointDefinition

```typescript
interface EndpointDefinition {
    action: ApiAction;
    url: string | ((params: Record<string, unknown>) => string);
}
```

### ApiRequestOptions

```typescript
interface ApiRequestOptions {
    headers?: MaybeRefOrGetter<Record<string, unknown>>;
    query?: MaybeRefOrGetter<Record<string, unknown>>;
    body?: MaybeRefOrGetter<any>;
    timeout?: number;
}
```

## Errors

### ApiRequestError

Thrown when a request fails before reaching the server.

```typescript
class ApiRequestError extends ApiError {
    method: string;
    url: string;
    message: string;
}
```

### ApiResponseError

Thrown when the server returns an error response.

```typescript
class ApiResponseError extends ApiError {
    status: number;
    statusText: string;
    data: unknown;
}
```
