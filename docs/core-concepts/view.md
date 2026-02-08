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

Supports any number of models:

```typescript
merge(["current", "draft", "list"], (current, draft, list) => {
    return {
        hasSelection: current !== null,
        hasDraft: draft !== null,
        totalPosts: list.length,
    };
})
```

## Accessing Views

```typescript
const { view } = userStore;

view.user.value;     // User | null
view.users.value;    // User[]
view.count.value;    // number
view.summary.value;  // { selected: string | null; total: number }
```

## Dynamic URLs from Views

Action API definitions can reference views to build dynamic URLs:

```typescript
api.get(
    { url: (view) => `/users/${view.user.value?.id}` },
    { model: "current", mode: ModelOneMode.SET },
)
```

## Next Steps

- [Action](action.md) - Define async operations
- [Store Patterns](../store-patterns/README.md) - See complete store examples
