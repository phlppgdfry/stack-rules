# Hono — AI Coding Rules

## Framework version
- Hono v4
- TypeScript strict mode
- Target: Cloudflare Workers (adapt for Bun/Node if needed)

## Core concepts

Hono is a Web Standards-based framework. It uses `Request`/`Response` (same as the browser), runs on the edge, and has zero Node.js dependencies. Keep this mental model when writing code.

## Project structure
```
src/
  index.ts          # Entry point — app definition and exports
  routes/           # Route handlers grouped by resource
    users.ts
    products.ts
  middleware/       # Custom middleware
  lib/             # Utilities, DB clients, validators
  types.ts         # Shared types and Hono app type export
```

## App setup and type safety

```ts
// src/index.ts
import { Hono } from 'hono'

const app = new Hono()

// Export the app type for RPC client type inference
export type AppType = typeof app

export default app
```

## Routing

```ts
import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const users = new Hono()

// Path params are typed
users.get('/:id', async (c) => {
  const id = c.req.param('id') // string
  return c.json({ id })
})

// Validated request body — use zValidator, not c.req.json()
const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
})

users.post('/', zValidator('json', createSchema), async (c) => {
  const body = c.req.valid('json') // typed as { name: string, email: string }
  // ...
  return c.json({ user: body }, 201)
})

export default users
```

## Input validation — always use validators

`c.req.json()` returns `any`. Never trust it directly:

```ts
// ❌ Don't do this
const body = await c.req.json()
const { name } = body // any — no type safety

// ✅ Do this — runtime validation + TypeScript types
users.post('/', zValidator('json', schema), (c) => {
  const body = c.req.valid('json') // fully typed
})
```

## Middleware

```ts
import { createMiddleware } from 'hono/factory'

// Typed middleware that adds to context
const authMiddleware = createMiddleware<{
  Variables: { userId: string }
}>(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
  if (!token) return c.json({ error: 'Unauthorized' }, 401)

  const userId = verifyToken(token)
  c.set('userId', userId) // available as c.get('userId') downstream
  await next()
})

// Usage
app.use('/api/*', authMiddleware)
```

## Context variables — type them

```ts
// src/types.ts
type Variables = {
  userId: string
  user: User
}

const app = new Hono<{ Variables: Variables }>()
// Now c.get('userId') and c.set('userId', ...) are typed everywhere
```

## Cloudflare Workers — bindings

```ts
// Define bindings type
type Bindings = {
  DB: D1Database
  KV: KVNamespace
  BUCKET: R2Bucket
  API_KEY: string // secret from wrangler.toml
}

const app = new Hono<{ Bindings: Bindings }>()

app.get('/data', async (c) => {
  const db = c.env.DB     // D1Database
  const kv = c.env.KV     // KVNamespace
  const key = c.env.API_KEY // string secret
})
```

## Error handling

```ts
import { HTTPException } from 'hono/http-exception'

// Throw typed HTTP errors anywhere
throw new HTTPException(404, { message: 'User not found' })
throw new HTTPException(422, { message: 'Validation failed' })

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return err.getResponse()
  }
  console.error(err)
  return c.json({ error: 'Internal server error' }, 500)
})

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404))
```

## RPC client (Hono RPC)

```ts
// Server
const route = app.get('/users/:id',
  zValidator('param', z.object({ id: z.string() })),
  (c) => {
    const { id } = c.req.valid('param')
    return c.json({ user: { id, name: 'Alice' } })
  }
)

export type AppType = typeof route

// Client — fully typed, no codegen needed
import { hc } from 'hono/client'
const client = hc<AppType>('http://localhost:8787')
const res = await client.users[':id'].$get({ param: { id: '1' } })
const { user } = await res.json() // typed as { id: string, name: string }
```

## What to avoid

- ❌ `c.req.json()` without a validator — returns `any`
- ❌ Node.js APIs (`fs`, `path`, `crypto` from Node) — use Web APIs (`crypto.subtle`, etc.)
- ❌ Express-style error-first callbacks — use async/await + try/catch
- ❌ `app.listen()` on Cloudflare Workers — just `export default app`
- ❌ Storing state on the app object — Workers are stateless; use KV, D1, or Durable Objects
