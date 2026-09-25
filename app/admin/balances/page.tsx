"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import "./balances.css";

type Investor = {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
  account_status: string | null;
  verification_status: string | null;
};

type Wallet = {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
};

type ProfitBalance = {
  id: string;
  user_id: string;
  currency: string;
  balance: number;
};

type AdjustmentType = "credit" | "debit" | "bonus";
type Destination = "available" | "profit";

export default function AdminBalancesPage() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [profitBalances, setProfitBalances] = useState<ProfitBalance[]>([]);

  const [selectedInvestor, setSelectedInvestor] =
    useState<Investor | null>(null);

  const [search, setSearch] = useState("");
  const [currency, setCurrency] = useState("USDT");

  const [adjustmentType, setAdjustmentType] =
    useState<AdjustmentType>("credit");

  const [destination, setDestination] =
    useState<Destination>("available");

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    initialize();
  }, []);

  async function initialize() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/crypto-investment-platform/login";
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("admin_users")
        .select("id, role, is_active")
        .eq("id", user.id)
        .eq("is_active", true)
        .in("role", ["admin", "manager"])
        .maybeSingle();

      if (adminError) {
        throw adminError;
      }

      if (!admin) {
        window.location.href = "/crypto-investment-platform/dashboard";
        return;
      }

      await Promise.all([
        fetchInvestors(),
        fetchWallets(),
        fetchProfitBalances(),
      ]);
    } catch (err) {
      console.error(err);
      setError("Unable to initialize balance management.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchInvestors() {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, username, country, account_status, verification_status"
      )
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      throw error;
    }

    setInvestors(data || []);
  }

  async function fetchWallets() {
    const { data, error } = await supabase
      .from("wallet_balances")
      .select("id, user_id, currency, balance")
      .order("currency", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    setWallets(data || []);
  }

  async function fetchProfitBalances() {
    const { data, error } = await supabase
      .from("investment_profit_balances")
      .select("id, user_id, currency, balance")
      .order("currency", {
        ascending: true,
      });

    if (error) {
      throw error;
    }

    setProfitBalances(data || []);
  }

  const filteredInvestors = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return investors.slice(0, 10);
    }

    return investors
      .filter((investor) => {
        return [
          investor.full_name,
          investor.username,
          investor.country,
          investor.id,
        ]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(query)
          );
      })
      .slice(0, 10);
  }, [investors, search]);

  const selectedWallet = useMemo(() => {
    if (!selectedInvestor) {
      return null;
    }

    return (
      wallets.find(
        (wallet) =>
          wallet.user_id === selectedInvestor.id &&
          wallet.currency === currency
      ) || null
    );
  }, [wallets, selectedInvestor, currency]);

  const selectedProfitBalance = useMemo(() => {
    if (!selectedInvestor) {
      return null;
    }

    return (
      profitBalances.find(
        (profit) =>
          profit.user_id === selectedInvestor.id &&
          profit.currency === currency
      ) || null
    );
  }, [profitBalances, selectedInvestor, currency]);

  const availableBalance = selectedWallet?.balance ?? 0;
  const investmentProfit = selectedProfitBalance?.balance ?? 0;

  function selectInvestor(investor: Investor) {
    setSelectedInvestor(investor);
    setSearch("");
    setMessage("");
    setError("");
  }

  function clearInvestor() {
    setSelectedInvestor(null);
    setAmount("");
    setReason("");
    setMessage("");
    setError("");
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(Number(value) || 0);
  }

  async function refreshBalances() {
    await Promise.all([
      fetchWallets(),
      fetchProfitBalances(),
    ]);
  }

  async function submitAdjustment() {
    setMessage("");
    setError("");

    if (!selectedInvestor) {
      setError("Select an investor first.");
      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Enter a valid amount greater than zero.");
      return;
    }

    if (reason.trim().length < 3) {
      setError("Enter a clear reason for this adjustment.");
      return;
    }

    /*
     * Bonus is treated as a credit.
     *
     * The database only needs:
     * credit = add
     * debit  = subtract
     */
    const rpcDirection =
      adjustmentType === "debit" ? "debit" : "credit";

    /*
     * Validate debit against the correct balance.
     */
    if (rpcDirection === "debit") {
      if (
        destination === "available" &&
        numericAmount > availableBalance
      ) {
        setError(
          "The debit exceeds the investor's available balance."
        );
        return;
      }

      if (
        destination === "profit" &&
        numericAmount > investmentProfit
      ) {
        setError(
          "The debit exceeds the investor's investment profit balance."
        );
        return;
      }
    }

    const actionName =
      adjustmentType === "bonus"
        ? "bonus"
        : adjustmentType === "credit"
        ? "credit"
        : "debit";

    const destinationName =
      destination === "available"
        ? "Available Balance"
        : "Investment Profit";

    const confirmed = window.confirm(
      `Confirm ${actionName} of ${numericAmount} ${currency} to ${destinationName}?`
    );

    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Authentication required.");
      }

      /*
       * Confirm financial administrator access.
       */
      const { data: admin, error: adminError } =
        await supabase
          .from("admin_users")
          .select("id, role, is_active")
          .eq("id", user.id)
          .eq("is_active", true)
          .in("role", ["admin", "manager"])
          .maybeSingle();

      if (adminError) {
        throw adminError;
      }

      if (!admin) {
        throw new Error(
          "Administrator access is required."
        );
      }

      let rpcData: any = null;
      let rpcError: any = null;

      /*
       * AVAILABLE BALANCE
       *
       * Uses:
       * admin_adjust_wallet_balance(...)
       */
      if (destination === "available") {
        const result = await supabase.rpc(
          "admin_adjust_wallet_balance",
          {
            p_user_id: selectedInvestor.id,
            p_currency: currency,
            p_amount: numericAmount,
            p_direction: rpcDirection,
            p_note:
              reason.trim() ||
              (adjustmentType === "bonus"
                ? "Bonus credited by administrator."
                : null),
          }
        );

        rpcData = result.data;
        rpcError = result.error;
      }

      /*
       * INVESTMENT PROFIT
       *
       * Uses:
       * admin_adjust_investment_profit_balance(...)
       */
      if (destination === "profit") {
        const profitNote =
          adjustmentType === "bonus"
            ? `Investment profit bonus: ${reason.trim()}`
            : reason.trim();

        const result = await supabase.rpc(
          "admin_adjust_investment_profit_balance",
          {
            p_user_id: selectedInvestor.id,
            p_currency: currency,
            p_amount: numericAmount,
            p_direction: rpcDirection,
            p_note: profitNote,
          }
        );

        rpcData = result.data;
        rpcError = result.error;
      }

      if (rpcError) {
        console.error(
          "Balance RPC error:",
          rpcError
        );

        throw new Error(
          rpcError.message ||
            "The financial operation was rejected."
        );
      }

      if (!rpcData?.success) {
        throw new Error(
          "The balance adjustment was not completed."
        );
      }

      const operationText =
        adjustmentType === "bonus"
          ? "issued bonus"
          : adjustmentType === "credit"
          ? "credited"
          : "debited";

      setMessage(
        `Successfully ${operationText} ${numericAmount} ${currency} ${destination === "available" ? "to the available balance" : "to investment profit"}.`
      );

      setAmount("");
      setReason("");

      /*
       * Refresh both balance tables so the displayed
       * numbers update immediately.
       */
      await refreshBalances();
    } catch (err: any) {
      console.error(err);

      setError(
        err?.message ||
          "Unable to complete the balance adjustment."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="balances-loading">
        <div className="balances-loading-orb">
          <div className="balances-loading-ring" />
        </div>

        <h2>Loading Financial Control</h2>
        <p>Verifying administrator access...</p>
      </main>
    );
  }

  return (
    <main className="balances-page">
      <div className="balances-orb balances-orb-one" />
      <div className="balances-orb balances-orb-two" />

      <div className="balances-container">

        <header className="balances-header">
          <div>
            <div className="balances-eyebrow">
              <span />
              FINANCIAL OPERATIONS
            </div>

            <h1>
              Balance <span>Management</span>
            </h1>

            <p>
              Securely manage investor balances,
              bonuses, and investment profit with a
              complete transaction and audit trail.
            </p>
          </div>

          <Link
            href="/admin"
            className="balances-back-button"
          >
            ← Control Center
          </Link>
        </header>

        {message && (
          <div className="balances-alert success">
            <span className="alert-mark">✓</span>

            <div>
              <strong>
                Adjustment completed
              </strong>

              <p>{message}</p>
            </div>

            <button
              onClick={() => setMessage("")}
              type="button"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="balances-alert error">
            <span className="alert-mark">!</span>

            <div>
              <strong>
                Operation could not be completed
              </strong>

              <p>{error}</p>
            </div>

            <button
              onClick={() => setError("")}
              type="button"
            >
              ×
            </button>
          </div>
        )}

        <section className="balances-workspace">

          {/* INVESTOR PANEL */}

          <div className="balances-panel investor-panel">

            <div className="panel-heading">
              <span>01 / INVESTOR</span>

              <h2>Select Account</h2>

              <p>
                Search for the investor whose financial
                account you want to manage.
              </p>
            </div>

            <div className="investor-search">
              <span>⌕</span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search name, username or account ID..."
              />
            </div>

            {!selectedInvestor && (
              <div className="investor-results">
                {filteredInvestors.length === 0 ? (
                  <div className="no-investors">
                    No matching investor accounts.
                  </div>
                ) : (
                  filteredInvestors.map((investor) => (
                    <button
                      key={investor.id}
                      type="button"
                      className="investor-result"
                      onClick={() =>
                        selectInvestor(investor)
                      }
                    >
                      <div className="investor-result-avatar">
                        {(
                          investor.full_name ||
                          investor.username ||
                          "U"
                        )
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>

                      <div className="investor-result-info">
                        <strong>
                          {investor.full_name ||
                            investor.username ||
                            "Unnamed Investor"}
                        </strong>

                        <span>
                          @
                          {investor.username ||
                            "account"}{" "}
                          ·{" "}
                          {investor.country ||
                            "Unknown country"}
                        </span>
                      </div>

                      <span className="result-arrow">
                        →
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedInvestor && (
              <div className="selected-investor">

                <div className="selected-investor-top">

                  <div className="selected-avatar">
                    {(
                      selectedInvestor.full_name ||
                      selectedInvestor.username ||
                      "U"
                    )
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>

                  <div>
                    <strong>
                      {selectedInvestor.full_name ||
                        selectedInvestor.username ||
                        "Unnamed Investor"}
                    </strong>

                    <span>
                      @
                      {selectedInvestor.username ||
                        "account"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={clearInvestor}
                  >
                    Change
                  </button>

                </div>

                <div className="investor-meta">

                  <div>
                    <span>ACCOUNT STATUS</span>

                    <strong>
                      {(
                        selectedInvestor.account_status ||
                        "unknown"
                      ).toUpperCase()}
                    </strong>
                  </div>

                  <div>
                    <span>VERIFICATION</span>

                    <strong>
                      {(
                        selectedInvestor.verification_status ||
                        "unknown"
                      ).toUpperCase()}
                    </strong>
                  </div>

                </div>

                <div className="wallet-overview">

                  <div className="wallet-overview-card">

                    <span>AVAILABLE</span>

                    <strong>
                      {formatMoney(
                        availableBalance
                      )}
                    </strong>

                    <small>{currency}</small>

                  </div>

                  <div className="wallet-overview-card profit">

                    <span>
                      INVESTMENT PROFIT
                    </span>

                    <strong>
                      {formatMoney(
                        investmentProfit
                      )}
                    </strong>

                    <small>{currency}</small>

                  </div>

                </div>

              </div>
            )}

          </div>

          {/* ADJUSTMENT PANEL */}

          <div className="balances-panel adjustment-panel">

            <div className="panel-heading">

              <span>02 / ADJUSTMENT</span>

              <h2>Financial Action</h2>

              <p>
                All changes are processed server-side
                and recorded in the financial ledger.
              </p>

            </div>

            <div className="adjustment-form">

              {/* CURRENCY */}

              <div className="form-section">

                <label>Currency</label>

                <select
                  value={currency}
                  onChange={(event) =>
                    setCurrency(event.target.value)
                  }
                >
                  <option value="USDT">
                    USDT
                  </option>

                  <option value="BTC">
                    BTC
                  </option>

                  <option value="ETH">
                    ETH
                  </option>

                  <option value="USDC">
                    USDC
                  </option>
                </select>

              </div>

              {/* ACTION */}

              <div className="form-section">

                <label>Action</label>

                <div className="action-selector">

                  <button
                    type="button"
                    className={
                      adjustmentType === "credit"
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setAdjustmentType("credit")
                    }
                  >
                    <strong>
                      Credit
                    </strong>

                    <span>
                      Add funds
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      adjustmentType === "debit"
                        ? "selected debit"
                        : "debit"
                    }
                    onClick={() =>
                      setAdjustmentType("debit")
                    }
                  >
                    <strong>
                      Debit
                    </strong>

                    <span>
                      Remove funds
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      adjustmentType === "bonus"
                        ? "selected bonus"
                        : "bonus"
                    }
                    onClick={() =>
                      setAdjustmentType("bonus")
                    }
                  >
                    <strong>
                      Bonus
                    </strong>

                    <span>
                      Reward investor
                    </span>
                  </button>

                </div>

              </div>

              {/* DESTINATION */}

              <div className="form-section">

                <label>
                  Destination
                </label>

                <div className="destination-selector">

                  <button
                    type="button"
                    className={
                      destination === "available"
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setDestination("available")
                    }
                  >
                    <span className="destination-icon">
                      $
                    </span>

                    <span>
                      <strong>
                        Available Balance
                      </strong>

                      <small>
                        Spendable account funds
                      </small>
                    </span>
                  </button>

                  <button
                    type="button"
                    className={
                      destination === "profit"
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      setDestination("profit")
                    }
                  >
                    <span className="destination-icon">
                      ↗
                    </span>

                    <span>
                      <strong>
                        Investment Profit
                      </strong>

                      <small>
                        Separate profit balance
                      </small>
                    </span>
                  </button>

                </div>

              </div>

              {/* AMOUNT */}

              <div className="form-section">

                <label>
                  Amount
                </label>

                <div className="amount-input">

                  <span>
                    {currency}
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    placeholder="0.00"
                  />

                </div>

              </div>

              {/* REASON */}

              <div className="form-section">

                <label>
                  Reason <span>*</span>
                </label>

                <textarea
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  placeholder="Enter the reason for this financial adjustment..."
                  rows={4}
                />

              </div>

              {/* WARNING */}

              <div className="financial-warning">

                <span>◆</span>

                <div>

                  <strong>
                    Financial operation
                  </strong>

                  <p>
                    This action changes the investor's
                    financial balance. The operation will
                    be recorded in the transaction ledger
                    and administrator audit log.
                  </p>

                </div>

              </div>

              {/* EXECUTE */}

              <button
                type="button"
                className="execute-adjustment"
                disabled={
                  saving ||
                  !selectedInvestor
                }
                onClick={submitAdjustment}
              >

                {saving ? (
                  <>
                    <span className="button-spinner" />

                    Processing secure operation...
                  </>
                ) : (
                  <>
                    Execute Financial Action

                    <span>→</span>
                  </>
                )}

              </button>

            </div>

          </div>

        </section>

        {/* SECURITY */}

        <section className="balances-security">

          <div className="security-icon">
            ✓
          </div>

          <div>

            <strong>
              Server-side financial controls enabled
            </strong>

            <p>
              Balance adjustments cannot be performed
              directly from the browser. Each operation
              requires authenticated administrator access,
              validates available funds, updates the
              appropriate balance atomically, creates a
              transaction record and writes an audit event.
            </p>

          </div>

          <div className="security-badge">
            PROTECTED
          </div>

        </section>

      </div>
    </main>
  );
}
