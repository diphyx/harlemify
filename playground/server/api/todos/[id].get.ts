import { data } from "~/server/utils/data";

export default defineEventHandler((event) => {
    const id = Number(getRouterParam(event, "id"));
    const todo = data.todos.find((t) => t.id === id);
    if (!todo) {
        throw createError({ statusCode: 404, message: "Todo not found" });
    }
    return todo;
});
