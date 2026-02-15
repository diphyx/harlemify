# SSR

Harlemify includes built-in server-side rendering support. State is automatically serialized on the server and hydrated on the client — no configuration needed.

## How It Works

The SSR plugin is registered automatically when the Nuxt module is installed. The process works in two phases:

### Server

1. All store models are reset to their defaults before each request
2. Actions run during SSR populate the store state
3. After the app is rendered, the full store state is serialized into `nuxtApp.payload`

### Client

1. On hydration, the client reads the serialized state from the payload
2. Each store's state is restored to match the server snapshot
3. The app continues with the hydrated state — no duplicate API calls needed

## Usage

SSR works automatically for any action called during server-side rendering:

```vue
<script setup lang="ts">
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

The `await execute()` call in `<script setup>` runs on the server during SSR. The fetched data is committed to the store, serialized into the payload, and hydrated on the client.

## State Isolation

Each server request gets a fresh store state. Model defaults are re-evaluated per request, preventing state leakage between users.

When using [function defaults](../core-concepts/model.md), the default factory runs on every reset, producing a fresh copy:

```typescript
model({ one }) {
    return {
        current: one(userShape, {
            default: () => ({ id: 0, name: "", email: "" }),
        }),
    };
},
```

Combined with [Lazy Store](lazy-store.md), function defaults can depend on Nuxt composables like `useRoute()` that are only available after app setup.

## Next Steps

- [Lazy Store](lazy-store.md) — Deferred store initialization for SSR-safe composable access
- [Model](../core-concepts/model.md) — Function defaults and state isolation
