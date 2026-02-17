//! Controller: game session manager, state engine, simulator, fingerprinter, RL loop, persistence.

pub mod api;
pub mod app_state;
pub mod auth;
pub mod event_store;
pub mod fingerprinter;
pub mod game_session_manager;
pub mod persistence_metrics;
pub mod rl_feedback_loop;
pub mod simulator_human_proxy;
pub mod metrics;
pub mod ratelimit;
pub mod state_engine;
