import { posts, getNextPostId } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const post = { ...body, id: getNextPostId() };
    posts.push(post);
    return post;
});
