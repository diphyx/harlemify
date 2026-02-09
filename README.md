# Harlemify

> Factory-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

Define your data **shape** once with Zod — get typed **models**, computed **views**, and async **actions** with a single `createStore` call.

- **Schema-first** — Define your data shape once, get TypeScript types and validation automatically
- **Reactive state** — Single items and collections with built-in mutations
- **Computed views** — Derived read-only state that updates when models change
- **API integration** — Declarative HTTP actions that fetch and commit data in one step
- **Status tracking** — Every action exposes loading, error, and status reactively
- **Concurrency control** — Block, skip, cancel, or allow parallel calls per action
- **Vue composables** — Reactive helpers for actions, models, and views in components
- **SSR ready** — Server-side rendering with automatic state hydration

## Install

```bash
npm install @diphyx/harlemify
```

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
});
```

## Usage

```typescript
const userShape = shape((factory) => ({
    id: factory.number().meta({
        identifier: true,
    }),
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
            list: api.get(
                {
                    url: "/users",
                },
                {
                    model: "list",
                    mode: ModelManyMode.SET,
                },
            ),
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

## Documentation

[https://diphyx.github.io/harlemify/](https://diphyx.github.io/harlemify/)

## License

MIT
