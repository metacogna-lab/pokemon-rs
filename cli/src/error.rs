//! Local HTTP error wrapper: converts DomainError → (StatusCode, JSON) via IntoResponse.

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use controller::api::{ErrorCode, ErrorResponse};
use controller::app_state::DomainError;

/// Newtype wrapper satisfying Axum's orphan rule: neither DomainError nor IntoResponse
/// is defined here, so we cannot impl IntoResponse for DomainError directly.
pub struct HttpError(pub DomainError);

impl From<DomainError> for HttpError {
    fn from(e: DomainError) -> Self {
        Self(e)
    }
}

impl IntoResponse for HttpError {
    fn into_response(self) -> Response {
        let (status, body) = match &self.0 {
            DomainError::NotFound(_) => (StatusCode::NOT_FOUND, ErrorResponse::not_found(self.0.to_string())),
            DomainError::InvalidTransition { .. } => (StatusCode::CONFLICT, ErrorResponse::state_error(self.0.to_string())),
            DomainError::WalletLimitExceeded => (StatusCode::PAYMENT_REQUIRED, ErrorResponse::wallet_limit_exceeded(self.0.to_string())),
            DomainError::InvalidInput(_) => (StatusCode::BAD_REQUEST, ErrorResponse::invalid_input(self.0.to_string())),
            DomainError::RateLimitExceeded => (StatusCode::TOO_MANY_REQUESTS, ErrorResponse::from_code(ErrorCode::RateLimit, self.0.to_string())),
            DomainError::Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, ErrorResponse::internal_error(self.0.to_string())),
        };
        (status, Json(body)).into_response()
    }
}
