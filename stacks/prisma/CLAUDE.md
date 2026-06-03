# Prisma — AI Coding Rules

## Version
- Prisma v5+ (v6 syntax where noted)
- TypeScript

## Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt    // auto-updated by Prisma
}

model Post {
  id        String   @id @default(cuid())
  title     String
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  authorId  String
  createdAt DateTime @default(now())
}
```

## Client instantiation (singleton pattern)

```ts
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['query'] : [] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
// Singleton pattern prevents "too many connections" in dev with hot reload
```

## Queries

```ts
// Find one — throws if not found use findUniqueOrThrow
const user = await prisma.user.findUniqueOrThrow({ where: { id } })

// Find with relations
const userWithPosts = await prisma.user.findUnique({
  where: { id },
  include: { posts: { where: { published: true }, orderBy: { createdAt: 'desc' } } }
})

// Select only needed fields (avoid over-fetching)
const user = await prisma.user.findUnique({
  where: { id },
  select: { id: true, name: true, email: true } // no password hash, no posts
})

// Find many with pagination
const posts = await prisma.post.findMany({
  where: { published: true },
  orderBy: { createdAt: 'desc' },
  skip: (page - 1) * perPage,
  take: perPage,
})
```

## Mutations

```ts
// Create
const user = await prisma.user.create({
  data: { email, name }
})

// Upsert
const user = await prisma.user.upsert({
  where: { email },
  update: { name },
  create: { email, name },
})

// Update
await prisma.user.update({
  where: { id },
  data: { name, updatedAt: new Date() }
})

// Delete
await prisma.post.delete({ where: { id } })

// Create with nested relation (create user + first post in one query)
const user = await prisma.user.create({
  data: {
    email,
    name,
    posts: { create: { title: 'Hello World' } }
  },
  include: { posts: true }
})
```

## Transactions

```ts
// Sequential — operations run in order, all roll back on failure
const [user, post] = await prisma.$transaction([
  prisma.user.create({ data: { email, name } }),
  prisma.post.create({ data: { title, authorId: '...' } }),
])

// Interactive — for complex logic with conditionals
await prisma.$transaction(async (tx) => {
  const user = await tx.user.create({ data: { email, name } })
  if (user.role === 'admin') {
    await tx.adminLog.create({ data: { userId: user.id, action: 'created' } })
  }
})
```

## Type inference

```ts
import { Prisma } from '@prisma/client'

// Infer exact return type of a query
type UserWithPosts = Prisma.UserGetPayload<{
  include: { posts: true }
}>

// Never write these types manually — they'll drift from schema
```

## Migrations

```bash
# Create and apply migration
npx prisma migrate dev --name add_user_role

# Apply migrations in production (no schema changes)
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Generate client after schema change
npx prisma generate
```

## What to avoid

- ❌ `new PrismaClient()` in every file — use the singleton from `lib/prisma.ts`
- ❌ `findUnique` when you expect it to always exist — use `findUniqueOrThrow`
- ❌ `include: { everything: true }` — select only what the caller needs
- ❌ Manual `updatedAt` updates — use `@updatedAt` in schema
- ❌ `prisma.$executeRaw` for things the client API can express
- ❌ Forgetting `npx prisma generate` after schema changes
