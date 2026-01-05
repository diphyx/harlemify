import { posts } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const id = Number(getRouterParam(event, "id"));
    const body = await readBody(event);
    const index = posts.findIndex((p) => p.id === id);
    if (index === -1) {
        throw createError({ statusCode: 404, message: "Post not found" });
    }
    posts[index] = { ...body, id };
    return posts[index];
});
