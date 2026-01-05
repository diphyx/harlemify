import { z, createStore, Endpoint, ApiAction } from "../../src/runtime";

const PostSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    userId: z.number().meta({
        actions: [ApiAction.POST],
    }),
    title: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PATCH],
    }),
    body: z.string().meta({
        actions: [ApiAction.POST, ApiAction.PATCH],
    }),
});

export type Post = z.infer<typeof PostSchema>;

// Collection store - uses *_UNITS endpoints
export const postStore = createStore("post", PostSchema, {
    [Endpoint.GET_UNITS]: {
        action: ApiAction.GET,
        url: "/posts",
    },
    [Endpoint.POST_UNITS]: {
        action: ApiAction.POST,
        url: "/posts",
    },
    [Endpoint.PATCH_UNITS]: {
        action: ApiAction.PATCH,
        url: (params) => `/posts/${params.id}`,
    },
    [Endpoint.DELETE_UNITS]: {
        action: ApiAction.DELETE,
        url: (params) => `/posts/${params.id}`,
    },
});
