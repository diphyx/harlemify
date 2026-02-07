# Harlemify

> Factory-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

## Features

- **Shape-Driven** - Zod shapes define types and identifiers
- **Three-Layer Architecture** - Model (state), View (computed), Action (async operations)
- **Chainable Action Builders** - Fluent `api`, `handle`, `commit` chains
- **Per-Action Status Tracking** - Built-in `loading`, `status`, `error`, `data` on every action
- **Concurrency Control** - Block, skip, cancel, or allow concurrent calls
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
        action: {
            endpoint: "https://api.example.com",
        },
    },
});
```

## Usage

```typescript
// stores/user.ts
import { createStore, shape, ActionOneMode, ActionManyMode, type ShapeInfer } from "@diphyx/harlemify";

const userShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        email: factory.email(),
    };
});

export type User = ShapeInfer<typeof userShape>;

export const userStore = createStore({
    name: "users",
    model({ one, many }) {
        return {
            current: one(userShape),
            list: many(userShape),
        };
    },
    view({ from }) {
        return {
            user: from("current"),
            users: from("list"),
        };
    },
    action({ api, commit }) {
        return {
            list: api
                .get({
                    url: "/users",
                })
                .commit("list", ActionManyMode.SET),
            create: api
                .post({
                    url: "/users",
                })
                .commit("list", ActionManyMode.ADD),
            clear: commit("list", ActionManyMode.RESET),
        };
    },
});
```

```vue
<script setup>
const { view, action } = userStore;

await action.list();
</script>

<template>
    <div v-if="action.list.loading.value">Loading...</div>
    <ul v-else>
        <li v-for="user in view.users.value" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

## Documentation

[https://diphyx.github.io/harlemify/](https://diphyx.github.io/harlemify/)

## License

MIT
