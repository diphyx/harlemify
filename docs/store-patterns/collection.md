# Collection Store

CRUD list management for users, products, blog posts, etc.

## Store

```typescript
import { createStore, shape, ModelManyMode, type ShapeInfer } from "@diphyx/harlemify";

const postShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
    userId: factory.number(),
    title: factory.string(),
    body: factory.string(),
}));

type Post = ShapeInfer<typeof postShape>;

export const postStore = createStore({
    name: "posts",
    model({ one, many }) {
        return {
            current: one(postShape),
            list: many(postShape),
        };
    },
    view({ from, merge }) {
        return {
            post: from("current"),
            posts: from("list"),
            count: from("list", (model) => model.length),
            overview: merge(["current", "list"], (current, list) => ({
                selectedTitle: current?.title ?? null,
                total: list.length,
            })),
        };
    },
    action({ api, handler }) {
        return {
            list: api.get({ url: "/posts" }, { model: "list", mode: ModelManyMode.SET }),
            create: api.post({ url: "/posts" }, { model: "list", mode: ModelManyMode.ADD }),
            update: api.patch(
                { url: (view) => `/posts/${view.post.value?.id}` },
                { model: "list", mode: ModelManyMode.PATCH },
            ),
            delete: api.delete(
                { url: (view) => `/posts/${view.post.value?.id}` },
                { model: "list", mode: ModelManyMode.REMOVE },
            ),
            sort: handler(async ({ model, view }) => {
                const sorted = [...view.posts.value].sort((a, b) => a.title.localeCompare(b.title));
                model.list.set(sorted);
            }),
        };
    },
});
```

## Component Usage

```vue
<script setup lang="ts">
import { postStore } from "~/stores/post";

const { model, view, action } = postStore;

await action.list();

function selectPost(post: Post) {
    model.current.set(post);
}
</script>

<template>
    <div>
        <button @click="action.create({ body: { userId: 1, title: 'New', body: '' } })">Add</button>

        <div v-if="action.list.loading.value">Loading...</div>

        <table v-else>
            <tr v-for="post in view.posts.value" :key="post.id">
                <td>{{ post.title }}</td>
                <td>
                    <button @click="selectPost(post)">Select</button>
                    <button @click="action.delete()">Delete</button>
                </td>
            </tr>
        </table>

        <p>Total: {{ view.count.value }}</p>
    </div>
</template>
```

## Commit Options

```typescript
// Prepend new items
api.post({ url: "/posts" }, { model: "list", mode: ModelManyMode.ADD, options: { prepend: true } })

// Prevent duplicates
api.post({ url: "/users" }, { model: "list", mode: ModelManyMode.ADD, options: { unique: true } })
```

## Next Steps

- [Singleton Store](singleton.md) - Single entity pattern
- [Nested Store](nested.md) - Complex objects
