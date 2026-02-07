# Collection Store

Use collection stores for managing lists of items with CRUD operations.

## When to Use

- User lists, product catalogs, blog posts
- Data with Create, Read, Update, Delete operations
- Items identified by a unique ID

## Shape

```typescript
import { shape, type ShapeInfer } from "@diphyx/harlemify";

const postShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        userId: factory.number(),
        title: factory.string(),
        body: factory.string(),
    };
});

type Post = ShapeInfer<typeof postShape>;
```

## Store

```typescript
import { createStore, ActionManyMode } from "@diphyx/harlemify";

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
            count: from("list", (model) => {
                return model.length;
            }),
            overview: merge(["current", "list"], (current, list) => {
                return {
                    selectedTitle: current?.title ?? null,
                    total: list.length,
                    byUser: list.reduce(
                        (acc, p) => {
                            acc[p.userId] = (acc[p.userId] || 0) + 1;
                            return acc;
                        },
                        {} as Record<number, number>,
                    ),
                };
            }),
        };
    },
    action({ api, handle }) {
        return {
            list: api
                .get({
                    url: "/posts",
                })
                .commit("list", ActionManyMode.SET),
            create: api
                .post({
                    url: "/posts",
                })
                .commit("list", ActionManyMode.ADD),
            update: api
                .patch({
                    url(view) {
                        return `/posts/${view.post.value?.id}`;
                    },
                })
                .commit("list", ActionManyMode.PATCH),
            delete: api
                .delete({
                    url(view) {
                        return `/posts/${view.post.value?.id}`;
                    },
                })
                .commit("list", ActionManyMode.REMOVE),
            sort: handle(async ({ view, commit }) => {
                const sorted = [...view.posts.value].sort((a, b) => {
                    return a.title.localeCompare(b.title);
                });
                commit("list", ActionManyMode.SET, sorted);
                return sorted;
            }),
        };
    },
});
```

## Mutation Operations

| Action | Commit Mode | Effect |
|--------|-------------|--------|
| List | `ActionManyMode.SET` | Replace entire array |
| Create | `ActionManyMode.ADD` | Append new item |
| Update | `ActionManyMode.PATCH` | Update item by identifier |
| Delete | `ActionManyMode.REMOVE` | Remove item by identifier |

## Component Usage

```vue
<script setup lang="ts">
import { postStore } from "~/stores/post";
import { ActionOneMode } from "@diphyx/harlemify";

const { model, view, action } = postStore;

await action.list();

async function addPost() {
    await action.create({
        body: { userId: 1, title: "New Post", body: "Content" },
    });
}

function selectPost(post: Post) {
    model("current", ActionOneMode.SET, post);
}

async function removePost() {
    await action.delete();
}
</script>

<template>
    <div>
        <button @click="addPost" :disabled="action.create.loading.value">
            Add Post
        </button>

        <div v-if="action.list.loading.value">Loading...</div>

        <table v-else>
            <tr v-for="post in view.posts.value" :key="post.id">
                <td>{{ post.title }}</td>
                <td>
                    <button @click="selectPost(post)">Select</button>
                    <button @click="removePost">Delete</button>
                </td>
            </tr>
        </table>

        <p>Total: {{ view.count.value }}</p>
    </div>
</template>
```

## Prepend New Items

Add new items to the beginning of the list:

```typescript
action({ api }) {
    return {
        create: api
            .post({
                url: "/posts",
            })
            .commit("list", ActionManyMode.ADD, undefined, { prepend: true }),
    };
},
```

## Unique Items

Prevent duplicate additions:

```typescript
action({ api }) {
    return {
        add: api
            .post({
                url: "/users",
            })
            .commit("list", ActionManyMode.ADD, undefined, { unique: true }),
    };
},
```

## Pagination

Handle paginated lists:

```typescript
action({ api }) {
    return {
        list: api
            .get({
                url: "/posts",
            })
            .commit("list", ActionManyMode.SET),
        loadMore: api
            .get({
                url: "/posts",
            })
            .handle(async ({ api, commit }) => {
                const posts = await api<Post[]>();
                commit("list", ActionManyMode.ADD, posts);
                return posts;
            }),
    };
},
```

```typescript
// First page
await action.list({ query: { page: 1 } });

// Load more
await action.loadMore({ query: { page: 2 } });
```

## Next Steps

- [Singleton Store](singleton.md) - Single entity pattern
- [Nested Store](nested.md) - Complex objects
