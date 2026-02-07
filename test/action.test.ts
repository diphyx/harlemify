import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStore } from "@harlem/core";

import { shape } from "../src/runtime/core/layers/shape";
import { createModelFactory } from "../src/runtime/core/layers/model";
import { createActionFactory } from "../src/runtime/core/layers/action";
import { buildCommitMethod, createAction } from "../src/runtime/core/utils/action";
import { initializeState, createMutations } from "../src/runtime/core/utils/model";
import {
    type ActionDefinition,
    type ActionHandleContext,
    type ActionHandleContextNoApi,
    ActionOneMode,
    ActionManyMode,
    ActionStatus,
    ActionConcurrent,
    ActionApiMethod,
    DEFINITION,
} from "../src/runtime/core/types/action";
import type { Model } from "../src/runtime/core/types/model";
import { useIsolatedActionStatus, useIsolatedActionError } from "../src/runtime/composables/action";
import type { ShapeInfer } from "../src/runtime/core/types/shape";

const mockFetch = vi.fn();
vi.stubGlobal("$fetch", mockFetch);

beforeEach(() => {
    vi.clearAllMocks();
});

const UserShape = shape((factory) => {
    return {
        id: factory.number(),
        name: factory.string(),
        email: factory.string(),
    };
});

type User = ShapeInfer<typeof UserShape>;

describe("createActionFactory", () => {
    const modelFactory = createModelFactory();

    const model = {
        user: modelFactory.one(UserShape),
        users: modelFactory.many(UserShape),
    };

    const factory = createActionFactory({}, model);

    describe("api()", () => {
        it("returns chain with handle, commit, and DEFINITION", () => {
            const chain = factory.api({
                url: "/users",
                method: ActionApiMethod.GET,
            });

            expect(chain.handle).toBeTypeOf("function");
            expect(chain.commit).toBeTypeOf("function");
            expect(chain[DEFINITION]).toBeDefined();
            expect(chain[DEFINITION].api).toBeDefined();
        });

        it("api().handle() returns chain with commit and DEFINITION", () => {
            const chain = factory
                .api({
                    url: "/users",
                    method: ActionApiMethod.GET,
                })
                .handle(async ({ api }) => {
                    return await api();
                });

            expect(chain.commit).toBeTypeOf("function");
            expect(chain[DEFINITION]).toBeDefined();
            expect(chain[DEFINITION].api).toBeDefined();
            expect(chain[DEFINITION].handle).toBeDefined();
        });

        it("api().commit() returns chain with DEFINITION", () => {
            const chain = factory
                .api({
                    url: "/users",
                    method: ActionApiMethod.GET,
                })
                .commit("users", ActionManyMode.SET);

            expect(chain[DEFINITION]).toBeDefined();
            expect(chain[DEFINITION].api).toBeDefined();
            expect(chain[DEFINITION].commit).toBeDefined();
            expect(chain[DEFINITION].commit?.model).toBe("users");
            expect(chain[DEFINITION].commit?.mode).toBe(ActionManyMode.SET);
        });
    });

    describe("api shortcuts", () => {
        it("api.get() sets GET method", () => {
            const chain = factory.api.get({ url: "/users" });

            expect(chain[DEFINITION].api?.method).toBe(ActionApiMethod.GET);
        });

        it("api.post() sets POST method", () => {
            const chain = factory.api.post({
                url: "/users",
            });

            expect(chain[DEFINITION].api?.method).toBe(ActionApiMethod.POST);
        });

        it("api.put() sets PUT method", () => {
            const chain = factory.api.put({ url: "/users/1" });

            expect(chain[DEFINITION].api?.method).toBe(ActionApiMethod.PUT);
        });

        it("api.patch() sets PATCH method", () => {
            const chain = factory.api.patch({ url: "/users/1" });

            expect(chain[DEFINITION].api?.method).toBe(ActionApiMethod.PATCH);
        });

        it("api.delete() sets DELETE method", () => {
            const chain = factory.api.delete({ url: "/users/1" });

            expect(chain[DEFINITION].api?.method).toBe(ActionApiMethod.DELETE);
        });
    });

    describe("handle()", () => {
        it("returns chain without api", () => {
            const chain = factory.handle(async (_context) => {
                return "result";
            });

            expect(chain.commit).toBeTypeOf("function");
            expect(chain[DEFINITION]).toBeDefined();
            expect(chain[DEFINITION].api).toBeUndefined();
            expect(chain[DEFINITION].handle).toBeDefined();
        });
    });

    describe("commit", () => {
        it("returns chain with DEFINITION", () => {
            const chain = factory.commit("user", ActionOneMode.RESET);

            expect(chain[DEFINITION]).toBeDefined();
            expect(chain[DEFINITION].commit?.model).toBe("user");
            expect(chain[DEFINITION].commit?.mode).toBe(ActionOneMode.RESET);
        });
    });
});

