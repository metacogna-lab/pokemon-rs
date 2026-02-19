//! Export experience data for offline Gymnasium training.

use super::{Experience, ExperienceStore, StoreError};
use serde::Serialize;
use uuid::Uuid;

/// Export parameters for pagination.
#[derive(Debug, Clone)]
pub struct ExportParams {
    pub session_id: Uuid,
    pub limit: u32,
    pub offset: u32,
}

impl Default for ExportParams {
    fn default() -> Self {
        Self {
            session_id: Uuid::nil(),
            limit: 100,
            offset: 0,
        }
    }
}

/// Gymnasium-compatible export record (camelCase for JSON API).
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportRecord {
    pub id: Uuid,
    pub session_id: Uuid,
    pub state: serde_json::Value,
    pub action: serde_json::Value,
    pub reward: f64,
    pub next_state: serde_json::Value,
    pub done: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub created_at: Option<chrono::DateTime<chrono::Utc>>,
}

impl From<&Experience> for ExportRecord {
    fn from(exp: &Experience) -> Self {
        Self {
            id: exp.id,
            session_id: exp.session_id,
            state: exp.state.clone(),
            action: exp.action.clone(),
            reward: exp.reward,
            next_state: exp.next_state.clone(),
            done: exp.done,
            created_at: exp.created_at,
        }
    }
}

/// Response shape for export API.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportResponse {
    pub experiences: Vec<ExportRecord>,
}

/// Exports experiences for a session with pagination.
pub async fn export_experiences(
    store: &dyn ExperienceStore,
    params: ExportParams,
) -> Result<ExportResponse, StoreError> {
    let list = store.list_by_session(params.session_id).await?;
    let limit = params.limit.max(1).min(10_000);
    let offset = params.offset.min(list.len() as u32);
    let start = offset as usize;
    let end = (start + limit as usize).min(list.len());
    let slice = &list[start..end];
    let experiences = slice.iter().map(ExportRecord::from).collect();
    Ok(ExportResponse { experiences })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::rl_feedback_loop::InMemoryStore;
    use serde_json::json;

    #[tokio::test]
    async fn export_returns_correct_subset() {
        let store = InMemoryStore::new();
        let sid = Uuid::new_v4();
        for i in 0..5 {
            let exp = Experience::new(
                sid,
                json!({"n": i}),
                json!({"type": "Spin"}),
                i as f64,
                json!({}),
                false,
            );
            store.insert_experience(&exp).await.unwrap();
        }
        let params = ExportParams {
            session_id: sid,
            limit: 2,
            offset: 1,
        };
        let res = export_experiences(&store, params).await.unwrap();
        assert_eq!(res.experiences.len(), 2);
        let rewards: Vec<f64> = res.experiences.iter().map(|r| r.reward).collect();
        assert!(rewards.iter().all(|r| (0.0..=4.0).contains(r)));
    }

    #[tokio::test]
    async fn export_empty_for_unknown_session() {
        let store = InMemoryStore::new();
        let params = ExportParams {
            session_id: Uuid::new_v4(),
            limit: 10,
            offset: 0,
        };
        let res = export_experiences(&store, params).await.unwrap();
        assert!(res.experiences.is_empty());
    }

    #[test]
    fn export_record_has_required_shape() {
        let exp = Experience::new(
            Uuid::new_v4(),
            json!({"state": "a"}),
            json!({"type": "Spin"}),
            5.0,
            json!({"state": "b"}),
            true,
        );
        let rec = ExportRecord::from(&exp);
        assert_eq!(rec.reward, 5.0);
        assert!(rec.done);
    }
}
