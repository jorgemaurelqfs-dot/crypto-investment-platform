"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "./admin.css";

type AdminProfile = {
  id: string;
  role: "admin" | "manager" | "support";
  is_active: boolean;
};

type DashboardOverview = {
  total_users: number;
  verified_users: number;
  active_investments: number;
  active_investment_value_usdt: number;
  pending_deposits: number;
  pending_deposit_value_usdt: number;
  pending_withdrawals: number;
  pending_withdrawal_value_usdt: number;
  total_confirmed_deposits_usdt: number;
  total_completed_withdrawals_usdt: number;
  total_available_usdt: number;
  recent_transactions: RecentTransaction[];
};

type RecentTransaction = {
  id: string;
  user_id: string;
  username: string | null;
  full_name: string | null;
  type: string;
  amount: number;
  currency: string;
  reference: string | null;
  description: string | null;
  created_at: string;
};

const EMPTY_OVERVIEW: DashboardOverview = {
  total_users: 0,
  verified_users: 0,
  active_investments: 0,
  active_investment_value_usdt: 0,
  pending_deposits: 0,
  pending_deposit_value_usdt: 0,
  pending_withdrawals: 0,
  pending_withdrawal_value_usdt: 0,
  total_confirmed_deposits_usdt: 0,
  total_completed_withdrawals_usdt: 0,
  total_available_usdt: 0,
  recent_transactions: [],
};

function formatMoney(value: number | null | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsedDate);
}

function getTransactionIcon(type: string) {
  switch (type.toLowerCase()) {
    case "deposit":
      return "↓";

    case "withdrawal":
      return "↑";

    case "investment":
      return "◈";

    case "return":
      return "↗";

    case "referral":
      return "♧";

    case "bonus":
      return "✦";

    case "fee":
      return "−";

    case "adjustment":
      return "±";

    default:
      return "•";
  }
}

function getTransactionClass(type: string) {
  switch (type.toLowerCase()) {
    case "deposit":
    case "return":
    case "referral":
    case "bonus":
      return "transaction-positive";

    case "withdrawal":
    case "investment":
    case "fee":
      return "transaction-negative";

    default:
      return "transaction-neutral";
  }
}

