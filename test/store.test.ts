import { describe, it, expect, vi } from "vitest";
import { createStore } from "../src/runtime/core/store";
import { shape } from "../src/runtime/core/layers/shape";
import { ActionOneMode, ActionManyMode, ActionStatus } from "../src/runtime/core/types/action";
import type { ShapeInfer } from "../src/runtime/core/types/shape";

const mockFetch = globalThis.$fetch as unknown as ReturnType<typeof vi.fn>;

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
                    fetchUser: a.api.get({ url: "/users/1" }).commit("user", ActionOneMode.SET),

                    fetchPosts: a.api.get({ url: "/posts" }).commit("posts", ActionManyMode.SET),

                    clearUser: a.commit("user", ActionOneMode.RESET),

                    clearPosts: a.commit("posts", ActionManyMode.RESET),

                    handleOnly: a.handle(async (_context) => {
                        return "handled";
                    }),

                    fetchAndProcess: a.api
                        .get({ url: "/users" })
                        .handle(async ({ api }) => {
                            const data = await api();

                            return data;
                        })
                        .commit("user", ActionOneMode.SET),
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

    describe("model committer", () => {
        it("set on one-model", () => {
            const store = setup();
            const user: User = {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            };

            store.model("user", ActionOneMode.SET, user);

            expect(store.view.user.value).toEqual(user);
        });

        it("reset on one-model", () => {
            const store = setup();
            store.model("user", ActionOneMode.SET, {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            store.model("user", ActionOneMode.RESET);

            expect(store.view.user.value).toBeNull();
        });

        it("patch on one-model", () => {
            const store = setup();
            store.model("user", ActionOneMode.SET, {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            store.model("user", ActionOneMode.PATCH, { name: "Bob" });

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

            store.model("posts", ActionManyMode.SET, posts);

            expect(store.view.posts.value).toEqual(posts);
        });

        it("reset on many-model", () => {
            const store = setup();
            store.model("posts", ActionManyMode.SET, [
                {
                    id: 1,
                    title: "First",
                    body: "Content 1",
                },
            ]);

            store.model("posts", ActionManyMode.RESET);

            expect(store.view.posts.value).toEqual([]);
        });

        it("add on many-model", () => {
            const store = setup();
            store.model("posts", ActionManyMode.SET, [
                {
                    id: 1,
                    title: "First",
                    body: "Content 1",
                },
            ]);

            store.model("posts", ActionManyMode.ADD, {
                id: 2,
                title: "Second",
                body: "Content 2",
            });

            expect(store.view.posts.value).toHaveLength(2);
        });

        it("remove on many-model", () => {
            const store = setup();
            store.model("posts", ActionManyMode.SET, [
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

            store.model("posts", ActionManyMode.REMOVE, {
                id: 1,
                title: "First",
                body: "Content 1",
            });

            expect(store.view.posts.value).toHaveLength(1);
            expect((store.view.posts.value as Post[])[0].id).toBe(2);
        });
    });

    describe("views", () => {
        it("reflects current state", () => {
            const store = setup();

            expect(store.view.user.value).toBeNull();
            expect(store.view.posts.value).toEqual([]);
        });

        it("resolver transforms data", () => {
            const store = setup();

            expect(store.view.userName.value).toBe("unknown");

            store.model("user", ActionOneMode.SET, {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            expect(store.view.userName.value).toBe("Alice");
        });

        it("computed count view updates", () => {
            const store = setup();

            expect(store.view.postCount.value).toBe(0);

            store.model("posts", ActionManyMode.SET, [
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

            store.model("user", ActionOneMode.SET, {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });
            store.model("posts", ActionManyMode.SET, [
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

        it("commit-only action resets state", async () => {
            const store = setup();
            store.model("user", ActionOneMode.SET, {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            await store.action.clearUser();

            expect(store.view.user.value).toBeNull();
        });

        it("handle-only action executes", async () => {
            const store = setup();

            const result = await store.action.handleOnly();

            expect(result).toBe("handled");
            expect(store.action.handleOnly.status.value).toBe(ActionStatus.SUCCESS);
        });

        it("api + handle + commit action processes and commits", async () => {
            const store = setup();
            const user: User = {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            };
            mockFetch.mockResolvedValue(user);

            await store.action.fetchAndProcess();

            expect(store.view.user.value).toEqual(user);
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
