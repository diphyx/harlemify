# Harlemify

> Schema-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

![Harlemify](https://raw.githubusercontent.com/diphyx/harlemify/main/docs/_media/icon.svg)

Define your data schema once with Zod, and Harlemify handles the rest: type-safe API calls, reactive state, request monitoring, and automatic memory management. Your schema becomes the single source of truth for types, validation, and API payloads.

## Features

- **Schema-Driven** - Zod schema defines types, validation, and API payloads
- **Custom Adapters** - Pluggable HTTP adapters for custom request handling
- **Reactive Memory** - Unit and collection caching with Vue reactivity
- **Request Monitoring** - Track pending, success, and failed states
- **SSR Support** - Server-side rendering via Harlem SSR plugin

## Installation

```bash
npm install @diphyx/harlemify
```

## Quick Start

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        api: {
            adapter: {
                baseURL: "https://api.example.com",
                timeout: 10000,
            },
        },
    },
});
```

```typescript
// stores/user.ts
import { z } from "zod";
import { createStore, Endpoint, EndpointMethod } from "@diphyx/harlemify";

const UserSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
});

export type User = z.infer<typeof UserSchema>;

export const userStore = createStore("user", UserSchema, {
    [Endpoint.GET_UNITS]: { method: EndpointMethod.GET, url: "/users" },
    [Endpoint.POST_UNITS]: { method: EndpointMethod.POST, url: "/users" },
    [Endpoint.PATCH_UNITS]: { method: EndpointMethod.PATCH, url: (p) => `/users/${p.id}` },
    [Endpoint.DELETE_UNITS]: { method: EndpointMethod.DELETE, url: (p) => `/users/${p.id}` },
});
```

## Custom Adapters

Harlemify supports custom HTTP adapters for advanced use cases like streaming responses, file uploads with progress, or custom authentication.

### Adapter Hierarchy

Adapters are resolved in the following order (highest to lowest priority):

1. **Endpoint adapter** - Per-endpoint custom adapter
2. **Store adapter** - Store-level adapter option
3. **Module adapter** - Global config in `nuxt.config.ts`
4. **Default adapter** - Built-in fetch adapter

### Built-in Adapter

Use `defineApiAdapter` to create an adapter with custom options:

```typescript
import { defineApiAdapter } from "@diphyx/harlemify";

const customAdapter = defineApiAdapter({
    baseURL: "/api",
    timeout: 5000,
    retry: 3,
    retryDelay: 1000,
    retryStatusCodes: [500, 502, 503],
});
```

### Custom Adapter

Create a fully custom adapter for advanced scenarios:

```typescript
import type { ApiAdapter, ApiAdapterRequest } from "@diphyx/harlemify";

const streamingAdapter: ApiAdapter<MyType> = async (request: ApiAdapterRequest) => {
    // Custom fetch logic with streaming, progress, etc.
    const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(request.body),
    });

    const data = await response.json();
    return { data, status: response.status };
};
```

### Using Adapters

**Store-level adapter:**

```typescript
export const userStore = createStore(
    "user",
    UserSchema,
    {
        [Endpoint.GET_UNITS]: { method: EndpointMethod.GET, url: "/users" },
    },
    {
        adapter: customAdapter, // Used for all endpoints in this store
    },
);
```

**Endpoint-level adapter:**

```typescript
export const userStore = createStore("user", UserSchema, {
    [Endpoint.GET_UNIT]: {
        method: EndpointMethod.GET,
        url: (p) => `/users/${p.id}`,
        adapter: detailAdapter, // Custom adapter for this endpoint only
    },
    [Endpoint.GET_UNITS]: {
        method: EndpointMethod.GET,
        url: "/users",
        // Uses store or global adapter
    },
});
```

## Why Harlemify?

|                 |                                                   |
| --------------- | ------------------------------------------------- |
| **Type-Safe**   | Full TypeScript support with Zod schema inference |
| **Declarative** | Define schema once, derive everything else        |
| **Reactive**    | Powered by Vue's reactivity through Harlem        |
| **Extensible**  | Custom adapters for any HTTP requirement          |

## Documentation

Full documentation available at [https://diphyx.github.io/harlemify/](https://diphyx.github.io/harlemify/)

## License

MIT
