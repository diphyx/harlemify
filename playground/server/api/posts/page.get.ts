import { data } from "~/server/utils/data";

export default defineEventHandler(() => {
    return {
        items: data.posts,
        meta: {
            total: data.posts.length,
            offset: 0,
            limit: data.posts.length,
        },
    };
});
