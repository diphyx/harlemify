import { users } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const index = users.findIndex((u) => u.id === id);
    if (index === -1) {
        throw createError({ statusCode: 404, message: "User not found" });
    }
    const deleted = users.splice(index, 1)[0];
    return deleted;
});
