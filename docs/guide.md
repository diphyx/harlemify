# Guide

## Concepts

### Schema

A **schema** defines the structure and field types of your units using [Zod](https://zod.dev/). It describes what fields a unit has, their data types, and provides TypeScript type inference.

Schema fields can have metadata:

| Meta Property | Description                                                     |
| ------------- | --------------------------------------------------------------- |
| `indicator`   | Marks the field as primary key (used to identify units)         |
| `methods`     | Specifies which HTTP methods include this field in request body |

```typescript
import { z } from "zod";
import { EndpointMethod } from "@diphyx/harlemify";

const UserSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PUT, EndpointMethod.PATCH],
    }),
    email: z.string().meta({
        methods: [EndpointMethod.POST],
    }),
    createdAt: z.string(), // No meta = not sent in any request body
});
```

### Unit

A **unit** is a single data entity managed by the store. It represents one record from your API (e.g., a user, a product, an order).

- `unit` refers to a single entity
- `units` refers to a collection of entities

### Memory

**Memory** is the local state where units are stored. The store maintains two separate memory spaces:

| Property | Description                 |
| -------- | --------------------------- |
| `unit`   | Holds a single unit         |
| `units`  | Holds a collection of units |

### Endpoint

An **endpoint** maps a store action to an API URL:

| Property  | Description                                     |
| --------- | ----------------------------------------------- |
| `method`  | The HTTP method (GET, POST, PUT, PATCH, DELETE) |
| `url`     | Static string or function with parameters       |
| `adapter` | Optional custom adapter for this endpoint       |

### Monitor

Each endpoint tracks its request status via the `monitor` property:

| Status    | Description                    |
| --------- | ------------------------------ |
| `IDLE`    | No request made yet            |
| `PENDING` | Request in progress            |
| `SUCCESS` | Request completed successfully |
| `FAILED`  | Request failed                 |

---

## Creating a Store

### Collection Store

Use `*Units` endpoints for data that represents a list/collection:

```typescript
import { z } from "zod";
import { createStore, Endpoint, EndpointMethod } from "@diphyx/harlemify";

const ProductSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
    price: z.number().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
});

export type Product = z.infer<typeof ProductSchema>;

export const productStore = createStore("product", ProductSchema, {
    [Endpoint.GET_UNITS]: {
        method: EndpointMethod.GET,
        url: "/products",
    },
    [Endpoint.POST_UNITS]: {
        method: EndpointMethod.POST,
        url: "/products",
    },
    [Endpoint.PATCH_UNITS]: {
        method: EndpointMethod.PATCH,
        url: (params) => `/products/${params.id}`,
    },
    [Endpoint.DELETE_UNITS]: {
        method: EndpointMethod.DELETE,
        url: (params) => `/products/${params.id}`,
    },
});
```

### Singleton Store

Use `*Unit` endpoints for singular data (config, settings, current user):

```typescript
import { z } from "zod";
import { createStore, Endpoint, EndpointMethod } from "@diphyx/harlemify";

const ConfigSchema = z.object({
    id: z.number().meta({ indicator: true }),
    theme: z.enum(["light", "dark"]).meta({
        methods: [EndpointMethod.PATCH],
    }),
    language: z.string().meta({
        methods: [EndpointMethod.PATCH],
    }),
});

export type Config = z.infer<typeof ConfigSchema>;

export const configStore = createStore("config", ConfigSchema, {
    [Endpoint.GET_UNIT]: {
        method: EndpointMethod.GET,
        url: "/config",
    },
    [Endpoint.PATCH_UNIT]: {
        method: EndpointMethod.PATCH,
        url: "/config",
    },
});
```

### Store Structure

Each store returns:

| Property    | Description                          |
| ----------- | ------------------------------------ |
| `store`     | Underlying Harlem store instance     |
| `alias`     | Entity name aliases (unit and units) |
| `indicator` | The primary key field name           |
| `unit`      | Single unit state (ComputedRef)      |
| `units`     | Collection state (ComputedRef)       |
| `memory`    | Memory mutation methods              |
| `endpoint`  | API endpoint methods                 |
| `monitor`   | Endpoint status flags                |

---

## Using in Components

### Collection Example

```vue
<script setup lang="ts">
import { productStore } from "~/stores/product";

const { units, endpoint, monitor } = productStore;

await endpoint.getUnits();

async function createProduct() {
    await endpoint.postUnits([{ id: 0, name: "New Product", price: 99.99 }]);
}

async function updatePrice(id: number, price: number) {
    await endpoint.patchUnits([{ id, price }]);
}

async function removeProduct(id: number) {
    await endpoint.deleteUnits([{ id }]);
}
</script>

<template>
    <div>
        <button @click="createProduct">Add Product</button>

        <div v-if="monitor.getUnitsIsPending.value">Loading...</div>

        <ul v-else>
            <li v-for="product in units.value" :key="product.id">
                {{ product.name }} - ${{ product.price }}
                <button @click="updatePrice(product.id, product.price + 10)">+$10</button>
                <button @click="removeProduct(product.id)">Delete</button>
            </li>
        </ul>
    </div>
</template>
```

### Singleton Example

```vue
<script setup lang="ts">
import { configStore } from "~/stores/config";

const { unit: config, endpoint } = configStore;

await endpoint.getUnit();

async function toggleTheme() {
    const newTheme = config.value?.theme === "dark" ? "light" : "dark";
    await endpoint.patchUnit({ id: config.value!.id, theme: newTheme });
}
</script>

<template>
    <div v-if="config">
        <p>Theme: {{ config.theme }}</p>
        <button @click="toggleTheme">Toggle Theme</button>
    </div>
</template>
```

---

## Endpoint Methods

All endpoint methods are async and update memory automatically.

### GET

```typescript
// Fetch single unit → stores in unit
await store.endpoint.getUnit({ id: 1 });

// Fetch collection → stores in units
await store.endpoint.getUnits();
```

### POST

```typescript
// Create single unit → stores in unit
await store.endpoint.postUnit({ id: 0, name: "New" });

// Create multiple → adds to units (beginning by default)
await store.endpoint.postUnits([{ id: 0, name: "New" }]);

// Add at end instead
await store.endpoint.postUnits([{ id: 0, name: "New" }], {
    position: StoreMemoryPosition.LAST,
});
```

### PUT

```typescript
// Replace single unit entirely
await store.endpoint.putUnit({ id: 1, name: "Replaced", price: 100 });

// Replace multiple units
await store.endpoint.putUnits([
    { id: 1, name: "Replaced 1", price: 100 },
    { id: 2, name: "Replaced 2", price: 200 },
]);
```

### PATCH

```typescript
// Partially update single unit → merges into unit
await store.endpoint.patchUnit({ id: 1, price: 199 });

// Partially update multiple → merges into units
await store.endpoint.patchUnits([
    { id: 1, price: 99 },
    { id: 2, price: 149 },
]);
```

### DELETE

```typescript
// Delete single unit → removes from unit
await store.endpoint.deleteUnit({ id: 1 });

// Delete multiple → removes from units
await store.endpoint.deleteUnits([{ id: 1 }, { id: 2 }]);
```

### Options

All endpoint methods accept options:

| Option     | Type                  | Description                        |
| ---------- | --------------------- | ---------------------------------- |
| `query`    | `MaybeRefOrGetter`    | Query parameters                   |
| `headers`  | `MaybeRefOrGetter`    | Additional headers                 |
| `body`     | `MaybeRefOrGetter`    | Override request body              |
| `validate` | `boolean`             | Validate with Zod before send      |
| `position` | `StoreMemoryPosition` | Where to add new items (postUnits) |
| `signal`   | `AbortSignal`         | For request cancellation           |

```typescript
await store.endpoint.getUnits({
    query: { page: 1, limit: 10 },
    headers: { "X-Custom": "value" },
});

await store.endpoint.postUnits([{ id: 0, name: "Test" }], {
    validate: true,
});
```

---

## Memory Mutations

Direct state mutations without API calls:

```typescript
const { memory } = productStore;

// Set
memory.setUnit({ id: 1, name: "Product" });
memory.setUnits([{ id: 1, name: "Product" }]);
memory.setUnit(null); // Clear

// Edit (merge partial data)
memory.editUnit({ id: 1, name: "Updated" });
memory.editUnits([{ id: 1, name: "Updated" }]);

// Drop (remove by indicator)
memory.dropUnit({ id: 1 });
memory.dropUnits([{ id: 1 }, { id: 2 }]);
```

### Temporary Local State

Use mutations for UI state that doesn't need API calls:

```typescript
import { productStore } from "~/stores/product";
import type { Product } from "~/stores/product";

const { unit: selectedProduct, units, memory } = productStore;

function openModal(product: Product) {
    memory.setUnit(product);
}

function closeModal() {
    memory.setUnit(null);
}
```

---

## Monitor (Status Flags)

```typescript
const { monitor } = userStore;

monitor.getUnitsIsPending.value; // boolean
monitor.getUnitsIsSuccess.value; // boolean
monitor.getUnitsIsFailed.value; // boolean
monitor.getUnitsIsIdle.value; // boolean

// Pattern: {endpointName}Is{Status}
monitor.postUnitIsPending.value;
monitor.deleteUnitsIsSuccess.value;
```

---

## useStoreAlias

Provides entity-named access to store properties:

```typescript
import { userStore } from "~/stores/user";

const {
    // State
    user, // unit
    users, // units

    // Memory
    setUser,
    setUsers,
    editUser,
    dropUsers,

    // Endpoints
    getUser,
    getUsers,
    postUsers,
    patchUsers,
    deleteUsers,

    // Monitor
    getUsersIsPending,
    getUsersIsSuccess,
} = useStoreAlias(userStore);

await getUsers();
setUser({ id: 1, name: "John", email: "john@test.com" });
```

Entity names are automatically pluralized:

- `post` → `posts`
- `user` → `users`
- `category` → `categories`

---

## Validation

Enable Zod validation before sending:

```typescript
const { endpoint } = productStore;

try {
    await endpoint.postUnits([{ id: 0, name: "", price: -10 }], { validate: true });
} catch (error) {
    // ZodError thrown before request
}
```

---

## Request Cancellation

```typescript
const controller = new AbortController();

const promise = store.endpoint.getUnits({ signal: controller.signal });

// Cancel later
controller.abort();

try {
    await promise;
} catch (error) {
    if (error.name === "AbortError") {
        // Request was cancelled
    }
}
```

---

## Lifecycle Hooks

Execute code before/after every API operation:

```typescript
export const userStore = createStore("user", UserSchema, endpoints, {
    hooks: {
        before: async () => {
            // Show loading indicator
        },
        after: async (error) => {
            // Hide loading indicator, handle error if present
        },
    },
});
```

---

## Custom Adapters

Harlemify uses adapters to handle HTTP requests. You can customize request behavior at different levels.

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
    responseType: "json",
});
```

### Adapter Options

| Option             | Type              | Description                                   |
| ------------------ | ----------------- | --------------------------------------------- |
| `baseURL`          | `string`          | Base URL for requests                         |
| `timeout`          | `number`          | Request timeout in ms                         |
| `retry`            | `number \| false` | Number of retries (false to disable)          |
| `retryDelay`       | `number`          | Delay between retries in ms                   |
| `retryStatusCodes` | `number[]`        | HTTP status codes to retry                    |
| `responseType`     | `string`          | Response type (json, text, blob, arrayBuffer) |

### Custom Adapter

Create a fully custom adapter for advanced scenarios like streaming or custom authentication:

```typescript
import type { ApiAdapter, ApiAdapterRequest } from "@diphyx/harlemify";

