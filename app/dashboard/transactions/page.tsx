"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import "./transactions.css";

type TransactionType =
  | "deposit"
  | "withdrawal"
  | "investment"
  | "return"
  | "referral"
  | "bonus"
  | "fee"
  | "adjustment";

type LedgerRecord = {
  id: string;
  type: TransactionType | string;
  amount: number | string;
  currency: string;
  reference: string | null;
  description: string | null;
  created_at: string;
  status?: string;
  source:
    | "transaction"
    | "deposit"
    | "withdrawal"
    | "investment";
};

type DepositRecord = {
  id: string;
  amount: number | string;
  currency: string;
  network: string | null;
  transaction_hash: string | null;
  wallet_address: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
};

type WithdrawalRecord = {
  id: string;
  amount: number | string;
  currency: string;
  network: string | null;
  destination_address: string | null;
  fee: number | string;
  net_amount: number | string;
  status: string;
  requested_at: string;
  processed_at: string | null;
};

type InvestmentRecord = {
  id: string;
  amount: number | string;
  currency: string;
  return_percentage: number | string;
  expected_return: number | string;
  status: string;
  started_at: string | null;
  maturity_at: string | null;
  created_at: string;
};

const FILTERS = [
  {
    value: "all",
    label: "All Activity",
  },
  {
    value: "deposit",
    label: "Deposits",
  },
  {
    value: "withdrawal",
    label: "Withdrawals",
  },
  {
    value: "investment",
    label: "Investments",
  },
  {
    value: "return",
    label: "Returns",
  },
  {
    value: "referral",
    label: "Referrals",
  },
  {
    value: "bonus",
    label: "Bonuses",
  },
  {
    value: "fee",
    label: "Fees",
  },
  {
    value: "adjustment",
    label: "Adjustments",
  },
];

function formatAmount(
  value: number | string
) {
  const number =
    Number(value || 0);

  return new Intl.NumberFormat(
    "en-US",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 8,
    }
  ).format(number);
}

function formatDate(
  value: string | null
) {
  if (!value) return "—";

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function formatType(
  type: string
) {
  return type
    .replace(/_/g, " ")
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase()
    );
}

function getTypeClass(
  type: string
) {
  switch (
    type.toLowerCase()
  ) {
    case "deposit":
      return "transaction-type-deposit";

    case "withdrawal":
      return "transaction-type-withdrawal";

    case "investment":
      return "transaction-type-investment";

    case "return":
      return "transaction-type-return";

    case "referral":
      return "transaction-type-referral";

    case "bonus":
      return "transaction-type-bonus";

    case "fee":
      return "transaction-type-fee";

    case "adjustment":
      return "transaction-type-adjustment";

    default:
      return "transaction-type-default";
  }
}

function getTypeIcon(
  type: string
) {
  switch (
    type.toLowerCase()
  ) {
    case "deposit":
      return "↓";

    case "withdrawal":
      return "↑";

    case "investment":
      return "◆";

    case "return":
      return "↗";

    case "referral":
      return "♧";

    case "bonus":
      return "+";

    case "fee":
      return "−";

    case "adjustment":
      return "↔";

    default:
      return "•";
  }
}

/*
 * Credits increase the investor's available
 * or earned balance.
 */
function isCredit(
  type: string
) {
  return [
    "deposit",
    "return",
    "referral",
    "bonus",
  ].includes(
    type.toLowerCase()
  );
}

/*
 * Debits reduce available funds.
 */
function isDebit(
  type: string
) {
  return [
    "withdrawal",
    "investment",
    "fee",
  ].includes(
    type.toLowerCase()
  );
}

/*
 * Adjustments are special because the admin
 * balance-management system can create either
 * a positive or negative adjustment.
 *
 * The amount itself is therefore used to determine
 * the displayed direction.
 */
function getTransactionDirection(
  transaction: LedgerRecord
) {
  const type =
    transaction.type.toLowerCase();

  if (isCredit(type)) {
    return "credit";
  }

  if (isDebit(type)) {
    return "debit";
  }

  if (type === "adjustment") {
    const amount =
      Number(
        transaction.amount || 0
      );

    return amount >= 0
      ? "credit"
      : "debit";
  }

  return "neutral";
}

