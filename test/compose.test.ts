import { describe, it, expect } from "vitest";

import { createStore } from "../src/runtime/core/store";
import { shape } from "../src/runtime/core/layers/shape";
import { ModelOneMode, ModelManyMode } from "../src/runtime/core/types/model";
import type { ShapeInfer } from "../src/runtime/core/types/shape";

// Setup

const mockFetch = (globalThis as any).$fetch;

const UserShape = shape((factory) => {
    return {
        id: factory.number(),
        name: factory.string(),
        email: factory.string(),
    };
});

type User = ShapeInfer<typeof UserShape>;

const PostShape = shape((factory) => {
    return {
        id: factory.number(),
        title: factory.string(),
        body: factory.string(),
    };
});

type Post = ShapeInfer<typeof PostShape>;

describe("compose", () => {
    function setup() {
        return createStore({
            name: "test-compose-" + Math.random(),
            model: (m) => {
                return {
                    user: m.one(UserShape),
                    posts: m.many(PostShape),
                };
            },
            view: (v) => {
                return {
                    user: v.from("user"),
                    posts: v.from("posts"),
                };
            },
            action: (a) => {
                return {
                    fetchUser: a.api.get({ url: "/users/1" }, { model: "user", mode: ModelOneMode.SET }),
                    fetchPosts: a.api.get({ url: "/posts" }, { model: "posts", mode: ModelManyMode.SET }),
                    setUser: a.handler(({ model }) => {
                        model.user.set({ id: 1, name: "Manual", email: "manual@test.com" });
                    }),
                };
            },
            compose: ({ model, action }) => {
                return {
                    refreshAll: async () => {
                        await action.fetchUser();
                        await action.fetchPosts();
                    },
                    clearAll: () => {
                        model.user.reset();
                        model.posts.reset();
                    },
                };
            },
        });
    }

    it("compose actions are available on store.compose", () => {
        const store = setup();

        expect(store.compose.refreshAll).toBeTypeOf("function");
        expect(store.compose.clearAll).toBeTypeOf("function");
    });

    it("compose action has active ref", () => {
        const store = setup();

        expect(store.compose.refreshAll.active).toBeDefined();
        expect(store.compose.refreshAll.active.value).toBe(false);
    });

    it("compose action calls store actions", async () => {
        const store = setup();
        const user: User = { id: 1, name: "Alice", email: "alice@test.com" };
        const posts: Post[] = [{ id: 1, title: "First", body: "Content" }];

        mockFetch.mockResolvedValueOnce(user).mockResolvedValueOnce(posts);

        await store.compose.refreshAll();

        expect(store.view.user.value).toEqual(user);
        expect(store.view.posts.value).toEqual(posts);
    });

    it("sync compose action executes", async () => {
        const store = setup();
        store.model.user.set({ id: 1, name: "Alice", email: "alice@test.com" });
        store.model.posts.set([{ id: 1, title: "First", body: "Content" }]);

        await store.compose.clearAll();

        expect(store.view.user.value).toEqual({ id: 0, name: "", email: "" });
        expect(store.view.posts.value).toEqual([]);
    });

    it("compose action throws on failure", async () => {
        const store = setup();
        mockFetch.mockRejectedValue({ message: "Server Error", status: 500 });

        await expect(store.compose.refreshAll()).rejects.toThrow();
    });

    it("active is false after completion", async () => {
        const store = setup();
        store.model.user.set({ id: 1, name: "Alice", email: "alice@test.com" });

        await store.compose.clearAll();

        expect(store.compose.clearAll.active.value).toBe(false);
    });

    it("active is false after failure", async () => {
        const store = setup();
        mockFetch.mockRejectedValue({ message: "Server Error", status: 500 });

        await expect(store.compose.refreshAll()).rejects.toThrow();

        expect(store.compose.refreshAll.active.value).toBe(false);
    });

    it("compose action receives arguments", async () => {
        const store = createStore({
            name: "test-compose-args-" + Math.random(),
            model: (m) => {
                return {
                    user: m.one(UserShape),
                };
            },
            view: (v) => {
                return {
                    user: v.from("user"),
                };
            },
            action: (_a) => {
                return {};
            },
            compose: ({ model }) => {
                return {
                    setUserById: (id: number, name: string) => {
                        model.user.set({ id, name, email: `${name}@test.com` });
                    },
                };
            },
        });

        await store.compose.setUserById(42, "Alice");

        expect(store.view.user.value).toEqual({ id: 42, name: "Alice", email: "Alice@test.com" });
    });

    it("regular actions still work alongside compose", async () => {
        const store = setup();

        await store.action.setUser();

        expect(store.view.user.value).toEqual({ id: 1, name: "Manual", email: "manual@test.com" });
    });

    it("store without compose has empty compose object", () => {
        const store = createStore({
            name: "test-no-compose-" + Math.random(),
            model: (m) => {
                return {
                    user: m.one(UserShape),
                };
            },
            view: (v) => {
                return {
                    user: v.from("user"),
                };
            },
            action: (a) => {
                return {
                    setUser: a.handler(({ model }) => {
                        model.user.set({ id: 1, name: "Test", email: "test@test.com" });
                    }),
                };
            },
        });

        expect(store.model).toBeDefined();
        expect(store.view).toBeDefined();
        expect(store.action).toBeDefined();
        expect(store.compose).toBeDefined();
        expect(Object.keys(store.compose)).toHaveLength(0);
    });
});
