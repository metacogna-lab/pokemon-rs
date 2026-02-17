//! Reward shaping for RL feedback loop.
//! Formula: reward = (payout - stake) - operational_cost + human_likeness_score

/// Computes reward from gameplay outcome and human-likeness signal.
pub fn compute_reward(
    payout: f64,
    stake: f64,
    operational_cost: f64,
    human_likeness_score: f64,
) -> f64 {
    assert!(operational_cost >= 0.0, "operational_cost must be >= 0");
    assert!(
        (0.0..=1.0).contains(&human_likeness_score),
        "human_likeness_score must be in [0, 1]"
    );
    (payout - stake) - operational_cost + human_likeness_score
}

/// Clamping variant; clamps human_likeness to [0,1] and operational_cost to >= 0.
pub fn compute_reward_safe(
    payout: f64,
    stake: f64,
    operational_cost: f64,
    human_likeness_score: f64,
) -> f64 {
    let cost = operational_cost.max(0.0);
    let likeness = human_likeness_score.clamp(0.0, 1.0);
    (payout - stake) - cost + likeness
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compute_reward_basic() {
        let r = compute_reward(10.0, 5.0, 0.1, 0.5);
        assert!((r - 5.4).abs() < 1e-9);
    }

    #[test]
    fn compute_reward_zero_payout() {
        let r = compute_reward(0.0, 5.0, 0.1, 0.5);
        assert!((r - (-4.6)).abs() < 1e-9);
    }

    #[test]
    fn compute_reward_human_likeness_dominates_when_neutral() {
        let r = compute_reward(5.0, 5.0, 0.1, 0.5);
        assert!((r - 0.4).abs() < 1e-9);
    }

    #[test]
    fn compute_reward_safe_clamps_likeness() {
        let r = compute_reward_safe(5.0, 5.0, 0.0, 1.5);
        assert!((r - 1.0).abs() < 1e-9);
    }

    #[test]
    fn calibration_human_likeness_dominates_when_payout_neutral() {
        let r_low = compute_reward(5.0, 5.0, 0.1, 0.0);
        let r_high = compute_reward(5.0, 5.0, 0.1, 1.0);
        assert!(r_high > r_low);
        assert!((r_high - r_low - 1.0).abs() < 1e-9);
    }
}
