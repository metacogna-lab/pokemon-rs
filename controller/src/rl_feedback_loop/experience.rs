//! Experience record for RL replay buffer (DATASTORE §2.5).
//!
//! Represents (state, action, reward, next_state, done) per gameplay event.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

/// RL experience tuple for replay buffer.
/// Matches rl_store table schema.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Experience {
    pub id: Uuid,
    pub session_id: Uuid,
    pub state: Value,
    pub action: Value,
    pub reward: f64,
    pub next_state: Value,
    pub done: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl Experience {
    /// Builds Experience with generated id and no created_at (DB default).
    pub fn new(
        session_id: Uuid,
        state: Value,
        action: Value,
        reward: f64,
        next_state: Value,
        done: bool,
    ) -> Self {
        Self {
            id: Uuid::new_v4(),
            session_id,
            state,
            action,
            reward,
            next_state,
            done,
            created_at: None,
        }
    }

    /// Returns true if session_id is valid (not nil).
    pub fn is_session_valid(&self) -> bool {
        self.session_id != Uuid::nil()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn experience_serializes_to_row_shape() {
        let sid = Uuid::new_v4();
        let exp = Experience::new(
            sid,
            json!({"game_state": "Playing"}),
            json!({"type": "Spin"}),
            5.4,
            json!({"game_state": "Playing"}),
            false,
        );
        assert_eq!(exp.session_id, sid);
        assert!(exp.id != Uuid::nil());
        assert_eq!(exp.reward, 5.4);
        assert!(!exp.done);
        let j = serde_json::to_value(&exp).unwrap();
        assert!(j.get("state").is_some());
        assert!(j.get("action").is_some());
        assert!(j.get("next_state").is_some());
    }

    #[test]
    fn is_session_valid_rejects_nil() {
        let exp = Experience::new(
            Uuid::nil(),
            json!({}),
            json!({"type": "Spin"}),
            0.0,
            json!({}),
            false,
        );
        assert!(!exp.is_session_valid());
    }

    #[test]
    fn is_session_valid_accepts_valid_uuid() {
        let sid = Uuid::new_v4();
        let exp = Experience::new(
            sid,
            json!({}),
            json!({"type": "Spin"}),
            0.0,
            json!({}),
            false,
        );
        assert!(exp.is_session_valid());
    }
}
