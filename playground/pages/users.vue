<script setup lang="ts">
import { ActionOneMode } from "../../src/runtime";
import { userStore, type User } from "../stores/user";

const { view, action, model } = userStore;

const showModal = ref(false);
const editing = ref<User | null>(null);
const form = ref({ name: "", email: "" });

onMounted(() => action.list());

function openCreate() {
    editing.value = null;
    form.value = { name: "", email: "" };
    showModal.value = true;
}

function openEdit(user: User) {
    editing.value = user;
    form.value = { name: user.name, email: user.email };
    showModal.value = true;
}

async function save() {
    if (editing.value) {
        model("current", ActionOneMode.SET, editing.value);
        await action.update({
            body: { name: form.value.name, email: form.value.email },
        });
    } else {
        await action.create({
            body: { id: Date.now(), ...form.value },
        });
    }
    showModal.value = false;
}

async function remove(u: User) {
    if (confirm(`Delete "${u.name}"?`)) {
        model("current", ActionOneMode.SET, u);
        await action.delete();
    }
}

async function select(u: User) {
    model("current", ActionOneMode.SET, u);
    await nextTick();
    await action.get();
}

function clearSelection() {
    model("current", ActionOneMode.RESET);
}

async function clearAll() {
    await action.clear();
}

async function addUniqueUser() {
    const first = view.users.value[0];
    if (!first) return;
    await action.addUnique({
        body: { id: first.id, name: first.name + " (dup)", email: first.email },
    });
}

async function patchByEmailDemo() {
    if (!view.user.value) return;
    model("current", ActionOneMode.SET, view.user.value);
    await action.patchByEmail({
        body: { email: view.user.value.email, name: view.user.value.name + " (by email)" },
    });
}

function resetListAction() {
    action.list.reset();
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back" data-testid="back-link">← Back</NuxtLink>

        <div class="page-title">
            <h1>Users</h1>
            <p>Collection store using <code>model.many()</code> with <code>ActionManyMode</code></p>
        </div>

        <div class="toolbar">
            <h2 data-testid="user-count">{{ view.count.value }} users</h2>
            <button class="btn btn-primary" data-testid="add-user" @click="openCreate">Add User</button>
        </div>

        <div class="toolbar" style="margin-top: 12px">
            <button class="btn btn-sm" data-testid="clear-all-users" @click="clearAll">Clear All</button>
            <button class="btn btn-sm" data-testid="add-unique-user" @click="addUniqueUser">Add Unique</button>
            <button
                class="btn btn-sm"
                data-testid="patch-by-email"
                :disabled="!view.user.value"
                @click="patchByEmailDemo"
            >
                Patch by Email
            </button>
            <button class="btn btn-sm" data-testid="reset-list-action" @click="resetListAction">Reset Action</button>
        </div>

        <div v-if="action.list.loading.value" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="grid" data-testid="user-grid">
            <div v-for="u in view.users.value" :key="u.id" class="card" :data-testid="`user-${u.id}`">
                <div class="card-body">
                    <h3 data-testid="user-name">{{ u.name }}</h3>
                    <p class="subtitle" data-testid="user-email">{{ u.email }}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm" data-testid="view-user" @click="select(u)">View</button>
                    <button class="btn btn-sm" data-testid="edit-user" @click="openEdit(u)">Edit</button>
                    <button class="btn btn-sm btn-danger" data-testid="delete-user" @click="remove(u)">Delete</button>
                </div>
            </div>
        </div>

        <div v-if="view.user.value" class="detail" data-testid="selected-user">
            <h3>Selected User (view.user)</h3>
            <pre>{{ JSON.stringify(view.user.value, null, 2) }}</pre>
            <button class="btn btn-sm" style="margin-top: 12px" data-testid="clear-user" @click="clearSelection">
                Clear
            </button>
        </div>

        <div class="detail" data-testid="merged-summary">
            <h3>Merged View (view.summary)</h3>
            <pre>{{ JSON.stringify(view.summary.value, null, 2) }}</pre>
        </div>

        <div v-if="action.list.data" class="detail" data-testid="action-data">
            <h3>action.list.data (last successful result)</h3>
            <pre>{{ JSON.stringify(action.list.data, null, 2)?.substring(0, 200) }}...</pre>
        </div>

        <!-- Action Status -->
        <div class="monitor-status" data-testid="action-status">
            <h3>Action Status</h3>
            <div class="monitor-grid">
                <div class="monitor-item" data-testid="status-get">
                    <span class="monitor-label">get</span>
                    <span class="monitor-state" :data-status="action.get.status.value">{{
                        action.get.status.value
                    }}</span>
                </div>
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
                <div class="monitor-item" data-testid="status-clear">
                    <span class="monitor-label">clear</span>
                    <span class="monitor-state" :data-status="action.clear.status.value">{{
                        action.clear.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-addUnique">
                    <span class="monitor-label">addUnique</span>
                    <span class="monitor-state" :data-status="action.addUnique.status.value">{{
                        action.addUnique.status.value
                    }}</span>
                </div>
                <div class="monitor-item" data-testid="status-patchByEmail">
                    <span class="monitor-label">patchByEmail</span>
                    <span class="monitor-state" :data-status="action.patchByEmail.status.value">{{
                        action.patchByEmail.status.value
                    }}</span>
                </div>
            </div>
        </div>

        <!-- Feature Info -->
        <div class="feature-info" data-testid="feature-info">
            <h3>Features Demonstrated</h3>
            <ul>
                <li><code>model.many(shape)</code> - Collection state management</li>
                <li><code>ActionManyMode.SET</code> - Replace entire array</li>
                <li><code>ActionManyMode.ADD</code> - Append new items</li>
                <li><code>ActionManyMode.PATCH</code> - Update items by identifier</li>
                <li><code>ActionManyMode.REMOVE</code> - Remove items by identifier</li>
                <li><code>ActionManyMode.RESET</code> - Reset array to empty</li>
                <li><code>model("current", ActionOneMode.SET, user)</code> - Direct model mutation</li>
                <li><code>view.merge(["current", "list"], resolver)</code> - Multi-source merged view</li>
                <li><code>commit("list", ActionManyMode.RESET)</code> - Standalone commit without api/handle</li>
                <li><code>commit(..., { unique: true })</code> - Deduplicate on add</li>
                <li><code>commit(..., { by: "email" })</code> - Custom identifier field for patch</li>
                <li><code>action.list.data</code> - Last successful result</li>
                <li><code>action.list.reset()</code> - Reset action state to idle</li>
            </ul>
        </div>

        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
            <div class="modal" data-testid="user-modal">
                <h2>{{ editing ? "Edit User" : "Add User" }}</h2>
                <form @submit.prevent="save">
                    <div class="form-group">
                        <label>Name</label>
                        <input v-model="form.name" required data-testid="input-name" >
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input v-model="form.email" type="email" required data-testid="input-email" >
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn" data-testid="cancel-modal" @click="showModal = false">
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary" data-testid="save-user">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>

<style scoped>
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
</style>
