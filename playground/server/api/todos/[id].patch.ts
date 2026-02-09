import { data } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const id = Number(getRouterParam(event, "id"));
    const body = await readBody(event);
    const todo = data.todos.find((t) => t.id === id);
    if (!todo) {
        throw createError({ statusCode: 404, message: "Todo not found" });
    }
    Object.assign(todo, body);
    return todo;
});
