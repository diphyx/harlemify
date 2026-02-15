import { createStore, shape, ModelManyMode, ModelManyKind, ViewClone, type ShapeInfer } from "../../src/runtime";

export const postShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        userId: factory.number(),
        title: factory.string(),
        body: factory.string(),
    };
});

export type Post = ShapeInfer<typeof postShape>;

export const postStore = createStore({
    name: "posts",
    model({ one, many }) {
        return {
            current: one(postShape),
            draft: one(postShape),
            list: many(postShape),
            byUser: many(postShape, { kind: ModelManyKind.RECORD }),
        };
    },
    view({ from, merge }) {
        return {
            post: from("current"),
            posts: from("list"),
            count: from("list", (model) => {
                return model.length;
            }),
            sorted: from(
                "list",
                (list) => {
                    return list.sort((a, b) => a.title.localeCompare(b.title));
                },
                { clone: ViewClone.SHALLOW },
            ),
            overview: merge(["current", "list"], (current, list) => {
                return {
                    selectedTitle: current.title,
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
            editor: merge(["current", "draft", "list"], (current, draft, list) => {
                return {
                    hasSelection: !!current.id,
                    hasDraft: !!draft.id,
                    isDirty: !!draft.id && draft.title !== current.title,
                    totalPosts: list.length,
                };
            }),
            grouped: from("byUser"),
            userPosts: from("byUser", (grouped) => {
                return Object.keys(grouped).length;
            }),
        };
    },
    action({ api, handler }) {
        return {
            list: api.get({ url: "/posts" }, { model: "list", mode: ModelManyMode.SET }),
            create: api.post(
                { url: "/posts" },
                {
                    model: "list",
                    mode: ModelManyMode.ADD,
                    value: (data) => {
                        const post = data as Post;
                        return { ...post, title: post.title.toUpperCase() };
                    },
                },
            ),
            update: api.patch(
                {
                    url(view) {
                        return `/posts/${view.post.value.id}`;
                    },
                },
                { model: "list", mode: ModelManyMode.PATCH },
            ),
            delete: api.delete(
                {
                    url(view) {
                        return `/posts/${view.post.value.id}`;
                    },
                },
                { model: "list", mode: ModelManyMode.REMOVE },
            ),
            sort: handler(async ({ model, view }) => {
                const sorted = [...view.posts.value].sort((a, b) => {
                    return a.title.localeCompare(b.title);
                });
                model.list.set(sorted);
                return sorted;
            }),
            group: handler(async ({ model, view }) => {
                const posts = view.posts.value;
                const grouped: Record<string, Post[]> = {};
                for (const post of posts) {
                    const key = String(post.userId);
                    if (!grouped[key]) {
                        grouped[key] = [];
                    }
                    grouped[key].push(post);
                }
                model.byUser.set(grouped);
            }),
        };
    },
});
