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
    <ul v-if="!loading">
        <li v-for="user in data" :key="user.id">{{ user.name }}</li>
    </ul>
</template>
```

## Compatibility

| Dependency | Version               |
| ---------- | --------------------- |
| Nuxt       | `^3.14.0` or `^4.0.0` |
| Vue        | `^3.5.0`              |
| Zod        | `^4.0.0`              |

> **Note:** Early Nuxt 4 versions (e.g., 4.1.x) may have issues resolving the `#build` alias for module templates. If you encounter build errors related to `#build/harlemify.config`, upgrade to the latest Nuxt 4 release.

## Documentation

Full docs with guides, API reference, and examples:

[https://diphyx.github.io/harlemify/](https://diphyx.github.io/harlemify/)

## Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
