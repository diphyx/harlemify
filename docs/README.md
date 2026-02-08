# Harlemify

> Factory-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

![Version](https://img.shields.io/badge/version-4.0.0-42b883)
![License](https://img.shields.io/badge/license-MIT-blue)

Harlemify provides a declarative, factory-based approach to state management. Define your data shapes with Zod, then use model, view, and action factories to create fully typed, reactive stores with built-in API integration, computed views, and status tracking.

## Highlights

- Define shapes once with Zod, get types and validation automatically
- Three-layer architecture: **Model** (state), **View** (computed), **Action** (async)
- Two action types: `api` (HTTP + auto-commit) and `handler` (custom logic)
- Per-action status, error, and loading tracking
- Concurrency control (block, skip, cancel, allow)
- Full TypeScript inference from shape to component
- SSR support with automatic state hydration

## Quick Start

```bash
npm install @diphyx/harlemify
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
});
```

```typescript
// stores/user.ts
import { createStore, shape, ModelOneMode, ModelManyMode, type ShapeInfer } from "@diphyx/harlemify";

const userShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    email: factory.email(),
}));

type User = ShapeInfer<typeof userShape>;

export const userStore = createStore({
    name: "users",
    model({ one, many }) {
        return { current: one(userShape), list: many(userShape) };
    },
    view({ from }) {
        return { user: from("current"), users: from("list") };
    },
    action({ api }) {
        return {
            list: api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET }),
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

## Next Steps

- [Installation](getting-started/README.md) - Setup and configuration
- [Your First Store](getting-started/first-store.md) - Step-by-step tutorial
- [Core Concepts](core-concepts/README.md) - Shape, model, view, and action
