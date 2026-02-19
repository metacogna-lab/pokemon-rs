//! Rate limit: in-memory per-key (IP or token) with fixed window.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

/// Fixed-window rate limiter: max_requests per window_duration per key.
#[derive(Clone)]
pub struct RateLimiter {
    inner: Arc<RwLock<HashMap<String, (Instant, u32)>>>,
    max_requests: u32,
    window: Duration,
}

impl RateLimiter {
    pub fn new(max_requests: u32, window: Duration) -> Self {
        Self {
            inner: Arc::new(RwLock::new(HashMap::new())),
            max_requests,
            window,
        }
    }

    /// Returns true if the request is allowed; false if rate limit exceeded.
    /// Returns true on lock error (fail-open is safer than fail-closed here).
    pub fn check(&self, key: &str) -> bool {
        let Ok(mut g) = self.inner.write() else {
            return true; // fail-open: don't block requests on internal errors
        };
        let now = Instant::now();
        let entry = g.entry(key.to_string()).or_insert((now, 0));
        if now.duration_since(entry.0) >= self.window {
            *entry = (now, 1);
            return true;
        }
        if entry.1 >= self.max_requests {
            return false;
        }
        entry.1 += 1;
        true
    }

    /// Seconds after which the client may retry (for Retry-After header).
    pub fn retry_after_seconds(&self, key: &str) -> u64 {
        let Ok(g) = self.inner.read() else { return 1 };
        if let Some((start, count)) = g.get(key) {
            if *count >= self.max_requests {
                let elapsed = start.elapsed();
                if elapsed < self.window {
                    return self.window.as_secs().saturating_sub(elapsed.as_secs()).max(1);
                }
            }
        }
        1
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_under_limit() {
        let r = RateLimiter::new(2, Duration::from_secs(10));
        assert!(r.check("k1"));
        assert!(r.check("k1"));
        assert!(!r.check("k1"));
    }

    #[test]
    fn different_keys_independent() {
        let r = RateLimiter::new(1, Duration::from_secs(10));
        assert!(r.check("a"));
        assert!(!r.check("a"));
        assert!(r.check("b"));
    }

    #[test]
    fn retry_after_returns_positive() {
        let r = RateLimiter::new(1, Duration::from_secs(60));
        r.check("x");
        r.check("x");
        assert!(r.retry_after_seconds("x") >= 1);
    }
}
