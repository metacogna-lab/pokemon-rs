//! Persistence layer: in-memory implementations of SessionRepository and WalletRepository.

use crate::api::{Currency, Money, Session, SessionId, Wallet, WalletOperationType};
use crate::app_state::{DomainError, SessionRepository, WalletRepository};
use crate::state_engine::GameState;
use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Mutex;
use uuid::Uuid;

/// In-memory session store (thread-safe, for tests and single-process use).
#[derive(Default)]
pub struct InMemorySessionStore {
    inner: Mutex<HashMap<Uuid, Session>>,
}

impl InMemorySessionStore {
    pub fn new() -> Self {
        Self::default()
    }

    /// Inserts or overwrites a session (sync helper for tests).
    pub fn upsert(&self, session: Session) {
        self.inner
            .lock()
            .unwrap()
            .insert(session.session_id.0, session);
    }

    /// Returns session by id (sync helper for tests).
    pub fn get(&self, session_id: Uuid) -> Option<Session> {
        self.inner.lock().unwrap().get(&session_id).cloned()
    }
}

#[async_trait]
impl SessionRepository for InMemorySessionStore {
    async fn create(&self, session: Session) -> Result<(), DomainError> {
        self.inner
            .lock()
            .map_err(|e| DomainError::Internal(e.to_string()))?
            .insert(session.session_id.0, session);
        Ok(())
    }

    async fn get_by_id(&self, id: Uuid) -> Result<Option<Session>, DomainError> {
        Ok(self.inner.lock().map_err(|e| DomainError::Internal(e.to_string()))?.get(&id).cloned())
    }

    async fn update_state(&self, id: Uuid, state: GameState) -> Result<Session, DomainError> {
        let mut guard = self.inner.lock().map_err(|e| DomainError::Internal(e.to_string()))?;
        let session = guard.get_mut(&id).ok_or(DomainError::NotFound(id))?;
        session.state = state;
        Ok(session.clone())
    }
}

/// In-memory wallet store (thread-safe).
#[derive(Default)]
pub struct InMemoryWalletStore {
    inner: Mutex<HashMap<Uuid, Wallet>>,
}

impl InMemoryWalletStore {
    pub fn new() -> Self {
        Self::default()
    }

    /// Seed a wallet for tests.
    pub fn seed(&self, wallet: Wallet) {
        self.inner.lock().unwrap().insert(wallet.wallet_id.0, wallet);
    }
}

#[async_trait]
impl WalletRepository for InMemoryWalletStore {
    async fn get_by_id(&self, id: Uuid) -> Result<Option<Wallet>, DomainError> {
        Ok(self.inner.lock().map_err(|e| DomainError::Internal(e.to_string()))?.get(&id).cloned())
    }

    async fn apply_operation(
        &self,
        wallet_id: Uuid,
        operation: WalletOperationType,
        amount: Money,
    ) -> Result<Wallet, DomainError> {
        let mut guard = self.inner.lock().map_err(|e| DomainError::Internal(e.to_string()))?;
        let wallet = guard.get_mut(&wallet_id).ok_or(DomainError::NotFound(wallet_id))?;

        match operation {
            WalletOperationType::Debit => {
                // Check balance
                if wallet.balance.amount < amount.amount {
                    return Err(DomainError::WalletLimitExceeded);
                }
                // Check daily limit
                if wallet.daily_spent.amount + amount.amount > wallet.daily_limit.amount {
                    return Err(DomainError::WalletLimitExceeded);
                }
                wallet.balance.amount -= amount.amount;
                wallet.daily_spent.amount += amount.amount;
            }
            WalletOperationType::Credit => {
                wallet.balance.amount += amount.amount;
            }
        }
        Ok(wallet.clone())
    }

    async fn create(&self, wallet: Wallet) -> Result<(), DomainError> {
        self.inner
            .lock()
            .map_err(|e| DomainError::Internal(e.to_string()))?
            .insert(wallet.wallet_id.0, wallet);
        Ok(())
    }
}

/// Helper: build a test wallet with a given balance.
pub fn test_wallet(id: Uuid, balance: f64) -> Wallet {
    let currency = Currency::AUD;
    Wallet {
        wallet_id: SessionId(id),
        balance: Money { amount: balance, currency },
        daily_limit: Money { amount: 1000.0, currency },
        daily_spent: Money { amount: 0.0, currency },
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::{GameId, SessionMetrics};

    fn make_session(id: Uuid) -> Session {
        Session {
            session_id: SessionId(id),
            game_id: GameId(Uuid::new_v4()),
            state: GameState::Initialized,
            metrics: SessionMetrics::default(),
        }
    }

    #[tokio::test]
    async fn create_and_get_session() {
        let store = InMemorySessionStore::new();
        let id = Uuid::new_v4();
        let session = make_session(id);
        store.create(session).await.unwrap();
        let got = store.get_by_id(id).await.unwrap();
        assert!(got.is_some());
        assert_eq!(got.unwrap().state, GameState::Initialized);
    }

    #[tokio::test]
    async fn update_state_changes_session_state() {
        let store = InMemorySessionStore::new();
        let id = Uuid::new_v4();
        store.create(make_session(id)).await.unwrap();
        let updated = store.update_state(id, GameState::Playing).await.unwrap();
        assert_eq!(updated.state, GameState::Playing);
    }

    #[tokio::test]
    async fn update_state_unknown_id_returns_not_found() {
        let store = InMemorySessionStore::new();
        let id = Uuid::new_v4();
        let result = store.update_state(id, GameState::Playing).await;
        assert!(matches!(result, Err(DomainError::NotFound(_))));
    }

    #[tokio::test]
    async fn debit_reduces_balance() {
        let store = InMemoryWalletStore::new();
        let id = Uuid::new_v4();
        store.seed(test_wallet(id, 100.0));
        let wallet = store
            .apply_operation(id, WalletOperationType::Debit, Money { amount: 10.0, currency: Currency::AUD })
            .await
            .unwrap();
        assert!((wallet.balance.amount - 90.0).abs() < 0.001);
    }

    #[tokio::test]
    async fn debit_exceeding_balance_returns_wallet_limit_exceeded() {
        let store = InMemoryWalletStore::new();
        let id = Uuid::new_v4();
        store.seed(test_wallet(id, 5.0));
        let result = store
            .apply_operation(id, WalletOperationType::Debit, Money { amount: 10.0, currency: Currency::AUD })
            .await;
        assert!(matches!(result, Err(DomainError::WalletLimitExceeded)));
    }

    #[tokio::test]
    async fn credit_increases_balance() {
        let store = InMemoryWalletStore::new();
        let id = Uuid::new_v4();
        store.seed(test_wallet(id, 50.0));
        let wallet = store
            .apply_operation(id, WalletOperationType::Credit, Money { amount: 25.0, currency: Currency::AUD })
            .await
            .unwrap();
        assert!((wallet.balance.amount - 75.0).abs() < 0.001);
    }
}
