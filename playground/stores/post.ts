import { z } from "zod";

const PostSchema = z.object({
    id: z.number().meta({
        indicator: true,
    }),
    userId: z.number().meta({
        methods: [EndpointMethod.POST],
    }),
    title: z.string().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
    body: z.string().meta({
        methods: [EndpointMethod.POST, EndpointMethod.PATCH],
    }),
});

export type Post = z.infer<typeof PostSchema>;

// Collection store - uses *_UNITS endpoints
export const postStore = createStore("post", PostSchema, {
    [Endpoint.GET_UNITS]: {
        method: EndpointMethod.GET,
        url: "/posts",
    },
    [Endpoint.POST_UNITS]: {
        method: EndpointMethod.POST,
        url: "/posts",
    },
    [Endpoint.PATCH_UNITS]: {
        method: EndpointMethod.PATCH,
        url: (params) => `/posts/${params.id}`,
    },
    [Endpoint.DELETE_UNITS]: {
        method: EndpointMethod.DELETE,
        url: (params) => `/posts/${params.id}`,
    },
});
