//! Event store: persist and list gameplay events (action + result) per session.

use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

/// Persisted gameplay event: one action and its result per session.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct GameplayEvent {
    pub event_id: Uuid,
    pub session_id: Uuid,
    pub action: JsonValue,
    pub result: JsonValue,
    #[serde(default)]
    pub timestamp: Option<DateTime<Utc>>,
    pub reward: Option<f64>,
}

/// Allowed action types for validation (must match OpenAPI GameplayAction.type).
const ALLOWED_ACTION_TYPES: &[&str] = &["PlaceBet", "Spin", "CashOut"];

/// Validates that action JSON has "type" in [PlaceBet, Spin, CashOut].
pub fn validate_action_type(action: &JsonValue) -> bool {
    action
        .get("type")
        .and_then(|v| v.as_str())
        .map(|s| ALLOWED_ACTION_TYPES.contains(&s))
        .unwrap_or(false)
}

/// Event store abstraction: insert and list by session.
pub trait EventStore: Send + Sync {
    /// Persist one event; returns error if validation fails or write fails.
    fn insert(&self, event: GameplayEvent) -> Result<()>;
    /// List events for a session, ordered by timestamp ascending.
    fn list_by_session(&self, session_id: Uuid) -> Result<Vec<GameplayEvent>>;
}

/// In-memory event store for tests and minimal scaffolding.
#[derive(Default)]
pub struct InMemoryEventStore {
    events: Arc<RwLock<Vec<GameplayEvent>>>,
}

impl InMemoryEventStore {
    pub fn new() -> Self {
        Self::default()
    }
}

impl EventStore for InMemoryEventStore {
    fn insert(&self, event: GameplayEvent) -> Result<()> {
        if !validate_action_type(&event.action) {
            anyhow::bail!("invalid action type");
        }
        self.events.write().map_err(|e| anyhow::anyhow!("lock: {}", e))?.push(event);
        Ok(())
    }

    fn list_by_session(&self, session_id: Uuid) -> Result<Vec<GameplayEvent>> {
        let events = self.events.read().map_err(|e| anyhow::anyhow!("lock: {}", e))?;
        let mut out: Vec<_> = events.iter().filter(|e| e.session_id == session_id).cloned().collect();
        out.sort_by(|a, b| {
            let ta = a.timestamp.map(|t| t.timestamp()).unwrap_or(0);
            let tb = b.timestamp.map(|t| t.timestamp()).unwrap_or(0);
            ta.cmp(&tb)
        });
        Ok(out)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validate_action_type_accepts_place_bet_spin_cash_out() {
        assert!(validate_action_type(&serde_json::json!({ "type": "PlaceBet", "amount": {} })));
        assert!(validate_action_type(&serde_json::json!({ "type": "Spin" })));
        assert!(validate_action_type(&serde_json::json!({ "type": "CashOut" })));
    }

    #[test]
    fn validate_action_type_rejects_missing_or_invalid() {
        assert!(!validate_action_type(&serde_json::json!({})));
        assert!(!validate_action_type(&serde_json::json!({ "type": "Invalid" })));
    }

    #[test]
    fn in_memory_insert_and_list() {
        let store = InMemoryEventStore::new();
        let sid = Uuid::new_v4();
        let e = GameplayEvent {
            event_id: Uuid::new_v4(),
            session_id: sid,
            action: serde_json::json!({ "type": "Spin" }),
            result: serde_json::json!({ "symbols": ["A","B","C"] }),
            timestamp: None,
            reward: None,
        };
        store.insert(e.clone()).unwrap();
        let list = store.list_by_session(sid).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0].event_id, e.event_id);
    }

    #[test]
    fn insert_invalid_action_fails() {
        let store = InMemoryEventStore::new();
        let e = GameplayEvent {
            event_id: Uuid::new_v4(),
            session_id: Uuid::new_v4(),
            action: serde_json::json!({ "type": "Bad" }),
            result: serde_json::json!({}),
            timestamp: None,
            reward: None,
        };
        assert!(store.insert(e).is_err());
    }
}
