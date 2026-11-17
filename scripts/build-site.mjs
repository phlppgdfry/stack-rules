// Builds the static GitHub Pages site into _site/ from the same stacks/ the CLI uses.
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { listStacks, readStack } from "../bin/stack-rules.mjs";

const stacks = listStacks().map((s) => {
  const body = readStack(s.id);
  return { ...s, body, sections: (body.match(/^## /gm) ?? []).length };
});
const template = readFileSync(new URL("../site/template.html", import.meta.url), "utf8");
// Escape "</" so a rule containing "</script>" can never break out of the inline script.
const json = JSON.stringify(stacks).replace(/<\//g, "<\\/");
mkdirSync(new URL("../_site/", import.meta.url), { recursive: true });
writeFileSync(new URL("../_site/index.html", import.meta.url), template.replace("/*STACKS*/[]", json));
if (existsSync(new URL("../site/og.png", import.meta.url))) copyFileSync(new URL("../site/og.png", import.meta.url), new URL("../_site/og.png", import.meta.url));
console.log(`✓ _site/index.html with ${stacks.length} stacks`);
