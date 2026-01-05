# Examples

## Collection Store (Products, Users, Orders)

Use `*Units` endpoints for data that represents a list/collection.

```typescript
// stores/product.ts
import { z, createStore, Endpoint, ApiAction } from "@diphyx/harlemify";

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

export type Product = z.infer<typeof ProductSchema>;

// Collection store - only *_UNITS endpoints
export const productStore = createStore("product", ProductSchema, {
    [Endpoint.GET_UNITS]: {
        action: ApiAction.GET,
        url: "/products",
    },
    [Endpoint.POST_UNITS]: {
        action: ApiAction.POST,
        url: "/products",
    },
    [Endpoint.PATCH_UNITS]: {
        action: ApiAction.PATCH,
        url: (params) => `/products/${params.id}`,
    },
    [Endpoint.DELETE_UNITS]: {
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
    postUnits,
    patchUnits,
    deleteUnits,
} = productStore;

// Fetch all products
await getUnits();

// Create a new product (adds to memorizedUnits)
async function createProduct() {
    await postUnits([
        {
            id: 0,
            name: "New Product",
            price: 99.99,
            description: "A great product",
        },
    ]);
}

// Update product price (updates in memorizedUnits)
async function updatePrice(id: number, price: number) {
    await patchUnits([{ id, price }]);
}

// Delete a product (removes from memorizedUnits)
async function removeProduct(id: number) {
    await deleteUnits([{ id }]);
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

const { postUnits, patchUnits } = productStore;

// Validate before creating
try {
    await postUnits(
        [
            {
                id: 0,
                name: "",
                price: -10,
                description: "Test",
            },
        ],
        { validate: true },
    );
} catch (error) {
    // ZodError: name must be non-empty, price must be positive
    console.error(error);
}

// Validate before patching
try {
    await patchUnits(
        [
            {
                id: 1,
                price: -5,
            },
        ],
        { validate: true },
    );
} catch (error) {
    // ZodError: price must be positive
    console.error(error);
}
```

## Singleton Store (Config, Settings, Current User)

Use `*Unit` actions (without 's') for data that is inherently singular - like app configuration, user settings, or the current authenticated user. These cannot be plural.

```typescript
// stores/config.ts
import { z, createStore, Endpoint, ApiAction } from "@diphyx/harlemify";

const ConfigSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    theme: z.enum(["light", "dark"]).meta({
        actions: [ApiAction.PUT, ApiAction.PATCH],
    }),
    language: z.string().meta({
        actions: [ApiAction.PUT, ApiAction.PATCH],
    }),
    notifications: z.boolean().meta({
        actions: [ApiAction.PUT, ApiAction.PATCH],
    }),
});

export type Config = z.infer<typeof ConfigSchema>;

// Only define *_UNIT endpoints - no plural versions needed
export const configStore = createStore("config", ConfigSchema, {
    [Endpoint.GET_UNIT]: {
        action: ApiAction.GET,
        url: "/config",
    },
    [Endpoint.PUT_UNIT]: {
        action: ApiAction.PUT,
        url: "/config",
    },
    [Endpoint.PATCH_UNIT]: {
        action: ApiAction.PATCH,
        url: "/config",
    },
});
```

```vue
<script setup lang="ts">
import { configStore } from "~/stores/config";

const {
    memorizedUnit: config,
    endpointsStatus,
    getUnit: getConfig,
    patchUnit: updateConfig,
} = configStore;

// Fetch config (stores in memorizedUnit)
await getConfig();

// Update config (updates memorizedUnit)
async function toggleTheme() {
    const newTheme = config.value?.theme === "dark" ? "light" : "dark";
    await updateConfig({ id: config.value!.id, theme: newTheme });
}

async function toggleNotifications() {
    await updateConfig({
        id: config.value!.id,
        notifications: !config.value?.notifications,
    });
}
</script>

<template>
    <div v-if="config">
        <h2>Settings</h2>
        <p>Theme: {{ config.theme }}</p>
        <button @click="toggleTheme">Toggle Theme</button>

        <p>Notifications: {{ config.notifications ? "On" : "Off" }}</p>
        <button @click="toggleNotifications">Toggle Notifications</button>
    </div>
</template>
```

## With Lifecycle Hooks

