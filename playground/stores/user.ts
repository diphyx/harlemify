import {
    createStore,
    shape,
    ModelOneMode,
    ModelManyMode,
    ModelSilent,
    ViewClone,
    type ShapeInfer,
} from "../../src/runtime";

export const userShape = shape((factory) => {
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
            list: many(userShape, {
                pre() {
                    console.log("[users] pre hook");
                },
                post() {
                    console.log("[users] post hook");
                },
            }),
        };
    },
    view({ from, merge }) {
        return {
            user: from("current"),
            users: from("list"),
            count: from("list", (model) => {
                return model.length;
            }),
            sorted: from(
                "list",
                (list) => {
                    return list.sort((a, b) => a.name.localeCompare(b.name));
                },
                { clone: ViewClone.SHALLOW },
            ),
            summary: merge(["current", "list"], (current, list) => {
                return {
                    selected: current?.name ?? null,
                    total: list.length,
                    emails: list.map((u) => u.email),
                };
            }),
        };
    },
    action({ api, handler }) {
        return {
            get: api.get(
                {
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                },
                { model: "current", mode: ModelOneMode.SET },
            ),
            list: api.get({ url: "/users" }, { model: "list", mode: ModelManyMode.SET }),
            create: api.post({ url: "/users" }, { model: "list", mode: ModelManyMode.ADD }),
            update: api.patch(
                {
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                },
                { model: "list", mode: ModelManyMode.PATCH },
            ),
            delete: api.delete(
                {
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                },
                { model: "list", mode: ModelManyMode.REMOVE },
            ),
            clear: handler(async ({ model }) => {
                model.list.reset({ silent: true });
            }),
            silentAdd: handler<User>(async ({ model, payload }) => {
                model.list.add(payload, { silent: ModelSilent.PRE });
            }),
            addUnique: api.post(
                { url: "/users" },
                { model: "list", mode: ModelManyMode.ADD, options: { unique: true } },
            ),
            patchByEmail: api.patch(
                {
                    url(view) {
                        return `/users/${view.user.value?.id}`;
                    },
                },
                { model: "list", mode: ModelManyMode.PATCH, options: { by: "email" } },
            ),
        };
    },
});
