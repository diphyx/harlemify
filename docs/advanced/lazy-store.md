# Lazy Store

By default, stores are created eagerly at module evaluation time. Set `lazy: true` to defer initialization until the store is first accessed.

## Usage

```typescript
export const configStore = createStore({
    name: "config",
    lazy: true,
    model({ one }) { ... },
    view({ from }) { ... },
    action({ api }) { ... },
});
```

## How It Works

When `lazy: true` is set, `createStore` returns a lightweight proxy instead of the real store. The actual store (model, view, action, compose) is created on the first property access:

```typescript
// Store is NOT created here
export const configStore = createStore({ name: "config", lazy: true, ... });

// Store IS created here (first access)
configStore.model.config.set(data);
```

Subsequent accesses reuse the same instance — initialization only happens once.

## When to Use

Lazy stores are useful when the model factory depends on Nuxt composables that are only available after app setup. With eager stores, the factory runs at module evaluation time — before the Nuxt app is initialized. With `lazy: true`, the factory runs on first access, when Nuxt is ready:

```typescript
export const configStore = createStore({
    name: "config",
    lazy: true,
    model({ one }) {
        const route = useRoute();

        return {
            config: one(configShape, {
                default: () => ({ theme: route.query.theme ?? "dark" }),
            }),
        };
    },
    view({ from }) { ... },
    action({ api }) { ... },
});
```

Without `lazy: true`, calling `useRoute()` in the model factory would fail because the Nuxt context is not available at module evaluation time.

## Default Behavior

| Option        | Behavior                             |
| ------------- | ------------------------------------ |
| _(not set)_   | Eager — store created immediately    |
| `lazy: false` | Eager — store created immediately    |
| `lazy: true`  | Lazy — store created on first access |

## Next Steps

- [Logging](logging.md) — Debug store operations
- [Model](../core-concepts/model.md) — Function defaults and model options
