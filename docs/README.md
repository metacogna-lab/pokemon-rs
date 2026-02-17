# Documentation (Mintlify)

This folder is a [Mintlify](https://mintlify.com) documentation site. It will expand as the system progresses.

## Structure

- **docs.json** — Mintlify config (name, navigation, theme).
- **intro.mdx**, **getting-started.mdx** — Introduction and setup.
- **architecture/** — Overview, state machine, data model.
- **backend/** — Backend overview, CLI, API contract.
- **agents/** — Agents overview, strategic planner, orchestrator, behaviour profiles.
- **database/** — Schema and migrations.
- **reference/** — OpenAPI and error codes.

## Validate

From repo root:

```bash
bun run docs:validate
```

This checks that `docs.json` exists, has required keys, and every nav-linked page exists.

## Preview locally

```bash
bun run docs:dev
# or: cd docs && npx mint dev
```

Open http://localhost:3000 (or the port shown).

## Adding pages

1. Add the `.mdx` (or `.md`) file under `docs/`.
2. Add the path to `docs.json` under the right group in `navigation`.
3. Run `bun run docs:validate` to confirm.
