//! HTTP server and routes; mounts /v1, logging, and auth.

use axum::{
    extract::{Path, Request, State},
    http::StatusCode,
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use controller::api::{
    CreateSessionRequest, CreateSessionResponse, ErrorResponse, HealthResponse, Session,
    SessionId, WalletOperationRequest, WalletOperationResponse,
};
use controller::app_state::{AppState as ControllerAppState, DomainError};
use controller::game_session_manager::GameSessionManager;
use controller::persistence_metrics::{InMemorySessionStore, InMemoryWalletStore};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::trace::TraceLayer;
use tracing::info;
use uuid::Uuid;

/// Builds the v1 API router with health, sessions, and middleware.
pub fn app(state: ControllerAppState) -> Router {
    Router::new()
        .route("/health", get(health_handler))
        .route("/sessions", post(create_session_handler))
        .route("/sessions/:session_id", get(get_session_handler))
        .route("/wallets/:wallet_id/operations", post(wallet_operations_handler))
        .layer(TraceLayer::new_for_http())
        .route_layer(middleware::from_fn(auth_middleware))
        .with_state(state)
}

/// GET /v1/health — returns { "status": "healthy" } per OpenAPI.
async fn health_handler() -> Json<HealthResponse> {
    Json(HealthResponse::healthy())
}

/// POST /v1/sessions — create session; returns 201 CreateSessionResponse.
async fn create_session_handler(
    State(state): State<ControllerAppState>,
    Json(req): Json<CreateSessionRequest>,
) -> Response {
    let mgr = GameSessionManager::new(Arc::clone(&state.session_repo));
    match mgr.create_session(req).await {
        Ok(res) => (StatusCode::CREATED, Json(res)).into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::internal_error(e.to_string())),
        )
            .into_response(),
    }
}

/// GET /v1/sessions/:session_id — returns 200 Session or 404.
async fn get_session_handler(
    State(state): State<ControllerAppState>,
    Path(session_id): Path<Uuid>,
) -> Response {
    let id = SessionId(session_id);
    let mgr = GameSessionManager::new(Arc::clone(&state.session_repo));
    match mgr.get_session(id).await {
        Ok(Some(session)) => Json(session).into_response(),
        Ok(None) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::not_found("Session not found")),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::internal_error(e.to_string())),
        )
            .into_response(),
    }
}

/// POST /v1/wallets/:wallet_id/operations — debit or credit; returns 200 Wallet or 402 WALLET_LIMIT_EXCEEDED.
async fn wallet_operations_handler(
    State(state): State<ControllerAppState>,
    Path(wallet_id): Path<Uuid>,
    Json(req): Json<WalletOperationRequest>,
) -> Response {
    match state
        .wallet_repo
        .apply_operation(wallet_id, req.operation, req.amount)
        .await
    {
        Ok(wallet) => Json(WalletOperationResponse { wallet }).into_response(),
        Err(DomainError::WalletLimitExceeded) => (
            StatusCode::PAYMENT_REQUIRED,
            Json(ErrorResponse::wallet_limit_exceeded(
                "Balance or daily limit exceeded",
            )),
        )
            .into_response(),
        Err(DomainError::NotFound(_)) => (
            StatusCode::NOT_FOUND,
            Json(ErrorResponse::not_found("Wallet not found")),
        )
            .into_response(),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse::internal_error(e.to_string())),
        )
            .into_response(),
    }
}

/// Auth middleware: requires Authorization: Bearer <token>; returns 401 with ErrorResponse otherwise.
async fn auth_middleware(request: Request, next: Next) -> Response {
    let auth = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok());
    let valid = match auth {
        Some(h) if h.starts_with("Bearer ") && h.len() > 7 => {
            let token = h["Bearer ".len()..].trim();
            !token.is_empty()
        }
        _ => false,
    };
    if !valid {
        return (
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse::unauthorized("Missing or invalid Authorization")),
        )
            .into_response();
    }
    next.run(request).await
}

/// Builds the full v1 app with default in-memory state (for tests).
pub fn v1_app() -> Router {
    let state = ControllerAppState::new(
        Arc::new(InMemorySessionStore::new()),
        Arc::new(InMemoryWalletStore::new()),
        None,
    );
    Router::new().nest("/v1", app(state))
}

/// Serves the API; call with state from main (repos + api_keys).
pub async fn serve(
    addr: SocketAddr,
    state: ControllerAppState,
) -> Result<(), std::io::Error> {
    let app = Router::new().nest("/v1", app(state));
    info!(%addr, "listening");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use http::Request;
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    #[tokio::test]
    async fn health_returns_200_and_healthy_json() {
        let app = v1_app();
        let req = Request::get("http://localhost/v1/health")
            .header("Authorization", "Bearer test-token")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let body = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json.get("status").and_then(|v| v.as_str()), Some("healthy"));
    }

    #[tokio::test]
    async fn auth_rejects_missing_authorization_with_401() {
        let app = v1_app();
        let req = Request::get("http://localhost/v1/health")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
        let body = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        let err = json.get("error").expect("error body");
        assert_eq!(err.get("code").and_then(|v| v.as_str()), Some("UNAUTHORIZED"));
    }

    #[tokio::test]
    async fn auth_accepts_valid_bearer_token() {
        let app = v1_app();
        let req = Request::get("http://localhost/v1/health")
            .header("Authorization", "Bearer valid-token")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn create_session_returns_201_and_session_id() {
        let create_body = serde_json::json!({
            "gameId": "00000000-0000-4000-8000-000000000001",
            "playerProfile": { "behaviorType": "conservative" }
        });
        let req = Request::post("http://localhost/v1/sessions")
            .header("Authorization", "Bearer test-token")
            .header("Content-Type", "application/json")
            .body(Body::from(create_body.to_string()))
            .unwrap();
        let app = v1_app();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        let body = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert!(json.get("sessionId").is_some());
        assert_eq!(json.get("state").and_then(|v| v.as_str()), Some("Initialized"));
    }
}