```typescript
import { z, createStore, Endpoint, ApiAction } from "@diphyx/harlemify";

const UserSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({ actions: [ApiAction.POST, ApiAction.PUT] }),
});

export const userStore = createStore(
    "user",
    UserSchema,
    {
        [Endpoint.GET_UNITS]: { action: ApiAction.GET, url: "/users" },
        [Endpoint.POST_UNITS]: { action: ApiAction.POST, url: "/users" },
    },
    {
        hooks: {
            before: () => {
                console.log("API request starting...");
            },
            after: (error) => {
                if (error) {
                    console.error("API request failed:", error.message);
                } else {
                    console.log("API request completed successfully");
                }
            },
        },
    },
);
```

## Request Cancellation with AbortController

```typescript
import { ref } from "vue";
import { productStore } from "~/stores/product";

const { getUnits, endpointsStatus } = productStore;

// Store the controller for the current request
const controller = ref<AbortController | null>(null);

async function fetchProducts() {
    // Cancel any existing request
    if (controller.value) {
        controller.value.abort();
    }

    // Create new controller
    controller.value = new AbortController();

    try {
        await getUnits({ signal: controller.value.signal });
    } catch (error) {
        if (error.name === "AbortError") {
            console.log("Request was cancelled");
        } else {
            throw error;
        }
    }
}

function cancelRequest() {
    controller.value?.abort();
}
```

## Dynamic Headers with Auth Token

```typescript
import { ref } from "vue";
import { z, createStore, Endpoint, ApiAction } from "@diphyx/harlemify";

const token = ref<string | null>(null);

// Current user is singular - use *Unit actions
const UserSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        actions: [ApiAction.PUT],
    }),
});

export const currentUserStore = createStore(
    "currentUser",
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
                Authorization() {
                    return token.value ? `Bearer ${token.value}` : "";
                },
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
import { createApi } from "@diphyx/harlemify";

const api = createApi({
    url: "https://api.example.com",
    timeout: 5000,
    headers: {
        "Content-Type": "application/json",
    },
});

// GET request with query params
const users = await api.get("/users", {
    query: {
        page: 1,
        limit: 10,
    },
});

// POST request with body
const newUser = await api.post("/users", {
    body: {
        name: "John",
        email: "john@example.com",
    },
});

// PUT request
await api.put("/users/1", {
    body: {
        name: "John Doe",
    },
});

// PATCH request
await api.patch("/users/1", {
    body: {
        name: "Johnny",
    },
});

// DELETE request
await api.del("/users/1");
```

## Temporary Local State (Mutations)

Use mutations directly for local state that doesn't need API calls - like selecting an item for a modal.

```typescript
import { productStore } from "~/stores/product";

const { memorizedUnit: selectedProduct, setMemorizedUnit: setSelectedProduct } =
    productStore;

// Select product for detail modal
function openModal(product: Product) {
    setSelectedProduct(product);
}

// Clear when modal closes
function closeModal() {
    setSelectedProduct(null);
}
```

```vue
<template>
    <ul>
        <li v-for="product in memorizedUnits.value" @click="openModal(product)">
            {{ product.name }}
        </li>
    </ul>

    <!-- Modal uses memorizedUnit for selected item -->
    <div v-if="selectedProduct" class="modal">
        <h2>{{ selectedProduct.name }}</h2>
        <button @click="closeModal">Close</button>
    </div>
</template>
```

## Per-Store API Configuration

```typescript
import { z, createStore, Endpoint, ApiAction } from "@diphyx/harlemify";

const ExternalSchema = z.object({
    id: z.string().meta({
        indicator: true,
    }),
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

## Custom Indicator

```typescript
import { z, createStore, Endpoint, ApiAction } from "@diphyx/harlemify";

// Schema using UUID instead of numeric id
const DocumentSchema = z.object({
    uuid: z.string(),
    title: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PUT],
    }),
    content: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PUT],
    }),
});

// Override indicator in store options
export const documentStore = createStore(
    "document",
    DocumentSchema,
    {
        [Endpoint.GET_UNITS]: { action: ApiAction.GET, url: "/documents" },
        [Endpoint.POST_UNITS]: { action: ApiAction.POST, url: "/documents" },
        [Endpoint.DELETE_UNITS]: {
            action: ApiAction.DELETE,
            url: (p) => `/documents/${p.uuid}`,
        },
    },
    {
        indicator: "uuid", // Use uuid as the primary key
    },
);

// Now units are identified by uuid
const { hasMemorizedUnits, deleteUnits } = documentStore;

const exists = hasMemorizedUnits({ uuid: "abc-123" });
console.log(exists["abc-123"]); // true or false

await deleteUnits([{ uuid: "abc-123" }]);
```
