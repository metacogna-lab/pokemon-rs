//! Observability: session lifecycle counters and request latency recording.
//! Use with tracing for structured logs (request_id, session_id, state, error codes; no PII).

use std::sync::atomic::{AtomicU64, Ordering};

/// In-process counters for session lifecycle (created, completed, by state).
/// Export to Prometheus or similar via a /metrics endpoint that reads these.
#[derive(Default)]
pub struct SessionMetrics {
    pub sessions_created: AtomicU64,
    pub sessions_completed: AtomicU64,
    pub sessions_playing: AtomicU64,
}

impl SessionMetrics {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn record_session_created(&self) {
        self.sessions_created.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_session_completed(&self) {
        self.sessions_completed.fetch_add(1, Ordering::Relaxed);
    }

    pub fn record_session_playing(&self) {
        self.sessions_playing.fetch_add(1, Ordering::Relaxed);
    }

    pub fn get_sessions_created(&self) -> u64 {
        self.sessions_created.load(Ordering::Relaxed)
    }

    pub fn get_sessions_completed(&self) -> u64 {
        self.sessions_completed.load(Ordering::Relaxed)
    }
}

/// Record request latency in milliseconds (for histogram/summary). No-op stub;
/// plug in metrics backend (e.g. prometheus) when serving HTTP.
pub fn record_request_latency_ms(_route: &str, _ms: u64) {
    // TODO: histogram.observe(route, ms) when backend is wired
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_metrics_increment() {
        let m = SessionMetrics::new();
        assert_eq!(m.get_sessions_created(), 0);
        m.record_session_created();
        m.record_session_created();
        assert_eq!(m.get_sessions_created(), 2);
        m.record_session_completed();
        assert_eq!(m.get_sessions_completed(), 1);
    }
}
