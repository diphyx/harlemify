import { users } from "~/server/utils/data";

export default defineEventHandler(() => {
    return users;
});
