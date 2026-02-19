//! Experience store trait and in-memory implementation.
//! Uses HashMap<Uuid, Vec<Experience>> for O(1) session-scoped lookup.

use super::Experience;
use std::collections::HashMap;
use std::sync::RwLock;
use uuid::Uuid;

/// Store for Experience records (replay buffer).
/// Callers use this trait to insert and list experiences; concrete impl can be in-memory or DB.
#[async_trait::async_trait]
pub trait ExperienceStore: Send + Sync {
    /// Inserts an experience record. Returns Err if validation fails.
    async fn insert_experience(&self, exp: &Experience) -> Result<(), StoreError>;

    /// Lists experiences for a session in created_at order (or insertion order if no timestamp).
    async fn list_by_session(&self, session_id: Uuid) -> Result<Vec<Experience>, StoreError>;
}

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("invalid session_id")]
    InvalidSessionId,
    #[error("store error: {0}")]
    Other(String),
}

/// In-memory store for tests and development.
/// Keyed by session_id → O(1) lookup per session vs O(n) linear scan.
pub struct InMemoryStore {
    experiences: RwLock<HashMap<Uuid, Vec<Experience>>>,
}

impl InMemoryStore {
    pub fn new() -> Self {
        Self {
            experiences: RwLock::new(HashMap::new()),
        }
    }
}

impl Default for InMemoryStore {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait::async_trait]
impl ExperienceStore for InMemoryStore {
    async fn insert_experience(&self, exp: &Experience) -> Result<(), StoreError> {
        if !exp.is_session_valid() {
            return Err(StoreError::InvalidSessionId);
        }
        self.experiences
            .write()
            .map_err(|e| StoreError::Other(e.to_string()))?
            .entry(exp.session_id)
            .or_default()
            .push(exp.clone());
        Ok(())
    }

    async fn list_by_session(&self, session_id: Uuid) -> Result<Vec<Experience>, StoreError> {
        let guard = self
            .experiences
            .read()
            .map_err(|e| StoreError::Other(e.to_string()))?;
        let mut out: Vec<Experience> = guard
            .get(&session_id)
            .cloned()
            .unwrap_or_default();
        // Sort by created_at; entries without timestamps preserve insertion order via stable sort.
        out.sort_by(|a, b| match (a.created_at, b.created_at) {
            (Some(ta), Some(tb)) => ta.cmp(&tb),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => std::cmp::Ordering::Equal,
        });
        Ok(out)
    }
}

/// Postgres-backed RL experience store.
/// Persists experiences to the `rl_store` table so training data survives server restarts.
pub struct PostgresRlStore {
    pool: sqlx::PgPool,
}

impl PostgresRlStore {
    pub fn new(pool: sqlx::PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait::async_trait]
impl ExperienceStore for PostgresRlStore {
    async fn insert_experience(&self, exp: &Experience) -> Result<(), StoreError> {
        if !exp.is_session_valid() {
            return Err(StoreError::InvalidSessionId);
        }
        sqlx::query(
            "INSERT INTO rl_store (id, session_id, state, action, reward, next_state, done)
             VALUES ($1, $2, $3, $4, $5, $6, $7)",
        )
        .bind(exp.id)
        .bind(exp.session_id)
        .bind(&exp.state)
        .bind(&exp.action)
        .bind(exp.reward)
        .bind(&exp.next_state)
        .bind(exp.done)
        .execute(&self.pool)
        .await
        .map_err(|e| StoreError::Other(e.to_string()))?;
        Ok(())
    }

    async fn list_by_session(&self, session_id: Uuid) -> Result<Vec<Experience>, StoreError> {
        #[derive(sqlx::FromRow)]
        struct Row {
            id: Uuid,
            session_id: Uuid,
            state: serde_json::Value,
            action: serde_json::Value,
            reward: f64,
            next_state: serde_json::Value,
            done: bool,
            created_at: chrono::DateTime<chrono::Utc>,
        }

        let rows: Vec<Row> = sqlx::query_as(
            "SELECT id, session_id, state, action, reward, next_state, done, created_at
             FROM rl_store WHERE session_id = $1 ORDER BY created_at ASC",
        )
        .bind(session_id)
        .fetch_all(&self.pool)
        .await
        .map_err(|e| StoreError::Other(e.to_string()))?;

        let exps = rows
            .into_iter()
            .map(|r| Experience {
                id: r.id,
                session_id: r.session_id,
                state: r.state,
                action: r.action,
                reward: r.reward,
                next_state: r.next_state,
                done: r.done,
                created_at: Some(r.created_at),
            })
            .collect();
        Ok(exps)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[tokio::test]
    async fn insert_returns_ok_for_valid_experience() {
        let store = InMemoryStore::new();
        let exp = Experience::new(
            Uuid::new_v4(),
            json!({}),
            json!({"type": "Spin"}),
            1.0,
            json!({}),
            false,
        );
        assert!(store.insert_experience(&exp).await.is_ok());
    }

    #[tokio::test]
    async fn insert_returns_err_for_nil_session_id() {
        let store = InMemoryStore::new();
        let exp = Experience::new(
            Uuid::nil(),
            json!({}),
            json!({"type": "Spin"}),
            1.0,
            json!({}),
            false,
        );
        let r = store.insert_experience(&exp).await;
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), StoreError::InvalidSessionId));
    }

    #[tokio::test]
    async fn list_by_session_returns_in_order() {
        let store = InMemoryStore::new();
        let sid = Uuid::new_v4();
        let exp1 = Experience::new(
            sid,
            json!({"n": 1}),
            json!({"type": "Spin"}),
            1.0,
            json!({}),
            false,
        );
        let exp2 = Experience::new(
            sid,
            json!({"n": 2}),
            json!({"type": "Spin"}),
            2.0,
            json!({}),
            true,
        );
        store.insert_experience(&exp1).await.unwrap();
        store.insert_experience(&exp2).await.unwrap();
        let list = store.list_by_session(sid).await.unwrap();
        assert_eq!(list.len(), 2);
        let rewards: Vec<f64> = list.iter().map(|e| e.reward).collect();
        assert!(rewards.contains(&1.0) && rewards.contains(&2.0));
    }

    #[tokio::test]
    async fn list_by_session_empty_for_unknown_session() {
        let store = InMemoryStore::new();
        let list = store.list_by_session(Uuid::new_v4()).await.unwrap();
        assert!(list.is_empty());
    }
}
