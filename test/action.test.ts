import { describe, it, expect, vi } from "vitest";
import { createStore } from "@harlem/core";

import { shape } from "../src/runtime/core/layers/shape";
import { createModelFactory } from "../src/runtime/core/layers/model";
import { createActionFactory } from "../src/runtime/core/layers/action";
import { createAction } from "../src/runtime/core/utils/action";
import { ActionApiError } from "../src/runtime/core/utils/error";
import { createStoreState, createStoreModel, createStoreView } from "../src/runtime/core/utils/store";
import { createViewFactory } from "../src/runtime/core/layers/view";
import {
    type ActionDefinition,
    ActionStatus,
    ActionConcurrent,
    ActionApiMethod,
} from "../src/runtime/core/types/action";
import { ModelOneMode, ModelManyMode, type ModelDefinitions } from "../src/runtime/core/types/model";
import type { ViewDefinitions } from "../src/runtime/core/types/view";
import { useIsolatedActionStatus, useIsolatedActionError } from "../src/runtime/composables/action";
import type { ShapeInfer } from "../src/runtime/core/types/shape";

const mockFetch = (globalThis as any).$fetch;

const UserShape = shape((factory) => {
    return {
        id: factory.number(),
        name: factory.string(),
        email: factory.string(),
    };
});

type User = ShapeInfer<typeof UserShape>;

describe("createActionFactory", () => {
    const factory = createActionFactory();

    describe("api()", () => {
        it("returns definition with request", () => {
            const definition = factory.api({
                url: "/users",
                method: ActionApiMethod.GET,
            });

            expect(definition).toBeDefined();
            expect(definition.request).toBeDefined();
        });

        it("api() with commit returns definition with request and commit", () => {
            const definition = factory.api(
                {
                    url: "/users",
                    method: ActionApiMethod.GET,
                },
                {
                    model: "users",
                    mode: ModelManyMode.SET,
                },
            );

            expect(definition.request).toBeDefined();
            expect(definition.commit).toBeDefined();
            expect(definition.commit?.model).toBe("users");
            expect(definition.commit?.mode).toBe(ModelManyMode.SET);
        });
    });

    describe("api shortcuts", () => {
        it("api.get() sets GET method", () => {
            const definition = factory.api.get({ url: "/users" });

            expect(definition.request.method).toBe(ActionApiMethod.GET);
        });

        it("api.head() sets HEAD method", () => {
            const definition = factory.api.head({ url: "/users" });

            expect(definition.request.method).toBe(ActionApiMethod.HEAD);
        });

        it("api.post() sets POST method", () => {
            const definition = factory.api.post({ url: "/users" });

            expect(definition.request.method).toBe(ActionApiMethod.POST);
        });

        it("api.put() sets PUT method", () => {
            const definition = factory.api.put({ url: "/users/1" });

            expect(definition.request.method).toBe(ActionApiMethod.PUT);
        });

        it("api.patch() sets PATCH method", () => {
            const definition = factory.api.patch({ url: "/users/1" });

            expect(definition.request.method).toBe(ActionApiMethod.PATCH);
        });

        it("api.delete() sets DELETE method", () => {
            const definition = factory.api.delete({ url: "/users/1" });

            expect(definition.request.method).toBe(ActionApiMethod.DELETE);
        });
    });

    describe("handler()", () => {
        it("returns definition with callback", () => {
            const definition = factory.handler(async (_context) => {
                return "result";
            });

            expect(definition).toBeDefined();
            expect(definition.callback).toBeDefined();
        });
    });
});

