import { z, createStore, Endpoint, ApiAction } from "../../src/runtime";

const UserSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    name: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PATCH],
    }),
    email: z
        .string()
        .email()
        .meta({
            actions: [ApiAction.POST, ApiAction.PATCH],
        }),
});

export type User = z.infer<typeof UserSchema>;

// Collection store with GET_UNIT for detail view
export const userStore = createStore("user", UserSchema, {
    [Endpoint.GET_UNIT]: {
        action: ApiAction.GET,
        url: (params) => `/users/${params.id}`,
    },
    [Endpoint.GET_UNITS]: {
        action: ApiAction.GET,
        url: "/users",
    },
    [Endpoint.POST_UNITS]: {
        action: ApiAction.POST,
        url: "/users",
    },
    [Endpoint.PATCH_UNITS]: {
        action: ApiAction.PATCH,
        url: (params) => `/users/${params.id}`,
    },
    [Endpoint.DELETE_UNITS]: {
        action: ApiAction.DELETE,
        url: (params) => `/users/${params.id}`,
    },
});
