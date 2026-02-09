# Types

TypeScript interfaces, types, enums, and error classes.

## Store Types

### Store

```typescript
interface Store<MD, VD, AD> {
    model: StoreModel<MD>;
    view: StoreView<MD, VD>;
    action: StoreAction<MD, VD, AD>;
}
```

### StoreConfig

```typescript
interface StoreConfig<MD, VD, AD> {
    name: string;
    model: (factory: ModelFactory) => MD;
    view: (factory: ViewFactory<MD>) => VD;
    action: (factory: ActionFactory<MD, VD>) => AD;
}
```

---

## Shape Types

### ShapeRawDefinition

```typescript
type ShapeRawDefinition = z.ZodRawShape;
```

### ShapeDefinition

```typescript
type ShapeDefinition = z.ZodObject<ShapeRawDefinition>;
```

### ShapeCall

```typescript
type ShapeCall<T extends ShapeRawDefinition> = z.ZodObject<T> & {
    defaults: (overrides?: Partial<z.infer<z.ZodObject<T>>>) => z.infer<z.ZodObject<T>>;
};
```

### ShapeInfer

```typescript
type ShapeInfer<T extends z.ZodType<any>> = z.infer<T>;
```

---

## Model Types

### ModelFactory

```typescript
interface ModelFactory {
    one<S extends Shape>(shape: ShapeType<S>, options?: ModelOneDefinitionOptions<S>): ModelOneDefinition<S>;
    many<S extends Shape>(shape: ShapeType<S>, options?: ModelManyDefinitionOptions<S>): ModelManyDefinition<S>;
}
```

### ModelOneDefinitionOptions

```typescript
interface ModelOneDefinitionOptions<S> {
    identifier?: keyof S;
    default?: S;
}
```

### ModelManyDefinitionOptions

```typescript
interface ModelManyDefinitionOptions<S> {
    identifier?: keyof S;
    default?: S[];
}
```

### ModelOneCommitOptions

```typescript
interface ModelOneCommitOptions {
    deep?: boolean;
}
```

### ModelManyCommitOptions

```typescript
interface ModelManyCommitOptions {
    by?: string;
    prepend?: boolean;
    unique?: boolean;
    deep?: boolean;
}
```

### StoreModel

```typescript
type StoreModel<MD> = {
    [K in keyof MD]: MD[K] extends ModelOneDefinition<infer S> ? ModelOneCall<S> : ModelManyCall<S>;
};
```

### ModelOneCall

```typescript
interface ModelOneCall<S> {
    set(value: S): void;
    reset(): void;
    patch(value: Partial<S>, options?: ModelOneCommitOptions): void;
}
```

### ModelManyCall

```typescript
interface ModelManyCall<S> {
    set(value: S[]): void;
    reset(): void;
    patch(value: Partial<S> | Partial<S>[], options?: ModelManyCommitOptions): void;
    remove(value: S | S[], options?: ModelManyCommitOptions): void;
    add(value: S | S[], options?: ModelManyCommitOptions): void;
}
```

---

## View Types

### ViewClone

```typescript
enum ViewClone {
    SHALLOW = "shallow",
    DEEP = "deep",
}
```

### ViewDefinitionOptions

```typescript
interface ViewDefinitionOptions {
    clone?: ViewClone;
}
```

### ViewFactory

```typescript
interface ViewFactory<MD> {
    from<K extends keyof MD>(model: K): ViewFromDefinition<MD, K, ModelDefinitionInfer<MD, K>>;
    from<K extends keyof MD, R>(
        model: K,
        resolver: (value: ModelDefinitionInfer<MD, K>) => R,
        options?: ViewDefinitionOptions,
    ): ViewFromDefinition<MD, K, R>;
    merge(models: readonly [MK1, MK2], resolver, options?): ViewMergeDefinition;
    merge(models: readonly [MK1, MK2, MK3], resolver, options?): ViewMergeDefinition;
    merge(models: readonly [MK1, MK2, MK3, MK4], resolver, options?): ViewMergeDefinition;
    merge(models: readonly [MK1, MK2, MK3, MK4, MK5], resolver, options?): ViewMergeDefinition;
}
```

---

## Action Types

### ActionFactory

```typescript
interface ActionFactory<MD, VD> {
    api: ActionApiFactory<MD, VD>;
    handler<R>(callback: ActionHandlerCallback<MD, VD, R>): ActionHandlerDefinition<MD, VD, R>;
}
```

### ActionApiFactory

```typescript
interface ActionApiFactory<MD, VD> {
    (request: ActionApiRequest<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
    get(request: ActionApiRequestShortcut<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
    head(request: ActionApiRequestShortcut<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
    post(request: ActionApiRequestShortcut<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
    put(request: ActionApiRequestShortcut<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
    patch(request: ActionApiRequestShortcut<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
    delete(request: ActionApiRequestShortcut<MD, VD>, commit?: ActionApiCommit<MD>): ActionApiDefinition<MD, VD>;
}
```

### ActionApiRequest

