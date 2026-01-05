<script setup lang="ts">
import { configStore } from "../stores/config";

const {
    memorizedUnit: config,
    endpointsStatus,
    getUnit,
    patchUnit,
} = configStore;

const languageInput = ref("");

onMounted(() => getUnit());

watch(
    config,
    (val) => {
        if (val) {
            languageInput.value = val.language;
            document.documentElement.setAttribute("data-theme", val.theme);
        }
    },
    { immediate: true },
);

async function toggleTheme() {
    if (!config.value) return;
    const newTheme = config.value.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    await patchUnit({
        id: config.value.id,
        theme: newTheme,
    });
}

async function updateLanguage() {
    if (!config.value || !languageInput.value.trim()) return;
    await patchUnit({
        id: config.value.id,
        language: languageInput.value.trim(),
    });
}

async function toggleNotifications() {
    if (!config.value) return;
    await patchUnit({
        id: config.value.id,
        notifications: !config.value.notifications,
    });
}
</script>

<template>
    <div class="container">
        <NuxtLink to="/" class="back">← Back</NuxtLink>

        <div class="page-title">
            <h1>Config</h1>
            <p>
                Singleton store using <code>*Unit</code> →
                <code>memorizedUnit</code>
            </p>
        </div>

        <div v-if="endpointsStatus.getUnitIsPending.value" class="loading">
            Loading...
        </div>

        <div v-else-if="config" class="config-list">
            <div class="config-item">
                <div>
                    <strong>Theme</strong>
                    <span class="value">{{ config.theme }}</span>
                </div>
                <button class="btn btn-sm" @click="toggleTheme">Toggle</button>
            </div>

            <div class="config-item">
                <div>
                    <strong>Language</strong>
                </div>
                <form @submit.prevent="updateLanguage" class="config-input">
                    <input v-model="languageInput" type="text" />
                    <button type="submit" class="btn btn-sm">Update</button>
                </form>
            </div>

            <div class="config-item">
                <div>
                    <strong>Notifications</strong>
                    <span class="value">{{
                        config.notifications ? "on" : "off"
                    }}</span>
                </div>
                <button class="btn btn-sm" @click="toggleNotifications">
                    Toggle
                </button>
            </div>

            <div class="detail">
                <h3>Raw Data (memorizedUnit)</h3>
                <pre>{{ JSON.stringify(config, null, 2) }}</pre>
            </div>
        </div>

        <div v-else class="loading">No config available</div>
    </div>
</template>