function getOperationalDescription(
  type: string,
  status: string
) {
  const normalizedType =
    type.toLowerCase();

  const normalizedStatus =
    status.toLowerCase();

  if (
    normalizedType ===
    "deposit"
  ) {
    if (
      normalizedStatus ===
      "pending"
    ) {
      return "Deposit submitted and awaiting verification.";
    }

    if (
      normalizedStatus ===
      "confirmed"
    ) {
      return "Deposit confirmed.";
    }

    if (
      normalizedStatus ===
      "rejected"
    ) {
      return "Deposit request rejected.";
    }

    if (
      normalizedStatus ===
      "cancelled"
    ) {
      return "Deposit request cancelled.";
    }
  }

  if (
    normalizedType ===
    "withdrawal"
  ) {
    if (
      normalizedStatus ===
      "pending"
    ) {
      return "Withdrawal request awaiting review.";
    }

    if (
      normalizedStatus ===
      "approved"
    ) {
      return "Withdrawal request approved.";
    }

    if (
      normalizedStatus ===
      "processing"
    ) {
      return "Withdrawal is being processed.";
    }

    if (
      normalizedStatus ===
      "completed"
    ) {
      return "Withdrawal completed.";
    }

    if (
      normalizedStatus ===
      "rejected"
    ) {
      return "Withdrawal request rejected.";
    }

    if (
      normalizedStatus ===
      "cancelled"
    ) {
      return "Withdrawal request cancelled.";
    }
  }

  return "Account activity.";
}

function getOperationalStatusClass(
  status: string
) {
  switch (
    status.toLowerCase()
  ) {
    case "confirmed":
    case "completed":
    case "approved":
    case "matured":
      return "status-completed";

    case "processing":
    case "active":
      return "status-processing";

    case "rejected":
    case "cancelled":
      return "status-rejected";

    case "pending":
    default:
      return "status-pending";
  }
}

function shortenReference(
  value: string | null,
  fallback: string
) {
  if (!value) {
    return `${fallback.slice(
      0,
      8
    )}...`;
  }

  if (value.length <= 18) {
    return value;
  }

  return `${value.slice(
    0,
    8
  )}...${value.slice(-7)}`;
}

