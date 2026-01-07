import { z } from "zod";

const UserSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
    email: z.email().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
});

export type User = z.infer<typeof UserSchema>;

// Collection store with GET_UNIT for detail view
export const userStore = createStore("user", UserSchema, {
    [Endpoint.GET_UNIT]: {
        method: EndpointMethod.GET,
        url: (params) => `/users/${params.id}`,
    },
    [Endpoint.GET_UNITS]: {
        method: EndpointMethod.GET,
        url: "/users",
    },
    [Endpoint.POST_UNITS]: {
        method: EndpointMethod.POST,
        url: "/users",
    },
    [Endpoint.PATCH_UNITS]: {
        method: EndpointMethod.PATCH,
        url: (params) => `/users/${params.id}`,
    },
    [Endpoint.DELETE_UNITS]: {
        method: EndpointMethod.DELETE,
        url: (params) => `/users/${params.id}`,
    },
});
