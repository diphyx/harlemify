import { users } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const id = Number(getRouterParam(event, "id"));
    const body = await readBody(event);
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
        throw createError({ statusCode: 404, message: "User not found" });
    }
    users[index] = { ...users[index], ...body };
    return users[index];
});
