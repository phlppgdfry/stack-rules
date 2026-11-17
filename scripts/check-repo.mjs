// Fails CI when the README promises something the repo does not contain.
import { readFileSync } from "node:fs";
import { listStacks } from "../bin/stack-rules.mjs";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const stacks = listStacks().map((s) => s.id);
const linked = [...readme.matchAll(/\]\(\.\/stacks\/([a-z0-9-]+)\/?\)/g)].map((m) => m[1]);
const errors = [];

for (const id of linked) if (!stacks.includes(id)) errors.push(`README links to stacks/${id}/ but that stack does not exist`);
for (const id of stacks) if (!linked.includes(id)) errors.push(`stacks/${id}/ exists but is missing from the README table`);
for (const id of stacks) {
  const body = readFileSync(new URL(`../stacks/${id}/CLAUDE.md`, import.meta.url), "utf8");
  if (!/^# .+/.test(body)) errors.push(`stacks/${id}/CLAUDE.md must start with an H1 title`);
  if ((body.match(/^## /gm) ?? []).length < 4) errors.push(`stacks/${id}/CLAUDE.md has fewer than 4 sections`);
  if (!/✅|❌|\bwhy\b|because/i.test(body)) errors.push(`stacks/${id}/CLAUDE.md shows no reasoning (no ✅/❌ or "why")`);
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${stacks.length} stacks, README table in sync`);
