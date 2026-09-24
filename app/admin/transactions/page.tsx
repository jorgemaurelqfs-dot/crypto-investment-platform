"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import "./transaction.css";

type Transaction = {
  id: string;
  user_id: string;
  type: string;
  amount: number | string | null;
  currency: string | null;
  reference: string | null;
  description: string | null;
  direction: string | null;
  balance_source: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  country: string | null;
};

type UserMap = Record<string, Profile>;

type FilterState = {
  search: string;
  type: string;
  direction: string;
  source: string;
  currency: string;
  date: string;
};

const PAGE_SIZE = 15;

const TRANSACTION_TYPES = [
  "deposit",
  "withdrawal",
  "investment",
  "return",
  "referral",
  "bonus",
  "fee",
  "adjustment",
];

const DIRECTIONS = ["credit", "debit"];

const BALANCE_SOURCES = [
  "wallet",
  "investment",
  "investment_profit",
  "referral",
  "fee",
  "system",
];

function formatMoney(
  amount: number | string | null | undefined,
  currency = "USD"
) {
  const value = Number(amount || 0);
  const code = String(currency || "USD").toUpperCase();

  const cryptoCurrencies = [
    "USDT",
    "USDC",
    "BTC",
    "ETH",
    "BNB",
    "SOL",
    "XRP",
    "ADA",
    "DOGE",
    "TRX",
    "LTC",
    "DOT",
    "AVAX",
    "MATIC",
    "POL",
    "LINK",
    "UNI",
    "BCH",
    "XLM",
    "ATOM",
    "APT",
    "ARB",
    "OP",
  ];

  if (cryptoCurrencies.includes(code)) {
    return `${code} ${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    })}`;
  }

  const fiatCurrencies = [
    "USD",
    "EUR",
    "GBP",
    "NGN",
    "CAD",
    "AUD",
    "CHF",
    "JPY",
    "CNY",
    "AED",
    "SAR",
    "ZAR",
    "INR",
    "GHS",
    "KES",
    "TRY",
    "NOK",
    "SEK",
    "DKK",
    "NZD",
    "SGD",
    "HKD",
    "PLN",
    "CZK",
    "HUF",
    "BRL",
    "MXN",
  ];

  if (fiatCurrencies.includes(code)) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  }

  return `${code} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  })}`;
}

function formatCompactAmount(
  amount: number | string | null | undefined,
  currency = "USD"
) {
  const value = Number(amount || 0);
  const code = String(currency || "USD").toUpperCase();

  if (Math.abs(value) >= 1000000000) {
    return `${code} ${(value / 1000000000).toFixed(2)}B`;
  }

  if (Math.abs(value) >= 1000000) {
    return `${code} ${(value / 1000000).toFixed(2)}M`;
  }

  if (Math.abs(value) >= 1000) {
    return `${code} ${(value / 1000).toFixed(2)}K`;
  }

  return formatMoney(value, code);
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateString: string | null | undefined) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(dateString: string | null | undefined) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortId(value: string | null | undefined, length = 8) {
  if (!value) return "—";

  if (value.length <= length * 2 + 3) {
    return value;
  }

  return `${value.slice(0, length)}...${value.slice(-length)}`;
}

