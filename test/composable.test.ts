import { describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";

import { createStore } from "../src/runtime/core/store";
import { shape } from "../src/runtime/core/layers/shape";
import { ModelOneMode } from "../src/runtime/core/types/model";
import { ActionStatus } from "../src/runtime/core/types/action";
import { ActionApiError } from "../src/runtime/core/utils/error";
import { useStoreAction, useIsolatedActionStatus, useIsolatedActionError } from "../src/runtime/composables/action";
import { useStoreModel } from "../src/runtime/composables/model";
import { useStoreView } from "../src/runtime/composables/view";

// Setup

const mockFetch = (globalThis as any).$fetch;

const UserShape = shape((factory) => {
    return {
        id: factory.number(),
        name: factory.string(),
    };
});

function setup() {
    return createStore({
        name: "test-composable-" + Math.random(),
        model: (m) => {
            return {
                user: m.one(UserShape),
                users: m.many(UserShape),
            };
        },
        view: (v) => {
            return {
                user: v.from("user"),
                users: v.from("users"),
                userName: v.from("user", (user) => user?.name ?? null),
            };
        },
        action: (a) => {
            return {
                list: a.handler(async (_context) => {
                    return "list-result";
                }),
                get: a.api.get({ url: "/users/1" }, { model: "user", mode: ModelOneMode.SET }),
                fail: a.handler(async (_context) => {
                    throw new Error("fail");
                }),
            };
        },
    });
}

// Action

describe("useIsolatedActionStatus", () => {
    it("returns ref with IDLE status", () => {
        const status = useIsolatedActionStatus();

        expect(status.value).toBe(ActionStatus.IDLE);
    });

    it("returns independent refs", () => {
        const status1 = useIsolatedActionStatus();
        const status2 = useIsolatedActionStatus();

        status1.value = ActionStatus.PENDING;

        expect(status1.value).toBe(ActionStatus.PENDING);
        expect(status2.value).toBe(ActionStatus.IDLE);
    });

    it("is writable", () => {
        const status = useIsolatedActionStatus();

        status.value = ActionStatus.SUCCESS;

        expect(status.value).toBe(ActionStatus.SUCCESS);
    });
});

describe("useIsolatedActionError", () => {
    it("returns ref with null", () => {
        const error = useIsolatedActionError();

        expect(error.value).toBeNull();
    });

    it("returns independent refs", () => {
        const error1 = useIsolatedActionError();
        const error2 = useIsolatedActionError();

        const apiError = new ActionApiError(new Error("test"));

        error1.value = apiError;

        expect(error1.value).toBeDefined();
        expect(error2.value).toBeNull();
    });

    it("is writable", () => {
        const error = useIsolatedActionError();
        const cause = Object.assign(new Error("Not Found"), {
            status: 404,
            statusText: "Not Found",
        });
        const apiError = new ActionApiError(cause);

        error.value = apiError;

        expect(error.value).toEqual(apiError);
        expect((error.value as ActionApiError).status).toBe(404);
    });
});

describe("useStoreAction", () => {
    it("throws if action key not found", () => {
        const store = setup();

        expect(() => useStoreAction(store, "nonexistent" as any)).toThrow('Action "nonexistent" not found in store');
    });

    it("returns execute, loading, status, error, reset", () => {
        const store = setup();
        const { execute, loading, status, error, reset } = useStoreAction(store, "list");

        expect(execute).toBeTypeOf("function");
        expect(loading.value).toBe(false);
        expect(status.value).toBe(ActionStatus.IDLE);
        expect(error.value).toBeNull();
        expect(reset).toBeTypeOf("function");
    });

    it("execute calls the action and returns result", async () => {
        const store = setup();
        const { execute } = useStoreAction(store, "list");

        const result = await execute();

        expect(result).toBe("list-result");
    });

    it("status reflects action state after execute", async () => {
        const store = setup();
        const { execute, status, loading } = useStoreAction(store, "list");

        await execute();

        expect(status.value).toBe(ActionStatus.SUCCESS);
        expect(loading.value).toBe(false);
    });

    it("error reflects action error after failure", async () => {
        const store = setup();
        const { execute, status, error } = useStoreAction(store, "fail");

        await expect(execute()).rejects.toThrow();

        expect(status.value).toBe(ActionStatus.ERROR);
        expect(error.value).toBeDefined();
    });

    it("reset clears status and error", async () => {
        const store = setup();
        const { execute, status, error, reset } = useStoreAction(store, "fail");

        await expect(execute()).rejects.toThrow();
        reset();

        expect(status.value).toBe(ActionStatus.IDLE);
        expect(error.value).toBeNull();
    });

    it("passes options to action call", async () => {
        const store = setup();
        mockFetch.mockResolvedValue({ id: 1, name: "Alice" });

        const { execute } = useStoreAction(store, "get");

        await execute({ headers: { Authorization: "Bearer token" } });

        expect(mockFetch).toHaveBeenCalledWith(
            "/users/1",
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: "Bearer token",
                }),
            }),
        );
    });

    describe("isolated mode", () => {
        it("uses isolated status and error refs", async () => {
            const store = setup();
            const { execute, status, error } = useStoreAction(store, "list", { isolated: true });

            await execute();

            expect(status.value).toBe(ActionStatus.SUCCESS);
            expect(error.value).toBeNull();

            // Global action refs should remain IDLE
            expect(store.action.list.status.value).toBe(ActionStatus.IDLE);
        });

        it("isolated error is separate from global", async () => {
            const store = setup();
            const { execute, status, error } = useStoreAction(store, "fail", { isolated: true });

            await expect(execute()).rejects.toThrow();

            expect(status.value).toBe(ActionStatus.ERROR);
            expect(error.value).toBeDefined();

            // Global action refs should remain IDLE
            expect(store.action.fail.status.value).toBe(ActionStatus.IDLE);
            expect(store.action.fail.error.value).toBeNull();
        });

        it("isolated reset clears isolated refs only", async () => {
            const store = setup();
            const { execute, status, error, reset } = useStoreAction(store, "list", { isolated: true });

            await execute();
            reset();

            expect(status.value).toBe(ActionStatus.IDLE);
            expect(error.value).toBeNull();
        });

        it("multiple isolated calls are independent", async () => {
            const store = setup();
            const first = useStoreAction(store, "list", { isolated: true });
            const second = useStoreAction(store, "list", { isolated: true });

            await first.execute();

            expect(first.status.value).toBe(ActionStatus.SUCCESS);
            expect(second.status.value).toBe(ActionStatus.IDLE);
        });
    });
});

