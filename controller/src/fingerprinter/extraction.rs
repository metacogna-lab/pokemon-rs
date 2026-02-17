//! Pure extraction logic: symbol frequencies, RNG signature, statistical profile.

use serde_json::{Map, Value};
use std::collections::HashMap;

/// Symbol frequencies: symbol -> count.
pub fn symbol_counts(spin_symbols: &[Vec<String>]) -> HashMap<String, u64> {
    let mut counts: HashMap<String, u64> = HashMap::new();
    for row in spin_symbols {
        for s in row {
            *counts.entry(s.clone()).or_insert(0) += 1;
        }
    }
    counts
}

/// Frequencies as 0.0..=1.0 (sum approx 1.0). Empty map if total is 0.
pub fn extract_symbol_frequencies(spin_symbols: &[Vec<String>]) -> HashMap<String, f64> {
    let counts = symbol_counts(spin_symbols);
    let total: u64 = counts.values().sum();
    if total == 0 {
        return HashMap::new();
    }
    counts
        .into_iter()
        .map(|(k, v)| (k, v as f64 / total as f64))
        .collect()
}

/// Deterministic digest of outcome sequence for RNG signature.
pub fn rng_signature_digest(spin_symbols: &[Vec<String>], max_symbols: usize) -> String {
    use std::collections::hash_map::DefaultHasher;
    use std::hash::{Hash, Hasher};
    let flat: Vec<&str> = spin_symbols
        .iter()
        .flat_map(|r| r.iter().map(String::as_str))
        .take(max_symbols)
        .collect();
    let s = flat.join(",");
    let mut h = DefaultHasher::new();
    s.hash(&mut h);
    format!("{:x}", h.finish())
}

/// Statistical profile: RTP-like and volatility.
#[derive(Debug, Clone, Default)]
pub struct StatisticalProfile {
    pub rtp_ratio: f64,
    pub volatility: f64,
}

/// Build profile from total stake and payout.
pub fn build_statistical_profile(
    frequencies: &HashMap<String, f64>,
    total_stake: f64,
    total_payout: f64,
) -> StatisticalProfile {
    let rtp_ratio = if total_stake > 0.0 {
        (total_payout / total_stake).clamp(0.0, 10.0)
    } else {
        0.0
    };
    let volatility = if frequencies.is_empty() {
        0.0
    } else {
        let mean = 1.0 / frequencies.len() as f64;
        let variance: f64 = frequencies
            .values()
            .map(|p| (p - mean).powi(2))
            .sum::<f64>()
            / frequencies.len() as f64;
        (variance.sqrt() * 10.0).min(1.0)
    };
    StatisticalProfile { rtp_ratio, volatility }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn symbol_frequencies_sum_near_one() {
        let spins = vec![
            vec!["A".into(), "B".into(), "C".into()],
            vec!["A".into(), "A".into(), "B".into()],
        ];
        let f = extract_symbol_frequencies(&spins);
        let sum: f64 = f.values().sum();
        assert!((sum - 1.0).abs() < 1e-9);
    }

    #[test]
    fn statistical_profile_rtp_bounds() {
        let f = HashMap::new();
        let p = build_statistical_profile(&f, 100.0, 95.0);
        assert!(p.rtp_ratio >= 0.0 && p.rtp_ratio <= 10.0);
        assert_eq!(p.rtp_ratio, 0.95);
    }
}
