import { posts } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const index = posts.findIndex((p) => p.id === id);
    if (index === -1) {
        throw createError({ statusCode: 404, message: "Post not found" });
    }
    const deleted = posts.splice(index, 1)[0];
    return deleted;
});
