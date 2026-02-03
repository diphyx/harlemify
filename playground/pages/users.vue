<script setup lang="ts">
import { userStore, type User } from "../stores/user";

const { user, users, getUser, listUser, createUser, updateUser, deleteUser, userMonitor, userMemory } =
    useStoreAlias(userStore);

const showModal = ref(false);
const editing = ref<User | null>(null);
const form = ref({ name: "", email: "" });

onMounted(() => listUser());

function openCreate() {
    editing.value = null;
    form.value = { name: "", email: "" };
    showModal.value = true;
}

function openEdit(user: User) {
    editing.value = user;
    form.value = {
        name: user.name,
        email: user.email,
    };
    showModal.value = true;
}

async function save() {
    if (editing.value) {
        await updateUser({
            id: editing.value.id,
            name: form.value.name,
            email: form.value.email,
        });
    } else {
        await createUser({ id: Date.now(), ...form.value });
    }
    showModal.value = false;
}

async function remove(u: User) {
    if (confirm(`Delete "${u.name}"?`)) {
        await deleteUser({ id: u.id });
    }
}

async function select(u: User) {
    await getUser({ id: u.id });
}

function clearUser() {
    userMemory.set(null);
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back">← Back</NuxtLink>

        <div class="page-title">
            <h1>Users</h1>
            <p>Collection store using <code>useStoreAlias</code> composable</p>
        </div>

        <div class="toolbar">
            <h2>{{ users.length }} users</h2>
            <button class="btn btn-primary" @click="openCreate">Add User</button>
        </div>

        <div v-if="userMonitor.list.pending()" class="loading">Loading...</div>

        <div v-else class="grid">
            <div v-for="u in users" :key="u.id" class="card">
                <div class="card-body">
                    <h3>{{ u.name }}</h3>
                    <p class="subtitle">{{ u.email }}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm" @click="select(u)">View</button>
                    <button class="btn btn-sm" @click="openEdit(u)">Edit</button>
                    <button class="btn btn-sm btn-danger" @click="remove(u)">Delete</button>
                </div>
            </div>
        </div>

        <div v-if="user" class="detail">
            <h3>Selected User (user)</h3>
            <pre>{{ JSON.stringify(user, null, 2) }}</pre>
            <button class="btn btn-sm" style="margin-top: 12px" @click="clearUser">Clear</button>
        </div>

        <!-- Feature Explanation -->
        <div class="feature-info">
            <h3>Features Demonstrated</h3>
            <ul>
                <li><code>Endpoint.withAdapter</code> - Custom adapter per endpoint</li>
                <li><code>createStore</code> with <code>adapter</code> option - Store-level adapter</li>
                <li><code>getSchemaFields(schema)</code> - Get all schema field info (cached)</li>
                <li><code>getFieldsForAction(schema, action)</code> - Get fields for specific action</li>
                <li><code>meta({ indicator: true })</code> - Mark field as unique identifier</li>
                <li><code>userMemory.set(null)</code> - Clear unit state</li>
                <li><code>userMonitor.[action].current()</code> - Current status enum value</li>
                <li><code>userMonitor.[action].idle()/pending()/success()/failed()</code> - Boolean status flags</li>
            </ul>
        </div>

        <!-- Monitor Status -->
        <div class="monitor-status" data-testid="monitor-status">
            <h3>Monitor Status</h3>
            <div class="monitor-grid">
                <div class="monitor-item">
                    <span class="monitor-label">get</span>
                    <span class="monitor-state" :data-status="userMonitor.get.current()">{{
                        userMonitor.get.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="userMonitor.get.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="userMonitor.get.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="userMonitor.get.success()" class="flag" data-flag="success">success</span>
                        <span v-if="userMonitor.get.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
                <div class="monitor-item">
                    <span class="monitor-label">list</span>
                    <span class="monitor-state" :data-status="userMonitor.list.current()">{{
                        userMonitor.list.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="userMonitor.list.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="userMonitor.list.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="userMonitor.list.success()" class="flag" data-flag="success">success</span>
                        <span v-if="userMonitor.list.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
                <div class="monitor-item">
                    <span class="monitor-label">create</span>
                    <span class="monitor-state" :data-status="userMonitor.create.current()">{{
                        userMonitor.create.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="userMonitor.create.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="userMonitor.create.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="userMonitor.create.success()" class="flag" data-flag="success">success</span>
                        <span v-if="userMonitor.create.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
                <div class="monitor-item">
                    <span class="monitor-label">update</span>
                    <span class="monitor-state" :data-status="userMonitor.update.current()">{{
                        userMonitor.update.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="userMonitor.update.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="userMonitor.update.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="userMonitor.update.success()" class="flag" data-flag="success">success</span>
                        <span v-if="userMonitor.update.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
                <div class="monitor-item">
                    <span class="monitor-label">delete</span>
                    <span class="monitor-state" :data-status="userMonitor.delete.current()">{{
                        userMonitor.delete.current()
                    }}</span>
                    <span class="monitor-flags">
                        <span v-if="userMonitor.delete.idle()" class="flag" data-flag="idle">idle</span>
                        <span v-if="userMonitor.delete.pending()" class="flag" data-flag="pending">pending</span>
                        <span v-if="userMonitor.delete.success()" class="flag" data-flag="success">success</span>
                        <span v-if="userMonitor.delete.failed()" class="flag" data-flag="failed">failed</span>
                    </span>
                </div>
            </div>
        </div>

        <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
            <div class="modal">
                <h2>{{ editing ? "Edit User" : "Add User" }}</h2>
                <form @submit.prevent="save">
                    <div class="form-group">
                        <label>Name</label>
                        <input v-model="form.name" required >
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input v-model="form.email" type="email" required >
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
