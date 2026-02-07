# Types

TypeScript interfaces, types, enums, and error classes.

## Store Types

### Store

```typescript
interface Store<M, VD, AD> {
    model: StoreModel<M>;
    view: StoreView<M, VD>;
    action: StoreAction<M, StoreView<M, VD>, AD>;
}
```

### StoreConfig

```typescript
interface StoreConfig<M, VD, AD> {
    name: string;
    model: (factory: ModelFactory) => M;
    view: (factory: ViewFactory<M>) => VD;
    action: (factory: ActionFactory<M, StoreView<M, VD>>) => AD;
}
```

---

## Model Types

### ModelFactory

```typescript
interface ModelFactory {
    one<S extends Shape>(shape: ShapeType<S>, options?: ModelOneOptions<S>): ModelOneDefinition<S>;
    many<S extends Shape>(shape: ShapeType<S>, options?: ModelManyOptions<S>): ModelManyDefinition<S>;
}
```

### ModelOneOptions

```typescript
interface ModelOneOptions<S> {
    identifier?: keyof S;
    default?: S;
}
```

### ModelManyOptions

```typescript
interface ModelManyOptions<S> {
    identifier?: keyof S;
    default?: S[];
}
```

### MutationsOneOptions

```typescript
interface MutationsOneOptions {
    deep?: boolean;
}
```

### MutationsManyOptions

```typescript
interface MutationsManyOptions {
    by?: string;
    prepend?: boolean;
    unique?: boolean;
    deep?: boolean;
}
```

---

## View Types

### ViewFactory

```typescript
interface ViewFactory<M> {
    from<K extends keyof M>(source: K): ViewFromDefinition<M, K, ModelInstance<M, K>>;
    from<K extends keyof M, R>(source: K, resolver: (value: ModelInstance<M, K>) => R): ViewFromDefinition<M, K, R>;
    merge<K extends readonly (keyof M)[], R>(sources: K, resolver: (...values) => R): ViewMergeDefinition<M, K, R>;
}
```

---

## Action Types

### ActionFactory

```typescript
interface ActionFactory<M, V> {
    api: ActionApiFactory<M, V>;
    handle<R>(callback: ActionHandleCallbackNoApi<M, V, R>): ActionHandleChain<M, V, R>;
    commit: ActionCommitMethod<M, V, void>;
}
```

### ActionApiDefinition

```typescript
interface ActionApiDefinition<V> {
    endpoint?: string;
    url: MaybeRefOrGetter<string> | ((view: DeepReadonly<V>) => string);
    method: ActionApiMethod;
    headers?: MaybeRefOrGetter<Record<string, string>> | ((view: DeepReadonly<V>) => Record<string, string>);
    query?: MaybeRefOrGetter<Record<string, unknown>> | ((view: DeepReadonly<V>) => Record<string, unknown>);
    body?: MaybeRefOrGetter<unknown> | ((view: DeepReadonly<V>) => unknown);
    timeout?: number;
    concurrent?: ActionConcurrent;
}
```

### ActionCallPayload

```typescript
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
```

### ActionCallBind

```typescript
interface ActionCallBind {
    status?: Ref<ActionStatus>;
    error?: Ref<ActionError | null>;
}
```

### ActionCallCommit

```typescript
interface ActionCallCommit {
    mode?: ActionOneMode | ActionManyMode;
}
```

### Action

```typescript
interface Action<V, T = void> {
    (payload?: ActionCallPayload<V, T>): Promise<T>;
    <R>(payload: ActionCallPayload<V, T, R>): Promise<R>;
    readonly loading: ComputedRef<boolean>;
    readonly status: Readonly<Ref<ActionStatus>>;
    readonly error: Readonly<Ref<ActionError | null>>;
    readonly data: DeepReadonly<T> | null;
    reset: () => void;
}
```

### ActionHandleContext

```typescript
interface ActionHandleContext<M, V, ApiResponse = unknown> {
    api: <T = ApiResponse>() => Promise<T>;
    view: DeepReadonly<V>;
    commit: ActionCommitter<M>;
}
```

### ActionHandleContextNoApi

```typescript
interface ActionHandleContextNoApi<M, V> {
    view: DeepReadonly<V>;
    commit: ActionCommitter<M>;
}
```

