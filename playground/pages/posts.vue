<script setup lang="ts">
import { postStore, type Post } from "../stores/post";

const { posts, getPosts, postPosts, patchPosts, deletePosts, getPostsIsPending } = useStoreAlias(postStore);

const showModal = ref(false);
const editing = ref<Post | null>(null);
const form = ref({ title: "", body: "", userId: 1 });

onMounted(() => getPosts());

function openCreate() {
    editing.value = null;
    form.value = { title: "", body: "", userId: 1 };
    showModal.value = true;
}

function openEdit(post: Post) {
    editing.value = post;
    form.value = { title: post.title, body: post.body, userId: post.userId };
    showModal.value = true;
}

async function save() {
    if (editing.value) {
        await patchPosts([
            {
                id: editing.value.id,
                title: form.value.title,
                body: form.value.body,
            },
        ]);
    } else {
        await postPosts([{ id: Date.now(), ...form.value }]);
    }
    showModal.value = false;
}

async function remove(post: Post) {
    if (confirm(`Delete "${post.title}"?`)) {
        await deletePosts([{ id: post.id }]);
    }
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back">← Back</NuxtLink>

        <div class="page-title">
            <h1>Posts</h1>
            <p>Collection store using <code>useStoreAlias</code> composable</p>
        </div>

        <div class="toolbar">
            <h2>{{ posts.length }} posts</h2>
            <button class="btn btn-primary" @click="openCreate">Add Post</button>
        </div>

        <div v-if="getPostsIsPending" class="loading">Loading...</div>

        <div v-else class="list">
            <div v-for="post in posts.slice(0, 15)" :key="post.id" class="list-item">
                <div>
                    <h3>{{ post.title }}</h3>
                    <p>{{ post.body.substring(0, 80) }}...</p>
                </div>
                <div class="list-actions">
                    <button class="btn btn-sm" @click="openEdit(post)">Edit</button>
                    <button class="btn btn-sm btn-danger" @click="remove(post)">Delete</button>
                </div>
            </div>
        </div>

        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
            <div class="modal">
                <h2>{{ editing ? "Edit Post" : "Add Post" }}</h2>
                <form @submit.prevent="save">
                    <div class="form-group">
                        <label>Title</label>
                        <input v-model="form.title" required >
                    </div>
                    <div class="form-group">
                        <label>Body</label>
                        <textarea v-model="form.body" rows="4" required />
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn" @click="showModal = false">Cancel</button>
                        <button type="submit" class="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