describe("buildCommitMethod", () => {
    it("stores model, mode, value, options in DEFINITION", () => {
        const definition: ActionDefinition<Model, object, unknown> = {
            api: {
                url: "/test",
                method: ActionApiMethod.GET,
            },
        };
        const commit = buildCommitMethod(definition);

        const result = commit("users", ActionManyMode.SET, [{ id: 1 }]);

        expect(result[DEFINITION].api).toEqual(definition.api);
        expect(result[DEFINITION].commit?.model).toBe("users");
        expect(result[DEFINITION].commit?.mode).toBe(ActionManyMode.SET);
        expect(result[DEFINITION].commit?.value).toEqual([{ id: 1 }]);
    });
});

describe("createAction", () => {
    const modelFactory = createModelFactory();

    function setup(definition: ActionDefinition<Model, object, unknown> = {}) {
        const model = {
            user: modelFactory.one(UserShape),
            users: modelFactory.many(UserShape),
        };

        const state = initializeState(model);
        const source = createStore("test-action-" + Math.random(), state);
        const mutations = createMutations(source, model);
        const view = {};

        const action = createAction(definition, view, mutations);

        return {
            action,
            source,
            mutations,
        };
    }

    it("is callable", () => {
        const { action } = setup();

        expect(action).toBeTypeOf("function");
    });

    it("has loading, status, error, data, reset", () => {
        const { action } = setup();

        expect(action.loading).toBeDefined();
        expect(action.status).toBeDefined();
        expect(action.error).toBeDefined();
        expect(action.data).toBeNull();
        expect(action.reset).toBeTypeOf("function");
    });

    it("initial status is IDLE", () => {
        const { action } = setup();

        expect(action.status.value).toBe(ActionStatus.IDLE);
        expect(action.loading.value).toBe(false);
    });

    it("handle-only action executes and sets SUCCESS", async () => {
        const { action } = setup({
            handle: async () => {
                return "result";
            },
        });

        const result = await action();

        expect(result).toBe("result");
        expect(action.status.value).toBe(ActionStatus.SUCCESS);
    });

    it("failed handle sets ERROR status", async () => {
        const { action } = setup({
            handle: async () => {
                throw new Error("fail");
            },
        });

        await expect(action()).rejects.toThrow();
        expect(action.status.value).toBe(ActionStatus.ERROR);
        expect(action.error.value).toBeDefined();
        expect(action.error.value?.name).toBe("ActionHandleError");
    });

    it("reset clears status, error, data", async () => {
        const { action } = setup({
            handle: async () => {
                return "result";
            },
        });

        await action();
        action.reset();

        expect(action.status.value).toBe(ActionStatus.IDLE);
        expect(action.error.value).toBeNull();
        expect(action.data).toBeNull();
    });

    it("api action calls $fetch", async () => {
        const user: User = {
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        };
        mockFetch.mockResolvedValue(user);

        const { action } = setup({
            api: {
                url: "/users/1",
                method: ActionApiMethod.GET,
            },
        });

        const result = await action();

        expect(mockFetch).toHaveBeenCalled();
        expect(result).toEqual(user);
        expect(action.status.value).toBe(ActionStatus.SUCCESS);
    });

    it("api error creates ActionApiError", async () => {
        mockFetch.mockRejectedValue({
            message: "Not Found",
            status: 404,
            statusText: "Not Found",
        });

        const { action } = setup({
            api: {
                url: "/users/999",
                method: ActionApiMethod.GET,
            },
        });

        await expect(action()).rejects.toThrow();
        expect(action.error.value?.name).toBe("ActionApiError");
    });

    it("api with handle processes response", async () => {
        mockFetch.mockResolvedValue([
            {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            },
        ]);

        const { action } = setup({
            api: {
                url: "/users",
                method: ActionApiMethod.GET,
            },
            handle: async ({ api }: ActionHandleContext<Model, object>) => {
                const data = (await api()) as User[];

                return data[0];
            },
        });

        const result = await action();

        expect(result).toEqual({
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        });
    });

    it("action with commit updates state", async () => {
        mockFetch.mockResolvedValue({
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        });

        const { action, source } = setup({
            api: {
                url: "/users/1",
                method: ActionApiMethod.GET,
            },
            commit: {
                model: "user",
                mode: ActionOneMode.SET,
            },
        });

        await action();

        expect(source.state.user).toEqual({
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        });
    });

    describe("concurrency", () => {
        it("BLOCK throws ConcurrentError", async () => {
            const { action } = setup({
                handle: async () => {
                    await new Promise((resolve) => {
                        return setTimeout(resolve, 100);
                    });

                    return "result";
                },
            });

            const first = action();

            await expect(action({ concurrent: ActionConcurrent.BLOCK })).rejects.toThrow("Action is already pending");

            await first;
        });

        it("SKIP returns current promise", async () => {
            const { action } = setup({
                handle: async () => {
                    await new Promise((resolve) => {
                        return setTimeout(resolve, 50);
                    });

                    return "first";
                },
            });

            const first = action();
            const second = action({ concurrent: ActionConcurrent.SKIP });

            const [r1, r2] = await Promise.all([first, second]);

            expect(r1).toBe("first");
            expect(r2).toBe("first");
        });

        it("CANCEL aborts current and starts new", async () => {
            let callCount = 0;
            mockFetch.mockImplementation((_url: string, options: { signal?: AbortSignal }) => {
                callCount++;
                const current = callCount;

                return new Promise((resolve, reject) => {
                    const timer = setTimeout(() => {
                        resolve("result-" + current);
                    }, 100);

                    options?.signal?.addEventListener("abort", () => {
                        clearTimeout(timer);
                        reject(new Error("aborted"));
                    });
                });
            });

            const { action } = setup({
                api: {
                    url: "/users",
                    method: ActionApiMethod.GET,
                },
            });

            const first = action();
            const second = action({ concurrent: ActionConcurrent.CANCEL });

            await expect(first).rejects.toThrow();
            const result = await second;

            expect(result).toBe("result-2");
        });

        it("ALLOW executes both actions independently", async () => {
            let callCount = 0;
            const { action } = setup({
                handle: async () => {
                    callCount++;
                    const current = callCount;
                    await new Promise((resolve) => {
                        return setTimeout(resolve, 50);
                    });

                    return "result-" + current;
                },
            });

            const first = action();
            const second = action({ concurrent: ActionConcurrent.ALLOW });

            const [r1, r2] = await Promise.all([first, second]);

            expect(r1).toBe("result-1");
            expect(r2).toBe("result-2");
        });
    });

    it("commit error creates ActionCommitError", async () => {
        const { action } = setup({
            api: {
                url: "/users/1",
                method: ActionApiMethod.GET,
            },
            commit: {
                model: "nonexistent",
                mode: ActionOneMode.SET,
            },
        });
        mockFetch.mockResolvedValue({
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        });

        await expect(action()).rejects.toThrow();
        expect(action.error.value?.name).toBe("ActionCommitError");
    });

    it("handle + commit chain without api", async () => {
        const user: User = {
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        };

        const { action, source } = setup({
            handle: async ({ commit }: ActionHandleContextNoApi<Model, object>) => {
                commit("user", ActionOneMode.SET, user);

                return user;
            },
        });

        const result = await action();

        expect(result).toEqual(user);
        expect(source.state.user).toEqual(user);
    });

    it("transformer transforms result before return", async () => {
        const user: User = {
            id: 1,
            name: "Alice",
            email: "alice@test.com",
        };
        mockFetch.mockResolvedValue(user);

        const { action } = setup({
            api: {
                url: "/users/1",
                method: ActionApiMethod.GET,
            },
        });

        const result = await action({
            transformer: (data: unknown) => {
                return (data as User).name;
            },
        });

        expect(result).toBe("Alice");
    });

    it("bind uses custom status and error refs", async () => {
        const customStatus = useIsolatedActionStatus();
        const customError = useIsolatedActionError();

        const { action } = setup({
            handle: async () => {
                return "result";
            },
        });

        await action({
            bind: {
                status: customStatus,
                error: customError,
            },
        });

        expect(customStatus.value).toBe(ActionStatus.SUCCESS);
        expect(customError.value).toBeNull();
        expect(action.status.value).toBe(ActionStatus.IDLE);
    });

    it("bind sets custom error ref on failure", async () => {
        const customStatus = useIsolatedActionStatus();
        const customError = useIsolatedActionError();

        const { action } = setup({
            handle: async () => {
                throw new Error("fail");
            },
        });

        await expect(
            action({
                bind: {
                    status: customStatus,
                    error: customError,
                },
            }),
        ).rejects.toThrow();

        expect(customStatus.value).toBe(ActionStatus.ERROR);
        expect(customError.value).toBeDefined();
        expect(action.status.value).toBe(ActionStatus.IDLE);
        expect(action.error.value).toBeNull();
    });

    it("commit mode override at call time", async () => {
        const users: User[] = [
            {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            },
        ];
        mockFetch.mockResolvedValue({
            id: 2,
            name: "Bob",
            email: "bob@test.com",
        });

        const { action, source, mutations } = setup({
            api: {
                url: "/users/2",
                method: ActionApiMethod.GET,
            },
            commit: {
                model: "users",
                mode: ActionManyMode.SET,
            },
        });

        mutations.users.set(users);

        await action({
            commit: {
                mode: ActionManyMode.ADD,
            },
        });

        expect(source.state.users as User[]).toHaveLength(2);
        expect((source.state.users as User[])[0].name).toBe("Alice");
        expect((source.state.users as User[])[1].name).toBe("Bob");
    });

    describe("payload options", () => {
        it("passes headers to fetch", async () => {
            mockFetch.mockResolvedValue({});

            const { action } = setup({
                api: {
                    url: "/users",
                    method: ActionApiMethod.GET,
                },
            });

            await action({
                headers: {
                    Authorization: "Bearer token",
                },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: "Bearer token",
                    }),
                }),
            );
        });

        it("passes query to fetch", async () => {
            mockFetch.mockResolvedValue({});

            const { action } = setup({
                api: {
                    url: "/users",
                    method: ActionApiMethod.GET,
                },
            });

            await action({
                query: {
                    page: 1,
                    limit: 10,
                },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    query: expect.objectContaining({
                        page: 1,
                        limit: 10,
                    }),
                }),
            );
        });

        it("passes body to fetch", async () => {
            mockFetch.mockResolvedValue({});

            const { action } = setup({
                api: {
                    url: "/users",
                    method: ActionApiMethod.POST,
                },
            });

            await action({
                body: {
                    name: "Alice",
                    email: "alice@test.com",
                },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    body: expect.objectContaining({
                        name: "Alice",
                        email: "alice@test.com",
                    }),
                }),
            );
        });

        it("payload timeout overrides definition timeout", async () => {
            mockFetch.mockResolvedValue({});

            const { action } = setup({
                api: {
                    url: "/users",
                    method: ActionApiMethod.GET,
                    timeout: 5000,
                },
            });

            await action({
                timeout: 1000,
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    timeout: 1000,
                }),
            );
        });

        it("passes custom signal to fetch", async () => {
            mockFetch.mockResolvedValue({});
            const controller = new AbortController();

            const { action } = setup({
                api: {
                    url: "/users",
                    method: ActionApiMethod.GET,
                },
            });

            await action({
                signal: controller.signal,
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    signal: controller.signal,
                }),
            );
        });
    });
});
