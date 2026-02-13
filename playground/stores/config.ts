import { createStore, shape, ModelOneMode, ModelSilent, type ShapeInfer } from "../../src/runtime";

export const configShape = shape((factory) => {
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
            config: one(configShape, {
                pre() {
                    console.log("[config] pre hook");
                },
                post() {
                    console.log("[config] post hook");
                },
            }),
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
    action({ api, handler }) {
        return {
            get: api.get({ url: "/config" }, { model: "config", mode: ModelOneMode.SET }),
            update: api.patch({ url: "/config" }, { model: "config", mode: ModelOneMode.PATCH }),
            replace: api.put({ url: "/config" }, { model: "config", mode: ModelOneMode.SET }),
            silentReset: handler(async ({ model }) => {
                model.config.reset({ silent: true });
            }),
            silentUpdate: handler<Partial<Config>>(async ({ model, payload }) => {
                model.config.patch(payload, { silent: ModelSilent.POST });
            }),
        };
    },
});
