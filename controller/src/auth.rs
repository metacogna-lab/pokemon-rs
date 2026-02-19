//! Auth: Bearer token parsing and validation, role extraction.

use anyhow::Result;
use std::collections::HashSet;
use thiserror::Error;

/// Minimal role for RBAC.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    User,
    Admin,
}

/// Extract Bearer token from "Authorization: Bearer <token>" header value.
/// Returns None if header is missing, empty, or not Bearer.
pub fn parse_bearer_token(header_value: Option<&str>) -> Option<String> {
    let v = header_value?.trim();
    let prefix = "Bearer ";
    if v.starts_with(prefix) {
        let token = v[prefix.len()..].trim();
        if token.is_empty() {
            return None;
        }
        Some(token.to_string())
    } else {
        None
    }
}

/// Validate token against the configured API key set and return the caller's Role.
///
/// Rules:
/// - Empty token → `AuthError::InvalidToken`
/// - `api_keys` is empty → dev mode; any non-empty token accepted.
///   - Token starts with `"admin:"` → `Role::Admin`
///   - Otherwise → `Role::User`
/// - `api_keys` is non-empty → token must be present in the set, else `AuthError::Unauthorized`.
///   - Token starts with `"admin:"` → `Role::Admin`
///   - Otherwise → `Role::User`
pub fn validate_token(token: &str, api_keys: &HashSet<String>) -> Result<Role> {
    if token.is_empty() {
        return Err(AuthError::InvalidToken.into());
    }
    if !api_keys.is_empty() && !api_keys.contains(token) {
        return Err(AuthError::Unauthorized.into());
    }
    if token.starts_with("admin:") {
        return Ok(Role::Admin);
    }
    Ok(Role::User)
}

/// Check if role is allowed for an action (e.g. wallet operations require User; admin-only require Admin).
pub fn role_allowed(required: Role, user_role: Role) -> bool {
    match required {
        Role::Admin => user_role == Role::Admin,
        Role::User => true,
    }
}

/// Log an unauthorized access attempt (no PII; request_id and code only).
pub fn log_unauthorized(request_id: &str, code: &str) {
    tracing::warn!(request_id = %request_id, code = %code, "unauthorized");
}

#[derive(Error, Debug)]
pub enum AuthError {
    #[error("invalid or missing token")]
    InvalidToken,
    #[error("unauthorized")]
    Unauthorized,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_bearer_extracts_token() {
        assert_eq!(
            parse_bearer_token(Some("Bearer abc123")),
            Some("abc123".to_string())
        );
        assert_eq!(parse_bearer_token(Some("Bearer  x ") ), Some("x".to_string()));
    }

    #[test]
    fn parse_bearer_rejects_non_bearer() {
        assert_eq!(parse_bearer_token(Some("Basic abc")), None);
        assert_eq!(parse_bearer_token(Some("Bearer ")), None);
        assert_eq!(parse_bearer_token(None), None);
    }

    #[test]
    fn validate_token_returns_user_or_admin_in_dev_mode() {
        let empty: HashSet<String> = HashSet::new();
        assert_eq!(validate_token("any", &empty).unwrap(), Role::User);
        assert_eq!(validate_token("admin:key", &empty).unwrap(), Role::Admin);
    }

    #[test]
    fn validate_token_rejects_empty_token() {
        let empty: HashSet<String> = HashSet::new();
        assert!(validate_token("", &empty).is_err());
    }

    #[test]
    fn validate_token_enforces_api_keys_when_set() {
        let keys: HashSet<String> = ["validkey".to_string()].into_iter().collect();
        assert_eq!(validate_token("validkey", &keys).unwrap(), Role::User);
        assert!(validate_token("wrongkey", &keys).is_err());
    }

    #[test]
    fn validate_token_admin_prefix_in_key_set() {
        let keys: HashSet<String> = ["admin:secret".to_string()].into_iter().collect();
        assert_eq!(validate_token("admin:secret", &keys).unwrap(), Role::Admin);
    }

    #[test]
    fn role_allowed_user_can_do_user_actions() {
        assert!(role_allowed(Role::User, Role::User));
        assert!(!role_allowed(Role::Admin, Role::User));
        assert!(role_allowed(Role::Admin, Role::Admin));
    }
}
