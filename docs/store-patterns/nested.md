# Nested Store

Use nested patterns for complex objects with sub-resources that load separately.

## When to Use

- Objects with expensive sub-resources
- Lazy-loading nested data
- Deep object structures (2+ levels)
- Sub-resources with different endpoints

## Shape

```typescript
import { shape, type ShapeInfer } from "@diphyx/harlemify";

const projectShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        description: factory.string(),
        active: factory.boolean(),
        milestones: factory.array(
            factory.object({
                id: factory.number(),
                name: factory.string(),
                done: factory.boolean(),
            }),
        ),
        meta: factory.object({
            deadline: factory.string(),
            budget: factory.number(),
            options: factory.object({
                notify: factory.boolean(),
                priority: factory.number(),
            }),
        }),
    };
});

type Project = ShapeInfer<typeof projectShape>;
type ProjectMilestone = Project["milestones"][number];
type ProjectMeta = Project["meta"];
type ProjectOptions = Project["meta"]["options"];
```

## Store

```typescript
import { createStore, ActionOneMode, ActionManyMode, ActionApiMethod } from "@diphyx/harlemify";

export const projectStore = createStore({
    name: "projects",
    model({ one, many }) {
        return {
            current: one(projectShape),
            list: many(projectShape),
        };
    },
    view({ from }) {
        return {
            project: from("current"),
            projects: from("list"),
            count: from("list", (model) => {
                return model.length;
            }),
            isActive: from("current", (model) => {
                return model?.active ?? false;
            }),
            milestones: from("current", (model) => {
                return model?.milestones ?? [];
            }),
            completedMilestones: from("current", (model) => {
                return model?.milestones.filter(({ done }) => done).length ?? 0;
            }),
            meta: from("current", (model) => {
                return model?.meta ?? null;
            }),
            options: from("current", (model) => {
                return model?.meta?.options ?? null;
            }),
        };
    },
    action({ api }) {
        // Basic CRUD
        const get = api({
            method: ActionApiMethod.GET,
            url(view) {
                return `/projects/${view.project.value?.id}`;
            },
        }).commit("current", ActionOneMode.SET);

        const list = api({
            method: ActionApiMethod.GET,
            url: "/projects",
        }).commit("list", ActionManyMode.SET);

        const create = api({
            method: ActionApiMethod.POST,
            url: "/projects",
        }).commit("list", ActionManyMode.ADD, undefined, { prepend: true });

        const update = api({
            method: ActionApiMethod.PATCH,
            url(view) {
                return `/projects/${view.project.value?.id}`;
            },
        }).commit("current", ActionOneMode.PATCH);

        const remove = api({
            method: ActionApiMethod.DELETE,
            url(view) {
                return `/projects/${view.project.value?.id}`;
            },
        }).commit("list", ActionManyMode.REMOVE);

        // Toggle with multi-model commit
        const toggle = api({
            method: ActionApiMethod.PUT,
            url(view) {
                return `/projects/${view.project.value?.id}/toggle`;
            },
        }).handle(async ({ api, commit }) => {
            const result = await api<Project>();

            commit("current", ActionOneMode.PATCH, result);
            commit("list", ActionManyMode.PATCH, result);

            return result;
        });

        // Nested field loaders
        const milestones = api({
            method: ActionApiMethod.GET,
            url(view) {
                return `/projects/${view.project.value?.id}/milestones`;
            },
        }).handle(async ({ api, commit }) => {
            const milestones = await api<ProjectMilestone[]>();

            commit("current", ActionOneMode.PATCH, { milestones });
            commit("list", ActionManyMode.PATCH, { milestones });

            return milestones;
        });

        const meta = api({
            method: ActionApiMethod.GET,
            url(view) {
                return `/projects/${view.project.value?.id}/meta`;
            },
        }).handle(async ({ api, commit }) => {
            const meta = await api<ProjectMeta>();

            commit("current", ActionOneMode.PATCH, { meta });
            commit("list", ActionManyMode.PATCH, { meta });

            return meta;
        });

        const options = api({
            method: ActionApiMethod.GET,
            url(view) {
                return `/projects/${view.project.value?.id}/options`;
            },
        }).handle(async ({ api, commit, view }) => {
            const options = await api<ProjectOptions>();

            const patch = {
                meta: {
                    ...view.meta.value,
                    options,
                },
            };

            commit("current", ActionOneMode.PATCH, patch, { deep: true });
            commit("list", ActionManyMode.PATCH, patch, { deep: true });

            return options;
        });

        // Action without state commit
        const exportData = api({
            method: ActionApiMethod.GET,
            url(view) {
                return `/projects/${view.project.value?.id}/export`;
            },
        }).handle(async ({ api }) => {
            return await api();
        });

        return {
            get,
            list,
            create,
            update,
            delete: remove,
            toggle,
            milestones,
            meta,
            options,
            export: exportData,
        };
    },
});
```

