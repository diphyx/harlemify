import { createStore, shape, ActionOneMode, type ShapeInfer } from "../../src/runtime";

const configShape = shape((factory) => {
    return {
        theme: factory.enum(["light", "dark"]),
        language: factory.string(),
        notifications: factory.boolean(),
    };
});

export type Config = ShapeInfer<typeof configShape>;

export const configStore = createStore({
    name: "config",
    model({ one }) {
        return {
            config: one(configShape),
        };
    },
    view({ from }) {
        return {
            config: from("config"),
            theme: from("config", (model) => {
                return model?.theme ?? "dark";
            }),
            language: from("config", (model) => {
                return model?.language ?? "en";
            }),
            notifications: from("config", (model) => {
                return model?.notifications ?? true;
            }),
        };
    },
    action({ api }) {
        return {
            get: api.get({ url: "/config" }).commit("config", ActionOneMode.SET),
            update: api.patch({ url: "/config" }).commit("config", ActionOneMode.PATCH),
        };
    },
});
