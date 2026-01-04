# Examples

## Basic CRUD Store

```typescript
// stores/product.ts
import { z, createStore, Endpoint, ApiAction } from "harlemify";

const ProductSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PUT, ApiAction.PATCH],
    }),
    price: z.number().meta({
        actions: [ApiAction.POST, ApiAction.PUT, ApiAction.PATCH],
    }),
    description: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PUT],
    }),
});

export const productStore = createStore("product", ProductSchema, {
    [Endpoint.GET_UNIT]: {
        action: ApiAction.GET,
        url: (params) => `/products/${params.id}`,
    },
    [Endpoint.GET_UNITS]: {
        action: ApiAction.GET,
        url: "/products",
    },
    [Endpoint.POST_UNIT]: {
        action: ApiAction.POST,
        url: "/products",
    },
    [Endpoint.PUT_UNIT]: {
        action: ApiAction.PUT,
        url: (params) => `/products/${params.id}`,
    },
    [Endpoint.PATCH_UNIT]: {
        action: ApiAction.PATCH,
        url: (params) => `/products/${params.id}`,
    },
    [Endpoint.DELETE_UNIT]: {
        action: ApiAction.DELETE,
        url: (params) => `/products/${params.id}`,
    },
});
```

## Using in a Component

```vue
<script setup lang="ts">
import { productStore } from "~/stores/product";

const {
    memorizedUnits,
    endpointsStatus,
    getUnits,
    postUnit,
    patchUnit,
    deleteUnit,
} = productStore;

// Fetch all products
await getUnits();

// Create a new product
async function createProduct() {
    await postUnit({
        id: 0,
        name: "New Product",
        price: 99.99,
        description: "A great product",
    });
}

// Update product price
async function updatePrice(id: number, price: number) {
    await patchUnit({ id, price });
}

// Delete a product
async function removeProduct(id: number) {
    await deleteUnit({ id });
}
</script>

<template>
    <div>
        <button @click="createProduct">Add Product</button>

        <div v-if="endpointsStatus.getUnitsIsPending.value">Loading...</div>

        <ul v-else>
            <li v-for="product in memorizedUnits.value" :key="product.id">
                {{ product.name }} - ${{ product.price }}
                <button @click="updatePrice(product.id, product.price + 10)">
                    +$10
                </button>
                <button @click="removeProduct(product.id)">Delete</button>
            </li>
        </ul>
    </div>
</template>
```

## With Validation

```typescript
import { productStore } from "~/stores/product";

const { postUnit, patchUnit } = productStore;

// Validate before creating
try {
    await postUnit(
        { id: 0, name: "", price: -10, description: "Test" },
        { validate: true },
    );
} catch (error) {
    // ZodError: name must be non-empty, price must be positive
    console.error(error);
}

// Validate before patching
try {
    await patchUnit({ id: 1, price: -5 }, { validate: true });
} catch (error) {
    // ZodError: price must be positive
    console.error(error);
}
```

## Dynamic Headers with Auth Token

```typescript
import { ref } from "vue";
import { z, createStore, Endpoint, ApiAction } from "harlemify";

const token = ref<string | null>(null);

const UserSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({ actions: [ApiAction.PUT] }),
});

export const userStore = createStore(
    "user",
    UserSchema,
    {
        [Endpoint.GET_UNIT]: {
            action: ApiAction.GET,
            url: "/me",
        },
        [Endpoint.PUT_UNIT]: {
            action: ApiAction.PUT,
            url: "/me",
        },
    },
    {
        api: {
            headers: {
                Authorization: () =>
                    token.value ? `Bearer ${token.value}` : "",
            },
        },
    },
);

// Login and set token
export function login(newToken: string) {
    token.value = newToken;
}

// Logout and clear token
export function logout() {
    token.value = null;
}
```

## Standalone API Client

```typescript
import { createApi } from "harlemify";

const api = createApi({
    url: "https://api.example.com",
    timeout: 5000,
    headers: {
        "Content-Type": "application/json",
    },
});

// GET request with query params
const users = await api.get("/users", {
    query: { page: 1, limit: 10 },
});

// POST request with body
const newUser = await api.post("/users", {
    body: { name: "John", email: "john@example.com" },
});

// PUT request
await api.put("/users/1", {
    body: { name: "John Doe" },
});

// PATCH request
await api.patch("/users/1", {
    body: { name: "Johnny" },
});

// DELETE request
await api.del("/users/1");
```

## Memory Manipulation

```typescript
import { userStore } from "~/stores/user";

const {
    memorizedUnit,
    memorizedUnits,
    setMemorizedUnit,
    setMemorizedUnits,
    editMemorizedUnit,
    editMemorizedUnits,
    dropMemorizedUnit,
    dropMemorizedUnits,
    hasMemorizedUnits,
} = userStore;

// Set a single unit directly
setMemorizedUnit({ id: 1, name: "John" });

// Clear single unit
setMemorizedUnit(null);

// Set multiple units
setMemorizedUnits([
    { id: 1, name: "John" },
    { id: 2, name: "Jane" },
]);

// Edit a single unit (merges with existing)
editMemorizedUnit({ id: 1, name: "John Doe" });

// Edit multiple units
editMemorizedUnits([
    { id: 1, name: "John Doe" },
    { id: 2, name: "Jane Doe" },
]);

// Check if units exist in memory
const exists = hasMemorizedUnits({ id: 1 }, { id: 2 });
// { 1: true, 2: true }

// Drop specific units
dropMemorizedUnits([{ id: 1 }]);

// Clear all units
setMemorizedUnits([]);
```

## Per-Store API Configuration

```typescript
import { z, createStore, Endpoint, ApiAction } from "harlemify";

const ExternalSchema = z.object({
    id: z.string().meta({ indicator: true }),
    data: z.unknown(),
});

// Use a different API for this store
export const externalStore = createStore(
    "external",
    ExternalSchema,
    {
        [Endpoint.GET_UNITS]: {
            action: ApiAction.GET,
            url: "/data",
        },
    },
    {
        api: {
            url: "https://external-api.example.com",
            timeout: 30000,
            headers: {
                "X-API-Key": "your-api-key",
            },
        },
    },
);
```
