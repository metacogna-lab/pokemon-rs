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
    CreateSessionRequest, CreateSessionResponse, ErrorResponse, HealthResponse, Session, SessionId,
    WalletOperationRequest, WalletOperationResponse,
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
    let state_clone = state.clone();
    Router::new()
        .route("/health", get(health_handler))
        .route("/sessions", post(create_session_handler))
        .route("/sessions/:session_id", get(get_session_handler))
        .route("/wallets/:wallet_id/operations", post(wallet_operations_handler))
        .layer(TraceLayer::new_for_http())
        .route_layer(middleware::from_fn_with_state(state_clone, auth_middleware))
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
/// When api_keys is non-empty, token must be in the set; when empty (dev mode), any non-empty Bearer is accepted.
async fn auth_middleware(
    State(state): State<ControllerAppState>,
    request: Request,
    next: Next,
) -> Response {
    let auth = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok());
    let token = match auth {
        Some(h) if h.starts_with("Bearer ") && h.len() > 7 => h["Bearer ".len()..].trim(),
        _ => "",
    };
    let valid = if token.is_empty() {
        false
    } else if state.api_keys.is_empty() {
        true
    } else {
        state.api_keys.contains(token)
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
#[allow(dead_code)]
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

    /// Integration: create session then get by id — verifies session manager + persistence round-trip.
    #[tokio::test]
    async fn create_then_get_session_roundtrip() {
        let app = v1_app();
        let create_body = serde_json::json!({
            "gameId": "00000000-0000-4000-8000-000000000002",
            "playerProfile": { "behaviorType": "aggressive" }
        });
        let create_req = Request::post("http://localhost/v1/sessions")
            .header("Authorization", "Bearer test-token")
            .header("Content-Type", "application/json")
            .body(Body::from(create_body.to_string()))
            .unwrap();
        let create_res = app.clone().oneshot(create_req).await.unwrap();
        assert_eq!(create_res.status(), StatusCode::CREATED);
        let body = create_res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&body).unwrap();
        let session_id = json.get("sessionId").and_then(|v| v.as_str()).unwrap();

        let get_req = Request::get(format!("http://localhost/v1/sessions/{}", session_id))
            .header("Authorization", "Bearer test-token")
            .body(Body::empty())
            .unwrap();
        let get_res = app.oneshot(get_req).await.unwrap();
        assert_eq!(get_res.status(), StatusCode::OK);
        let body = get_res.into_body().collect().await.unwrap().to_bytes();
        let session: serde_json::Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(session.get("sessionId").and_then(|v| v.as_str()), Some(session_id));
        assert_eq!(session.get("state").and_then(|v| v.as_str()), Some("Initialized"));
    }

    #[tokio::test]
    async fn get_session_returns_404_for_unknown_id() {
        let req = Request::get("http://localhost/v1/sessions/00000000-0000-4000-8000-000000000099")
            .header("Authorization", "Bearer test-token")
            .body(Body::empty())
            .unwrap();
        let app = v1_app();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn wallet_operations_returns_402_on_limit_exceeded() {
        use controller::persistence_metrics::{test_wallet, InMemorySessionStore, InMemoryWalletStore};

        let wallet_id = uuid::Uuid::new_v4();
        let wallet_store = Arc::new(InMemoryWalletStore::new());
        wallet_store.seed(test_wallet(wallet_id, 5.0));
        let state = ControllerAppState::new(
            Arc::new(InMemorySessionStore::new()),
            wallet_store,
            None,
        );
        let app = Router::new().nest("/v1", super::app(state));

        let body = serde_json::json!({
            "operation": "debit",
            "amount": { "amount": 10.0, "currency": "AUD" }
        });
        let req = Request::post(format!("http://localhost/v1/wallets/{}/operations", wallet_id))
            .header("Authorization", "Bearer test-token")
            .header("Content-Type", "application/json")
            .body(Body::from(body.to_string()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::PAYMENT_REQUIRED);
        let resp_body = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&resp_body).unwrap();
        assert_eq!(
            json.get("error").and_then(|e| e.get("code")).and_then(|c| c.as_str()),
            Some("WALLET_LIMIT_EXCEEDED")
        );
    }

    #[tokio::test]
    async fn wallet_operations_returns_200_on_successful_debit() {
        use controller::persistence_metrics::{test_wallet, InMemorySessionStore, InMemoryWalletStore};

        let wallet_id = uuid::Uuid::new_v4();
        let wallet_store = Arc::new(InMemoryWalletStore::new());
        wallet_store.seed(test_wallet(wallet_id, 100.0));
        let state = ControllerAppState::new(
            Arc::new(InMemorySessionStore::new()),
            wallet_store,
            None,
        );
        let app = Router::new().nest("/v1", super::app(state));

        let body = serde_json::json!({
            "operation": "debit",
            "amount": { "amount": 10.0, "currency": "AUD" }
        });
        let req = Request::post(format!("http://localhost/v1/wallets/{}/operations", wallet_id))
            .header("Authorization", "Bearer test-token")
            .header("Content-Type", "application/json")
            .body(Body::from(body.to_string()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let resp_body = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&resp_body).unwrap();
        let balance = json.get("wallet").and_then(|w| w.get("balance")).and_then(|b| b.get("amount")).and_then(|a| a.as_f64()).unwrap();
        assert!((balance - 90.0).abs() < 0.001);
    }
}
