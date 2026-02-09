# Harlemify

> Factory-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

![Version](https://img.shields.io/badge/version-5.1.0-42b883)
![License](https://img.shields.io/badge/license-MIT-blue)

Define your data **shape** once with Zod — get typed **models**, computed **views**, and async **actions** with a single `createStore` call.

## How It Works

```
Shape (Zod)
└── createStore()
    ├── Model  → State
    ├── View   → Computed
    └── Action → Async
```

Every action tracks `loading`, `status`, and `error` automatically. Every model mutation is fully typed from the shape. Every view is a reactive `ComputedRef`.

## Quick Example

```typescript
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
const { execute, loading } = useStoreAction(userStore, "list");
const { data } = useStoreView(userStore, "users");

await execute();
</script>

<template>
    <ul v-if="!loading">
        <li v-for="user in data.value" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

## Docs

- **Getting Started** — [Installation](getting-started/README.md) · [Your First Store](getting-started/first-store.md)
- **Core Concepts** — [Shape](core-concepts/shape.md) · [Model](core-concepts/model.md) · [View](core-concepts/view.md) · [Action](core-concepts/action.md)
- **Composables** — [useStoreAction](composables/use-store-action.md) · [useStoreModel](composables/use-store-model.md) · [useStoreView](composables/use-store-view.md)
- **Advanced** — [Concurrency](advanced/concurrency.md) · [Cancellation](advanced/cancellation.md) · [Logging](advanced/logging.md) · [Isolated Status](advanced/isolated-status.md)
