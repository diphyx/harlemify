# Harlemify

> Factory-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

![Version](https://img.shields.io/badge/version-5.3.0-42b883)
![License](https://img.shields.io/badge/license-MIT-blue)

Define your data **shape** once with Zod — get typed **models**, computed **views**, and async **actions** with a single `createStore` call.

Built on top of [Harlem](https://harlemjs.com/), a powerful and extensible state management library for Vue 3.

---

## The Problem

Every Nuxt app has the same boilerplate for every API resource:

```typescript
// Without Harlemify — this gets written for EVERY resource

// 1. Define types manually
interface User {
    id: number;
    name: string;
    email: string;
}

// 2. Define state
const users = ref<User[]>([]);
const currentUser = ref<User | null>(null);
const loading = ref(false);
const error = ref<Error | null>(null);

// 3. Write fetch logic
async function fetchUsers() {
    loading.value = true;
    error.value = null;
    try {
        users.value = await $fetch("/api/users");
    } catch (e) {
        error.value = e as Error;
    } finally {
        loading.value = false;
    }
}

// 4. Repeat for create, update, delete...
// 5. Repeat for every resource in your app...
```

## The Solution

With Harlemify, define a data shape once and get everything else for free:

```typescript
const userShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        email: factory.email(),
    };
});

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
                { model: "list", mode: ModelManyMode.SET },
            ),
            get: api.get(
                {
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                },
                { model: "current", mode: ModelOneMode.SET },
            ),
            create: api.post(
                {
                    url: "/users",
                },
                { model: "list", mode: ModelManyMode.ADD },
            ),
            delete: api.delete(
                {
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                },
                { model: "list", mode: ModelManyMode.REMOVE },
            ),
        };
    },
});
```

Use it in any component with built-in composables:

```vue
<script setup>
const { execute, loading, error } = useStoreAction(userStore, "list");
const { data: users } = useStoreView(userStore, "users");

await execute();
</script>

<template>
    <p v-if="error">{{ error.message }}</p>
    <ul v-else-if="!loading">
        <li v-for="user in users" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

Every action automatically tracks `loading`, `error`, and `status`. No manual ref management.

## Features

- **Schema-first** — Define your data shape once with Zod, get TypeScript types and validation automatically
- **Reactive models** — Single items (`one`) and collections (`many`) with built-in mutations: set, patch, add, remove, reset
- **Computed views** — Derived read-only state that updates when models change, with merge and clone support
- **Declarative API actions** — HTTP actions (GET, POST, PATCH, DELETE) that fetch and commit data in one step
- **Status tracking** — Every action exposes `loading`, `error`, and `status` reactively — no boilerplate
- **Concurrency control** — Block, skip, cancel, or allow parallel calls per action
- **Vue composables** — `useStoreAction`, `useStoreModel`, `useStoreView` for clean component integration
- **SSR ready** — Server-side rendering with automatic state hydration
- **Handler actions** — Custom async logic with full model/view access and typed payloads
- **Record collections** — Keyed collections (`many` with `RECORD` kind) for grouped data

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

That's it. No plugins, no providers, no setup functions.

## Documentation

Full docs with guides, API reference, and examples:

[https://diphyx.github.io/harlemify/](https://diphyx.github.io/harlemify/)

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
