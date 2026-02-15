import { createStore, shape, ModelOneMode, ModelManyMode, type ShapeInfer } from "../../src/runtime";

export const todoShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        title: factory.string(),
        done: factory.boolean(),
    };
});

export type Todo = ShapeInfer<typeof todoShape>;

export const todoStore = createStore({
    name: "todos",
    model({ one, many }) {
        return {
            current: one(todoShape),
            list: many(todoShape),
        };
    },
    view({ from }) {
        return {
            todo: from("current"),
            todos: from("list"),
            count: from("list", (list) => {
                return list.length;
            }),
            pending: from("list", (list) => {
                return list.filter((t) => !t.done);
            }),
        };
    },
    action({ api, handler }) {
        return {
            get: api.get(
                {
                    url(view) {
                        return `/todos/${view.todo.value.id}`;
                    },
                },
                { model: "current", mode: ModelOneMode.SET },
            ),
            list: api.get({ url: "/todos" }, { model: "list", mode: ModelManyMode.SET }),
            create: api.post({ url: "/todos" }, { model: "list", mode: ModelManyMode.ADD }),
            update: api.patch(
                {
                    url(view) {
                        return `/todos/${view.todo.value.id}`;
                    },
                },
                { model: "list", mode: ModelManyMode.PATCH },
            ),
            delete: api.delete(
                {
                    url(view) {
                        return `/todos/${view.todo.value.id}`;
                    },
                },
                { model: "list", mode: ModelManyMode.REMOVE },
            ),
            toggle: handler<Todo>(async ({ model, payload }) => {
                const updated = { ...payload, done: !payload.done };
                model.current.set(updated);
                model.list.patch(updated);
            }),
            rename: handler<string>(
                async ({ model, view, payload }) => {
                    const todo = view.todo.value;
                    const updated = { ...todo, title: payload };
                    model.current.set(updated);
                    model.list.patch(updated);
                },
                { payload: "Untitled" },
            ),
        };
    },
});