const customAdapter: ApiAdapter<MyType> = async (request: ApiAdapterRequest) => {
    console.log(`Fetching: ${request.url}`);

    const response = await fetch(`https://api.example.com${request.url}`, {
        method: request.method,
        headers: request.headers as HeadersInit,
        body: request.body ? JSON.stringify(request.body) : undefined,
    });

    const data = await response.json();
    return { data, status: response.status };
};
```

### Store-Level Adapter

Apply an adapter to all endpoints in a store:

```typescript
import { defineApiAdapter } from "@diphyx/harlemify";

const storeAdapter = defineApiAdapter({
    baseURL: "/api",
    timeout: 5000,
});

export const userStore = createStore(
    "user",
    UserSchema,
    {
        [Endpoint.GET_UNITS]: { method: EndpointMethod.GET, url: "/users" },
        [Endpoint.POST_UNITS]: { method: EndpointMethod.POST, url: "/users" },
    },
    {
        adapter: storeAdapter, // Used for all endpoints
    },
);
```

### Endpoint-Level Adapter

Override the adapter for specific endpoints:

```typescript
import { defineApiAdapter } from "@diphyx/harlemify";
import type { ApiAdapter } from "@diphyx/harlemify";

// Custom adapter with longer timeout for detail requests
const detailAdapter: ApiAdapter<User> = async (request) => {
    const data = await $fetch<User>(request.url, {
        baseURL: "/api",
        method: request.method,
        headers: request.headers as HeadersInit,
        query: request.query,
        timeout: 30000, // Longer timeout
    });
    return { data };
};

