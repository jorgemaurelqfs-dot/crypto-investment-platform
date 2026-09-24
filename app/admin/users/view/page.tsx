"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import "../user-detail.css";

type UserDetails = {
  profile: {
    id: string;
    full_name: string | null;
    username: string | null;
    phone: string | null;
    country: string | null;
    referral_code: string | null;
    account_status: string | null;
    verification_status: string | null;
    created_at: string | null;
  } | null;

  auth: {
    email: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    phone_confirmed_at: string | null;
  } | null;

  wallet_balances: Array<{
    currency: string;
    balance: number;
  }>;

  profit_balances: Array<{
    currency: string;
    balance: number;
  }>;

  verification_documents: Array<{
    id: string;
    document_type: string;
    storage_path: string | null;
    original_file_name: string | null;
    mime_type: string | null;
    file_size: number | null;
    status: string;
    rejection_reason: string | null;
    submitted_at: string | null;
    reviewed_at: string | null;
  }>;

  restrictions: {
    login_restricted: boolean;
    deposit_restricted: boolean;
    investment_restricted: boolean;
    withdrawal_restricted: boolean;
    reason: string | null;
    restricted_at: string | null;
    updated_at: string | null;
  } | null;

  counts: {
    investments: number;
    deposits: number;
    withdrawals: number;
  };
};

