import { createStore, shape, ModelOneMode, ModelSilent, type ShapeInfer } from "../../src/runtime";

export const configShape = shape((factory) => {
    return {
        theme: factory.enum(["light", "dark"]),
        language: factory.string(),
        notifications: factory.boolean(),
    };
});

export type Config = ShapeInfer<typeof configShape>;

export const metaShape = shape((factory) => {
    return {
        createdAt: factory.number(),
        source: factory.string(),
    };
});

export type Meta = ShapeInfer<typeof metaShape>;

export const configStore = createStore({
    name: "config",
    lazy: true,
    model({ one }) {
        return {
            config: one(configShape, {
                default: () => ({
                    theme: "dark" as const,
                    language: "en",
                    notifications: true,
                }),
                pre() {
                    console.log("[config] pre hook");
                },
                post() {
                    console.log("[config] post hook");
                },
            }),
            meta: one(metaShape, {
                default: () => ({
                    createdAt: Date.now(),
                    source: import.meta.server ? "server" : "client",
                }),
            }),
        };
    },
    view({ from }) {
        return {
            config: from("config"),
            meta: from("meta"),
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
            defaultReset: handler(async ({ model }) => {
                model.config.reset();
                model.meta.reset();
            }),
            pureReset: handler(async ({ model }) => {
                model.config.reset({ pure: true });
            }),
            silentReset: handler(async ({ model }) => {
                model.config.reset({ silent: true, pure: true });
            }),
            silentUpdate: handler<Partial<Config>>(async ({ model, payload }) => {
                model.config.patch(payload, { silent: ModelSilent.POST });
            }),
        };
    },
});
