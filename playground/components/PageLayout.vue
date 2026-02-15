<script setup lang="ts">
defineProps<{
    title: string;
}>();

const pages = [
    { path: "/config", name: "Config" },
    { path: "/users", name: "Users" },
    { path: "/posts", name: "Posts" },
    { path: "/contacts", name: "Contacts" },
    { path: "/projects", name: "Projects" },
    { path: "/teams", name: "Teams" },
    { path: "/dashboard", name: "Dashboard" },
    { path: "/composables", name: "Composables" },
];

const route = useRoute();
const currentIndex = computed(() => pages.findIndex((p) => p.path === route.path));
const prevPage = computed(() => (currentIndex.value > 0 ? pages[currentIndex.value - 1] : null));
const nextPage = computed(() => (currentIndex.value < pages.length - 1 ? pages[currentIndex.value + 1] : null));
</script>

<template>
    <div class="page">
        <div class="page-head">
            <div class="page-head-top">
                <NuxtLink to="/" class="nav-link" data-testid="back-link">&larr; Home</NuxtLink>
                <h1>{{ title }}</h1>
                <div class="nav-pages">
                    <NuxtLink v-if="prevPage" :to="prevPage.path" class="nav-link" data-testid="prev-page">
                        &larr; {{ prevPage.name }}
                    </NuxtLink>
                    <NuxtLink v-if="nextPage" :to="nextPage.path" class="nav-link" data-testid="next-page">
                        {{ nextPage.name }} &rarr;
                    </NuxtLink>
                </div>
            </div>
            <p><slot name="subtitle" /></p>
        </div>

        <div class="page-body">
            <main class="page-main">
                <slot />
            </main>
            <aside class="page-aside">
                <slot name="aside" />
            </aside>
        </div>

        <slot name="footer" />
    </div>
</template>
