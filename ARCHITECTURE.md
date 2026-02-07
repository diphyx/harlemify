# Harlemify Architecture

## Overview

| Layer      | Purpose           | Factory Methods                 |
| ---------- | ----------------- | ------------------------------- |
| **Shape**  | Schema definition | `shape()`                       |
| **Model**  | State slots       | `one()`, `many()`               |
| **View**   | Readonly queries  | `from()`, `merge()`             |
| **Action** | State changes     | `api()`, `handle()`, `commit()` |

---

# Definition

What you write when creating a store.

---

## Shape

Base schema definition using Zod. The `shape()` factory ensures only `z.object` is used.

### Example

```typescript
import { z } from "zod";
import { shape, ShapeInfer } from "@diphyx/harlemify";

export const userShape = shape({
    id: z.number().meta({ identifier: true }),
    uuid: z.string(),
    name: z.string().default("anonymous"),
});

export type UserShape = ShapeInfer<typeof userShape>;
```

### Types

```typescript
import { z } from "zod";

type ShapeDefinition = z.ZodObject<z.ZodRawShape>;

type ShapeInfer<T extends z.ZodObject<any>> = z.infer<T>;
```

### Factory

```typescript
function shape<T extends z.ZodRawShape>(definition: T): z.ZodObject<T> {
    return z.object(definition);
}
```

---

## Store

Combines Model, View, and Action definitions via factory callbacks.

### Example

```typescript
import { createStore } from "@diphyx/harlemify";
import { userShape } from "~/shapes/user";

export const userStore = createStore({
    name: "user",
    model({ one, many }) {
        return {
            selected: one(userShape),
            current: one(userShape, { default: { id: 0, name: "guest" } }),
            list: many(userShape),
            filtered: many(userShape, { identifier: "uuid" }),
        };
    },
    view({ from, merge }) {
        return {
            selected: from("selected"),
            list: from("list"),
            active: from("list", (items) => items.filter((u) => u.active)),
            first: from("list", (items) => items[0] ?? null),
            summary: merge(["list", "selected"], (list, selected) => ({
                total: list.length,
                hasSelection: selected !== null,
            })),
        };
    },
    action({ api, handle, commit }) {
        return {
            deselect: commit("selected", "reset"),
            clearList: commit("list", "reset"),
            addUser: commit("list", "add", newUser),
            selectFirst: handle(async ({ view, commit }) => {
                commit("selected", "set", view.list[0] ?? null);
            }),
            transform: handle(async ({ view }) => {
                return view.list.filter((u) => u.active);
            }).commit("filtered", "set"),
            fetch: api({ url: "/users", method: "GET" }).commit("list", "set"),
            sync: api({ url: "/users/sync", method: "POST" }).handle(async ({ api, commit }) => {
                const response = await api();
                commit("list", "set", response.users);
            }),
        };
    },
});
```

### Types

```typescript
interface StoreConfig<
    M extends Model,
    VD extends ViewDefinitions<M>,
    AD extends ActionDefinitions<M, StoreView<M, VD>>,
> {
    name: string;
    model: (factory: ModelFactory) => M;
    view: (factory: ViewFactory<M>) => VD;
    action: (factory: ActionFactory<M, StoreView<M, VD>>) => AD;
}

interface Store<M extends Model, VD extends ViewDefinitions<M>, AD extends ActionDefinitions<M, StoreView<M, VD>>> {
    model: StoreModel<M>;
    view: StoreView<M, VD>;
    action: StoreAction<M, StoreView<M, VD>, AD>;
}

interface StoreModel<M extends Model> {
    commit: ActionCommitFn<M>;
}

function createStore<M extends Model, VD extends ViewDefinitions<M>, AD extends ActionDefinitions<M, StoreView<M, VD>>>(
    config: StoreConfig<M, VD, AD>,
): Store<M, VD, AD>;
```

---

## Model

State slots using shape. Defined via `model()` callback.

### Example

```typescript
model({ one, many }) {
    return {
        selected: one(userShape),
        current: one(userShape, { default: { id: 0, name: "guest" } }),
        list: many(userShape),
        filtered: many(userShape, { identifier: "uuid" }),
    };
}
```

### Factory Methods

| Method   | Description           | Default Value |
| -------- | --------------------- | ------------- |
| `one()`  | Single object slot    | `null`        |
| `many()` | Array of objects slot | `[]`          |

### Types