// Model

describe("useStoreModel", () => {
    it("throws if model key not found", () => {
        const store = setup();

        expect(() => useStoreModel(store, "nonexistent" as any)).toThrow('Model "nonexistent" not found in store');
    });

    describe("one model", () => {
        it("returns set, reset, patch", () => {
            const store = setup();
            const { set, reset, patch } = useStoreModel(store, "user");

            expect(set).toBeTypeOf("function");
            expect(reset).toBeTypeOf("function");
            expect(patch).toBeTypeOf("function");
        });

        it("does not return add or remove for one model", () => {
            const store = setup();
            const result = useStoreModel(store, "user");

            expect((result as any).add).toBeUndefined();
            expect((result as any).remove).toBeUndefined();
        });

        it("set updates the model", () => {
            const store = setup();
            const { set } = useStoreModel(store, "user");

            set({ id: 1, name: "Alice" });

            expect(store.view.user.value).toEqual({ id: 1, name: "Alice" });
        });

        it("patch updates partial fields", () => {
            const store = setup();
            const { set, patch } = useStoreModel(store, "user");

            set({ id: 1, name: "Alice" });
            patch({ name: "Bob" });

            expect(store.view.user.value).toEqual({ id: 1, name: "Bob" });
        });

        it("reset clears to default", () => {
            const store = setup();
            const { set, reset } = useStoreModel(store, "user");

            set({ id: 1, name: "Alice" });
            reset();

            expect(store.view.user.value).toBeNull();
        });
    });

    describe("many model", () => {
        it("returns set, reset, patch, add, remove", () => {
            const store = setup();
            const { set, reset, patch, add, remove } = useStoreModel(store, "users");

            expect(set).toBeTypeOf("function");
            expect(reset).toBeTypeOf("function");
            expect(patch).toBeTypeOf("function");
            expect(add).toBeTypeOf("function");
            expect(remove).toBeTypeOf("function");
        });

        it("set replaces the list", () => {
            const store = setup();
            const { set } = useStoreModel(store, "users");
            const users = [
                { id: 1, name: "Alice" },
                { id: 2, name: "Bob" },
            ];

            set(users);

            expect(store.view.users.value).toEqual(users);
        });

        it("add appends items", () => {
            const store = setup();
            const { set, add } = useStoreModel(store, "users");

            set([{ id: 1, name: "Alice" }]);
            add!({ id: 2, name: "Bob" });

            expect(store.view.users.value).toHaveLength(2);
        });

        it("remove removes items", () => {
            const store = setup();
            const { set, remove } = useStoreModel(store, "users");

            set([
                { id: 1, name: "Alice" },
                { id: 2, name: "Bob" },
            ]);
            remove!({ id: 1, name: "Alice" });

            expect(store.view.users.value).toHaveLength(1);
            expect(store.view.users.value[0].name).toBe("Bob");
        });

        it("reset clears to empty array", () => {
            const store = setup();
            const { set, reset } = useStoreModel(store, "users");

            set([{ id: 1, name: "Alice" }]);
            reset();

            expect(store.view.users.value).toEqual([]);
        });
    });

    describe("debounce", () => {
        it("debounces mutations", async () => {
            vi.useFakeTimers();
            const store = setup();
            const { set } = useStoreModel(store, "user", { debounce: 100 });

            set({ id: 1, name: "Alice" });
            set({ id: 2, name: "Bob" });

            // Not yet applied
            expect(store.view.user.value).toBeNull();

            vi.advanceTimersByTime(100);

            // Only last call applied
            expect(store.view.user.value).toEqual({ id: 2, name: "Bob" });

            vi.useRealTimers();
        });
    });

    describe("throttle", () => {
        it("throttles mutations", async () => {
            vi.useFakeTimers();
            const store = setup();
            const { set } = useStoreModel(store, "user", { throttle: 100 });

            set({ id: 1, name: "Alice" });

            // First call goes through immediately
            expect(store.view.user.value).toEqual({ id: 1, name: "Alice" });

            set({ id: 2, name: "Bob" });

            // Second call is throttled — not yet
            expect(store.view.user.value).toEqual({ id: 1, name: "Alice" });

            vi.advanceTimersByTime(100);

            // Now the second call goes through
            expect(store.view.user.value).toEqual({ id: 2, name: "Bob" });

            vi.useRealTimers();
        });
    });
});

