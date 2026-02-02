# Getting Started

## Installation

```bash
npm install @diphyx/harlemify
```

## Setup

Add harlemify to your Nuxt config:

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

## Your First Store

```typescript
// stores/user.ts
import { z } from "zod";
import { createStore, Endpoint, EndpointMethod } from "@diphyx/harlemify";

const UserSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
    email: z.string().meta({
        methods: [EndpointMethod.POST],
    }),
});

export type User = z.infer<typeof UserSchema>;

export const userStore = createStore("user", UserSchema, {
    [Endpoint.GET_UNITS]: {
        method: EndpointMethod.GET,
        url: "/users",
    },
    [Endpoint.POST_UNITS]: {
        method: EndpointMethod.POST,
        url: "/users",
    },
    [Endpoint.PATCH_UNITS]: {
        method: EndpointMethod.PATCH,
        url: (params) => `/users/${params.id}`,
    },
    [Endpoint.DELETE_UNITS]: {
        method: EndpointMethod.DELETE,
        url: (params) => `/users/${params.id}`,
    },
});
```

## Using in a Component

```vue
<script setup>
import { userStore } from "~/stores/user";

const { units, endpoint, monitor } = userStore;

await endpoint.getUnits();
</script>

<template>
    <div v-if="monitor.getUnitsIsPending.value">Loading...</div>
    <ul v-else>
        <li v-for="user in units.value" :key="user.id">
            {{ user.name }}
        </li>
    </ul>
</template>
```

## Next Steps

- Read the [Guide](guide.md) for complete documentation
- View the [Reference](reference.md) for type definitions
- Run the [Playground](playground.md) for live examples
