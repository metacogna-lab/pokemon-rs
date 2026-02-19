BUN := /Users/nullzero/Library/Application\ Support/reflex/bun/bin/bun

.PHONY: serve serve-dev frontend test test-ts test-e2e test-all lint build train generate-client \
        docker-up docker-down docker-logs docker-up-prod docker-down-prod db-shell migrate help

serve:          ## Start Rust backend (port 8080)
	cargo run -p pokemon-cli -- serve

serve-dev:      ## Start backend in dev mode with debug logging (no API key required)
	RUST_LOG=debug cargo run -p pokemon-cli -- serve

frontend:       ## Start Vite dev server (port 5173)
	cd frontend && $(BUN) run dev

test:           ## Run all Rust tests
	cargo test --workspace

test-ts:        ## Run all TypeScript agent tests
	cd agents && $(BUN) test

test-e2e:       ## Run E2E tests (requires backend running on localhost:8080)
	cd agents && RUN_E2E=1 API_KEY=$${API_KEY:-testkey} $(BUN) test e2e/

test-all: test test-ts  ## Run Rust + TypeScript unit tests
	@echo "All tests complete"

lint:           ## Lint Rust (clippy) + TypeScript (eslint)
	cargo clippy --workspace -- -D warnings
	cd agents && $(BUN) run lint

build:          ## Production builds: Rust release + frontend bundle
	cargo build --release --workspace
	cd frontend && $(BUN) run build

train:          ## Run RL training loop (requires backend running)
	cd agents && $(BUN) run rl_model_runner/train.ts

generate-client: ## Regenerate TS client from openapi.yaml
	cd agents && $(BUN) run generate:client

docker-up:      ## Start dev stack (postgres + api + frontend) — requires .env
	docker compose up --build

docker-down:    ## Stop and remove dev containers
	docker compose down

docker-logs:    ## Tail logs from all dev services
	docker compose logs -f

docker-up-prod: ## Start production stack (requires exported env vars)
	docker compose -f docker-compose.prod.yml up -d --build

docker-down-prod: ## Stop production stack
	docker compose -f docker-compose.prod.yml down

db-shell:       ## Open psql shell against the dev Postgres container
	docker compose exec postgres psql -U kalastra -d pokemonrs

migrate:        ## Apply SQL migrations via run_migrations.sh (manual/CI use only)
	DATABASE_URL=$${DATABASE_URL} bash database/run_migrations.sh

help:           ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "%-18s %s\n", $$1, $$2}'
