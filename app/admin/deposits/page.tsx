"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import "./deposits.css";

type Deposit = {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  network: string;
  transaction_hash: string | null;
  wallet_address: string | null;
  status: string;
  created_at: string;
  confirmed_at: string | null;
};

type FilterType = "pending" | "confirmed" | "rejected" | "all";

type ModalMode = "confirm" | "reject" | null;

export default function AdminDepositsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterType>("pending");
  const [search, setSearch] = useState("");

  const [selectedDeposit, setSelectedDeposit] =
    useState<Deposit | null>(null);

  const [modalMode, setModalMode] =
    useState<ModalMode>(null);

  const [verificationNote, setVerificationNote] =
    useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copiedValue, setCopiedValue] = useState("");

  useEffect(() => {
    initializePage();
  }, []);

  async function initializePage() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          `Unable to restore login session: ${sessionError.message}`
        );
      }

      if (!session) {
        throw new Error(
          "Your login session has expired. Please log out and log back in."
        );
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(
          `Authentication error: ${userError.message}`
        );
      }

      if (!user) {
        throw new Error(
          "No authenticated user was found. Please log in again."
        );
      }

      const { data: admin, error: adminError } = await supabase
        .from("admin_users")
        .select("id, role, is_active")
        .eq("id", user.id)
        .eq("is_active", true)
        .in("role", ["admin", "manager"])
        .maybeSingle();

      if (adminError) {
        throw new Error(
          `Administrator verification failed: ${adminError.message}`
        );
      }

      if (!admin) {
        throw new Error(
          "Your account is not authorized to access the administrator area."
        );
      }

      await fetchDeposits();
    } catch (err) {
      console.error("ADMIN DEPOSITS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load the administrator page."
      );
    } finally {
      setLoading(false);
    }
  }

  async function fetchDeposits(showRefreshing = false) {
    if (showRefreshing) {
      setRefreshing(true);
    }

    try {
      /*
       * IMPORTANT:
       * Deposits are retrieved through an admin-only
       * SECURITY DEFINER RPC instead of directly querying
       * the deposits table from the browser.
       */
      const {
        data,
        error: depositsError,
      } = await supabase.rpc("admin_get_deposits");

      if (depositsError) {
        throw new Error(
          `Unable to load deposits: ${depositsError.message}`
        );
      }

      setDeposits((data || []) as Deposit[]);
    } catch (err) {
      console.error("FETCH DEPOSITS ERROR:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load deposits."
      );
    } finally {
      if (showRefreshing) {
        setRefreshing(false);
      }
    }
  }

  function openConfirmModal(deposit: Deposit) {
    setSelectedDeposit(deposit);
    setModalMode("confirm");
    setVerificationNote(
      "Transaction independently verified and deposit approved."
    );
    setMessage("");
    setError("");
  }

  function openRejectModal(deposit: Deposit) {
    setSelectedDeposit(deposit);
    setModalMode("reject");
    setVerificationNote("");
    setMessage("");
    setError("");
  }

  function closeModal() {
    if (processingId) {
      return;
    }

    setSelectedDeposit(null);
    setModalMode(null);
    setVerificationNote("");
  }

  async function verifyAdminAccess() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error(
        "Your login session has expired. Please log in again."
      );
    }

    const { data: admin, error: adminError } = await supabase
      .from("admin_users")
      .select("id, role, is_active")
      .eq("id", user.id)
      .eq("is_active", true)
      .in("role", ["admin", "manager"])
      .maybeSingle();

    if (adminError) {
      throw new Error(adminError.message);
    }

    if (!admin) {
      throw new Error(
        "Administrator authorization is required."
      );
    }

    return admin;
  }

  async function executeDepositAction() {
    if (!selectedDeposit || !modalMode) {
      return;
    }

    if (
      modalMode === "reject" &&
      !verificationNote.trim()
    ) {
      setError(
        "Please provide a reason for rejecting this deposit."
      );
      return;
    }

    if (
      modalMode === "confirm" &&
      !verificationNote.trim()
    ) {
      setError(
        "Please enter a verification note before confirming."
      );
      return;
    }

    const deposit = selectedDeposit;

    setProcessingId(deposit.id);
    setMessage("");
    setError("");

    try {
      await verifyAdminAccess();

      if (modalMode === "confirm") {
        const {
          data,
          error: rpcError,
        } = await supabase.rpc(
          "admin_confirm_deposit",
          {
            p_deposit_id: deposit.id,
            p_note: verificationNote.trim() || null,
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!data?.success) {
          throw new Error(
            "The deposit could not be confirmed."
          );
        }

        setMessage(
          `${formatAmount(deposit.amount)} ${deposit.currency} deposit confirmed successfully.`
        );
      } else {
        const {
          data,
          error: rpcError,
        } = await supabase.rpc(
          "admin_reject_deposit",
          {
            p_deposit_id: deposit.id,
            p_note: verificationNote.trim(),
          }
        );

        if (rpcError) {
          throw new Error(rpcError.message);
        }

        if (!data?.success) {
          throw new Error(
            "The deposit could not be rejected."
          );
        }

        setMessage(
          "Deposit rejected successfully."
        );
      }

      setSelectedDeposit(null);
      setModalMode(null);
      setVerificationNote("");

      await fetchDeposits();
    } catch (err) {
      console.error(
        "DEPOSIT ACTION ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to process the deposit."
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function copyToClipboard(
    value: string | null,
    label: string
  ) {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);

      setCopiedValue(label);

      window.setTimeout(() => {
        setCopiedValue("");
      }, 1800);
    } catch (err) {
      console.error("COPY ERROR:", err);
      setError("Unable to copy this value.");
    }
  }

  function formatAmount(amount: number) {
    return Number(amount).toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      }
    );
  }

  function formatDate(date: string | null) {
    if (!date) {
      return "—";
    }

    return new Date(date).toLocaleString(
      undefined,
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  function shortId(value: string) {
    if (value.length <= 14) {
      return value;
    }

    return `${value.slice(0, 8)}...${value.slice(-6)}`;
  }

  const statistics = useMemo(() => {
    const pending = deposits.filter(
      (deposit) => deposit.status === "pending"
    ).length;

    const confirmed = deposits.filter(
      (deposit) => deposit.status === "confirmed"
    ).length;

    const rejected = deposits.filter(
      (deposit) => deposit.status === "rejected"
    ).length;

    const total = deposits.length;

    const pendingValue = deposits
      .filter(
        (deposit) => deposit.status === "pending"
      )
      .reduce(
        (sum, deposit) =>
          sum + Number(deposit.amount || 0),
        0
      );

    return {
      pending,
      confirmed,
      rejected,
      total,
      pendingValue,
    };
  }, [deposits]);

  const filteredDeposits = useMemo(() => {
    const value = search.trim().toLowerCase();

    return deposits.filter((deposit) => {
      const matchesFilter =
        filter === "all" ||
        deposit.status === filter;

      if (!matchesFilter) {
        return false;
      }

      if (!value) {
        return true;
      }

      return (
        deposit.id
          .toLowerCase()
          .includes(value) ||
        deposit.user_id
          .toLowerCase()
          .includes(value) ||
        (deposit.transaction_hash || "")
          .toLowerCase()
          .includes(value) ||
        (deposit.wallet_address || "")
          .toLowerCase()
          .includes(value) ||
        deposit.currency
          .toLowerCase()
          .includes(value) ||
        deposit.network
          .toLowerCase()
          .includes(value) ||
        deposit.status
          .toLowerCase()
          .includes(value)
      );
    });
  }, [deposits, filter, search]);

  if (loading) {
    return (
      <main className="admin-deposits-page">
        <div className="admin-deposits-loading">
          <div className="deposit-loading-orb">
            <div className="deposit-loading-ring" />
          </div>

          <h2>Loading Deposit Control Center</h2>

          <p>
            Authenticating administrator access and
            retrieving deposit records...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="admin-deposits-page">
      <div className="deposit-background-orb orb-one" />
      <div className="deposit-background-orb orb-two" />

      <div className="admin-deposits-container">

        <header className="admin-deposits-topbar">
          <div className="deposit-header-copy">
            <div className="deposit-eyebrow">
              <span className="deposit-eyebrow-dot" />
              ADMINISTRATION
            </div>

            <h1>
              Deposit
              <span> Verification</span>
            </h1>

            <p>
              Review, verify and process investor
              deposit submissions securely.
            </p>
          </div>

          <div className="deposit-header-actions">
            <button
              type="button"
              className="deposit-refresh-button"
              onClick={() => {
                setMessage("");
                setError("");
                fetchDeposits(true);
              }}
              disabled={refreshing}
            >
              <span
                className={
                  refreshing
                    ? "refresh-icon spinning"
                    : "refresh-icon"
                }
              >
                ↻
              </span>

              {refreshing
                ? "Refreshing"
                : "Refresh"}
            </button>

            <Link
              href="/dashboard"
              className="admin-dashboard-link"
            >
              <span>←</span>
              Dashboard
            </Link>
          </div>
        </header>

        {error && (
          <div className="admin-deposit-alert admin-deposit-error">
            <span className="alert-icon">!</span>

            <div>
              <strong>
                Action requires attention
              </strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

        {message && (
          <div className="admin-deposit-alert admin-deposit-success">
            <span className="alert-icon">✓</span>

            <div>
              <strong>
                Operation completed
              </strong>
              <p>{message}</p>
            </div>

            <button
              type="button"
              onClick={() => setMessage("")}
            >
              ×
            </button>
          </div>
        )}

        <section className="deposit-stat-grid">

          <div className="deposit-stat-card pending-stat">
            <div className="deposit-stat-top">
              <span className="deposit-stat-label">
                PENDING REVIEW
              </span>

              <span className="deposit-stat-icon">
                ◷
              </span>
            </div>

            <strong>
              {statistics.pending}
            </strong>

            <span className="deposit-stat-description">
              Awaiting verification
            </span>
          </div>

          <div className="deposit-stat-card confirmed-stat">
            <div className="deposit-stat-top">
              <span className="deposit-stat-label">
                CONFIRMED
              </span>

              <span className="deposit-stat-icon">
                ✓
              </span>
            </div>

            <strong>
              {statistics.confirmed}
            </strong>

            <span className="deposit-stat-description">
              Successfully approved
            </span>
          </div>

          <div className="deposit-stat-card rejected-stat">
            <div className="deposit-stat-top">
              <span className="deposit-stat-label">
                REJECTED
              </span>

              <span className="deposit-stat-icon">
                ×
              </span>
            </div>

            <strong>
              {statistics.rejected}
            </strong>

            <span className="deposit-stat-description">
              Declined submissions
            </span>
          </div>

          <div className="deposit-stat-card total-stat">
            <div className="deposit-stat-top">
              <span className="deposit-stat-label">
                TOTAL REQUESTS
              </span>

              <span className="deposit-stat-icon">
                ◈
              </span>
            </div>

            <strong>
              {statistics.total}
            </strong>

            <span className="deposit-stat-description">
              All deposit submissions
            </span>
          </div>

        </section>

        {statistics.pending > 0 && (
          <div className="pending-review-banner">

            <div className="pending-banner-icon">
              $
            </div>

            <div>
              <strong>
                {statistics.pending} deposit
                {statistics.pending === 1
                  ? ""
                  : "s"} awaiting review
              </strong>

              <span>
                Pending submissions currently represent{" "}
                <strong>
                  {formatAmount(
                    statistics.pendingValue
                  )}
                </strong>{" "}
                in their respective currencies.
              </span>
            </div>

          </div>
        )}

        <section className="admin-deposit-controls">

          <div className="deposit-filter-buttons">

            {[
              [
                "pending",
                "Pending",
                statistics.pending,
              ],
              [
                "confirmed",
                "Confirmed",
                statistics.confirmed,
              ],
              [
                "rejected",
                "Rejected",
                statistics.rejected,
              ],
              [
                "all",
                "All Deposits",
                statistics.total,
              ],
            ].map(
              ([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    filter === value
                      ? "deposit-filter active"
                      : "deposit-filter"
                  }
                  onClick={() =>
                    setFilter(
                      value as FilterType
                    )
                  }
                >
                  <span>{label}</span>
                  <small>{count}</small>
                </button>
              )
            )}

          </div>

          <div className="deposit-search-wrapper">

            <span className="deposit-search-icon">
              ⌕
            </span>

            <input
              type="search"
              placeholder="Search hash, investor ID, wallet..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="deposit-search"
            />

            {search && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}

          </div>

        </section>

        <section className="admin-deposit-card">

          <div className="admin-section-heading">

            <div>
              <span className="section-heading-label">
                DEPOSIT REQUESTS
              </span>

              <h2>
                {filter === "all"
                  ? "All Deposits"
                  : `${filter
                      .charAt(0)
                      .toUpperCase()}${filter.slice(
                      1
                    )} Deposits`}
              </h2>

              <p>
                {filteredDeposits.length} matching
                record
                {filteredDeposits.length === 1
                  ? ""
                  : "s"}
              </p>
            </div>

            <div className="live-indicator">
              <span />
              LIVE DATA
            </div>

          </div>

          {filteredDeposits.length === 0 ? (

            <div className="admin-deposit-empty">

              <div className="empty-deposit-icon">
                <span>◈</span>
              </div>

              <h3>
                No deposits found
              </h3>

              <p>
                There are currently no deposits
                matching your selected filter or
                search criteria.
              </p>

              {(search || filter !== "pending") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("pending");
                  }}
                  className="empty-reset-button"
                >
                  Reset filters
                </button>
              )}

            </div>

          ) : (

            <div className="admin-deposit-table-wrapper">

              <table className="admin-deposit-table">

                <thead>
                  <tr>
                    <th>Deposit</th>
                    <th>Investor</th>
                    <th>Amount</th>
                    <th>Network</th>
                    <th>Transaction</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {filteredDeposits.map(
                    (deposit) => (

                      <tr
                        key={deposit.id}
                        className={
                          processingId ===
                          deposit.id
                            ? "processing-row"
                            : ""
                        }
                      >

                        <td>
                          <button
                            type="button"
                            className="deposit-id-button"
                            onClick={() =>
                              copyToClipboard(
                                deposit.id,
                                `id-${deposit.id}`
                              )
                            }
                            title="Copy deposit ID"
                          >
                            <code>
                              {shortId(
                                deposit.id
                              )}
                            </code>

                            <span>
                              {copiedValue ===
                              `id-${deposit.id}`
                                ? "Copied"
                                : "Copy"}
                            </span>
                          </button>
                        </td>

                        <td>
                          <div className="investor-cell">

                            <div className="investor-avatar">
                              {deposit.user_id
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                Investor
                              </strong>

                              <button
                                type="button"
                                onClick={() =>
                                  copyToClipboard(
                                    deposit.user_id,
                                    `user-${deposit.user_id}`
                                  )
                                }
                              >
                                {shortId(
                                  deposit.user_id
                                )}
                              </button>
                            </div>

                          </div>
                        </td>

                        <td>
                          <div className="amount-cell">

                            <strong>
                              {formatAmount(
                                deposit.amount
                              )}
                            </strong>

                            <span>
                              {deposit.currency}
                            </span>

                          </div>
                        </td>

                        <td>
                          <div className="network-cell">
                            <span className="network-badge">
                              {deposit.network}
                            </span>
                          </div>
                        </td>

                        <td>
                          {deposit.transaction_hash ? (
                            <button
                              type="button"
                              className="hash-cell"
                              onClick={() =>
                                copyToClipboard(
                                  deposit.transaction_hash,
                                  `hash-${deposit.id}`
                                )
                              }
                              title="Copy transaction hash"
                            >
                              <code>
                                {shortId(
                                  deposit.transaction_hash
                                )}
                              </code>

                              <span>
                                {copiedValue ===
                                `hash-${deposit.id}`
                                  ? "Copied"
                                  : "Copy"}
                              </span>
                            </button>
                          ) : (
                            <span className="missing-value">
                              No hash
                            </span>
                          )}
                        </td>

                        <td>
                          <span
                            className={`deposit-status ${deposit.status}`}
                          >
                            <span />
                            {deposit.status}
                          </span>
                        </td>

                        <td>
                          <div className="date-cell">

                            <strong>
                              {new Date(
                                deposit.created_at
                              ).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                }
                              )}
                            </strong>

                            <span>
                              {new Date(
                                deposit.created_at
                              ).toLocaleTimeString(
                                undefined,
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </span>

                          </div>
                        </td>

                        <td>

                          {deposit.status ===
                          "pending" ? (

                            <div className="deposit-actions">

                              <button
                                type="button"
                                className="deposit-view-button"
                                onClick={() =>
                                  openConfirmModal(
                                    deposit
                                  )
                                }
                              >
                                Review
                              </button>

                              <button
                                type="button"
                                className="deposit-reject-mini"
                                disabled={
                                  processingId ===
                                  deposit.id
                                }
                                onClick={() =>
                                  openRejectModal(
                                    deposit
                                  )
                                }
                                title="Reject deposit"
                              >
                                ×
                              </button>

                            </div>

                          ) : (

                            <span className="action-completed">
                              <span>✓</span>
                              Processed
                            </span>

                          )}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </section>

        <div className="admin-deposit-security-note">

          <div className="security-note-icon">
            !
          </div>

          <div>
            <strong>
              Financial verification requirement
            </strong>

            <p>
              A deposit must remain pending until an
              authorized administrator independently
              verifies that the transaction was actually
              received on the specified network and
              receiving wallet. Confirming a deposit
              credits the investor wallet balance and
              creates the corresponding financial
              transaction record.
            </p>
          </div>

          <span className="security-lock">
            SECURE
          </span>

        </div>

      </div>

      {selectedDeposit && modalMode && (
        <div
          className="deposit-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="deposit-modal">

            <div className="deposit-modal-header">

              <div>
                <span className="modal-eyebrow">
                  {modalMode === "confirm"
                    ? "DEPOSIT VERIFICATION"
                    : "DEPOSIT REJECTION"}
                </span>

                <h2>
                  {modalMode === "confirm"
                    ? "Review & Confirm"
                    : "Reject Deposit"}
                </h2>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeModal}
                disabled={!!processingId}
              >
                ×
              </button>

            </div>

            <div className="verification-amount">

              <span>
                DEPOSIT AMOUNT
              </span>

              <strong>
                {formatAmount(
                  selectedDeposit.amount
                )}{" "}
                <small>
                  {selectedDeposit.currency}
                </small>
              </strong>

              <div className="verification-status">
                <span />
                {selectedDeposit.status}
              </div>

            </div>

            <div className="verification-grid">

              <div className="verification-detail">
                <span>Deposit ID</span>

                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      selectedDeposit.id,
                      "modal-deposit-id"
                    )
                  }
                >
                  <code>
                    {shortId(
                      selectedDeposit.id
                    )}
                  </code>

                  <small>
                    {copiedValue ===
                    "modal-deposit-id"
                      ? "Copied"
                      : "Copy"}
                  </small>
                </button>
              </div>

              <div className="verification-detail">
                <span>Investor ID</span>

                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      selectedDeposit.user_id,
                      "modal-user-id"
                    )
                  }
                >
                  <code>
                    {shortId(
                      selectedDeposit.user_id
                    )}
                  </code>

                  <small>
                    {copiedValue ===
                    "modal-user-id"
                      ? "Copied"
                      : "Copy"}
                  </small>
                </button>
              </div>

              <div className="verification-detail">
                <span>Network</span>

                <strong>
                  {selectedDeposit.network}
                </strong>
              </div>

              <div className="verification-detail">
                <span>Submitted</span>

                <strong>
                  {formatDate(
                    selectedDeposit.created_at
                  )}
                </strong>
              </div>

              <div className="verification-detail full-detail">
                <span>Transaction Hash</span>

                {selectedDeposit.transaction_hash ? (
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        selectedDeposit.transaction_hash,
                        "modal-hash"
                      )
                    }
                  >
                    <code>
                      {
                        selectedDeposit.transaction_hash
                      }
                    </code>

                    <small>
                      {copiedValue ===
                      "modal-hash"
                        ? "Copied"
                        : "Copy hash"}
                    </small>
                  </button>
                ) : (
                  <strong className="missing-value">
                    No transaction hash provided
                  </strong>
                )}
              </div>

              <div className="verification-detail full-detail">
                <span>Receiving Wallet</span>

                {selectedDeposit.wallet_address ? (
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        selectedDeposit.wallet_address,
                        "modal-wallet"
                      )
                    }
                  >
                    <code>
                      {
                        selectedDeposit.wallet_address
                      }
                    </code>

                    <small>
                      {copiedValue ===
                      "modal-wallet"
                        ? "Copied"
                        : "Copy wallet"}
                    </small>
                  </button>
                ) : (
                  <strong className="missing-value">
                    No wallet address recorded
                  </strong>
                )}
              </div>

            </div>

            {modalMode === "confirm" ? (

              <div className="verification-warning">

                <div className="warning-symbol">
                  !
                </div>

                <div>
                  <strong>
                    Verify the blockchain transaction
                    before confirming
                  </strong>

                  <p>
                    Confirm this request only after
                    independently checking the
                    transaction hash, network, receiving
                    wallet and actual amount received.
                    Confirmation will credit the
                    investor&apos;s wallet balance.
                  </p>
                </div>

              </div>

            ) : (

              <div className="rejection-warning">

                <div className="warning-symbol">
                  ×
                </div>

                <div>
                  <strong>
                    Rejection is permanent for this
                    request
                  </strong>

                  <p>
                    Provide a clear reason explaining why
                    the submitted deposit could not be
                    verified.
                  </p>
                </div>

              </div>

            )}

            <div className="verification-note-field">

              <label>
                {modalMode === "confirm"
                  ? "Verification Note"
                  : "Rejection Reason"}

                <span>*</span>
              </label>

              <textarea
                value={verificationNote}
                onChange={(event) =>
                  setVerificationNote(
                    event.target.value
                  )
                }
                placeholder={
                  modalMode === "confirm"
                    ? "Describe how the transaction was verified..."
                    : "Explain why this deposit is being rejected..."
                }
                rows={4}
                disabled={!!processingId}
              />

            </div>

            <div className="deposit-modal-actions">

              <button
                type="button"
                className="modal-cancel-button"
                onClick={closeModal}
                disabled={!!processingId}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  modalMode === "confirm"
                    ? "modal-confirm-button"
                    : "modal-reject-button"
                }
                onClick={executeDepositAction}
                disabled={
                  !!processingId ||
                  !verificationNote.trim()
                }
              >

                {processingId ===
                selectedDeposit.id ? (

                  <>
                    <span className="button-spinner" />
                    Processing...
                  </>

                ) : modalMode === "confirm" ? (

                  <>
                    <span>✓</span>
                    Confirm Deposit
                  </>

                ) : (

                  <>
                    <span>×</span>
                    Reject Deposit
                  </>

                )}

              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}