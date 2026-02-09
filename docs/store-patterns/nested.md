# Nested Store

Complex objects with sub-resources that load separately via different endpoints.

## Store

```typescript
import { createStore, shape, ModelOneMode, ModelManyMode, type ShapeInfer } from "@diphyx/harlemify";

const projectShape = shape((factory) => ({
    id: factory.number().meta({ identifier: true }),
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
}));

type Project = ShapeInfer<typeof projectShape>;
type ProjectMilestone = Project["milestones"][number];
type ProjectMeta = Project["meta"];
type ProjectOptions = Project["meta"]["options"];

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
            milestones: from("current", (model) => model?.milestones ?? []),
            meta: from("current", (model) => model?.meta ?? null),
        };
    },
    action({ api, handler }) {
        return {
            // CRUD via api
            get: api.get(
                { url: (view) => `/projects/${view.project.value?.id}` },
                { model: "current", mode: ModelOneMode.SET },
            ),
            list: api.get({ url: "/projects" }, { model: "list", mode: ModelManyMode.SET }),
            create: api.post(
                { url: "/projects" },
                { model: "list", mode: ModelManyMode.ADD, options: { prepend: true } },
            ),
            delete: api.delete(
                { url: (view) => `/projects/${view.project.value?.id}` },
                { model: "list", mode: ModelManyMode.REMOVE },
            ),

            // Multi-model commit via handler
            toggle: handler(async ({ model, view }) => {
                const result = await $fetch<Project>(`/projects/${view.project.value?.id}/toggle`, { method: "PUT" });
                model.current.patch(result);
                model.list.patch(result);
                return result;
            }),

            // Nested field loaders
            milestones: handler(async ({ model, view }) => {
                const result = await $fetch<ProjectMilestone[]>(`/projects/${view.project.value?.id}/milestones`);
                model.current.patch({ milestones: result });
                model.list.patch({ milestones: result });
                return result;
            }),

            // Deep patch for nested objects
            options: handler(async ({ model, view }) => {
                const result = await $fetch<ProjectOptions>(`/projects/${view.project.value?.id}/options`);
                model.current.patch({ meta: { ...view.meta.value, options: result } }, { deep: true });
                return result;
            }),

            // API without commit (returns data directly)
            export: api.get({
                url: (view) => `/projects/${view.project.value?.id}/export`,
            }),
        };
    },
});
```

## Key Patterns

- **Nested field loading** — Use `handler` to fetch sub-resources and `model.patch({ field: result })` to update nested fields
- **Deep patch** — Pass `{ deep: true }` to merge nested objects instead of replacing them
- **Multi-model commit** — Update both `current` and `list` in a single handler to keep them in sync
- **No-commit API** — Omit the second argument to `api.get()` to return data without affecting state

## Component Usage

```vue
<script setup lang="ts">
import { projectStore } from "~/stores/project";

const { model, view, action } = projectStore;

await action.list();

function selectProject(project: Project) {
    model.current.set(project);
}
</script>

<template>
    <aside>
        <div v-for="p in view.projects.value" :key="p.id" @click="selectProject(p)">
            {{ p.name }}
        </div>
    </aside>

    <main v-if="view.project.value">
        <h1>{{ view.project.value.name }}</h1>

        <button @click="action.milestones()" v-if="!view.milestones.value.length">Load Milestones</button>
        <ul v-else>
            <li v-for="m in view.milestones.value" :key="m.id">{{ m.name }} - {{ m.done ? "Done" : "Pending" }}</li>
        </ul>
    </main>
</template>
```

## Next Steps

- [Concurrency](../advanced/concurrency.md) - Control concurrent action execution
