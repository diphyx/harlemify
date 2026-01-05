import { posts } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const post = posts.find((p) => p.id === id);
    if (!post) {
        throw createError({ statusCode: 404, message: "Post not found" });
    }
    return post;
});
