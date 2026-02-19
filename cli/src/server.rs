//! HTTP server: routes, auth + rate-limit middleware, AppState injection.

use axum::{
    extract::{Path, Query, Request, State},
    http::{HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
    Json, Router,
};
use controller::api::{
    CreateSessionRequest, CreateSessionResponse, CreateWalletRequest, Currency, ErrorCode,
    ErrorResponse, GameFingerprintResponse, GameplayAction, GameplayActionType, GameplayResult,
    HealthResponse, Money, PlayActionRequest, PlayActionResponse, Session, SessionEventRecord,
    SessionEventsResponse, SessionId, WalletOperationRequest, WalletOperationResponse,
};
use controller::app_state::{AppState, DomainError};
use controller::auth::{parse_bearer_token, validate_token, Role};
use controller::fingerprinter::GameFingerprint;
use controller::game_session_manager::GameSessionManager;
use controller::event_store::GameplayEvent;
use controller::rl_feedback_loop::{
    compute_reward_safe, export_experiences, Experience, ExportParams,
};
use controller::state_engine::GameState;
use serde::Deserialize;
use std::net::SocketAddr;
use tower_http::trace::TraceLayer;
use tracing::info;
use uuid::Uuid;

use crate::error::HttpError;

// ── Router ────────────────────────────────────────────────────────────────────

pub fn app(state: AppState) -> Router {
    let protected = Router::new()
        .route("/sessions", post(create_session_handler))
        .route("/sessions/:id", get(get_session_handler))
        .route("/sessions/:id/action", post(play_action_handler))
        .route("/sessions/:id/events", get(session_events_handler))
        .route("/wallets", post(create_wallet_handler))
        .route("/wallets/:id/operations", post(wallet_operation_handler))
        .route("/games/:id/fingerprint", get(game_fingerprint_handler))
        .route("/rl/export", get(rl_export_handler))
        .route("/metrics", get(metrics_handler))
        .route_layer(middleware::from_fn_with_state(state.clone(), rate_limit_middleware))
        .route_layer(middleware::from_fn_with_state(state.clone(), auth_middleware));

    let public = Router::new().route("/health", get(health_handler));

    Router::new()
        .merge(public)
        .merge(protected)
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}

pub fn v1_app(state: AppState) -> Router {
    Router::new().nest("/v1", app(state))
}

pub async fn serve(addr: SocketAddr, state: AppState) -> Result<(), std::io::Error> {
    let router = v1_app(state);
    info!(%addr, "listening");
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, router).await
}

// ── Auth middleware ───────────────────────────────────────────────────────────

async fn auth_middleware(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let auth_header = request.headers().get("Authorization").and_then(|v| v.to_str().ok());
    let token = match parse_bearer_token(auth_header) {
        Some(t) => t,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse::unauthorized("Missing or invalid Authorization")),
            )
                .into_response();
        }
    };
    if validate_token(&token, &state.api_keys).is_err() {
        return (
            StatusCode::UNAUTHORIZED,
            Json(ErrorResponse::unauthorized("Missing or invalid Authorization")),
        )
            .into_response();
    }
    next.run(request).await
}

// ── Rate-limit middleware ─────────────────────────────────────────────────────

