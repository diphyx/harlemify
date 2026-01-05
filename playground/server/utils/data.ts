// Config
export const config = {
    id: 1,
    theme: "dark" as "light" | "dark",
    language: "en",
    notifications: true,
};

// Users
export interface User {
    id: number;
    name: string;
    email: string;
}

let nextUserId = 4;

export const users: User[] = [
    { id: 1, name: "John Doe", email: "john@example.com" },
    { id: 2, name: "Jane Smith", email: "jane@example.com" },
    { id: 3, name: "Bob Wilson", email: "bob@example.com" },
];

export function getNextUserId() {
    return nextUserId++;
}

// Posts
export interface Post {
    id: number;
    userId: number;
    title: string;
    body: string;
}

let nextPostId = 4;

export const posts: Post[] = [
    {
        id: 1,
        userId: 1,
        title: "First Post",
        body: "This is the first post content.",
    },
    {
        id: 2,
        userId: 1,
        title: "Second Post",
        body: "This is the second post content.",
    },
    { id: 3, userId: 2, title: "Hello World", body: "Hello from Jane!" },
];

export function getNextPostId() {
    return nextPostId++;
}
