//! Fingerprint storage and lookup.

use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value as JsonValue;
use std::sync::{Arc, RwLock};
use uuid::Uuid;

/// Stored game fingerprint: RNG signature, symbol map, statistical profile (JSONB-friendly).
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct GameFingerprint {
    pub game_id: Uuid,
    pub rng_signature: String,
    pub symbol_map: JsonValue,
    pub statistical_profile: JsonValue,
}

/// Store and retrieve fingerprints by game_id.
pub trait FingerprintStore: Send + Sync {
    fn get(&self, game_id: Uuid) -> Result<Option<GameFingerprint>>;
    fn save(&self, fp: GameFingerprint) -> Result<()>;
}

/// In-memory fingerprint store for tests and minimal scaffolding.
#[derive(Default)]
pub struct InMemoryFingerprintStore {
    store: Arc<RwLock<std::collections::HashMap<Uuid, GameFingerprint>>>,
}

impl InMemoryFingerprintStore {
    pub fn new() -> Self {
        Self::default()
    }
}

impl FingerprintStore for InMemoryFingerprintStore {
    fn get(&self, game_id: Uuid) -> Result<Option<GameFingerprint>> {
        let g = self.store.read().map_err(|e| anyhow::anyhow!("lock: {}", e))?;
        Ok(g.get(&game_id).cloned())
    }

    fn save(&self, fp: GameFingerprint) -> Result<()> {
        self.store
            .write()
            .map_err(|e| anyhow::anyhow!("lock: {}", e))?
            .insert(fp.game_id, fp);
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn save_and_get_fingerprint() {
        let s = InMemoryFingerprintStore::new();
        let id = Uuid::new_v4();
        let fp = GameFingerprint {
            game_id: id,
            rng_signature: "abc".into(),
            symbol_map: serde_json::json!({"A": 0.5}),
            statistical_profile: serde_json::json!({"rtp_ratio": 0.96}),
        };
        s.save(fp.clone()).unwrap();
        let got = s.get(id).unwrap().unwrap();
        assert_eq!(got.rng_signature, "abc");
    }
}