```typescript
interface ActionApiRequest<MD, VD> {
    endpoint?: string;
    url: ActionApiRequestValue<MD, VD, string>;
    method: ActionApiRequestValue<MD, VD, ActionApiMethod>;
    headers?: ActionApiRequestValue<MD, VD, Record<string, string>>;
    query?: ActionApiRequestValue<MD, VD, Record<string, unknown>>;
    body?: ActionApiRequestValue<MD, VD, unknown>;
    timeout?: ActionApiRequestValue<MD, VD, number>;
    concurrent?: ActionConcurrent;
}
```

### ActionApiCommit

```typescript
interface ActionApiCommit<MD> {
    model: keyof MD;
    mode: ModelOneMode | ModelManyMode;
    value?: (data: unknown) => unknown;
    options?: ModelOneCommitOptions | ModelManyCommitOptions;
}
```

### ActionHandlerCallback

```typescript
type ActionHandlerCallback<MD, VD, R> = (context: { model: StoreModel<MD>; view: StoreView<MD, VD> }) => Promise<R>;
```

### ActionCallOptions

```typescript
interface ActionCallOptions {
    params?: Record<string, string>;
    headers?: Record<string, string>;
    query?: Record<string, unknown>;
    body?: unknown;
    timeout?: number;
    signal?: AbortSignal;
    transformer?: ActionCallTransformerOptions;
    concurrent?: ActionConcurrent;
    bind?: ActionCallBindOptions;
    commit?: ActionCallCommitOptions;
}
```

### ActionCallTransformerOptions

```typescript
interface ActionCallTransformerOptions {
    request?: (api: ActionResolvedApi) => ActionResolvedApi;
    response?: (data: unknown) => unknown;
}
```

### ActionResolvedApi

```typescript
interface ActionResolvedApi {
    url: string;
    method: ActionApiMethod;
    headers: Record<string, string>;
    query: Record<string, unknown>;
    body?: Record<string, unknown> | BodyInit | null;
    timeout?: number;
    signal: AbortSignal;
}
```

### ActionCallBindOptions

```typescript
interface ActionCallBindOptions {
    status?: Ref<ActionStatus>;
    error?: Ref<Error | null>;
}
```

### ActionCallCommitOptions

```typescript
interface ActionCallCommitOptions {
    mode?: ModelOneMode | ModelManyMode;
}
```

### ActionCall

```typescript
interface ActionCall<T = void> {
    (options?: ActionCallOptions): Promise<T>;
    readonly loading: ComputedRef<boolean>;
    readonly status: Readonly<Ref<ActionStatus>>;
    readonly error: Readonly<Ref<Error | null>>;
    readonly data: DeepReadonly<T> | null;
    reset: () => void;
}
```

---

## Enums

### ModelOneMode

```typescript
enum ModelOneMode {
    SET = "set",
    RESET = "reset",
    PATCH = "patch",
}
```

### ModelManyMode

```typescript
enum ModelManyMode {
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

Thrown when an HTTP request fails. Extracts details from the fetch error:

```typescript
interface ActionApiError extends Error {
    name: "ActionApiError";
    status: number; // Defaults to 500 if not available
    statusText: string; // Defaults to "Internal Server Error"
    data: unknown; // Response body, defaults to null
}
```

The constructor reads `status` from `source.status` or `source.response.status`, `statusText` from `source.statusText` or `source.response.statusText`, and `data` from `source.data` or `source.response._data`. Message defaults to `"API request failed"`.

### ActionHandlerError

Thrown when a handler callback throws. Any non-action error thrown inside a handler is wrapped:

```typescript
interface ActionHandlerError extends Error {
    name: "ActionHandlerError";
}
```

> **Note:** If the handler throws an `ActionApiError` or another `ActionHandlerError`, it is re-thrown as-is without wrapping. Message defaults to `"Action handler failed"`.

### ActionCommitError

Thrown when a commit operation fails:

```typescript
interface ActionCommitError extends Error {
    name: "ActionCommitError";
}
```

Message defaults to `"Action commit failed"`.

### ActionConcurrentError

Thrown when an action is blocked by `ActionConcurrent.BLOCK` while already pending:

```typescript
interface ActionConcurrentError extends Error {
    name: "ActionConcurrentError";
}
```

Message is always `"Action is already pending"`.

### Error Handling

```typescript
try {
    await store.action.fetch();
} catch (error) {
    switch (error.name) {
        case "ActionApiError":
            console.error("HTTP error:", error.status, error.data);
            break;
        case "ActionHandlerError":
            console.error("Handler error:", error.cause);
            break;
        case "ActionCommitError":
            console.error("Commit error:", error.cause);
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
function useIsolatedActionStatus(): Ref<ActionStatus>;
```

Returns a `Ref<ActionStatus>` initialized to `ActionStatus.IDLE`. Use with `bind` option to track action status independently.

### useIsolatedActionError

```typescript
function useIsolatedActionError(): Ref<Error | null>;
```

Returns a `Ref<Error | null>` initialized to `null`. Use with `bind` option to track action errors independently.

---

## Module Options

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    harlemify: {
        model: {
            identifier: string, // Default identifier field
        },
        view: {
            clone: ViewClone, // Default clone mode for all views
        },
        action: {
            endpoint: string, // Base endpoint URL
            headers: Record<string, string>, // Default headers
            query: Record<string, unknown>, // Default query params
            timeout: number, // Default timeout in ms
            concurrent: ActionConcurrent, // Default concurrency strategy
        },
        logger: number, // Consola log level (-999 to 999)
    },
});
```
