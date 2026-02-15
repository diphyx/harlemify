<script setup lang="ts">
import { teamStore, teamMemberShape, type TeamMember } from "../stores/team";

const showForm = ref(false);
const newTeamName = ref("");
const newMemberName = ref("");
const newMemberRole = ref("");
const newMembers = ref<TeamMember[]>([]);

onMounted(() => teamStore.action.load());

function openCreate() {
    newTeamName.value = "";
    newMembers.value = [teamMemberShape.defaults()];
    showForm.value = true;
}

function addMember() {
    newMembers.value.push(teamMemberShape.defaults());
}

function removeMember(index: number) {
    newMembers.value.splice(index, 1);
}

async function saveTeam() {
    const name = newTeamName.value.trim();
    if (!name || newMembers.value.length === 0) return;
    const members = newMembers.value.map((m, i) => ({ ...m, id: Date.now() + i }));
    await teamStore.action.addTeam({ payload: { name, members } });
    showForm.value = false;
}

async function removeTeam(name: string) {
    if (confirm(`Remove team "${name}"?`)) {
        await teamStore.action.removeTeam({ payload: name });
    }
}

async function addMemberToTeam(teamName: string) {
    const name = newMemberName.value.trim();
    const role = newMemberRole.value.trim();
    if (!name || !role) return;
    const current = teamStore.view.teams.value[teamName] ?? [];
    const member: TeamMember = { id: Date.now(), name, role };
    await teamStore.action.patchTeam({
        payload: { name: teamName, members: [...current, member] },
    });
    newMemberName.value = "";
    newMemberRole.value = "";
}

function resetAll() {
    teamStore.model.groups.reset();
}
</script>

<template>
    <PageLayout title="Teams">
        <template #subtitle> Record store using <code>model.many(shape, { kind: "record" })</code> </template>

        <div class="toolbar">
            <h2 data-testid="team-count">
                {{ teamStore.view.count.value }} teams · {{ teamStore.view.totalMembers.value }} members
            </h2>
            <button class="btn btn-primary" data-testid="add-team" @click="openCreate">Add Team</button>
        </div>

        <div class="toolbar">
            <button class="btn btn-sm" data-testid="reset-all" @click="resetAll">Reset All</button>
            <button class="btn btn-sm" data-testid="reload" @click="teamStore.action.load()">Reload</button>
        </div>

        <div v-if="showForm" class="inline-form" data-testid="team-form">
            <h3>Add Team</h3>
            <form @submit.prevent="saveTeam">
                <div class="form-row" style="margin-bottom: 8px">
                    <input v-model="newTeamName" placeholder="Team Name" required data-testid="input-team-name" >
                </div>
                <div v-for="(member, index) in newMembers" :key="index" class="form-row member-row">
                    <input v-model="member.name" placeholder="Name" required >
                    <input v-model="member.role" placeholder="Role" required >
                    <button
                        v-if="newMembers.length > 1"
                        type="button"
                        class="btn btn-sm btn-danger"
                        @click="removeMember(index)"
                    >
                        &times;
                    </button>
                </div>
                <div class="form-row" style="margin-top: 8px">
                    <button type="button" class="btn btn-sm" @click="addMember">+ Add Member</button>
                    <button type="submit" class="btn btn-sm btn-primary" data-testid="save-team">Save</button>
                    <button type="button" class="btn btn-sm" data-testid="cancel-form" @click="showForm = false">
                        Cancel
                    </button>
                </div>
            </form>
        </div>

        <div v-if="teamStore.action.load.loading.value" class="loading" data-testid="loading">Loading...</div>

        <div v-else class="grid" data-testid="team-grid">
            <div v-for="name in teamStore.view.names.value" :key="name" class="card" :data-testid="`team-${name}`">
                <div class="card-body">
                    <h3 data-testid="team-name">{{ name }}</h3>
                    <ul class="member-list">
                        <li v-for="member in teamStore.view.teams.value[name]" :key="member.id">
                            <strong>{{ member.name }}</strong> — {{ member.role }}
                        </li>
                    </ul>
                    <div class="add-member-row">
                        <input v-model="newMemberName" placeholder="Name" class="input-sm" >
                        <input v-model="newMemberRole" placeholder="Role" class="input-sm" >
                        <button type="button" class="btn btn-sm" @click="addMemberToTeam(name)">Add</button>
                    </div>
                </div>
                <div class="card-footer">
                    <button class="btn btn-sm btn-danger" data-testid="remove-team" @click="removeTeam(name)">
                        Remove Team
                    </button>
                </div>
            </div>
        </div>

        <template #aside>
            <ActionStatus
                :actions="{
                    load: teamStore.action.load,
                    addTeam: teamStore.action.addTeam,
                    removeTeam: teamStore.action.removeTeam,
                    patchTeam: teamStore.action.patchTeam,
                }"
            />
        </template>

        <template #footer>
            <FeatureInfo>
                <li>
                    <code>many(shape, { kind: "record" })</code> — Keyed collection
                    <code>Record&lt;string, S[]&gt;</code>
                </li>
                <li><code>model.groups.set(value)</code> — Replace entire record</li>
                <li><code>model.groups.reset()</code> — Clear to <code>{}</code></li>
                <li><code>model.groups.add({ key, value })</code> — Add a key entry</li>
                <li><code>model.groups.patch(value)</code> — Merge keys into record</li>
                <li><code>model.groups.remove(key)</code> — Remove a key entry</li>
                <li><code>pre / post</code> — Model hooks fired on every mutation</li>
                <li><code>silent: ModelSilent.POST</code> — Skip post hook (used in removeTeam)</li>
            </FeatureInfo>
        </template>
    </PageLayout>
</template>

<style scoped>
.member-list {
    margin: 6px 0;
    padding-left: 16px;
}

.member-list li {
    font-size: 0.8rem;
    color: var(--text-3);
    margin-bottom: 2px;
}

.member-list li strong {
    color: var(--text);
}

.member-row {
    margin-bottom: 6px;
}

.member-row input {
    flex: 1;
}

.add-member-row {
    display: flex;
    gap: 6px;
    align-items: center;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid var(--border);
}

.input-sm {
    flex: 1;
    min-width: 0;
    padding: 6px 10px;
    background: var(--bg-inset);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text);
    font-family: var(--sans);
    font-size: 0.78rem;
    transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease;
}

.input-sm:focus {
    outline: none;
    border-color: var(--blue);
    box-shadow: 0 0 0 3px var(--blue-dim);
}
</style>
