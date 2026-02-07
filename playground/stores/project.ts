import { createStore, shape, ActionOneMode, ActionManyMode, type ShapeInfer } from "../../src/runtime";

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
        return {
            get: api
                .get({
                    url(view) {
                        return `/projects/${view.project.value?.id}`;
                    },
                })
                .commit("current", ActionOneMode.SET),
            list: api
                .get({
                    url: "/projects",
                })
                .commit("list", ActionManyMode.SET),
            create: api
                .post({
                    url: "/projects",
                })
                .commit("list", ActionManyMode.ADD, undefined, { prepend: true }),
            update: api
                .patch({
                    url(view) {
                        return `/projects/${view.project.value?.id}`;
                    },
                })
                .commit("current", ActionOneMode.PATCH),
            delete: api
                .delete({
                    url(view) {
                        return `/projects/${view.project.value?.id}`;
                    },
                })
                .commit("list", ActionManyMode.REMOVE),
            toggle: api
                .put({
                    url(view) {
                        return `/projects/${view.project.value?.id}/toggle`;
                    },
                })
                .commit("current", ActionOneMode.PATCH),
            milestones: api
                .get({
                    url(view) {
                        return `/projects/${view.project.value?.id}/milestones`;
                    },
                })
                .handle(async ({ api, commit }) => {
                    const milestones = await api();

                    commit("current", ActionOneMode.PATCH, { milestones } as any);

                    return milestones;
                }),
            meta: api
                .get({
                    url(view) {
                        return `/projects/${view.project.value?.id}/meta`;
                    },
                })
                .handle(async ({ api, commit }) => {
                    const meta = await api();

                    commit("current", ActionOneMode.PATCH, { meta } as any);

                    return meta;
                }),
            options: api
                .get({
                    url(view) {
                        return `/projects/${view.project.value?.id}/options`;
                    },
                })
                .handle(async ({ api, commit, view }) => {
                    const options = await api();
                    commit(
                        "current",
                        ActionOneMode.PATCH,
                        {
                            meta: { ...view.meta.value, options },
                        } as any,
                        {
                            deep: true,
                        },
                    );
                    return options;
                }),
            export: api
                .get({
                    url(view) {
                        return `/projects/${view.project.value?.id}/export`;
                    },
                })
                .handle(async ({ api }) => {
                    return await api();
                }),
            slowExport: api
                .get({
                    url(view) {
                        return `/projects/${view.project.value?.id}/export-slow`;
                    },
                })
                .handle(async ({ api }) => {
                    return await api();
                }),
            triggerError: api
                .get({
                    url: "/projects/error",
                })
                .handle(async ({ api }) => {
                    return await api();
                }),
        };
    },
});