export default function AdminDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  const [overview, setOverview] =
    useState<DashboardOverview>(EMPTY_OVERVIEW);

  const [error, setError] = useState("");

  /*
   * Prevents dashboard requests from being started multiple
   * times while authentication is initializing.
   */
  const loadingRef = useRef(false);

  /*
   * Prevents state updates after the component has unmounted.
   */
  const mountedRef = useRef(false);

  /*
   * Prevents redirect loops.
   */
  const redirectingRef = useRef(false);

  /*
   * ---------------------------------------------------------
   * REDIRECT TO LOGIN
   * ---------------------------------------------------------
   */
  const redirectToLogin = useCallback(() => {
    if (redirectingRef.current) {
      return;
    }

    redirectingRef.current = true;

    setAdmin(null);
    setLoading(false);

    router.replace("/login");
  }, [router]);

  /*
   * ---------------------------------------------------------
   * LOAD ADMIN DASHBOARD
   * ---------------------------------------------------------
   */
  const loadDashboard = useCallback(
    async (showRefresh = false) => {
      if (!mountedRef.current) {
        return;
      }

      /*
       * Do not start another request while one is already running.
       */
      if (loadingRef.current) {
        return;
      }

      loadingRef.current = true;

      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        /*
         * -----------------------------------------------------
         * STEP 1
         * Get the current browser session.
         *
         * getSession() is intentionally used first because
         * getUser() throws "Auth session missing!" when there
         * is no active session.
         * -----------------------------------------------------
         */
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error(
            "Supabase session error:",
            sessionError
          );

          redirectToLogin();
          return;
        }

        /*
         * No active login session.
         */
        if (!session?.user) {
          redirectToLogin();
          return;
        }

        const user = session.user;

        /*
         * -----------------------------------------------------
         * STEP 2
         * Confirm the authenticated user still exists.
         *
         * This is an additional authentication validation.
         * -----------------------------------------------------
         */
        const {
          data: { user: verifiedUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error(
            "Supabase user validation error:",
            userError
          );

          /*
           * An expired/missing session should send the user
           * back to login rather than displaying an error.
           */
          if (
            userError.message
              .toLowerCase()
              .includes("auth session missing")
          ) {
            redirectToLogin();
            return;
          }

          throw new Error(userError.message);
        }

        if (!verifiedUser) {
          redirectToLogin();
          return;
        }

        /*
         * Make sure the authenticated user matches the session.
         */
        if (verifiedUser.id !== user.id) {
          redirectToLogin();
          return;
        }

        /*
         * -----------------------------------------------------
         * STEP 3
         * Check whether the authenticated user is actually
         * registered as an active administrator.
         * -----------------------------------------------------
         */
        const {
          data: adminData,
          error: adminError,
        } = await supabase
          .from("admin_users")
          .select("id, role, is_active")
          .eq("id", user.id)
          .maybeSingle();

        if (adminError) {
          console.error(
            "Admin authorization error:",
            adminError
          );

          throw new Error(adminError.message);
        }

        /*
         * Authenticated user but not an active administrator.
         */
        if (!adminData || !adminData.is_active) {
          console.warn(
            "Authenticated user is not an active administrator."
          );

          setAdmin(null);

          router.replace("/dashboard");
          return;
        }

        /*
         * -----------------------------------------------------
         * STEP 4
         * Store administrator information.
         * -----------------------------------------------------
         */
        if (mountedRef.current) {
          setAdmin(adminData as AdminProfile);
        }

        /*
         * -----------------------------------------------------
         * STEP 5
         * Load protected dashboard statistics through the
         * SECURITY DEFINER admin RPC.
         * -----------------------------------------------------
         */
        const {
          data: dashboardData,
          error: dashboardError,
        } = await supabase.rpc("admin_dashboard_overview");

        if (dashboardError) {
          console.error(
            "Dashboard RPC error:",
            dashboardError
          );

          /*
           * If the session expired between the authentication
           * check and the RPC call, send the admin to login.
           */
          const dashboardMessage =
            dashboardError.message.toLowerCase();

          if (
            dashboardMessage.includes("unauthorized") ||
            dashboardMessage.includes("jwt") ||
            dashboardMessage.includes("session")
          ) {
            redirectToLogin();
            return;
          }

          throw new Error(dashboardError.message);
        }

        /*
         * -----------------------------------------------------
         * STEP 6
         * Save dashboard data.
         * -----------------------------------------------------
         */
        if (mountedRef.current && dashboardData) {
          setOverview(
            dashboardData as DashboardOverview
          );
        }
      } catch (err) {
        console.error(
          "Admin dashboard error:",
          err
        );

        if (!mountedRef.current) {
          return;
        }

        /*
         * Never display "Auth session missing!" as a dashboard
         * application error. It means the login session is gone.
         */
        const message =
          err instanceof Error
            ? err.message
            : "Unable to load the admin dashboard.";

        if (
          message
            .toLowerCase()
            .includes("auth session missing")
        ) {
          redirectToLogin();
          return;
        }

        setError(message);
      } finally {
        loadingRef.current = false;

        if (mountedRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [redirectToLogin, router]
  );

  /*
   * ---------------------------------------------------------
   * INITIAL AUTHENTICATION + SESSION LISTENER
   * ---------------------------------------------------------
   */
  useEffect(() => {
    mountedRef.current = true;

    /*
     * Listen for login/logout/session refresh events.
     */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(
          "Admin auth event:",
          event
        );

        /*
         * SIGNED_OUT
         */
        if (event === "SIGNED_OUT") {
          if (mountedRef.current) {
            setAdmin(null);
            setOverview(EMPTY_OVERVIEW);
            setError("");
            setLoading(false);
          }

          redirectToLogin();
          return;
        }

        /*
         * A session has disappeared.
         */
        if (!session?.user) {
          if (
            event === "INITIAL_SESSION" ||
            event === "TOKEN_REFRESHED"
          ) {
            redirectToLogin();
          }

          return;
        }

        /*
         * INITIAL_SESSION means Supabase has finished restoring
         * the browser session.
         *
         * We can safely load the admin dashboard now.
         */
        if (event === "INITIAL_SESSION") {
          void loadDashboard(false);
          return;
        }

        /*
         * When a new login happens, reload the dashboard.
         */
        if (event === "SIGNED_IN") {
          void loadDashboard(false);
          return;
        }

        /*
         * When the JWT is refreshed, don't unnecessarily reload
         * the entire dashboard.
         */
      }
    );

    /*
     * Fallback initialization.
     *
     * This is useful if the auth event fires before this
     * component has finished setting up.
     */
    void (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mountedRef.current) {
          return;
        }

        if (!session?.user) {
          redirectToLogin();
          return;
        }

        void loadDashboard(false);
      } catch (err) {
        console.error(
          "Initial admin session check failed:",
          err
        );

        if (mountedRef.current) {
          redirectToLogin();
        }
      }
    })();

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [loadDashboard, redirectToLogin]);

  /*
   * ---------------------------------------------------------
   * LOGOUT
   * ---------------------------------------------------------
   */
  async function handleLogout() {
    try {
      setError("");

      const { error: signOutError } =
        await supabase.auth.signOut();

      if (signOutError) {
        console.error(
          "Logout error:",
          signOutError
        );

        setError(signOutError.message);
        return;
      }

      setAdmin(null);
      setOverview(EMPTY_OVERVIEW);

      router.replace("/login");
    } catch (err) {
      console.error(
        "Unexpected logout error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to log out."
      );
    }
  }

  /*
   * ---------------------------------------------------------
   * LOADING SCREEN
   * ---------------------------------------------------------
   */
  if (loading) {
    return (
      <main className="admin-loading-screen">
        <div className="admin-loading-orb"></div>

        <div className="admin-loader">
          <div className="admin-loader-ring"></div>

          <span>
            Loading administration console...
          </span>
        </div>
      </main>
    );
  }

  /*
   * ---------------------------------------------------------
   * DASHBOARD
   * ---------------------------------------------------------
   */
  return (
    <main className="admin-dashboard">

      <div className="admin-background-grid"></div>

      <div className="admin-glow admin-glow-one"></div>

      <div className="admin-glow admin-glow-two"></div>

      <div className="admin-container">

        {/* =====================================================
            TOP HEADER
            ===================================================== */}

        <header className="admin-topbar">

          <div className="admin-brand">

            <div className="admin-brand-mark">
              M
            </div>

            <div>

              <div className="admin-brand-name">
                Investment Console
              </div>

              <div className="admin-brand-subtitle">
                Secure administration environment
              </div>

            </div>

          </div>


          <div className="admin-topbar-right">

            <button
              type="button"
              className="admin-refresh-button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
            >

              <span
                className={
                  refreshing
                    ? "refresh-spin"
                    : ""
                }
              >
                ↻
              </span>

              {refreshing
                ? "Refreshing..."
                : "Refresh"}

            </button>


            <div className="admin-user-badge">

              <div className="admin-user-avatar">
                A
              </div>

              <div>

                <strong>
                  Administrator
                </strong>

                <span>
                  {admin?.role?.toUpperCase()}
                </span>

              </div>

            </div>


            <button
              type="button"
              className="admin-logout"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>

        </header>


        {/* =====================================================
            HERO
            ===================================================== */}

        <section className="admin-hero">

          <div>

            <div className="admin-eyebrow">

              <span className="admin-eyebrow-dot"></span>

              ADMIN CONTROL CENTER

            </div>


            <h1>

              Command center for your

              <span>
                {" "}investment platform.
              </span>

            </h1>


            <p>
              Monitor platform activity, manage investor
              balances, review transactions and control
              financial operations from one secure workspace.
            </p>

          </div>


          <div className="admin-system-status">

            <span className="system-status-dot"></span>

            <div>

              <strong>
                System Operational
              </strong>

              <small>
                All administration services available
              </small>

            </div>

          </div>

        </section>


        {/* =====================================================
            ERROR
            ===================================================== */}

        {error && (

          <div className="admin-alert admin-alert-error">

            <div className="admin-alert-icon">
              !
            </div>

            <div>

              <strong>
                Dashboard error
              </strong>

              <span>
                {error}
              </span>

            </div>

          </div>

        )}


        {/* =====================================================
            MAIN STATISTICS
            ===================================================== */}

        <section className="admin-stat-grid">

          <div className="admin-stat-card stat-blue">

            <div className="admin-stat-top">

              <span>
                Total Users
              </span>

              <div className="admin-stat-icon">
                ◎
              </div>

            </div>

            <strong>
              {overview.total_users.toLocaleString()}
            </strong>

            <small>
              {overview.verified_users.toLocaleString()}
              {" "}verified accounts
            </small>

          </div>


          <div className="admin-stat-card stat-purple">

            <div className="admin-stat-top">

              <span>
                Active Investments
              </span>

              <div className="admin-stat-icon">
                ◈
              </div>

            </div>

            <strong>
              {overview.active_investments.toLocaleString()}
            </strong>

            <small>
              $
              {formatMoney(
                overview.active_investment_value_usdt
              )}
              {" "}USDT active value
            </small>

          </div>


          <div className="admin-stat-card stat-orange">

            <div className="admin-stat-top">

              <span>
                Pending Deposits
              </span>

              <div className="admin-stat-icon">
                ↓
              </div>

            </div>

            <strong>
              {overview.pending_deposits.toLocaleString()}
            </strong>

            <small>
              $
              {formatMoney(
                overview.pending_deposit_value_usdt
              )}
              {" "}USDT awaiting review
            </small>

          </div>


          <div className="admin-stat-card stat-red">

            <div className="admin-stat-top">

              <span>
                Pending Withdrawals
              </span>

              <div className="admin-stat-icon">
                ↑
              </div>

            </div>

            <strong>
              {overview.pending_withdrawals.toLocaleString()}
            </strong>

            <small>
              $
              {formatMoney(
                overview.pending_withdrawal_value_usdt
              )}
              {" "}USDT awaiting action
            </small>

          </div>

        </section>


        {/* =====================================================
            FINANCIAL OVERVIEW
            ===================================================== */}

        <section className="financial-overview">

          <div className="section-heading">

            <div>

              <div className="section-kicker">
                FINANCIAL OVERVIEW
              </div>

              <h2>
                Platform liquidity
              </h2>

            </div>


            <span className="live-indicator">

              <i></i>

              LIVE DATA

            </span>

          </div>


          <div className="financial-grid">

            <div className="financial-card">

              <span className="financial-label">
                Available USDT
              </span>

              <strong>
                $
                {formatMoney(
                  overview.total_available_usdt
                )}
              </strong>

              <small>
                Combined available investor wallet balances
              </small>

            </div>


            <div className="financial-card">

              <span className="financial-label">
                Confirmed Deposits
              </span>

              <strong>
                $
                {formatMoney(
                  overview.total_confirmed_deposits_usdt
                )}
              </strong>

              <small>
                Confirmed USDT deposits
              </small>

            </div>


            <div className="financial-card">

              <span className="financial-label">
                Completed Withdrawals
              </span>

              <strong>
                $
                {formatMoney(
                  overview.total_completed_withdrawals_usdt
                )}
              </strong>

              <small>
                Completed USDT withdrawals
              </small>

            </div>

          </div>

        </section>


        {/* =====================================================
            QUICK ADMIN ACTIONS
            ===================================================== */}

        <section className="admin-actions-section">

          <div className="section-heading">

            <div>

              <div className="section-kicker">
                ADMINISTRATION
              </div>

              <h2>
                Financial controls
              </h2>

            </div>

          </div>


          <div className="admin-actions-grid">


            <Link
              href="/admin/balances"
              className="admin-action admin-action-featured"
            >

              <div className="admin-action-icon">
                ◈
              </div>

              <div>

                <strong>
                  Balance Management
                </strong>

                <span>
                  Add or subtract available funds and
                  issue investor bonuses.
                </span>

              </div>

              <div className="admin-action-arrow">
                →
              </div>

            </Link>


            <Link
              href="/admin/deposits"
              className="admin-action"
            >

              <div className="admin-action-icon">
                ↓
              </div>

              <div>

                <strong>
                  Deposit Review
                </strong>

                <span>
                  Review and confirm pending investor deposits.
                </span>

              </div>

              <div className="admin-action-arrow">
                →
              </div>

            </Link>


            <Link
              href="/admin/withdrawals"
              className="admin-action"
            >

              <div className="admin-action-icon">
                ↑
              </div>

              <div>

                <strong>
                  Withdrawal Management
                </strong>

                <span>
                  Approve, process and complete withdrawal requests.
                </span>

              </div>

              <div className="admin-action-arrow">
                →
              </div>

            </Link>


            <Link
              href="/admin/assets"
              className="admin-action"
            >

              <div className="admin-action-icon">
                ◉
              </div>

              <div>

                <strong>
                  Assets & Networks
                </strong>

                <span>
                  Configure supported assets and blockchain networks.
                </span>

              </div>

              <div className="admin-action-arrow">
                →
              </div>

            </Link>


            <Link
              href="/admin/wallets"
              className="admin-action"
            >

              <div className="admin-action-icon">
                ⌁
              </div>

              <div>

                <strong>
                  Deposit Wallets
                </strong>

                <span>
                  Configure receiving wallets for supported networks.
                </span>

              </div>

              <div className="admin-action-arrow">
                →
              </div>

            </Link>


            <Link
              href="/admin/investments"
              className="admin-action"
            >

              <div className="admin-action-icon">
                ◆
              </div>

              <div>

                <strong>
                  Investments
                </strong>

                <span>
                  Monitor active investments and investor positions.
                </span>

              </div>

              <div className="admin-action-arrow">
                →
              </div>

            </Link>


            <Link
              href="/admin/users"
              className="admin-action"
            >

              <div className="admin-action-icon">
                ◎
              </div>

              <div>

                <strong>
                  User Management
                </strong>

                <span>
                  Search investors and manage account information.
                </span>

              </div>

              <div className="admin-action-arrow">
                →
              </div>

            </Link>


            <Link
              href="/admin/verifications"
              className="admin-action admin-action-verification"
            >

              <div className="admin-action-icon">
                ✓
              </div>

              <div>

                <strong>
                  Identity Verification
                </strong>

                <span>
                  Review investor identity documents and
                  manage verification requests.
                </span>

              </div>

              <div className="admin-action-arrow">
                →
              </div>

            </Link>


            <Link
              href="/admin/transactions"
              className="admin-action"
            >

              <div className="admin-action-icon">
                ≋
              </div>

              <div>

                <strong>
                  Transactions
                </strong>

                <span>
                  Review the platform financial transaction ledger.
                </span>

              </div>

              <div className="admin-action-arrow">
                →
              </div>

            </Link>

          </div>

        </section>


        {/* =====================================================
            ATTENTION REQUIRED
            ===================================================== */}

        <section className="attention-section">

          <div className="section-heading">

            <div>

              <div className="section-kicker">
                WORK QUEUE
              </div>

              <h2>
                Requires attention
              </h2>

            </div>

          </div>


          <div className="attention-grid">


            <Link
              href="/admin/deposits"
              className="attention-card"
            >

              <div className="attention-icon orange">
                ↓
              </div>

              <div className="attention-content">

                <strong>
                  Pending deposits
                </strong>

                <span>
                  {overview.pending_deposits}
                  {" "}deposit
                  {overview.pending_deposits === 1
                    ? ""
                    : "s"}
                  {" "}awaiting review
                </span>

              </div>

              <div className="attention-number">
                {overview.pending_deposits}
              </div>

            </Link>


            <Link
              href="/admin/withdrawals"
              className="attention-card"
            >

              <div className="attention-icon red">
                ↑
              </div>

              <div className="attention-content">

                <strong>
                  Pending withdrawals
                </strong>

                <span>
                  {overview.pending_withdrawals}
                  {" "}withdrawal
                  {overview.pending_withdrawals === 1
                    ? ""
                    : "s"}
                  {" "}awaiting action
                </span>

              </div>

              <div className="attention-number">
                {overview.pending_withdrawals}
              </div>

            </Link>


            <Link
              href="/admin/balances"
              className="attention-card"
            >

              <div className="attention-icon blue">
                ✦
              </div>

              <div className="attention-content">

                <strong>
                  Balance controls
                </strong>

                <span>
                  Issue a manual credit, debit or investor bonus
                </span>

              </div>

              <div className="attention-arrow">
                →
              </div>

            </Link>

          </div>

        </section>


        {/* =====================================================
            RECENT ACTIVITY
            ===================================================== */}

        <section className="recent-section">

          <div className="section-heading">

            <div>

              <div className="section-kicker">
                PLATFORM ACTIVITY
              </div>

              <h2>
                Recent transactions
              </h2>

            </div>


            <Link
              href="/admin/transactions"
              className="view-all-link"
            >
              View all →
            </Link>

          </div>


          <div className="recent-card">

            {overview.recent_transactions.length === 0 ? (

              <div className="empty-activity">

                <div className="empty-activity-icon">
                  ≋
                </div>

                <strong>
                  No recent transactions
                </strong>

                <span>
                  Platform financial activity will appear here.
                </span>

              </div>

            ) : (

              <div className="activity-list">

                {overview.recent_transactions.map(
                  (transaction) => (

                    <div
                      key={transaction.id}
                      className="activity-row"
                    >

                      <div
                        className={`activity-icon ${getTransactionClass(
                          transaction.type
                        )}`}
                      >
                        {getTransactionIcon(
                          transaction.type
                        )}
                      </div>


                      <div className="activity-main">

                        <strong>
                          {transaction.description ||
                            transaction.type}
                        </strong>

                        <span>
                          {transaction.username ||
                            transaction.full_name ||
                            "Investor"}
                        </span>

                      </div>


                      <div className="activity-type">
                        {transaction.type}
                      </div>


                      <div className="activity-amount">

                        {transaction.type.toLowerCase() ===
                        "withdrawal"
                          ? "-"
                          : "+"}

                        {formatMoney(
                          transaction.amount
                        )}

                        <small>
                          {transaction.currency}
                        </small>

                      </div>


                      <div className="activity-date">
                        {formatDate(
                          transaction.created_at
                        )}
                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </div>

        </section>


        {/* =====================================================
            SECURITY FOOTER
            ===================================================== */}

        <footer className="admin-security-footer">

          <div className="security-footer-icon">
            ✓
          </div>

          <div>

            <strong>
              Secure administration environment
            </strong>

            <span>
              Financial actions should only be performed
              after independently verifying the investor,
              amount and transaction details.
            </span>

          </div>

          <div className="security-footer-status">
            Protected
          </div>

        </footer>

      </div>

    </main>
  );
}