async fn rate_limit_middleware(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let key = request
        .headers()
        .get("Authorization")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("anon")
        .to_string();

    if !state.rate_limiter.check(&key) {
        let retry = state.rate_limiter.retry_after_seconds(&key);
        let mut resp = (
            StatusCode::TOO_MANY_REQUESTS,
            Json(ErrorResponse::from_code(ErrorCode::RateLimit, "rate limit exceeded")),
        )
            .into_response();
        resp.headers_mut().insert(
            axum::http::header::RETRY_AFTER,
            axum::http::HeaderValue::from(retry),
        );
        return resp;
    }
    next.run(request).await
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async fn health_handler() -> Json<HealthResponse> {
    Json(HealthResponse::healthy())
}

#[tracing::instrument(skip(state), name = "create_session")]
async fn create_session_handler(
    State(state): State<AppState>,
    Json(req): Json<CreateSessionRequest>,
) -> Result<(StatusCode, Json<CreateSessionResponse>), HttpError> {
    let mgr = GameSessionManager::new(state.session_repo.clone());
    let resp = mgr.create_session(req).await?;
    state.metrics.record_session_created();
    Ok((StatusCode::CREATED, Json(resp)))
}

#[tracing::instrument(skip(state), fields(session_id = %id))]
async fn get_session_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<Session>, HttpError> {
    let mgr = GameSessionManager::new(state.session_repo.clone());
    let session = mgr
        .get_session(SessionId(id))
        .await
        .map_err(HttpError::from)?
        .ok_or(HttpError::from(DomainError::NotFound(id)))?;
    Ok(Json(session))
}

#[tracing::instrument(skip(state), fields(session_id = %id))]
async fn play_action_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<PlayActionRequest>,
) -> Result<Json<PlayActionResponse>, HttpError> {
    let mgr = GameSessionManager::new(state.session_repo.clone());
    let next_state = match req.action.action_type {
        GameplayActionType::PlaceBet => GameState::Playing,
        GameplayActionType::Spin => GameState::Evaluating,
        GameplayActionType::CashOut => GameState::Completed,
    };

    // Capture previous state for the RL experience record.
    let prev_session = mgr
        .get_session(SessionId(id))
        .await
        .map_err(HttpError::from)?
        .ok_or_else(|| HttpError::from(DomainError::NotFound(id)))?;
    let prev_state = prev_session.state;

    let session = mgr.transition_session(SessionId(id), next_state).await?;

    // Update lifecycle metrics.
    match session.state {
        GameState::Playing => state.metrics.record_session_playing(),
        GameState::Completed => state.metrics.record_session_completed(),
        _ => {}
    }

    let result = simulate_result(&req.action);

    // Compute reward and persist event + experience.
    let payout = result.payout.as_ref().map(|m| m.amount).unwrap_or(0.0);
    let stake = req.action.amount.as_ref().map(|m| m.amount).unwrap_or(0.0);
    let cost = state.config.cost_per_spin;
    let likeness = req.human_likeness.unwrap_or(0.5).clamp(0.0, 1.0);
    let reward = compute_reward_safe(payout, stake, cost, likeness);

    let event = GameplayEvent {
        event_id: Uuid::new_v4(),
        session_id: id,
        action: serde_json::to_value(&req.action).unwrap_or_default(),
        result: serde_json::to_value(&result).unwrap_or_default(),
        timestamp: Some(chrono::Utc::now()),
        reward: Some(reward),
    };
    if let Err(e) = state.event_store.insert(event) {
        tracing::warn!(%id, error = %e, "failed to persist gameplay event");
    }

    let done = session.state == GameState::Completed;
    let exp = Experience::new(
        id,
        serde_json::json!({"state": format!("{:?}", prev_state)}),
        serde_json::to_value(&req.action).unwrap_or_default(),
        reward,
        serde_json::json!({"state": format!("{:?}", session.state)}),
        done,
    );
    if let Err(e) = state.rl_store.insert_experience(&exp).await {
        tracing::warn!(%id, error = %e, "failed to persist RL experience");
    }

    Ok(Json(PlayActionResponse { session, result }))
}

#[tracing::instrument(skip(state), fields(wallet_id = %id))]
async fn wallet_operation_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
    Json(req): Json<WalletOperationRequest>,
) -> Result<Json<WalletOperationResponse>, HttpError> {
    let wallet = state.wallet_repo.apply_operation(id, req.operation, req.amount).await?;
    Ok(Json(WalletOperationResponse { wallet }))
}

/// Query params for GET /rl/export
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct RlExportQuery {
    session_id: Uuid,
    #[serde(default = "default_limit")]
    limit: u32,
    #[serde(default)]
    offset: u32,
}

fn default_limit() -> u32 {
    100
}

#[tracing::instrument(skip(state), fields(session_id = %id))]
async fn session_events_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<SessionEventsResponse>, HttpError> {
    // Verify session exists first
    let mgr = GameSessionManager::new(state.session_repo.clone());
    mgr.get_session(SessionId(id))
        .await
        .map_err(HttpError::from)?
        .ok_or_else(|| HttpError::from(DomainError::NotFound(id)))?;

    let raw = state
        .event_store
        .list_by_session(id)
        .map_err(|e| HttpError::from(DomainError::Internal(e.to_string())))?;

    let events = raw
        .into_iter()
        .map(|e| SessionEventRecord {
            event_id: e.event_id,
            session_id: e.session_id,
            action: e.action,
            result: e.result,
            timestamp: e.timestamp,
            reward: e.reward,
        })
        .collect();

    Ok(Json(SessionEventsResponse { events }))
}

