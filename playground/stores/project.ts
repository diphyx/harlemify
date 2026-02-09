import { createStore, shape, ModelOneMode, ModelManyMode, ViewClone, type ShapeInfer } from "../../src/runtime";

export const projectShape = shape((factory) => {
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

export type Project = ShapeInfer<typeof projectShape>;
export type ProjectMilestone = Project["milestones"][number];
export type ProjectMeta = Project["meta"];
export type ProjectOptions = Project["meta"]["options"];

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
            sortedMilestones: from(
                "current",
                (model) => {
                    if (!model) return [];
                    model.milestones.sort((a, b) => a.name.localeCompare(b.name));
                    return model.milestones;
                },
                { clone: ViewClone.DEEP },
            ),
            meta: from("current", (model) => {
                return model?.meta ?? null;
            }),
            options: from("current", (model) => {
                return model?.meta?.options ?? null;
            }),
        };
    },
    action({ api, handler }) {
        const get = api.get(
            {
                url(view) {
                    return `/projects/${view.project.value?.id}`;
                },
            },
            { model: "current", mode: ModelOneMode.SET },
        );

        const list = api.get({ url: "/projects" }, { model: "list", mode: ModelManyMode.SET });

        const create = api.post(
            { url: "/projects" },
            { model: "list", mode: ModelManyMode.ADD, options: { prepend: true } },
        );

        const update = api.patch(
            {
                url(view) {
                    return `/projects/${view.project.value?.id}`;
                },
            },
            { model: "current", mode: ModelOneMode.PATCH },
        );

        const remove = api.delete(
            {
                url(view) {
                    return `/projects/${view.project.value?.id}`;
                },
            },
            { model: "list", mode: ModelManyMode.REMOVE },
        );

        const toggle = handler(async ({ model, view }) => {
            const result = await $fetch<Project>(`/api/projects/${view.project.value?.id}/toggle`, {
                method: "PUT",
            });

            model.current.patch(result);
            model.list.patch(result);

            return result;
        });

        const milestones = handler(async ({ model, view }) => {
            const result = await $fetch<ProjectMilestone[]>(`/api/projects/${view.project.value?.id}/milestones`);

            model.current.patch({ milestones: result });
            model.list.patch({ milestones: result });

            return result;
        });

        const meta = handler(async ({ model, view }) => {
            const result = await $fetch<ProjectMeta>(`/api/projects/${view.project.value?.id}/meta`);

            model.current.patch({ meta: result });
            model.list.patch({ meta: result });

            return result;
        });

        const options = handler(async ({ model, view }) => {
            const result = await $fetch<ProjectOptions>(`/api/projects/${view.project.value?.id}/options`);

            const patch = {
                meta: {
                    ...view.meta.value!,
                    options: result,
                },
            };

            model.current.patch(patch, { deep: true });
            model.list.patch(patch, { deep: true });

            return result;
        });

        const exportData = api.get({
            url(view) {
                return `/projects/${view.project.value?.id}/export`;
            },
        });

        const slowExport = api.get({
            url(view) {
                return `/projects/${view.project.value?.id}/export-slow`;
            },
        });

        const check = api.head({
            url: "/projects/:id",
        });

        const triggerError = api.get({
            url: "/projects/error",
        });

        return {
            get,
            list,
            create,
            update,
            delete: remove,
            toggle,
            check,
            milestones,
            meta,
            options,
            export: exportData,
            slowExport,
            triggerError,
        };
    },
});