export const userStore = createStore("user", UserSchema, {
    [Endpoint.GET_UNIT]: {
        method: EndpointMethod.GET,
        url: (params) => `/users/${params.id}`,
        adapter: detailAdapter, // Custom adapter for this endpoint
    },
    [Endpoint.GET_UNITS]: {
        method: EndpointMethod.GET,
        url: "/users",
        // Uses store or global adapter
    },
});
```

---

## API Configuration

### Global (nuxt.config.ts)

```typescript
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        api: {
            headers: {
                "X-Custom-Header": "value",
            },
            query: {
                apiKey: "your-api-key",
            },
            adapter: {
                baseURL: "https://api.example.com",
                timeout: 10000,
                retry: 3,
            },
        },
    },
});
```

### Per-Store

```typescript
export const externalStore = createStore("external", Schema, endpoints, {
    adapter: defineApiAdapter({
        baseURL: "https://external-api.example.com",
        timeout: 30000,
    }),
});
```

---

## Standalone API Client

Use without a store:

```typescript
import { createApi, defineApiAdapter } from "@diphyx/harlemify";

const api = createApi({
    adapter: defineApiAdapter({
        baseURL: "https://api.example.com",
        timeout: 5000,
    }),
});

const users = await api.get("/users", { query: { page: 1 } });
const newUser = await api.post("/users", { body: { name: "John" } });
await api.put("/users/1", { body: { name: "John Doe" } });
await api.patch("/users/1", { body: { name: "Johnny" } });
await api.del("/users/1");
```

---

## Custom Indicator

Use a field other than `id` as primary key:

```typescript
const DocumentSchema = z.object({
    uuid: z.string().meta({ indicator: true }),
    title: z.string().meta({ methods: [EndpointMethod.POST] }),
});

// Indicator auto-detected from schema
export const documentStore = createStore("document", DocumentSchema, {
    [Endpoint.DELETE_UNITS]: {
        method: EndpointMethod.DELETE,
        url: (p) => `/documents/${p.uuid}`,
    },
});
```

Or override in options:

```typescript
export const store = createStore("item", Schema, endpoints, {
    indicator: "uuid",
});
```
