import { z } from "zod";

const ConfigSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    theme: z.enum(["light", "dark"]).meta({
        methods: [EndpointMethod.PATCH],
    }),
    language: z.string().meta({
        methods: [EndpointMethod.PATCH],
    }),
    notifications: z.boolean().meta({
        methods: [EndpointMethod.PATCH],
    }),
});

export type Config = z.infer<typeof ConfigSchema>;

// Singleton store - uses *_UNIT endpoints only
export const configStore = createStore("config", ConfigSchema, {
    [Endpoint.GET_UNIT]: {
        method: EndpointMethod.GET,
        url: "/config",
    },
    [Endpoint.PATCH_UNIT]: {
        method: EndpointMethod.PATCH,
        url: "/config",
    },
});
