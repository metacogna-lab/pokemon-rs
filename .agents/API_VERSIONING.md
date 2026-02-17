# API Versioning Strategy

## Current version

- **API version**: 1.0.0 (see `openapi.yaml` info.version).
- **URL prefix**: Servers use `/v1` (e.g. `http://localhost:8080/v1`); paths in the spec are expressed without the prefix (e.g. `/sessions`, `/health`). The gateway or server is responsible for mounting the spec under `/v1`.

## Rules

1. **No breaking change without a new version**  
   Changing request/response shapes, removing or renaming required fields, or changing semantics of existing fields is considered breaking. Such changes require a new major or minor version and a new path prefix (e.g. `/v2`) or versioned spec.

2. **Additive changes**  
   New optional fields, new endpoints, and new enum values (when clients are required to tolerate unknown values) are allowed within the same version.

3. **Single source of truth**  
   `openapi.yaml` at the repository root is the canonical contract. All generated clients (e.g. `agents/ts-client`) must be generated from this spec; no hand-editing of generated code.

4. **Codegen**  
   After any change to `openapi.yaml`, run the codegen script (see CLAUDE.md or `scripts/codegen-ts-client.sh`) and commit the updated `agents/ts-client` so that agents and contract tests stay in sync.

## Version bumps

- **Patch**: Documentation or non-contract fixes (e.g. descriptions, examples).
- **Minor**: New endpoints, new optional fields, new optional query params.
- **Major**: Breaking changes (removals, renames, required field changes, semantic changes).
