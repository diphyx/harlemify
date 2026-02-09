import { data, getNextTodoId } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const todo = { ...body, id: getNextTodoId() };
    data.todos.push(todo);
    return todo;
});
