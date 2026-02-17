# CI Artifacts

Directory layout for CI/CD outputs and artifacts.

## Structure

```
.agents/ci/
├── reports/
│   └── lint/          # ESLint and other linter reports
├── results/
│   ├── rust-tests/    # Cargo test outputs, coverage
│   └── ts-tests/      # Bun/Vitest outputs, coverage
├── build/
│   ├── backend/       # Rust backend build artifacts
│   └── agents/        # TypeScript agents build artifacts
└── CI-README.md       # This file
```

## Usage

Workflows write outputs here. Add `reports/`, `results/`, and `build/` to `.gitignore` to avoid committing artifacts.
