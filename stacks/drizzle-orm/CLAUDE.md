# Drizzle ORM — AI Coding Rules

## Version
- Drizzle ORM v0.30+
- drizzle-kit for migrations
- PostgreSQL (adapt for MySQL/SQLite as needed)

## Schema definition

```ts
// db/schema.ts — all tables in one file or split by domain
import { pgTable, text, integer, timestamp, boolean, uuid } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
})

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  authorId: uuid('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  published: boolean('published').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations — for use with db.query (relational API)
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}))
```

## Infer types from schema

```ts
import { type InferSelectModel, type InferInsertModel } from 'drizzle-orm'

export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
// Never define these types manually — keep them in sync with schema automatically
```

## Querying — two APIs

**Core API** — explicit, composable, similar to SQL:
```ts
import { eq, and, or, like, desc, asc, sql } from 'drizzle-orm'

// Select
const allUsers = await db.select().from(users)

// Filtered select
const user = await db.select()
  .from(users)
  .where(eq(users.id, id))
  .limit(1)
  .then(r => r[0])  // returns array, get first

// Join
const result = await db
  .select({ user: users, post: posts })
  .from(users)
  .innerJoin(posts, eq(users.id, posts.authorId))
  .where(eq(users.id, userId))
```

**Relational API** — for nested/related data:
```ts
// Returns nested objects — preferred when you need relations
const userWithPosts = await db.query.users.findFirst({
  where: eq(users.id, id),
  with: {
    posts: {
      where: eq(posts.published, true),
      orderBy: desc(posts.createdAt),
    }
  }
})
```

## Mutations

```ts
// Insert — returns inserted row(s)
const [newUser] = await db.insert(users)
  .values({ email: 'alice@example.com', name: 'Alice' })
  .returning()

// Upsert (insert or update on conflict)
await db.insert(users)
  .values({ id, email, name })
  .onConflictDoUpdate({
    target: users.email,
    set: { name, updatedAt: new Date() }
  })

// Update
await db.update(users)
  .set({ name: 'New Name', updatedAt: new Date() })
  .where(eq(users.id, id))

// Delete
await db.delete(posts)
  .where(and(eq(posts.authorId, userId), eq(posts.published, false)))
```

## Transactions

```ts
await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values({ email, name }).returning()
  await tx.insert(posts).values({ title: 'First post', authorId: user.id })
  // if anything throws, entire transaction is rolled back
})
```

## Migrations workflow

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# Apply migrations to database
npx drizzle-kit migrate

# Visual studio for exploring data
npx drizzle-kit studio
```

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! }
})
```

## DB client setup

```ts
// db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const db = drizzle(pool, { schema })
```

## What to avoid

- ❌ Raw `sql` template for things Drizzle's API can express — use the type-safe API
- ❌ Defining TypeScript types manually for table rows — use `InferSelectModel`
- ❌ `db.execute(sql\`...\`)` for queries — only use for DDL or things the API can't express
- ❌ Forgetting `.returning()` after insert/update when you need the row back
- ❌ Using `findMany` when `findFirst` + `.limit(1)` is correct for unique lookups
