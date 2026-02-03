# Harlemify

> Schema-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

## Features

- **Schema-Driven** - Zod schema defines types, validation, and API payloads
- **Free-form Actions** - Define any action with custom naming
- **Chainable Builders** - Fluent `Endpoint` and `Memory` APIs
- **Request Monitoring** - Track pending, success, and failed states
- **Custom Adapters** - Override HTTP at module, store, endpoint, or call-time
- **SSR Support** - Server-side rendering with automatic hydration

## Install

```bash
npm install @diphyx/harlemify
```

## Setup

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        api: {
            adapter: { baseURL: "https://api.example.com" },
        },
    },
});
```

## Usage

```typescript
// stores/user.ts
import { z } from "zod";

enum UserAction {
    LIST = "list",
    CREATE = "create",
}

const userSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({ actions: [UserAction.CREATE] }),
    email: z.string().meta({ actions: [UserAction.CREATE] }),
});

export const userStore = createStore("user", userSchema, {
    [UserAction.LIST]: {
        endpoint: Endpoint.get("/users"),
        memory: Memory.units(),
    },
    [UserAction.CREATE]: {
        endpoint: Endpoint.post("/users"),
        memory: Memory.units().add(),
    },
});
```

```vue
<script setup>
const { users, listUser, userMonitor } = useStoreAlias(userStore);
await listUser();
</script>

<template>
    <div v-if="userMonitor.list.isPending">Loading...</div>
    <ul v-else>
        <li v-for="user in users" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

## Documentation

[https://diphyx.github.io/harlemify/](https://diphyx.github.io/harlemify/)

## License

MIT
