# Custom Adapters

Adapters handle HTTP requests. Customize them at different levels for advanced use cases.

## Adapter Priority

Custom adapters are resolved in order (highest to lowest):

1. **Call-time** - `options.adapter` in action call
2. **Endpoint** - `Endpoint.get(url).withAdapter()`
3. **Store** - `createStore(..., { adapter })`
4. **Default** - Built-in fetch adapter

## Module Options

Module-level config sets **adapter options** (not custom adapters):

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        api: {
            headers: { "X-API-Key": "your-key" },
            query: { version: "v1" },
            adapter: {
                baseURL: "https://api.example.com",
                timeout: 10000,
            },
        },
    },
});
```

These options apply to the default fetch adapter globally.

## Built-in Adapter

Use `defineApiAdapter` for common configurations:

```typescript
import { defineApiAdapter } from "@diphyx/harlemify";

const adapter = defineApiAdapter({
    baseURL: "/api",
    timeout: 5000,
    retry: 3,
    retryDelay: 1000,
    retryStatusCodes: [500, 502, 503],
    responseType: "json",
});
```

| Option | Type | Description |
|--------|------|-------------|
| `baseURL` | `string` | Base URL for requests |
| `timeout` | `number` | Timeout in milliseconds |
| `retry` | `number \| false` | Retry attempts |
| `retryDelay` | `number` | Delay between retries |
| `retryStatusCodes` | `number[]` | Status codes to retry |
| `responseType` | `string` | json, text, blob, arrayBuffer |

## Custom Adapter

Create a fully custom adapter:

```typescript
import type { ApiAdapter, ApiAdapterRequest } from "@diphyx/harlemify";

const customAdapter: ApiAdapter<User> = async (request: ApiAdapterRequest) => {
    const response = await fetch(`https://api.example.com${request.url}`, {
        method: request.method,
        headers: request.headers as HeadersInit,
        body: request.body ? JSON.stringify(request.body) : undefined,
    });

    const data = await response.json();
    return { data, status: response.status };
};
```

## Usage Levels

### Store-Level

Apply to all actions in a store:

```typescript
const storeAdapter = defineApiAdapter({
    baseURL: "/api/v2",
    timeout: 30000,
});

export const userStore = createStore("user", userSchema, userActions, {
    adapter: storeAdapter,
});
```

### Endpoint-Level

Override for specific endpoints:

```typescript
const slowAdapter = defineApiAdapter({ timeout: 60000 });

const userActions = {
    get: {
        endpoint: Endpoint.get<User>((p) => `/users/${p.id}`).withAdapter(slowAdapter),
        memory: Memory.unit(),
    },
    list: {
        endpoint: Endpoint.get("/users"),  // Uses store/module adapter
        memory: Memory.units(),
    },
};
```

### Call-Time

Override for a single call:

```typescript
const { exportUser } = useStoreAlias(userStore);

await exportUser(
    { id: 1 },
    {
        adapter: streamingAdapter,
    }
);
```

## Advanced Examples

### Authentication

```typescript
const authAdapter: ApiAdapter<any> = async (request) => {
    const token = localStorage.getItem("auth_token");

    const data = await $fetch(request.url, {
        baseURL: "/api",
        method: request.method,
        headers: {
            ...request.headers,
            Authorization: token ? `Bearer ${token}` : "",
        },
        body: request.body,
        query: request.query,
    });

    return { data };
};
```

### File Upload

```typescript
const uploadAdapter: ApiAdapter<UploadResult> = async (request) => {
    const formData = request.body as FormData;

    const response = await fetch(`/api${request.url}`, {
        method: "POST",
        body: formData,
    });

    return { data: await response.json(), status: response.status };
};

const fileActions = {
    upload: {
        endpoint: Endpoint.post("/files").withAdapter(uploadAdapter),
        memory: Memory.units().add(),
    },
};
```

### Progress Tracking

```typescript
function createProgressAdapter(onProgress: (percent: number) => void): ApiAdapter<any> {
    return async (request) => {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener("progress", (e) => {
                if (e.lengthComputable) {
                    onProgress((e.loaded / e.total) * 100);
                }
            });

            xhr.addEventListener("load", () => {
                resolve({ data: JSON.parse(xhr.responseText), status: xhr.status });
            });

            xhr.addEventListener("error", reject);

            xhr.open(request.method.toUpperCase(), `/api${request.url}`);
            xhr.send(request.body as any);
        });
    };
}

// Usage
await uploadFile(
    { file },
    {
        adapter: createProgressAdapter((percent) => {
            progress.value = percent;
        }),
    }
);
```

### Streaming

```typescript
const streamingAdapter: ApiAdapter<string> = async (request) => {
    const response = await fetch(`/api${request.url}`, {
        method: request.method,
        headers: request.headers as HeadersInit,
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let result = "";

    while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        result += decoder.decode(value);
    }

    return { data: result, status: response.status };
};
```

## Type Reference

```typescript
type ApiAdapter<T = unknown> = (
    request: ApiAdapterRequest
) => Promise<ApiAdapterResponse<T>>;

interface ApiAdapterRequest {
    method: EndpointMethod;
    url: string;
    body?: unknown;
    query?: Record<string, unknown>;
    headers?: Record<string, string>;
    signal?: AbortSignal;
}

interface ApiAdapterResponse<T> {
    data: T;
    status?: number;
}
```
