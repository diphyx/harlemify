<script setup lang="ts">
import { ActionOneMode, ActionManyMode } from "../../src/runtime";
import { postStore, type Post } from "../stores/post";

const { view, action, model } = postStore;

const showModal = ref(false);
const editing = ref<Post | null>(null);
const form = ref({ title: "", body: "", userId: 1 });

onMounted(() => action.list());

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
        model("current", ActionOneMode.SET, editing.value);
        await action.update({
            body: { title: form.value.title, body: form.value.body },
        });
    } else {
        await action.create({
            body: { id: Date.now(), ...form.value },
        });
    }
    showModal.value = false;
}

async function remove(post: Post) {
    if (confirm(`Delete "${post.title}"?`)) {
        model("current", ActionOneMode.SET, post);
        await action.delete();
    }
}

async function sortPosts() {
    await action.sort();
}

async function appendFromServer() {
    await action.list({
        commit: { mode: ActionManyMode.ADD },
    });
}

function resetSortAction() {
    action.sort.reset();
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
            <h2 data-testid="post-count">{{ view.count.value }} posts</h2>
            <button class="btn btn-primary" data-testid="add-post" @click="openCreate">Add Post</button>
        </div>

        <div class="toolbar" style="margin-top: 12px">
            <button class="btn btn-sm" data-testid="sort-posts" @click="sortPosts">Sort A-Z</button>
            <button class="btn btn-sm" data-testid="append-posts" @click="appendFromServer">Append from Server</button>
            <button class="btn btn-sm" data-testid="reset-sort" @click="resetSortAction">Reset Sort</button>
        </div>

        <div v-if="action.list.loading.value" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="list" data-testid="post-list">
            <div
                v-for="post in view.posts.value.slice(0, 15)"
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

        <div class="detail" data-testid="merged-overview">
            <h3>Merged View (view.overview)</h3>
            <pre>{{ JSON.stringify(view.overview.value, null, 2) }}</pre>
        </div>

        <div v-if="action.sort.data" class="detail" data-testid="sort-data">
            <h3>action.sort.data (last sort result)</h3>
            <p>{{ (action.sort.data as any)?.length }} items sorted</p>
        </div>

        <!-- Action Status -->
        <div class="monitor-status" data-testid="action-status">
            <h3>Action Status</h3>
            <div class="monitor-grid">
                <div class="monitor-item" data-testid="status-list">
                    <span class="monitor-label">list</span>
                    <span class="monitor-state" :data-status="action.list.status.value">{{
                        action.list.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-create">
                    <span class="monitor-label">create</span>
                    <span class="monitor-state" :data-status="action.create.status.value">{{
                        action.create.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-update">
                    <span class="monitor-label">update</span>
                    <span class="monitor-state" :data-status="action.update.status.value">{{
                        action.update.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-delete">
                    <span class="monitor-label">delete</span>
                    <span class="monitor-state" :data-status="action.delete.status.value">{{
                        action.delete.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-sort">
                    <span class="monitor-label">sort</span>
                    <span class="monitor-state" :data-status="action.sort.status.value">{{
                        action.sort.status.value
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
                <li>
                    <code>action(&#123; commit: &#123; mode: ActionManyMode.ADD &#125; &#125;)</code> - Call-time
                    commit.mode override
                </li>
                <li><code>action.sort.data</code> - Last successful result from action</li>
                <li><code>action.sort.reset()</code> - Reset action state</li>
                <li><code>action(&#123; body &#125;)</code> - Call-time payload with body data</li>
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
