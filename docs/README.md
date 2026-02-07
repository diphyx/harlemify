# Harlemify

> Factory-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

![Version](https://img.shields.io/badge/version-4.0.0-42b883)
![License](https://img.shields.io/badge/license-MIT-blue)

Harlemify provides a declarative, factory-based approach to state management. Define your data shapes with Zod, then use model, view, and action factories to create fully typed, reactive stores with built-in API integration, computed views, and status tracking.

## Why Harlemify?

- Define shapes once with Zod, get types and validation automatically
- Three-layer architecture: **Model** (state), **View** (computed), **Action** (async operations)
- Chainable action builders: `api`, `handle`, `commit`
- Per-action status, error, and loading tracking
- Concurrency control (block, skip, cancel, allow)
- Full TypeScript inference from shape to component
- SSR support with automatic state hydration

## Features

### Shape-Driven Architecture

Define your data shape with Zod using the `shape` helper. Mark identifiers with `.meta()` for automatic matching in array mutations.

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
```

### Three-Layer Store

Every store is built from three factory functions: **model**, **view**, and **action**.

```typescript
const store = createStore({
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
            count: from("list", (model) => {
                return model.length;
            }),
        };
    },
    action({ api, commit }) {
        return {
            fetch: api.get({ url: "/users" }).commit("list", ActionManyMode.SET),
            clear: commit("list", ActionManyMode.RESET),
        };
    },
});
```

### Chainable Action Builders

Actions follow a fluent chain pattern: `api` -> `handle` -> `commit`. Use any combination.

```typescript
// API + auto commit
api.get({
    url: "/users",
}).commit("list", ActionManyMode.SET);

// API + custom handle + commit
api.get({
    url: "/users/1",
}).handle(async ({ api, commit }) => {
    const user = await api<User>();

    commit("current", ActionOneMode.SET, user);

    return user;
});

// Handle only (no API)
handle(async ({ view, commit }) => {
    const sorted = [...view.users.value].sort((a, b) => {
        return a.name.localeCompare(b.name);
    });

    commit("list", ActionManyMode.SET, sorted);
});

// Commit only (direct mutation)
commit("current", ActionOneMode.RESET);
```

### Computed Views

Views are reactive `ComputedRef` values derived from model state. Use `from` for single-source and `merge` for multi-source views.

```typescript
view({ from, merge }) {
    return {
        user: from("current"),
        userName: from("current", (model) => {
            return model?.name ?? "unknown";
        }),
        summary: merge(["current", "list"], (current, list) => {
            return {
                name: current?.name ?? "none",
                total: list.length,
            };
        }),
    };
},
```

### Per-Action Status Tracking

Every action has built-in `status`, `loading`, `error`, and `data` properties.

```typescript
await store.action.fetch();

store.action.fetch.loading.value; // boolean
store.action.fetch.status.value; // "idle" | "pending" | "success" | "error"
store.action.fetch.error.value; // ActionError | null
```

### Concurrency Control

Control what happens when an action is called while already pending.

```typescript
await store.action.fetch({ concurrent: ActionConcurrent.CANCEL });
// BLOCK - throw error (default)
// SKIP  - return existing promise
// CANCEL - abort previous, start new
// ALLOW - run both independently
```

### Direct Model Mutations

Mutate state directly without API calls using the model committer.

```typescript
store.model("current", ActionOneMode.SET, userData);
store.model("list", ActionManyMode.ADD, newUser);
store.model("list", ActionManyMode.REMOVE, userToDelete);
store.model("current", ActionOneMode.RESET);
```

### SSR Support

Built-in server-side rendering support via Harlem SSR plugin. State hydrates automatically from server to client.

## Quick Start

```bash
npm install @diphyx/harlemify
```

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

```typescript
// stores/user.ts
import { createStore, shape, ActionOneMode, ActionManyMode, type ShapeInfer } from "#imports";

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
            list: api
                .get({
                    url: "/users",
                })
                .commit("list", ActionManyMode.SET),
            get: api
                .get({
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                })
                .commit("current", ActionOneMode.SET),
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

- [Installation](getting-started/README.md) - Setup harlemify in your project
- [Your First Store](getting-started/first-store.md) - Create a complete store step-by-step
- [Core Concepts](core-concepts/README.md) - Understand shape, model, view, and action
