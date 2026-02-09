<script setup lang="ts">
import { ModelManyMode } from "../../src/runtime";
import { postStore, postShape, type Post } from "../stores/post";

const showModal = ref(false);
const editing = ref<Post | null>(null);
const form = ref(postShape.defaults());

onMounted(() => postStore.action.list());

function openCreate() {
    editing.value = null;
    form.value = postShape.defaults();
    showModal.value = true;
}

function openEdit(post: Post) {
    editing.value = post;
    postStore.model.current.set(post);
    postStore.model.draft.set(post);
    form.value = postShape.defaults({ title: post.title, body: post.body, userId: post.userId });
    showModal.value = true;
}

watch(
    () => form.value.title,
    (title) => {
        if (editing.value) {
            postStore.model.draft.patch({ title });
        }
    },
);

async function save() {
    if (editing.value) {
        postStore.model.current.set(editing.value);
        await postStore.action.update({
            body: { title: form.value.title, body: form.value.body },
        });
    } else {
        await postStore.action.create({
            body: { ...form.value, id: Date.now() },
        });
    }
    postStore.model.draft.reset();
    showModal.value = false;
}

async function remove(post: Post) {
    if (confirm(`Delete "${post.title}"?`)) {
        postStore.model.current.set(post);
        await postStore.action.delete();
    }
}

async function sortPosts() {
    await postStore.action.sort();
}

async function appendFromServer() {
    await postStore.action.list({
        commit: { mode: ModelManyMode.ADD },
    });
}

