//! Pure state machine: Idle → Initialized → Probing → Playing → Evaluating → Completed.
//! All transitions return Result; invalid transitions yield StateError::InvalidTransition (no panic).

use serde::{Deserialize, Serialize};
use thiserror::Error;

/// Session state per OpenAPI GameState enum.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum GameState {
    Idle,
    Initialized,
    Probing,
    Playing,
    Evaluating,
    Completed,
}

/// State transition errors.
#[derive(Debug, Error, PartialEq)]
pub enum StateError {
    #[error("Invalid transition from {from:?} to {to:?}")]
    InvalidTransition { from: GameState, to: GameState },
    #[error("Session not found")]
    NotFound,
}

/// Allowed next states from each state (canonical machine).
const ALLOWED: &[(GameState, &[GameState])] = &[
    (GameState::Idle, &[GameState::Initialized]),
    (GameState::Initialized, &[GameState::Probing, GameState::Playing]),
    (GameState::Probing, &[GameState::Playing]),
    (GameState::Playing, &[GameState::Evaluating]),
    (GameState::Evaluating, &[GameState::Playing, GameState::Completed]),
    (GameState::Completed, &[]),
];

/// Checks if a transition from `from` to `to` is valid; returns Ok(to) or Err(StateError).
pub fn transition(from: GameState, to: GameState) -> Result<GameState, StateError> {
    if from == to {
        return Ok(to);
    }
    let allowed = ALLOWED
        .iter()
        .find(|(s, _)| *s == from)
        .map(|(_, next)| *next)
        .unwrap_or(&[]);
    if allowed.contains(&to) {
        Ok(to)
    } else {
        Err(StateError::InvalidTransition { from, to })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn idle_to_initialized_ok() {
        assert_eq!(
            transition(GameState::Idle, GameState::Initialized),
            Ok(GameState::Initialized)
        );
    }

    #[test]
    fn invalid_transition_returns_state_error() {
        let r = transition(GameState::Completed, GameState::Playing);
        assert!(matches!(r, Err(StateError::InvalidTransition { .. })));
    }

    #[test]
    fn same_state_ok() {
        assert_eq!(
            transition(GameState::Playing, GameState::Playing),
            Ok(GameState::Playing)
        );
    }

    #[test]
    fn initialized_to_playing_ok() {
        assert_eq!(
            transition(GameState::Initialized, GameState::Playing),
            Ok(GameState::Playing)
        );
    }
}