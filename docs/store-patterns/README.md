# Store Patterns

Three common patterns for structuring your stores.

| Pattern                      | Model                     | Use Case                           |
| ---------------------------- | ------------------------- | ---------------------------------- |
| [Collection](collection.md)  | `many()`                  | Lists with CRUD (users, posts)     |
| [Singleton](singleton.md)    | `one()`                   | Single entity (config, settings)   |
| [Nested](nested.md)          | `one()` + handler actions | Complex objects with sub-resources |

## [Collection](collection.md)

Manage lists of items with full CRUD. API actions map directly to mutation modes: `SET` to replace, `ADD` to append, `PATCH` to update by identifier, `REMOVE` to delete.

```typescript
action({ api }) {
    return {
        list: api.get({ url: "/posts" }, { model: "list", mode: ModelManyMode.SET }),
        create: api.post({ url: "/posts" }, { model: "list", mode: ModelManyMode.ADD }),
    };
},
```

## [Singleton](singleton.md)

A single entity with `SET` to load and `PATCH` to partially update. No identifiers needed.

```typescript
action({ api }) {
    return {
        get: api.get({ url: "/config" }, { model: "config", mode: ModelOneMode.SET }),
        update: api.patch({ url: "/config" }, { model: "config", mode: ModelOneMode.PATCH }),
    };
},
```

## [Nested](nested.md)

Complex objects where sub-resources load from separate endpoints. Use `handler` actions to fetch nested data and patch it into the parent model.

```typescript
action({ handler }) {
    return {
        milestones: handler(async ({ model, view }) => {
            const result = await $fetch(`/projects/${view.project.value?.id}/milestones`);
            model.current.patch({ milestones: result });
        }),
    };
},
```
