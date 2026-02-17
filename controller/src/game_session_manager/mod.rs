//! Session lifecycle: create, get, and state transitions.
//! Uses the SessionRepository trait; works with any backend.

use crate::api::{
    CreateSessionRequest, CreateSessionResponse, GameId, Session, SessionId, SessionMetrics,
};
use crate::app_state::{DomainError, SessionRepository};
use crate::state_engine::{transition, GameState, StateError};
use std::sync::Arc;
use tracing::info;
use uuid::Uuid;

/// Manages sessions and state transitions via the SessionRepository trait.
pub struct GameSessionManager {
    repo: Arc<dyn SessionRepository>,
}

impl GameSessionManager {
    pub fn new(repo: Arc<dyn SessionRepository>) -> Self {
        Self { repo }
    }

    /// Creates a session in Initialized state and persists it.
    pub async fn create_session(
        &self,
        req: CreateSessionRequest,
    ) -> Result<CreateSessionResponse, DomainError> {
        let session_id = SessionId(Uuid::new_v4());
        let session = Session {
            session_id,
            game_id: req.game_id,
            state: GameState::Initialized,
            metrics: SessionMetrics::default(),
        };
        self.repo.create(session).await?;
        info!(session_id = %session_id.0, "session created");
        Ok(CreateSessionResponse {
            session_id,
            state: GameState::Initialized,
        })
    }

    /// Returns session by id if present.
    pub async fn get_session(&self, session_id: SessionId) -> Result<Option<Session>, DomainError> {
        self.repo.get_by_id(session_id.0).await
    }

    /// Transitions session to `to_state` if valid; persists and logs.
    pub async fn transition_session(
        &self,
        session_id: SessionId,
        to_state: GameState,
    ) -> Result<Session, DomainError> {
        let current = self
            .repo
            .get_by_id(session_id.0)
            .await?
            .ok_or(DomainError::NotFound(session_id.0))?;

        let new_state = transition(current.state, to_state).map_err(|e| match e {
            StateError::InvalidTransition { from, .. } => DomainError::InvalidTransition { from },
            StateError::NotFound => DomainError::NotFound(session_id.0),
        })?;

        let updated = self.repo.update_state(session_id.0, new_state).await?;
        info!(
            session_id = %session_id.0,
            from = ?current.state,
            to = ?new_state,
            "state transition"
        );
        Ok(updated)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::PlayerProfile;
    use crate::persistence_metrics::InMemorySessionStore;

    fn make_manager() -> GameSessionManager {
        GameSessionManager::new(Arc::new(InMemorySessionStore::new()))
    }

    #[tokio::test]
    async fn create_session_returns_initialized() {
        let mgr = make_manager();
        let req = CreateSessionRequest {
            game_id: GameId(Uuid::new_v4()),
            player_profile: PlayerProfile {
                behavior_type: "conservative".to_string(),
                max_bet: None,
            },
        };
        let res = mgr.create_session(req).await.unwrap();
        assert_eq!(res.state, GameState::Initialized);
        let session = mgr.get_session(res.session_id).await.unwrap().unwrap();
        assert_eq!(session.state, GameState::Initialized);
    }

    #[tokio::test]
    async fn transition_session_valid() {
        let mgr = make_manager();
        let req = CreateSessionRequest {
            game_id: GameId(Uuid::new_v4()),
            player_profile: PlayerProfile {
                behavior_type: "aggressive".to_string(),
                max_bet: None,
            },
        };
        let res = mgr.create_session(req).await.unwrap();
        let updated = mgr
            .transition_session(res.session_id, GameState::Playing)
            .await
            .unwrap();
        assert_eq!(updated.state, GameState::Playing);
    }

    #[tokio::test]
    async fn transition_session_invalid_returns_error() {
        let mgr = make_manager();
        let req = CreateSessionRequest {
            game_id: GameId(Uuid::new_v4()),
            player_profile: PlayerProfile {
                behavior_type: "mixed".to_string(),
                max_bet: None,
            },
        };
        let res = mgr.create_session(req).await.unwrap();
        let r = mgr.transition_session(res.session_id, GameState::Completed).await;
        assert!(r.is_err());
    }
}
