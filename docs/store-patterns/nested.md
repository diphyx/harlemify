# Nested Schema

Use nested patterns for complex objects with sub-resources that load separately.

## When to Use

- Objects with expensive sub-resources
- Lazy-loading nested data
- Deep object structures (2+ levels)
- Sub-resources with different endpoints

## Schema

```typescript
import { z } from "zod";

enum ProjectAction {
    GET = "get",
    LIST = "list",
    CREATE = "create",
    TOGGLE = "toggle",
    MILESTONES = "milestones",
    META = "meta",
    OPTIONS = "options",
    EXPORT = "export",
}

const projectSchema = z.object({
    id: z.number().meta({ indicator: true }),
    name: z.string().meta({
        actions: [ProjectAction.CREATE],
    }),
    description: z.string().meta({
        actions: [ProjectAction.CREATE],
    }),
    active: z.boolean(),
    milestones: z.array(
        z.object({
            id: z.number(),
            name: z.string(),
            done: z.boolean(),
        })
    ),
    meta: z.object({
        deadline: z.string(),
        budget: z.number(),
        options: z.object({
            notify: z.boolean(),
            priority: z.number(),
        }),
    }),
});

export type Project = z.infer<typeof projectSchema>;
```

## Actions

```typescript
const projectActions = {
    // Basic CRUD
    [ProjectAction.GET]: {
        endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}`),
        memory: Memory.unit(),
    },
    [ProjectAction.LIST]: {
        endpoint: Endpoint.get("/projects"),
        memory: Memory.units(),
    },
    [ProjectAction.CREATE]: {
        endpoint: Endpoint.post("/projects"),
        memory: Memory.units().add({ prepend: true }),
    },
    [ProjectAction.TOGGLE]: {
        endpoint: Endpoint.put<Project>((p) => `/projects/${p.id}/toggle`),
        memory: Memory.unit().edit(),
    },

    // Nested field loaders
    [ProjectAction.MILESTONES]: {
        endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}/milestones`),
        memory: Memory.unit("milestones"),      // → unit.milestones
    },
    [ProjectAction.META]: {
        endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}/meta`),
        memory: Memory.unit("meta"),            // → unit.meta
    },
    [ProjectAction.OPTIONS]: {
        endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}/options`),
        memory: Memory.unit("meta", "options"), // → unit.meta.options
    },

    // Action without memory
    [ProjectAction.EXPORT]: {
        endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}/export`),
        // No memory - returns data without storing
    },
};

export const projectStore = createStore("project", projectSchema, projectActions);
```

## Memory Paths

| Memory | Target |
|--------|--------|
| `Memory.unit()` | `state.unit` |
| `Memory.unit("milestones")` | `state.unit.milestones` |
| `Memory.unit("meta")` | `state.unit.meta` |
| `Memory.unit("meta", "options")` | `state.unit.meta.options` |

## Component Usage

```vue
<script setup lang="ts">
import { projectStore } from "~/stores/project";

const {
    project,
    projects,
    getProject,
    listProject,
    milestonesProject,
    metaProject,
    optionsProject,
    exportProject,
    projectMonitor,
} = useStoreAlias(projectStore);

// Load project list
await listProject();

// Select and load a project
async function selectProject(id: number) {
    await getProject({ id });
}

// Lazy load nested data
async function loadMilestones() {
    await milestonesProject({ id: project.value!.id });
}

async function loadMeta() {
    await metaProject({ id: project.value!.id });
}

// Export without storing
async function handleExport() {
    const data = await exportProject({ id: project.value!.id });
    console.log("Export data:", data);
}
</script>

<template>
    <div class="layout">
        <!-- Project List -->
        <aside>
            <div v-for="p in projects" :key="p.id" @click="selectProject(p.id)">
                {{ p.name }}
            </div>
        </aside>

        <!-- Selected Project -->
        <main v-if="project">
            <h1>{{ project.name }}</h1>
            <p>{{ project.description }}</p>

            <!-- Lazy-loaded milestones -->
            <section>
                <h2>Milestones</h2>
                <button @click="loadMilestones" v-if="!project.milestones.length">
                    Load Milestones
                </button>
                <ul v-else>
                    <li v-for="m in project.milestones" :key="m.id">
                        {{ m.name }} - {{ m.done ? "Done" : "Pending" }}
                    </li>
                </ul>
            </section>

            <!-- Lazy-loaded meta -->
            <section>
                <h2>Meta</h2>
                <button @click="loadMeta" v-if="!project.meta.deadline">
                    Load Meta
                </button>
                <div v-else>
                    <p>Deadline: {{ project.meta.deadline }}</p>
                    <p>Budget: ${{ project.meta.budget }}</p>
                </div>
            </section>

            <button @click="handleExport">Export Project</button>
        </main>
    </div>
</template>
```

## Actions Without Memory

For actions that return data without affecting state:

```typescript
const projectActions = {
    export: {
        endpoint: Endpoint.get<Project>((p) => `/projects/${p.id}/export`),
        // No memory property - data returned but not stored
    },
    preview: {
        endpoint: Endpoint.post<Project>((p) => `/projects/${p.id}/preview`),
        // No memory - preview without saving
    },
};
```

```typescript
// Returns data directly, state unchanged
const exportData = await exportProject({ id: 1 });
const previewHtml = await previewProject({ id: 1 });
```

## Next Steps

- [Custom Adapters](../advanced/adapters.md) - Advanced HTTP customization
- [API Reference](../api/README.md) - Complete type definitions
