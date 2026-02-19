//! Application state: dependency injection container for all repositories.
//! Uses Arc<dyn Trait> so handlers are unit-testable without a database.

use crate::api::{Money, Session, Wallet, WalletOperationType};
use crate::event_store::EventStore;
use crate::fingerprinter::FingerprintStore;
use crate::metrics::SessionMetrics;
use crate::ratelimit::RateLimiter;
use crate::rl_feedback_loop::ExperienceStore;
use crate::state_engine::GameState;
use async_trait::async_trait;
use std::collections::HashSet;
use std::sync::Arc;
use std::time::Duration;
use thiserror::Error;
use uuid::Uuid;

/// Runtime configuration injected into handlers via AppState.
/// Fields relevant to gameplay (not to server binding or CLI flags).
#[derive(Debug, Clone)]
pub struct AppConfig {
    /// Operational cost deducted per spin action (default 0.01 AUD).
    pub cost_per_spin: f64,
    /// Weight applied to human-likeness in reward formula (default 0.3).
    pub human_likeness_weight: f64,
    /// Rate-limit cap: maximum requests per minute per token (default 100).
    pub rate_limit_rpm: u32,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            cost_per_spin: 0.01,
            human_likeness_weight: 0.3,
            rate_limit_rpm: 100,
        }
    }
}

/// Domain-level error used by all repositories and handlers.
#[derive(Debug, Error)]
pub enum DomainError {
    #[error("not found: {0}")]
    NotFound(Uuid),
    #[error("invalid state transition from {from:?}")]
    InvalidTransition { from: GameState },
    #[error("wallet limit exceeded")]
    WalletLimitExceeded,
    #[error("invalid input: {0}")]
    InvalidInput(String),
    #[error("internal: {0}")]
    Internal(String),
    #[error("rate limit exceeded")]
    RateLimitExceeded,
}

/// Session repository trait: CRUD on sessions.
#[async_trait]
pub trait SessionRepository: Send + Sync {
    async fn create(&self, session: Session) -> Result<(), DomainError>;
    async fn get_by_id(&self, id: Uuid) -> Result<Option<Session>, DomainError>;
    async fn update_state(&self, id: Uuid, state: GameState) -> Result<Session, DomainError>;
}

/// Wallet repository trait: read and apply operations.
#[async_trait]
pub trait WalletRepository: Send + Sync {
    async fn get_by_id(&self, id: Uuid) -> Result<Option<Wallet>, DomainError>;
    async fn apply_operation(
        &self,
        wallet_id: Uuid,
        operation: WalletOperationType,
        amount: Money,
    ) -> Result<Wallet, DomainError>;
    async fn create(&self, wallet: Wallet) -> Result<(), DomainError>;
}

/// Shared application state injected into every handler.
#[derive(Clone)]
pub struct AppState {
    pub session_repo: Arc<dyn SessionRepository>,
    pub wallet_repo: Arc<dyn WalletRepository>,
    /// Sync event store (Arc because EventStore is a sync trait).
    pub event_store: Arc<dyn EventStore>,
    /// Sync fingerprint store.
    pub fingerprint_store: Arc<dyn FingerprintStore>,
    /// Sync RL experience store.
    pub rl_store: Arc<dyn ExperienceStore>,
    /// Validated API key set. If empty, any non-empty bearer token is accepted (dev mode).
    pub api_keys: Arc<HashSet<String>>,
    /// Rate limiter: requests/minute per token for action endpoints.
    pub rate_limiter: Arc<RateLimiter>,
    /// Session lifecycle counters for observability.
    pub metrics: Arc<SessionMetrics>,
    /// Runtime configuration (cost_per_spin, likeness weight, rate limit).
    pub config: Arc<AppConfig>,
}

impl AppState {
    /// Build AppState from repositories and an optional comma-separated API key env var.
    pub fn new(
        session_repo: Arc<dyn SessionRepository>,
        wallet_repo: Arc<dyn WalletRepository>,
        event_store: Arc<dyn EventStore>,
        fingerprint_store: Arc<dyn FingerprintStore>,
        rl_store: Arc<dyn ExperienceStore>,
        api_keys_csv: Option<&str>,
    ) -> Self {
        Self::with_config(session_repo, wallet_repo, event_store, fingerprint_store, rl_store, api_keys_csv, AppConfig::default())
    }

    /// Build AppState with explicit AppConfig.
    pub fn with_config(
        session_repo: Arc<dyn SessionRepository>,
        wallet_repo: Arc<dyn WalletRepository>,
        event_store: Arc<dyn EventStore>,
        fingerprint_store: Arc<dyn FingerprintStore>,
        rl_store: Arc<dyn ExperienceStore>,
        api_keys_csv: Option<&str>,
        config: AppConfig,
    ) -> Self {
        let api_keys: HashSet<String> = api_keys_csv
            .unwrap_or("")
            .split(',')
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from)
            .collect();
        let rpm = config.rate_limit_rpm;
        Self {
            session_repo,
            wallet_repo,
            event_store,
            fingerprint_store,
            rl_store,
            api_keys: Arc::new(api_keys),
            rate_limiter: Arc::new(RateLimiter::new(rpm, Duration::from_secs(60))),
            metrics: Arc::new(SessionMetrics::new()),
            config: Arc::new(config),
        }
    }
}
