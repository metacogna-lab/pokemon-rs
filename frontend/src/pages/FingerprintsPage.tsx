import { useState } from "react";
import { MOCK_FINGERPRINTS } from "../data/mockFingerprints";
import type { GameFingerprint } from "../types/fingerprint";

/** Symbol distribution bar (CSS-only). */
function SymbolChart({ symbolMap }: { symbolMap: GameFingerprint["symbolMap"] }) {
  const entries = Object.entries(symbolMap);
  const maxFreq = Math.max(...entries.map(([, v]) => v.frequency ?? 0), 0.01);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Symbol distribution</h3>
      <div className="space-y-1">
        {entries.map(([sym, data]) => (
          <div key={sym} className="flex items-center gap-2 text-sm">
            <span className="w-24 truncate">{sym}</span>
            <div className="flex-1 h-4 bg-slate-800 rounded overflow-hidden">
              <div
                className="h-full bg-sky-500 rounded"
                style={{
                  width: `${((data.frequency ?? 0) / maxFreq) * 100}%`,
                }}
              />
            </div>
            <span className="text-slate-400 w-16">
              {(data.frequency ?? 0).toFixed(2)} / {data.payout}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Fingerprints page: game list, detail, symbol chart. */
export function FingerprintsPage() {
  const [selected, setSelected] = useState<GameFingerprint | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Fingerprints</h1>

      <section>
        <h2 className="text-lg font-medium mb-2">Games</h2>
        <ul className="space-y-1">
          {MOCK_FINGERPRINTS.map((fp) => (
            <li key={fp.gameId}>
              <button
                onClick={() => setSelected(fp)}
                className={`text-left w-full px-3 py-2 rounded ${
                  selected?.gameId === fp.gameId ? "bg-slate-600" : "hover:bg-slate-800"
                }`}
              >
                {fp.name ?? fp.gameId}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {selected && (
        <section className="border border-slate-600 rounded p-4 space-y-4">
          <h2 className="text-lg font-medium">Fingerprint detail</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Game ID: <span className="font-mono">{selected.gameId}</span></div>
            <div>RTP: {selected.statisticalProfile.rtp ?? "—"}</div>
            <div>Volatility: {selected.statisticalProfile.volatility ?? "—"}</div>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">RNG signature</h3>
            <pre className="p-2 rounded bg-slate-800 text-xs overflow-x-auto">
              {JSON.stringify(selected.rngSignature, null, 2)}
            </pre>
          </div>
          <div>
            <h3 className="text-sm font-medium mb-2">Symbol map</h3>
            <pre className="p-2 rounded bg-slate-800 text-xs overflow-x-auto">
              {JSON.stringify(selected.symbolMap, null, 2)}
            </pre>
          </div>
          <SymbolChart symbolMap={selected.symbolMap} />
        </section>
      )}
    </div>
  );
}