```typescript
import { z } from "zod";

// Base
type Shape = Record<string, unknown>;

// Enums
enum ModelKind {
    OBJECT = "object",
    ARRAY = "array",
}

// Options
interface ModelOneOptions<S extends Shape> {
    identifier?: keyof S;
    default?: S;
}

interface ModelManyOptions<S extends Shape> {
    identifier?: keyof S;
    default?: S[];
}

// Definitions
interface ModelOneDefinition<S extends Shape> {
    shape: z.ZodObject<z.ZodRawShape>;
    kind: ModelKind.OBJECT;
    options?: ModelOneOptions<S>;
}

interface ModelManyDefinition<S extends Shape> {
    shape: z.ZodObject<z.ZodRawShape>;
    kind: ModelKind.ARRAY;
    options?: ModelManyOptions<S>;
}

type ModelDefinition<S extends Shape> = ModelOneDefinition<S> | ModelManyDefinition<S>;

type Model = Record<string, ModelDefinition<Shape>>;

// Utilities
type ModelInstance<M extends Model, K extends keyof M> =
    M[K] extends ModelOneDefinition<infer S> ? S | null : M[K] extends ModelManyDefinition<infer S> ? S[] : never;

type ModelShape<M extends Model, K extends keyof M> = M[K] extends ModelDefinition<infer S> ? S : never;

type ModelOneKey<M extends Model> = {
    [K in keyof M]: M[K] extends ModelOneDefinition<infer _S> ? K : never;
}[keyof M];

type ModelManyKey<M extends Model> = {
    [K in keyof M]: M[K] extends ModelManyDefinition<infer _S> ? K : never;
}[keyof M];
```

### Factory

```typescript
interface ModelFactory {
    one<S extends Shape>(shape: z.ZodObject<z.ZodRawShape>, options?: ModelOneOptions<S>): ModelOneDefinition<S>;
    many<S extends Shape>(shape: z.ZodObject<z.ZodRawShape>, options?: ModelManyOptions<S>): ModelManyDefinition<S>;
}
```

---

## View

Readonly queries from model. Defined via `view()` callback.

### Example

```typescript
view({ from, merge }) {
    return {
        selected: from("selected"),
        list: from("list"),
        active: from("list", (items) => items.filter((u) => u.active)),
        first: from("list", (items) => items[0] ?? null),
        summary: merge(["list", "selected"], (list, selected) => ({
            total: list.length,
            hasSelection: selected !== null,
        })),
    };
}
```

### Factory Methods

| Method    | Description                  |
| --------- | ---------------------------- |
| `from()`  | Query single model source    |
| `merge()` | Query multiple model sources |

### Types

```typescript
import { DeepReadonly } from "vue";

// Resolvers
type ViewFromResolver<M extends Model, K extends keyof M, R> = (value: DeepReadonly<ModelInstance<M, K>>) => R;

type ViewMergeResolver<M extends Model, K extends readonly (keyof M)[], R> = (
    ...values: {
        [I in keyof K]: K[I] extends keyof M ? DeepReadonly<ModelInstance<M, K[I]>> : never;
    }
) => R;

// Definitions
interface ViewFromDefinition<M extends Model, K extends keyof M, R = ModelInstance<M, K>> {
    sources: readonly [K];
    resolver?: ViewFromResolver<M, K, R>;
}

interface ViewMergeDefinition<M extends Model, K extends readonly (keyof M)[], R> {
    sources: K;
    resolver: ViewMergeResolver<M, K, R>;
}

type ViewDefinition<M extends Model> =
    | ViewFromDefinition<M, keyof M, unknown>
    | ViewMergeDefinition<M, readonly (keyof M)[], unknown>;

type ViewDefinitions<M extends Model> = Record<string, ViewDefinition<M>>;

// Result
type ViewResult<M extends Model, VD extends ViewDefinition<M>> =
    VD extends ViewFromDefinition<M, infer K, infer R>
        ? R
        : VD extends ViewMergeDefinition<M, infer K, infer R>
          ? R
          : never;

type StoreView<M extends Model, VD extends ViewDefinitions<M>> = {
    readonly [K in keyof VD]: ViewResult<M, VD[K]>;
};
```

### Factory

```typescript
interface ViewFactory<M extends Model> {
    from<K extends keyof M>(source: K): ViewFromDefinition<M, K, ModelInstance<M, K>>;
    from<K extends keyof M, R>(source: K, resolver: ViewFromResolver<M, K, R>): ViewFromDefinition<M, K, R>;
    merge<K extends readonly (keyof M)[], R>(
        sources: K,
        resolver: ViewMergeResolver<M, K, R>,
    ): ViewMergeDefinition<M, K, R>;
}
```

---

## Action

State changes with HTTP support. Defined via `action()` callback.

### Example

```typescript
action({ api, handle, commit }) {
    return {
        // commit only
        deselect: commit("selected", "reset"),
        clearList: commit("list", "reset"),
        addUser: commit("list", "add", newUser),

        // handle only
        selectFirst: handle(async ({ view, commit }) => {
            commit("selected", "set", view.list[0] ?? null);
        }),

        // handle + commit
        transform: handle(async ({ view }) => {
            return view.list.filter((u) => u.active);
        }).commit("filtered", "set"),

        // api + commit
        fetch: api({ url: "/users", method: "GET" }).commit("list", "set"),

        // api + handle + commit
        sync: api({ url: "/users/sync", method: "POST" }).handle(
            async ({ api, commit }) => {
                const response = await api();
                commit("list", "set", response.users);
            },
        ),
    };
}
```

### Factory Methods