describe("createAction", () => {
    const modelFactory = createModelFactory();
    const viewFactory = createViewFactory();

    function setup(partial: Partial<ActionDefinition<ModelDefinitions, ViewDefinitions<ModelDefinitions>>> = {}) {
        let key = "test";

        const modelDefs = {
            user: modelFactory.one(UserShape),
            users: modelFactory.many(UserShape),
        };

        const viewDefs = {
            user: viewFactory.from("user"),
        };

        const state = createStoreState(modelDefs);
        const source = createStore("test-action-" + Math.random(), state);

        for (const [k, def] of Object.entries(modelDefs)) {
            def.setKey(k);
        }
        for (const [k, def] of Object.entries(viewDefs)) {
            def.setKey(k);
        }

        const model = createStoreModel(modelDefs, source);
        const view = createStoreView(viewDefs, source);

        const definition = {
            get key() {
                return key;
            },
            setKey(value: string) {
                key = value;
            },
            ...partial,
        } as ActionDefinition<ModelDefinitions, ViewDefinitions<ModelDefinitions>>;

        const action = createAction(definition, model, view);

        return {
            action,
            source,
            model,
        };
    }

    describe("basics", () => {
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
    });

    describe("handler", () => {
        it("executes and sets SUCCESS", async () => {
            const { action } = setup({
                callback: async () => {
                    return "result";
                },
            });

            const result = await action();

            expect(result).toBe("result");
            expect(action.status.value).toBe(ActionStatus.SUCCESS);
        });

        it("failed handler sets ERROR status", async () => {
            const { action } = setup({
                callback: async () => {
                    throw new Error("fail");
                },
            });

            await expect(action()).rejects.toThrow();
            expect(action.status.value).toBe(ActionStatus.ERROR);
            expect(action.error.value).toBeDefined();
            expect(action.error.value?.name).toBe("ActionHandlerError");
        });

        it("re-throws ActionApiError from handler without wrapping", async () => {
            const { action } = setup({
                callback: async () => {
                    throw new ActionApiError({ message: "Not Found", status: 404, statusText: "Not Found" });
                },
            });

            await expect(action()).rejects.toThrow();
            expect(action.error.value?.name).toBe("ActionApiError");
        });

        it("reset clears status, error, data", async () => {
            const { action } = setup({
                callback: async () => {
                    return "result";
                },
            });

            await action();
            action.reset();

            expect(action.status.value).toBe(ActionStatus.IDLE);
            expect(action.error.value).toBeNull();
            expect(action.data).toBeNull();
        });
    });

    describe("api", () => {
        it("calls $fetch", async () => {
            const user: User = {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            };
            mockFetch.mockResolvedValue(user);

            const { action } = setup({
                request: {
                    url: "/users/1",
                    method: ActionApiMethod.GET,
                },
            });

            const result = await action();

            expect(mockFetch).toHaveBeenCalled();
            expect(result).toEqual(user);
            expect(action.status.value).toBe(ActionStatus.SUCCESS);
        });

        it("error creates ActionApiError", async () => {
            mockFetch.mockRejectedValue({
                message: "Not Found",
                status: 404,
                statusText: "Not Found",
            });

            const { action } = setup({
                request: {
                    url: "/users/999",
                    method: ActionApiMethod.GET,
                },
            });

            await expect(action()).rejects.toThrow();
            expect(action.error.value?.name).toBe("ActionApiError");
        });

        it("prepends endpoint to url", async () => {
            mockFetch.mockResolvedValue({});

            const actionFactory = createActionFactory({
                endpoint: "https://api.example.com",
            });

            const definition = actionFactory.api.get({ url: "/users" });

            const modelDefs = {
                user: modelFactory.one(UserShape),
                users: modelFactory.many(UserShape),
            };

            const viewDefs = {
                user: viewFactory.from("user"),
            };

            const state = createStoreState(modelDefs);
            const source = createStore("test-endpoint-" + Math.random(), state);

            for (const [k, def] of Object.entries(modelDefs)) {
                def.setKey(k);
            }
            for (const [k, def] of Object.entries(viewDefs)) {
                def.setKey(k);
            }

            const model = createStoreModel(modelDefs, source);
            const view = createStoreView(viewDefs, source);

            definition.setKey("fetchUsers");
            const action = createAction(definition, model, view);

            await action();

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.example.com/users",
                expect.objectContaining({
                    method: ActionApiMethod.GET,
                }),
            );
        });
    });

    describe("commit", () => {
        it("updates state", async () => {
            mockFetch.mockResolvedValue({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });

            const { action, source } = setup({
                request: {
                    url: "/users/1",
                    method: ActionApiMethod.GET,
                },
                commit: {
                    model: "user",
                    mode: ModelOneMode.SET,
                },
            });

            await action();

            expect(source.state.user).toEqual({
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            });
        });

        it("value function transforms data", async () => {
            const users: User[] = [
                {
                    id: 1,
                    name: "Alice",
                    email: "alice@test.com",
                },
            ];
            mockFetch.mockResolvedValue(users);

            const { action, source } = setup({
                request: {
                    url: "/users",
                    method: ActionApiMethod.GET,
                },
                commit: {
                    model: "users",
                    mode: ModelManyMode.SET,
                    value: (data: unknown) => data,
                },
            });

            await action();

            expect(source.state.users as User[]).toHaveLength(1);
            expect((source.state.users as User[])[0]).toEqual(users[0]);
        });

        it("error creates ActionCommitError", async () => {
            const { action } = setup({
                request: {
                    url: "/users/1",
                    method: ActionApiMethod.GET,
                },
                commit: {
                    model: "nonexistent",
                    mode: ModelOneMode.SET,
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

        it("mode override at call time", async () => {
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

            const { action, source, model } = setup({
                request: {
                    url: "/users/2",
                    method: ActionApiMethod.GET,
                },
                commit: {
                    model: "users",
                    mode: ModelManyMode.SET,
                },
            });

            model.users.set(users);

            await action({
                commit: {
                    mode: ModelManyMode.ADD,
                },
            });

            expect(source.state.users as User[]).toHaveLength(2);
            expect((source.state.users as User[])[0].name).toBe("Alice");
            expect((source.state.users as User[])[1].name).toBe("Bob");
        });
    });

    describe("concurrency", () => {
        it("BLOCK throws ConcurrentError", async () => {
            const { action } = setup({
                callback: async () => {
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
                callback: async () => {
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
                request: {
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

        it("uses concurrent from request definition", async () => {
            const { action } = setup({
                request: {
                    url: "/users",
                    method: ActionApiMethod.GET,
                    concurrent: ActionConcurrent.SKIP,
                },
            });

            mockFetch.mockImplementation(() => {
                return new Promise((resolve) => {
                    setTimeout(() => resolve({}), 50);
                });
            });

            const first = action();
            const second = action();

            const [r1, r2] = await Promise.all([first, second]);

            expect(r1).toEqual(r2);
        });

        it("ALLOW executes both actions independently", async () => {
            let callCount = 0;
            const { action } = setup({
                callback: async () => {
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

    describe("transformer", () => {
        it("response transformer transforms response", async () => {
            const user: User = {
                id: 1,
                name: "Alice",
                email: "alice@test.com",
            };
            mockFetch.mockResolvedValue(user);

            const { action } = setup({
                request: {
                    url: "/users/1",
                    method: ActionApiMethod.GET,
                },
            });

            const result = await action({
                transformer: {
                    response: (data: unknown) => {
                        return { ...(data as User), name: "Transformed" };
                    },
                },
            });

            expect((result as User).name).toBe("Transformed");
        });

        it("request transformer transforms resolved api", async () => {
            mockFetch.mockResolvedValue({ success: true });

            const { action } = setup({
                request: {
                    url: "/users",
                    method: ActionApiMethod.POST,
                },
            });

            await action({
                body: { name: "Alice" },
                transformer: {
                    request: (api) => {
                        return {
                            ...api,
                            body: { ...(api.body as Record<string, unknown>), injected: true },
                        };
                    },
                },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    body: expect.objectContaining({
                        name: "Alice",
                        injected: true,
                    }),
                }),
            );
        });

        it("both request and response", async () => {
            mockFetch.mockResolvedValue({ id: 1, full_name: "Alice Smith" });

            const { action } = setup({
                request: {
                    url: "/users",
                    method: ActionApiMethod.POST,
                },
            });

            const result = await action({
                body: { name: "Alice" },
                transformer: {
                    request: (api) => {
                        return {
                            ...api,
                            body: { ...(api.body as Record<string, unknown>), timestamp: 123 },
                        };
                    },
                    response: (data: unknown) => {
                        return (data as Record<string, unknown>).full_name;
                    },
                },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    body: expect.objectContaining({
                        name: "Alice",
                        timestamp: 123,
                    }),
                }),
            );
            expect(result).toBe("Alice Smith");
        });

        it("request transformer is called for GET requests", async () => {
            const requestFn = vi.fn((api) => api);
            mockFetch.mockResolvedValue({ id: 1 });

            const { action } = setup({
                request: {
                    url: "/users/1",
                    method: ActionApiMethod.GET,
                },
            });

            await action({
                transformer: {
                    request: requestFn,
                },
            });

            expect(requestFn).toHaveBeenCalled();
        });
    });

    describe("bind", () => {
        it("uses custom status and error refs", async () => {
            const customStatus = useIsolatedActionStatus();
            const customError = useIsolatedActionError();

            const { action } = setup({
                callback: async () => {
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

        it("sets custom error ref on failure", async () => {
            const customStatus = useIsolatedActionStatus();
            const customError = useIsolatedActionError();

            const { action } = setup({
                callback: async () => {
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
    });

    describe("options", () => {
        it("passes headers to fetch", async () => {
            mockFetch.mockResolvedValue({});

            const { action } = setup({
                request: {
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
                request: {
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
                request: {
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

        it("uses request timeout from definition", async () => {
            mockFetch.mockResolvedValue({});

            const { action } = setup({
                request: {
                    url: "/users",
                    method: ActionApiMethod.GET,
                    timeout: 5000,
                },
            });

            await action();

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    timeout: 5000,
                }),
            );
        });

        it("call timeout overrides definition timeout", async () => {
            mockFetch.mockResolvedValue({});

            const { action } = setup({
                request: {
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
                request: {
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

        it("url as function resolves from view", async () => {
            mockFetch.mockResolvedValue({});

            const { action } = setup({
                request: {
                    url: () => "/dynamic/path",
                    method: ActionApiMethod.GET,
                },
            });

            await action();

            expect(mockFetch).toHaveBeenCalledWith(
                "/dynamic/path",
                expect.objectContaining({
                    method: ActionApiMethod.GET,
                }),
            );
        });

        it("params resolves url path parameters", async () => {
            mockFetch.mockResolvedValue({});

            const { action } = setup({
                request: {
                    url: "/users/:id/posts/:postId",
                    method: ActionApiMethod.GET,
                },
            });

            await action({
                params: {
                    id: "42",
                    postId: "7",
                },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users/42/posts/7",
                expect.objectContaining({
                    method: ActionApiMethod.GET,
                }),
            );
        });
    });

    describe("alias", () => {
        const AliasedShape = shape((factory) => ({
            id: factory.number().meta({ identifier: true }),
            first_name: factory.string().meta({ alias: "first-name" }),
            last_name: factory.string().meta({ alias: "last-name" }),
            email: factory.string(),
        }));

        function aliasSetup(
            partial: Partial<ActionDefinition<ModelDefinitions, ViewDefinitions<ModelDefinitions>>> = {},
        ) {
            let key = "test";

            const modelDefs = {
                user: modelFactory.one(AliasedShape),
                users: modelFactory.many(AliasedShape),
            };

            const viewDefs = {
                user: viewFactory.from("user"),
            };

            const state = createStoreState(modelDefs);
            const source = createStore("test-alias-" + Math.random(), state);

            for (const [k, def] of Object.entries(modelDefs)) {
                def.setKey(k);
            }
            for (const [k, def] of Object.entries(viewDefs)) {
                def.setKey(k);
            }

            const model = createStoreModel(modelDefs, source);
            const view = createStoreView(viewDefs, source);

            const definition = {
                get key() {
                    return key;
                },
                setKey(value: string) {
                    key = value;
                },
                ...partial,
            } as ActionDefinition<ModelDefinitions, ViewDefinitions<ModelDefinitions>>;

            const action = createAction(definition, model, view);

            return {
                action,
                source,
                model,
            };
        }

        it("inbound: remaps alias keys in response before commit", async () => {
            mockFetch.mockResolvedValue({
                id: 1,
                "first-name": "John",
                "last-name": "Doe",
                email: "john@test.com",
            });

            const { action, source } = aliasSetup({
                request: {
                    url: "/users/1",
                    method: ActionApiMethod.GET,
                },
                commit: {
                    model: "user",
                    mode: ModelOneMode.SET,
                },
            });

            await action();

            expect(source.state.user).toEqual({
                id: 1,
                first_name: "John",
                last_name: "Doe",
                email: "john@test.com",
            });
        });

        it("inbound: remaps alias keys for array response", async () => {
            mockFetch.mockResolvedValue([
                { id: 1, "first-name": "John", "last-name": "Doe", email: "john@test.com" },
                { id: 2, "first-name": "Jane", "last-name": "Smith", email: "jane@test.com" },
            ]);

            const { action, source } = aliasSetup({
                request: {
                    url: "/users",
                    method: ActionApiMethod.GET,
                },
                commit: {
                    model: "users",
                    mode: ModelManyMode.SET,
                },
            });

            await action();

            expect(source.state.users).toEqual([
                { id: 1, first_name: "John", last_name: "Doe", email: "john@test.com" },
                { id: 2, first_name: "Jane", last_name: "Smith", email: "jane@test.com" },
            ]);
        });

        it("outbound: remaps shape keys to alias keys in request body", async () => {
            mockFetch.mockResolvedValue({ id: 1 });

            const { action } = aliasSetup({
                request: {
                    url: "/users",
                    method: ActionApiMethod.POST,
                },
                commit: {
                    model: "user",
                    mode: ModelOneMode.SET,
                },
            });

            await action({
                body: { first_name: "John", last_name: "Doe", email: "john@test.com" },
            });

            expect(mockFetch).toHaveBeenCalledWith(
                "/users",
                expect.objectContaining({
                    body: {
                        "first-name": "John",
                        "last-name": "Doe",
                        email: "john@test.com",
                    },
                }),
            );
        });

        it("no-op when action has no commit", async () => {
            mockFetch.mockResolvedValue({
                id: 1,
                "first-name": "John",
            });

            const { action } = aliasSetup({
                request: {
                    url: "/users/1",
                    method: ActionApiMethod.GET,
                },
            });

            const result = await action();

            expect((result as Record<string, unknown>)["first-name"]).toBe("John");
        });

        it("works with user response transformer", async () => {
            mockFetch.mockResolvedValue({
                data: {
                    id: 1,
                    "first-name": "John",
                    "last-name": "Doe",
                    email: "john@test.com",
                },
            });

            const { action, source } = aliasSetup({
                request: {
                    url: "/users/1",
                    method: ActionApiMethod.GET,
                },
                commit: {
                    model: "user",
                    mode: ModelOneMode.SET,
                },
            });

            await action({
                transformer: {
                    response: (data: unknown) => {
                        return (data as Record<string, unknown>).data;
                    },
                },
            });

            expect(source.state.user).toEqual({
                id: 1,
                first_name: "John",
                last_name: "Doe",
                email: "john@test.com",
            });
        });
    });
});
