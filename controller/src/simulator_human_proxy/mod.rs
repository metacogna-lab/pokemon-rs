//! Human-like proxy: gaussian-jittered inter-spin delays and stake variation.
//!
//! Implements the behaviour profiles used by the TypeScript orchestrator's mirror
//! at the Rust layer. Pure-function design: no global state, no side effects.

use std::time::Duration;

/// Behaviour profile for stake sizing and inter-spin pacing.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum BehaviourProfile {
    /// Low-variance: small fixed stake, long pauses.
    Conservative,
    /// High-variance: large stakes, rapid-fire spins.
    Aggressive,
    /// Adaptive: adjusts stake and timing based on recent outcomes.
    MixedAdaptive,
}

/// Gaussian pseudo-random sample using the Box-Muller transform.
///
/// `seed1` and `seed2` must both be in (0, 1) — callers must ensure non-zero.
/// Returns a sample from N(mean, std_dev²), clamped to be non-negative.
pub fn gaussian_sample(mean: f64, std_dev: f64, seed1: f64, seed2: f64) -> f64 {
    // Box-Muller: z = sqrt(-2 ln u1) * cos(2π u2)
    let z = (-2.0 * seed1.ln()).sqrt() * (2.0 * std::f64::consts::PI * seed2).cos();
    (mean + z * std_dev).max(0.0)
}

/// Choose the next inter-spin delay for the given profile.
///
/// `r1` and `r2` are uniform random values in (0, 1] supplied by the caller
/// (use a real PRNG in production; fixed seeds for tests).
pub fn next_delay(profile: BehaviourProfile, r1: f64, r2: f64) -> Duration {
    let (mean_ms, std_ms) = match profile {
        BehaviourProfile::Conservative => (4_000.0, 800.0),
        BehaviourProfile::Aggressive => (800.0, 200.0),
        BehaviourProfile::MixedAdaptive => (2_200.0, 600.0),
    };
    let ms = gaussian_sample(mean_ms, std_ms, r1.max(f64::EPSILON), r2.max(f64::EPSILON));
    Duration::from_millis(ms.round() as u64)
}

/// Choose the next stake amount (AUD) for the given profile and session spin count.
///
/// `r` is a uniform random value in [0, 1].
pub fn next_stake(profile: BehaviourProfile, spin_count: u32, r: f64) -> f64 {
    match profile {
        BehaviourProfile::Conservative => {
            // Always near-minimum: 0.50 ± 0.20
            (0.50 + r * 0.20).max(0.01)
        }
        BehaviourProfile::Aggressive => {
            // Escalating: base 5.0, increases every 10 spins
            let tier = (spin_count / 10) as f64;
            (5.0 + tier * 2.5 + r * 5.0).min(100.0)
        }
        BehaviourProfile::MixedAdaptive => {
            // Switches strategy every 20 spins
            if (spin_count / 20) % 2 == 0 {
                next_stake(BehaviourProfile::Conservative, spin_count, r)
            } else {
                next_stake(BehaviourProfile::Aggressive, spin_count, r)
            }
        }
    }
}

/// Whether to simulate a session break (return to lobby, pause > 10 min).
///
/// Returns true roughly `break_probability * 100`% of the time.
pub fn should_take_break(spin_count: u32, r: f64) -> bool {
    // Roughly 5% chance after every 25th spin
    spin_count > 0 && spin_count % 25 == 0 && r < 0.05
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn gaussian_sample_non_negative() {
        // Even with extreme seeds the clamp must prevent negative values
        let v = gaussian_sample(100.0, 200.0, 0.0001, 0.5);
        assert!(v >= 0.0);
    }

    #[test]
    fn gaussian_sample_near_mean_for_small_std() {
        // With std_dev = 0 we expect mean exactly (no clamp needed)
        let v = gaussian_sample(1000.0, 0.0, 0.5, 0.5);
        assert!((v - 1000.0).abs() < 1e-9);
    }

    #[test]
    fn next_delay_conservative_longer_than_aggressive() {
        let cons = next_delay(BehaviourProfile::Conservative, 0.5, 0.5);
        let aggr = next_delay(BehaviourProfile::Aggressive, 0.5, 0.5);
        assert!(cons > aggr);
    }

    #[test]
    fn next_delay_never_zero() {
        for profile in [
            BehaviourProfile::Conservative,
            BehaviourProfile::Aggressive,
            BehaviourProfile::MixedAdaptive,
        ] {
            let d = next_delay(profile, 0.5, 0.5);
            assert!(d.as_millis() > 0, "delay must be > 0 for {:?}", profile);
        }
    }

    #[test]
    fn next_stake_conservative_low() {
        let stake = next_stake(BehaviourProfile::Conservative, 0, 0.0);
        assert!(stake < 1.0, "conservative stake should be < 1 AUD, got {stake}");
    }

    #[test]
    fn next_stake_aggressive_higher_than_conservative() {
        let cons = next_stake(BehaviourProfile::Conservative, 5, 0.5);
        let aggr = next_stake(BehaviourProfile::Aggressive, 5, 0.5);
        assert!(aggr > cons);
    }

    #[test]
    fn next_stake_aggressive_capped_at_100() {
        let stake = next_stake(BehaviourProfile::Aggressive, 1000, 1.0);
        assert!(stake <= 100.0);
    }

    #[test]
    fn mixed_adaptive_alternates_strategy() {
        // spin 0 → conservative phase
        let s0 = next_stake(BehaviourProfile::MixedAdaptive, 0, 0.5);
        // spin 20 → aggressive phase
        let s20 = next_stake(BehaviourProfile::MixedAdaptive, 20, 0.5);
        assert!(s20 > s0, "spin 20 (aggressive) should exceed spin 0 (conservative)");
    }

    #[test]
    fn should_take_break_only_at_multiples_of_25() {
        assert!(!should_take_break(0, 0.01));
        assert!(!should_take_break(24, 0.01));
        // At spin 25 with r < 0.05 → break
        assert!(should_take_break(25, 0.01));
        // At spin 25 with r > 0.05 → no break
        assert!(!should_take_break(25, 0.5));
    }
}
