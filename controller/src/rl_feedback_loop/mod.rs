//! Reinforcement learning feedback and reward signal handling.
//!
//! Stores Experience records per gameplay event for offline RL training.

mod experience;
mod export;
mod reward;
mod store;

pub use experience::Experience;
pub use export::{export_experiences, ExportParams, ExportRecord, ExportResponse};
pub use reward::{compute_reward, compute_reward_safe};
pub use store::{ExperienceStore, InMemoryStore, StoreError};
