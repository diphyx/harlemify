<script setup lang="ts">
import { ref } from "vue";
import { userStore, type User } from "../stores/user";

const {
    memorizedUnits: users,
    memorizedUnit: selectedUser,
    endpointsStatus,
    getUnits,
    getUnit,
    postUnits,
    patchUnits,
    deleteUnits,
    setMemorizedUnit,
} = userStore;

const showModal = ref(false);
const editing = ref<User | null>(null);
const form = ref({ name: "", email: "" });

onMounted(() => getUnits());

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
        await patchUnits([
            {
                id: editing.value.id,
                name: form.value.name,
                email: form.value.email,
            },
        ]);
    } else {
        await postUnits([{ id: Date.now(), ...form.value }]);
    }
    showModal.value = false;
}

async function remove(user: User) {
    if (confirm(`Delete "${user.name}"?`)) {
        await deleteUnits([{ id: user.id }]);
    }
}

async function select(user: User) {
    await getUnit({ id: user.id });
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back">← Back</NuxtLink>

        <div class="page-title">
            <h1>Users</h1>
            <p>
                Collection store using <code>*Units</code> →
                <code>memorizedUnits</code>
            </p>
        </div>

        <div class="toolbar">
            <h2>{{ users.length }} users</h2>
            <button class="btn btn-primary" @click="openCreate">
                Add User
            </button>
        </div>

        <div v-if="endpointsStatus.getUnitsIsPending.value" class="loading">
            Loading...
        </div>

        <div v-else class="grid">
            <div v-for="user in users" :key="user.id" class="card">
                <div class="card-body">
                    <h3>{{ user.name }}</h3>
                    <p class="subtitle">{{ user.email }}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm" @click="select(user)">
                        View
                    </button>
                    <button class="btn btn-sm" @click="openEdit(user)">
                        Edit
                    </button>
                    <button class="btn btn-sm btn-danger" @click="remove(user)">
                        Delete
                    </button>
                </div>
            </div>
        </div>

        <div v-if="selectedUser" class="detail">
            <h3>Selected User (memorizedUnit)</h3>
            <pre>{{ JSON.stringify(selectedUser, null, 2) }}</pre>
            <button
                class="btn btn-sm"
                style="margin-top: 12px"
                @click="setMemorizedUnit(null)"
            >
                Clear
            </button>
        </div>

        <div
            v-if="showModal"
            class="modal-overlay"
            @click.self="showModal = false"
        >
            <div class="modal">
                <h2>{{ editing ? "Edit User" : "Add User" }}</h2>
                <form @submit.prevent="save">
                    <div class="form-group">
                        <label>Name</label>
                        <input v-model="form.name" required />
                    </div>
                    <div class="form-group">
                        <label>Email</label>
                        <input v-model="form.email" type="email" required />
                    </div>
                    <div class="modal-actions">
                        <button
                            type="button"
                            class="btn"
                            @click="showModal = false"
                        >
                            Cancel
                        </button>
                        <button type="submit" class="btn btn-primary">
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>
