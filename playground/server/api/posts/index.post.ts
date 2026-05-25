import { data, getNextPostId } from "~/server/utils/data";

export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const post = { ...body, id: getNextPostId() };
    data.posts.push(post);
    return { id: post.id };
});
