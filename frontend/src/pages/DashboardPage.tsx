import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { CreateSessionResponse } from "../../../agents/ts-client";

const REWARD_HISTORY_KEY = "pokemon-rs:reward-history";
const HEALTH_POLL_MS = 10_000;

function getStoredRewards(): number[] {
  try {
    return JSON.parse(localStorage.getItem(REWARD_HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Mini sparkline: renders last N reward values as an SVG polyline. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <p className="text-slate-400 text-xs">No reward data yet. Play some sessions.</p>;
  }
  const W = 280;
  const H = 48;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg width={W} height={H} className="block">
      <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
      <line x1="0" y1={H} x2={W} y2={H} stroke="#475569" strokeWidth="0.5" />
    </svg>
  );
}

/** Status badge: green when healthy, red otherwise. */
function StatusBadge({ healthy }: { healthy: boolean | null }) {
  if (healthy === null) return <span className="text-slate-400 text-sm">Checking…</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-sm font-medium px-2 py-0.5 rounded-full ${
        healthy ? "bg-emerald-900/50 text-emerald-400" : "bg-red-900/50 text-red-400"
      }`}
    >
      <span
        className={`inline-block w-2 h-2 rounded-full ${healthy ? "bg-emerald-400" : "bg-red-400"}`}
      />
      {healthy ? "Healthy" : "Unreachable"}
    </span>
  );
}

/** Dashboard: system status, quick session create, reward sparkline. */
export function DashboardPage() {
  const navigate = useNavigate();
  const [healthy, setHealthy] = useState<boolean | null>(null);
  const [gameId, setGameId] = useState("");
  const [behavior, setBehavior] = useState("conservative");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [rewards, setRewards] = useState<number[]>(() => getStoredRewards().slice(-20));

  // Poll health every HEALTH_POLL_MS.
  const checkHealth = useCallback(async () => {
    try {
      const res = await api.getHealth();
      setHealthy(res.status === "healthy");
    } catch {
      setHealthy(false);
    }
  }, []);

  useEffect(() => {
    void checkHealth();
    const id = setInterval(() => void checkHealth(), HEALTH_POLL_MS);
    return () => clearInterval(id);
  }, [checkHealth]);

  // Refresh reward history from localStorage when tab gains focus.
  useEffect(() => {
    const onFocus = () => setRewards(getStoredRewards().slice(-20));
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const gid = gameId.trim();
    if (!gid) return;
    setCreating(true);
    setCreateError(null);
    try {
      const res: CreateSessionResponse = await api.createSession({
        gameId: gid,
        playerProfile: { behaviorType: behavior },
      });
      navigate(`/sessions?selected=${res.sessionId}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <StatusBadge healthy={healthy} />
      </div>

      {/* Quick-create session */}
      <section className="border border-slate-600 rounded p-4">
        <h2 className="text-lg font-medium mb-3">Quick-Create Session</h2>
        <form onSubmit={handleCreate} className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Game ID</label>
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="uuid"
              className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white w-64 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Behavior</label>
            <select
              value={behavior}
              onChange={(e) => setBehavior(e.target.value)}
              className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white"
            >
              <option value="conservative">Conservative</option>
              <option value="aggressive">Aggressive</option>
              <option value="mixed_adaptive">Mixed Adaptive</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={creating || !gameId.trim()}
            className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white"
          >
            {creating ? "Creating…" : "Create & View"}
          </button>
        </form>
        {createError && (
          <p className="mt-2 text-sm text-red-400">{createError}</p>
        )}
      </section>

      {/* Recent reward history sparkline */}
      <section className="border border-slate-600 rounded p-4">
        <h2 className="text-lg font-medium mb-1">Recent Rewards</h2>
        <p className="text-xs text-slate-400 mb-3">
          Last {rewards.length} per-episode rewards (persisted from training loop).
        </p>
        <Sparkline values={rewards} />
        {rewards.length > 0 && (
          <div className="mt-2 flex gap-6 text-xs text-slate-400">
            <span>Mean: {(rewards.reduce((s, v) => s + v, 0) / rewards.length).toFixed(3)}</span>
            <span>Min: {Math.min(...rewards).toFixed(3)}</span>
            <span>Max: {Math.max(...rewards).toFixed(3)}</span>
          </div>
        )}
      </section>

      {/* System info */}
      <section className="border border-slate-600 rounded p-4 text-sm text-slate-400">
        <h2 className="text-lg font-medium text-white mb-2">System</h2>
        <p>Backend: <span className="font-mono text-slate-200">{(typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) || "http://localhost:8080/v1"}</span></p>
        <p className="mt-1">Health check every 10s. Status updates automatically.</p>
      </section>
    </div>
  );
}
