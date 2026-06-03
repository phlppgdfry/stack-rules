# Next.js 15 App Router — AI Coding Rules

## Framework version
- Next.js 15 with App Router (not Pages Router)
- React 19
- TypeScript strict mode

## Project structure
```
app/                    # Routes live here
  (auth)/               # Route groups with parentheses don't affect URL
  layout.tsx            # Root layout — runs on every page
  page.tsx              # Homepage
  [slug]/page.tsx       # Dynamic route
components/             # Shared UI components
  ui/                   # Primitive components (buttons, inputs)
  layout/               # Layout components (navbar, footer)
lib/                    # Server-side utilities, db clients, auth
actions/                # Server Actions (files must have "use server" at top)
types/                  # Shared TypeScript types
```

## Routing and rendering

**Server Components are the default.** Only add `"use client"` when the component:
- Uses browser APIs (window, localStorage)
- Has event handlers (onClick, onChange)
- Uses React hooks (useState, useEffect, useContext)

**Never add `"use client"` just because:**
- The component uses async/await (Server Components support this)
- The component fetches data (prefer fetching in Server Components)
- You're not sure — check first

**Data fetching patterns:**
```tsx
// ✅ Fetch in Server Components — no useEffect, no loading state boilerplate
export default async function Page() {
  const data = await fetchData() // direct async/await
  return <Component data={data} />
}

// ✅ Parallel fetching — avoid sequential waterfalls
const [users, posts] = await Promise.all([getUsers(), getPosts()])

// ✅ Streaming with Suspense — show UI while data loads
<Suspense fallback={<Skeleton />}>
  <SlowComponent />
</Suspense>
```

## Caching (Next.js 15 changed defaults)

In Next.js 15, **fetch is NOT cached by default**. Be explicit:
```tsx
// Cached indefinitely (opt-in)
fetch(url, { cache: 'force-cache' })

// Revalidate every N seconds
fetch(url, { next: { revalidate: 60 } })

// Tag-based revalidation (call revalidateTag() to invalidate)
fetch(url, { next: { tags: ['products'] } })

// No cache (same as default in Next.js 15)
fetch(url, { cache: 'no-store' })
```

After calling `revalidateTag()` or `revalidatePath()` on the server, also call `router.refresh()` on the client if needed — there are TWO cache layers (server fetch cache + client router cache).

## Server Actions

```tsx
// actions/products.ts
"use server"

import { revalidateTag } from "next/cache"

export async function createProduct(formData: FormData) {
  // validate input at the boundary
  const name = formData.get("name") as string
  if (!name) throw new Error("Name is required")

  await db.product.create({ data: { name } })
  revalidateTag("products")
}
```

- Always validate input inside Server Actions — they are public endpoints
- Use `revalidateTag` or `revalidatePath` after mutations
- Return typed responses, not raw thrown errors, for form UX

## Metadata

Use the Metadata API, never `<head>` tags directly:
```tsx
export const metadata: Metadata = {
  title: "Page title",        // becomes <title>
  description: "...",         // becomes <meta name="description">
}

// Dynamic metadata
export async function generateMetadata({ params }) {
  const product = await getProduct(params.id)
  return { title: product.name }
}
```

## Route Handlers (API routes)

```tsx
// app/api/products/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  // ...
  return Response.json({ products })
}

export async function POST(request: Request) {
  const body = await request.json()
  // validate body before using it
}
```

## What to avoid

- ❌ `getServerSideProps` / `getStaticProps` — Pages Router only
- ❌ `next/router` — use `next/navigation` in App Router
- ❌ `useRouter().push()` for server-side navigation — use `redirect()` from `next/navigation`
- ❌ Wrapping everything in `"use client"` — defeats the purpose of Server Components
- ❌ Fetching in `useEffect` when a Server Component could do it
- ❌ `export default function Page({ params })` without `await params` in Next.js 15 (params is now a Promise)

## Params in Next.js 15

```tsx
// ✅ Next.js 15 — params and searchParams are Promises
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q: string }>
}) {
  const { id } = await params
  const { q } = await searchParams
}
```

## Environment variables

- `NEXT_PUBLIC_` prefix = exposed to browser
- Without prefix = server only (never sent to client)
- Access in Server Components: `process.env.MY_VAR`
- Access in Client Components: `process.env.NEXT_PUBLIC_MY_VAR`
