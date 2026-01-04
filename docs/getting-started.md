# Getting Started

## Installation

```bash
npm install harlemify
```

## Setup

Add harlemify to your Nuxt config:

```typescript
// nuxt.config.ts
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

## Creating Your First Store

### 1. Define a Schema

Create a Zod schema with field metadata:

```typescript
// stores/user.ts
import { z, createStore, Endpoint, ApiAction } from "harlemify";

const UserSchema = z.object({
    id: z.number().meta({
        indicator: true, // Primary key
    }),
    name: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PUT, ApiAction.PATCH],
    }),
    email: z.string().meta({
        actions: [ApiAction.POST],
    }),
});
```

### 2. Define Endpoints

Map your API endpoints:

```typescript
export const userStore = createStore("user", UserSchema, {
    [Endpoint.GET_UNIT]: {
        action: ApiAction.GET,
        url: (params) => `/users/${params.id}`,
    },
    [Endpoint.GET_UNITS]: {
        action: ApiAction.GET,
        url: "/users",
    },
    [Endpoint.POST_UNIT]: {
        action: ApiAction.POST,
        url: "/users",
    },
    [Endpoint.PUT_UNIT]: {
        action: ApiAction.PUT,
        url: (params) => `/users/${params.id}`,
    },
    [Endpoint.PATCH_UNIT]: {
        action: ApiAction.PATCH,
        url: (params) => `/users/${params.id}`,
    },
    [Endpoint.DELETE_UNIT]: {
        action: ApiAction.DELETE,
        url: (params) => `/users/${params.id}`,
    },
});
```

### 3. Use in Components

```vue
<script setup>
import { userStore } from "~/stores/user";

const { memorizedUnits, endpointsStatus, getUnits } = userStore;

await getUnits();
</script>

<template>
    <div v-if="endpointsStatus.getUnitsIsPending.value">Loading...</div>
    <div v-else-if="endpointsStatus.getUnitsIsFailed.value">
        Error loading users
    </div>
    <ul v-else>
        <li v-for="user in memorizedUnits.value" :key="user.id">
            {{ user.name }}
        </li>
    </ul>
</template>
```

## Next Steps

- Learn about [Concepts](concepts.md) to understand how Harlemify works
- Check the [API Reference](api-reference.md) for detailed documentation
- See [Examples](examples.md) for common use cases
