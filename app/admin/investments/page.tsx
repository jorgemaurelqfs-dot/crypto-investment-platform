"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import "./investment.css";

type Investment = {
  id: string;
  user_id: string;
  investor_name: string | null;
  investor_email: string | null;
  plan_id: string | null;
  plan_name: string | null;
  amount: number | string;
  currency: string | null;
  return_percentage: number | string | null;
  expected_return: number | string | null;
  started_at: string | null;
  maturity_at: string | null;
  status: string;
  created_at: string;
};

type InvestmentPlan = {
  id: string;
  name: string;
  slug: string;
  minimum_amount: number | string;
  maximum_amount: number | string | null;
  return_percentage: number | string;
  referral_percentage: number | string;
  duration_hours: number;
  description: string | null;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
};

type PlanForm = {
  name: string;
  minimum_amount: string;
  maximum_amount: string;
  return_percentage: string;
  referral_percentage: string;
  duration_hours: string;
  description: string;
  is_featured: boolean;
};

const emptyPlan: PlanForm = {
  name: "",
  minimum_amount: "",
  maximum_amount: "",
  return_percentage: "",
  referral_percentage: "",
  duration_hours: "24",
  description: "",
  is_featured: false,
};

const statuses = [
  "all",
  "pending",
  "active",
  "matured",
  "completed",
  "cancelled",
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

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(hours: number) {
  if (hours < 24) {
    return `${hours}h`;
  }

  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days}d`;
  }

  return `${hours}h`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminInvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);

  const [loading, setLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);

  const [error, setError] = useState("");
  const [planError, setPlanError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  const [selectedInvestment, setSelectedInvestment] =
    useState<Investment | null>(null);

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] =
    useState<InvestmentPlan | null>(null);

  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlan);
  const [savingPlan, setSavingPlan] = useState(false);

  const [notice, setNotice] = useState("");

  async function loadInvestments() {
    setLoading(true);
    setError("");

    const { data, error: rpcError } = await supabase.rpc(
      "admin_get_investments"
    );

    if (rpcError) {
      setError(rpcError.message);
      setInvestments([]);
      setLoading(false);
      return;
    }

    setInvestments((data || []) as Investment[]);
    setLoading(false);
  }

  async function loadPlans() {
    setPlansLoading(true);
    setPlanError("");

    const { data, error: rpcError } = await supabase
      .from("investment_plans")
      .select(
        "id,name,slug,minimum_amount,maximum_amount,return_percentage,referral_percentage,duration_hours,description,is_active,is_featured,created_at,updated_at"
      )
      .order("minimum_amount", { ascending: true });

    if (rpcError) {
      setPlanError(rpcError.message);
      setPlans([]);
      setPlansLoading(false);
      return;
    }

    setPlans((data || []) as InvestmentPlan[]);
    setPlansLoading(false);
  }

  async function loadEverything() {
    await Promise.all([loadInvestments(), loadPlans()]);
  }

  useEffect(() => {
    loadEverything();
  }, []);

  const currencies = useMemo(() => {
    const values = investments
      .map((item) => String(item.currency || "").toUpperCase())
      .filter(Boolean);

    return ["all", ...Array.from(new Set(values))];
  }, [investments]);

  const filteredInvestments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return investments.filter((item) => {
      const matchesSearch =
        !query ||
        String(item.id).toLowerCase().includes(query) ||
        String(item.user_id).toLowerCase().includes(query) ||
        String(item.investor_name || "")
          .toLowerCase()
          .includes(query) ||
        String(item.investor_email || "")
          .toLowerCase()
          .includes(query) ||
        String(item.plan_name || "")
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        item.status.toLowerCase() === statusFilter;

      const matchesCurrency =
        currencyFilter === "all" ||
        String(item.currency || "").toUpperCase() === currencyFilter;

      const matchesPlan =
        planFilter === "all" ||
        String(item.plan_id || "") === planFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCurrency &&
        matchesPlan
      );
    });
  }, [
    investments,
    search,
    statusFilter,
    currencyFilter,
    planFilter,
  ]);

  const statistics = useMemo(() => {
    const total = investments.length;

    const active = investments.filter(
      (item) => item.status === "active"
    ).length;

    const pending = investments.filter(
      (item) => item.status === "pending"
    ).length;

    const matured = investments.filter(
      (item) => item.status === "matured"
    ).length;

    const completed = investments.filter(
      (item) => item.status === "completed"
    ).length;

    const cancelled = investments.filter(
      (item) => item.status === "cancelled"
    ).length;

    const totalCapital = investments.reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const totalExpectedReturn = investments.reduce(
      (sum, item) => sum + Number(item.expected_return || 0),
      0
    );

    return {
      total,
      active,
      pending,
      matured,
      completed,
      cancelled,
      totalCapital,
      totalExpectedReturn,
    };
  }, [investments]);

  function openCreatePlan() {
    setEditingPlan(null);
    setPlanForm(emptyPlan);
    setPlanError("");
    setShowPlanModal(true);
  }

  function openEditPlan(plan: InvestmentPlan) {
    setEditingPlan(plan);

    setPlanForm({
      name: plan.name,
      minimum_amount: String(plan.minimum_amount ?? ""),
      maximum_amount:
        plan.maximum_amount === null
          ? ""
          : String(plan.maximum_amount),
      return_percentage: String(plan.return_percentage ?? ""),
      referral_percentage: String(plan.referral_percentage ?? ""),
      duration_hours: String(plan.duration_hours ?? 24),
      description: plan.description || "",
      is_featured: plan.is_featured,
    });

    setPlanError("");
    setShowPlanModal(true);
  }

  function closePlanModal() {
    if (savingPlan) return;

    setShowPlanModal(false);
    setEditingPlan(null);
    setPlanForm(emptyPlan);
  }

  async function savePlan() {
    setPlanError("");
    setNotice("");

    if (!planForm.name.trim()) {
      setPlanError("Plan name is required.");
      return;
    }

    const minimum = Number(planForm.minimum_amount);
    const maximum =
      planForm.maximum_amount.trim() === ""
        ? null
        : Number(planForm.maximum_amount);

    const returnPercentage = Number(
      planForm.return_percentage
    );

    const referralPercentage = Number(
      planForm.referral_percentage
    );

    const durationHours = Number(planForm.duration_hours);

    if (!Number.isFinite(minimum) || minimum < 0) {
      setPlanError("Enter a valid minimum investment amount.");
      return;
    }

    if (
      maximum !== null &&
      (!Number.isFinite(maximum) || maximum < minimum)
    ) {
      setPlanError(
        "Maximum amount must be empty or greater than/equal to the minimum."
      );
      return;
    }

    if (
      !Number.isFinite(returnPercentage) ||
      returnPercentage < 0
    ) {
      setPlanError("Enter a valid return percentage.");
      return;
    }

    if (
      !Number.isFinite(referralPercentage) ||
      referralPercentage < 0
    ) {
      setPlanError("Enter a valid referral percentage.");
      return;
    }

    if (
      !Number.isFinite(durationHours) ||
      durationHours <= 0
    ) {
      setPlanError("Duration must be greater than zero.");
      return;
    }

    setSavingPlan(true);

    if (editingPlan) {
      const { error: updateError } = await supabase.rpc(
        "admin_update_investment_plan",
        {
          p_plan_id: editingPlan.id,
          p_name: planForm.name.trim(),
          p_minimum_amount: minimum,
          p_maximum_amount: maximum,
          p_return_percentage: returnPercentage,
          p_referral_percentage: referralPercentage,
          p_duration_hours: durationHours,
          p_description:
            planForm.description.trim() || null,
          p_is_featured: planForm.is_featured,
        }
      );

      if (updateError) {
        setPlanError(updateError.message);
        setSavingPlan(false);
        return;
      }

      setNotice(`${editingPlan.name} has been updated.`);
    } else {
      const { error: createError } = await supabase.rpc(
        "admin_create_investment_plan",
        {
          p_name: planForm.name.trim(),
          p_minimum_amount: minimum,
          p_maximum_amount: maximum,
          p_return_percentage: returnPercentage,
          p_referral_percentage: referralPercentage,
          p_duration_hours: durationHours,
          p_description:
            planForm.description.trim() || null,
          p_is_active: true,
          p_is_featured: planForm.is_featured,
        }
      );

      if (createError) {
        setPlanError(createError.message);
        setSavingPlan(false);
        return;
      }

      setNotice(`${planForm.name} has been created.`);
    }

    setSavingPlan(false);
    closePlanModal();
    await loadPlans();

    window.setTimeout(() => {
      setNotice("");
    }, 4000);
  }

  async function togglePlan(plan: InvestmentPlan) {
    setPlanError("");
    setNotice("");

    const { error: statusError } = await supabase.rpc(
      "admin_set_investment_plan_status",
      {
        p_plan_id: plan.id,
        p_is_active: !plan.is_active,
      }
    );

    if (statusError) {
      setPlanError(statusError.message);
      return;
    }

    setNotice(
      `${plan.name} is now ${
        !plan.is_active ? "active" : "inactive"
      }.`
    );

    await loadPlans();

    window.setTimeout(() => {
      setNotice("");
    }, 4000);
  }

  function statusClass(status: string) {
    return `status-pill status-${status.toLowerCase()}`;
  }

  return (
    <main className="investment-page">
      <div className="investment-background-grid" />
      <div className="investment-glow investment-glow-one" />
      <div className="investment-glow investment-glow-two" />

      <section className="investment-shell">
        <header className="investment-header">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              FINANCIAL OPERATIONS
            </div>

            <h1>Investment Command Center</h1>

            <p>
              Monitor investment activity, manage investment plans,
              and control the platform&apos;s investment configuration.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={loadEverything}
            disabled={loading || plansLoading}
          >
            <span className="refresh-icon">↻</span>
            Refresh
          </button>
        </header>

        {notice && (
          <div className="success-banner">
            <span>✓</span>
            {notice}
          </div>
        )}

        {error && (
          <div className="error-banner">
            <strong>Investment data error</strong>
            <span>{error}</span>
          </div>
        )}

        {planError && !showPlanModal && (
          <div className="error-banner">
            <strong>Plan manager error</strong>
            <span>{planError}</span>
          </div>
        )}

        <section className="stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon">◈</div>
            <div className="stat-content">
              <span>Total Investments</span>
              <strong>{statistics.total.toLocaleString()}</strong>
              <small>All recorded positions</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon active-icon">●</div>
            <div className="stat-content">
              <span>Active</span>
              <strong>{statistics.active.toLocaleString()}</strong>
              <small>Currently running</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending-icon">◌</div>
            <div className="stat-content">
              <span>Pending</span>
              <strong>{statistics.pending.toLocaleString()}</strong>
              <small>Awaiting activation</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon matured-icon">✓</div>
            <div className="stat-content">
              <span>Matured</span>
              <strong>{statistics.matured.toLocaleString()}</strong>
              <small>Reached maturity</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon completed-icon">◆</div>
            <div className="stat-content">
              <span>Completed</span>
              <strong>{statistics.completed.toLocaleString()}</strong>
              <small>Successfully closed</small>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon cancelled-icon">×</div>
            <div className="stat-content">
              <span>Cancelled</span>
              <strong>{statistics.cancelled.toLocaleString()}</strong>
              <small>Cancelled positions</small>
            </div>
          </div>
        </section>

        <section className="capital-grid">
          <div className="capital-card">
            <div>
              <span className="capital-label">
                TOTAL INVESTED CAPITAL
              </span>
              <strong>
                {formatMoney(statistics.totalCapital, "USDT")}
              </strong>
            </div>

            <div className="capital-symbol">₮</div>
          </div>

          <div className="capital-card">
            <div>
              <span className="capital-label">
                EXPECTED RETURN VALUE
              </span>
              <strong>
                {formatMoney(
                  statistics.totalExpectedReturn,
                  "USDT"
                )}
              </strong>
            </div>

            <div className="capital-symbol">↗</div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <div className="panel-kicker">INVESTMENT LEDGER</div>
              <h2>Investment Activity</h2>
            </div>

            <div className="live-indicator">
              <span />
              LIVE DATA
            </div>
          </div>

          <div className="filters">
            <div className="search-box">
              <span>⌕</span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search investor, email, plan or ID..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "all"
                    ? "All statuses"
                    : status.charAt(0).toUpperCase() +
                      status.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={planFilter}
              onChange={(event) =>
                setPlanFilter(event.target.value)
              }
            >
              <option value="all">All plans</option>

              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>

            <select
              value={currencyFilter}
              onChange={(event) =>
                setCurrencyFilter(event.target.value)
              }
            >
              {currencies.map((currency) => (
                <option key={currency} value={currency}>
                  {currency === "all"
                    ? "All currencies"
                    : currency}
                </option>
              ))}
            </select>
          </div>

          <div className="table-meta">
            <span>
              Showing{" "}
              <strong>{filteredInvestments.length}</strong>{" "}
              of <strong>{investments.length}</strong>{" "}
              investments
            </span>

            <span className="ledger-status">
              SECURE LEDGER ACCESS
            </span>
          </div>

          <div className="table-wrapper">
            <table className="investment-table">
              <thead>
                <tr>
                  <th>Investor</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Return</th>
                  <th>Expected</th>
                  <th>Maturity</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 7 }).map((_, index) => (
                    <tr key={index}>
                      <td colSpan={8}>
                        <div className="table-skeleton">
                          <span />
                          <span />
                          <span />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : filteredInvestments.length === 0 ? (
                  <tr>
                    <td colSpan={8}>
                      <div className="empty-state">
                        <div className="empty-icon">◇</div>
                        <strong>No investments found</strong>
                        <span>
                          Try changing your search or filters.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvestments.map((investment) => (
                    <tr key={investment.id}>
                      <td>
                        <div className="investor-cell">
                          <div className="avatar">
                            {(
                              investment.investor_name ||
                              "U"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {investment.investor_name ||
                                "Unknown Investor"}
                            </strong>

                            <small>
                              {investment.investor_email ||
                                "No email"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="plan-name">
                          {investment.plan_name || "Unknown Plan"}
                        </span>
                      </td>

                      <td>
                        <strong className="amount-value">
                          {formatMoney(
                            investment.amount,
                            investment.currency || "USDT"
                          )}
                        </strong>
                      </td>

                      <td>
                        <span className="return-value">
                          +
                          {Number(
                            investment.return_percentage || 0
                          ).toLocaleString("en-US", {
                            maximumFractionDigits: 2,
                          })}
                          %
                        </span>
                      </td>

                      <td>
                        <strong>
                          {formatMoney(
                            investment.expected_return,
                            investment.currency || "USDT"
                          )}
                        </strong>
                      </td>

                      <td>
                        <span className="date-value">
                          {formatDate(investment.maturity_at)}
                        </span>
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            investment.status
                          )}
                        >
                          {investment.status}
                        </span>
                      </td>

                      <td>
                        <button
                          className="inspect-button"
                          onClick={() =>
                            setSelectedInvestment(investment)
                          }
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="plans-section">
          <div className="plans-heading">
            <div>
              <div className="panel-kicker">
                PRODUCT CONFIGURATION
              </div>

              <h2>Investment Plan Manager</h2>

              <p>
                Configure the investment products available to
                customers.
              </p>
            </div>

            <button
              className="create-plan-button"
              onClick={openCreatePlan}
            >
              <span>＋</span>
              Create Investment Plan
            </button>
          </div>

          <div className="plan-grid">
            {plansLoading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div className="plan-card plan-loading" key={index}>
                  <div />
                  <div />
                  <div />
                </div>
              ))
            ) : plans.length === 0 ? (
              <div className="plans-empty">
                <div className="empty-icon">◇</div>
                <strong>No investment plans</strong>
                <span>
                  Create your first investment plan to make it
                  available for configuration.
                </span>
              </div>
            ) : (
              plans.map((plan) => {
                const investmentCount = investments.filter(
                  (investment) =>
                    investment.plan_id === plan.id
                ).length;

                return (
                  <div
                    className={`plan-card ${
                      plan.is_featured
                        ? "plan-featured"
                        : ""
                    } ${
                      !plan.is_active
                        ? "plan-inactive"
                        : ""
                    }`}
                    key={plan.id}
                  >
                    <div className="plan-top">
                      <div>
                        {plan.is_featured && (
                          <span className="featured-badge">
                            FEATURED
                          </span>
                        )}

                        <h3>{plan.name}</h3>

                        <span className="plan-slug">
                          /{plan.slug}
                        </span>
                      </div>

                      <span
                        className={`plan-status ${
                          plan.is_active
                            ? "plan-active"
                            : "plan-disabled"
                        }`}
                      >
                        <i />
                        {plan.is_active
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>
                    </div>

                    <div className="roi-display">
                      <span>Projected Return</span>

                      <strong>
                        +
                        {Number(
                          plan.return_percentage || 0
                        ).toLocaleString("en-US", {
                          maximumFractionDigits: 2,
                        })}
                        <small>%</small>
                      </strong>
                    </div>

                    <div className="plan-details">
                      <div>
                        <span>Minimum</span>
                        <strong>
                          {formatMoney(
                            plan.minimum_amount,
                            "USDT"
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Maximum</span>
                        <strong>
                          {plan.maximum_amount === null
                            ? "Unlimited"
                            : formatMoney(
                                plan.maximum_amount,
                                "USDT"
                              )}
                        </strong>
                      </div>

                      <div>
                        <span>Duration</span>
                        <strong>
                          {formatDuration(
                            Number(plan.duration_hours)
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Referral</span>
                        <strong>
                          +
                          {Number(
                            plan.referral_percentage || 0
                          )}
                          %
                        </strong>
                      </div>
                    </div>

                    <div className="plan-footer">
                      <span>
                        {investmentCount.toLocaleString()}{" "}
                        investment
                        {investmentCount === 1
                          ? ""
                          : "s"}
                      </span>

                      <div className="plan-actions">
                        <button
                          onClick={() =>
                            openEditPlan(plan)
                          }
                        >
                          Edit
                        </button>

                        <button
                          className={
                            plan.is_active
                              ? "danger-action"
                              : "activate-action"
                          }
                          onClick={() =>
                            togglePlan(plan)
                          }
                        >
                          {plan.is_active
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </section>

      {selectedInvestment && (
        <div
          className="drawer-overlay"
          onClick={() => setSelectedInvestment(null)}
        >
          <aside
            className="investment-drawer"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="drawer-header">
              <div>
                <div className="panel-kicker">
                  INVESTMENT INSPECTOR
                </div>
                <h2>Position Details</h2>
              </div>

              <button
                className="drawer-close"
                onClick={() =>
                  setSelectedInvestment(null)
                }
              >
                ×
              </button>
            </div>

            <div className="drawer-status-row">
              <span
                className={statusClass(
                  selectedInvestment.status
                )}
              >
                {selectedInvestment.status}
              </span>

              <span className="drawer-id">
                #{selectedInvestment.id.slice(0, 12)}
              </span>
            </div>

            <div className="drawer-highlight">
              <span>INVESTED AMOUNT</span>

              <strong>
                {formatMoney(
                  selectedInvestment.amount,
                  selectedInvestment.currency || "USDT"
                )}
              </strong>

              <small>
                {selectedInvestment.plan_name ||
                  "Investment Plan"}
              </small>
            </div>

            <div className="drawer-grid">
              <div>
                <span>Investor</span>
                <strong>
                  {selectedInvestment.investor_name ||
                    "Unknown"}
                </strong>
              </div>

              <div>
                <span>Email</span>
                <strong>
                  {selectedInvestment.investor_email ||
                    "Unavailable"}
                </strong>
              </div>

              <div>
                <span>Return Rate</span>
                <strong className="positive">
                  +
                  {Number(
                    selectedInvestment.return_percentage ||
                      0
                  )}
                  %
                </strong>
              </div>

              <div>
                <span>Expected Return</span>
                <strong>
                  {formatMoney(
                    selectedInvestment.expected_return,
                    selectedInvestment.currency ||
                      "USDT"
                  )}
                </strong>
              </div>

              <div>
                <span>Started</span>
                <strong>
                  {formatDate(
                    selectedInvestment.started_at
                  )}
                </strong>
              </div>

              <div>
                <span>Maturity</span>
                <strong>
                  {formatDate(
                    selectedInvestment.maturity_at
                  )}
                </strong>
              </div>
            </div>

            <div className="drawer-section">
              <span className="drawer-section-title">
                INVESTOR IDENTIFIERS
              </span>

              <div className="identifier-row">
                <span>User ID</span>
                <code>
                  {selectedInvestment.user_id}
                </code>
              </div>

              <div className="identifier-row">
                <span>Investment ID</span>
                <code>
                  {selectedInvestment.id}
                </code>
              </div>
            </div>

            <div className="timeline">
              <div className="timeline-title">
                INVESTMENT TIMELINE
              </div>

              <div className="timeline-item">
                <div className="timeline-node active" />
                <div>
                  <strong>Investment Created</strong>
                  <span>
                    {formatDate(
                      selectedInvestment.created_at
                    )}
                  </span>
                </div>
              </div>

              {selectedInvestment.started_at && (
                <div className="timeline-item">
                  <div className="timeline-node active" />
                  <div>
                    <strong>Investment Started</strong>
                    <span>
                      {formatDate(
                        selectedInvestment.started_at
                      )}
                    </span>
                  </div>
                </div>
              )}

              {selectedInvestment.maturity_at && (
                <div className="timeline-item">
                  <div className="timeline-node" />
                  <div>
                    <strong>Scheduled Maturity</strong>
                    <span>
                      {formatDate(
                        selectedInvestment.maturity_at
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      {showPlanModal && (
        <div className="modal-overlay">
          <div className="plan-modal">
            <div className="modal-header">
              <div>
                <div className="panel-kicker">
                  PRODUCT CONFIGURATION
                </div>

                <h2>
                  {editingPlan
                    ? "Edit Investment Plan"
                    : "Create Investment Plan"}
                </h2>

                <p>
                  {editingPlan
                    ? "Update the configuration for this plan."
                    : "Create a new investment product."}
                </p>
              </div>

              <button
                className="drawer-close"
                onClick={closePlanModal}
                disabled={savingPlan}
              >
                ×
              </button>
            </div>

            {planError && (
              <div className="modal-error">
                {planError}
              </div>
            )}

            <div className="form-grid">
              <label className="full-field">
                <span>Plan Name</span>
                <input
                  value={planForm.name}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      name: event.target.value,
                    })
                  }
                  placeholder="e.g. Premium"
                />

                {planForm.name && (
                  <small className="slug-preview">
                    Slug: /{slugify(planForm.name)}
                  </small>
                )}
              </label>

              <label>
                <span>Minimum Amount</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={planForm.minimum_amount}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      minimum_amount:
                        event.target.value,
                    })
                  }
                  placeholder="100"
                />
              </label>

              <label>
                <span>Maximum Amount</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={planForm.maximum_amount}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      maximum_amount:
                        event.target.value,
                    })
                  }
                  placeholder="Leave empty for unlimited"
                />
              </label>

              <label>
                <span>Return Percentage</span>
                <div className="input-suffix">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={planForm.return_percentage}
                    onChange={(event) =>
                      setPlanForm({
                        ...planForm,
                        return_percentage:
                          event.target.value,
                      })
                    }
                    placeholder="20"
                  />
                  <b>%</b>
                </div>
              </label>

              <label>
                <span>Referral Percentage</span>
                <div className="input-suffix">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={planForm.referral_percentage}
                    onChange={(event) =>
                      setPlanForm({
                        ...planForm,
                        referral_percentage:
                          event.target.value,
                      })
                    }
                    placeholder="3"
                  />
                  <b>%</b>
                </div>
              </label>

              <label>
                <span>Duration</span>
                <div className="input-suffix">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={planForm.duration_hours}
                    onChange={(event) =>
                      setPlanForm({
                        ...planForm,
                        duration_hours:
                          event.target.value,
                      })
                    }
                    placeholder="24"
                  />
                  <b>H</b>
                </div>
              </label>

              <label className="full-field">
                <span>Description</span>
                <textarea
                  value={planForm.description}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      description:
                        event.target.value,
                    })
                  }
                  placeholder="Describe the investment plan..."
                  rows={4}
                />
              </label>

              <label className="toggle-field">
                <input
                  type="checkbox"
                  checked={planForm.is_featured}
                  onChange={(event) =>
                    setPlanForm({
                      ...planForm,
                      is_featured:
                        event.target.checked,
                    })
                  }
                />

                <span className="custom-toggle">
                  <i />
                </span>

                <div>
                  <strong>Featured Plan</strong>
                  <small>
                    Highlight this plan on the investor
                    platform.
                  </small>
                </div>
              </label>
            </div>

            <div className="modal-footer">
              <button
                className="cancel-button"
                onClick={closePlanModal}
                disabled={savingPlan}
              >
                Cancel
              </button>

              <button
                className="save-plan-button"
                onClick={savePlan}
                disabled={savingPlan}
              >
                {savingPlan
                  ? "Saving..."
                  : editingPlan
                  ? "Save Changes"
                  : "Create Plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}