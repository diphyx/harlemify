# Harlemify

> Schema-driven state management for Nuxt powered by [Harlem](https://harlemjs.com/)

![Version](https://img.shields.io/badge/version-3.0.0-42b883)
![License](https://img.shields.io/badge/license-MIT-blue)

Harlemify bridges the gap between your API and Vue components. Define your data schema once with Zod, and Harlemify automatically handles type-safe API calls, reactive state management, request status tracking, and memory operations. Your schema becomes the single source of truth for TypeScript types, runtime validation, and API payload filtering.

## Why Harlemify?

- Define schema once, get types, validation, and API payloads automatically
- Track loading, success, and error states for every action
- Update cache declaratively with memory mutations
- Override HTTP handling at module, store, endpoint, or call-time
- Full TypeScript inference from schema to component
- SSR support with automatic state hydration

## Features

### Schema-Driven Architecture
Your Zod schema is the foundation. Define field types, mark the primary key with `indicator`, and specify which fields go in request bodies with `actions`. Harlemify uses this metadata to build type-safe stores automatically.

```typescript
const userSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({ actions: ["create", "update"] }),
    email: z.string().meta({ actions: ["create"] }),
    createdAt: z.string(),
});
```

### Free-form Actions
Define any number of actions with custom names. No fixed CRUD patterns - create actions that match your API exactly.

```typescript
const actions = {
    list: { endpoint: Endpoint.get("/users"), memory: Memory.units() },
    create: { endpoint: Endpoint.post("/users"), memory: Memory.units().add() },
    activate: { endpoint: Endpoint.put((p) => `/users/${p.id}/activate`), memory: Memory.units().edit() },
    export: { endpoint: Endpoint.get((p) => `/users/${p.id}/export`) }, // No memory - returns data only
};
```

### Chainable Builders
Fluent `Endpoint` and `Memory` builders make configuration readable and type-safe.

```typescript
// Endpoint builder
Endpoint.get("/users")                           // Static URL
Endpoint.get<User>((p) => `/users/${p.id}`)      // Dynamic URL with typed params
Endpoint.post("/users").withAdapter(uploadAdapter) // Custom adapter

// Memory builder
Memory.unit()                    // Single item state
Memory.units()                   // Collection state
Memory.unit("profile")           // Nested field
Memory.units().add({ prepend: true })  // Prepend to list
Memory.units().edit()            // Update by indicator
```

### Nested Memory Paths
Load sub-resources into nested fields without replacing the entire object.

```typescript
const actions = {
    get: { endpoint: Endpoint.get((p) => `/projects/${p.id}`), memory: Memory.unit() },
    milestones: { endpoint: Endpoint.get((p) => `/projects/${p.id}/milestones`), memory: Memory.unit("milestones") },
    options: { endpoint: Endpoint.get((p) => `/projects/${p.id}/options`), memory: Memory.unit("meta", "options") },
};
```

### Request Monitoring
Track request status for every action. No manual loading state management.

```typescript
const { userMonitor } = useStoreAlias(userStore);

userMonitor.list.pending()   // boolean - true while loading
userMonitor.list.success()   // boolean - true after success
userMonitor.list.failed()    // boolean - true after error
userMonitor.list.idle()      // boolean - true before first request
userMonitor.create.current() // "idle" | "pending" | "success" | "failed"
```

### Custom Adapters at Any Level
Override HTTP handling at module, store, endpoint, or call-time level. Perfect for authentication, file uploads, streaming, or progress tracking.

```typescript
// Module level (nuxt.config.ts)
harlemify: { api: { adapter: { baseURL: "/api", timeout: 10000 } } }

// Store level
createStore("user", schema, actions, { adapter: authAdapter })

// Endpoint level
Endpoint.get("/files").withAdapter(downloadAdapter)

// Call-time level
await uploadFile({ file }, { adapter: progressAdapter })
```

### Direct Memory Access
Mutate state directly without API calls when needed.

```typescript
const { userMemory } = useStoreAlias(userStore);

userMemory.set(userData);           // Replace state
userMemory.edit({ id: 1, name: "Updated" }); // Merge by indicator
userMemory.drop({ id: 1 });         // Remove by indicator
userMemory.set(null);               // Clear state
```

### SSR Support
Built-in server-side rendering support via Harlem SSR plugin. State hydrates automatically from server to client.

### TypeScript First
Full type inference from schema to component. Actions, state, memory methods, and monitors are all fully typed.

## Quick Start

```bash
npm install @diphyx/harlemify
```

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

```typescript
// stores/user.ts
const userStore = createStore("user", userSchema, {
    list: { endpoint: Endpoint.get("/users"), memory: Memory.units() },
    create: { endpoint: Endpoint.post("/users"), memory: Memory.units().add() },
});
```

```vue
<script setup>
const { users, listUser, createUser, userMonitor } = useStoreAlias(userStore);
await listUser();
</script>

<template>
    <div v-if="userMonitor.list.pending()">Loading...</div>
    <ul v-else>
        <li v-for="user in users" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

## Next Steps

- [Installation](getting-started/README.md) - Setup harlemify in your project
- [Your First Store](getting-started/first-store.md) - Create a complete store step-by-step
- [Core Concepts](core-concepts/README.md) - Understand schema, endpoint, memory, and monitor
