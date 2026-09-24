"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import "./investment.css";

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
};

type Investment = {
  id: string;
  plan_id: string | null;
  amount: number | string;
  currency: string;
  return_percentage: number | string;
  expected_return: number | string;
  started_at: string | null;
  maturity_at: string | null;
  status: string;
  created_at: string;
};

type WalletBalance = {
  currency: string;
  balance: number | string;
};

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

function formatMoney(
  amount: number | string | null | undefined,
  currency = "USDT"
) {
  const value = Number(amount || 0);
  const code = String(currency || "USDT").toUpperCase();

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
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  if (hours % 24 === 0) {
    const days = hours / 24;

    return `${days} day${days === 1 ? "" : "s"}`;
  }

  return `${hours} hours`;
}

function getStatusClass(status: string) {
  return `customer-status customer-status-${status.toLowerCase()}`;
}

export default function DashboardInvestmentsPage() {
  const [plans, setPlans] = useState<InvestmentPlan[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [walletBalances, setWalletBalances] = useState<
    WalletBalance[]
  >([]);

  const [selectedPlan, setSelectedPlan] =
    useState<InvestmentPlan | null>(null);

  const [amount, setAmount] = useState("");

  const [loading, setLoading] = useState(true);
  const [investing, setInvesting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showConfirm, setShowConfirm] = useState(false);

  const [investmentSearch, setInvestmentSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const currency = "USDT";

  async function loadInvestmentData() {
    setLoading(true);
    setError("");

    const [
      plansResponse,
      investmentsResponse,
      walletResponse,
    ] = await Promise.all([
      supabase.rpc("get_active_investment_plans"),

      supabase
        .from("investments")
        .select(
          "id,plan_id,amount,currency,return_percentage,expected_return,started_at,maturity_at,status,created_at"
        )
        .order("created_at", {
          ascending: false,
        }),

      supabase
        .from("wallet_balances")
        .select("currency,balance")
        .order("currency"),
    ]);

    if (plansResponse.error) {
      setError(plansResponse.error.message);
      setLoading(false);
      return;
    }

    if (investmentsResponse.error) {
      setError(investmentsResponse.error.message);
      setLoading(false);
      return;
    }

    if (walletResponse.error) {
      setError(walletResponse.error.message);
      setLoading(false);
      return;
    }

    setPlans(
      (plansResponse.data || []) as InvestmentPlan[]
    );

    setInvestments(
      (investmentsResponse.data || []) as Investment[]
    );

    setWalletBalances(
      (walletResponse.data || []) as WalletBalance[]
    );

    setLoading(false);
  }

  useEffect(() => {
    loadInvestmentData();
  }, []);

  const usdtBalance = useMemo(() => {
    const balance = walletBalances.find(
      (item) =>
        String(item.currency).toUpperCase() === currency
    );

    return Number(balance?.balance || 0);
  }, [walletBalances]);

  const numericAmount = Number(amount || 0);

  const expectedProfit = useMemo(() => {
    if (!selectedPlan || numericAmount <= 0) {
      return 0;
    }

    const percentage =
      Number(selectedPlan.return_percentage || 0) / 100;

    return numericAmount * percentage;
  }, [selectedPlan, numericAmount]);

  const projectedTotal = useMemo(() => {
    return numericAmount + expectedProfit;
  }, [numericAmount, expectedProfit]);

  const amountValidation = useMemo(() => {
    if (!selectedPlan) {
      return "";
    }

    if (!amount) {
      return "";
    }

    if (!Number.isFinite(numericAmount)) {
      return "Enter a valid amount.";
    }

    if (numericAmount <= 0) {
      return "Investment amount must be greater than zero.";
    }

    const minimum = Number(
      selectedPlan.minimum_amount
    );

    const maximum =
      selectedPlan.maximum_amount === null
        ? null
        : Number(selectedPlan.maximum_amount);

    if (numericAmount < minimum) {
      return `Minimum investment is ${formatMoney(
        minimum,
        currency
      )}.`;
    }

    if (
      maximum !== null &&
      numericAmount > maximum
    ) {
      return `Maximum investment is ${formatMoney(
        maximum,
        currency
      )}.`;
    }

    if (numericAmount > usdtBalance) {
      return "Insufficient available wallet balance.";
    }

    return "";
  }, [
    selectedPlan,
    amount,
    numericAmount,
    usdtBalance,
  ]);

  const filteredInvestments = useMemo(() => {
    const query = investmentSearch
      .trim()
      .toLowerCase();

    return investments.filter((investment) => {
      const matchesSearch =
        !query ||
        investment.id
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        investment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [
    investments,
    investmentSearch,
    statusFilter,
  ]);

  const activeInvestments = investments.filter(
    (investment) =>
      investment.status === "active"
  ).length;

  const totalInvested = investments.reduce(
    (sum, investment) =>
      sum + Number(investment.amount || 0),
    0
  );

  const totalExpected = investments.reduce(
    (sum, investment) =>
      sum + Number(investment.expected_return || 0),
    0
  );

  function selectPlan(plan: InvestmentPlan) {
    setSelectedPlan(plan);
    setAmount("");
    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleAmountChange(
    value: string
  ) {
    setAmount(value);
    setError("");
    setSuccess("");
  }

  function requestInvestment() {
    setError("");
    setSuccess("");

    if (!selectedPlan) {
      setError("Please select an investment plan.");
      return;
    }

    if (!amount) {
      setError("Enter the amount you want to invest.");
      return;
    }

    if (amountValidation) {
      setError(amountValidation);
      return;
    }

    setShowConfirm(true);
  }

  async function confirmInvestment() {
    if (!selectedPlan) return;

    setInvesting(true);
    setError("");
    setSuccess("");

    const { data, error: rpcError } =
      await supabase.rpc(
        "create_investment",
        {
          p_plan_id: selectedPlan.id,
          p_amount: numericAmount,
          p_currency: currency,
        }
      );

    if (rpcError) {
      setError(rpcError.message);
      setInvesting(false);
      setShowConfirm(false);
      return;
    }

    setInvesting(false);
    setShowConfirm(false);

    setAmount("");
    setSelectedPlan(null);

    setSuccess(
      "Investment created successfully."
    );

    await loadInvestmentData();

    window.setTimeout(() => {
      setSuccess("");
    }, 5000);

    console.log("Investment created:", data);
  }

  return (
    <main className="customer-investment-page">
      <div className="customer-investment-grid" />

      <div className="customer-investment-orb orb-one" />
      <div className="customer-investment-orb orb-two" />

      <div className="customer-investment-container">
        <header className="customer-investment-header">
          <div>
            <div className="customer-eyebrow">
              <span />
              DIGITAL ASSET INVESTMENTS
            </div>

            <h1>Grow Your Portfolio</h1>

            <p>
              Select an investment plan, choose your
              amount, and create a new investment
              position.
            </p>
          </div>

          <button
            className="customer-refresh"
            onClick={loadInvestmentData}
            disabled={loading}
          >
            <span>↻</span>
            Refresh
          </button>
        </header>

        {success && (
          <div className="customer-success">
            <div>✓</div>

            <div>
              <strong>Investment Confirmed</strong>
              <span>{success}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="customer-error">
            <div>!</div>

            <div>
              <strong>Investment Notice</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        <section className="customer-overview">
          <div className="overview-card wallet-overview">
            <div className="overview-icon">₮</div>

            <div>
              <span>AVAILABLE BALANCE</span>

              <strong>
                {formatMoney(
                  usdtBalance,
                  currency
                )}
              </strong>

              <small>Ready to invest</small>
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-icon">◈</div>

            <div>
              <span>ACTIVE INVESTMENTS</span>

              <strong>
                {activeInvestments}
              </strong>

              <small>Currently running</small>
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-icon">◆</div>

            <div>
              <span>TOTAL INVESTED</span>

              <strong>
                {formatMoney(
                  totalInvested,
                  currency
                )}
              </strong>

              <small>Across all positions</small>
            </div>
          </div>

          <div className="overview-card">
            <div className="overview-icon">↗</div>

            <div>
              <span>EXPECTED VALUE</span>

              <strong>
                {formatMoney(
                  totalExpected,
                  currency
                )}
              </strong>

              <small>Recorded expected returns</small>
            </div>
          </div>
        </section>

        <section className="investment-builder">
          <div className="builder-heading">
            <div>
              <div className="customer-kicker">
                SELECT A PRODUCT
              </div>

              <h2>Investment Plans</h2>

              <p>
                Choose the plan that matches the amount
                you want to invest.
              </p>
            </div>

            <div className="secure-label">
              <span>●</span>
              SECURE INVESTMENT ENGINE
            </div>
          </div>

          {loading ? (
            <div className="customer-plan-grid">
              {Array.from({ length: 4 }).map(
                (_, index) => (
                  <div
                    className="customer-plan-skeleton"
                    key={index}
                  >
                    <div />
                    <div />
                    <div />
                    <div />
                  </div>
                )
              )}
            </div>
          ) : plans.length === 0 ? (
            <div className="customer-empty">
              <div>◇</div>

              <strong>
                No investment plans are currently
                available.
              </strong>

              <span>
                Please check again later.
              </span>
            </div>
          ) : (
            <div className="customer-plan-grid">
              {plans.map((plan) => {
                const isSelected =
                  selectedPlan?.id === plan.id;

                return (
                  <button
                    type="button"
                    key={plan.id}
                    className={`customer-plan-card ${
                      isSelected
                        ? "customer-plan-selected"
                        : ""
                    } ${
                      plan.is_featured
                        ? "customer-plan-featured"
                        : ""
                    }`}
                    onClick={() =>
                      selectPlan(plan)
                    }
                  >
                    {plan.is_featured && (
                      <div className="customer-featured">
                        FEATURED PLAN
                      </div>
                    )}

                    <div className="customer-plan-top">
                      <div>
                        <span className="customer-plan-label">
                          INVESTMENT
                        </span>

                        <h3>{plan.name}</h3>
                      </div>

                      <div className="customer-plan-radio">
                        {isSelected && <span />}
                      </div>
                    </div>

                    <div className="customer-roi">
                      <span>
                        PROJECTED RETURN
                      </span>

                      <strong>
                        +
                        {Number(
                          plan.return_percentage || 0
                        ).toLocaleString(
                          "en-US",
                          {
                            maximumFractionDigits: 2,
                          }
                        )}
                        <small>%</small>
                      </strong>
                    </div>

                    <div className="customer-plan-info">
                      <div>
                        <span>MINIMUM</span>

                        <strong>
                          {formatMoney(
                            plan.minimum_amount,
                            currency
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>MAXIMUM</span>

                        <strong>
                          {plan.maximum_amount ===
                          null
                            ? "Unlimited"
                            : formatMoney(
                                plan.maximum_amount,
                                currency
                              )}
                        </strong>
                      </div>

                      <div>
                        <span>DURATION</span>

                        <strong>
                          {formatDuration(
                            Number(
                              plan.duration_hours
                            )
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>REFERRAL</span>

                        <strong>
                          +
                          {Number(
                            plan.referral_percentage ||
                              0
                          )}
                          %
                        </strong>
                      </div>
                    </div>

                    {plan.description && (
                      <p className="customer-plan-description">
                        {plan.description}
                      </p>
                    )}

                    <div className="customer-plan-action">
                      {isSelected
                        ? "PLAN SELECTED"
                        : "SELECT PLAN"}

                      <span>→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedPlan && (
          <section className="investment-calculator">
            <div className="calculator-main">
              <div className="customer-kicker">
                INVESTMENT CALCULATOR
              </div>

              <h2>
                Configure Your{" "}
                <span>{selectedPlan.name}</span>{" "}
                Investment
              </h2>

              <p>
                Enter the amount you want to allocate
                to this investment plan.
              </p>

              <div className="amount-input-wrapper">
                <div className="amount-label">
                  <span>INVESTMENT AMOUNT</span>

                  <button
                    type="button"
                    onClick={() =>
                      setAmount(
                        String(usdtBalance)
                      )
                    }
                  >
                    USE MAX
                  </button>
                </div>

                <div
                  className={`large-amount-input ${
                    amountValidation
                      ? "amount-invalid"
                      : ""
                  }`}
                >
                  <span>₮</span>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={amount}
                    onChange={(event) =>
                      handleAmountChange(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                  />

                  <strong>USDT</strong>
                </div>

                <div className="amount-range">
                  <span>
                    Minimum:{" "}
                    {formatMoney(
                      selectedPlan.minimum_amount,
                      currency
                    )}
                  </span>

                  <span>
                    Maximum:{" "}
                    {selectedPlan.maximum_amount ===
                    null
                      ? "Unlimited"
                      : formatMoney(
                          selectedPlan.maximum_amount,
                          currency
                        )}
                  </span>
                </div>

                {amountValidation && (
                  <div className="amount-validation">
                    {amountValidation}
                  </div>
                )}
              </div>

              <div className="calculator-results">
                <div>
                  <span>INVESTMENT</span>

                  <strong>
                    {formatMoney(
                      numericAmount,
                      currency
                    )}
                  </strong>
                </div>

                <div>
                  <span>RETURN RATE</span>

                  <strong className="green-value">
                    +
                    {Number(
                      selectedPlan.return_percentage
                    )}
                    %
                  </strong>
                </div>

                <div>
                  <span>EXPECTED PROFIT</span>

                  <strong className="green-value">
                    +
                    {formatMoney(
                      expectedProfit,
                      currency
                    )}
                  </strong>
                </div>

                <div>
                  <span>PROJECTED VALUE</span>

                  <strong>
                    {formatMoney(
                      projectedTotal,
                      currency
                    )}
                  </strong>
                </div>
              </div>

              <button
                className="start-investment-button"
                disabled={
                  !amount ||
                  Boolean(amountValidation) ||
                  investing
                }
                onClick={requestInvestment}
              >
                <span>
                  {investing
                    ? "Processing..."
                    : "Start Investment"}
                </span>

                <b>→</b>
              </button>

              <div className="investment-disclaimer">
                <span>◆</span>

                <p>
                  Investment calculations shown here
                  are previews. The final return,
                  maturity time, and investment
                  parameters are calculated and recorded
                  by the platform&apos;s investment
                  engine when the investment is created.
                </p>
              </div>
            </div>

            <aside className="calculator-side">
              <div className="side-plan-orbit">
                <div className="orbit-ring ring-one" />
                <div className="orbit-ring ring-two" />
                <div className="orbit-core">
                  <span>+</span>
                  <strong>
                    {Number(
                      selectedPlan.return_percentage
                    )}
                    %
                  </strong>
                  <small>RETURN</small>
                </div>
              </div>

              <div className="side-plan-name">
                {selectedPlan.name}
              </div>

              <div className="side-plan-duration">
                {formatDuration(
                  Number(
                    selectedPlan.duration_hours
                  )
                )}{" "}
                investment cycle
              </div>

              <div className="side-plan-row">
                <span>Referral bonus</span>

                <strong>
                  +
                  {Number(
                    selectedPlan.referral_percentage
                  )}
                  %
                </strong>
              </div>

              <div className="side-plan-row">
                <span>Investment range</span>

                <strong>
                  {formatMoney(
                    selectedPlan.minimum_amount,
                    currency
                  )}{" "}
                  —{" "}
                  {selectedPlan.maximum_amount ===
                  null
                    ? "Unlimited"
                    : formatMoney(
                        selectedPlan.maximum_amount,
                        currency
                      )}
                </strong>
              </div>
            </aside>
          </section>
        )}

        <section className="portfolio-section">
          <div className="portfolio-heading">
            <div>
              <div className="customer-kicker">
                YOUR PORTFOLIO
              </div>

              <h2>Investment Positions</h2>

              <p>
                Track your active and historical
                investment positions.
              </p>
            </div>

            <div className="portfolio-controls">
              <div className="portfolio-search">
                <span>⌕</span>

                <input
                  value={investmentSearch}
                  onChange={(event) =>
                    setInvestmentSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search investment ID..."
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="all">
                  All statuses
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="active">
                  Active
                </option>

                <option value="matured">
                  Matured
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="cancelled">
                  Cancelled
                </option>
              </select>
            </div>
          </div>

          <div className="portfolio-table-wrapper">
            <table className="portfolio-table">
              <thead>
                <tr>
                  <th>Investment</th>
                  <th>Plan</th>
                  <th>Amount</th>
                  <th>Return</th>
                  <th>Expected</th>
                  <th>Maturity</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map(
                    (_, index) => (
                      <tr key={index}>
                        <td colSpan={7}>
                          <div className="portfolio-loading">
                            <span />
                            <span />
                            <span />
                          </div>
                        </td>
                      </tr>
                    )
                  )
                ) : filteredInvestments.length ===
                  0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="portfolio-empty">
                        <div>◇</div>

                        <strong>
                          No investment positions
                          found
                        </strong>

                        <span>
                          Your investment positions
                          will appear here after you
                          create one.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredInvestments.map(
                    (investment) => {
                      const plan = plans.find(
                        (item) =>
                          item.id ===
                          investment.plan_id
                      );

                      return (
                        <tr
                          key={investment.id}
                        >
                          <td>
                            <div className="investment-id-cell">
                              <div className="investment-symbol">
                                ₮
                              </div>

                              <div>
                                <strong>
                                  #{investment.id.slice(
                                    0,
                                    12
                                  )}
                                </strong>

                                <small>
                                  Created{" "}
                                  {formatDate(
                                    investment.created_at
                                  )}
                                </small>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="portfolio-plan">
                              {plan?.name ||
                                "Investment"}
                            </span>
                          </td>

                          <td>
                            <strong>
                              {formatMoney(
                                investment.amount,
                                investment.currency
                              )}
                            </strong>
                          </td>

                          <td>
                            <span className="portfolio-return">
                              +
                              {Number(
                                investment.return_percentage ||
                                  0
                              )}
                              %
                            </span>
                          </td>

                          <td>
                            <strong>
                              {formatMoney(
                                investment.expected_return,
                                investment.currency
                              )}
                            </strong>
                          </td>

                          <td>
                            <span className="portfolio-date">
                              {formatDate(
                                investment.maturity_at
                              )}
                            </span>
                          </td>

                          <td>
                            <span
                              className={getStatusClass(
                                investment.status
                              )}
                            >
                              {investment.status}
                            </span>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showConfirm && selectedPlan && (
        <div className="investment-confirm-overlay">
          <div className="investment-confirm-modal">
            <div className="confirm-icon">
              ◆
            </div>

            <div className="confirm-heading">
              <div className="customer-kicker">
                CONFIRM INVESTMENT
              </div>

              <h2>
                Start {selectedPlan.name}
              </h2>

              <p>
                Review the investment details before
                confirming.
              </p>
            </div>

            <div className="confirm-summary">
              <div>
                <span>Investment amount</span>

                <strong>
                  {formatMoney(
                    numericAmount,
                    currency
                  )}
                </strong>
              </div>

              <div>
                <span>Return rate</span>

                <strong className="green-value">
                  +
                  {Number(
                    selectedPlan.return_percentage
                  )}
                  %
                </strong>
              </div>

              <div>
                <span>Expected profit</span>

                <strong className="green-value">
                  +
                  {formatMoney(
                    expectedProfit,
                    currency
                  )}
                </strong>
              </div>

              <div>
                <span>Expected value</span>

                <strong>
                  {formatMoney(
                    projectedTotal,
                    currency
                  )}
                </strong>
              </div>

              <div>
                <span>Investment duration</span>

                <strong>
                  {formatDuration(
                    Number(
                      selectedPlan.duration_hours
                    )
                  )}
                </strong>
              </div>

              <div>
                <span>Wallet after investment</span>

                <strong>
                  {formatMoney(
                    usdtBalance -
                      numericAmount,
                    currency
                  )}
                </strong>
              </div>
            </div>

            <div className="confirm-warning">
              <span>!</span>

              <p>
                Confirming will create the investment
                using your available wallet balance.
              </p>
            </div>

            <div className="confirm-actions">
              <button
                className="confirm-cancel"
                onClick={() =>
                  setShowConfirm(false)
                }
                disabled={investing}
              >
                Cancel
              </button>

              <button
                className="confirm-invest"
                onClick={confirmInvestment}
                disabled={investing}
              >
                {investing
                  ? "Processing..."
                  : "Confirm Investment →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}