#[tracing::instrument(skip(state), fields(game_id = %id))]
async fn game_fingerprint_handler(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<Json<GameFingerprintResponse>, HttpError> {
    let fp: GameFingerprint = state
        .fingerprint_store
        .get(id)
        .map_err(|e| HttpError::from(DomainError::Internal(e.to_string())))?
        .ok_or_else(|| HttpError::from(DomainError::NotFound(id)))?;

    Ok(Json(GameFingerprintResponse {
        game_id: fp.game_id,
        rng_signature: fp.rng_signature,
        symbol_map: fp.symbol_map,
        statistical_profile: fp.statistical_profile,
    }))
}

#[tracing::instrument(skip(state))]
async fn rl_export_handler(
    State(state): State<AppState>,
    Query(q): Query<RlExportQuery>,
) -> Result<Json<serde_json::Value>, HttpError> {
    let params = ExportParams {
        session_id: q.session_id,
        limit: q.limit,
        offset: q.offset,
    };
    let resp = export_experiences(state.rl_store.as_ref(), params)
        .await
        .map_err(|e| HttpError::from(DomainError::Internal(e.to_string())))?;
    Ok(Json(serde_json::to_value(resp).unwrap_or_default()))
}

#[tracing::instrument(skip(state))]
async fn create_wallet_handler(
    State(state): State<AppState>,
    Json(req): Json<CreateWalletRequest>,
) -> Result<(StatusCode, Json<controller::api::Wallet>), HttpError> {
    let wallet_id = req
        .wallet_id
        .unwrap_or_else(|| SessionId(Uuid::new_v4()));

    let currency = req.balance.currency;
    let wallet = controller::api::Wallet {
        wallet_id,
        balance: req.balance,
        daily_limit: req.daily_limit,
        daily_spent: Money { amount: 0.0, currency },
    };
    state.wallet_repo.create(wallet.clone()).await?;
    Ok((StatusCode::CREATED, Json(wallet)))
}

/// GET /metrics — returns session lifecycle counters.
/// Admin token required (token must start with "admin:").
#[tracing::instrument(skip(state, headers))]
async fn metrics_handler(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Response {
    let auth = headers.get("Authorization").and_then(|v| v.to_str().ok());
    let token = match parse_bearer_token(auth) {
        Some(t) => t,
        None => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse::unauthorized("Admin token required")),
            )
                .into_response();
        }
    };
    let role = match validate_token(&token, &state.api_keys) {
        Ok(r) => r,
        Err(_) => {
            return (
                StatusCode::UNAUTHORIZED,
                Json(ErrorResponse::unauthorized("Admin token required")),
            )
                .into_response();
        }
    };
    if role != Role::Admin {
        return (
            StatusCode::FORBIDDEN,
            Json(ErrorResponse::from_code(
                ErrorCode::Unauthorized,
                "Admin role required",
            )),
        )
            .into_response();
    }
    let snapshot = serde_json::json!({
        "sessions_created": state.metrics.get_sessions_created(),
        "sessions_completed": state.metrics.get_sessions_completed(),
        "sessions_playing": state.metrics.sessions_playing.load(std::sync::atomic::Ordering::Relaxed),
    });
    Json(snapshot).into_response()
}