// View

describe("useStoreView", () => {
    it("throws if view key not found", () => {
        const store = setup();

        expect(() => useStoreView(store, "nonexistent" as any)).toThrow('View "nonexistent" not found in store');
    });

    describe("data proxy", () => {
        it("data.value returns the view value", () => {
            const store = setup();
            const { data } = useStoreView(store, "user");

            expect(data.value).toBeNull();
        });

        it("data.value reflects model changes", () => {
            const store = setup();
            const { data } = useStoreView(store, "user");

            store.model.user.set({ id: 1, name: "Alice" });

            expect(data.value).toEqual({ id: 1, name: "Alice" });
        });

        it("data proxies property access", () => {
            const store = setup();
            const { data } = useStoreView(store, "user");

            store.model.user.set({ id: 1, name: "Alice" });

            expect((data as any).name).toBe("Alice");
            expect((data as any).id).toBe(1);
        });

        it("data returns undefined for properties when view is null", () => {
            const store = setup();
            const { data } = useStoreView(store, "user");

            expect((data as any).name).toBeUndefined();
        });

        it("has operator works", () => {
            const store = setup();
            const { data } = useStoreView(store, "user");

            store.model.user.set({ id: 1, name: "Alice" });

            expect("name" in data).toBe(true);
            expect("value" in data).toBe(true);
            expect("nonexistent" in data).toBe(false);
        });
    });

    describe("default option", () => {
        it("data.value returns default when view is null", () => {
            const store = setup();
            const { data } = useStoreView(store, "user", {
                default: { id: 0, name: "Guest" },
            });

            expect(data.value).toEqual({ id: 0, name: "Guest" });
        });

        it("data proxies default properties when view is null", () => {
            const store = setup();
            const { data } = useStoreView(store, "user", {
                default: { id: 0, name: "Guest" },
            });

            expect((data as any).name).toBe("Guest");
        });

        it("data.value returns actual value when view is not null", () => {
            const store = setup();
            const { data } = useStoreView(store, "user", {
                default: { id: 0, name: "Guest" },
            });

            store.model.user.set({ id: 1, name: "Alice" });

            expect(data.value).toEqual({ id: 1, name: "Alice" });
            expect((data as any).name).toBe("Alice");
        });
    });

    describe("proxy: false", () => {
        it("data is a ComputedRef", () => {
            const store = setup();
            const { data } = useStoreView(store, "user", { proxy: false });

            expect(data.value).toBeNull();
        });

        it("data.value reflects model changes", () => {
            const store = setup();
            const { data } = useStoreView(store, "user", { proxy: false });

            store.model.user.set({ id: 1, name: "Alice" });

            expect(data.value).toEqual({ id: 1, name: "Alice" });
        });

        it("data does not proxy properties", () => {
            const store = setup();
            const { data } = useStoreView(store, "user", { proxy: false });

            store.model.user.set({ id: 1, name: "Alice" });

            expect((data as any).name).toBeUndefined();
        });

        it("data.value returns default when view is null", () => {
            const store = setup();
            const { data } = useStoreView(store, "user", { proxy: false, default: { id: 0, name: "Guest" } });

            expect(data.value).toEqual({ id: 0, name: "Guest" });
        });

        it("data.value returns actual value over default", () => {
            const store = setup();
            const { data } = useStoreView(store, "user", { proxy: false, default: { id: 0, name: "Guest" } });

            store.model.user.set({ id: 1, name: "Alice" });

            expect(data.value).toEqual({ id: 1, name: "Alice" });
        });
    });

    describe("track", () => {
        it("fires callback immediately when immediate is true", async () => {
            const store = setup();
            const cb = vi.fn();
            const { track } = useStoreView(store, "user");

            track(cb, { immediate: true });

            await nextTick();

            expect(cb).toHaveBeenCalledWith(null);
        });

        it("fires callback on value change", async () => {
            const store = setup();
            const cb = vi.fn();
            const { track } = useStoreView(store, "user");

            track(cb);

            store.model.user.set({ id: 1, name: "Alice" });

            await nextTick();

            expect(cb).toHaveBeenCalledWith(expect.objectContaining({ id: 1, name: "Alice" }));
        });

        it("respects immediate: false", async () => {
            const store = setup();
            const cb = vi.fn();
            const { track } = useStoreView(store, "user");

            track(cb, { immediate: false });

            await nextTick();

            expect(cb).not.toHaveBeenCalled();

            store.model.user.set({ id: 1, name: "Alice" });

            await nextTick();

            expect(cb).toHaveBeenCalledTimes(1);
        });

        it("returns stop handle", async () => {
            const store = setup();
            const cb = vi.fn();
            const { track } = useStoreView(store, "user");

            const stop = track(cb, { immediate: false });
            stop();

            store.model.user.set({ id: 1, name: "Alice" });

            await nextTick();

            expect(cb).not.toHaveBeenCalled();
        });

        it("track resolves default when value is null", async () => {
            const store = setup();
            const cb = vi.fn();
            const { track } = useStoreView(store, "user", {
                default: { id: 0, name: "Guest" },
            });

            track(cb, { immediate: true });

            await nextTick();

            expect(cb).toHaveBeenCalledWith({ id: 0, name: "Guest" });
        });

        it("debounces track callback", async () => {
            vi.useFakeTimers();
            const store = setup();
            const cb = vi.fn();
            const { track } = useStoreView(store, "user");

            track(cb, { immediate: false, debounce: 100 });

            store.model.user.set({ id: 1, name: "Alice" });
            await nextTick();

            expect(cb).not.toHaveBeenCalled();

            vi.advanceTimersByTime(100);

            expect(cb).toHaveBeenCalledTimes(1);

            vi.useRealTimers();
        });
    });
});
