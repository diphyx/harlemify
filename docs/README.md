# Harlemify

> Factory-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

![Version](https://img.shields.io/badge/version-5.4.1-42b883)
![License](https://img.shields.io/badge/license-MIT-blue)

Define your data **shape** once with Zod — get typed **models**, computed **views**, and async **actions** with a single `createStore` call.

## How It Works

```
Shape (Zod)
└── createStore()
    ├── Model   → Mutable state containers
    ├── View    → Reactive computed properties
    ├── Action  → Async operations (API / handler)
    └── Compose → Orchestration (optional)
```

Every action tracks `loading`, `status`, and `error` automatically. Every model mutation is fully typed from the shape. Every view is a reactive `ComputedRef`.

## Quick Example

```typescript
import { shape, ModelManyMode } from "@diphyx/harlemify/runtime";

const userShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    name: factory.string(),
    email: factory.email(),
}));

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
    action({ api }) {
        return {
            list: api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET }),
        };
    },
});
```

```vue
<script setup>
const { execute, loading } = useStoreAction(userStore, "list");
const { data } = useStoreView(userStore, "users");

await execute();
</script>

<template>
    <ul v-if="!loading">
        <li v-for="user in data" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

## Get Started

Head to [Installation](getting-started/README.md) to set up your project, then follow the [Your First Store](getting-started/first-store.md) guide.
