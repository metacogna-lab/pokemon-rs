import { useState } from "react";
import { api } from "../api/client";
import type { GameFingerprintResponse } from "../../../agents/ts-client";
import { Loading } from "../components/Loading";
import { ErrorDisplay } from "../components/ErrorBoundary";

/** Symbol distribution bar chart using live symbolMap Record<string,number>. */
function SymbolChart({ symbolMap }: { symbolMap: Record<string, number> }) {
  const entries = Object.entries(symbolMap);
  if (entries.length === 0) return <p className="text-slate-400 text-sm">No symbol data.</p>;
  const maxVal = Math.max(...entries.map(([, v]) => v), 0.01);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Symbol distribution</h3>
      <div className="space-y-1">
        {entries.map(([sym, count]) => (
          <div key={sym} className="flex items-center gap-2 text-sm">
            <span className="w-24 truncate font-mono">{sym}</span>
            <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded"
                style={{ width: `${(count / maxVal) * 100}%` }}
              />
            </div>
            <span className="text-slate-400 w-16 text-right">{count.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Key-value property grid for statisticalProfile. */
function ProfileGrid({ profile }: { profile: Record<string, number> }) {
  const entries = Object.entries(profile);
  if (entries.length === 0) return <p className="text-slate-400 text-sm">No profile data.</p>;

  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {entries.map(([key, val]) => (
        <div key={key} className="flex justify-between border-b border-slate-700 py-1">
          <span className="text-slate-300 capitalize">{key}</span>
          <span className="font-mono text-white">{val.toFixed(4)}</span>
        </div>
      ))}
    </div>
  );
}

/** Fingerprints page: search by game ID, display live fingerprint from API. */
export function FingerprintsPage() {
  const [gameId, setGameId] = useState("");
  const [fingerprint, setFingerprint] = useState<GameFingerprintResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const gid = gameId.trim();
    if (!gid) return;
    setLoading(true);
    setError(null);
    setFingerprint(null);
    try {
      const result = await api.getGameFingerprint(gid);
      setFingerprint(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Fingerprints</h1>

      <section>
        <h2 className="text-lg font-medium mb-2">Search by Game ID</h2>
        <form onSubmit={handleSearch} className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Game ID</label>
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              placeholder="uuid"
              className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white w-80 font-mono text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !gameId.trim()}
            className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white"
          >
            Fetch
          </button>
        </form>
      </section>

      <ErrorDisplay error={error} />
      <Loading loading={loading} />

      {fingerprint && (
        <section className="border border-slate-600 rounded p-4 space-y-4">
          <h2 className="text-lg font-medium">Fingerprint Detail</h2>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Game ID: <span className="font-mono">{fingerprint.gameId}</span></div>
            <div className="col-span-2">
              RNG Signature:{" "}
              <span className="font-mono text-xs break-all text-slate-300">
                {fingerprint.rngSignature}
              </span>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">Statistical Profile</h3>
            <ProfileGrid profile={fingerprint.statisticalProfile} />
          </div>

          <SymbolChart symbolMap={fingerprint.symbolMap} />
        </section>
      )}
    </div>
  );
}
