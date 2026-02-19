import { useState } from "react";
import { api } from "../api/client";
import type { Wallet, WalletOperationRequest, Money } from "../../../agents/ts-client";
import { Loading } from "../components/Loading";
import { ErrorDisplay } from "../components/ErrorBoundary";

const formatMoney = (m: Money) => `${m.amount} ${m.currency}`;

/** Wallets page: balance display, debit/credit form, limit alerts. */
export function WalletsPage() {
  const [walletId, setWalletId] = useState("");
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [operation, setOperation] = useState<"debit" | "credit">("credit");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<"AUD" | "USD" | "EUR">("AUD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    const wid = walletId.trim();
    const amt = parseFloat(amount);
    if (!wid || isNaN(amt) || amt <= 0) return;

    setLoading(true);
    setError(null);
    const req: WalletOperationRequest = {
      operation,
      amount: { amount: amt, currency },
    };
    try {
      const res = await api.walletOperation(wid, req);
      setWallet(res.wallet);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const balanceLow = wallet && wallet.balance.amount < 10;
  const limitWarning = wallet && wallet.balance.amount >= wallet.dailyLimit.amount * 0.8;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Wallets</h1>

      <section>
        <h2 className="text-lg font-medium mb-2">Wallet ID</h2>
        <input
          type="text"
          value={walletId}
          onChange={(e) => setWalletId(e.target.value)}
          placeholder="Enter wallet UUID"
          className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white w-80"
        />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Debit / Credit</h2>
        <form onSubmit={handleOperation} className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Operation</label>
            <select
              value={operation}
              onChange={(e) => setOperation(e.target.value as "debit" | "credit")}
              className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white"
            >
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white w-24"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as "AUD" | "USD" | "EUR")}
              className="px-3 py-2 rounded bg-slate-800 border border-slate-600 text-white"
            >
              <option value="AUD">AUD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={loading || !walletId.trim() || !amount || parseFloat(amount) <= 0}
            className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white"
          >
            Submit
          </button>
        </form>
      </section>

      <ErrorDisplay error={error} />
      <Loading loading={loading} />

      {wallet && (
        <section className="border border-slate-600 rounded p-4">
          <h2 className="text-lg font-medium mb-4">Balance</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>Balance: <span className="font-mono">{formatMoney(wallet.balance)}</span></div>
            <div>Daily Limit: <span className="font-mono">{formatMoney(wallet.dailyLimit)}</span></div>
          </div>
          {(balanceLow || limitWarning) && (
            <div
              className={`mt-4 p-3 rounded text-sm ${
                balanceLow ? "bg-amber-900/50 border border-amber-600" : "bg-amber-900/30 border border-amber-700"
              }`}
              role="alert"
            >
              {balanceLow && <p>Balance is low (&lt; 10).</p>}
              {limitWarning && !balanceLow && <p>Approaching daily limit.</p>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
