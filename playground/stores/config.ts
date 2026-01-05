import { z, createStore, Endpoint, ApiAction } from "../../src/runtime";

const ConfigSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    theme: z.enum(["light", "dark"]).meta({
        actions: [ApiAction.PATCH],
    }),
    language: z.string().meta({
        actions: [ApiAction.PATCH],
    }),
    notifications: z.boolean().meta({
        actions: [ApiAction.PATCH],
    }),
});

export type Config = z.infer<typeof ConfigSchema>;

// Singleton store - uses *_UNIT endpoints only
export const configStore = createStore("config", ConfigSchema, {
    [Endpoint.GET_UNIT]: {
        action: ApiAction.GET,
        url: "/config",
    },
    [Endpoint.PATCH_UNIT]: {
        action: ApiAction.PATCH,
        url: "/config",
    },
});