## Key Patterns

### Nested Field Loading

Load sub-resources into nested fields using `handle` + `commit` with `PATCH`:

```typescript
const milestones = api({
    method: ActionApiMethod.GET,
    url(view) {
        return `/projects/${view.project.value?.id}/milestones`;
    },
}).handle(async ({ api, commit }) => {
    const milestones = await api<Milestone[]>();
    commit("current", ActionOneMode.PATCH, { milestones });
    return milestones;
});
```

### Deep Patch

Use `{ deep: true }` to merge nested objects instead of replacing them:

```typescript
const options = api({
    method: ActionApiMethod.GET,
    url(view) {
        return `/projects/${view.project.value?.id}/options`;
    },
}).handle(async ({ api, commit, view }) => {
    const options = await api<Options>();

    commit("current", ActionOneMode.PATCH, {
        meta: { ...view.meta.value, options },
    }, { deep: true });
});
```

### Multi-Model Commit

Commit to multiple models within a single `handle`:

```typescript
const toggle = api({
    method: ActionApiMethod.PUT,
    url(view) {
        return `/projects/${view.project.value?.id}/toggle`;
    },
}).handle(async ({ api, commit }) => {
    const result = await api<Project>();

    commit("current", ActionOneMode.PATCH, result);   // Update singleton
    commit("list", ActionManyMode.PATCH, result);      // Update in list

    return result;
});
```

### Actions Without State Commit

For actions that return data without affecting state:

```typescript
const exportData = api({
    method: ActionApiMethod.GET,
    url(view) {
        return `/projects/${view.project.value?.id}/export`;
    },
}).handle(async ({ api }) => {
    return await api();
});
```

```typescript
// Returns data directly, state unchanged
const data = await action.export();
```

## Component Usage

```vue
<script setup lang="ts">
import { projectStore } from "~/stores/project";
import { ActionOneMode } from "@diphyx/harlemify";

const { model, view, action } = projectStore;

await action.list();

async function selectProject(project: Project) {
    model("current", ActionOneMode.SET, project);
    await action.get();
}

async function loadMilestones() {
    await action.milestones();
}

async function handleExport() {
    const data = await action.export();
    console.log("Export data:", data);
}
</script>

<template>
    <div class="layout">
        <!-- Project List -->
        <aside>
            <div v-for="p in view.projects.value" :key="p.id" @click="selectProject(p)">
                {{ p.name }}
            </div>
        </aside>

        <!-- Selected Project -->
        <main v-if="view.project.value">
            <h1>{{ view.project.value.name }}</h1>
            <p>{{ view.project.value.description }}</p>

            <!-- Lazy-loaded milestones -->
            <section>
                <h2>Milestones ({{ view.completedMilestones.value }} done)</h2>
                <button @click="loadMilestones" v-if="!view.milestones.value.length">
                    Load Milestones
                </button>
                <ul v-else>
                    <li v-for="m in view.milestones.value" :key="m.id">
                        {{ m.name }} - {{ m.done ? "Done" : "Pending" }}
                    </li>
                </ul>
            </section>

            <button @click="handleExport">Export Project</button>
        </main>
    </div>
</template>
```

## Next Steps

- [Concurrency](../advanced/concurrency.md) - Control concurrent action execution
- [API Reference](../api/README.md) - Complete type definitions
