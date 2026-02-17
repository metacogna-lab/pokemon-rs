//! Shared API request/response types aligned with openapi.yaml.

use crate::state_engine::GameState;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Session identifier (UUID).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct SessionId(pub Uuid);

impl std::fmt::Display for SessionId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Game identifier (UUID).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(transparent)]
pub struct GameId(pub Uuid);

impl std::fmt::Display for GameId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

/// Currency per OpenAPI (variant names serialize as "AUD", "USD", "EUR").
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Currency {
    AUD,
    USD,
    EUR,
}

/// Money per OpenAPI (amount + currency).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Money {
    pub amount: f64,
    pub currency: Currency,
}

/// Wallet per OpenAPI.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Wallet {
    pub wallet_id: SessionId,
    pub balance: Money,
    pub daily_limit: Money,
    pub daily_spent: Money,
}

/// Session metrics per OpenAPI SessionMetrics.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SessionMetrics {
    pub total_spins: u64,
    pub total_payout: f64,
}

/// Session per OpenAPI Session.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Session {
    pub session_id: SessionId,
    pub game_id: GameId,
    pub state: GameState,
    pub metrics: SessionMetrics,
}

/// Player profile per OpenAPI PlayerProfile.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerProfile {
    pub behavior_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_bet: Option<Money>,
}

/// Create session request per OpenAPI CreateSessionRequest.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionRequest {
    pub game_id: GameId,
    pub player_profile: PlayerProfile,
}

/// Create session response per OpenAPI CreateSessionResponse.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSessionResponse {
    pub session_id: SessionId,
    pub state: GameState,
}

/// Gameplay action type.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "PascalCase")]
pub enum GameplayActionType {
    PlaceBet,
    Spin,
    CashOut,
}

/// Gameplay action (discriminated on `type`).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameplayAction {
    #[serde(rename = "type")]
    pub action_type: GameplayActionType,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub amount: Option<Money>,
}

/// Gameplay result returned by the simulator.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameplayResult {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub payout: Option<Money>,
    #[serde(default)]
    pub symbols: Vec<String>,
}

/// Play action request per OpenAPI PlayActionRequest.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayActionRequest {
    pub action: GameplayAction,
}

/// Play action response per OpenAPI PlayActionResponse.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayActionResponse {
    pub session: Session,
    pub result: GameplayResult,
}

/// Wallet operation type.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum WalletOperationType {
    Debit,
    Credit,
}

/// Wallet operation request.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WalletOperationRequest {
    pub operation: WalletOperationType,
    pub amount: Money,
}

/// Wallet operation response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletOperationResponse {
    pub wallet: Wallet,
}

/// Health check response; GET /v1/health.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
}

impl HealthResponse {
    /// Healthy status per OpenAPI example.
    pub fn healthy() -> Self {
        Self {
            status: "healthy".to_string(),
        }
    }
}

/// Standard error codes per the API contract.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum ErrorCode {
    InvalidInput,
    NotFound,
    StateError,
    WalletLimitExceeded,
    RateLimit,
    InternalError,
    Unauthorized,
}

impl std::fmt::Display for ErrorCode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            ErrorCode::InvalidInput => "INVALID_INPUT",
            ErrorCode::NotFound => "NOT_FOUND",
            ErrorCode::StateError => "STATE_ERROR",
            ErrorCode::WalletLimitExceeded => "WALLET_LIMIT_EXCEEDED",
            ErrorCode::RateLimit => "RATE_LIMIT",
            ErrorCode::InternalError => "INTERNAL_ERROR",
            ErrorCode::Unauthorized => "UNAUTHORIZED",
        };
        f.write_str(s)
    }
}

/// API error body per openapi.yaml ErrorResponse.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorResponse {
    pub error: ErrorDetail,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorDetail {
    pub code: String,
    pub message: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<serde_json::Value>,
}

impl ErrorResponse {
    pub fn from_code(code: ErrorCode, message: impl Into<String>) -> Self {
        Self {
            error: ErrorDetail {
                code: code.to_string(),
                message: message.into(),
                details: None,
            },
        }
    }

    /// Unauthorized (401).
    pub fn unauthorized(message: impl Into<String>) -> Self {
        Self::from_code(ErrorCode::Unauthorized, message)
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::from_code(ErrorCode::NotFound, message)
    }

    pub fn state_error(message: impl Into<String>) -> Self {
        Self::from_code(ErrorCode::StateError, message)
    }

    pub fn invalid_input(message: impl Into<String>) -> Self {
        Self::from_code(ErrorCode::InvalidInput, message)
    }

    pub fn wallet_limit_exceeded(message: impl Into<String>) -> Self {
        Self::from_code(ErrorCode::WalletLimitExceeded, message)
    }

    pub fn internal_error(message: impl Into<String>) -> Self {
        Self::from_code(ErrorCode::InternalError, message)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn health_response_serializes_to_openapi_shape() {
        let h = HealthResponse::healthy();
        let j = serde_json::to_string(&h).unwrap();
        assert_eq!(j, r#"{"status":"healthy"}"#);
    }

    #[test]
    fn error_response_has_code_and_message() {
        let e = ErrorResponse::unauthorized("bad token");
        assert_eq!(e.error.code, "UNAUTHORIZED");
        assert_eq!(e.error.message, "bad token");
        assert!(e.error.details.is_none());
    }

    #[test]
    fn error_code_display() {
        assert_eq!(ErrorCode::WalletLimitExceeded.to_string(), "WALLET_LIMIT_EXCEEDED");
        assert_eq!(ErrorCode::NotFound.to_string(), "NOT_FOUND");
    }

    #[test]
    fn from_code_builds_error_response() {
        let e = ErrorResponse::from_code(ErrorCode::StateError, "bad state");
        assert_eq!(e.error.code, "STATE_ERROR");
    }

    #[test]
    fn gameplay_action_type_serializes() {
        let a = GameplayAction {
            action_type: GameplayActionType::Spin,
            amount: None,
        };
        let j = serde_json::to_string(&a).unwrap();
        assert!(j.contains("\"type\":\"Spin\"") || j.contains("\"type\": \"Spin\""));
    }

    #[test]
    fn currency_serializes_screaming_snake() {
        let m = Money { amount: 5.0, currency: Currency::AUD };
        let j = serde_json::to_string(&m).unwrap();
        assert!(j.contains("AUD"), "expected AUD in {}", j);
    }
}
