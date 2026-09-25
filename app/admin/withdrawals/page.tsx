"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import "./withdrawals.css";

type WithdrawalStatus =
  | "pending"
  | "approved"
  | "processing"
  | "completed"
  | "rejected"
  | "cancelled";

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number | string;
  currency: string;
  network: string | null;
  destination_address: string;
  fee: number | string;
  net_amount: number | string;
  status: WithdrawalStatus;
  requested_at: string;
  processed_at: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
};

type AdminRecord = {
  id: string;
  role: "admin" | "manager" | "support";
  is_active: boolean;
};

type ActionType =
  | "approve"
  | "reject"
  | "process"
  | "complete"
  | null;

const STATUS_OPTIONS = [
  "all",
  "pending",
  "approved",
  "processing",
  "completed",
  "rejected",
  "cancelled",
] as const;

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_OPTIONS)[number]>("all");

  const [actionType, setActionType] = useState<ActionType>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] =
    useState<Withdrawal | null>(null);
  const [note, setNote] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [admin, setAdmin] = useState<AdminRecord | null>(null);

  const [diagnostic, setDiagnostic] = useState("");

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    setDiagnostic("");

    try {
      console.log("[Withdrawals] Starting load...");

      /*
       * ---------------------------------------------------------
       * 1. GET CURRENT AUTH SESSION
       * ---------------------------------------------------------
       */

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      console.log("[Withdrawals] Session:", session);
      console.log("[Withdrawals] Session error:", sessionError);

      if (sessionError) {
        throw new Error(
          `Authentication error: ${sessionError.message}`
        );
      }

      if (!session?.user) {
        throw new Error(
          "No active Supabase session. Please sign in again."
        );
      }

      console.log(
        "[Withdrawals] Authenticated user:",
        session.user.id
      );

      /*
       * ---------------------------------------------------------
       * 2. CHECK ADMIN RECORD
       * ---------------------------------------------------------
       */

      const {
        data: adminData,
        error: adminError,
      } = await supabase
        .from("admin_users")
        .select("id, role, is_active")
        .eq("id", session.user.id)
        .maybeSingle();

      console.log("[Withdrawals] Admin record:", adminData);
      console.log("[Withdrawals] Admin error:", adminError);

      if (adminError) {
        throw new Error(
          `Unable to verify administrator access: ${adminError.message}`
        );
      }

      if (!adminData) {
        throw new Error(
          "Your authenticated account does not have an active administrator record."
        );
      }

      if (!adminData.is_active) {
        throw new Error(
          "Your administrator account is currently inactive."
        );
      }

      if (
        adminData.role !== "admin" &&
        adminData.role !== "manager"
      ) {
        throw new Error(
          `Administrator access required. Current role: ${adminData.role}`
        );
      }

      setAdmin(adminData);

      /*
       * ---------------------------------------------------------
       * 3. LOAD WITHDRAWALS
       * ---------------------------------------------------------
       */

      console.log("[Withdrawals] Loading withdrawals...");

      const {
        data: withdrawalData,
        error: withdrawalsError,
      } = await supabase
        .from("withdrawals")
        .select(
          `
            id,
            user_id,
            amount,
            currency,
            network,
            destination_address,
            fee,
            net_amount,
            status,
            requested_at,
            processed_at
          `
        )
        .order("requested_at", { ascending: false });

      console.log(
        "[Withdrawals] Withdrawal data:",
        withdrawalData
      );

      console.log(
        "[Withdrawals] Withdrawal error:",
        withdrawalsError
      );

      if (withdrawalsError) {
        throw new Error(
          `Unable to load withdrawals: ${withdrawalsError.message}`
        );
      }

      const withdrawalRows =
        (withdrawalData || []) as Withdrawal[];

      console.log(
        "[Withdrawals] Withdrawal count:",
        withdrawalRows.length
      );

      /*
       * IMPORTANT DIAGNOSTIC
       *
       * If the database contains withdrawals but this returns
       * zero rows, the problem is almost certainly database/RLS
       * permissions rather than the React page.
       */

      if (withdrawalRows.length === 0) {
        setDiagnostic(
          "The withdrawal query completed successfully but returned 0 records. If withdrawals exist in Supabase, check the withdrawals table RLS policies."
        );
      }

      setWithdrawals(withdrawalRows);

      /*
       * ---------------------------------------------------------
       * 4. LOAD INVESTOR PROFILES
       * ---------------------------------------------------------
       */

      const userIds = [
        ...new Set(
          withdrawalRows.map(
            (withdrawal) => withdrawal.user_id
          )
        ),
      ];

      console.log(
        "[Withdrawals] Unique investor IDs:",
        userIds
      );

      if (userIds.length > 0) {
        const {
          data: profileData,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("id, full_name, username")
          .in("id", userIds);

        console.log(
          "[Withdrawals] Profile data:",
          profileData
        );

        console.log(
          "[Withdrawals] Profile error:",
          profileError
        );

        if (profileError) {
          console.warn(
            "[Withdrawals] Profiles could not be loaded:",
            profileError.message
          );

          /*
           * Do not fail the entire withdrawals page if profiles
           * are unavailable.
           */
          setProfiles({});
        } else if (profileData) {
          const profileMap: Record<string, Profile> = {};

          profileData.forEach((profile) => {
            profileMap[profile.id] = profile as Profile;
          });

          setProfiles(profileMap);
        }
      } else {
        setProfiles({});
      }

      console.log(
        "[Withdrawals] Load completed successfully."
      );
    } catch (err) {
      console.error(
        "[Withdrawals] Load failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load withdrawals."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /*
   * -----------------------------------------------------------
   * INITIAL LOAD
   * -----------------------------------------------------------
   */

  useEffect(() => {
    void loadWithdrawals();
  }, [loadWithdrawals]);

  /*
   * -----------------------------------------------------------
   * FILTERED WITHDRAWALS
   * -----------------------------------------------------------
   */

  const filteredWithdrawals = useMemo(() => {
    const query = search.trim().toLowerCase();

    return withdrawals.filter((withdrawal) => {
      const profile = profiles[withdrawal.user_id];

      const matchesStatus =
        statusFilter === "all" ||
        withdrawal.status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        withdrawal.id,
        withdrawal.user_id,
        withdrawal.currency,
        withdrawal.network || "",
        withdrawal.destination_address,
        withdrawal.status,
        profile?.full_name || "",
        profile?.username || "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [
    withdrawals,
    profiles,
    search,
    statusFilter,
  ]);

  /*
   * -----------------------------------------------------------
   * STATISTICS
   * -----------------------------------------------------------
   */

  const stats = useMemo(() => {
    return {
      total: withdrawals.length,

      pending: withdrawals.filter(
        (item) => item.status === "pending"
      ).length,

      approved: withdrawals.filter(
        (item) => item.status === "approved"
      ).length,

      processing: withdrawals.filter(
        (item) => item.status === "processing"
      ).length,

      completed: withdrawals.filter(
        (item) => item.status === "completed"
      ).length,

      rejected: withdrawals.filter(
        (item) => item.status === "rejected"
      ).length,

      cancelled: withdrawals.filter(
        (item) => item.status === "cancelled"
      ).length,
    };
  }, [withdrawals]);

  const totalPendingValue = useMemo(() => {
    return withdrawals
      .filter((item) => item.status === "pending")
      .reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );
  }, [withdrawals]);

  /*
   * -----------------------------------------------------------
   * FORMATTERS
   * -----------------------------------------------------------
   */

  function formatAmount(
    amount: number | string,
    currency: string
  ) {
    const value = Number(amount || 0);

    return `${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    })} ${currency.toUpperCase()}`;
  }

  function formatDate(date: string | null) {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "Invalid date";
    }

    return parsed.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function shortenAddress(address: string) {
    if (!address) return "—";

    if (address.length <= 22) {
      return address;
    }

    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  }

  function getProfileName(userId: string) {
    const profile = profiles[userId];

    if (!profile) {
      return "Unknown investor";
    }

    return (
      profile.full_name ||
      profile.username ||
      "Investor"
    );
  }

  function getProfileUsername(userId: string) {
    const profile = profiles[userId];

    if (!profile?.username) {
      return "";
    }

    return `@${profile.username}`;
  }

  /*
   * -----------------------------------------------------------
   * ACTION MODAL
   * -----------------------------------------------------------
   */

  function openAction(
    withdrawal: Withdrawal,
    type: Exclude<ActionType, null>
  ) {
    setSelectedWithdrawal(withdrawal);
    setActionType(type);
    setNote("");
    setError("");
    setSuccess("");
  }

  function closeAction() {
    if (actionLoading) return;

    setSelectedWithdrawal(null);
    setActionType(null);
    setNote("");
  }

  /*
   * -----------------------------------------------------------
   * WITHDRAWAL ACTION
   * -----------------------------------------------------------
   */

  async function executeAction() {
    if (!selectedWithdrawal || !actionType) {
      return;
    }

    setActionLoading(selectedWithdrawal.id);
    setError("");
    setSuccess("");

    try {
      let functionName = "";

      if (actionType === "approve") {
        functionName = "admin_approve_withdrawal";
      }

      if (actionType === "reject") {
        functionName = "admin_reject_withdrawal";
      }

      if (actionType === "process") {
        functionName = "admin_process_withdrawal";
      }

      if (actionType === "complete") {
        functionName = "admin_complete_withdrawal";
      }

      if (!functionName) {
        throw new Error(
          "Invalid withdrawal action."
        );
      }

      console.log(
        "[Withdrawals] Calling RPC:",
        functionName
      );

      const {
        data,
        error: rpcError,
      } = await supabase.rpc(functionName, {
        p_withdrawal_id: selectedWithdrawal.id,
        p_note: note.trim() || null,
      });

      console.log(
        "[Withdrawals] RPC result:",
        data
      );

      console.log(
        "[Withdrawals] RPC error:",
        rpcError
      );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "The withdrawal action could not be completed."
        );
      }

      const messages: Record<
        Exclude<ActionType, null>,
        string
      > = {
        approve:
          "Withdrawal approved and funds reserved.",
        reject:
          "Withdrawal rejected successfully.",
        process:
          "Withdrawal moved to processing.",
        complete:
          "Withdrawal marked as completed.",
      };

      setSuccess(messages[actionType]);

      closeAction();

      await loadWithdrawals();
    } catch (err) {
      console.error(
        "[Withdrawals] Action failed:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete the withdrawal action."
      );
    } finally {
      setActionLoading(null);
    }
  }

  /*
   * -----------------------------------------------------------
   * ACTION LABELS
   * -----------------------------------------------------------
   */

  function getActionTitle() {
    if (actionType === "approve") {
      return "Approve Withdrawal";
    }

    if (actionType === "reject") {
      return "Reject Withdrawal";
    }

    if (actionType === "process") {
      return "Process Withdrawal";
    }

    if (actionType === "complete") {
      return "Complete Withdrawal";
    }

    return "Withdrawal Action";
  }

  function getActionDescription() {
    if (actionType === "approve") {
      return "Approval will reserve the requested amount from the investor's available wallet balance.";
    }

    if (actionType === "reject") {
      return "Reject this withdrawal request. No wallet deduction will be made.";
    }

    if (actionType === "process") {
      return "Move this approved withdrawal into processing while the actual transfer is handled externally.";
    }

    if (actionType === "complete") {
      return "Only mark this withdrawal completed after the external transfer has actually been completed and verified.";
    }

    return "";
  }

  function getStatusClass(status: string) {
    return `status-${status}`;
  }

  /*
   * -----------------------------------------------------------
   * NEXT ACTION
   * -----------------------------------------------------------
   */

  function getNextAction(withdrawal: Withdrawal) {
    if (withdrawal.status === "pending") {
      return (
        <div className="action-buttons">
          <button
            className="btn btn-success"
            onClick={() =>
              openAction(withdrawal, "approve")
            }
          >
            Approve
          </button>

          <button
            className="btn btn-danger"
            onClick={() =>
              openAction(withdrawal, "reject")
            }
          >
            Reject
          </button>
        </div>
      );
    }

    if (withdrawal.status === "approved") {
      return (
        <button
          className="btn btn-primary"
          onClick={() =>
            openAction(withdrawal, "process")
          }
        >
          Start Processing
        </button>
      );
    }

    if (withdrawal.status === "processing") {
      return (
        <button
          className="btn btn-success"
          onClick={() =>
            openAction(withdrawal, "complete")
          }
        >
          Mark Completed
        </button>
      );
    }

    return (
      <span className="no-action">
        No action
      </span>
    );
  }

  /*
   * -----------------------------------------------------------
   * RENDER
   * -----------------------------------------------------------
   */

  return (
    <div className="admin-withdrawals-page">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark">
            MC
          </div>

          <div>
            <strong>Meridian</strong>
            <span>Admin Control</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="/crypto-investment-platform/admin/">
            Dashboard
          </a>

          <a href="/crypto-investment-platform/admin/users/">
            Users
          </a>

          <a href="/crypto-investment-platform/admin/investments/">
            Investments
          </a>

          <a href="/crypto-investment-platform/admin/investment-plans/">
            Investment Plans
          </a>

          <a href="/crypto-investment-platform/admin/assets/">
            Assets &amp; Networks
          </a>

          <a href="/crypto-investment-platform/admin/deposit-wallets/">
            Deposit Wallets
          </a>

          <a href="/crypto-investment-platform/admin/deposits/">
            Deposits
          </a>

          <a
            href="/crypto-investment-platform/admin/withdrawals/"
            className="active"
          >
            Withdrawals
          </a>

          <a href="/crypto-investment-platform/admin/transactions/">
            Transactions
          </a>

          <a href="/crypto-investment-platform/admin/referrals/">
            Referrals
          </a>

          <a href="/crypto-investment-platform/admin/notifications/">
            Notifications
          </a>

          <a href="/crypto-investment-platform/admin/audit-logs/">
            Audit Logs
          </a>

          <a href="/crypto-investment-platform/admin/settings/">
            Settings
          </a>
        </nav>

        <div className="sidebar-security">
          <div className="security-dot" />

          <div>
            <strong>
              Secure Admin
            </strong>

            <span>
              {admin?.role
                ? admin.role.toUpperCase()
                : "Checking access..."}
            </span>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="page-header">
          <div>
            <div className="eyebrow">
              FINANCIAL OPERATIONS
            </div>

            <h1>Withdrawals</h1>

            <p>
              Review, approve and process investor withdrawal requests.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={() => void loadWithdrawals()}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>
        </header>

        {error && (
          <div className="alert alert-error">
            <strong>Error</strong>

            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <strong>Success</strong>

            <span>{success}</span>
          </div>
        )}

        {diagnostic && !loading && (
          <div className="alert alert-warning">
            <strong>Database Notice</strong>

            <span>{diagnostic}</span>
          </div>
        )}

        <section className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">
              TOTAL REQUESTS
            </div>

            <div className="stat-value">
              {stats.total}
            </div>

            <div className="stat-caption">
              All withdrawal requests
            </div>
          </div>

          <div className="stat-card pending-card">
            <div className="stat-label">
              PENDING
            </div>

            <div className="stat-value">
              {stats.pending}
            </div>

            <div className="stat-caption">
              Awaiting administrator review
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              APPROVED
            </div>

            <div className="stat-value">
              {stats.approved}
            </div>

            <div className="stat-caption">
              Approved for processing
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              PROCESSING
            </div>

            <div className="stat-value">
              {stats.processing}
            </div>

            <div className="stat-caption">
              Currently being processed
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              COMPLETED
            </div>

            <div className="stat-value">
              {stats.completed}
            </div>

            <div className="stat-caption">
              Successfully completed
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-label">
              PENDING VALUE
            </div>

            <div className="stat-value stat-value-small">
              $
              {totalPendingValue.toLocaleString(
                undefined,
                {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }
              )}
            </div>

            <div className="stat-caption">
              Display estimate across currencies
            </div>
          </div>
        </section>

        <section className="operations-panel">
          <div className="panel-heading">
            <div>
              <h2>
                Withdrawal Requests
              </h2>

              <p>
                {filteredWithdrawals.length} request
                {filteredWithdrawals.length === 1
                  ? ""
                  : "s"} displayed
              </p>
            </div>
          </div>

          <div className="toolbar">
            <div className="search-box">
              <span>⌕</span>

              <input
                type="text"
                placeholder="Search investor, address, currency or ID..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />
            </div>

            <select
              className="status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as (typeof STATUS_OPTIONS)[number]
                )
              }
            >
              <option value="all">
                All statuses
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="approved">
                Approved
              </option>

              <option value="processing">
                Processing
              </option>

              <option value="completed">
                Completed
              </option>

              <option value="rejected">
                Rejected
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>
          </div>

          <div className="table-wrapper">
            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner" />

                <h3>
                  Loading withdrawals
                </h3>

                <p>
                  Retrieving the latest withdrawal requests...
                </p>
              </div>
            ) : filteredWithdrawals.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  ↑
                </div>

                <h3>
                  No withdrawals found
                </h3>

                <p>
                  There are no withdrawal requests matching your current filters.
                </p>

                {withdrawals.length === 0 && (
                  <small>
                    The database query returned zero withdrawal records.
                    Check the browser console for diagnostic information.
                  </small>
                )}
              </div>
            ) : (
              <table className="withdrawals-table">
                <thead>
                  <tr>
                    <th>INVESTOR</th>
                    <th>AMOUNT</th>
                    <th>NETWORK</th>
                    <th>DESTINATION</th>
                    <th>STATUS</th>
                    <th>REQUESTED</th>
                    <th>ACTION</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredWithdrawals.map(
                    (withdrawal) => (
                      <tr key={withdrawal.id}>
                        <td>
                          <div className="investor-cell">
                            <div className="investor-avatar">
                              {getProfileName(
                                withdrawal.user_id
                              )
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {getProfileName(
                                  withdrawal.user_id
                                )}
                              </strong>

                              <span>
                                {getProfileUsername(
                                  withdrawal.user_id
                                ) ||
                                  `${withdrawal.user_id.slice(
                                    0,
                                    8
                                  )}...`}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="amount-cell">
                            <strong>
                              {formatAmount(
                                withdrawal.amount,
                                withdrawal.currency
                              )}
                            </strong>

                            {Number(
                              withdrawal.fee || 0
                            ) > 0 && (
                              <span>
                                Fee:{" "}
                                {formatAmount(
                                  withdrawal.fee,
                                  withdrawal.currency
                                )}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="network-cell">
                            <strong>
                              {withdrawal.network ||
                                "—"}
                            </strong>

                            <span>
                              {withdrawal.currency.toUpperCase()}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="address-cell">
                            <code>
                              {shortenAddress(
                                withdrawal.destination_address
                              )}
                            </code>

                            <button
                              className="copy-address"
                              title="Copy wallet address"
                              onClick={() =>
                                navigator.clipboard.writeText(
                                  withdrawal.destination_address
                                )
                              }
                            >
                              Copy
                            </button>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`status-badge ${getStatusClass(
                              withdrawal.status
                            )}`}
                          >
                            {withdrawal.status}
                          </span>
                        </td>

                        <td>
                          <div className="date-cell">
                            <strong>
                              {formatDate(
                                withdrawal.requested_at
                              )}
                            </strong>

                            {withdrawal.processed_at && (
                              <span>
                                Processed{" "}
                                {formatDate(
                                  withdrawal.processed_at
                                )}
                              </span>
                            )}
                          </div>
                        </td>

                        <td>
                          {getNextAction(
                            withdrawal
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="security-notice">
          <div className="security-notice-icon">
            !
          </div>

          <div>
            <h3>
              Withdrawal Security Protocol
            </h3>

            <p>
              Always independently verify the investor request,
              available balance, destination address, network and
              actual external transfer before marking a withdrawal as
              completed. The system does not automatically send
              cryptocurrency to the destination wallet.
            </p>
          </div>
        </section>
      </main>

      {selectedWithdrawal &&
        actionType && (
          <div
            className="modal-backdrop"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeAction();
              }
            }}
          >
            <div className="action-modal">
              <div className="modal-header">
                <div>
                  <div className="eyebrow">
                    ADMIN ACTION
                  </div>

                  <h2>
                    {getActionTitle()}
                  </h2>
                </div>

                <button
                  className="modal-close"
                  onClick={closeAction}
                  disabled={!!actionLoading}
                >
                  ×
                </button>
              </div>

              <div className="modal-withdrawal-summary">
                <div>
                  <span>Investor</span>

                  <strong>
                    {getProfileName(
                      selectedWithdrawal.user_id
                    )}
                  </strong>
                </div>

                <div>
                  <span>Amount</span>

                  <strong>
                    {formatAmount(
                      selectedWithdrawal.amount,
                      selectedWithdrawal.currency
                    )}
                  </strong>
                </div>

                <div>
                  <span>Network</span>

                  <strong>
                    {selectedWithdrawal.network ||
                      selectedWithdrawal.currency}
                  </strong>
                </div>

                <div>
                  <span>Destination</span>

                  <strong>
                    {shortenAddress(
                      selectedWithdrawal.destination_address
                    )}
                  </strong>
                </div>
              </div>

              <div className="modal-description">
                {getActionDescription()}
              </div>

              <label className="note-label">
                Administrator Note

                <textarea
                  value={note}
                  onChange={(event) =>
                    setNote(event.target.value)
                  }
                  placeholder="Optional note for the audit record..."
                  rows={4}
                />
              </label>

              <div className="modal-actions">
                <button
                  className="btn btn-secondary"
                  onClick={closeAction}
                  disabled={!!actionLoading}
                >
                  Cancel
                </button>

                <button
                  className={`btn ${
                    actionType === "reject"
                      ? "btn-danger"
                      : "btn-primary"
                  }`}
                  onClick={executeAction}
                  disabled={!!actionLoading}
                >
                  {actionLoading
                    ? "Processing..."
                    : actionType === "approve"
                      ? "Confirm Approval"
                      : actionType === "reject"
                        ? "Confirm Rejection"
                        : actionType === "process"
                          ? "Start Processing"
                          : "Confirm Completion"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
