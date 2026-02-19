//! CLI entrypoint for the gaming fingerprinting system.

use clap::Parser;
use controller::app_state::AppState;
use controller::event_store::InMemoryEventStore;
use controller::fingerprinter::InMemoryFingerprintStore;
use controller::persistence_metrics::{InMemorySessionStore, InMemoryWalletStore};
use controller::rl_feedback_loop::{ExperienceStore, InMemoryStore as InMemoryRlStore, PostgresRlStore};
use sqlx::postgres::PgPoolOptions;
use std::net::SocketAddr;
use std::sync::Arc;

mod config;
mod error;
mod server;

use config::Config;

#[derive(Parser)]
#[command(name = "pokemon-cli")]
enum Cli {
    /// Start the backend API server. Reads BIND_ADDR, API_KEYS, DATABASE_URL, etc. from env.
    Serve {
        /// Override the bind address (default from BIND_ADDR env or 0.0.0.0:8080).
        #[arg(long)]
        bind: Option<SocketAddr>,
    },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    // Load .env from the working directory (no-op if file is absent, as in production).
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .init();

    match Cli::parse() {
        Cli::Serve { bind } => {
            let cfg = Config::from_env();
            let addr = bind.unwrap_or(cfg.bind);
            let app_config = cfg.to_app_config();

            let rl_store: Arc<dyn ExperienceStore> = if let Some(ref db_url) = cfg.database_url {
                tracing::info!("Connecting to database");
                let pool = PgPoolOptions::new()
                    .max_connections(5)
                    .connect(db_url)
                    .await?;
                sqlx::migrate!("../database/migrations")
                    .run(&pool)
                    .await?;
                tracing::info!("Migrations applied successfully");
                Arc::new(PostgresRlStore::new(pool))
            } else {
                tracing::warn!("DATABASE_URL not set — using in-memory RL store (ephemeral)");
                Arc::new(InMemoryRlStore::new())
            };

            let state = AppState::with_config(
                Arc::new(InMemorySessionStore::new()),
                Arc::new(InMemoryWalletStore::new()),
                Arc::new(InMemoryEventStore::new()),
                Arc::new(InMemoryFingerprintStore::new()),
                rl_store,
                cfg.api_keys.as_deref(),
                app_config,
            );
            server::serve(addr, state).await?;
        }
    }
    Ok(())
}
