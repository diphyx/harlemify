<script setup lang="ts">
defineProps<{
    actions: Record<string, { status: { value: string }; loading?: { value: boolean }; error?: { value: unknown } }>;
}>();
</script>

<template>
    <div class="action-bar" data-testid="action-status">
        <div class="action-bar-items">
            <span
                v-for="(action, name) in actions"
                :key="name"
                class="action-chip"
                :data-status="action.status.value"
                :data-testid="`status-${name}`"
            >
                <span class="action-chip-name">{{ name }}</span>
                <span class="action-chip-state">{{ action.status.value }}</span>
            </span>
        </div>
    </div>
</template>

<style scoped>
.action-bar {
    padding: 12px 16px;
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow-sm);
}

.action-bar-items {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.action-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 20px;
    background: var(--bg-inset);
    border: 1px solid var(--border);
    transition:
        border-color 0.15s ease,
        background 0.15s ease;
}

.action-chip-name {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--text-3);
}

.action-chip-state {
    font-family: var(--mono);
    font-size: 0.62rem;
    font-weight: 600;
    text-transform: uppercase;
}

.action-chip[data-status="idle"] .action-chip-state {
    color: var(--text-4);
}

.action-chip[data-status="pending"] {
    border-color: rgba(251, 191, 36, 0.25);
    background: var(--yellow-dim);
}

.action-chip[data-status="pending"] .action-chip-state {
    color: var(--yellow);
}

.action-chip[data-status="success"] {
    border-color: rgba(52, 211, 153, 0.25);
    background: var(--green-dim);
}

.action-chip[data-status="success"] .action-chip-state {
    color: var(--green);
}

.action-chip[data-status="error"] {
    border-color: rgba(240, 101, 114, 0.25);
    background: var(--red-dim);
}

.action-chip[data-status="error"] .action-chip-state {
    color: var(--red);
}
</style>
