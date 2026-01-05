import { users, getNextUserId } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const user = { ...body, id: getNextUserId() };
    users.push(user);
    return user;
});
