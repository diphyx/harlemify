import { describe, it, expect } from "vitest";

import { createStore } from "../src/runtime/core/store";
import { shape } from "../src/runtime/core/layers/shape";
import { ModelOneMode, ModelManyMode } from "../src/runtime/core/types/model";
import { ActionStatus } from "../src/runtime/core/types/action";
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

describe("createStore", () => {
    function setup() {
        return createStore({
            name: "test-store-" + Math.random(),
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
                    userName: v.from("user", (user: User | null) => {
                        return user?.name ?? "unknown";
                    }),
                    postCount: v.from("posts", (posts: Post[]) => {
                        return posts.length;
                    }),
                    summary: v.merge(["user", "posts"], (user: User | null, posts: Post[]) => {
                        return {
                            name: user?.name ?? "none",
                            total: posts.length,
                        };
                    }),
                };
            },
            action: (a) => {
                return {
                    fetchUser: a.api.get({ url: "/users/1" }, { model: "user", mode: ModelOneMode.SET }),

                    fetchPosts: a.api.get({ url: "/posts" }, { model: "posts", mode: ModelManyMode.SET }),

                    handleOnly: a.handler(async (_context) => {
                        return "handled";
                    }),
                };
            },
        });
    }

    it("returns model, view, action", () => {
        const store = setup();

        expect(store.model).toBeDefined();
        expect(store.view).toBeDefined();
        expect(store.action).toBeDefined();
    });

    // Model

    describe("model", () => {
        it("set on one-model", () => {
            const store = setup();
            const user: User = {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            };

            store.model.user.set(user);

            expect(store.view.user.value).toEqual(user);
        });

        it("reset on one-model", () => {
            const store = setup();
            store.model.user.set({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            store.model.user.reset();

            expect(store.view.user.value).toBeNull();
        });

        it("patch on one-model", () => {
            const store = setup();
            store.model.user.set({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            store.model.user.patch({ name: "Bob" });

            expect(store.view.user.value).toEqual({
                id: 1,
                name: "Bob",
                email: "alice@test.com",
            });
        });

        it("set on many-model", () => {
            const store = setup();
            const posts: Post[] = [
                {
                    id: 1,
                    title: "First",
                    body: "Content 1",
                },
                {
                    id: 2,
                    title: "Second",
                    body: "Content 2",
                },
            ];

            store.model.posts.set(posts);

            expect(store.view.posts.value).toEqual(posts);
        });

        it("reset on many-model", () => {
            const store = setup();
            store.model.posts.set([
                {
                    id: 1,
                    title: "First",
                    body: "Content 1",
                },
            ]);

            store.model.posts.reset();

            expect(store.view.posts.value).toEqual([]);
        });

        it("add on many-model", () => {
            const store = setup();
            store.model.posts.set([
                {
                    id: 1,
                    title: "First",
                    body: "Content 1",
                },
            ]);

            store.model.posts.add({
                id: 2,
                title: "Second",
                body: "Content 2",
            });

            expect(store.view.posts.value).toHaveLength(2);
        });

        it("remove on many-model", () => {
            const store = setup();
            store.model.posts.set([
                {
                    id: 1,
                    title: "First",
                    body: "Content 1",
                },
                {
                    id: 2,
                    title: "Second",
                    body: "Content 2",
                },
            ]);

            store.model.posts.remove({
                id: 1,
                title: "First",
                body: "Content 1",
            });

            expect(store.view.posts.value).toHaveLength(1);
            expect((store.view.posts.value as Post[])[0].id).toBe(2);
        });
    });

    // View

    describe("views", () => {
        it("reflects current state", () => {
            const store = setup();

            expect(store.view.user.value).toBeNull();
            expect(store.view.posts.value).toEqual([]);
        });

        it("resolver transforms data", () => {
            const store = setup();

            expect(store.view.userName.value).toBe("unknown");

            store.model.user.set({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            expect(store.view.userName.value).toBe("Alice");
        });

        it("computed count view updates", () => {
            const store = setup();

            expect(store.view.postCount.value).toBe(0);

            store.model.posts.set([
                {
                    id: 1,
                    title: "First",
                    body: "Content 1",
                },
                {
                    id: 2,
                    title: "Second",
                    body: "Content 2",
                },
            ]);

            expect(store.view.postCount.value).toBe(2);
        });

        it("merge view combines sources", () => {
            const store = setup();

            expect(store.view.summary.value).toEqual({
                name: "none",
                total: 0,
            });

            store.model.user.set({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });
            store.model.posts.set([
                {
                    id: 1,
                    title: "First",
                    body: "Content 1",
                },
            ]);

            expect(store.view.summary.value).toEqual({
                name: "Alice",
                total: 1,
            });
        });
    });

    // Action

    describe("actions", () => {
        it("action has expected properties", () => {
            const store = setup();

            expect(store.action.fetchUser).toBeTypeOf("function");
            expect(store.action.fetchUser.loading).toBeDefined();
            expect(store.action.fetchUser.status).toBeDefined();
            expect(store.action.fetchUser.error).toBeDefined();
            expect(store.action.fetchUser.reset).toBeTypeOf("function");
        });

        it("api action fetches and commits to state", async () => {
            const store = setup();
            const user: User = {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            };
            mockFetch.mockResolvedValue(user);

            await store.action.fetchUser();

            expect(mockFetch).toHaveBeenCalled();
            expect(store.view.user.value).toEqual(user);
            expect(store.action.fetchUser.status.value).toBe(ActionStatus.SUCCESS);
        });

        it("api action fetches many and commits", async () => {
            const store = setup();
            const posts: Post[] = [
                {
                    id: 1,
                    title: "First",
                    body: "Content 1",
                },
                {
                    id: 2,
                    title: "Second",
                    body: "Content 2",
                },
            ];
            mockFetch.mockResolvedValue(posts);

            await store.action.fetchPosts();

            expect(store.view.posts.value).toEqual(posts);
            expect(store.view.postCount.value).toBe(2);
        });

        it("handle-only action executes", async () => {
            const store = setup();

            const result = await store.action.handleOnly();

            expect(result).toBe("handled");
            expect(store.action.handleOnly.status.value).toBe(ActionStatus.SUCCESS);
        });

        it("failed action sets error status", async () => {
            const store = setup();
            mockFetch.mockRejectedValue({
                message: "Server Error",
                status: 500,
            });

            await expect(store.action.fetchUser()).rejects.toThrow();

            expect(store.action.fetchUser.status.value).toBe(ActionStatus.ERROR);
            expect(store.action.fetchUser.error.value).toBeDefined();
        });

        it("reset clears action state", async () => {
            const store = setup();
            const user: User = {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            };
            mockFetch.mockResolvedValue(user);

            await store.action.fetchUser();
            store.action.fetchUser.reset();

            expect(store.action.fetchUser.status.value).toBe(ActionStatus.IDLE);
            expect(store.action.fetchUser.error.value).toBeNull();
        });
    });
});
