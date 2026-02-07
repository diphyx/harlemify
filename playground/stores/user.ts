import { createStore, shape, ActionOneMode, ActionManyMode, type ShapeInfer } from "../../src/runtime";

const userShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        email: factory.email(),
    };
});

export type User = ShapeInfer<typeof userShape>;

export const userStore = createStore({
    name: "users",
    model({ one, many }) {
        return {
            current: one(userShape),
            list: many(userShape),
        };
    },
    view({ from, merge }) {
        return {
            user: from("current"),
            users: from("list"),
            count: from("list", (model) => {
                return model.length;
            }),
            summary: merge(["current", "list"], (current, list) => {
                return {
                    selected: current?.name ?? null,
                    total: list.length,
                    emails: list.map((u) => u.email),
                };
            }),
        };
    },
    action({ api, commit }) {
        return {
            get: api
                .get({
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                })
                .commit("current", ActionOneMode.SET),
            list: api
                .get({
                    url: "/users",
                })
                .commit("list", ActionManyMode.SET),
            create: api
                .post({
                    url: "/users",
                })
                .commit("list", ActionManyMode.ADD),
            update: api
                .patch({
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                })
                .commit("list", ActionManyMode.PATCH),
            delete: api
                .delete({
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                })
                .commit("list", ActionManyMode.REMOVE),
            clear: commit("list", ActionManyMode.RESET),
            addUnique: api
                .post({
                    url: "/users",
                })
                .commit("list", ActionManyMode.ADD, undefined, { unique: true }),
            patchByEmail: api
                .patch({
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                })
                .commit("list", ActionManyMode.PATCH, undefined, { by: "email" }),
        };
    },
});
