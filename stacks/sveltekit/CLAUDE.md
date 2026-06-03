# SvelteKit — AI Coding Rules

## Version
- SvelteKit 2 + Svelte 5
- TypeScript
- Vite

## Svelte 5 runes (new syntax)

Svelte 5 replaced reactive declarations with runes. Use runes in all new code:

```svelte
<script lang="ts">
  // ✅ Svelte 5 runes
  let count = $state(0)                    // reactive state
  let doubled = $derived(count * 2)       // computed value
  
  $effect(() => {
    console.log('count changed:', count)  // side effect, auto-cleanup
  })

  // ✅ Props with runes
  let { name, onSubmit }: { name: string; onSubmit: () => void } = $props()
</script>

<!-- ❌ Svelte 4 syntax — don't use in new files -->
<!-- let count = 0 (not reactive without $:) -->
<!-- $: doubled = count * 2 -->
<!-- export let name -->
```

## Project structure

```
src/
  lib/                    # Importable with $lib alias
    server/               # Server-only code (never sent to client)
      db.ts
      auth.ts
    components/
    utils/
  routes/
    +layout.svelte        # Layout — wraps all child routes
    +layout.server.ts     # Server load for layout (runs on server)
    +page.svelte          # Page component
    +page.server.ts       # Server load function + form actions
    +page.ts              # Universal load (runs on server + client)
    +error.svelte         # Error page
    [slug]/               # Dynamic route
    (auth)/               # Route group (no URL segment)
  app.html               # HTML shell
  hooks.server.ts        # Server hooks (auth, CSRF, etc.)
```

## Load functions

```ts
// +page.server.ts — runs ONLY on server
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals, cookies }) => {
  const user = locals.user // set in hooks.server.ts
  const post = await db.post.findUnique({ where: { slug: params.slug } })
  
  if (!post) throw error(404, 'Post not found')
  
  return { post, user } // available as data in +page.svelte
}
```

```ts
// +page.ts — runs on server AND client (universal)
import type { PageLoad } from './$types'

export const load: PageLoad = async ({ fetch, params }) => {
  const res = await fetch(`/api/posts/${params.id}`) // use this fetch, not global
  return { post: await res.json() }
}
```

## Form actions (mutations)

```ts
// +page.server.ts
import { fail, redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const data = await request.formData()
    const title = data.get('title') as string
    
    if (!title) return fail(422, { error: 'Title required', title })
    
    await db.post.create({ data: { title, authorId: locals.user.id } })
    throw redirect(303, '/posts')
  },
  
  delete: async ({ request }) => {
    const data = await request.formData()
    const id = data.get('id') as string
    await db.post.delete({ where: { id } })
  }
}
```

```svelte
<!-- +page.svelte -->
<form method="POST" action="?/create" use:enhance>
  <input name="title" />
  <button type="submit">Create</button>
</form>
<!-- use:enhance = progressive enhancement, no full page reload -->
```

## Server-only imports

```ts
// src/lib/server/db.ts — only importable from server files
// SvelteKit will error if client code tries to import this
import { PrismaClient } from '@prisma/client'
export const db = new PrismaClient()
```

Any file in `$lib/server/` or with `.server.ts` extension cannot be imported client-side.

## Hooks

```ts
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  // Runs on every request — good for auth
  const session = await getSession(event.cookies.get('session'))
  event.locals.user = session?.user ?? null
  
  return resolve(event)
}
```

## What to avoid

- ❌ Svelte 4 reactive syntax (`$:`, `export let`) in new files
- ❌ Global `fetch` in load functions — use the provided `fetch` (handles cookies/headers)
- ❌ Importing server-only code in `.svelte` files or `+page.ts`
- ❌ `window` access in load functions — they can run server-side
- ❌ Throwing errors without `error()` from `@sveltejs/kit` in load functions
- ❌ `throw redirect()` — SvelteKit redirects are thrown, not returned