| Method     | Description           | Returns                        |
| ---------- | --------------------- | ------------------------------ |
| `api()`    | HTTP request config   | `ActionApiChain`               |
| `handle()` | Custom callback       | `ActionHandleChain`            |
| `commit()` | Direct state mutation | `ActionCommitChain` (terminal) |

### Chains

Chains are **order-dependent** - execution follows definition order:

```typescript
// Valid chains
api(); // api only
handle(); // handle only
commit(); // commit only (terminal)
api().commit(); // api → commit
api().handle(); // api → handle
handle().commit(); // handle → commit
api().handle().commit(); // api → handle → commit

// Invalid chains (type errors)
commit().api(); // ❌ commit is terminal
commit().handle(); // ❌ commit is terminal
handle().api(); // ❌ api must come first
```

| Start      | Available Methods        | Returns             |
| ---------- | ------------------------ | ------------------- |
| `api()`    | `.handle()`, `.commit()` | `ActionApiChain`    |
| `handle()` | `.commit()`              | `ActionHandleChain` |
| `commit()` | none (terminal)          | `ActionCommitChain` |

### Execution Flow

```
api() → handle() → commit()
  ↓        ↓          ↓
fetch   process    mutate
```

**Without `.handle()`** - built-in handler returns response as-is:

```typescript
// These are equivalent:
api({ url: "/users", method: "GET" }).commit("list", "set");

api({ url: "/users", method: "GET" })
    .handle(async ({ api }) => await api())
    .commit("list", "set");
```

**With `.handle()`** - custom processing:

```typescript
api({ url: "/users", method: "GET" })
    .handle(async ({ api }) => {
        const response = await api();
        return response.data.users;
    })
    .commit("list", "set");
```

### Handle Context

| Property | Description                                    |
| -------- | ---------------------------------------------- |
| `api`    | Executes HTTP request (if `.api()` is chained) |
| `view`   | Readonly access to view state                  |
| `commit` | Commit during handle execution                 |

```typescript
// Streaming with incremental commits
api({ url: "/users/stream", method: "GET" }).handle(async ({ api, commit }) => {
    const stream = await api();
    for await (const chunk of stream) {
        commit("list", "add", chunk);
    }
});
```

### Commit Modes

**OneMode** (for `one()` targets):

| Mode    | Description    |
| ------- | -------------- |
| `set`   | Replace value  |
| `reset` | Set to null    |
| `patch` | Partial update |

**ManyMode** (for `many()` targets):

| Mode     | Description          |
| -------- | -------------------- |
| `set`    | Replace entire array |
| `reset`  | Empty array          |
| `patch`  | Partial update by id |
| `remove` | Remove items by id   |
| `add`    | Add items            |

### Types

