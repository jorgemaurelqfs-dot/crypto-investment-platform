"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import "./dashboard.css";

/* =========================================================
   TYPES
========================================================= */

type Profile = {
  full_name: string | null;
  username: string | null;
  account_status: string;
  verification_status: string;
};

type WalletBalance = {
  id: string;
  currency: string;
  balance: number;
};

type ProfitBalance = {
  id: string;
  currency: string;
  balance: number;
};

type Investment = {
  id: string;
  plan_id: string;
  amount: number;
  currency: string;
  return_percentage: number;
  expected_return: number;
  started_at: string;
  maturity_at: string;
  status: string;
};

type InvestmentPlan = {
  id: string;
  name: string;
};

type Transaction = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  reference: string | null;
  description: string | null;
  created_at: string;
  direction: string | null;
  balance_source: string | null;
};

type Deposit = {
  id: string;
  amount: number;
  currency: string;
  network: string | null;
  transaction_hash: string | null;
  status: string;
  created_at: string;
};

type Withdrawal = {
  id: string;
  amount: number;
  currency: string;
  network: string | null;
  destination_address: string;
  fee: number;
  net_amount: number;
  status: string;
  requested_at: string;
};

type Activity = {
  id: string;
  type: string;
  amount: number;
  currency: string;
  description: string;
  reference: string | null;
  status: string;
  created_at: string;
  direction: string | null;
  balance_source: string | null;
};

/* =========================================================
   ICONS
========================================================= */

function Icon({
  name,
  size = 20,
}: {
  name: string;
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "grid":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );

    case "chart":
      return (
        <svg {...common}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="m7 15 3-4 3 2 5-7" />
          <path d="M18 6h2v2" />
        </svg>
      );

    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );

    case "arrow-up":
      return (
        <svg {...common}>
          <path d="M12 19V5" />
          <path d="m6 11 6-6 6 6" />
        </svg>
      );

    case "arrow-down":
      return (
        <svg {...common}>
          <path d="M12 5v14" />
          <path d="m18 13-6 6-6-6" />
        </svg>
      );

    case "receipt":
      return (
        <svg {...common}>
          <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h4" />
        </svg>
      );

    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <path d="M16 5.5a3 3 0 0 1 0 5.9" />
          <path d="M18 14.5c1.8.8 3 2.5 3 4.5" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5-3.2 8.6-8 10-4.8-1.4-8-5-8-10V6l8-3Z" />
          <path d="m8.5 12 2.2 2.2 4.8-5" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M4.5 20c.7-3.4 3.2-5.5 7.5-5.5s6.8 2.1 7.5 5.5" />
        </svg>
      );

    case "lock":
      return (
        <svg {...common}>
          <rect x="5" y="10" width="14" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 5H5v14h5" />
          <path d="M14 8l4 4-4 4" />
          <path d="M9 12h9" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case "external":
      return (
        <svg {...common}>
          <path d="M14 5h5v5" />
          <path d="m19 5-8 8" />
          <path d="M19 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
        </svg>
      );

    case "wallet":
      return (
        <svg {...common}>
          <path d="M4 7h15a1 1 0 0 1 1 1v11H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2" />
          <path d="M16 13h4" />
          <circle cx="16" cy="13" r=".5" fill="currentColor" />
        </svg>
      );

    case "clock":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "warning":
      return (
        <svg {...common}>
          <path d="m12 3 10 18H2L12 3Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );

    case "menu":
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
        </svg>
      );

    case "x":
      return (
        <svg {...common}>
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );

    case "spark":
      return (
        <svg {...common}>
          <path d="m12 2 1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2Z" />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "refresh":
      return (
        <svg {...common}>
          <path d="M20 11a8 8 0 0 0-14.8-4L3 10" />
          <path d="M3 5v5h5" />
          <path d="M4 13a8 8 0 0 0 14.8 4L21 14" />
          <path d="M21 19v-5h-5" />
        </svg>
      );

    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
        </svg>
      );
  }
}

/* =========================================================
   COMPONENT
========================================================= */