export default function UserDetailsPage() {
  const router = useRouter();

  /*
   * GitHub Pages / static-export compatible routing.
   *
   * Instead of:
   * /admin/users/[id]
   *
   * this page uses:
   * /admin/users/view?id=USER_ID
   */
  const [userId, setUserId] = useState<string | null>(null);

  const [user, setUser] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [showRestrictionPanel, setShowRestrictionPanel] =
    useState(false);

  const [restrictions, setRestrictions] = useState({
    login_restricted: false,
    deposit_restricted: false,
    investment_restricted: false,
    withdrawal_restricted: false,
  });

  const [restrictionReason, setRestrictionReason] =
    useState("");

  const [verificationActionLoading, setVerificationActionLoading] =
    useState(false);

  const [rejectingVerification, setRejectingVerification] =
    useState(false);

  const [rejectionReason, setRejectionReason] =
    useState("");

  /*
   * Read the user ID from the URL query string.
   *
   * Example:
   * /admin/users/view?id=123456
   */
  useEffect(() => {
    const params = new URLSearchParams(
      window.location.search
    );

    const id = params.get("id");

    if (!id) {
      setError("No user ID was provided.");
      setLoading(false);
      return;
    }

    setUserId(id);
  }, []);

  /*
   * Load the user once the ID has been retrieved.
   */
  useEffect(() => {
    if (!userId) {
      return;
    }

    loadUser();
  }, [userId]);

  async function loadUser() {
    if (!userId) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error: rpcError } =
        await supabase.rpc(
          "admin_get_user_details",
          {
            p_user_id: userId,
          }
        );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data) {
        throw new Error(
          "No user record was returned."
        );
      }

      const parsedUser =
        typeof data === "string"
          ? JSON.parse(data)
          : data;

      setUser(parsedUser);

      if (parsedUser.restrictions) {
        setRestrictions({
          login_restricted:
            parsedUser.restrictions
              .login_restricted ?? false,

          deposit_restricted:
            parsedUser.restrictions
              .deposit_restricted ?? false,

          investment_restricted:
            parsedUser.restrictions
              .investment_restricted ?? false,

          withdrawal_restricted:
            parsedUser.restrictions
              .withdrawal_restricted ?? false,
        });

        setRestrictionReason(
          parsedUser.restrictions.reason ?? ""
        );
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to load this user's record."
      );
    } finally {
      setLoading(false);
    }
  }

  async function setAccountStatus(
    status:
      | "active"
      | "suspended"
      | "closed"
  ) {
    if (!user?.profile?.id) {
      return;
    }

    let reason = "";

    if (status === "suspended") {
      reason =
        window.prompt(
          "Enter the reason for suspending this account:"
        ) || "";

      if (!reason.trim()) {
        return;
      }
    }

    if (status === "closed") {
      const confirmed = window.confirm(
        "Are you sure you want to close this account?"
      );

      if (!confirmed) {
        return;
      }

      reason =
        window.prompt(
          "Enter the reason for closing this account:"
        ) || "";

      if (!reason.trim()) {
        return;
      }
    }

    setActionLoading(true);

    try {
      const { error: rpcError } =
        await supabase.rpc(
          "admin_set_account_status",
          {
            p_user_id: user.profile.id,
            p_status: status,
            p_reason: reason || null,
          }
        );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      await loadUser();
    } catch (err: any) {
      alert(
        err?.message ||
          "Unable to update the account status."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function saveRestrictions() {
    if (!user?.profile?.id) {
      return;
    }

    setActionLoading(true);

    try {
      const { error: rpcError } =
        await supabase.rpc(
          "admin_update_account_restrictions",
          {
            p_user_id: user.profile.id,

            p_login_restricted:
              restrictions.login_restricted,

            p_deposit_restricted:
              restrictions.deposit_restricted,

            p_investment_restricted:
              restrictions.investment_restricted,

            p_withdrawal_restricted:
              restrictions.withdrawal_restricted,

            p_reason:
              restrictionReason || null,
          }
        );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setShowRestrictionPanel(false);

      await loadUser();
    } catch (err: any) {
      alert(
        err?.message ||
          "Unable to update account restrictions."
      );
    } finally {
      setActionLoading(false);
    }
  }

  async function reviewVerification(
    status: "verified" | "rejected"
  ) {
    if (!user?.profile?.id) {
      return;
    }

    if (
      status === "rejected" &&
      !rejectionReason.trim()
    ) {
      alert(
        "Please enter a reason for rejecting the verification."
      );

      return;
    }

    const confirmed = window.confirm(
      status === "verified"
        ? "Approve this customer's verification? All pending verification documents will be marked approved."
        : "Reject this customer's verification? All pending verification documents will be marked rejected."
    );

    if (!confirmed) {
      return;
    }

    setVerificationActionLoading(true);

    try {
      const { error: rpcError } =
        await supabase.rpc(
          "admin_review_verification",
          {
            p_user_id: user.profile.id,

            p_status: status,

            p_rejection_reason:
              status === "rejected"
                ? rejectionReason.trim()
                : null,
          }
        );

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setRejectingVerification(false);
      setRejectionReason("");

      await loadUser();

      alert(
        status === "verified"
          ? "Verification approved successfully."
          : "Verification rejected successfully."
      );
    } catch (err: any) {
      alert(
        err?.message ||
          "Unable to update verification status."
      );
    } finally {
      setVerificationActionLoading(false);
    }
  }

  async function previewVerificationDocument(
    document: {
      storage_path: string | null;
      original_file_name: string | null;
    }
  ) {
    if (!document.storage_path) {
      alert(
        "This document does not have a storage path recorded."
      );

      return;
    }

    try {
      const { data, error: signedUrlError } =
        await supabase.storage
          .from("verification-documents")
          .createSignedUrl(
            document.storage_path,
            300
          );

      if (
        signedUrlError ||
        !data?.signedUrl
      ) {
        throw new Error(
          signedUrlError?.message ||
            "Unable to create a secure document link."
        );
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err: any) {
      alert(
        err?.message ||
          "Unable to open the verification document."
      );
    }
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "Never";
    }

    const date = new Date(value);

    if (
      Number.isNaN(date.getTime())
    ) {
      return value;
    }

    return date.toLocaleString();
  }

  /*
   * MONEY / CRYPTO FORMATTER
   */
  function formatMoney(
    amount:
      | number
      | string
      | null
      | undefined,
    currency = "USD"
  ) {
    const value = Number(amount || 0);

    const code = String(
      currency || "USD"
    ).toUpperCase();

    /*
     * Crypto assets
     */
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

    if (
      cryptoCurrencies.includes(code)
    ) {
      return `${code} ${value.toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 8,
        }
      )}`;
    }

    /*
     * Fiat currencies
     */
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

    if (
      fiatCurrencies.includes(code)
    ) {
      return new Intl.NumberFormat(
        "en-US",
        {
          style: "currency",
          currency: code,
          maximumFractionDigits: 2,
        }
      ).format(value);
    }

    /*
     * Unknown currency fallback
     */
    return `${code} ${value.toLocaleString(
      "en-US",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 8,
      }
    )}`;
  }

  function formatFileSize(
    size: number | null
  ) {
    if (!size) {
      return "Unknown size";
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (
      size <
      1024 * 1024
    ) {
      return `${(
        size / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      size /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  function statusClass(
    status: string | null
  ) {
    switch (status) {
      case "active":
      case "approved":
      case "verified":
        return "status-green";

      case "pending":
        return "status-yellow";

      case "suspended":
      case "rejected":
      case "closed":
        return "status-red";

      default:
        return "status-neutral";
    }
  }

  function documentName(
    type: string
  ) {
    switch (type) {
      case "passport":
        return "Passport";

      case "national_id":
        return "National ID";

      case "drivers_license":
        return "Driver's License";

      case "proof_of_address":
        return "Proof of Address";

      default:
        return "Other Document";
    }
  }

  /*
   * LOADING STATE
   */
  if (loading) {
    return (
      <main className="user-detail-page">
        <div className="detail-loading">
          <div className="loading-orbit">
            <div className="loading-dot" />
          </div>

          <h2>
            Loading User Intelligence
          </h2>

          <p>
            Retrieving account profile,
            authentication records and
            financial information...
          </p>
        </div>
      </main>
    );
  }

  /*
   * ERROR STATE
   */
  if (
    error ||
    !user ||
    !user.profile
  ) {
    return (
      <main className="user-detail-page">
        <div className="detail-error">
          <div className="error-icon">
            !
          </div>

          <h2>
            Unable To Load User Record
          </h2>

          <p>
            {error ||
              "The requested user record could not be found."}
          </p>

          <div className="error-actions">
            <button
              className="secondary-button"
              onClick={() =>
                router.push(
                  "/admin/users"
                )
              }
            >
              ← Back To Users
            </button>

            <button
              className="primary-button"
              onClick={loadUser}
            >
              Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  const profile = user.profile;

  const totalWalletBalance =
    user.wallet_balances.reduce(
      (total, item) =>
        total +
        Number(item.balance || 0),
      0
    );

  const totalProfitBalance =
    user.profit_balances.reduce(
      (total, item) =>
        total +
        Number(item.balance || 0),
      0
    );

  const initials =
    profile.full_name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(
        (name) => name[0]
      )
      .join("")
      .toUpperCase() ||
    profile.username
      ?.slice(0, 2)
      .toUpperCase() ||
    "US";

  return (
    <main className="user-detail-page">
      <div className="detail-background-grid" />

      <div className="detail-container">

        {/* HEADER */}
        <header className="detail-header">
          <div>
            <button
              className="back-button"
              onClick={() =>
                router.push(
                  "/admin/users"
                )
              }
            >
              <span>←</span>
              Back To User Management
            </button>

            <div className="header-title-row">
              <div className="user-avatar-large">
                {initials}

                <span
                  className={`online-indicator ${
                    profile.account_status ===
                    "active"
                      ? "online"
                      : "offline"
                  }`}
                />
              </div>

              <div>
                <div className="eyebrow">
                  USER COMMAND CENTER
                </div>

                <h1>
                  {profile.full_name ||
                    profile.username ||
                    "Unnamed User"}
                </h1>

                <div className="user-id-line">
                  <span>
                    ID: {profile.id}
                  </span>

                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        profile.id
                      )
                    }
                    className="copy-id"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="header-actions">
            <div
              className={`account-status-pill ${statusClass(
                profile.account_status
              )}`}
            >
              <span className="status-dot" />

              {(
                profile.account_status ||
                "unknown"
              ).toUpperCase()}
            </div>

            <div
              className={`verification-pill ${statusClass(
                profile.verification_status
              )}`}
            >
              <span>
                {profile.verification_status ===
                "verified"
                  ? "✓"
                  : "◆"}
              </span>

              {(
                profile.verification_status ||
                "unverified"
              ).toUpperCase()}
            </div>
          </div>
        </header>

        {/* QUICK METRICS */}
        <section className="metric-grid">
          <div className="metric-card">
            <div className="metric-icon blue">
              ◈
            </div>

            <div>
              <span className="metric-label">
                WALLET BALANCE
              </span>

              <strong>
                {formatMoney(
                  totalWalletBalance
                )}
              </strong>

              <small>
                Available customer funds
              </small>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon purple">
              ✦
            </div>

            <div>
              <span className="metric-label">
                PROFIT BALANCE
              </span>

              <strong>
                {formatMoney(
                  totalProfitBalance
                )}
              </strong>

              <small>
                Investment profit ledger
              </small>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon green">
              ↗
            </div>

            <div>
              <span className="metric-label">
                INVESTMENTS
              </span>

              <strong>
                {user.counts
                  ?.investments || 0}
              </strong>

              <small>
                Investment positions
              </small>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-icon gold">
              ⇄
            </div>

            <div>
              <span className="metric-label">
                TRANSACTIONS
              </span>

              <strong>
                {(user.counts
                  ?.deposits || 0) +
                  (user.counts
                    ?.withdrawals || 0)}
              </strong>

              <small>
                Deposits + withdrawals
              </small>
            </div>
          </div>
        </section>

        <div className="content-grid">

          {/* LEFT COLUMN */}
          <div className="main-column">

            {/* PROFILE */}
            <section className="panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">
                    PROFILE DATA
                  </span>

                  <h2>
                    Identity Information
                  </h2>
                </div>

                <div className="panel-code">
                  01 / PROFILE
                </div>
              </div>

              <div className="information-grid">
                <div className="info-field">
                  <span>
                    FULL NAME
                  </span>

                  <strong>
                    {profile.full_name ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="info-field">
                  <span>
                    USERNAME
                  </span>

                  <strong>
                    {profile.username
                      ? `@${profile.username}`
                      : "Not provided"}
                  </strong>
                </div>

                <div className="info-field">
                  <span>
                    PHONE NUMBER
                  </span>

                  <strong>
                    {profile.phone ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="info-field">
                  <span>
                    COUNTRY
                  </span>

                  <strong>
                    {profile.country ||
                      "Not provided"}
                  </strong>
                </div>

                <div className="info-field">
                  <span>
                    REFERRAL CODE
                  </span>

                  <strong className="mono">
                    {profile.referral_code ||
                      "Not assigned"}
                  </strong>
                </div>

                <div className="info-field">
                  <span>
                    ACCOUNT CREATED
                  </span>

                  <strong>
                    {formatDate(
                      profile.created_at
                    )}
                  </strong>
                </div>
              </div>
            </section>

            {/* AUTH */}
            <section className="panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">
                    AUTHENTICATION
                  </span>

                  <h2>
                    Login & Security Details
                  </h2>
                </div>

                <div className="security-badge">
                  SECURE
                </div>
              </div>

              <div className="auth-grid">
                <div className="auth-item">
                  <div className="auth-symbol">
                    ✉
                  </div>

                  <div>
                    <span>
                      Email Address
                    </span>

                    <strong>
                      {user.auth?.email ||
                        "Not available"}
                    </strong>
                  </div>
                </div>

                <div className="auth-item">
                  <div className="auth-symbol">
                    ◷
                  </div>

                  <div>
                    <span>
                      Last Sign-In
                    </span>

                    <strong>
                      {formatDate(
                        user.auth
                          ?.last_sign_in_at ||
                          null
                      )}
                    </strong>
                  </div>
                </div>

                <div className="auth-item">
                  <div className="auth-symbol">
                    ✓
                  </div>

                  <div>
                    <span>
                      Email Confirmation
                    </span>

                    <strong>
                      {user.auth
                        ?.email_confirmed_at
                        ? "Confirmed"
                        : "Not confirmed"}
                    </strong>
                  </div>
                </div>

                <div className="auth-item">
                  <div className="auth-symbol">
                    ▣
                  </div>

                  <div>
                    <span>
                      Phone Confirmation
                    </span>

                    <strong>
                      {user.auth
                        ?.phone_confirmed_at
                        ? "Confirmed"
                        : "Not confirmed"}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            {/* BALANCES */}
            <section className="panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">
                    FINANCIAL LEDGER
                  </span>

                  <h2>
                    Customer Balances
                  </h2>
                </div>
              </div>

              <div className="balance-sections">

                <div className="balance-block">
                  <div className="balance-block-title">
                    <span>
                      AVAILABLE WALLET
                    </span>

                    <small>
                      Funds available for platform
                      operations
                    </small>
                  </div>

                  {user.wallet_balances
                    ?.length ? (
                    <div className="balance-list">
                      {user.wallet_balances.map(
                        (
                          balance,
                          index
                        ) => (
                          <div
                            className="balance-row"
                            key={`${balance.currency}-${index}`}
                          >
                            <div className="currency-icon">
                              {balance.currency
                                .slice(0, 1)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {
                                  balance.currency
                                }
                              </strong>

                              <span>
                                Wallet Balance
                              </span>
                            </div>

                            <b>
                              {formatMoney(
                                Number(
                                  balance.balance ||
                                    0
                                ),
                                balance.currency
                              )}
                            </b>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="empty-mini">
                      No wallet balances
                      found.
                    </div>
                  )}
                </div>

                <div className="balance-block">
                  <div className="balance-block-title">
                    <span>
                      INVESTMENT PROFITS
                    </span>

                    <small>
                      Funds generated from
                      matured investments
                    </small>
                  </div>

                  {user.profit_balances
                    ?.length ? (
                    <div className="balance-list">
                      {user.profit_balances.map(
                        (
                          balance,
                          index
                        ) => (
                          <div
                            className="balance-row profit"
                            key={`${balance.currency}-${index}`}
                          >
                            <div className="currency-icon profit-icon">
                              ✦
                            </div>

                            <div>
                              <strong>
                                {
                                  balance.currency
                                }
                              </strong>

                              <span>
                                Investment Profit
                              </span>
                            </div>

                            <b>
                              {formatMoney(
                                Number(
                                  balance.balance ||
                                    0
                                ),
                                balance.currency
                              )}
                            </b>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="empty-mini">
                      No investment profit
                      balances found.
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* VERIFICATION DOCUMENTS */}
            <section className="panel verification-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">
                    COMPLIANCE CENTER
                  </span>

                  <h2>
                    Verification Documents
                  </h2>
                </div>

                <div className="document-count">
                  {user
                    .verification_documents
                    ?.length || 0}{" "}
                  FILES
                </div>
              </div>

              <div className="verification-notice">
                <div className="notice-icon">
                  !
                </div>

                <div>
                  <strong>
                    Identity verification
                    required
                  </strong>

                  <p>
                    Review submitted
                    documentation before
                    changing this customer's
                    verification status.
                  </p>
                </div>
              </div>

              {user.verification_documents
                ?.length ? (
                <div className="documents-list">
                  {user.verification_documents.map(
                    (document) => (
                      <div
                        className="document-card"
                        key={document.id}
                      >
                        <div className="document-icon">
                          ▤
                        </div>

                        <div className="document-details">
                          <strong>
                            {documentName(
                              document.document_type
                            )}
                          </strong>

                          <span>
                            {document.original_file_name ||
                              "Uploaded document"}
                          </span>

                          <small>
                            {formatFileSize(
                              document.file_size
                            )}{" "}
                            •{" "}
                            {formatDate(
                              document.submitted_at
                            )}
                          </small>
                        </div>

                        <div className="document-status">
                          <span
                            className={`status-badge ${statusClass(
                              document.status
                            )}`}
                          >
                            {
                              document.status
                            }
                          </span>

                          {document.rejection_reason && (
                            <small className="rejection-text">
                              {
                                document.rejection_reason
                              }
                            </small>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="empty-state">
                  <div>▱</div>

                  <h3>
                    No Verification
                    Documents
                  </h3>

                  <p>
                    This customer has not
                    submitted a verification
                    document yet.
                  </p>
                </div>
              )}

              <div className="verification-admin-actions">
                <div className="verification-action-heading">
                  <div>
                    <span className="panel-kicker">
                      ADMIN REVIEW
                    </span>

                    <h3>
                      Verification Decision
                    </h3>
                  </div>

                  <span
                    className={`status-badge ${statusClass(
                      profile.verification_status
                    )}`}
                  >
                    {(
                      profile.verification_status ||
                      "unverified"
                    ).toUpperCase()}
                  </span>
                </div>

                <p className="verification-action-description">
                  Open the submitted documents before approving or
                  rejecting this customer's identity verification.
                  Documents are opened through short-lived secure
                  links.
                </p>

                {user.verification_documents?.some(
                  (document) =>
                    document.status ===
                    "pending"
                ) && (
                  <div className="verification-pending-note">
                    <span>●</span>
                    Pending documents require review.
                  </div>
                )}

                {user.verification_documents?.length ? (
                  <div className="verification-document-actions">
                    {user.verification_documents.map(
                      (document) => (
                        <button
                          key={`open-${document.id}`}
                          type="button"
                          className="document-open-button"
                          disabled={
                            !document.storage_path ||
                            verificationActionLoading
                          }
                          onClick={() =>
                            previewVerificationDocument(
                              document
                            )
                          }
                        >
                          <span>↗</span>

                          Open{" "}
                          {documentName(
                            document.document_type
                          )}
                        </button>
                      )
                    )}
                  </div>
                ) : null}

                {!rejectingVerification ? (
                  <div className="verification-decision-buttons">
                    <button
                      type="button"
                      className="verification-approve-button"
                      disabled={
                        verificationActionLoading ||
                        !user.verification_documents?.some(
                          (document) =>
                            document.status ===
                            "pending"
                        )
                      }
                      onClick={() =>
                        reviewVerification(
                          "verified"
                        )
                      }
                    >
                      {verificationActionLoading
                        ? "Processing..."
                        : "✓ Approve Verification"}
                    </button>

                    <button
                      type="button"
                      className="verification-reject-button"
                      disabled={
                        verificationActionLoading ||
                        !user.verification_documents?.some(
                          (document) =>
                            document.status ===
                            "pending"
                        )
                      }
                      onClick={() =>
                        setRejectingVerification(
                          true
                        )
                      }
                    >
                      × Reject Verification
                    </button>
                  </div>
                ) : (
                  <div className="verification-rejection-form">
                    <label>
                      REJECTION REASON
                    </label>

                    <textarea
                      value={rejectionReason}
                      onChange={(event) =>
                        setRejectionReason(
                          event.target.value
                        )
                      }
                      placeholder="Explain why the submitted verification documents cannot be approved..."
                      rows={4}
                    />

                    <div className="verification-rejection-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        disabled={
                          verificationActionLoading
                        }
                        onClick={() => {
                          setRejectingVerification(
                            false
                          );

                          setRejectionReason(
                            ""
                          );
                        }}
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        className="verification-reject-button"
                        disabled={
                          verificationActionLoading ||
                          !rejectionReason.trim()
                        }
                        onClick={() =>
                          reviewVerification(
                            "rejected"
                          )
                        }
                      >
                        {verificationActionLoading
                          ? "Rejecting..."
                          : "Confirm Rejection"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN */}
          <aside className="side-column">

            {/* ACCOUNT CONTROL */}
            <section className="control-panel">
              <div className="control-header">
                <span className="panel-kicker">
                  ADMIN CONTROL
                </span>

                <h2>
                  Account Controls
                </h2>
              </div>

              <div className="control-status">
                <span>
                  Current Account State
                </span>

                <strong
                  className={statusClass(
                    profile.account_status
                  )}
                >
                  {(
                    profile.account_status ||
                    "unknown"
                  ).toUpperCase()}
                </strong>
              </div>

              <div className="control-actions">
                {profile.account_status ===
                    "suspended" ||
                profile.account_status ===
                    "closed" ? (
                  <button
                    className="control-button activate"
                    disabled={
                      actionLoading
                    }
                    onClick={() =>
                      setAccountStatus(
                        "active"
                      )
                    }
                  >
                    <span>✓</span>
                    Restore Account
                  </button>
                ) : (
                  <button
                    className="control-button suspend"
                    disabled={
                      actionLoading
                    }
                    onClick={() =>
                      setAccountStatus(
                        "suspended"
                      )
                    }
                  >
                    <span>Ⅱ</span>
                    Suspend Account
                  </button>
                )}

                <button
                  className="control-button restrict"
                  disabled={
                    actionLoading
                  }
                  onClick={() =>
                    setShowRestrictionPanel(
                      !showRestrictionPanel
                    )
                  }
                >
                  <span>⊘</span>
                  Manage Restrictions
                </button>

                {profile.account_status !==
                  "closed" && (
                  <button
                    className="control-button close"
                    disabled={
                      actionLoading
                    }
                    onClick={() =>
                      setAccountStatus(
                        "closed"
                      )
                    }
                  >
                    <span>×</span>
                    Close Account
                  </button>
                )}
              </div>
            </section>

            {/* RESTRICTIONS */}
            <section className="side-panel">
              <div className="side-panel-header">
                <div>
                  <span className="panel-kicker">
                    ACCESS MATRIX
                  </span>

                  <h3>
                    Restrictions
                  </h3>
                </div>

                <span className="shield-icon">
                  ◈
                </span>
              </div>

              <div className="restriction-list">

                <div className="restriction-item">
                  <div>
                    <strong>
                      Login Access
                    </strong>

                    <small>
                      Customer authentication
                    </small>
                  </div>

                  <span
                    className={
                      user.restrictions
                        ?.login_restricted
                        ? "restricted"
                        : "allowed"
                    }
                  >
                    {user.restrictions
                      ?.login_restricted
                      ? "BLOCKED"
                      : "ALLOWED"}
                  </span>
                </div>

                <div className="restriction-item">
                  <div>
                    <strong>
                      Deposits
                    </strong>

                    <small>
                      Incoming account
                      funding
                    </small>
                  </div>

                  <span
                    className={
                      user.restrictions
                        ?.deposit_restricted
                        ? "restricted"
                        : "allowed"
                    }
                  >
                    {user.restrictions
                      ?.deposit_restricted
                      ? "BLOCKED"
                      : "ALLOWED"}
                  </span>
                </div>

                <div className="restriction-item">
                  <div>
                    <strong>
                      Investments
                    </strong>

                    <small>
                      New investment
                      creation
                    </small>
                  </div>

                  <span
                    className={
                      user.restrictions
                        ?.investment_restricted
                        ? "restricted"
                        : "allowed"
                    }
                  >
                    {user.restrictions
                      ?.investment_restricted
                      ? "BLOCKED"
                      : "ALLOWED"}
                  </span>
                </div>

                <div className="restriction-item">
                  <div>
                    <strong>
                      Withdrawals
                    </strong>

                    <small>
                      Outgoing fund
                      transfers
                    </small>
                  </div>

                  <span
                    className={
                      user.restrictions
                        ?.withdrawal_restricted
                        ? "restricted"
                        : "allowed"
                    }
                  >
                    {user.restrictions
                      ?.withdrawal_restricted
                      ? "BLOCKED"
                      : "ALLOWED"}
                  </span>
                </div>

              </div>

              {user.restrictions?.reason && (
                <div className="restriction-reason">
                  <span>
                    ADMIN NOTE
                  </span>

                  <p>
                    {user.restrictions.reason}
                  </p>
                </div>
              )}
            </section>

            {/* ACTIVITY SUMMARY */}
            <section className="side-panel">
              <div className="side-panel-header">
                <div>
                  <span className="panel-kicker">
                    ACTIVITY
                  </span>

                  <h3>
                    Account Summary
                  </h3>
                </div>
              </div>

              <div className="activity-stat">
                <span>
                  Investments
                </span>

                <strong>
                  {user.counts
                    ?.investments || 0}
                </strong>
              </div>

              <div className="activity-stat">
                <span>
                  Deposits
                </span>

                <strong>
                  {user.counts
                    ?.deposits || 0}
                </strong>
              </div>

              <div className="activity-stat">
                <span>
                  Withdrawals
                </span>

                <strong>
                  {user.counts
                    ?.withdrawals || 0}
                </strong>
              </div>
            </section>

            {/* VERIFICATION STATUS */}
            <section className="side-panel verification-status-panel">
              <div className="verification-orb">
                {profile.verification_status ===
                "verified"
                  ? "✓"
                  : "!"}
              </div>

              <span className="panel-kicker">
                VERIFICATION STATUS
              </span>

              <h3>
                {(
                  profile.verification_status ||
                  "unverified"
                ).toUpperCase()}
              </h3>

              <p>
                {profile.verification_status ===
                "verified"
                  ? "This account has completed identity verification."
                  : profile.verification_status ===
                    "pending"
                  ? "Verification documents require administrative review."
                  : "This account has not completed verification."}
              </p>
            </section>
          </aside>
        </div>

        {/* RESTRICTION MODAL */}
        {showRestrictionPanel && (
          <div
            className="modal-overlay"
            onClick={() =>
              setShowRestrictionPanel(
                false
              )
            }
          >
            <div
              className="restriction-modal"
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              <div className="modal-top-line" />

              <div className="modal-header">
                <div>
                  <span className="panel-kicker">
                    SECURITY MATRIX
                  </span>

                  <h2>
                    Manage Restrictions
                  </h2>

                  <p>
                    Configure access restrictions
                    for this customer account.
                  </p>
                </div>

                <button
                  className="modal-close"
                  onClick={() =>
                    setShowRestrictionPanel(
                      false
                    )
                  }
                >
                  ×
                </button>
              </div>

              <div className="restriction-controls">

                <label className="restriction-toggle">
                  <div>
                    <strong>
                      Login Access
                    </strong>

                    <span>
                      Prevent authentication to
                      the platform.
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      restrictions.login_restricted
                    }
                    onChange={(event) =>
                      setRestrictions({
                        ...restrictions,

                        login_restricted:
                          event.target
                            .checked,
                      })
                    }
                  />

                  <span className="toggle-ui" />
                </label>

                <label className="restriction-toggle">
                  <div>
                    <strong>
                      Deposit Access
                    </strong>

                    <span>
                      Prevent new deposits from
                      being submitted.
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      restrictions.deposit_restricted
                    }
                    onChange={(event) =>
                      setRestrictions({
                        ...restrictions,

                        deposit_restricted:
                          event.target
                            .checked,
                      })
                    }
                  />

                  <span className="toggle-ui" />
                </label>

                <label className="restriction-toggle">
                  <div>
                    <strong>
                      Investment Access
                    </strong>

                    <span>
                      Prevent new investments
                      from being created.
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      restrictions.investment_restricted
                    }
                    onChange={(event) =>
                      setRestrictions({
                        ...restrictions,

                        investment_restricted:
                          event.target
                            .checked,
                      })
                    }
                  />

                  <span className="toggle-ui" />
                </label>

                <label className="restriction-toggle">
                  <div>
                    <strong>
                      Withdrawal Access
                    </strong>

                    <span>
                      Prevent outgoing withdrawal
                      requests.
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={
                      restrictions.withdrawal_restricted
                    }
                    onChange={(event) =>
                      setRestrictions({
                        ...restrictions,

                        withdrawal_restricted:
                          event.target
                            .checked,
                      })
                    }
                  />

                  <span className="toggle-ui" />
                </label>

              </div>

              <div className="reason-field">
                <label>
                  ADMIN REASON / INTERNAL NOTE
                </label>

                <textarea
                  value={restrictionReason}
                  onChange={(event) =>
                    setRestrictionReason(
                      event.target.value
                    )
                  }
                  placeholder="Enter the reason for applying these restrictions..."
                  rows={4}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="secondary-button"
                  onClick={() =>
                    setShowRestrictionPanel(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  className="primary-button"
                  disabled={
                    actionLoading
                  }
                  onClick={
                    saveRestrictions
                  }
                >
                  {actionLoading
                    ? "Saving..."
                    : "Save Restrictions"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}