```typescript
import { DeepReadonly, MaybeRefOrGetter } from "vue";

// Enums
enum OneMode {
    SET = "set",
    RESET = "reset",
    PATCH = "patch",
}

enum ManyMode {
    SET = "set",
    RESET = "reset",
    PATCH = "patch",
    REMOVE = "remove",
    ADD = "add",
}

// API Definition
type ActionApiValue<V, T> = MaybeRefOrGetter<T> | ((view: DeepReadonly<V>) => T);

interface ActionApiDefinition<V> {
    url: ActionApiValue<V, string>;
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: ActionApiValue<V, Record<string, string>>;
    query?: ActionApiValue<V, Record<string, unknown>>;
    body?: ActionApiValue<V, unknown>;
    timeout?: ActionApiValue<V, number>;
}

// Commit Value (inferred from mode)
type ActionCommitValue<M extends Model, K extends keyof M, Mode> = Mode extends OneMode.SET
    ? ModelShape<M, K>
    : Mode extends OneMode.PATCH
      ? Partial<ModelShape<M, K>>
      : Mode extends OneMode.RESET
        ? never
        : Mode extends ManyMode.SET
          ? ModelShape<M, K>[]
          : Mode extends ManyMode.PATCH
            ? Partial<ModelShape<M, K>> | Partial<ModelShape<M, K>>[]
            : Mode extends ManyMode.REMOVE
              ? ModelShape<M, K> | ModelShape<M, K>[]
              : Mode extends ManyMode.ADD
                ? ModelShape<M, K> | ModelShape<M, K>[]
                : Mode extends ManyMode.RESET
                  ? never
                  : never;

// Commit Options
interface ActionCommitOneOptions {
    deep?: boolean;
}

interface ActionCommitManyOptions {
    by?: string;
    prepend?: boolean;
    unique?: boolean;
    deep?: boolean;
}

// Commit Function (2 overloads)
type ActionCommitFn<M extends Model> = {
    <K extends ModelOneKey<M>, Mode extends OneMode>(
        model: K,
        mode: Mode,
        ...args: Mode extends OneMode.RESET
            ? []
            : [value: ActionCommitValue<M, K, Mode>, options?: ActionCommitOneOptions]
    ): void;
    <K extends ModelManyKey<M>, Mode extends ManyMode>(
        model: K,
        mode: Mode,
        ...args: Mode extends ManyMode.RESET
            ? []
            : [value: ActionCommitValue<M, K, Mode>, options?: ActionCommitManyOptions]
    ): void;
};

// Handle Context
interface ActionHandleContext<M extends Model, V, ApiResponse = unknown> {
    api: () => Promise<ApiResponse>;
    view: DeepReadonly<V>;
    commit: ActionCommitFn<M>;
}

interface ActionHandleContextNoApi<M extends Model, V> {
    view: DeepReadonly<V>;
    commit: ActionCommitFn<M>;
}

// Handle Callback
type ActionHandleCallback<M extends Model, V, R = void, ApiResponse = unknown> = (
    context: ActionHandleContext<M, V, ApiResponse>,
) => Promise<R>;

type ActionHandleCallbackNoApi<M extends Model, V, R = void> = (context: ActionHandleContextNoApi<M, V>) => Promise<R>;

// Action Definition
interface ActionDefinition<M extends Model, V, R = void> {
    api?: ActionApiDefinition<V>;
    handle?: ActionHandleCallback<M, V, R, unknown> | ActionHandleCallbackNoApi<M, V, R>;
    commit?: {
        model: keyof M;
        mode: OneMode | ManyMode;
        value?: unknown;
        options?: ActionCommitOneOptions | ActionCommitManyOptions;
    };
}

// Chain Types
interface ActionApiChain<M extends Model, V, ApiResponse> {
    handle<R>(callback: ActionHandleCallback<M, V, R, ApiResponse>): ActionHandleChain<M, V, R>;
    commit: ActionCommitMethod<M, V, ApiResponse>;
}

interface ActionHandleChain<M extends Model, V, R> {
    commit: ActionCommitMethod<M, V, R>;
}

interface ActionCommitChain<M extends Model, V, R> {
    readonly __definition: ActionDefinition<M, V, R>;
}

// Commit Method (2 overloads)
interface ActionCommitMethod<M extends Model, V, R> {
    <K extends ModelOneKey<M>, Mode extends OneMode>(
        model: K,
        mode: Mode,
        ...args: Mode extends OneMode.RESET
            ? []
            : [value?: ActionCommitValue<M, K, Mode>, options?: ActionCommitOneOptions]
    ): ActionCommitChain<M, V, R>;
    <K extends ModelManyKey<M>, Mode extends ManyMode>(
        model: K,
        mode: Mode,
        ...args: Mode extends ManyMode.RESET
            ? []
            : [value?: ActionCommitValue<M, K, Mode>, options?: ActionCommitManyOptions]
    ): ActionCommitChain<M, V, R>;
}

type ActionDefinitions<M extends Model, V> = Record<string, ActionDefinition<M, V, unknown>>;
```

### Factory

```typescript
interface ActionFactory<M extends Model, V> {
    api<A>(definition: ActionApiDefinition<V>): ActionApiChain<M, V, A>;
    handle<R>(callback: ActionHandleCallbackNoApi<M, V, R>): ActionHandleChain<M, V, R>;
    commit: ActionCommitMethod<M, V, void>;
}
```

---

# Usage

What you get at runtime after creating a store.

```typescript
const store = createStore({ ... });

store.model   // StoreModel<M> - direct commit access
store.view    // StoreView<M, VD> - readonly computed values
store.action  // StoreAction<M, V, AD> - callable functions
```

---

## Model

Direct commit access for mutations outside of actions.

### Example

```typescript
// Direct mutations via store.model.commit
userStore.model.commit("selected", "set", user);
userStore.model.commit("selected", "reset");
userStore.model.commit("list", "add", newUser);
userStore.model.commit("list", "remove", oldUser);
```

---

## View

Readonly computed values from model state.

### Example

```typescript
userStore.view.list; // UserShape[]
userStore.view.selected; // UserShape | null
userStore.view.active; // UserShape[] (filtered)
userStore.view.summary; // { total: number, hasSelection: boolean }
```

---

## Action

Callable functions with status tracking.

### Example

```typescript
// Call
await userStore.action.fetch();
await userStore.action.fetch({ query: { page: 2 } });

// Reactive (readonly)
userStore.action.fetch.loading; // ComputedRef<boolean>
userStore.action.fetch.status; // Readonly<Ref<ActionStatus>>
userStore.action.fetch.error; // Readonly<Ref<ActionError | null>>

// Non-reactive (readonly)
userStore.action.fetch.data; // DeepReadonly<T> | null

// Control
userStore.action.fetch.reset();
```

### Error Handling

```typescript
const err = userStore.action.fetch.error.value;

if (err instanceof ActionApiError) {
    console.log(err.status, err.data);
} else if (err instanceof ActionHandleError) {
    console.log(err.cause);
} else if (err instanceof ActionCommitError) {
    console.log(err.cause);
} else if (err instanceof ActionConcurrentError) {
    console.log("Action was already pending");
}
```

### Concurrent Calls

By default, calling a pending action throws `ActionConcurrentError`:

| Mode     | Behavior                                |
| -------- | --------------------------------------- |
| `block`  | Throw `ActionConcurrentError` (default) |
| `skip`   | Return existing promise                 |
| `cancel` | Abort previous, execute new             |
| `allow`  | Execute both                            |

```typescript
import { ActionConcurrent } from "@diphyx/harlemify";

// Block (default)
await userStore.action.fetch();
await userStore.action.fetch(); // throws ActionConcurrentError

// Skip
const p1 = userStore.action.fetch();
const p2 = userStore.action.fetch({ concurrent: ActionConcurrent.SKIP });
p1 === p2; // true

// Cancel (good for search)
await userStore.action.search({
    query: { term: "john" },
    concurrent: ActionConcurrent.CANCEL,
});

// Allow
await userStore.action.fetch({
    concurrent: ActionConcurrent.ALLOW,
});
```

### Isolated Status

Use `bind` to isolate status per call:

```typescript
import { isolatedActionStatus, isolatedActionError } from "@diphyx/harlemify";

const status = isolatedActionStatus();
const error = isolatedActionError();

await userStore.action.fetch({
    bind: { status, error },
});

status.value; // ActionStatus
error.value; // ActionError | null
```

Multiple concurrent calls:

```typescript
const uploads = files.map((file) => {
    const status = isolatedActionStatus();
    const error = isolatedActionError();
    userStore.action.upload({ body: file, bind: { status, error } });
    return { file, status, error };
});
```

| `concurrent`      | `bind` | Pending | Result                         |
| ----------------- | ------ | ------- | ------------------------------ |
| `block` (default) | any    | Yes     | Throws `ActionConcurrentError` |
| `skip`            | any    | Yes     | Returns existing promise       |
| `cancel`          | any    | Yes     | Aborts previous, executes new  |
| `allow`           | any    | Yes     | Executes both                  |

> **Note:** `bind` and `concurrent` are independent options.

### Commit Mode Override

Override default commit mode at call time (useful for pagination):

```typescript
// Definition
fetch: api({ url: "/users", method: "GET" }).commit("list", "set");

// First call - uses default "set"
await userStore.action.fetch({ query: { page: 1 } });

// Subsequent calls - override to "add"
await userStore.action.fetch({ query: { page: 2 }, commit: { mode: "add" } });
```

### Call Payload

```typescript
await userStore.action.fetch({
    // API overrides
    headers: { "X-Custom": "value" },
    query: { page: 2 },
    body: { name: "John" },

    // Options
    timeout: 5000,
    signal: abortController.signal,
    transformer: (response) => response.data,

    // Concurrency
    concurrent: ActionConcurrent.ALLOW,
    bind: { status, error },

    // Commit override
    commit: { mode: "add" },
});
```

| Property      | Merge Behavior         | Description                      |
| ------------- | ---------------------- | -------------------------------- |
| `headers`     | Deep merge (call wins) | HTTP headers                     |
| `query`       | Deep merge (call wins) | Query parameters                 |
| `body`        | Replace                | Request body                     |
| `timeout`     | Replace                | Request timeout in ms            |
| `signal`      | -                      | AbortSignal for cancellation     |
| `transformer` | -                      | Transform response before commit |
| `concurrent`  | -                      | Concurrent mode (default: block) |
| `bind`        | -                      | Bind to external refs            |
| `commit`      | -                      | Override commit mode             |

### Types

```typescript
import { ComputedRef, DeepReadonly, Ref } from "vue";

// Status
type ActionStatus = "idle" | "pending" | "success" | "error";

// Concurrent
enum ActionConcurrent {
    BLOCK = "block",
    SKIP = "skip",
    CANCEL = "cancel",
    ALLOW = "allow",
}

// Errors
class ActionApiError extends Error {
    name = "ActionApiError" as const;
    status?: number;
    statusText?: string;
    data?: unknown;
}

class ActionHandleError extends Error {
    name = "ActionHandleError" as const;
    override cause: Error;
}

class ActionCommitError extends Error {
    name = "ActionCommitError" as const;
    override cause: Error;
}

class ActionConcurrentError extends Error {
    name = "ActionConcurrentError" as const;
}

type ActionError = ActionApiError | ActionHandleError | ActionCommitError | ActionConcurrentError;

// Isolated Status
function isolatedActionStatus(): Ref<ActionStatus>;
function isolatedActionError(): Ref<ActionError | null>;

// Call Bind
interface ActionCallBind {
    status?: Ref<ActionStatus>;
    error?: Ref<ActionError | null>;
}

// Call Commit
interface ActionCallCommit {
    mode?: OneMode | ManyMode;
}

// Call Payload
interface ActionCallPayload<V, T = unknown, R = T> {
    headers?: Record<string, string> | ((view: DeepReadonly<V>) => Record<string, string>);
    query?: Record<string, unknown> | ((view: DeepReadonly<V>) => Record<string, unknown>);
    body?: unknown | ((view: DeepReadonly<V>) => unknown);
    timeout?: number;
    signal?: AbortSignal;
    transformer?: (response: T) => R;
    concurrent?: ActionConcurrent;
    bind?: ActionCallBind;
    commit?: ActionCallCommit;
}

// Action Interface
interface Action<V, T = void> {
    (payload?: ActionCallPayload<V, T>): Promise<T>;
    <R>(payload: ActionCallPayload<V, T, R>): Promise<R>;
    readonly loading: ComputedRef<boolean>;
    readonly status: Readonly<Ref<ActionStatus>>;
    readonly error: Readonly<Ref<ActionError | null>>;
    readonly data: DeepReadonly<T> | null;
    reset: () => void;
}

// Actions Map
type StoreAction<M extends Model, V, AD extends ActionDefinitions<M, V>> = {
    [K in keyof AD]: Action<V /* inferred R */>;
};
```