export default function DashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [wallets, setWallets] = useState<WalletBalance[]>([]);
  const [profitBalances, setProfitBalances] = useState<ProfitBalance[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const heroRef = useRef<HTMLDivElement | null>(null);

  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      /*
       * Using getSession first prevents a premature "Auth session
       * missing" situation while the browser session is hydrating.
       */
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const user = session?.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const [
        profileResult,
        walletsResult,
        profitResult,
        investmentsResult,
        plansResult,
        transactionsResult,
        depositsResult,
        withdrawalsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            "full_name, username, account_status, verification_status"
          )
          .eq("id", user.id)
          .maybeSingle(),

        supabase
          .from("wallet_balances")
          .select("id, currency, balance")
          .eq("user_id", user.id),

        supabase
          .from("investment_profit_balances")
          .select("id, currency, balance")
          .eq("user_id", user.id),

        supabase
          .from("investments")
          .select(
            "id, plan_id, amount, currency, return_percentage, expected_return, started_at, maturity_at, status"
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("investment_plans")
          .select("id, name"),

        supabase
          .from("transactions")
          .select(
            "id, type, amount, currency, reference, description, created_at, direction, balance_source"
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(100),

        supabase
          .from("deposits")
          .select(
            "id, amount, currency, network, transaction_hash, status, created_at"
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          })
          .limit(50),

        supabase
          .from("withdrawals")
          .select(
            "id, amount, currency, network, destination_address, fee, net_amount, status, requested_at"
          )
          .eq("user_id", user.id)
          .order("requested_at", {
            ascending: false,
          })
          .limit(50),
      ]);

      if (profileResult.error) {
        console.error("Profile error:", profileResult.error);
      }

      if (walletsResult.error) {
        console.error("Wallet error:", walletsResult.error);
      }

      if (profitResult.error) {
        console.error("Profit balance error:", profitResult.error);
      }

      if (investmentsResult.error) {
        console.error("Investment error:", investmentsResult.error);
      }

      if (plansResult.error) {
        console.error("Plans error:", plansResult.error);
      }

      if (transactionsResult.error) {
        console.error("Transactions error:", transactionsResult.error);
      }

      if (depositsResult.error) {
        console.error("Deposits error:", depositsResult.error);
      }

      if (withdrawalsResult.error) {
        console.error("Withdrawals error:", withdrawalsResult.error);
      }

      setProfile(profileResult.data || null);
      setWallets((walletsResult.data || []) as WalletBalance[]);
      setProfitBalances(
        (profitResult.data || []) as ProfitBalance[]
      );
      setInvestments(
        (investmentsResult.data || []) as Investment[]
      );
      setPlans((plansResult.data || []) as InvestmentPlan[]);
      setTransactions(
        (transactionsResult.data || []) as Transaction[]
      );
      setDeposits((depositsResult.data || []) as Deposit[]);
      setWithdrawals(
        (withdrawalsResult.data || []) as Withdrawal[]
      );
    } catch (err: any) {
      console.error("Dashboard error:", err);
      setError(err?.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     SIGN OUT
  ======================================================= */

  async function handleSignOut() {
    try {
      setSigningOut(true);
      setError("");

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      router.replace("/login");
      router.refresh();
    } catch (err: any) {
      console.error("Sign out error:", err);
      setError(err?.message || "Unable to sign out.");
      setSigningOut(false);
    }
  }

  /* =======================================================
     HELPERS
  ======================================================= */

  function getWallet(currency: string) {
    return wallets.find(
      (wallet) =>
        wallet.currency?.toUpperCase() === currency.toUpperCase()
    );
  }

  function getProfitBalance(currency: string) {
    return profitBalances.find(
      (balance) =>
        balance.currency?.toUpperCase() === currency.toUpperCase()
    );
  }

  function getPlanName(planId: string) {
    return (
      plans.find((plan) => plan.id === planId)?.name ||
      "Investment Plan"
    );
  }

  function formatCurrency(amount: number, currency: string) {
    const value = Number(amount || 0);

    if (currency?.toUpperCase() === "BTC") {
      return `${value.toFixed(6)} BTC`;
    }

    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  function formatDate(date: string) {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDateTime(date: string) {
    if (!date) return "—";

    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function getFirstName() {
    const name =
      profile?.full_name?.trim() ||
      profile?.username?.trim() ||
      "Investor";

    return name.split(" ")[0];
  }

  function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function getInitials() {
    const name =
      profile?.full_name?.trim() ||
      profile?.username?.trim() ||
      "Investor";

    return name
      .split(" ")
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("");
  }

  function getStatusClass(status: string) {
    const normalized = status?.toLowerCase() || "";

    if (
      ["completed", "approved", "active", "delivered", "verified"].includes(
        normalized
      )
    ) {
      return "status-success";
    }

    if (
      ["pending", "processing", "on hold", "customs"].includes(
        normalized
      )
    ) {
      return "status-warning";
    }

    if (
      ["rejected", "failed", "cancelled", "returned"].includes(
        normalized
      )
    ) {
      return "status-danger";
    }

    return "status-neutral";
  }

  function getActivityIcon(type: string) {
    const normalized = type.toLowerCase();

    if (
      normalized.includes("deposit") ||
      normalized.includes("fund")
    ) {
      return "arrow-down";
    }

    if (
      normalized.includes("withdraw") ||
      normalized.includes("payout")
    ) {
      return "arrow-up";
    }

    if (
      normalized.includes("invest") ||
      normalized.includes("profit")
    ) {
      return "chart";
    }

    return "receipt";
  }

  function getInvestmentProgress(investment: Investment) {
    const start = new Date(investment.started_at).getTime();
    const maturity = new Date(investment.maturity_at).getTime();
    const now = Date.now();

    if (!Number.isFinite(start) || !Number.isFinite(maturity)) {
      return 0;
    }

    if (maturity <= start) {
      return 100;
    }

    const progress =
      ((now - start) / (maturity - start)) * 100;

    return Math.min(100, Math.max(0, progress));
  }

  /* =======================================================
     DERIVED VALUES
  ======================================================= */

  const verificationStatus =
    (profile?.verification_status || "unverified").toLowerCase();

  const activeInvestments = useMemo(() => {
    return investments.filter(
      (investment) =>
        investment.status.toLowerCase() === "active"
    );
  }, [investments]);

  const totalActiveInvestment = useMemo(() => {
    return activeInvestments
      .filter(
        (investment) =>
          investment.currency.toUpperCase() === "USDT"
      )
      .reduce(
        (total, investment) =>
          total + Number(investment.amount || 0),
        0
      );
  }, [activeInvestments]);

  const projectedInvestmentProfit = useMemo(() => {
    return activeInvestments
      .filter(
        (investment) =>
          investment.currency.toUpperCase() === "USDT"
      )
      .reduce((total, investment) => {
        const principal = Number(investment.amount || 0);
        const expected = Number(
          investment.expected_return || 0
        );

        return total + Math.max(0, expected - principal);
      }, 0);
  }, [activeInvestments]);

  const availableUsdt = useMemo(() => {
    return Number(getWallet("USDT")?.balance || 0);
  }, [wallets]);

  const investmentProfitBalance = useMemo(() => {
    return Number(
      getProfitBalance("USDT")?.balance || 0
    );
  }, [profitBalances]);

  const totalInvestmentValue = useMemo(() => {
    return (
      totalActiveInvestment + projectedInvestmentProfit
    );
  }, [
    totalActiveInvestment,
    projectedInvestmentProfit,
  ]);

  const totalAccountValue = useMemo(() => {
    return (
      availableUsdt +
      investmentProfitBalance +
      totalActiveInvestment
    );
  }, [
    availableUsdt,
    investmentProfitBalance,
    totalActiveInvestment,
  ]);

  const pendingDeposits = deposits.filter(
    (deposit) =>
      deposit.status.toLowerCase() === "pending"
  );

  const pendingWithdrawals = withdrawals.filter(
    (withdrawal) =>
      withdrawal.status.toLowerCase() === "pending"
  );

  const recentActivity = useMemo<Activity[]>(() => {
    const transactionActivity: Activity[] = transactions.map(
      (transaction) => ({
        id: `transaction-${transaction.id}`,
        type: transaction.type || "Transaction",
        amount: Number(transaction.amount || 0),
        currency: transaction.currency,
        description:
          transaction.description ||
          transaction.type ||
          "Account transaction",
        reference: transaction.reference,
        status: "completed",
        created_at: transaction.created_at,
        direction: transaction.direction,
        balance_source: transaction.balance_source,
      })
    );

    const depositActivity: Activity[] = deposits.map(
      (deposit) => ({
        id: `deposit-${deposit.id}`,
        type: "Deposit",
        amount: Number(deposit.amount || 0),
        currency: deposit.currency,
        description: `Deposit via ${
          deposit.network || "crypto network"
        }`,
        reference:
          deposit.transaction_hash ||
          deposit.id,
        status: deposit.status,
        created_at: deposit.created_at,
        direction: "credit",
        balance_source: "wallet",
      })
    );

    const withdrawalActivity: Activity[] =
      withdrawals.map((withdrawal) => ({
        id: `withdrawal-${withdrawal.id}`,
        type: "Withdrawal",
        amount: Number(withdrawal.amount || 0),
        currency: withdrawal.currency,
        description: `Withdrawal via ${
          withdrawal.network || "crypto network"
        }`,
        reference: withdrawal.id,
        status: withdrawal.status,
        created_at: withdrawal.requested_at,
        direction: "debit",
        balance_source: "wallet",
      }));

    return [
      ...transactionActivity,
      ...depositActivity,
      ...withdrawalActivity,
    ]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 8);
  }, [transactions, deposits, withdrawals]);

  /* =======================================================
     HERO PARALLAX
  ======================================================= */

  function handleHeroPointerMove(
    event: MouseEvent<HTMLDivElement>
  ) {
    const element = heroRef.current;

    if (!element) return;

    const rect = element.getBoundingClientRect();

    const x =
      ((event.clientX - rect.left) / rect.width - 0.5) * 2;

    const y =
      ((event.clientY - rect.top) / rect.height - 0.5) * 2;

    const rotateX = -y * 3;
    const rotateY = x * 4;

    element.style.setProperty(
      "--hero-rx",
      `${rotateX}deg`
    );

    element.style.setProperty(
      "--hero-ry",
      `${rotateY}deg`
    );

    element.style.setProperty(
      "--hero-mx",
      `${50 + x * 25}%`
    );

    element.style.setProperty(
      "--hero-my",
      `${50 + y * 25}%`
    );
  }

  function handleHeroPointerLeave() {
    const element = heroRef.current;

    if (!element) return;

    element.style.setProperty("--hero-rx", "0deg");
    element.style.setProperty("--hero-ry", "0deg");
    element.style.setProperty("--hero-mx", "50%");
    element.style.setProperty("--hero-my", "50%");
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-grid" />

        <div className="loading-orb loading-orb-one" />
        <div className="loading-orb loading-orb-two" />

        <div className="loading-core">
          <div className="loading-ring loading-ring-one" />
          <div className="loading-ring loading-ring-two" />
          <div className="loading-logo">
            <Icon name="spark" size={28} />
          </div>
        </div>

        <div className="loading-title">
          Initializing Investor Portal
        </div>

        <div className="loading-subtitle">
          Securely synchronizing your portfolio
        </div>

        <div className="loading-progress">
          <span />
        </div>
      </div>
    );
  }

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <div className="dashboard-shell">
      {/* Ambient background */}
      <div className="dashboard-background">
        <div className="dashboard-grid" />
        <div className="dashboard-noise" />
        <div className="dashboard-scanline" />

        <div className="ambient-orb ambient-orb-one" />
        <div className="ambient-orb ambient-orb-two" />
        <div className="ambient-orb ambient-orb-three" />
      </div>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <button
          type="button"
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside
        className={`dashboard-sidebar ${
          mobileMenuOpen ? "sidebar-open" : ""
        }`}
      >
        <div className="sidebar-glow" />

        {/* Brand */}
        <div className="sidebar-brand">
          <Link
            href="/dashboard"
            className="brand-link"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div className="brand-symbol">
              <div className="brand-symbol-inner">
                <Icon name="spark" size={21} />
              </div>
            </div>

            <div className="brand-copy">
              <strong>INVESTOR</strong>
              <span>PORTAL</span>
            </div>
          </Link>

          <button
            type="button"
            className="sidebar-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <Icon name="x" size={19} />
          </button>
        </div>

        {/* Scrollable sidebar area */}
        <div className="sidebar-scroll">
          {/* User identity */}
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {getInitials()}
              <span className="online-dot" />
            </div>

            <div className="sidebar-user-info">
              <strong>
                {profile?.full_name ||
                  profile?.username ||
                  "Investor"}
              </strong>

              <span>
                {profile?.account_status ||
                  "Active account"}
              </span>
            </div>

            <span className="sidebar-user-status" />
          </div>

          {/* Navigation */}
          <div className="sidebar-section-label">
            CONTROL CENTER
          </div>

          <nav className="sidebar-navigation">
            <Link
              href="/dashboard"
              className="sidebar-nav-item active"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="nav-icon">
                <Icon name="grid" size={19} />
              </span>
              <span className="nav-label">Overview</span>
              <span className="nav-active-line" />
            </Link>

            <Link
              href="/dashboard/investments"
              className="sidebar-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="nav-icon">
                <Icon name="chart" size={19} />
              </span>
              <span className="nav-label">
                Investments
              </span>
              <span className="nav-arrow">
                <Icon name="chevron" size={15} />
              </span>
            </Link>

            <Link
              href="/dashboard/deposit"
              className="sidebar-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="nav-icon">
                <Icon name="arrow-down" size={19} />
              </span>
              <span className="nav-label">Deposit</span>
              <span className="nav-arrow">
                <Icon name="chevron" size={15} />
              </span>
            </Link>

            <Link
              href="/dashboard/withdraw"
              className="sidebar-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="nav-icon">
                <Icon name="arrow-up" size={19} />
              </span>
              <span className="nav-label">Withdraw</span>
              <span className="nav-arrow">
                <Icon name="chevron" size={15} />
              </span>
            </Link>

            <Link
              href="/dashboard/transactions"
              className="sidebar-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="nav-icon">
                <Icon name="receipt" size={19} />
              </span>
              <span className="nav-label">
                Transactions
              </span>
              <span className="nav-arrow">
                <Icon name="chevron" size={15} />
              </span>
            </Link>

            <Link
              href="/dashboard/referrals"
              className="sidebar-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="nav-icon">
                <Icon name="users" size={19} />
              </span>
              <span className="nav-label">Referrals</span>
              <span className="nav-arrow">
                <Icon name="chevron" size={15} />
              </span>
            </Link>
          </nav>

          <div className="sidebar-section-label secondary-label">
            ACCOUNT
          </div>

          <nav className="sidebar-navigation">
            <Link
              href="/dashboard/verify"
              className={`sidebar-nav-item ${
                verificationStatus === "verified"
                  ? ""
                  : "attention-item"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="nav-icon">
                <Icon name="shield" size={19} />
              </span>

              <span className="nav-label">
                Verify Account
              </span>

              {verificationStatus !== "verified" && (
                <span className="nav-alert-dot" />
              )}
            </Link>

            <Link
              href="/dashboard/profile"
              className="sidebar-nav-item"
              onClick={() => setMobileMenuOpen(false)}
            >
              <span className="nav-icon">
                <Icon name="user" size={19} />
              </span>
              <span className="nav-label">Profile</span>
              <span className="nav-arrow">
                <Icon name="chevron" size={15} />
              </span>
            </Link>
          </nav>
        </div>

        {/* =================================================
            SIDEBAR FOOTER — ALWAYS VISIBLE
        ================================================= */}

        <div className="sidebar-footer">
          <div className="security-mini-card">
            <div className="security-mini-icon">
              <Icon name="lock" size={16} />
            </div>

            <div className="security-mini-copy">
              <strong>Secure Session</strong>
              <span>Protected connection</span>
            </div>

            <span className="security-pulse" />
          </div>

          <button
            type="button"
            className="sidebar-signout"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <span className="signout-icon">
              <Icon name="logout" size={18} />
            </span>

            <span>
              {signingOut
                ? "Signing out..."
                : "Sign out"}
            </span>

            {!signingOut && (
              <span className="signout-arrow">
                <Icon name="chevron" size={15} />
              </span>
            )}
          </button>

          <div className="sidebar-version">
            <span>INVESTOR OS</span>
            <span>v2.0</span>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MAIN AREA
      ===================================================== */}

      <main className="dashboard-main">
        {/* Top bar */}
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu-button"
              onClick={() =>
                setMobileMenuOpen(true)
              }
              aria-label="Open navigation"
            >
              <Icon name="menu" size={21} />
            </button>

            <div>
              <div className="topbar-eyebrow">
                <span className="live-indicator">
                  <i />
                </span>

                SECURE INVESTOR ENVIRONMENT
              </div>

              <div className="topbar-date">
                {getGreeting()}, {getFirstName()}
              </div>
            </div>
          </div>

          <div className="topbar-right">
            <div className="system-status">
              <span className="system-status-dot" />
              Systems operational
            </div>

            <button
              type="button"
              className="icon-button"
              aria-label="Notifications"
            >
              <Icon name="bell" size={19} />
              <span className="notification-dot" />
            </button>

            <Link
              href="/dashboard/profile"
              className="topbar-avatar"
            >
              {getInitials()}
            </Link>
          </div>
        </header>

        {/* Main content */}
        <div className="dashboard-content">
          {/* Error */}
          {error && (
            <div className="dashboard-error">
              <div className="dashboard-error-icon">
                <Icon name="warning" size={19} />
              </div>

              <div>
                <strong>Dashboard notice</strong>
                <span>{error}</span>
              </div>

              <button
                type="button"
                onClick={loadDashboard}
              >
                <Icon name="refresh" size={17} />
                Retry
              </button>
            </div>
          )}

          {/* Verification banner */}
          {verificationStatus !== "verified" && (
            <div className="verification-banner">
              <div className="verification-banner-icon">
                <Icon name="shield" size={21} />
              </div>

              <div className="verification-banner-copy">
                <strong>
                  Complete your identity verification
                </strong>

                <span>
                  Your account verification is currently{" "}
                  <b>{verificationStatus}</b>. Complete
                  verification to keep your account profile
                  up to date.
                </span>
              </div>

              <Link
                href="/dashboard/verify"
                className="verification-banner-action"
              >
                Review verification
                <Icon name="chevron" size={16} />
              </Link>
            </div>
          )}

          {/* =================================================
              HERO
          ================================================= */}

          <section
            ref={heroRef}
            className="portfolio-hero"
            onMouseMove={handleHeroPointerMove}
            onMouseLeave={handleHeroPointerLeave}
          >
            <div className="hero-light" />
            <div className="hero-grid" />

            <div className="hero-particle particle-a" />
            <div className="hero-particle particle-b" />
            <div className="hero-particle particle-c" />

            <div className="hero-orbit orbit-one" />
            <div className="hero-orbit orbit-two" />
            <div className="hero-orbit orbit-three" />

            <div className="hero-content">
              <div className="hero-topline">
                <div className="hero-status">
                  <span className="hero-status-dot" />
                  PORTFOLIO ENGINE ONLINE
                </div>

                <div className="hero-secure">
                  <Icon name="lock" size={13} />
                  SECURED
                </div>
              </div>

              <div className="hero-label">
                TOTAL ACCOUNT VALUE
              </div>

              <div className="hero-value">
                {formatCurrency(
                  totalAccountValue,
                  "USDT"
                )}
              </div>

              <div className="hero-value-meta">
                <span className="hero-value-dot" />
                Consolidated portfolio valuation
              </div>

              <div className="hero-actions">
                <Link
                  href="/dashboard/deposit"
                  className="hero-primary-action"
                >
                  <span>
                    <Icon name="plus" size={17} />
                  </span>
                  Add funds
                </Link>

                <Link
                  href="/dashboard/investments"
                  className="hero-secondary-action"
                >
                  View portfolio
                  <Icon name="chevron" size={16} />
                </Link>
              </div>
            </div>

            {/* Decorative 3D core */}
            <div className="hero-visual">
              <div className="hero-core-shadow" />

              <div className="hero-core">
                <div className="core-ring core-ring-one" />
                <div className="core-ring core-ring-two" />
                <div className="core-ring core-ring-three" />

                <div className="core-center">
                  <Icon name="spark" size={29} />
                </div>
              </div>

              <div className="hero-floating-card hero-floating-card-one">
                <span className="floating-card-label">
                  ACTIVE
                </span>
                <strong>
                  {activeInvestments.length}
                </strong>
                <small>positions</small>
              </div>

              <div className="hero-floating-card hero-floating-card-two">
                <span className="floating-card-icon">
                  <Icon name="wallet" size={14} />
                </span>
                <div>
                  <small>Available</small>
                  <strong>
                    {formatCurrency(
                      availableUsdt,
                      "USDT"
                    )}
                  </strong>
                </div>
              </div>
            </div>

            <div className="hero-bottom-line">
              <span>
                <i />
                Secure portfolio environment
              </span>

              <span>
                Updated automatically from your account
              </span>
            </div>
          </section>

          {/* =================================================
              PRIMARY STATS
          ================================================= */}

          <section className="stats-grid">
            <div className="stat-card stat-blue">
              <div className="stat-card-glow" />

              <div className="stat-header">
                <div className="stat-icon">
                  <Icon name="wallet" size={19} />
                </div>

                <span className="stat-badge">
                  LIQUID
                </span>
              </div>

              <div className="stat-label">
                AVAILABLE USDT
              </div>

              <div className="stat-value">
                {formatCurrency(
                  availableUsdt,
                  "USDT"
                )}
              </div>

              <div className="stat-footer">
                <span>
                  Wallet balance
                </span>

                <Icon name="arrow-down" size={15} />
              </div>
            </div>

            <div className="stat-card stat-purple">
              <div className="stat-card-glow" />

              <div className="stat-header">
                <div className="stat-icon">
                  <Icon name="spark" size={19} />
                </div>

                <span className="stat-badge">
                  PROFIT
                </span>
              </div>

              <div className="stat-label">
                PROFIT BALANCE
              </div>

              <div className="stat-value">
                {formatCurrency(
                  investmentProfitBalance,
                  "USDT"
                )}
              </div>

              <div className="stat-footer">
                <span>
                  Investment earnings
                </span>

                <Icon name="chart" size={15} />
              </div>
            </div>

            <div className="stat-card stat-cyan">
              <div className="stat-card-glow" />

              <div className="stat-header">
                <div className="stat-icon">
                  <Icon name="chart" size={19} />
                </div>

                <span className="stat-badge">
                  ACTIVE
                </span>
              </div>

              <div className="stat-label">
                ACTIVE INVESTMENTS
              </div>

              <div className="stat-value">
                {formatCurrency(
                  totalActiveInvestment,
                  "USDT"
                )}
              </div>

              <div className="stat-footer">
                <span>
                  Principal deployed
                </span>

                <Icon name="arrow-up" size={15} />
              </div>
            </div>

            <div className="stat-card stat-gold">
              <div className="stat-card-glow" />

              <div className="stat-header">
                <div className="stat-icon">
                  <Icon name="spark" size={19} />
                </div>

                <span className="stat-badge">
                  PROJECTED
                </span>
              </div>

              <div className="stat-label">
                PROJECTED PROFIT
              </div>

              <div className="stat-value">
                {formatCurrency(
                  projectedInvestmentProfit,
                  "USDT"
                )}
              </div>

              <div className="stat-footer">
                <span>
                  From active positions
                </span>

                <Icon name="chart" size={15} />
              </div>
            </div>
          </section>

          {/* =================================================
              SECONDARY INFORMATION
          ================================================= */}

          <section className="secondary-stats">
            <div className="mini-stat-card">
              <span className="mini-stat-icon">
                <Icon name="chart" size={17} />
              </span>

              <div>
                <small>
                  Investment value
                </small>
                <strong>
                  {formatCurrency(
                    totalInvestmentValue,
                    "USDT"
                  )}
                </strong>
              </div>
            </div>

            <div className="mini-stat-card">
              <span className="mini-stat-icon warning">
                <Icon name="arrow-down" size={17} />
              </span>

              <div>
                <small>
                  Pending deposits
                </small>
                <strong>
                  {pendingDeposits.length}
                </strong>
              </div>
            </div>

            <div className="mini-stat-card">
              <span className="mini-stat-icon purple">
                <Icon name="arrow-up" size={17} />
              </span>

              <div>
                <small>
                  Pending withdrawals
                </small>
                <strong>
                  {pendingWithdrawals.length}
                </strong>
              </div>
            </div>

            <div className="mini-stat-card">
              <span className="mini-stat-icon green">
                <Icon name="shield" size={17} />
              </span>

              <div>
                <small>
                  Account status
                </small>
                <strong className="status-text">
                  {profile?.account_status ||
                    "Active"}
                </strong>
              </div>
            </div>
          </section>

          {/* =================================================
              TWO COLUMN SECTION
          ================================================= */}

          <section className="dashboard-columns">
            {/* Activity */}
            <div className="dashboard-panel activity-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">
                    ACCOUNT FLOW
                  </span>

                  <h2>
                    Recent activity
                  </h2>
                </div>

                <Link
                  href="/dashboard/transactions"
                  className="panel-link"
                >
                  View all
                  <Icon
                    name="chevron"
                    size={15}
                  />
                </Link>
              </div>

              {recentActivity.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Icon
                      name="receipt"
                      size={24}
                    />
                  </div>

                  <strong>
                    No recent activity
                  </strong>

                  <span>
                    Your latest transactions and
                    account activity will appear here.
                  </span>
                </div>
              ) : (
                <div className="activity-list">
                  {recentActivity.map(
                    (activity, index) => (
                      <div
                        className="activity-row"
                        key={activity.id}
                        style={
                          {
                            "--activity-index":
                              index,
                          } as CSSProperties
                        }
                      >
                        <div
                          className={`activity-icon ${
                            activity.direction ===
                            "credit"
                              ? "activity-credit"
                              : activity.direction ===
                                "debit"
                              ? "activity-debit"
                              : ""
                          }`}
                        >
                          <Icon
                            name={getActivityIcon(
                              activity.type
                            )}
                            size={17}
                          />
                        </div>

                        <div className="activity-main">
                          <strong>
                            {activity.type}
                          </strong>

                          <span>
                            {activity.description}
                          </span>
                        </div>

                        <div className="activity-amount">
                          <strong
                            className={
                              activity.direction ===
                              "credit"
                                ? "amount-positive"
                                : activity.direction ===
                                  "debit"
                                ? "amount-negative"
                                : ""
                            }
                          >
                            {activity.direction ===
                            "credit"
                              ? "+"
                              : activity.direction ===
                                "debit"
                              ? "-"
                              : ""}
                            {formatCurrency(
                              activity.amount,
                              activity.currency
                            )}
                          </strong>

                          <span>
                            {formatDateTime(
                              activity.created_at
                            )}
                          </span>
                        </div>

                        <span
                          className={`activity-status ${getStatusClass(
                            activity.status
                          )}`}
                        >
                          {activity.status}
                        </span>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="dashboard-panel quick-panel">
              <div className="panel-header">
                <div>
                  <span className="panel-kicker">
                    COMMAND CENTER
                  </span>

                  <h2>
                    Quick actions
                  </h2>
                </div>
              </div>

              <div className="quick-actions">
                <Link
                  href="/dashboard/deposit"
                  className="quick-action quick-action-blue"
                >
                  <span className="quick-action-icon">
                    <Icon
                      name="arrow-down"
                      size={20}
                    />
                  </span>

                  <span>
                    <strong>
                      Deposit
                    </strong>
                    <small>
                      Add funds to wallet
                    </small>
                  </span>

                  <Icon
                    name="chevron"
                    size={16}
                  />
                </Link>

                <Link
                  href="/dashboard/withdraw"
                  className="quick-action quick-action-purple"
                >
                  <span className="quick-action-icon">
                    <Icon
                      name="arrow-up"
                      size={20}
                    />
                  </span>

                  <span>
                    <strong>
                      Withdraw
                    </strong>
                    <small>
                      Request a withdrawal
                    </small>
                  </span>

                  <Icon
                    name="chevron"
                    size={16}
                  />
                </Link>

                <Link
                  href="/dashboard/investments"
                  className="quick-action quick-action-cyan"
                >
                  <span className="quick-action-icon">
                    <Icon
                      name="chart"
                      size={20}
                    />
                  </span>

                  <span>
                    <strong>
                      Investments
                    </strong>
                    <small>
                      Manage your positions
                    </small>
                  </span>

                  <Icon
                    name="chevron"
                    size={16}
                  />
                </Link>

                <Link
                  href="/dashboard/verify"
                  className="quick-action quick-action-gold"
                >
                  <span className="quick-action-icon">
                    <Icon
                      name="shield"
                      size={20}
                    />
                  </span>

                  <span>
                    <strong>
                      Verification
                    </strong>
                    <small>
                      Manage account verification
                    </small>
                  </span>

                  <Icon
                    name="chevron"
                    size={16}
                  />
                </Link>
              </div>
            </div>
          </section>

          {/* =================================================
              SECURITY / PROFIT
          ================================================= */}

          <section className="information-grid">
            {/* Verification */}
            <div className="information-card verification-card">
              <div className="information-card-glow" />

              <div className="information-header">
                <div>
                  <span className="panel-kicker">
                    IDENTITY
                  </span>

                  <h2>
                    Verification status
                  </h2>
                </div>

                <div
                  className={`verification-badge ${getStatusClass(
                    verificationStatus
                  )}`}
                >
                  <span />
                  {verificationStatus}
                </div>
              </div>

              <div className="verification-visual">
                <div className="verification-ring">
                  <div className="verification-ring-inner">
                    <Icon
                      name="shield"
                      size={27}
                    />
                  </div>
                </div>

                <div className="verification-copy">
                  <strong>
                    {verificationStatus ===
                    "verified"
                      ? "Identity verified"
                      : verificationStatus ===
                        "pending"
                      ? "Verification in review"
                      : verificationStatus ===
                        "rejected"
                      ? "Verification requires attention"
                      : "Verification incomplete"}
                  </strong>

                  <span>
                    {verificationStatus ===
                    "verified"
                      ? "Your account verification status is active."
                      : "Review your verification details and submit any required information."}
                  </span>
                </div>
              </div>

              <Link
                href="/dashboard/verify"
                className="information-action"
              >
                Manage verification
                <Icon
                  name="external"
                  size={15}
                />
              </Link>
            </div>

            {/* Profit */}
            <div className="information-card profit-card">
              <div className="information-card-glow" />

              <div className="information-header">
                <div>
                  <span className="panel-kicker">
                    INVESTMENT ACCOUNT
                  </span>

                  <h2>
                    Profit balance
                  </h2>
                </div>

                <span className="profit-symbol">
                  $
                </span>
              </div>

              <div className="profit-balance">
                {formatCurrency(
                  investmentProfitBalance,
                  "USDT"
                )}
              </div>

              <div className="profit-line">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>

              <div className="profit-bottom">
                <div>
                  <small>
                    Active investments
                  </small>
                  <strong>
                    {activeInvestments.length}
                  </strong>
                </div>

                <div>
                  <small>
                    Projected profit
                  </small>
                  <strong>
                    {formatCurrency(
                      projectedInvestmentProfit,
                      "USDT"
                    )}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* =================================================
              ACTIVE INVESTMENTS
          ================================================= */}

          <section className="dashboard-panel investments-panel">
            <div className="panel-header">
              <div>
                <span className="panel-kicker">
                  PORTFOLIO ENGINE
                </span>

                <h2>
                  Active investments
                </h2>
              </div>

              <Link
                href="/dashboard/investments"
                className="panel-link"
              >
                Manage portfolio
                <Icon
                  name="chevron"
                  size={15}
                />
              </Link>
            </div>

            {activeInvestments.length === 0 ? (
              <div className="empty-investment-state">
                <div className="empty-investment-visual">
                  <div />
                  <div />
                  <div />
                  <Icon
                    name="chart"
                    size={27}
                  />
                </div>

                <div>
                  <strong>
                    No active investments
                  </strong>

                  <span>
                    Your active investment positions
                    will appear here once available.
                  </span>
                </div>

                <Link
                  href="/dashboard/investments"
                  className="empty-investment-button"
                >
                  Explore investments
                  <Icon
                    name="chevron"
                    size={15}
                  />
                </Link>
              </div>
            ) : (
              <div className="investment-list">
                {activeInvestments
                  .slice(0, 5)
                  .map((investment, index) => {
                    const progress =
                      getInvestmentProgress(
                        investment
                      );

                    return (
                      <div
                        className="investment-row"
                        key={investment.id}
                        style={
                          {
                            "--investment-index":
                              index,
                          } as CSSProperties
                        }
                      >
                        <div className="investment-plan-icon">
                          <Icon
                            name="chart"
                            size={19}
                          />

                          <span />
                        </div>

                        <div className="investment-info">
                          <strong>
                            {getPlanName(
                              investment.plan_id
                            )}
                          </strong>

                          <span>
                            Started{" "}
                            {formatDate(
                              investment.started_at
                            )}
                          </span>
                        </div>

                        <div className="investment-progress">
                          <div className="progress-top">
                            <span>
                              Position progress
                            </span>

                            <strong>
                              {Math.round(progress)}%
                            </strong>
                          </div>

                          <div className="progress-track">
                            <span
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="investment-return">
                          <span>
                            Return
                          </span>

                          <strong>
                            +
                            {Number(
                              investment.return_percentage ||
                                0
                            ).toFixed(2)}
                            %
                          </strong>
                        </div>

                        <div className="investment-value">
                          <span>
                            Principal
                          </span>

                          <strong>
                            {formatCurrency(
                              Number(
                                investment.amount || 0
                              ),
                              investment.currency
                            )}
                          </strong>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* =================================================
              BOTTOM FOOTER
          ================================================= */}

          <footer className="dashboard-footer">
            <div className="footer-brand">
              <span className="footer-symbol">
                <Icon name="spark" size={14} />
              </span>

              <span>
                Investor Portal
              </span>
            </div>

            <div className="footer-center">
              Secure investor environment
              <span />
              Data synchronized with your account
            </div>

            <div className="footer-right">
              <span>
                © {new Date().getFullYear()}
              </span>

              <span className="footer-status">
                <i />
                Online
              </span>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}