import { createStore, shape, ActionOneMode, ActionManyMode, ActionApiMethod, type ShapeInfer } from "../../src/runtime";

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
            meta: from("current", (model) => {
                return model?.meta ?? null;
            }),
            options: from("current", (model) => {
                return model?.meta?.options ?? null;
            }),
        };
    },
    action({ api }) {
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

        const exportData = api({
            method: ActionApiMethod.GET,
            url(view) {
                return `/projects/${view.project.value?.id}/export`;
            },
        }).handle(async ({ api }) => {
            return await api();
        });

        const slowExport = api({
            method: ActionApiMethod.GET,
            url(view) {
                return `/projects/${view.project.value?.id}/export-slow`;
            },
        }).handle(async ({ api }) => {
            return await api();
        });

        const triggerError = api({
            method: ActionApiMethod.GET,
            url: "/projects/error",
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
            slowExport,
            triggerError,
        };
    },
});