### Chain Types

```typescript
interface ActionApiChain<M, V, ApiResponse> {
    handle<R>(callback: ActionHandleCallback<M, V, R, ApiResponse>): ActionHandleChain<M, V, R>;
    commit: ActionCommitMethod<M, V, ApiResponse>;
    readonly [DEFINITION]: ActionDefinition<M, V, ApiResponse>;
}

interface ActionHandleChain<M, V, R> {
    commit: ActionCommitMethod<M, V, R>;
    readonly [DEFINITION]: ActionDefinition<M, V, R>;
}

interface ActionCommitChain<M, V, R> {
    readonly [DEFINITION]: ActionDefinition<M, V, R>;
}
```

---

## Enums

### ActionOneMode

```typescript
enum ActionOneMode {
    SET = "set",
    RESET = "reset",
    PATCH = "patch",
}
```

### ActionManyMode

```typescript
enum ActionManyMode {
    SET = "set",
    RESET = "reset",
    PATCH = "patch",
    REMOVE = "remove",
    ADD = "add",
}
```

### ActionStatus

```typescript
enum ActionStatus {
    IDLE = "idle",
    PENDING = "pending",
    SUCCESS = "success",
    ERROR = "error",
}
```

### ActionConcurrent

```typescript
enum ActionConcurrent {
    BLOCK = "block",
    SKIP = "skip",
    CANCEL = "cancel",
    ALLOW = "allow",
}
```

### ActionApiMethod

```typescript
enum ActionApiMethod {
    GET = "GET",
    HEAD = "HEAD",
    POST = "POST",
    PUT = "PUT",
    PATCH = "PATCH",
    DELETE = "DELETE",
}
```

### ModelKind

```typescript
enum ModelKind {
    OBJECT = "object",
    ARRAY = "array",
}
```

---

## Error Types

### ActionApiError

Thrown when an HTTP request fails:

```typescript
interface ActionApiError extends Error {
    name: "ActionApiError";
    status?: number;
    statusText?: string;
    data?: unknown;
}
```

### ActionHandleError

Thrown when a handle callback throws:

```typescript
interface ActionHandleError extends Error {
    name: "ActionHandleError";
    cause: Error;
}
```

### ActionCommitError

Thrown when a commit operation fails:

```typescript
interface ActionCommitError extends Error {
    name: "ActionCommitError";
    cause: Error;
}
```

### ActionConcurrentError

Thrown when an action is blocked by the concurrency guard:

```typescript
interface ActionConcurrentError extends Error {
    name: "ActionConcurrentError";
}
```

### ActionError

Union of all error types:

```typescript
type ActionError = ActionApiError | ActionHandleError | ActionCommitError | ActionConcurrentError;
```

### Error Handling

```typescript
try {
    await store.action.fetch();
} catch (error) {
    const e = error as ActionError;

    switch (e.name) {
        case "ActionApiError":
            console.error("HTTP error:", e.status, e.data);
            break;
        case "ActionHandleError":
            console.error("Handle error:", e.cause);
            break;
        case "ActionCommitError":
            console.error("Commit error:", e.cause);
            break;
        case "ActionConcurrentError":
            console.warn("Action already pending");
            break;
    }
}
```

---

## Composables

### useIsolatedActionStatus

```typescript
function useIsolatedActionStatus(): Ref<ActionStatus>
```

Returns a `Ref<ActionStatus>` initialized to `ActionStatus.IDLE`. Use with `bind` option to track action status independently.

### useIsolatedActionError

```typescript
function useIsolatedActionError(): Ref<ActionError | null>
```

Returns a `Ref<ActionError | null>` initialized to `null`. Use with `bind` option to track action errors independently.

---

## Module Options

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    harlemify: {
        model: {
            identifier: string,          // Default identifier field
        },
        action: {
            endpoint: string,            // Base endpoint URL
            headers: Record<string, string>,  // Default headers
            query: Record<string, unknown>,   // Default query params
            timeout: number,             // Default timeout in ms
            concurrent: ActionConcurrent, // Default concurrency strategy
        },
        logger: number,                  // Consola log level (-999 to 999)
    },
});
```