---

## Vue Component Example

```vue
<template>
    <div v-if="userStore.action.fetch.loading.value">Loading...</div>
    <div v-else-if="userStore.action.fetch.error.value">
        {{ userStore.action.fetch.error.value.message }}
        <button @click="userStore.action.fetch()">Retry</button>
    </div>
    <ul v-else>
        <li v-for="user in userStore.view.list" :key="user.id">
            {{ user.name }}
        </li>
    </ul>
</template>

<script setup>
import { userStore } from "~/stores/user";

const controller = new AbortController();

onMounted(() => userStore.action.fetch({ signal: controller.signal }));
onUnmounted(() => controller.abort());
</script>
```

---

# Internals

Implementation details for store creation and runtime behavior.

---

## Shape Resolution

```typescript
interface ShapeMeta {
    identifier?: string;
    defaults: Record<string, unknown>;
    fields: string[];
}

function resolveShape(shape: z.ZodObject<any>): ShapeMeta {
    const meta: ShapeMeta = {
        identifier: undefined,
        defaults: {},
        fields: [],
    };

    for (const [key, field] of Object.entries(shape.shape)) {
        meta.fields.push(key);

        if (field._def?.meta?.identifier) {
            meta.identifier = key;
        }

        if (field._def?.defaultValue !== undefined) {
            meta.defaults[key] = field._def.defaultValue();
        }
    }

    return meta;
}
```

**Identifier Resolution Priority:**

1. Options override: `many(shape, { identifier: "uuid" })`
2. Shape meta: `z.string().meta({ identifier: true })`
3. Fallback: First field named `id` or `_id`

---

## State Initialization

```typescript
type StateOf<M extends Model> = {
    [K in keyof M]: ModelInstance<M, K>;
};

function initializeState<M extends Model>(model: M): StateOf<M> {
    const state = {} as StateOf<M>;

    for (const [key, definition] of Object.entries(model)) {
        if (definition.kind === ModelKind.OBJECT) {
            state[key] = definition.options?.default ?? null;
        } else {
            state[key] = definition.options?.default ?? [];
        }
    }

    return state;
}
```

---

## View Computation

```typescript
function createView<M extends Model, VD extends ViewDefinitions<M>>(
    state: StateOf<M>,
    definitions: VD,
): StoreView<M, VD> {
    const view = {} as StoreView<M, VD>;

    for (const [key, definition] of Object.entries(definitions)) {
        view[key] = computed(() => {
            const values = definition.sources.map((source) => state[source]);
            return definition.resolver ? definition.resolver(...values) : values[0];
        });
    }

    return view;
}
```

---

## Mutations

```typescript
interface MutationsOne<S extends Shape> {
    set: (value: S) => void;
    reset: () => void;
    patch: (value: Partial<S>) => void;
}

interface MutationsMany<S extends Shape> {
    set: (value: S[]) => void;
    reset: () => void;
    patch: (value: Partial<S> | Partial<S>[]) => void;
    remove: (value: S | S[]) => void;
    add: (value: S | S[], options?: ActionCommitManyOptions) => void;
}

type Mutations<M extends Model> = {
    [K in keyof M]: M[K] extends ModelOneDefinition<infer S>
        ? MutationsOne<S>
        : M[K] extends ModelManyDefinition<infer S>
          ? MutationsMany<S>
          : never;
};
```

---

## Action Execution

