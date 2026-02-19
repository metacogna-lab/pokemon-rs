//! CLI-level configuration: server binding + AppConfig from environment variables.

use controller::app_state::AppConfig;
use std::net::SocketAddr;

/// Full CLI configuration including server bind address and gameplay parameters.
pub struct Config {
    /// Socket address to listen on (default: 0.0.0.0:8080).
    pub bind: SocketAddr,
    /// Comma-separated API keys (None = dev mode, accept any non-empty token).
    pub api_keys: Option<String>,
    /// Per-spin operational cost deducted from reward (default: 0.01).
    pub cost_per_spin: f64,
    /// Weight applied to human-likeness in the reward formula (default: 0.3).
    pub human_likeness_weight: f64,
    /// Maximum requests per minute per token (default: 100).
    pub rate_limit_rpm: u32,
    /// Postgres connection URL (e.g. postgres://user:pass@host/db).
    /// When set, migrations run at startup and RL experiences persist to Postgres.
    /// When unset, the server falls back to in-memory stores (ephemeral).
    pub database_url: Option<String>,
}

impl Config {
    /// Build Config from environment variables with sensible defaults.
    pub fn from_env() -> Self {
        let bind = std::env::var("BIND_ADDR")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or_else(|| "0.0.0.0:8080".parse().expect("default bind addr is valid"));

        let api_keys = std::env::var("API_KEYS").ok().filter(|s| !s.is_empty());

        let cost_per_spin = std::env::var("COST_PER_SPIN")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.01_f64);

        let human_likeness_weight = std::env::var("HUMAN_LIKENESS_WEIGHT")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(0.3_f64);

        let rate_limit_rpm = std::env::var("RATE_LIMIT_RPM")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(100_u32);

        // DATABASE_URL takes priority; if absent, assemble from individual PG* vars.
        // This lets developers set either the full URL or the libpq-style variables.
        let database_url = std::env::var("DATABASE_URL")
            .ok()
            .filter(|s| !s.is_empty())
            .or_else(|| {
                let host = std::env::var("PGHOST").ok().filter(|s| !s.is_empty())?;
                let port =
                    std::env::var("PGPORT").unwrap_or_else(|_| "5432".to_string());
                let user = std::env::var("PGUSER").ok().filter(|s| !s.is_empty())?;
                let pass = std::env::var("PGPASSWORD").ok().filter(|s| !s.is_empty())?;
                let db = std::env::var("PGDATABASE").ok().filter(|s| !s.is_empty())?;
                Some(format!("postgres://{}:{}@{}:{}/{}", user, pass, host, port, db))
            });

        Self {
            bind,
            api_keys,
            cost_per_spin,
            human_likeness_weight,
            rate_limit_rpm,
            database_url,
        }
    }

    /// Convert to the controller-level AppConfig (excludes CLI-only fields like bind).
    pub fn to_app_config(&self) -> AppConfig {
        AppConfig {
            cost_per_spin: self.cost_per_spin,
            human_likeness_weight: self.human_likeness_weight,
            rate_limit_rpm: self.rate_limit_rpm,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_defaults_are_sensible() {
        // Do not rely on env vars being unset in CI; test the conversion only.
        let cfg = Config {
            bind: "0.0.0.0:8080".parse().unwrap(),
            api_keys: None,
            cost_per_spin: 0.01,
            human_likeness_weight: 0.3,
            rate_limit_rpm: 100,
            database_url: None,
        };
        let app_cfg = cfg.to_app_config();
        assert!((app_cfg.cost_per_spin - 0.01).abs() < 1e-9);
        assert!((app_cfg.human_likeness_weight - 0.3).abs() < 1e-9);
        assert_eq!(app_cfg.rate_limit_rpm, 100);
    }
}
