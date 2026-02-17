//! CLI entrypoint for the gaming fingerprinting system.

use clap::Parser;
use controller::app_state::AppState;
use controller::persistence_metrics::{InMemorySessionStore, InMemoryWalletStore};
use std::net::SocketAddr;
use std::sync::Arc;

mod server;

#[derive(Parser)]
#[command(name = "pokemon-cli")]
enum Cli {
    /// Start the backend API server (default: 0.0.0.0:8080).
    Serve {
        #[arg(long, default_value = "0.0.0.0:8080")]
        bind: SocketAddr,
    },
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .with_target(false)
        .init();

    match Cli::parse() {
        Cli::Serve { bind } => {
            // Build AppState with in-memory repos (replace with PgPool when DATABASE_URL is set).
            let api_keys = std::env::var("API_KEYS").ok();
            let state = AppState::new(
                Arc::new(InMemorySessionStore::new()),
                Arc::new(InMemoryWalletStore::new()),
                api_keys.as_deref(),
            );
            server::serve(bind, state).await?;
        }
    }
    Ok(())
}
