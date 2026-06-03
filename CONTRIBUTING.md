# Contributing to stack-rules

## Adding a new stack

1. Create a folder under `stacks/<stack-name>/`
2. Add a `CLAUDE.md` with rules for that stack
3. Optionally add `.cursorrules` (same content, different format)
4. Add a `README.md` explaining the stack-specific choices

## Rules for rules

Every rule must have a **why**. If you write "don't use X", explain what breaks or what's better. Rules without reasoning will be rejected.

Bad:
```
Don't use useEffect for data fetching.
```

Good:
```
Don't use useEffect for data fetching in Next.js App Router. Server Components can fetch data
directly with async/await, which avoids the client-side loading flicker and reduces JS bundle size.
Use useEffect only for browser-specific side effects (scroll position, timers, etc.).
```

## Scope

- ✅ Framework-specific patterns and pitfalls
- ✅ Version-specific breaking changes
- ✅ Idiomatic conventions the AI should follow
- ✅ Things the AI commonly gets wrong for this stack
- ❌ Generic TypeScript advice (not stack-specific)
- ❌ Personal style preferences without rationale
- ❌ Outdated patterns from old versions

## Format

Use code blocks for examples. Show both ✅ correct and ❌ incorrect patterns where helpful.

## Updating existing stacks

If a framework releases a major version with breaking changes:
1. Update the version comment at the top
2. Update any changed APIs
3. Add a note about what changed if it's non-obvious