export default function TransactionsPage() {
  const [
    transactions,
    setTransactions,
  ] = useState<
    LedgerRecord[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  const [
    activeFilter,
    setActiveFilter,
  ] = useState("all");

  const [
    search,
    setSearch,
  ] = useState("");

  async function loadTransactions() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        window.location.href =
          "/login";
        return;
      }

      const [
        transactionResponse,
        depositResponse,
        withdrawalResponse,
        investmentResponse,
      ] = await Promise.all([
        /*
         * This is the official financial ledger.
         *
         * Admin balance additions, deductions,
         * bonuses, investment-profit adjustments,
         * referral commissions, fees and returns
         * must appear here.
         */
        supabase
          .from("transactions")
          .select(
            "id, type, amount, currency, reference, description, created_at"
          )
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        /*
         * Operational deposits are included so
         * pending deposits can be displayed before
         * administrator confirmation.
         */
        supabase
          .from("deposits")
          .select(
            "id, amount, currency, network, transaction_hash, wallet_address, status, created_at, confirmed_at"
          )
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        /*
         * Operational withdrawals are included so
         * pending/processing withdrawals remain
         * visible before their final ledger entry.
         */
        supabase
          .from("withdrawals")
          .select(
            "id, amount, currency, network, destination_address, fee, net_amount, status, requested_at, processed_at"
          )
          .eq(
            "user_id",
            user.id
          )
          .order(
            "requested_at",
            {
              ascending: false,
            }
          ),

        /*
         * Investment records are included so an
         * investment can appear immediately.
         */
        supabase
          .from("investments")
          .select(
            "id, amount, currency, return_percentage, expected_return, status, started_at, maturity_at, created_at"
          )
          .eq(
            "user_id",
            user.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),
      ]);

      if (
        transactionResponse.error
      ) {
        throw transactionResponse.error;
      }

      if (
        depositResponse.error
      ) {
        throw depositResponse.error;
      }

      if (
        withdrawalResponse.error
      ) {
        throw withdrawalResponse.error;
      }

      if (
        investmentResponse.error
      ) {
        throw investmentResponse.error;
      }

      const loadedTransactions =
        (transactionResponse.data ||
          []) as LedgerRecord[];

      const loadedDeposits =
        (depositResponse.data ||
          []) as DepositRecord[];

      const loadedWithdrawals =
        (withdrawalResponse.data ||
          []) as WithdrawalRecord[];

      const loadedInvestments =
        (investmentResponse.data ||
          []) as InvestmentRecord[];

      /*
       * References of transactions that already
       * represent a source record.
       */
      const transactionReferences =
        new Set(
          loadedTransactions
            .map(
              (transaction) =>
                transaction.reference
            )
            .filter(Boolean)
        );

      /*
       * Official transactions.
       *
       * This includes:
       *
       * deposit
       * withdrawal
       * investment
       * return
       * referral
       * bonus
       * fee
       * adjustment
       *
       * Therefore every admin balance operation
       * automatically appears here as long as the
       * admin RPC creates the transaction row.
       */
      const unifiedRecords: LedgerRecord[] =
        loadedTransactions.map(
          (transaction) => ({
            ...transaction,
            source:
              "transaction" as const,
            status:
              transaction.type.toLowerCase() ===
              "deposit"
                ? "confirmed"
                : "completed",
          })
        );

      /*
       * Pending/non-ledger deposits.
       */
      for (const deposit of loadedDeposits) {
        if (
          deposit.status.toLowerCase() ===
            "confirmed" &&
          transactionReferences.has(
            deposit.id
          )
        ) {
          continue;
        }

        unifiedRecords.push({
          id: `deposit-${deposit.id}`,
          type: "deposit",
          amount:
            deposit.amount,
          currency:
            deposit.currency,
          reference:
            deposit.transaction_hash ||
            deposit.id,
          description:
            deposit.status.toLowerCase() ===
            "pending"
              ? "Deposit submitted and awaiting verification."
              : getOperationalDescription(
                  "deposit",
                  deposit.status
                ),
          created_at:
            deposit.created_at,
          status:
            deposit.status,
          source:
            "deposit",
        });
      }

      /*
       * Pending/processing withdrawals.
       *
       * If a completed withdrawal has already
       * generated an official transaction row,
       * don't show it twice.
       */
      for (const withdrawal of loadedWithdrawals) {
        if (
          withdrawal.status.toLowerCase() ===
            "completed" &&
          transactionReferences.has(
            withdrawal.id
          )
        ) {
          continue;
        }

        unifiedRecords.push({
          id: `withdrawal-${withdrawal.id}`,
          type: "withdrawal",
          amount:
            withdrawal.amount,
          currency:
            withdrawal.currency,
          reference:
            withdrawal.id,
          description:
            getOperationalDescription(
              "withdrawal",
              withdrawal.status
            ),
          created_at:
            withdrawal.requested_at,
          status:
            withdrawal.status,
          source:
            "withdrawal",
        });
      }

      /*
       * Investments are only added when there is
       * no corresponding official transaction.
       */
      for (const investment of loadedInvestments) {
        if (
          transactionReferences.has(
            investment.id
          )
        ) {
          continue;
        }

        unifiedRecords.push({
          id: `investment-${investment.id}`,
          type: "investment",
          amount:
            investment.amount,
          currency:
            investment.currency,
          reference:
            investment.id,
          description:
            `Investment • ${formatAmount(
              investment.return_percentage
            )}% expected return`,
          created_at:
            investment.created_at,
          status:
            investment.status,
          source:
            "investment",
        });
      }

      /*
       * Final chronological ledger.
       */
      unifiedRecords.sort(
        (a, b) =>
          new Date(
            b.created_at
          ).getTime() -
          new Date(
            a.created_at
          ).getTime()
      );

      setTransactions(
        unifiedRecords
      );
    } catch (err: any) {
      console.error(
        "Transaction loading error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load your transaction history."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  const filteredTransactions =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return transactions.filter(
        (transaction) => {
          const matchesFilter =
            activeFilter ===
              "all" ||
            transaction.type
              .toLowerCase() ===
              activeFilter.toLowerCase();

          if (
            !matchesFilter
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            transaction.type,
            transaction.currency,
            transaction.reference ||
              "",
            transaction.description ||
              "",
            transaction.status ||
              "",
            transaction.id,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      transactions,
      activeFilter,
      search,
    ]);

  /*
   * Calculate financial totals from the official
   * ledger where possible.
   */
  const summary = useMemo(() => {
    let deposits = 0;
    let withdrawals = 0;
    let investments = 0;
    let returns = 0;
    let bonuses = 0;
    let referrals = 0;
    let adjustments = 0;
    let fees = 0;

    for (const transaction of transactions) {
      const amount =
        Math.abs(
          Number(
            transaction.amount || 0
          )
        );

      const type =
        transaction.type.toLowerCase();

      const status =
        transaction.status?.toLowerCase();

      if (
        type === "deposit" &&
        (
          transaction.source ===
            "transaction" ||
          status ===
            "confirmed"
        )
      ) {
        deposits += amount;
      }

      if (
        type === "withdrawal" &&
        (
          transaction.source ===
            "transaction" ||
          status ===
            "completed"
        )
      ) {
        withdrawals += amount;
      }

      if (
        type === "investment"
      ) {
        investments += amount;
      }

      if (
        type === "return"
      ) {
        returns += amount;
      }

      if (
        type === "bonus"
      ) {
        bonuses += amount;
      }

      if (
        type === "referral"
      ) {
        referrals += amount;
      }

      if (
        type === "adjustment"
      ) {
        /*
         * Display the absolute value in the summary.
         * The actual transaction row determines whether
         * it was a credit or debit.
         */
        adjustments += amount;
      }

      if (
        type === "fee"
      ) {
        fees += amount;
      }
    }

    return {
      deposits,
      withdrawals,
      investments,
      returns,
      bonuses,
      referrals,
      adjustments,
      fees,
    };
  }, [transactions]);

  if (loading) {
    return (
      <main className="transactions-page">
        <div className="transactions-loading">
          <div className="transactions-spinner" />

          <p>
            Loading transaction history...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="transactions-page">
      <div className="transactions-container">
        <Link
          href="/dashboard"
          className="transactions-back"
        >
          <span aria-hidden="true">
            ‹
          </span>

          Back to Dashboard
        </Link>

        <header className="transactions-heading">
          <div>
            <p className="transactions-eyebrow">
              ACCOUNT ACTIVITY
            </p>

            <h1>
              Transactions
            </h1>

            <p className="transactions-subtitle">
              Review your deposits, withdrawals,
              investments, returns, bonuses,
              adjustments and account activity.
            </p>
          </div>

          <div className="transaction-security">
            <span className="transaction-security-dot" />
            Account Ledger
          </div>
        </header>

        {error && (
          <div className="transaction-alert">
            <div className="transaction-alert-icon">
              !
            </div>

            <div>
              <strong>
                Unable to load transactions
              </strong>

              <p>
                {error}
              </p>

              <button
                type="button"
                onClick={
                  loadTransactions
                }
                className="retry-button"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        <section className="transaction-summary-grid">
          <div className="transaction-summary-card">
            <div className="summary-card-icon summary-blue">
              ↓
            </div>

            <div>
              <span>
                Total Deposits
              </span>

              <strong>
                {formatAmount(
                  summary.deposits
                )}
              </strong>
            </div>
          </div>

          <div className="transaction-summary-card">
            <div className="summary-card-icon summary-gold">
              ↑
            </div>

            <div>
              <span>
                Total Withdrawals
              </span>

              <strong>
                {formatAmount(
                  summary.withdrawals
                )}
              </strong>
            </div>
          </div>

          <div className="transaction-summary-card">
            <div className="summary-card-icon summary-purple">
              ◆
            </div>

            <div>
              <span>
                Total Investments
              </span>

              <strong>
                {formatAmount(
                  summary.investments
                )}
              </strong>
            </div>
          </div>

          <div className="transaction-summary-card">
            <div className="summary-card-icon summary-green">
              ↗
            </div>

            <div>
              <span>
                Investment Returns
              </span>

              <strong>
                {formatAmount(
                  summary.returns
                )}
              </strong>
            </div>
          </div>

          <div className="transaction-summary-card">
            <div className="summary-card-icon summary-green">
              +
            </div>

            <div>
              <span>
                Bonuses
              </span>

              <strong>
                {formatAmount(
                  summary.bonuses
                )}
              </strong>
            </div>
          </div>

          <div className="transaction-summary-card">
            <div className="summary-card-icon summary-blue">
              ♧
            </div>

            <div>
              <span>
                Referral Earnings
              </span>

              <strong>
                {formatAmount(
                  summary.referrals
                )}
              </strong>
            </div>
          </div>
        </section>

        <section className="transactions-card">
          <div className="transactions-card-header">
            <div>
              <span className="transactions-card-label">
                TRANSACTION LEDGER
              </span>

              <h2>
                Activity History
              </h2>
            </div>

            <div className="transaction-count">
              {filteredTransactions.length}{" "}
              {filteredTransactions.length ===
              1
                ? "record"
                : "records"}
            </div>
          </div>

          <div className="transaction-controls">
            <div className="transaction-search">
              <span
                className="transaction-search-icon"
                aria-hidden="true"
              >
                ⌕
              </span>

              <input
                type="text"
                placeholder="Search transactions..."
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
              />

              {search && (
                <button
                  type="button"
                  className="clear-search"
                  onClick={() =>
                    setSearch("")
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>

            <div className="transaction-filters">
              {FILTERS.map(
                (filter) => (
                  <button
                    type="button"
                    key={
                      filter.value
                    }
                    className={
                      activeFilter ===
                      filter.value
                        ? "transaction-filter active"
                        : "transaction-filter"
                    }
                    onClick={() =>
                      setActiveFilter(
                        filter.value
                      )
                    }
                  >
                    {filter.label}
                  </button>
                )
              )}
            </div>
          </div>

          {filteredTransactions.length ===
          0 ? (
            <div className="transactions-empty">
              <div className="transactions-empty-icon">
                ◷
              </div>

              <h3>
                {transactions.length ===
                0
                  ? "No transactions yet"
                  : "No matching transactions"}
              </h3>

              <p>
                {transactions.length ===
                0
                  ? "Your account activity will appear here once you begin using the platform."
                  : "Try changing the transaction type or search term."}
              </p>

              {transactions.length >
                0 && (
                <button
                  type="button"
                  className="reset-filters"
                  onClick={() => {
                    setActiveFilter(
                      "all"
                    );
                    setSearch("");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="transactions-table-wrapper">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>
                      Transaction
                    </th>

                    <th>
                      Amount
                    </th>

                    <th>
                      Reference
                    </th>

                    <th>
                      Description
                    </th>

                    <th>
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredTransactions.map(
                    (
                      transaction
                    ) => {
                      const direction =
                        getTransactionDirection(
                          transaction
                        );

                      const credit =
                        direction ===
                        "credit";

                      const debit =
                        direction ===
                        "debit";

                      const hasStatus =
                        Boolean(
                          transaction.status
                        );

                      return (
                        <tr
                          key={
                            transaction.id
                          }
                        >
                          <td>
                            <div className="transaction-name">
                              <div
                                className={`transaction-icon ${getTypeClass(
                                  transaction.type
                                )}`}
                              >
                                {getTypeIcon(
                                  transaction.type
                                )}
                              </div>

                              <div>
                                <strong>
                                  {formatType(
                                    transaction.type
                                  )}
                                </strong>

                                <span>
                                  {transaction.currency.toUpperCase()}
                                </span>

                                {hasStatus && (
                                  <span
                                    className={`transaction-status ${getOperationalStatusClass(
                                      transaction.status!
                                    )}`}
                                  >
                                    {formatType(
                                      transaction.status!
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td>
                            <span
                              className={
                                credit
                                  ? "transaction-amount credit"
                                  : debit
                                  ? "transaction-amount debit"
                                  : "transaction-amount"
                              }
                            >
                              {credit
                                ? "+"
                                : debit
                                ? "−"
                                : ""}

                              {formatAmount(
                                Math.abs(
                                  Number(
                                    transaction.amount
                                  )
                                )
                              )}{" "}

                              {transaction.currency.toUpperCase()}
                            </span>
                          </td>

                          <td>
                            <span
                              className="transaction-reference"
                              title={
                                transaction.reference ||
                                transaction.id
                              }
                            >
                              {shortenReference(
                                transaction.reference,
                                transaction.id
                              )}
                            </span>
                          </td>

                          <td>
                            <span className="transaction-description">
                              {transaction.description ||
                                "Account transaction"}
                            </span>
                          </td>

                          <td>
                            <span className="transaction-date">
                              {formatDate(
                                transaction.created_at
                              )}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="transaction-footer-note">
          <span className="footer-shield">
            ✓
          </span>

          <span>
            Transaction records are generated
            from your account activity and are
            read-only from the investor portal.
          </span>
        </div>
      </div>
    </main>
  );
}