function titleCase(value: string | null | undefined) {
  if (!value) return "Unknown";

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getTypeIcon(type: string | null | undefined) {
  switch (String(type).toLowerCase()) {
    case "deposit":
      return "↓";

    case "withdrawal":
      return "↑";

    case "investment":
      return "◈";

    case "return":
      return "↗";

    case "referral":
      return "♢";

    case "bonus":
      return "✦";

    case "fee":
      return "⌁";

    case "adjustment":
      return "±";

    default:
      return "•";
  }
}

function getTypeClass(type: string | null | undefined) {
  switch (String(type).toLowerCase()) {
    case "deposit":
      return "type-deposit";

    case "withdrawal":
      return "type-withdrawal";

    case "investment":
      return "type-investment";

    case "return":
      return "type-return";

    case "referral":
      return "type-referral";

    case "bonus":
      return "type-bonus";

    case "fee":
      return "type-fee";

    case "adjustment":
      return "type-adjustment";

    default:
      return "type-default";
  }
}

function getSourceClass(source: string | null | undefined) {
  switch (String(source).toLowerCase()) {
    case "wallet":
      return "source-wallet";

    case "investment":
      return "source-investment";

    case "investment_profit":
      return "source-profit";

    case "referral":
      return "source-referral";

    case "fee":
      return "source-fee";

    case "system":
      return "source-system";

    default:
      return "source-default";
  }
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [profiles, setProfiles] = useState<UserMap>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    type: "all",
    direction: "all",
    source: "all",
    currency: "all",
    date: "all",
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [copied, setCopied] = useState("");

  const loadTransactions = useCallback(
    async (showRefresh = false) => {
      try {
        setError("");

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        /*
         * IMPORTANT:
         * Transactions are loaded through the secure admin RPC
         * instead of directly querying public.transactions.
         *
         * This allows the database to verify that the current
         * authenticated user is a financial administrator.
         */
        const { data, error: transactionError } =
          await supabase.rpc("admin_get_transactions");

        if (transactionError) {
          throw transactionError;
        }

        const transactionRows = (data || []) as Transaction[];

        setTransactions(transactionRows);

        /*
         * Load profile information separately.
         *
         * The transaction ledger does not depend on this query.
         * If profiles are protected by RLS, transactions will
         * still appear and the page will fall back to the UUID.
         */
        const userIds = Array.from(
          new Set(
            transactionRows
              .map((transaction) => transaction.user_id)
              .filter(Boolean)
          )
        );

        if (userIds.length > 0) {
          const { data: profileRows, error: profileError } =
            await supabase
              .from("profiles")
              .select("id,full_name,username,country")
              .in("id", userIds);

          if (!profileError && profileRows) {
            const profileMap: UserMap = {};

            (profileRows as Profile[]).forEach((profile) => {
              profileMap[profile.id] = profile;
            });

            setProfiles(profileMap);
          }
        } else {
          setProfiles({});
        }
      } catch (err: any) {
        console.error("Transaction loading error:", err);

        setTransactions([]);

        setError(
          err?.message ||
            "Unable to load the transaction ledger. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const currencies = useMemo(() => {
    const values = transactions
      .map((transaction) =>
        String(transaction.currency || "").toUpperCase()
      )
      .filter(Boolean);

    return Array.from(new Set(values)).sort();
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return transactions.filter((transaction) => {
      const profile = profiles[transaction.user_id];

      const searchableText = [
        transaction.id,
        transaction.user_id,
        transaction.reference,
        transaction.description,
        transaction.type,
        transaction.currency,
        transaction.direction,
        transaction.balance_source,
        profile?.full_name,
        profile?.username,
        profile?.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (search && !searchableText.includes(search)) {
        return false;
      }

      if (
        filters.type !== "all" &&
        String(transaction.type).toLowerCase() !== filters.type
      ) {
        return false;
      }

      if (
        filters.direction !== "all" &&
        String(transaction.direction).toLowerCase() !==
          filters.direction
      ) {
        return false;
      }

      if (
        filters.source !== "all" &&
        String(transaction.balance_source).toLowerCase() !==
          filters.source
      ) {
        return false;
      }

      if (
        filters.currency !== "all" &&
        String(transaction.currency).toUpperCase() !==
          filters.currency
      ) {
        return false;
      }

      if (filters.date !== "all") {
        const transactionDate = new Date(transaction.created_at);
        const now = new Date();

        if (filters.date === "today") {
          const start = new Date(now);

          start.setHours(0, 0, 0, 0);

          if (transactionDate < start) {
            return false;
          }
        }

        if (filters.date === "7days") {
          const start = new Date(now);

          start.setDate(start.getDate() - 7);

          if (transactionDate < start) {
            return false;
          }
        }

        if (filters.date === "30days") {
          const start = new Date(now);

          start.setDate(start.getDate() - 30);

          if (transactionDate < start) {
            return false;
          }
        }
      }

      return true;
    });
  }, [transactions, profiles, filters]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / PAGE_SIZE)
  );

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;

    return filteredTransactions.slice(start, start + PAGE_SIZE);
  }, [filteredTransactions, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    filters.search,
    filters.type,
    filters.direction,
    filters.source,
    filters.currency,
    filters.date,
  ]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const statistics = useMemo(() => {
    let credits = 0;
    let debits = 0;

    let deposits = 0;
    let withdrawals = 0;
    let investments = 0;
    let returns = 0;

    const currencyVolumes: Record<
      string,
      {
        credit: number;
        debit: number;
      }
    > = {};

    transactions.forEach((transaction) => {
      const amount = Number(transaction.amount || 0);

      const currency = String(
        transaction.currency || "UNKNOWN"
      ).toUpperCase();

      if (!currencyVolumes[currency]) {
        currencyVolumes[currency] = {
          credit: 0,
          debit: 0,
        };
      }

      const direction = String(
        transaction.direction || ""
      ).toLowerCase();

      const type = String(transaction.type || "").toLowerCase();

      if (direction === "credit") {
        credits += amount;
        currencyVolumes[currency].credit += amount;
      }

      if (direction === "debit") {
        debits += amount;
        currencyVolumes[currency].debit += amount;
      }

      if (type === "deposit") {
        deposits += 1;
      }

      if (type === "withdrawal") {
        withdrawals += 1;
      }

      if (type === "investment") {
        investments += 1;
      }

      if (type === "return") {
        returns += 1;
      }
    });

    return {
      total: transactions.length,
      credits,
      debits,
      deposits,
      withdrawals,
      investments,
      returns,
      currencyVolumes,
    };
  }, [transactions]);

  const topCurrencies = useMemo(() => {
    return Object.entries(statistics.currencyVolumes)
      .map(([currency, values]) => ({
        currency,
        credit: values.credit,
        debit: values.debit,
        total: values.credit + values.debit,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [statistics.currencyVolumes]);

  const getUserName = (userId: string) => {
    const profile = profiles[userId];

    if (!profile) {
      return shortId(userId, 7);
    }

    return (
      profile.full_name ||
      profile.username ||
      shortId(userId, 7)
    );
  };

  const getUserSecondary = (userId: string) => {
    const profile = profiles[userId];

    if (!profile) {
      return `UID ${shortId(userId, 8)}`;
    }

    if (profile.username) {
      return `@${profile.username}`;
    }

    if (profile.country) {
      return profile.country;
    }

    return `UID ${shortId(userId, 8)}`;
  };

  const handleFilterChange = (
    field: keyof FilterState,
    value: string
  ) => {
    setFilters((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      type: "all",
      direction: "all",
      source: "all",
      currency: "all",
      date: "all",
    });
  };

  const copyValue = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);

      setCopied(key);

      setTimeout(() => {
        setCopied("");
      }, 1800);
    } catch {
      setCopied("");
    }
  };

  const openTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const closeTransaction = () => {
    setSelectedTransaction(null);
  };

  const hasActiveFilters =
    filters.search ||
    filters.type !== "all" ||
    filters.direction !== "all" ||
    filters.source !== "all" ||
    filters.currency !== "all" ||
    filters.date !== "all";

  return (
    <main className="transactions-page">
      <div className="transactions-background-grid" />

      <div className="transactions-glow transactions-glow-one" />

      <div className="transactions-glow transactions-glow-two" />

      <section className="transactions-shell">
        {/* HEADER */}

        <header className="transactions-header">
          <div className="transactions-header-left">
            <div className="command-icon">
              <span>⌁</span>
            </div>

            <div>
              <div className="eyebrow">
                FINANCIAL OPERATIONS
              </div>

              <h1>Transaction Command Center</h1>

              <p>
                Monitor, search and inspect every financial
                movement across the platform.
              </p>
            </div>
          </div>

          <div className="header-actions">
            <div className="live-indicator">
              <span className="live-dot" />
              <span>LEDGER ONLINE</span>
            </div>

            <button
              type="button"
              className={`refresh-button ${
                refreshing ? "is-refreshing" : ""
              }`}
              onClick={() => loadTransactions(true)}
              disabled={refreshing}
            >
              <span className="refresh-icon">↻</span>

              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </header>

        {/* ERROR */}

        {error && (
          <div className="transaction-error">
            <div className="error-symbol">!</div>

            <div>
              <strong>Ledger Access Error</strong>

              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() => loadTransactions()}
            >
              Retry
            </button>
          </div>
        )}

        {/* MAIN STATISTICS */}

        <section className="stats-grid">
          <div className="stat-card stat-card-primary">
            <div className="stat-top">
              <span className="stat-label">TOTAL EVENTS</span>

              <span className="stat-icon">⌁</span>
            </div>

            <div className="stat-value">
              {loading
                ? "—"
                : statistics.total.toLocaleString()}
            </div>

            <div className="stat-description">
              All recorded transactions
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">CREDIT FLOW</span>

              <span className="stat-icon credit-icon">↓</span>
            </div>

            <div className="stat-value stat-credit">
              {loading
                ? "—"
                : formatCompactAmount(statistics.credits)}
            </div>

            <div className="stat-description">
              Funds entering balances
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">DEBIT FLOW</span>

              <span className="stat-icon debit-icon">↑</span>
            </div>

            <div className="stat-value stat-debit">
              {loading
                ? "—"
                : formatCompactAmount(statistics.debits)}
            </div>

            <div className="stat-description">
              Funds leaving balances
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-top">
              <span className="stat-label">DEPOSITS</span>

              <span className="stat-icon deposit-icon">＋</span>
            </div>

            <div className="stat-value">
              {loading
                ? "—"
                : statistics.deposits.toLocaleString()}
            </div>

            <div className="stat-description">
              Deposit events recorded
            </div>
          </div>
        </section>

        {/* SECONDARY METRICS */}

        <section className="secondary-stats">
          <div className="secondary-stat">
            <div className="secondary-stat-icon withdrawal">
              ↑
            </div>

            <div>
              <span>Withdrawals</span>

              <strong>
                {loading
                  ? "—"
                  : statistics.withdrawals.toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="secondary-stat">
            <div className="secondary-stat-icon investment">
              ◈
            </div>

            <div>
              <span>Investments</span>

              <strong>
                {loading
                  ? "—"
                  : statistics.investments.toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="secondary-stat">
            <div className="secondary-stat-icon returns">
              ↗
            </div>

            <div>
              <span>Returns</span>

              <strong>
                {loading
                  ? "—"
                  : statistics.returns.toLocaleString()}
              </strong>
            </div>
          </div>

          <div className="secondary-stat">
            <div className="secondary-stat-icon users">
              ◎
            </div>

            <div>
              <span>Visible Results</span>

              <strong>
                {loading
                  ? "—"
                  : filteredTransactions.length.toLocaleString()}
              </strong>
            </div>
          </div>
        </section>

        {/* CURRENCY MONITOR */}

        {!loading && topCurrencies.length > 0 && (
          <section className="currency-monitor">
            <div className="section-heading">
              <div>
                <span className="section-eyebrow">
                  ASSET FLOW MONITOR
                </span>

                <h2>Currency Activity</h2>
              </div>

              <span className="section-status">
                {topCurrencies.length} ASSETS
              </span>
            </div>

            <div className="currency-grid">
              {topCurrencies.map((item) => (
                <div
                  className="currency-card"
                  key={item.currency}
                >
                  <div className="currency-card-top">
                    <div className="currency-symbol">
                      {item.currency.slice(0, 3)}
                    </div>

                    <span>{item.currency}</span>
                  </div>

                  <div className="currency-total">
                    {formatCompactAmount(
                      item.total,
                      item.currency
                    )}
                  </div>

                  <div className="currency-breakdown">
                    <span className="currency-credit">
                      <i />

                      Credit{" "}
                      {formatCompactAmount(
                        item.credit,
                        item.currency
                      )}
                    </span>

                    <span className="currency-debit">
                      <i />

                      Debit{" "}
                      {formatCompactAmount(
                        item.debit,
                        item.currency
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FILTER PANEL */}

        <section className="filter-panel">
          <div className="filter-heading">
            <div>
              <span className="section-eyebrow">
                TRANSACTION INTELLIGENCE
              </span>

              <h2>Ledger Explorer</h2>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="clear-filters"
                onClick={resetFilters}
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="filter-grid">
            <div className="search-field">
              <span className="search-icon">⌕</span>

              <input
                type="text"
                placeholder="Search user, ID, reference, description..."
                value={filters.search}
                onChange={(event) =>
                  handleFilterChange(
                    "search",
                    event.target.value
                  )
                }
              />

              {filters.search && (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() =>
                    handleFilterChange("search", "")
                  }
                >
                  ×
                </button>
              )}
            </div>

            <div className="select-field">
              <label>TYPE</label>

              <select
                value={filters.type}
                onChange={(event) =>
                  handleFilterChange(
                    "type",
                    event.target.value
                  )
                }
              >
                <option value="all">All Types</option>

                {TRANSACTION_TYPES.map((type) => (
                  <option value={type} key={type}>
                    {titleCase(type)}
                  </option>
                ))}
              </select>
            </div>

            <div className="select-field">
              <label>FLOW</label>

              <select
                value={filters.direction}
                onChange={(event) =>
                  handleFilterChange(
                    "direction",
                    event.target.value
                  )
                }
              >
                <option value="all">All Directions</option>

                {DIRECTIONS.map((direction) => (
                  <option
                    value={direction}
                    key={direction}
                  >
                    {titleCase(direction)}
                  </option>
                ))}
              </select>
            </div>

            <div className="select-field">
              <label>SOURCE</label>

              <select
                value={filters.source}
                onChange={(event) =>
                  handleFilterChange(
                    "source",
                    event.target.value
                  )
                }
              >
                <option value="all">All Sources</option>

                {BALANCE_SOURCES.map((source) => (
                  <option value={source} key={source}>
                    {titleCase(source)}
                  </option>
                ))}
              </select>
            </div>

            <div className="select-field">
              <label>ASSET</label>

              <select
                value={filters.currency}
                onChange={(event) =>
                  handleFilterChange(
                    "currency",
                    event.target.value
                  )
                }
              >
                <option value="all">All Assets</option>

                {currencies.map((currency) => (
                  <option
                    value={currency}
                    key={currency}
                  >
                    {currency}
                  </option>
                ))}
              </select>
            </div>

            <div className="select-field">
              <label>PERIOD</label>

              <select
                value={filters.date}
                onChange={(event) =>
                  handleFilterChange(
                    "date",
                    event.target.value
                  )
                }
              >
                <option value="all">All Time</option>

                <option value="today">Today</option>

                <option value="7days">
                  Last 7 Days
                </option>

                <option value="30days">
                  Last 30 Days
                </option>
              </select>
            </div>
          </div>
        </section>

        {/* TABLE */}

        <section className="ledger-panel">
          <div className="ledger-header">
            <div>
              <span className="section-eyebrow">
                IMMUTABLE LEDGER VIEW
              </span>

              <h2>Transaction Activity</h2>
            </div>

            <div className="ledger-count">
              <span>
                {filteredTransactions.length.toLocaleString()}
              </span>{" "}
              records
            </div>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="loading-ring" />

              <strong>Synchronizing Ledger</strong>

              <span>
                Retrieving transaction activity...
              </span>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⌁</div>

              <strong>
                {error
                  ? "Unable To Load Transactions"
                  : "No Transactions Found"}
              </strong>

              <span>
                {error
                  ? error
                  : hasActiveFilters
                  ? "Try adjusting your search or filters."
                  : "No transaction records are currently available."}
              </span>

              {error ? (
                <button
                  type="button"
                  onClick={() => loadTransactions()}
                >
                  Retry Connection
                </button>
              ) : (
                hasActiveFilters && (
                  <button
                    type="button"
                    onClick={resetFilters}
                  >
                    Reset Filters
                  </button>
                )
              )}
            </div>
          ) : (
            <>
              <div className="table-wrapper">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>TRANSACTION</th>

                      <th>USER</th>

                      <th>TYPE</th>

                      <th>AMOUNT</th>

                      <th>FLOW</th>

                      <th>SOURCE</th>

                      <th>DATE</th>

                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedTransactions.map(
                      (transaction) => {
                        const profile =
                          profiles[transaction.user_id];

                        const direction = String(
                          transaction.direction || ""
                        ).toLowerCase();

                        return (
                          <tr
                            key={transaction.id}
                            onClick={() =>
                              openTransaction(transaction)
                            }
                            className="transaction-row"
                          >
                            <td>
                              <div className="transaction-identity">
                                <div
                                  className={`transaction-type-icon ${getTypeClass(
                                    transaction.type
                                  )}`}
                                >
                                  {getTypeIcon(
                                    transaction.type
                                  )}
                                </div>

                                <div>
                                  <strong>
                                    {shortId(
                                      transaction.id,
                                      8
                                    )}
                                  </strong>

                                  <span>
                                    {transaction.reference ||
                                      "No reference"}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <div className="user-cell">
                                <div className="user-avatar">
                                  {(
                                    profile?.full_name ||
                                    profile?.username ||
                                    "U"
                                  )
                                    .charAt(0)
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <strong>
                                    {getUserName(
                                      transaction.user_id
                                    )}
                                  </strong>

                                  <span>
                                    {getUserSecondary(
                                      transaction.user_id
                                    )}
                                  </span>
                                </div>
                              </div>
                            </td>

                            <td>
                              <span
                                className={`type-badge ${getTypeClass(
                                  transaction.type
                                )}`}
                              >
                                <i>
                                  {getTypeIcon(
                                    transaction.type
                                  )}
                                </i>

                                {titleCase(
                                  transaction.type
                                )}
                              </span>
                            </td>

                            <td>
                              <div className="amount-cell">
                                <strong
                                  className={
                                    direction === "credit"
                                      ? "amount-credit"
                                      : direction ===
                                        "debit"
                                      ? "amount-debit"
                                      : ""
                                  }
                                >
                                  {direction === "credit"
                                    ? "+"
                                    : direction === "debit"
                                    ? "−"
                                    : ""}

                                  {formatMoney(
                                    transaction.amount,
                                    transaction.currency ||
                                      "USD"
                                  )}
                                </strong>

                                <span>
                                  {String(
                                    transaction.currency ||
                                      "—"
                                  ).toUpperCase()}
                                </span>
                              </div>
                            </td>

                            <td>
                              {direction ? (
                                <span
                                  className={`direction-badge direction-${direction}`}
                                >
                                  <i>
                                    {direction === "credit"
                                      ? "↓"
                                      : "↑"}
                                  </i>

                                  {titleCase(direction)}
                                </span>
                              ) : (
                                <span className="unknown-badge">
                                  —
                                </span>
                              )}
                            </td>

                            <td>
                              <span
                                className={`source-badge ${getSourceClass(
                                  transaction.balance_source
                                )}`}
                              >
                                {titleCase(
                                  transaction.balance_source
                                )}
                              </span>
                            </td>

                            <td>
                              <div className="date-cell">
                                <strong>
                                  {formatDate(
                                    transaction.created_at
                                  )}
                                </strong>

                                <span>
                                  {formatTime(
                                    transaction.created_at
                                  )}
                                </span>
                              </div>
                            </td>

                            <td>
                              <button
                                type="button"
                                className="view-transaction"
                                onClick={(event) => {
                                  event.stopPropagation();

                                  openTransaction(
                                    transaction
                                  );
                                }}
                              >
                                <span>Inspect</span>

                                <b>→</b>
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}

              <div className="pagination">
                <div className="pagination-info">
                  Showing{" "}
                  <strong>
                    {Math.min(
                      (currentPage - 1) * PAGE_SIZE + 1,
                      filteredTransactions.length
                    )}
                  </strong>{" "}
                  –{" "}
                  <strong>
                    {Math.min(
                      currentPage * PAGE_SIZE,
                      filteredTransactions.length
                    )}
                  </strong>{" "}
                  of{" "}
                  <strong>
                    {filteredTransactions.length}
                  </strong>
                </div>

                <div className="pagination-controls">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.max(1, page - 1)
                      )
                    }
                  >
                    ←
                  </button>

                  <div className="page-indicator">
                    <strong>{currentPage}</strong>

                    <span>/</span>

                    <span>{totalPages}</span>
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1)
                      )
                    }
                  >
                    →
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </section>

      {/* TRANSACTION DETAIL DRAWER */}

      {selectedTransaction && (
        <div
          className="transaction-overlay"
          onClick={closeTransaction}
        >
          <aside
            className="transaction-drawer"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="drawer-header">
              <div>
                <span className="section-eyebrow">
                  TRANSACTION INSPECTOR
                </span>

                <h2>Transaction Details</h2>
              </div>

              <button
                type="button"
                className="drawer-close"
                onClick={closeTransaction}
              >
                ×
              </button>
            </div>

            <div className="drawer-content">
              {/* STATUS HERO */}

              <div className="transaction-hero">
                <div
                  className={`hero-transaction-icon ${getTypeClass(
                    selectedTransaction.type
                  )}`}
                >
                  {getTypeIcon(
                    selectedTransaction.type
                  )}
                </div>

                <span
                  className={`hero-type ${getTypeClass(
                    selectedTransaction.type
                  )}`}
                >
                  {titleCase(
                    selectedTransaction.type
                  )}
                </span>

                <div
                  className={`hero-amount ${
                    String(
                      selectedTransaction.direction || ""
                    ).toLowerCase() === "credit"
                      ? "amount-credit"
                      : "amount-debit"
                  }`}
                >
                  {String(
                    selectedTransaction.direction || ""
                  ).toLowerCase() === "credit"
                    ? "+"
                    : String(
                        selectedTransaction.direction || ""
                      ).toLowerCase() === "debit"
                    ? "−"
                    : ""}

                  {formatMoney(
                    selectedTransaction.amount,
                    selectedTransaction.currency ||
                      "USD"
                  )}
                </div>

                <span className="hero-time">
                  {formatDateTime(
                    selectedTransaction.created_at
                  )}
                </span>
              </div>

              {/* TRANSACTION ID */}

              <div className="detail-section">
                <div className="detail-section-title">
                  <span>IDENTIFICATION</span>
                </div>

                <div className="detail-row">
                  <span>Transaction ID</span>

                  <div className="copy-value">
                    <strong>
                      {shortId(
                        selectedTransaction.id,
                        12
                      )}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        copyValue(
                          selectedTransaction.id,
                          "transaction-id"
                        )
                      }
                    >
                      {copied === "transaction-id"
                        ? "Copied"
                        : "Copy"}
                    </button>
                  </div>
                </div>

                <div className="detail-row">
                  <span>Reference</span>

                  <div className="copy-value">
                    <strong>
                      {selectedTransaction.reference ||
                        "No reference"}
                    </strong>

                    {selectedTransaction.reference && (
                      <button
                        type="button"
                        onClick={() =>
                          copyValue(
                            selectedTransaction.reference ||
                              "",
                            "reference"
                          )
                        }
                      >
                        {copied === "reference"
                          ? "Copied"
                          : "Copy"}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* FINANCIAL DETAILS */}

              <div className="detail-section">
                <div className="detail-section-title">
                  <span>FINANCIAL DATA</span>
                </div>

                <div className="detail-grid">
                  <div className="detail-box">
                    <span>Amount</span>

                    <strong>
                      {formatMoney(
                        selectedTransaction.amount,
                        selectedTransaction.currency ||
                          "USD"
                      )}
                    </strong>
                  </div>

                  <div className="detail-box">
                    <span>Currency</span>

                    <strong>
                      {String(
                        selectedTransaction.currency ||
                          "—"
                      ).toUpperCase()}
                    </strong>
                  </div>

                  <div className="detail-box">
                    <span>Direction</span>

                    <strong>
                      {titleCase(
                        selectedTransaction.direction
                      )}
                    </strong>
                  </div>

                  <div className="detail-box">
                    <span>Balance Source</span>

                    <strong>
                      {titleCase(
                        selectedTransaction.balance_source
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              {/* USER DETAILS */}

              <div className="detail-section">
                <div className="detail-section-title">
                  <span>ACCOUNT IDENTIFICATION</span>
                </div>

                <div className="drawer-user">
                  <div className="drawer-avatar">
                    {getUserName(
                      selectedTransaction.user_id
                    )
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <strong>
                      {getUserName(
                        selectedTransaction.user_id
                      )}
                    </strong>

                    <span>
                      {getUserSecondary(
                        selectedTransaction.user_id
                      )}
                    </span>
                  </div>
                </div>

                <div className="detail-row">
                  <span>User ID</span>

                  <div className="copy-value">
                    <strong>
                      {shortId(
                        selectedTransaction.user_id,
                        12
                      )}
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        copyValue(
                          selectedTransaction.user_id,
                          "user-id"
                        )
                      }
                    >
                      {copied === "user-id"
                        ? "Copied"
                        : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* DESCRIPTION */}

              <div className="detail-section">
                <div className="detail-section-title">
                  <span>EVENT DESCRIPTION</span>
                </div>

                <div className="description-box">
                  {selectedTransaction.description ||
                    "No description was attached to this transaction."}
                </div>
              </div>

              {/* TIMELINE */}

              <div className="detail-section">
                <div className="detail-section-title">
                  <span>EVENT TIMELINE</span>
                </div>

                <div className="event-timeline">
                  <div className="timeline-line" />

                  <div className="timeline-event">
                    <div className="timeline-dot active" />

                    <div>
                      <strong>
                        Transaction Recorded
                      </strong>

                      <span>
                        {formatDateTime(
                          selectedTransaction.created_at
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="timeline-event">
                    <div className="timeline-dot" />

                    <div>
                      <strong>Ledger Event</strong>

                      <span>
                        {titleCase(
                          selectedTransaction.type
                        )}{" "}
                        ·{" "}
                        {selectedTransaction.direction
                          ? titleCase(
                              selectedTransaction.direction
                            )
                          : "Direction not recorded"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="drawer-footer">
              <button
                type="button"
                onClick={closeTransaction}
              >
                Close Inspector
              </button>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}