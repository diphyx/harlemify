import { createStore, shape, ModelManyKind, ModelManyMode, ModelSilent, type ShapeInfer } from "../../src/runtime";

export const teamMemberShape = shape((factory) => {
    return {
        id: factory.number().meta({
            identifier: true,
        }),
        name: factory.string(),
        role: factory.string(),
    };
});

export type TeamMember = ShapeInfer<typeof teamMemberShape>;

export const teamStore = createStore({
    name: "teams",
    model({ many }) {
        return {
            groups: many(teamMemberShape, {
                kind: ModelManyKind.RECORD,
                pre() {
                    console.log("[teams] pre hook");
                },
                post() {
                    console.log("[teams] post hook");
                },
            }),
        };
    },
    view({ from }) {
        return {
            teams: from("groups"),
            names: from("groups", (groups) => {
                return Object.keys(groups);
            }),
            count: from("groups", (groups) => {
                return Object.keys(groups).length;
            }),
            totalMembers: from("groups", (groups) => {
                return Object.values(groups).reduce((sum, members) => sum + members.length, 0);
            }),
        };
    },
    action({ api, handler }) {
        return {
            load: api.get({ url: "/teams" }, { model: "groups", mode: ModelManyMode.SET }),
            addTeam: handler<{ name: string; members: TeamMember[] }>(async ({ model, payload }) => {
                await $fetch(`/api/teams/${payload.name}`, {
                    method: "PUT",
                    body: payload.members,
                });
                model.groups.add({ key: payload.name, value: payload.members });
            }),
            removeTeam: handler<string>(async ({ model, payload }) => {
                await $fetch(`/api/teams/${payload}`, { method: "DELETE" });
                model.groups.remove(payload, { silent: ModelSilent.POST });
            }),
            patchTeam: handler<{ name: string; members: TeamMember[] }>(async ({ model, payload }) => {
                await $fetch(`/api/teams/${payload.name}`, {
                    method: "PUT",
                    body: payload.members,
                });
                model.groups.patch({ [payload.name]: payload.members });
            }),
        };
    },
});
