# View

Views are reactive computed properties derived from model state. They are Vue `ComputedRef` values that automatically update when the underlying model changes.

## from (Single Source)

`from(model)` creates a direct view mirroring a model:

```typescript
view({ from }) {
    return {
        user: from("current"),     // ComputedRef<User | null>
        users: from("list"),       // ComputedRef<User[]>
    };
},
```

### from with Resolver

Transform the data with a resolver function:

```typescript
view({ from }) {
    return {
        userName: from("current", (model) => model?.name ?? "unknown"),
        count: from("list", (model) => model.length),
        emails: from("list", (model) => model.map((u) => u.email)),
    };
},
```

## merge (Multiple Sources)

`merge(models, resolver)` combines multiple models into a single computed value:

```typescript
view({ merge }) {
    return {
        summary: merge(["current", "list"], (current, list) => {
            return {
                selected: current?.name ?? null,
                total: list.length,
            };
        }),
    };
},
```

Supports up to 5 models:

```typescript
merge(["current", "draft", "list"], (current, draft, list) => {
    return {
        hasSelection: current !== null,
        hasDraft: draft !== null,
        totalPosts: list.length,
    };
});
```

> TypeScript overloads provide full type inference for up to 5 models. This is a type-level limit only — the runtime supports any number of models, but passing more than 5 will not compile.

## View Options

Both `from()` and `merge()` accept an optional options object as the last argument.

### clone

View resolver callbacks receive state as a Vue `readonly()` proxy. Mutating methods like `Array.prototype.sort()` are silently blocked in production. The `clone` option provides a mutable copy of the state values to the resolver using the `ViewClone` enum.

| Value               | Behavior                               |
| ------------------- | -------------------------------------- |
| (omitted)           | Readonly, no cloning (default)         |
| `ViewClone.SHALLOW` | Shallow copy (`[...arr]` / `{...obj}`) |
| `ViewClone.DEEP`    | Full deep clone via JSON serialization |

```typescript
import { ViewClone } from "harlemify";

view({ from, merge }) {
    return {
        // Shallow clone — safe for .sort(), .reverse(), .filter()
        sorted: from("list", (items) => {
            return items.sort((a, b) => a.name.localeCompare(b.name));
        }, { clone: ViewClone.SHALLOW }),

        // Deep clone — safe to mutate nested properties
        modified: from("current", (model) => {
            if (model) {
                model.milestones.sort((a, b) => a.name.localeCompare(b.name));
            }
            return model;
        }, { clone: ViewClone.DEEP }),

        // Clone also works with merge
        combined: merge(["current", "list"], (current, list) => {
            return {
                current: current?.name ?? "none",
                sorted: list.sort((a, b) => a.id - b.id),
            };
        }, { clone: ViewClone.SHALLOW }),
    };
},
```

> Vue's `computed()` caches the result, so the copy+sort cost only occurs when state changes.

## Accessing Views

```typescript
const { view } = userStore;

view.user.value; // User | null
view.users.value; // User[]
view.count.value; // number
view.summary.value; // { selected: string | null; total: number }
```

## Dynamic URLs from Views

Action API definitions can reference views to build dynamic URLs:

```typescript
api.get({ url: (view) => `/users/${view.user.value?.id}` }, { model: "current", mode: ModelOneMode.SET });
```

## Next Steps

- [Action](action.md) - Define async operations
- [Store Patterns](../store-patterns/README.md) - See complete store examples
