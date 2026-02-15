<template>
    <div class="container">
        <header class="header">
            <img src="/icon.svg" alt="Harlemify" class="header-logo" >
            <h1>Harlemify</h1>
            <p>API State Management for Nuxt 3+</p>
        </header>

        <div class="home-grid">
            <NuxtLink to="/config" class="home-card">
                <div class="home-card-head">
                    <h2>Config</h2>
                    <span class="badge">singleton</span>
                </div>
                <p>Theme switching, silent mutations, function defaults with <code>model.one()</code></p>
            </NuxtLink>

            <NuxtLink to="/users" class="home-card">
                <div class="home-card-head">
                    <h2>Users</h2>
                    <span class="badge">collection</span>
                </div>
                <p>Full CRUD with <code>merge</code>, <code>unique</code>, custom identifiers, and sorted views</p>
            </NuxtLink>

            <NuxtLink to="/posts" class="home-card">
                <div class="home-card-head">
                    <h2>Posts</h2>
                    <span class="badge">handle</span>
                </div>
                <p>Custom logic with <code>handle()</code>, 3-model merge views, and call-time commit override</p>
            </NuxtLink>

            <NuxtLink to="/contacts" class="home-card">
                <div class="home-card-head">
                    <h2>Contacts</h2>
                    <span class="badge">alias</span>
                </div>
                <p>
                    Automatic key mapping between kebab-case API and snake_case store with <code>meta({ alias })</code>
                </p>
            </NuxtLink>

            <NuxtLink to="/projects" class="home-card">
                <div class="home-card-head">
                    <h2>Projects</h2>
                    <span class="badge pink">advanced</span>
                </div>
                <p>Concurrent control, transformers, abort signals, isolated bind, and structured error handling</p>
            </NuxtLink>

            <NuxtLink to="/teams" class="home-card">
                <div class="home-card-head">
                    <h2>Teams</h2>
                    <span class="badge">record</span>
                </div>
                <p>Keyed record model with <code>many(shape, { kind: "record" })</code> for grouped data</p>
            </NuxtLink>

            <NuxtLink to="/dashboard" class="home-card">
                <div class="home-card-head">
                    <h2>Dashboard</h2>
                    <span class="badge green">compose</span>
                </div>
                <p>Orchestrate multiple actions and models with <code>compose()</code> and typed arguments</p>
            </NuxtLink>

            <NuxtLink to="/composables" class="home-card">
                <div class="home-card-head">
                    <h2>Composables</h2>
                    <span class="badge orange">hooks</span>
                </div>
                <p>
                    <code>useStoreAction</code>, <code>useStoreModel</code>, <code>useStoreView</code>, and
                    <code>useStoreCompose</code>
                </p>
            </NuxtLink>
        </div>

        <footer class="footer">
            <a href="https://github.com/diphyx/harlemify" target="_blank">@diphyx/harlemify</a>
        </footer>
    </div>
</template>

<style scoped>
.header-logo {
    width: 80px;
    height: 80px;
    margin: 0 auto 16px;
}

.home-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.badge.pink {
    background: var(--purple-dim);
    color: var(--purple);
}

.badge.green {
    background: var(--green-dim);
    color: var(--green);
}

.badge.orange {
    background: var(--yellow-dim);
    color: var(--yellow);
}
</style>
