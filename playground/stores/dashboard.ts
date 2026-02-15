import { createStore, shape, ModelManyMode, type ShapeInfer } from "../../src/runtime";

export const userShape = shape((factory) => {
    return {
        id: factory.number().meta({ identifier: true }),
        name: factory.string(),
        email: factory.email(),
    };
});

export type User = ShapeInfer<typeof userShape>;

export const todoShape = shape((factory) => {
    return {
        id: factory.number().meta({ identifier: true }),
        title: factory.string(),
        done: factory.boolean(),
    };
});

export type Todo = ShapeInfer<typeof todoShape>;

export const dashboardStore = createStore({
    name: "dashboard",
    model({ one, many }) {
        return {
            user: one(userShape),
            users: many(userShape),
            todos: many(todoShape),
        };
    },
    view({ from, merge }) {
        return {
            user: from("user"),
            users: from("users"),
            todos: from("todos"),
            userCount: from("users", (list) => list.length),
            todoCount: from("todos", (list) => list.length),
            pendingTodos: from("todos", (list) => list.filter((t) => !t.done)),
            doneTodos: from("todos", (list) => list.filter((t) => t.done)),
            summary: merge(["users", "todos"], (users, todos) => {
                return {
                    users: users.length,
                    todos: todos.length,
                    pending: todos.filter((t) => !t.done).length,
                    done: todos.filter((t) => t.done).length,
                };
            }),
        };
    },
    action({ api, handler }) {
        return {
            fetchUsers: api.get({ url: "/users" }, { model: "users", mode: ModelManyMode.SET }),
            fetchTodos: api.get({ url: "/todos" }, { model: "todos", mode: ModelManyMode.SET }),
            createUser: api.post({ url: "/users" }, { model: "users", mode: ModelManyMode.ADD }),
            createTodo: api.post({ url: "/todos" }, { model: "todos", mode: ModelManyMode.ADD }),
            deleteUser: api.delete(
                {
                    url(view) {
                        return `/users/${view.user.value.id}`;
                    },
                },
                { model: "users", mode: ModelManyMode.REMOVE },
            ),
            toggleTodo: handler<Todo>(({ model, payload }) => {
                const updated = { ...payload, done: !payload.done };
                model.todos.patch(updated);
            }),
        };
    },
    compose({ model, view, action }) {
        return {
            // No-arg: load everything
            loadAll: async () => {
                await action.fetchUsers();
                await action.fetchTodos();
            },
            // No-arg: reset everything
            resetAll: () => {
                model.user.reset();
                model.users.reset();
                model.todos.reset();
            },
            // Typed arg: select user and load related data
            selectUser: (user: User) => {
                model.user.set(user);
            },
            // Typed arg: quick-add user + todo in one call
            quickAdd: async (userName: string, todoTitle: string) => {
                await action.createUser({
                    body: { id: Date.now(), name: userName, email: `${userName.toLowerCase()}@example.com` },
                });
                await action.createTodo({ body: { id: Date.now() + 1, title: todoTitle, done: false } });
            },
            // No-arg: mark all todos as done
            completeAll: () => {
                for (const todo of view.todos.value) {
                    if (!todo.done) {
                        model.todos.patch({ ...todo, done: true });
                    }
                }
            },
        };
    },
});
