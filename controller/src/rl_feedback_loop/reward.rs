//! Reward shaping for RL feedback loop.
//! Formula: reward = (payout - stake) - operational_cost + human_likeness_score * LIKENESS_WEIGHT + completion_bonus

use thiserror::Error;

/// Weight applied to the human-likeness score in the reward formula.
pub const LIKENESS_WEIGHT: f64 = 0.3;

#[derive(Debug, Error, PartialEq)]
pub enum RewardError {
    #[error("operational_cost must be >= 0, got {0}")]
    NegativeCost(f64),
    #[error("human_likeness_score must be in [0, 1], got {0}")]
    InvalidLikeness(f64),
}

/// Decomposed reward components for interpretability and RL diagnostics.
#[derive(Debug, Clone, PartialEq)]
pub struct RewardComponents {
    /// Net payout gain: payout - stake (can be negative).
    pub payout_reward: f64,
    /// Operational cost penalty (always ≤ 0).
    pub cost_penalty: f64,
    /// Human-likeness bonus scaled by LIKENESS_WEIGHT.
    pub likeness_bonus: f64,
    /// Bonus awarded when episode terminates with a positive payout.
    pub completion_bonus: f64,
}

/// Compute decomposed reward components.
/// `done` indicates the episode ended (e.g. CashOut completed).
pub fn compute_reward_components(
    payout: f64,
    stake: f64,
    cost: f64,
    likeness: f64,
    done: bool,
) -> RewardComponents {
    RewardComponents {
        payout_reward: payout - stake,
        cost_penalty: -(cost.max(0.0)),
        likeness_bonus: likeness.clamp(0.0, 1.0) * LIKENESS_WEIGHT,
        completion_bonus: if done && payout > 0.0 { 1.0 } else { 0.0 },
    }
}

/// Sum all components into a scalar reward.
pub fn sum_reward(c: &RewardComponents) -> f64 {
    c.payout_reward + c.cost_penalty + c.likeness_bonus + c.completion_bonus
}

/// Computes reward with input validation. Returns Err on invalid inputs.
pub fn compute_reward(
    payout: f64,
    stake: f64,
    operational_cost: f64,
    human_likeness_score: f64,
) -> Result<f64, RewardError> {
    if operational_cost < 0.0 {
        return Err(RewardError::NegativeCost(operational_cost));
    }
    if !(0.0..=1.0).contains(&human_likeness_score) {
        return Err(RewardError::InvalidLikeness(human_likeness_score));
    }
    Ok((payout - stake) - operational_cost + human_likeness_score)
}

/// Clamping variant — always succeeds; delegates to `compute_reward_components`.
/// `done` defaults to false (episode not yet terminated).
pub fn compute_reward_safe(
    payout: f64,
    stake: f64,
    operational_cost: f64,
    human_likeness_score: f64,
) -> f64 {
    sum_reward(&compute_reward_components(payout, stake, operational_cost, human_likeness_score, false))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compute_reward_basic() {
        let r = compute_reward(10.0, 5.0, 0.1, 0.5).unwrap();
        assert!((r - 5.4).abs() < 1e-9);
    }

    #[test]
    fn compute_reward_zero_payout() {
        let r = compute_reward(0.0, 5.0, 0.1, 0.5).unwrap();
        assert!((r - (-4.6)).abs() < 1e-9);
    }

    #[test]
    fn compute_reward_negative_cost_returns_err() {
        let r = compute_reward(5.0, 5.0, -1.0, 0.5);
        assert!(matches!(r, Err(RewardError::NegativeCost(_))));
    }

    #[test]
    fn compute_reward_invalid_likeness_returns_err() {
        let r = compute_reward(5.0, 5.0, 0.1, 1.5);
        assert!(matches!(r, Err(RewardError::InvalidLikeness(_))));
    }

    #[test]
    fn compute_reward_safe_clamps_likeness() {
        // likeness clamped to 1.0, scaled by LIKENESS_WEIGHT=0.3
        let r = compute_reward_safe(5.0, 5.0, 0.0, 1.5);
        assert!((r - LIKENESS_WEIGHT).abs() < 1e-9);
    }

    #[test]
    fn compute_reward_safe_clamps_cost() {
        // cost clamped to 0.0; likeness=0.5 → bonus=0.5*0.3=0.15
        let r = compute_reward_safe(5.0, 5.0, -1.0, 0.5);
        assert!((r - 0.5 * LIKENESS_WEIGHT).abs() < 1e-9);
    }

    #[test]
    fn human_likeness_dominates_when_payout_neutral() {
        let r_low = compute_reward(5.0, 5.0, 0.1, 0.0).unwrap();
        let r_high = compute_reward(5.0, 5.0, 0.1, 1.0).unwrap();
        assert!(r_high > r_low);
        // compute_reward uses unweighted formula (validation function, unchanged)
        assert!((r_high - r_low - 1.0).abs() < 1e-9);
    }

    // ── New RewardComponents tests ─────────────────────────────────────────────

    #[test]
    fn completion_bonus_on_done_positive_payout() {
        let c = compute_reward_components(10.0, 5.0, 0.1, 0.5, true);
        assert!((c.completion_bonus - 1.0).abs() < 1e-9);
    }

    #[test]
    fn completion_bonus_absent_when_done_zero_payout() {
        let c = compute_reward_components(0.0, 5.0, 0.1, 0.5, true);
        assert!((c.completion_bonus).abs() < 1e-9);
    }

    #[test]
    fn completion_bonus_absent_when_not_done() {
        let c = compute_reward_components(10.0, 5.0, 0.1, 0.5, false);
        assert!((c.completion_bonus).abs() < 1e-9);
    }

    #[test]
    fn cost_penalty_non_positive() {
        let c = compute_reward_components(5.0, 5.0, 2.0, 0.5, false);
        assert!(c.cost_penalty <= 0.0);
        assert!((c.cost_penalty - (-2.0)).abs() < 1e-9);
    }

    #[test]
    fn cost_penalty_zero_for_negative_cost_input() {
        let c = compute_reward_components(5.0, 5.0, -1.0, 0.5, false);
        assert!((c.cost_penalty).abs() < 1e-9);
    }

    #[test]
    fn sum_matches_components() {
        let c = compute_reward_components(10.0, 5.0, 0.1, 0.5, true);
        let expected = c.payout_reward + c.cost_penalty + c.likeness_bonus + c.completion_bonus;
        assert!((sum_reward(&c) - expected).abs() < 1e-9);
    }

    #[test]
    fn likeness_bonus_scaled_by_weight() {
        let c = compute_reward_components(0.0, 0.0, 0.0, 1.0, false);
        assert!((c.likeness_bonus - LIKENESS_WEIGHT).abs() < 1e-9);
    }
}
