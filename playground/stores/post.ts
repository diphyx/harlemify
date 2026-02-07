import { createStore, shape, ActionManyMode, type ShapeInfer } from "../../src/runtime";

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

export type Post = ShapeInfer<typeof postShape>;

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