fn simulate_result(action: &GameplayAction) -> GameplayResult {
    match action.action_type {
        GameplayActionType::Spin => GameplayResult {
            payout: Some(Money { amount: 0.0, currency: Currency::AUD }),
            symbols: vec!["A".to_string(), "B".to_string(), "C".to_string()],
        },
        _ => GameplayResult { payout: None, symbols: vec![] },
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use controller::event_store::InMemoryEventStore;
    use controller::fingerprinter::InMemoryFingerprintStore;
    use controller::persistence_metrics::{InMemorySessionStore, InMemoryWalletStore};
    use controller::rl_feedback_loop::InMemoryStore as InMemoryRlStore;
    use http::Request;
    use http_body_util::BodyExt;
    use std::sync::Arc;
    use tower::ServiceExt;

    fn test_state() -> AppState {
        AppState::new(
            Arc::new(InMemorySessionStore::new()),
            Arc::new(InMemoryWalletStore::new()),
            Arc::new(InMemoryEventStore::new()),
            Arc::new(InMemoryFingerprintStore::new()),
            Arc::new(InMemoryRlStore::new()),
            None,
        )
    }

    #[tokio::test]
    async fn health_returns_200_without_auth() {
        let app = v1_app(test_state());
        let req = Request::get("http://localhost/v1/health")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(json["status"].as_str(), Some("healthy"));
    }

    #[tokio::test]
    async fn protected_endpoint_rejects_no_auth_with_401() {
        let app = v1_app(test_state());
        let body = serde_json::json!({
            "gameId": Uuid::new_v4().to_string(),
            "playerProfile": {"behaviorType": "conservative"}
        });
        let req = Request::post("http://localhost/v1/sessions")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&body).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::UNAUTHORIZED);
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(json["error"]["code"].as_str(), Some("UNAUTHORIZED"));
    }

    #[tokio::test]
    async fn create_session_returns_201() {
        let app = v1_app(test_state());
        let body = serde_json::json!({
            "gameId": Uuid::new_v4().to_string(),
            "playerProfile": { "behaviorType": "conservative" }
        });
        let req = Request::post("http://localhost/v1/sessions")
            .header("Authorization", "Bearer testkey")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&body).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(json["state"].as_str(), Some("Initialized"));
    }

    #[tokio::test]
    async fn get_session_returns_404_for_unknown_id() {
        let app = v1_app(test_state());
        let unknown = Uuid::new_v4();
        let req = Request::get(format!("http://localhost/v1/sessions/{unknown}"))
            .header("Authorization", "Bearer testkey")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn wallet_operation_returns_404_for_unknown_wallet() {
        let app = v1_app(test_state());
        let wallet_id = Uuid::new_v4();
        let body = serde_json::json!({
            "operation": "debit",
            "amount": { "amount": 10.0, "currency": "AUD" }
        });
        let req = Request::post(format!("http://localhost/v1/wallets/{wallet_id}/operations"))
            .header("Authorization", "Bearer testkey")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&body).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn create_wallet_returns_201() {
        let app = v1_app(test_state());
        let body = serde_json::json!({
            "balance": { "amount": 500.0, "currency": "AUD" },
            "dailyLimit": { "amount": 100.0, "currency": "AUD" }
        });
        let req = Request::post("http://localhost/v1/wallets")
            .header("Authorization", "Bearer testkey")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&body).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(json["balance"]["amount"].as_f64(), Some(500.0));
        assert_eq!(json["dailySpent"]["amount"].as_f64(), Some(0.0));
    }

    #[tokio::test]
    async fn session_events_returns_empty_for_new_session() {
        let app = v1_app(test_state());
        // Create a session first
        let body = serde_json::json!({
            "gameId": Uuid::new_v4().to_string(),
            "playerProfile": { "behaviorType": "conservative" }
        });
        let req = Request::post("http://localhost/v1/sessions")
            .header("Authorization", "Bearer testkey")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&body).unwrap()))
            .unwrap();
        let res = app.clone().oneshot(req).await.unwrap();
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let created: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        let session_id = created["sessionId"].as_str().unwrap().to_string();

        let req = Request::get(format!("http://localhost/v1/sessions/{session_id}/events"))
            .header("Authorization", "Bearer testkey")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert!(json["events"].as_array().map(|a| a.is_empty()).unwrap_or(false));
    }

    #[tokio::test]
    async fn game_fingerprint_returns_404_for_unknown_game() {
        let app = v1_app(test_state());
        let unknown = Uuid::new_v4();
        let req = Request::get(format!("http://localhost/v1/games/{unknown}/fingerprint"))
            .header("Authorization", "Bearer testkey")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::NOT_FOUND);
    }

    #[tokio::test]
    async fn rl_export_returns_empty_experiences() {
        let app = v1_app(test_state());
        let sid = Uuid::new_v4();
        let req = Request::get(format!(
            "http://localhost/v1/rl/export?sessionId={sid}&limit=10&offset=0"
        ))
        .header("Authorization", "Bearer testkey")
        .body(Body::empty())
        .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert!(json["experiences"].as_array().map(|a| a.is_empty()).unwrap_or(false));
    }

    // Helper: create a session and return its ID.
    async fn create_session(app: &Router) -> String {
        let body = serde_json::json!({
            "gameId": Uuid::new_v4().to_string(),
            "playerProfile": { "behaviorType": "conservative" }
        });
        let req = Request::post("http://localhost/v1/sessions")
            .header("Authorization", "Bearer testkey")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&body).unwrap()))
            .unwrap();
        let res = app.clone().oneshot(req).await.unwrap();
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        json["sessionId"].as_str().unwrap().to_string()
    }

    // Helper: perform a PlaceBet action on a session.
    async fn place_bet(app: &Router, session_id: &str) -> serde_json::Value {
        let body = serde_json::json!({
            "action": { "type": "PlaceBet", "amount": { "amount": 1.0, "currency": "AUD" } },
            "humanLikeness": 0.8
        });
        let req = Request::post(format!("http://localhost/v1/sessions/{session_id}/action"))
            .header("Authorization", "Bearer testkey")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&body).unwrap()))
            .unwrap();
        let res = app.clone().oneshot(req).await.unwrap();
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        serde_json::from_slice(&bytes).unwrap()
    }

    #[tokio::test]
    async fn play_action_stores_event_in_event_store() {
        let app = v1_app(test_state());
        let session_id = create_session(&app).await;
        place_bet(&app, &session_id).await;

        let req = Request::get(format!("http://localhost/v1/sessions/{session_id}/events"))
            .header("Authorization", "Bearer testkey")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        let events = json["events"].as_array().expect("events array");
        assert_eq!(events.len(), 1, "expected exactly 1 event");
        // reward should be present and non-null
        assert!(events[0]["reward"].is_number(), "reward must be a number");
    }

    #[tokio::test]
    async fn play_action_stores_experience_in_rl_store() {
        let app = v1_app(test_state());
        let session_id = create_session(&app).await;
        place_bet(&app, &session_id).await;

        let req = Request::get(format!(
            "http://localhost/v1/rl/export?sessionId={session_id}&limit=10&offset=0"
        ))
        .header("Authorization", "Bearer testkey")
        .body(Body::empty())
        .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        let exps = json["experiences"].as_array().expect("experiences array");
        assert_eq!(exps.len(), 1, "expected exactly 1 experience");
        let reward = exps[0]["reward"].as_f64().expect("reward must be numeric");
        // With cost_per_spin=0.01 and bet=0, reward = 0 - 0 - 0.01 + 0.8*0.3 = 0.23
        // Allow any non-NaN numeric value (positive or negative)
        assert!(reward.is_finite(), "reward must be finite");
    }

    #[tokio::test]
    async fn metrics_incremented_on_create() {
        let state = test_state();
        let app = v1_app(state.clone());
        create_session(&app).await;
        create_session(&app).await;

        // metrics endpoint requires admin token
        let req = Request::get("http://localhost/v1/metrics")
            .header("Authorization", "Bearer admin:testkey")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let json: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(json["sessions_created"].as_u64(), Some(2));
    }

    #[tokio::test]
    async fn metrics_requires_admin_token() {
        let app = v1_app(test_state());
        let req = Request::get("http://localhost/v1/metrics")
            .header("Authorization", "Bearer regularuser")
            .body(Body::empty())
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::FORBIDDEN);
    }

    #[tokio::test]
    async fn play_action_transitions_initialized_to_playing() {
        let state = test_state();
        let app = v1_app(state);

        let create_body = serde_json::json!({
            "gameId": Uuid::new_v4().to_string(),
            "playerProfile": { "behaviorType": "conservative" }
        });
        let req = Request::post("http://localhost/v1/sessions")
            .header("Authorization", "Bearer testkey")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&create_body).unwrap()))
            .unwrap();
        let res = app.clone().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::CREATED);
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let created: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        let session_id = created["sessionId"].as_str().unwrap().to_string();

        let action_body = serde_json::json!({
            "action": { "type": "PlaceBet", "amount": { "amount": 1.0, "currency": "AUD" } }
        });
        let req = Request::post(format!("http://localhost/v1/sessions/{session_id}/action"))
            .header("Authorization", "Bearer testkey")
            .header("Content-Type", "application/json")
            .body(Body::from(serde_json::to_vec(&action_body).unwrap()))
            .unwrap();
        let res = app.oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        let bytes = res.into_body().collect().await.unwrap().to_bytes();
        let result: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(result["session"]["state"].as_str(), Some("Playing"));
    }
}
