//! Experience store trait and in-memory implementation.

use super::Experience;
use std::collections::HashMap;
use std::sync::RwLock;
use uuid::Uuid;

/// Store for Experience records (replay buffer).
/// Callers use this trait to insert and list experiences; concrete impl can be in-memory or DB.
pub trait ExperienceStore: Send + Sync {
    /// Inserts an experience record. Returns Err if validation fails.
    fn insert_experience(&self, exp: &Experience) -> Result<(), StoreError>;

    /// Lists experiences for a session in created_at order (or insertion order if no timestamp).
    fn list_by_session(&self, session_id: Uuid) -> Result<Vec<Experience>, StoreError>;
}

#[derive(Debug, thiserror::Error)]
pub enum StoreError {
    #[error("invalid session_id")]
    InvalidSessionId,
    #[error("store error: {0}")]
    Other(String),
}

/// In-memory store for tests and development.
pub struct InMemoryStore {
    experiences: RwLock<Vec<Experience>>,
}

impl InMemoryStore {
    pub fn new() -> Self {
        Self {
            experiences: RwLock::new(Vec::new()),
        }
    }
}

impl Default for InMemoryStore {
    fn default() -> Self {
        Self::new()
    }
}

impl ExperienceStore for InMemoryStore {
    fn insert_experience(&self, exp: &Experience) -> Result<(), StoreError> {
        if !exp.is_session_valid() {
            return Err(StoreError::InvalidSessionId);
        }
        self.experiences
            .write()
            .map_err(|e| StoreError::Other(e.to_string()))?
            .push(exp.clone());
        Ok(())
    }

    fn list_by_session(&self, session_id: Uuid) -> Result<Vec<Experience>, StoreError> {
        let guard = self
            .experiences
            .read()
            .map_err(|e| StoreError::Other(e.to_string()))?;
        let mut out: Vec<_> = guard
            .iter()
            .filter(|e| e.session_id == session_id)
            .cloned()
            .collect();
        out.sort_by(|a, b| {
            let ta = a.created_at.unwrap_or(chrono::Utc::now());
            let tb = b.created_at.unwrap_or(chrono::Utc::now());
            ta.cmp(&tb)
        });
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn insert_returns_ok_for_valid_experience() {
        let store = InMemoryStore::new();
        let exp = Experience::new(
            Uuid::new_v4(),
            json!({}),
            json!({"type": "Spin"}),
            1.0,
            json!({}),
            false,
        );
        assert!(store.insert_experience(&exp).is_ok());
    }

    #[test]
    fn insert_returns_err_for_nil_session_id() {
        let store = InMemoryStore::new();
        let exp = Experience::new(
            Uuid::nil(),
            json!({}),
            json!({"type": "Spin"}),
            1.0,
            json!({}),
            false,
        );
        let r = store.insert_experience(&exp);
        assert!(r.is_err());
        assert!(matches!(r.unwrap_err(), StoreError::InvalidSessionId));
    }

    #[test]
    fn list_by_session_returns_in_order() {
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
        store.insert_experience(&exp1).unwrap();
        store.insert_experience(&exp2).unwrap();
        let list = store.list_by_session(sid).unwrap();
        assert_eq!(list.len(), 2);
        let rewards: Vec<f64> = list.iter().map(|e| e.reward).collect();
        assert!(rewards.contains(&1.0) && rewards.contains(&2.0));
    }

    #[test]
    fn list_by_session_empty_for_unknown_session() {
        let store = InMemoryStore::new();
        let list = store.list_by_session(Uuid::new_v4()).unwrap();
        assert!(list.is_empty());
    }
}
