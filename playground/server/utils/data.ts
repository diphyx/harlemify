// Config
export interface Config {
    id: number;
    theme: "light" | "dark";
    language: string;
    notifications: boolean;
}

// Users
export interface User {
    id: number;
    name: string;
    email: string;
}

// Posts
export interface Post {
    id: number;
    userId: number;
    title: string;
    body: string;
}

// Contacts - demonstrating alias (kebab-case API keys)
export interface Contact {
    id: number;
    "first-name": string;
    "last-name": string;
    email: string;
}

// Todos
export interface Todo {
    id: number;
    title: string;
    done: boolean;
}

// Projects - demonstrating nested shape
export interface ProjectMilestone {
    id: number;
    name: string;
    done: boolean;
}

export interface ProjectOptions {
    notify: boolean;
    priority: number;
}

export interface ProjectMeta {
    deadline: string;
    budget: number;
    options: ProjectOptions;
}

export interface Project {
    id: number;
    name: string;
    description: string;
    active: boolean;
    milestones: ProjectMilestone[];
    meta: ProjectMeta;
}

// Initial data
const initialConfig: Config = {
    id: 1,
    theme: "dark",
    language: "en",
    notifications: true,
};

const initialUsers: User[] = [
    { id: 1, name: "John Doe", email: "john@example.com" },
    { id: 2, name: "Jane Smith", email: "jane@example.com" },
    { id: 3, name: "Bob Wilson", email: "bob@example.com" },
];

const initialPosts: Post[] = [
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

const initialContacts: Contact[] = [
    { id: 1, "first-name": "John", "last-name": "Doe", email: "john@example.com" },
    { id: 2, "first-name": "Jane", "last-name": "Smith", email: "jane@example.com" },
    { id: 3, "first-name": "Bob", "last-name": "Wilson", email: "bob@example.com" },
];

const initialTodos: Todo[] = [
    { id: 1, title: "Buy groceries", done: false },
    { id: 2, title: "Write tests", done: true },
    { id: 3, title: "Deploy app", done: false },
];

const initialProjects: Project[] = [
    {
        id: 1,
        name: "Website Redesign",
        description: "Modernize the company website",
        active: true,
        milestones: [
            { id: 1, name: "Design mockups", done: true },
            { id: 2, name: "Frontend development", done: false },
            { id: 3, name: "Testing & QA", done: false },
        ],
        meta: {
            deadline: "2024-06-30",
            budget: 50000,
            options: {
                notify: true,
                priority: 1,
            },
        },
    },
    {
        id: 2,
        name: "Mobile App",
        description: "Build iOS and Android app",
        active: false,
        milestones: [
            { id: 1, name: "Requirements", done: true },
            { id: 2, name: "UI/UX Design", done: true },
            { id: 3, name: "Development", done: false },
            { id: 4, name: "App Store submission", done: false },
        ],
        meta: {
            deadline: "2024-12-31",
            budget: 120000,
            options: {
                notify: false,
                priority: 2,
            },
        },
    },
];

// Single exported data object containing all mutable state
export const data = {
    config: { ...initialConfig } as Config,
    users: [...initialUsers] as User[],
    posts: [...initialPosts] as Post[],
    contacts: [...initialContacts] as Contact[],
    todos: [...initialTodos] as Todo[],
    projects: [...initialProjects] as Project[],
    nextUserId: 4,
    nextPostId: 4,
    nextContactId: 4,
    nextTodoId: 4,
    nextProjectId: 3,
};

export function getNextUserId() {
    return data.nextUserId++;
}

export function getNextPostId() {
    return data.nextPostId++;
}

export function getNextContactId() {
    return data.nextContactId++;
}

export function getNextTodoId() {
    return data.nextTodoId++;
}

export function getNextProjectId() {
    return data.nextProjectId++;
}

// Deep clone utility
function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

// Reset function for test isolation
export function resetData() {
    data.config = deepClone(initialConfig);
    data.users = deepClone(initialUsers);
    data.posts = deepClone(initialPosts);
    data.contacts = deepClone(initialContacts);
    data.todos = deepClone(initialTodos);
    data.projects = deepClone(initialProjects);
    data.nextUserId = 4;
    data.nextPostId = 4;
    data.nextContactId = 4;
    data.nextTodoId = 4;
    data.nextProjectId = 3;
}