function resetSortAction() {
    postStore.action.sort.reset();
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back" data-testid="back-link">← Back</NuxtLink>

        <div class="page-title">
            <h1>Posts</h1>
            <p>Collection store with <code>view.merge()</code> and <code>handle()</code> without API</p>
        </div>

        <div class="toolbar">
            <h2 data-testid="post-count">{{ postStore.view.count.value }} posts</h2>
            <button class="btn btn-primary" data-testid="add-post" @click="openCreate">Add Post</button>
        </div>

        <div class="toolbar" style="margin-top: 12px">
            <button class="btn btn-sm" data-testid="sort-posts" @click="sortPosts">Sort A-Z</button>
            <button class="btn btn-sm" data-testid="append-posts" @click="appendFromServer">Append from Server</button>
            <button class="btn btn-sm" data-testid="reset-sort" @click="resetSortAction">Reset Sort</button>
        </div>

        <div v-if="postStore.action.list.loading.value" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="list" data-testid="post-list">
            <div
                v-for="post in postStore.view.posts.value.slice(0, 15)"
                :key="post.id"
                class="list-item"
                :data-testid="`post-${post.id}`"
            >
                <div>
                    <h3 data-testid="post-title">{{ post.title }}</h3>
                    <p data-testid="post-body">{{ post.body.substring(0, 80) }}...</p>
                </div>
                <div class="list-actions">
                    <button class="btn btn-sm" data-testid="edit-post" @click="openEdit(post)">Edit</button>
                    <button class="btn btn-sm btn-danger" data-testid="delete-post" @click="remove(post)">
                        Delete
                    </button>
                </div>
            </div>
        </div>

        <div class="detail" data-testid="cloned-sorted">
            <h3>Cloned View (view.sorted, clone: true)</h3>
            <pre>{{
                JSON.stringify(
                    postStore.view.sorted.value?.map((p: Post) => p.title),
                    null,
                    2,
                )
            }}</pre>
        </div>

        <div class="detail" data-testid="merged-overview">
            <h3>Merged View (view.overview)</h3>
            <pre>{{ JSON.stringify(postStore.view.overview.value, null, 2) }}</pre>
        </div>

        <div class="detail" data-testid="merged-editor">
            <h3>3-Model Merge (view.editor)</h3>
            <pre>{{ JSON.stringify(postStore.view.editor.value, null, 2) }}</pre>
        </div>

        <div v-if="postStore.action.sort.data" class="detail" data-testid="sort-data">
            <h3>action.sort.data (last sort result)</h3>
            <p>{{ (postStore.action.sort.data as any)?.length }} items sorted</p>
        </div>

        <!-- Action Status -->
        <div class="monitor-status" data-testid="action-status">
            <h3>Action Status</h3>
            <div class="monitor-grid">
                <div class="monitor-item" data-testid="status-list">
                    <span class="monitor-label">list</span>
                    <span class="monitor-state" :data-status="postStore.action.list.status.value">{{
                        postStore.action.list.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-create">
                    <span class="monitor-label">create</span>
                    <span class="monitor-state" :data-status="postStore.action.create.status.value">{{
                        postStore.action.create.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-update">
                    <span class="monitor-label">update</span>
                    <span class="monitor-state" :data-status="postStore.action.update.status.value">{{
                        postStore.action.update.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-delete">
                    <span class="monitor-label">delete</span>
                    <span class="monitor-state" :data-status="postStore.action.delete.status.value">{{
                        postStore.action.delete.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-sort">
                    <span class="monitor-label">sort</span>
                    <span class="monitor-state" :data-status="postStore.action.sort.status.value">{{
                        postStore.action.sort.status.value
                    }}</span>
                </div>
            </div>
        </div>

        <!-- Feature Info -->
        <div class="feature-info" data-testid="feature-info">
            <h3>Features Demonstrated</h3>
            <ul>
                <li><code>model.many(shape)</code> - Collection pattern for managing lists</li>
                <li><code>handle(async (&#123; view, commit &#125;) => ...)</code> - Standalone handle without API</li>
                <li><code>view.merge(["current", "list"], resolver)</code> - Multi-source merged view</li>
                <li><code>view.merge(["current", "draft", "list"], resolver)</code> - 3-model merged view</li>
                <li>
                    <code>action(&#123; commit: &#123; mode: ActionManyMode.ADD &#125; &#125;)</code> - Call-time
                    commit.mode override
                </li>
                <li><code>action.sort.data</code> - Last successful result from action</li>
                <li><code>action.sort.reset()</code> - Reset action state</li>
                <li><code>action(&#123; body &#125;)</code> - Call-time payload with body data</li>
                <li><code>shape.defaults()</code> - Auto-generate zero-value form data from shape</li>
            </ul>
        </div>

        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
            <div class="modal" data-testid="post-modal">
                <h2>{{ editing ? "Edit Post" : "Add Post" }}</h2>
                <form @submit.prevent="save">
                    <div class="form-group">
                        <label>Title</label>
                        <input v-model="form.title" required data-testid="input-title" >
                    </div>
                    <div class="form-group">
                        <label>Body</label>
                        <textarea v-model="form.body" rows="4" required data-testid="input-body" />
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn" data-testid="cancel-modal" @click="showModal = false">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary" data-testid="save-post">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
.monitor-status {
    margin-top: 32px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.monitor-status h3 {
    margin-bottom: 12px;
}

.monitor-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 12px;
}

.monitor-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    background: var(--bg-tertiary);
    border-radius: 6px;
}

.monitor-label {
    font-weight: 600;
    font-size: 14px;
}

.monitor-state {
    font-family: monospace;
    font-size: 13px;
    color: var(--text-muted);
}

.monitor-flags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.flag {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 12px;
    font-weight: 500;
}

.flag[data-flag="idle"] {
    background: #6b7280;
    color: white;
}

.flag[data-flag="pending"] {
    background: #f59e0b;
    color: white;
}

.flag[data-flag="success"] {
    background: #10b981;
    color: white;
}

.flag[data-flag="failed"] {
    background: #ef4444;
    color: white;
}

.feature-info {
    margin-top: 32px;
    padding: 16px;
    background: var(--bg-secondary);
    border-radius: 8px;
}

.feature-info h3 {
    margin-bottom: 12px;
}

.feature-info ul {
    margin: 0;
    padding-left: 20px;
}

.feature-info li {
    margin-bottom: 8px;
}

.feature-info code {
    background: var(--bg-tertiary);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 13px;
}
</style>
