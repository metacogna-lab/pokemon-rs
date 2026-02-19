import { useState, useEffect } from "react";
import { api } from "../api/client";

const REWARD_HISTORY_KEY = "pokemon-rs:reward-history";
const POLICY_KEY = "pokemon-rs:policy-state";

interface PolicyState {
  epsilon: number;
  episodeCount: number;
  decayRate: number;
}

interface EpisodeSummary {
  episode: number;
  totalReward: number;
  steps: number;
}

function getStoredPolicy(): PolicyState | null {
  try {
    const raw = localStorage.getItem(POLICY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredRewards(): number[] {
  try {
    return JSON.parse(localStorage.getItem(REWARD_HISTORY_KEY) ?? "[]");
  } catch {
    return [];
  }
}

/** Mini sparkline SVG for reward curve. */
function RewardCurve({ values }: { values: number[] }) {
  if (values.length < 2) {
    return <p className="text-slate-400 text-sm">No episodes recorded yet. Run the training loop to populate.</p>;
  }
  const W = 480;
  const H = 80;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const zero = max === min ? H / 2 : H - ((0 - min) / range) * (H - 8) - 4;

  return (
    <div>
      <svg width={W} height={H} className="block w-full max-w-xl">
        {/* Zero line */}
        {min < 0 && max >= 0 && (
          <line x1="0" y1={zero} x2={W} y2={zero} stroke="#475569" strokeWidth="0.5" strokeDasharray="3,3" />
        )}
        <polyline points={pts} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinejoin="round" />
        {/* Latest value dot */}
        {(() => {
          const last = values[values.length - 1]!;
          const lx = W;
          const ly = H - ((last - min) / range) * (H - 8) - 4;
          return <circle cx={lx} cy={ly} r="3" fill="#38bdf8" />;
        })()}
      </svg>
      <div className="flex gap-6 mt-1 text-xs text-slate-400">
        <span>Mean: {(values.reduce((s, v) => s + v, 0) / values.length).toFixed(3)}</span>
        <span>Min: {Math.min(...values).toFixed(3)}</span>
        <span>Max: {Math.max(...values).toFixed(3)}</span>
        <span>Episodes: {values.length}</span>
      </div>
    </div>
  );
}

/** RL Export section: fetch experiences for a given session ID. */
function ExportPanel() {
  const [sessionId, setSessionId] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [meanReward, setMeanReward] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    const sid = sessionId.trim();
    if (!sid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getRlExport(sid, 1000, 0);
      setCount(res.experiences.length);
      setMeanReward(
        res.experiences.length > 0
          ? res.experiences.reduce((s, e) => s + e.reward, 0) / res.experiences.length
          : 0
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleExport} className="flex gap-3 items-end flex-wrap">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Session ID</label>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            placeholder="uuid"
            className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white w-72 font-mono text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !sessionId.trim()}
          className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-sm"
        >
          {loading ? "Fetching…" : "Fetch Export"}
        </button>
      </form>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {count !== null && (
        <div className="p-3 rounded bg-slate-800 text-sm space-y-1">
          <p>Experiences: <span className="font-mono">{count}</span></p>
          <p>Mean reward: <span className="font-mono">{meanReward?.toFixed(4) ?? "—"}</span></p>
        </div>
      )}
    </div>
  );
}

/** RL page: policy state, reward curve, export browser. */
export function RLPage() {
  const [policy, setPolicy] = useState<PolicyState | null>(getStoredPolicy);
  const [rewards, setRewards] = useState<number[]>(() => getStoredRewards());

  // Refresh from localStorage whenever page is focused.
  useEffect(() => {
    const onFocus = () => {
      setPolicy(getStoredPolicy());
      setRewards(getStoredRewards());
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">RL Training</h1>

      {/* Policy state */}
      <section className="border border-slate-600 rounded p-4">
        <h2 className="text-lg font-medium mb-3">Policy State</h2>
        {policy ? (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-800 rounded p-3">
              <p className="text-slate-400 text-xs mb-1">Epsilon (ε)</p>
              <p className="font-mono text-xl text-sky-400">{policy.epsilon.toFixed(4)}</p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-slate-400 text-xs mb-1">Episodes</p>
              <p className="font-mono text-xl text-white">{policy.episodeCount}</p>
            </div>
            <div className="bg-slate-800 rounded p-3">
              <p className="text-slate-400 text-xs mb-1">Decay Rate</p>
              <p className="font-mono text-xl text-white">{policy.decayRate.toFixed(4)}</p>
            </div>
          </div>
        ) : (
          <p className="text-slate-400 text-sm">
            No policy state found. Policy state is persisted to localStorage by the training loop.
            Run <code className="font-mono text-sky-400">make train</code> to start a training session.
          </p>
        )}
      </section>

      {/* Reward history */}
      <section className="border border-slate-600 rounded p-4">
        <h2 className="text-lg font-medium mb-3">Episode Reward History</h2>
        <RewardCurve values={rewards} />
      </section>

      {/* Export browser */}
      <section className="border border-slate-600 rounded p-4">
        <h2 className="text-lg font-medium mb-3">Export Browser</h2>
        <p className="text-sm text-slate-400 mb-3">
          Fetch RL experience records for a session. JSONL files are written to{" "}
          <code className="font-mono text-sky-400">rl_data/</code> by the training loop.
        </p>
        <ExportPanel />
      </section>

      {/* Training instructions */}
      <section className="border border-slate-600 rounded p-4 text-sm text-slate-400">
        <h2 className="text-lg font-medium text-white mb-2">Running the Training Loop</h2>
        <ol className="space-y-1 list-decimal list-inside">
          <li>Start the backend: <code className="font-mono text-slate-200">make serve</code></li>
          <li>Create a wallet via the Wallets page or API</li>
          <li>Run training: <code className="font-mono text-slate-200">make train</code></li>
          <li>Reload this page to see updated reward history and policy state</li>
        </ol>
        <p className="mt-3">
          Episode JSONL files are in <code className="font-mono text-slate-200">agents/rl_data/</code>.
          See <code className="font-mono text-slate-200">docs/INTEGRATION_GUIDE.md</code> for the Gymnasium export format.
        </p>
      </section>
    </div>
  );
}
