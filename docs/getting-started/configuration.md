# Configuration

Harlemify is configured at two levels: **module config** (app-wide defaults, set in `nuxt.config`) and **store definition** (the object passed to `createStore`). Per-action request options and their call-time overrides are covered in [Action › Option Levels](../core-concepts/action.md#option-levels).

## Module Configuration

App-wide defaults set under the `harlemify` key in `nuxt.config`. These are folded into every store as defaults — a store/action/view can always override them.

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
    modules: ["@diphyx/harlemify"],
    harlemify: {
        action: {
            endpoint: "https://api.example.com",
            timeout: 10000,
        },
    },
});
```

| Option              | Type                      | Description                                        |
| ------------------- | ------------------------- | -------------------------------------------------- |
| `action.endpoint`   | `string`                  | Base endpoint URL prepended to all action API URLs |
| `action.headers`    | `Record<string, string>`  | Default headers for all API requests               |
| `action.query`      | `Record<string, unknown>` | Default query parameters for all API requests      |
| `action.timeout`    | `number`                  | Request timeout in milliseconds                    |
| `action.concurrent` | `ActionConcurrent`        | Default concurrency strategy for all actions       |
| `model.identifier`  | `string`                  | Default identifier field for array mutations       |
| `view.clone`        | `ViewClone`               | Default clone strategy for all views               |
| `logger`            | `number`                  | Log level (`-999` = silent, `999` = verbose)       |

> `action.*` defaults flow into each action's [request options](../core-concepts/action.md#request-options); `view.clone` into [view options](../core-concepts/view.md); `model.identifier` into [model options](../core-concepts/model.md#definition-options).

## Store Definition Options

`createStore` takes a single config object:

```typescript
export const userStore = createStore({
    name: "users",
    model({ one, many }) { ... },
    view({ from, merge }) { ... },
    action({ api }) { ... },
    compose({ model, action }) { ... }, // optional
    lazy: true, // optional
});
```

| Option    | Type                       | Required | Description                                                                           |
| --------- | -------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `name`    | `string`                   | ✅       | Unique store id — also the underlying Harlem store name and logger namespace          |
| `model`   | `(factory) => ModelDefs`   | ✅       | Builder for model definitions (`one` / `many`)                                        |
| `view`    | `(factory) => ViewDefs`    | ✅       | Builder for view definitions (`from` / `merge`)                                       |
| `action`  | `(factory) => ActionDefs`  | ✅       | Builder for action definitions (`api` / `handler`)                                    |
| `compose` | `(context) => ComposeDefs` | ❌       | Builder for compose definitions; receives `{ model, view, action }`                   |
| `lazy`    | `boolean`                  | ❌       | Defer initialization until first access — see [Lazy Store](../advanced/lazy-store.md) |

> `name` must be unique across all stores in the app.

## Option Levels

For options that exist at more than one level (headers, query, timeout, concurrent, …), the effective value resolves **call-time → store definition → module config → built-in default**. See the full per-option matrix in [Action › Option Levels](../core-concepts/action.md#option-levels).

## Next Steps

- [Your First Store](first-store.md) — build a complete store step by step
- [Core Concepts](../core-concepts/README.md) — how each layer works
