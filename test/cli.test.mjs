import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { listStacks, mergeStacks, demoteHeadings, plannedWrites, main } from "../bin/stack-rules.mjs";

const quiet = { log() {} };

test("every stack folder is listed with a readable title", () => {
  const stacks = listStacks();
  assert.ok(stacks.length >= 6);
  for (const s of stacks) assert.doesNotMatch(s.title, /AI Coding Rules/);
});

test("merging keeps one H1 and leaves code comments alone", () => {
  const merged = mergeStacks(["fastapi", "prisma"]);
  let fence = false;
  const h1 = merged.split("\n").filter((l) => {
    if (/^\s*```/.test(l)) fence = !fence;
    return !fence && /^# /.test(l);
  });
  assert.equal(h1.length, 1, "exactly one top-level heading");
  assert.match(merged, /## FastAPI/);
  assert.equal(demoteHeadings("```py\n# comment\n```\n# Title"), "```py\n# comment\n```\n## Title");
});

test("cursor format produces one .mdc rule per stack with front matter", () => {
  const writes = plannedWrites(["hono", "sveltekit"], ["cursor"]);
  assert.deepEqual(writes.map((w) => w.path), [".cursor/rules/hono.mdc", ".cursor/rules/sveltekit.mdc"]);
  assert.match(writes[0].content, /^---\ndescription: .+\nalwaysApply: true\n---/);
});

test("add writes files and never overwrites without --force", async () => {
  const dir = mkdtempSync(join(tmpdir(), "stack-rules-"));
  await main(["add", "nextjs-app-router", "--dir", dir, "--format", "claude,agents"], quiet);
  assert.ok(existsSync(join(dir, "CLAUDE.md")));
  assert.ok(existsSync(join(dir, "AGENTS.md")));

  writeFileSync(join(dir, "CLAUDE.md"), "my own rules");
  await main(["add", "prisma", "--dir", dir], quiet); // stdin is not a TTY → answer is "no"
  assert.equal(readFileSync(join(dir, "CLAUDE.md"), "utf8"), "my own rules");

  await main(["add", "prisma", "--dir", dir, "--force"], quiet);
  assert.match(readFileSync(join(dir, "CLAUDE.md"), "utf8"), /Prisma/);
});

test("unknown stacks and formats fail with a helpful message", async () => {
  await assert.rejects(main(["add", "cobol"], quiet), /Unknown stack "cobol". Available:/);
  await assert.rejects(main(["add", "hono", "--format", "vim"], quiet), /Unknown format "vim"/);
});
