# Types

TypeScript interfaces, types, and error classes.

## Action Types

### ActionDefinition

```typescript
interface ActionDefinition<S> {
    endpoint: EndpointDefinition<S>;
    memory?: MemoryDefinition;
}
```

### ActionsConfig

```typescript
type ActionsConfig<S> = Record<string, ActionDefinition<S>>;
```

### ActionOptions

```typescript
interface ActionOptions {
    query?: Record<string, unknown>;   // Query parameters
    headers?: Record<string, string>;  // Additional headers
    body?: unknown;                    // Override request body
    signal?: AbortSignal;              // For cancellation
    validate?: boolean;                // Validate with Zod
    adapter?: ApiAdapter;              // Override adapter
}
```

### ActionStatus

```typescript
interface ActionStatus {
    current: () => EndpointStatus;
    pending: () => boolean;
    success: () => boolean;
    failed: () => boolean;
    idle: () => boolean;
}
```

Each property is a function that returns the current value. Call them directly in templates or scripts.

---

## Store Types

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

### StoreMemory

```typescript
interface StoreMemory<T, I extends keyof T> {
    set: (data: T | T[] | null) => void;
    edit: (data: Partial<T> | Partial<T>[]) => void;
    drop: (data: Partial<T> | Partial<T>[]) => void;
}
```

### StoreMonitor

```typescript
type StoreMonitor<A extends ActionsConfig<any>> = {
    [K in keyof A]: ActionStatus;
};
```

---

## Endpoint Types

### EndpointDefinition

```typescript
interface EndpointDefinition<S> {
    readonly method: EndpointMethod;
    readonly url: string | ((params: Partial<S>) => string);
    readonly adapter?: ApiAdapter<any>;
}
```

### EndpointChain

```typescript
interface EndpointChain<S> {
    readonly method: EndpointMethod;
    readonly url: EndpointUrl<S>;
    readonly adapter?: ApiAdapter<any>;
    withAdapter(adapter: ApiAdapter<any>): EndpointDefinition<S>;
}
```

---

## Memory Types

### MemoryDefinition

```typescript
interface MemoryDefinition {
    readonly on: "unit" | "units";
    readonly path: string[];
    readonly mutation?: "set" | "edit" | "drop" | "add";
    readonly position?: "first" | "last";
}
```

---

## Adapter Types

### ApiAdapter

```typescript
type ApiAdapter<T = unknown> = (
    request: ApiAdapterRequest
) => Promise<ApiAdapterResponse<T>>;
```

### ApiAdapterRequest

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

```typescript
interface ApiAdapterResponse<T = unknown> {
    data: T;
    status?: number;
}
```

### ApiFetchAdapterOptions

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

---

## Schema Types

### SchemaMeta

```typescript
interface SchemaMeta {
    indicator?: boolean;
    actions?: string[];
}
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

### EndpointStatus

```typescript
enum EndpointStatus {
    IDLE = "idle",
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed",
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

Thrown when request fails before reaching server (network error, timeout).

```typescript
class ApiRequestError extends ApiError {
    source: ApiErrorSource.REQUEST;
}
```

### ApiResponseError

Thrown when server returns an error response (4xx, 5xx).

```typescript
class ApiResponseError extends ApiError {
    source: ApiErrorSource.RESPONSE;
}
```

### Error Handling

```typescript
import { ApiRequestError, ApiResponseError } from "@diphyx/harlemify";

try {
    await listUser();
} catch (error) {
    if (error instanceof ApiResponseError) {
        // Server error (4xx, 5xx)
        console.error("Server error:", error.message);
    } else if (error instanceof ApiRequestError) {
        // Network/timeout error
        console.error("Network error:", error.message);
    } else if (error.name === "AbortError") {
        // Request cancelled
        console.log("Request was cancelled");
    } else {
        throw error;
    }
}
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
