//! Rate limit: in-memory per-key (IP or token) with fixed window.

use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};

/// Fixed-window rate limiter: max_requests per window_duration per key.
#[derive(Clone)]
pub struct RateLimiter {
    inner: Arc<RwLock<RateLimiterInner>>,
    max_requests: u32,
    window: Duration,
}

struct RateLimiterInner {
    windows: HashMap<String, (Instant, u32)>,
}

impl RateLimiter {
    pub fn new(max_requests: u32, window: Duration) -> Self {
        Self {
            inner: Arc::new(RwLock::new(RateLimiterInner {
                windows: HashMap::new(),
            })),
            max_requests,
            window,
        }
    }

    /// Returns true if the request is allowed, false if rate limit exceeded.
    pub fn check(&self, key: &str) -> bool {
        let mut g = self.inner.write().expect("lock");
        let now = Instant::now();
        let entry = g.windows.entry(key.to_string()).or_insert((now, 0));
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
        let g = self.inner.read().expect("lock");
        if let Some((start, count)) = g.windows.get(key) {
            if *count >= self.max_requests {
                let elapsed = start.elapsed();
                if elapsed < self.window {
                    return (self.window.as_secs()).saturating_sub(elapsed.as_secs()).max(1);
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
}
