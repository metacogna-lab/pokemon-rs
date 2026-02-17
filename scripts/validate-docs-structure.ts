/**
 * Validates Mintlify docs/ structure: docs.json exists, has required keys,
 * and all nav-linked pages exist. Exit 0 on success, 1 on failure.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();
const DOCS_DIR = join(ROOT, "docs");

function collectNavPaths(nav: unknown): string[] {
  const paths: string[] = [];
  if (!Array.isArray(nav)) return paths;

  for (const item of nav) {
    if (typeof item === "string") {
      paths.push(item);
      continue;
    }
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      if ("group" in o && "pages" in o && Array.isArray(o.pages)) {
        for (const p of o.pages as unknown[]) {
          if (typeof p === "string") paths.push(p);
          else if (p && typeof p === "object" && "page" in p)
            paths.push((p as { page: string }).page);
        }
      }
      if ("page" in o && typeof o.page === "string") paths.push(o.page);
    }
  }
  return paths;
}

function main(): number {
  const errors: string[] = [];

  const docsJsonPath = join(DOCS_DIR, "docs.json");
  if (!existsSync(docsJsonPath)) {
    errors.push("docs/docs.json is missing");
    console.error(errors.join("\n"));
    return 1;
  }

  let config: Record<string, unknown>;
  try {
    const raw = readFileSync(docsJsonPath, "utf-8");
    config = JSON.parse(raw) as Record<string, unknown>;
  } catch (e) {
    errors.push(`docs/docs.json invalid JSON: ${e}`);
    console.error(errors.join("\n"));
    return 1;
  }

  if (!config.name || typeof config.name !== "string")
    errors.push("docs.json must have a string 'name'");
  const nav = config.nav ?? config.navigation;
  if (!nav || !Array.isArray(nav))
    errors.push("docs.json must have 'nav' or 'navigation' (array)");

  const paths = collectNavPaths(nav);
  for (const p of paths) {
    const base = p.replace(/^\/+/, "").replace(/\.mdx?$/, "");
    const mdx = join(DOCS_DIR, base + ".mdx");
    const md = join(DOCS_DIR, base + ".md");
    if (!existsSync(mdx) && !existsSync(md))
      errors.push(`Nav target missing: ${p} (resolved: ${base})`);
  }

  if (errors.length > 0) {
    console.error("Docs structure validation failed:\n" + errors.join("\n"));
    return 1;
  }
  console.log("Docs structure OK.");
  return 0;
}

process.exit(main());
