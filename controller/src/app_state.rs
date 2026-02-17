//! Application state: dependency injection container for all repositories.
//! Uses Arc<dyn Trait> so handlers are unit-testable without a database.

use crate::api::{Session, SessionId, Wallet, WalletOperationType, Money};
use crate::state_engine::GameState;
use async_trait::async_trait;
use std::sync::Arc;
use thiserror::Error;
use uuid::Uuid;

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
    /// Create a wallet with initial balance and daily limit.
    async fn create(&self, wallet: Wallet) -> Result<(), DomainError>;
}

/// Shared application state injected into every handler.
#[derive(Clone)]
pub struct AppState {
    pub session_repo: Arc<dyn SessionRepository>,
    pub wallet_repo: Arc<dyn WalletRepository>,
    /// Validated API key set. If empty, any non-empty bearer token is accepted (dev mode).
    pub api_keys: Arc<std::collections::HashSet<String>>,
}

impl AppState {
    /// Build AppState from repositories and an optional comma-separated API key env var.
    pub fn new(
        session_repo: Arc<dyn SessionRepository>,
        wallet_repo: Arc<dyn WalletRepository>,
        api_keys_csv: Option<&str>,
    ) -> Self {
        let api_keys: std::collections::HashSet<String> = api_keys_csv
            .unwrap_or("")
            .split(',')
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(String::from)
            .collect();
        Self {
            session_repo,
            wallet_repo,
            api_keys: Arc::new(api_keys),
        }
    }
}
