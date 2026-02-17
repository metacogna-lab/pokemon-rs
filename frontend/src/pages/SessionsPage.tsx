import { useState, useEffect } from "react";
import { api } from "../api/client";
import type {
  Session,
  CreateSessionRequest,
  CreateSessionResponse,
  PlayActionRequest,
  PlayActionResponse,
  Money,
} from "../../../agents/ts-client";
import { Loading } from "../components/Loading";
import { ErrorDisplay } from "../components/ErrorBoundary";

const MOCK_SESSIONS: Session[] = [];

/** Sessions page: list, create form, detail with actions. */
export function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createGameId, setCreateGameId] = useState("");
  const [createBehavior, setCreateBehavior] = useState("conservative");
  const [detailSession, setDetailSession] = useState<Session | null>(null);
  const [lastResult, setLastResult] = useState<PlayActionResponse | null>(null);

  useEffect(() => {
    if (selectedId) {
      setLoading(true);
      setError(null);
      api
        .getSession(selectedId)
        .then((s) => {
          setDetailSession(s);
          setLoading(false);
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        });
    } else {
      setDetailSession(null);
      setLastResult(null);
    }
  }, [selectedId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createGameId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const req: CreateSessionRequest = {
        gameId: createGameId.trim(),
        playerProfile: { behaviorType: createBehavior },
      };
      const res: CreateSessionResponse = await api.createSession(req);
      const session: Session = {
        sessionId: res.sessionId,
        gameId: createGameId.trim(),
        state: res.state,
        metrics: { totalSpins: 0, totalPayout: 0 },
      };
      setSessions((prev) => [session, ...prev]);
      setSelectedId(res.sessionId);
      setDetailSession(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "PlaceBet" | "Spin" | "CashOut", amount?: Money) => {
    if (!selectedId) return;
    setLoading(true);
    setError(null);
    setLastResult(null);
    try {
      const req: PlayActionRequest = {
        sessionId: selectedId,
        action: amount ? { type: action, amount } : { type: action },
      };
      const res = await api.playAction(selectedId, req);
      setDetailSession(res.session);
      setLastResult(res);
      setSessions((prev) =>
        prev.map((s) => (s.sessionId === selectedId ? res.session : s))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sessions</h1>

      <section>
        <h2 className="text-lg font-medium mb-2">Create Session</h2>
        <form onSubmit={handleCreate} className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Game ID</label>
            <input
              type="text"
              value={createGameId}
              onChange={(e) => setCreateGameId(e.target.value)}
              placeholder="uuid"
              className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white w-64"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Behavior</label>
            <select
              value={createBehavior}
              onChange={(e) => setCreateBehavior(e.target.value)}
              className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white"
            >
              <option value="conservative">Conservative</option>
              <option value="aggressive">Aggressive</option>
              <option value="mixed_adaptive">Mixed Adaptive</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !createGameId.trim()}
            className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white"
          >
            Create
          </button>
        </form>
      </section>

      <ErrorDisplay error={error} />
      <Loading loading={loading} />

      <section>
        <h2 className="text-lg font-medium mb-2">Session List</h2>
        {sessions.length === 0 ? (
          <p className="text-slate-400">No sessions. Create one above.</p>
        ) : (
          <ul className="space-y-1">
            {sessions.map((s) => (
              <li key={s.sessionId}>
                <button
                  onClick={() => setSelectedId(s.sessionId)}
                  className={`text-left w-full px-3 py-2 rounded ${
                    selectedId === s.sessionId ? "bg-slate-600" : "hover:bg-slate-800"
                  }`}
                >
                  {s.sessionId.slice(0, 8)}… — {s.state} — spins: {s.metrics.totalSpins}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {detailSession && !loading && (
        <section className="border border-slate-600 rounded p-4">
          <h2 className="text-lg font-medium mb-4">Session Detail</h2>
          <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
            <div>State: <span className="font-mono">{detailSession.state}</span></div>
            <div>Game ID: <span className="font-mono">{detailSession.gameId}</span></div>
            <div>Total Spins: {detailSession.metrics.totalSpins}</div>
            <div>Total Payout: {detailSession.metrics.totalPayout}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleAction("Spin")}
              className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-sm"
            >
              Spin
            </button>
            <button
              onClick={() => handleAction("PlaceBet", { amount: 1, currency: "AUD" })}
              className="px-3 py-1 rounded bg-slate-600 hover:bg-slate-500 text-white text-sm"
            >
              PlaceBet $1
            </button>
            <button
              onClick={() => handleAction("CashOut")}
              className="px-3 py-1 rounded bg-slate-600 hover:bg-slate-500 text-white text-sm"
            >
              CashOut
            </button>
          </div>
          {lastResult?.result && (
            <div className="mt-4 p-2 rounded bg-slate-800 text-sm">
              Last result: payout {lastResult.result.payout?.amount ?? 0} {lastResult.result.payout?.currency ?? ""}
              {lastResult.result.symbols?.length ? ` | symbols: ${lastResult.result.symbols.join(", ")}` : ""}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
