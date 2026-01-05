import { posts } from "~/server/utils/data";

export default defineEventHandler(() => {
    return posts;
});
