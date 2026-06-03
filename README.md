# stack-rules 🤖

> Ready-to-use `CLAUDE.md` and `.cursorrules` files for popular tech stacks — with explanations for every rule.

Most AI rule collections are just links to other repos. **stack-rules** gives you the actual file content, tuned per stack, with comments explaining *why* each rule exists so you can adapt it to your project.

Works with **Claude Code**, **Cursor**, **Windsurf**, **GitHub Copilot**, and any tool that reads project-level AI instructions.

---

## Why this exists

AI coding assistants are only as good as the context you give them. A generic prompt produces generic code. A well-crafted `CLAUDE.md` tells your assistant:

- Which version of the framework you're using (Next.js 13 vs 15 is a completely different mental model)
- Your project's conventions (file structure, naming, state management)
- What to avoid (legacy patterns, deprecated APIs)
- Which libraries you use for common tasks

This repo collects that institutional knowledge per stack so you don't have to write it from scratch.

---

## Stacks

| Stack | CLAUDE.md | .cursorrules |
|---|---|---|
| [Next.js 15 App Router](./stacks/nextjs-app-router/) | ✅ | ✅ |
| [Nuxt 3](./stacks/nuxt3/) | ✅ | ✅ |
| [SvelteKit](./stacks/sveltekit/) | ✅ | ✅ |
| [Hono (Cloudflare Workers)](./stacks/hono/) | ✅ | ✅ |
| [FastAPI](./stacks/fastapi/) | ✅ | ✅ |
| [Drizzle ORM](./stacks/drizzle-orm/) | ✅ | ✅ |
| [Prisma](./stacks/prisma/) | ✅ | ✅ |
| [React Native (Expo)](./stacks/react-native-expo/) | ✅ | ✅ |

More coming: Laravel, Django, Rails, tRPC, Turso, Astro.

---

## How to use

**Option 1 — Copy directly**

Browse to your stack folder and copy `CLAUDE.md` into your project root.

**Option 2 — CLI (npx)**

```bash
npx stack-rules add nextjs-app-router
```

Copies the right files into your current directory. Existing files are not overwritten — it asks first.

**Option 3 — Combine stacks**

Each file is modular. If you use Next.js + Drizzle + Tailwind, copy the relevant sections from each:

```bash
npx stack-rules add nextjs-app-router drizzle-orm
# merges both CLAUDE.md files into one
```

---

## File formats

### `CLAUDE.md`
Read by **Claude Code** automatically when present in the project root. Also works as a project instructions file for any assistant that supports markdown context.

### `.cursorrules`
Read by **Cursor** and **Windsurf**. Same content as CLAUDE.md but in the format those tools expect.

---

## Contributing

Each stack folder has a `README.md` explaining the rationale. If you have a correction, addition, or a new stack:

1. Fork the repo
2. Add or edit files in `stacks/<stack-name>/`
3. Include comments in the rule files explaining *why* each rule exists
4. Open a PR

Rules without explanations will not be merged — the *why* is the point.

---

## License

MIT
