# Harlemify

> Factory-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

## Features

- **Single Factory** - Define shape, model, view, and action in one `createStore` call — fully typed end to end
- **Zod Shapes** - Schema-first design with built-in validation, type inference, and identifier metadata
- **Reactive Models** - `one()` and `many()` state containers with `set`, `patch`, `add`, `remove`, `reset` mutations
- **Computed Views** - Derive read-only state from models with `from()` and `merge()` — auto-tracked by Vue
- **API & Handler Actions** - Declarative HTTP actions with auto-commit, or custom handlers with full model/view access
- **Action Metadata** - Every action exposes `loading`, `status`, `error`, `data`, and `reset()` out of the box
- **Concurrency Control** - Block, skip, cancel, or allow parallel calls per action
- **SSR Ready** - Server-side rendering with automatic state hydration

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
import { createStore, shape, ModelManyMode, type ShapeInfer } from "@diphyx/harlemify";

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
    action({ api, handler }) {
        return {
            list: api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET }),
            create: api.post({ url: "/users" }, { model: "list", mode: ModelManyMode.ADD }),
            clear: handler(async ({ model }) => {
                model.list.reset();
            }),
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
