<script setup lang="ts">
import { contactStore, contactShape, type Contact } from "../stores/contact";

const showForm = ref(false);
const editing = ref<Contact | null>(null);
const form = ref(contactShape.defaults());

onMounted(() => contactStore.action.list());

function openCreate() {
    editing.value = null;
    form.value = contactShape.defaults();
    showForm.value = true;
}

function openEdit(contact: Contact) {
    editing.value = contact;
    form.value = contactShape.defaults({
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email,
    });
    showForm.value = true;
}

async function save() {
    if (editing.value) {
        contactStore.model.current.set(editing.value);
        await contactStore.action.update({
            body: { first_name: form.value.first_name, last_name: form.value.last_name, email: form.value.email },
        });
    } else {
        await contactStore.action.create({
            body: { first_name: form.value.first_name, last_name: form.value.last_name, email: form.value.email },
        });
    }
    showForm.value = false;
}

async function remove(c: Contact) {
    if (confirm(`Delete "${c.first_name} ${c.last_name}"?`)) {
        contactStore.model.current.set(c);
        await contactStore.action.delete();
    }
}

async function select(c: Contact) {
    contactStore.model.current.set(c);
    await nextTick();
    await contactStore.action.get();
}

function clearSelection() {
    contactStore.model.current.reset();
}
</script>

<template>
    <PageLayout title="Contacts">
        <template #subtitle>
            Alias mapping with <code>meta({ alias })</code> — API uses kebab-case, store uses snake_case
        </template>

        <div class="toolbar">
            <h2 data-testid="contact-count">{{ contactStore.view.count.value }} contacts</h2>
            <button class="btn btn-primary" data-testid="add-contact" @click="openCreate">Add Contact</button>
        </div>

        <div v-if="showForm" class="inline-form" data-testid="contact-form">
            <h3>{{ editing ? "Edit Contact" : "Add Contact" }}</h3>
            <form @submit.prevent="save">
                <div class="form-row">
                    <input v-model="form.first_name" placeholder="First Name" required data-testid="input-first-name" >
                    <input v-model="form.last_name" placeholder="Last Name" required data-testid="input-last-name" >
                    <input v-model="form.email" type="email" placeholder="Email" required data-testid="input-email" >
                    <button type="submit" class="btn btn-sm btn-primary" data-testid="save-contact">Save</button>
                    <button type="button" class="btn btn-sm" data-testid="cancel-form" @click="showForm = false">
                        Cancel
                    </button>
                </div>
            </form>
        </div>

        <div v-if="contactStore.action.list.loading.value" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="grid" data-testid="contact-grid">
            <div
                v-for="c in contactStore.view.contacts.value"
                :key="c.id"
                class="card"
                :data-testid="`contact-${c.id}`"
            >
                <div class="card-body">
                    <h3 data-testid="contact-name">{{ c.first_name }} {{ c.last_name }}</h3>
                    <p class="subtitle" data-testid="contact-email">{{ c.email }}</p>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm" data-testid="view-contact" @click="select(c)">View</button>
                    <button class="btn btn-sm" data-testid="edit-contact" @click="openEdit(c)">Edit</button>
                    <button class="btn btn-sm btn-danger" data-testid="delete-contact" @click="remove(c)">
                        Delete
                    </button>
                </div>
            </div>
        </div>

        <template #aside>
            <div v-if="contactStore.view.contact.value.id" class="aside-panel" data-testid="selected-contact">
                <div class="aside-panel-title">
                    Selected Contact
                    <button class="btn btn-sm" data-testid="clear-contact" @click="clearSelection">Clear</button>
                </div>
                <pre class="aside-pre">{{ JSON.stringify(contactStore.view.contact.value, null, 2) }}</pre>
            </div>

            <ActionStatus
                :actions="{
                    list: contactStore.action.list,
                    get: contactStore.action.get,
                    create: contactStore.action.create,
                    update: contactStore.action.update,
                    delete: contactStore.action.delete,
                }"
            />
        </template>

        <template #footer>
            <FeatureInfo>
                <li><code>meta({ alias: "first-name" })</code> - Shape-level key alias mapping</li>
                <li>API returns kebab-case keys (<code>first-name</code>, <code>last-name</code>)</li>
                <li>Store commits with snake_case keys (<code>first_name</code>, <code>last_name</code>)</li>
                <li>Outbound body automatically remaps snake_case → kebab-case</li>
                <li>Inbound response automatically remaps kebab-case → snake_case</li>
            </FeatureInfo>
        </template>
    </PageLayout>
</template>