```typescript
function createAction<M extends Model, V, R>(
    definition: ActionDefinition<M, V, R>,
    view: V,
    mutations: Mutations<M>,
): Action<V, R> {
    const globalError = ref<ActionError | null>(null);
    const globalStatus = ref<ActionStatus>("idle");
    const loading = computed(() => globalStatus.value === "pending");

    let data: R | null = null;
    let currentPromise: Promise<R> | null = null;
    let abortController: AbortController | null = null;

    const execute = async (payload?: ActionCallPayload<V, R>): Promise<R> => {
        const concurrent = payload?.concurrent ?? ActionConcurrent.BLOCK;

        // Handle concurrent modes
        if (globalStatus.value === "pending") {
            switch (concurrent) {
                case ActionConcurrent.BLOCK:
                    throw new ActionConcurrentError();
                case ActionConcurrent.SKIP:
                    return currentPromise!;
                case ActionConcurrent.CANCEL:
                    abortController?.abort();
                    break;
                case ActionConcurrent.ALLOW:
                    break;
            }
        }

        const statusRef = payload?.bind?.status ?? globalStatus;
        const errorRef = payload?.bind?.error ?? globalError;

        abortController = new AbortController();
        const signal = payload?.signal ?? abortController.signal;

        statusRef.value = "pending";
        errorRef.value = null;

        currentPromise = (async () => {
            try {
                let result: R;

                if (definition.api) {
                    const response = await executeApi(definition.api, view, { ...payload, signal });

                    if (definition.handle) {
                        result = await definition.handle({
                            api: () => Promise.resolve(response),
                            view: readonly(view) as DeepReadonly<V>,
                            commit: createCommitFn(mutations),
                        });
                    } else {
                        result = response as R;
                    }
                } else if (definition.handle) {
                    result = await definition.handle({
                        view: readonly(view) as DeepReadonly<V>,
                        commit: createCommitFn(mutations),
                    });
                } else {
                    result = undefined as R;
                }

                if (payload?.transformer) {
                    result = payload.transformer(result);
                }

                if (definition.commit) {
                    const mode = payload?.commit?.mode ?? definition.commit.mode;
                    executeCommit({ ...definition.commit, mode }, mutations, result);
                }

                data = result;
                statusRef.value = "success";
                return result;
            } catch (err) {
                errorRef.value = err as ActionError;
                statusRef.value = "error";
                throw err;
            } finally {
                currentPromise = null;
                abortController = null;
            }
        })();

        return currentPromise;
    };

    return Object.assign(execute, {
        loading,
        error: globalError,
        status: globalStatus,
        get data() {
            return data;
        },
        reset: () => {
            globalError.value = null;
            globalStatus.value = "idle";
            data = null;
        },
    }) as Action<V, R>;
}
```

---

## Store Creation Flow

```
createStore(config)
    │
    ├── 1. Create Model Factory { one, many }
    │
    ├── 2. Execute config.model()
    │   ├── Resolve shapes and identifiers
    │   └── Initialize state
    │
    ├── 3. Create Mutations
    │
    ├── 4. Create View Factory { from, merge }
    │
    ├── 5. Execute config.view()
    │   └── Create computed views
    │
    ├── 6. Create Action Factory { api, handle, commit }
    │
    ├── 7. Execute config.action()
    │   └── Create action executors
    │
    └── 8. Return { model, view, action }
```

---

# Quick Reference

## Complete Architecture

```
                                    ┌─────────────┐
                                    │   shape()   │
                                    │    (Zod)    │
                                    └──────┬──────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            createStore({ ... })                              │
├──────────────────────┬───────────────────────┬───────────────────────────────┤
│                      │                       │                               │
│       MODEL          │        VIEW           │          ACTION               │
│                      │                       │                               │
│   one()  → T|null    │   from()  → 1 source  │   api()    → HTTP request     │
│   many() → T[]       │   merge() → N sources │   handle() → custom logic     │
│                      │                       │   commit() → mutate state     │
│                      │                       │                               │
└──────────────────────┴───────────────────────┴───────────────────────────────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                                   store                                      │
├──────────────────────┬───────────────────────┬───────────────────────────────┤
│                      │                       │                               │
│    store.model       │     store.view        │      store.action             │
│                      │                       │                               │
│    commit()          │     readonly          │      callable + status        │
│                      │     computed          │      loading/error/data       │
│                      │                       │                               │
└──────────────────────┴───────────────────────┴───────────────────────────────┘
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DEFINITION                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐                                                           │
│   │   Shape     │  Schema definition (Zod)                                  │
│   │   shape()   │  → identifier, defaults, fields                           │
│   └──────┬──────┘                                                           │
│          │                                                                  │
│          ▼                                                                  │
│   ┌─────────────┐                                                           │
│   │   Model     │  State slots                                              │
│   │ one() many()│  → single object | array of objects                       │
│   └──────┬──────┘                                                           │
│          │                                                                  │
│          ├──────────────────────┐                                           │
│          ▼                      ▼                                           │
│   ┌─────────────┐        ┌─────────────┐                                    │
│   │    View     │        │   Action    │                                    │
│   │from() merge()│        │api() handle()│                                   │
│   │             │        │  commit()   │                                    │
│   └─────────────┘        └─────────────┘                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                               RUNTIME                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   store.model                store.view              store.action           │
│   ┌─────────────┐           ┌─────────────┐         ┌─────────────┐         │
│   │ StoreModel  │           │  StoreView  │         │ StoreAction │         │
│   ├─────────────┤           ├─────────────┤         ├─────────────┤         │
│   │ commit()    │           │ [key]       │         │ [key]()     │         │
│   │             │           │  → readonly │         │  → callable │         │
│   │             │           │  → computed │         │  → status   │         │
│   └─────────────┘           └─────────────┘         └─────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Action Chains

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           ACTION FACTORY                                   │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   api()  ─────┬─────▶  handle()  ─────┬─────▶  commit()  ═══▶  TERMINAL   │
│               │                       │                                    │
│               └───────────────────────┴─────▶  commit()  ═══▶  TERMINAL   │
│                                                                            │
│   handle()  ──────────────────────────┬─────▶  commit()  ═══▶  TERMINAL   │
│                                       │                                    │
│                                       └─────▶  (end)                       │
│                                                                            │
│   commit()  ════════════════════════════════════════════════▶  TERMINAL   │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│   Legend:  ────▶ optional    ════▶ terminal (no further chaining)         │
└────────────────────────────────────────────────────────────────────────────┘
```

## Execution Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│     api()    │────▶│   handle()   │────▶│   commit()   │
│              │     │              │     │              │
│  HTTP fetch  │     │   process    │     │   mutate     │
│  $fetch()    │     │   transform  │     │   state      │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
   response            result/void           mutations
```

## Commit Modes

```
┌────────────────────────────────────────────────────────────────────────────┐
│                            COMMIT MODES                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   one() slots                          many() slots                        │
│   ┌──────────────────┐                 ┌──────────────────┐                │
│   │ set    → replace │                 │ set    → replace │                │
│   │ reset  → null    │                 │ reset  → []      │                │
│   │ patch  → partial │                 │ patch  → partial │                │
│   └──────────────────┘                 │ remove → by id   │                │
│                                        │ add    → append  │                │
│                                        └──────────────────┘                │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Concurrent Modes

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          CONCURRENT MODES                                  │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   BLOCK (default)     SKIP              CANCEL            ALLOW            │
│   ┌─────────────┐     ┌─────────────┐   ┌─────────────┐   ┌─────────────┐  │
│   │ call 1 ──▶  │     │ call 1 ──▶  │   │ call 1 ──▶  │   │ call 1 ──▶  │  │
│   │ call 2 ✕    │     │ call 2 ──┐  │   │ call 1 ✕    │   │ call 2 ──▶  │  │
│   │   throw     │     │          │  │   │ call 2 ──▶  │   │             │  │
│   │   error     │     │  returns │  │   │             │   │  both run   │  │
│   │             │     │  call 1  │  │   │             │   │             │  │
│   └─────────────┘     └─────────────┘   └─────────────┘   └─────────────┘  │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

## Action Status

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           ACTION STATUS                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│                    ┌─────────┐                                             │
│            ┌──────▶│ success │                                             │
│            │       └─────────┘                                             │
│   ┌──────┐ │                                                               │
│   │ idle │─┼──▶┌─────────┐                                                 │
│   └──────┘ │   │ pending │──────┤                                          │
│       ▲    │   └─────────┘      │                                          │
│       │    │                    ▼                                          │
│       │    │              ┌─────────┐                                      │
│       │    └─────────────▶│  error  │                                      │
│       │                   └─────────┘                                      │
│       │                         │                                          │
│       └─────────────────────────┘                                          │
│                    reset()                                                 │
│                                                                            │
├────────────────────────────────────────────────────────────────────────────┤
│   Properties:                                                              │
│   • loading  → ComputedRef<boolean>        (status === 'pending')          │
│   • status   → Readonly<Ref<ActionStatus>>                                 │
│   • error    → Readonly<Ref<ActionError | null>>                           │
│   • data     → DeepReadonly<T> | null                                      │
└────────────────────────────────────────────────────────────────────────────┘
```

## Type Summary

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           TYPE SUMMARY                                     │
├─────────────────┬──────────────────────────────────────────────────────────┤
│ Layer           │ Types                                                    │
├─────────────────┼──────────────────────────────────────────────────────────┤
│ Shape           │ ShapeDefinition, ShapeInfer                              │
├─────────────────┼──────────────────────────────────────────────────────────┤
│ Model           │ Model, ModelKind, ModelOneDefinition, ModelManyDefinition│
│                 │ ModelInstance, ModelShape, ModelOneKey, ModelManyKey     │
├─────────────────┼──────────────────────────────────────────────────────────┤
│ View            │ ViewDefinitions, ViewFromDefinition, ViewMergeDefinition │
│                 │ ViewFromResolver, ViewMergeResolver, ViewResult          │
├─────────────────┼──────────────────────────────────────────────────────────┤
│ Action          │ ActionDefinitions, ActionApiDefinition, ActionDefinition │
│                 │ ActionCommitFn, ActionHandleContext, ActionCallPayload   │
├─────────────────┼──────────────────────────────────────────────────────────┤
│ Store           │ StoreConfig, Store, StoreModel, StoreView, StoreAction   │
├─────────────────┼──────────────────────────────────────────────────────────┤
│ Runtime         │ Action, ActionStatus, ActionConcurrent, ActionError      │
│                 │ ActionApiError, ActionHandleError, ActionCommitError     │
│                 │ ActionConcurrentError, ActionCallBind, ActionCallCommit  │
├─────────────────┼──────────────────────────────────────────────────────────┤
│ Enums           │ ModelKind, OneMode, ManyMode, ActionConcurrent           │
└─────────────────┴──────────────────────────────────────────────────────────┘
```
